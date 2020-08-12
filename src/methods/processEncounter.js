import { path, pathOr } from 'ramda';
import { mongoFind, mongoInsert } from './mongo';

const Axios = require('axios');
const Short = require('short-uuid');
const Moment = require('moment-timezone');

const computeRoles = function (bossHealthLost, player, buffMap) {

    // Tag List
    /**
     * Support
     * Toughness
     * Quickness
     * Alacrity
     * Might
     * Banner Slave
     * Power DPS
     * Condi DPS
     */

    const tags = [];

    let totalDamage = 0;
    pathOr([], ['dpsTargets'])(player).forEach((target) => {

        const targetStats = target[0];
        totalDamage += targetStats.damage;
    });

    // Classed as a DPS if you do more than 9% of the total (aka pulling your share - with a small buffer)
    if ((totalDamage / bossHealthLost) * 100 > 9) {
        if (player.condition > 5) {
            tags.push('Condi DPS');
        }
        else {
            tags.push('Power DPS');
        }
    }

    if (player.healing >= 5) {
        tags.push('Healer');
    }

    if (player.toughness > 4) {
        tags.push('Toughness');
    }

    const usefulBuffs = [
        'Quickness',
        'Alacrity'
    ];

    // Lets see whether they generate any useful boons
    pathOr([], ['groupBuffs'])(player).forEach((buff) => {

        const totalGeneration = path(['buffData', 0, 'generation'])(buff);
        const buffDesc = buffMap['b' + buff.id];

        if (usefulBuffs.includes(buffDesc.name) && totalGeneration > 20) {

            tags.push(buffDesc.name);
        }

        if (buffDesc.name === 'Might' && totalGeneration > 5) {

            tags.push(buffDesc.name);
        }

        // Maybe they are a banner warrior?
        if (player.profession === 'Warrior' || player.profession === 'Berserker' || player.profession === 'Spellbreaker') {
            if (buffDesc.name === 'Banner of Strength') {
                if (totalGeneration > 20) {
                    tags.push('Banner Slave');
                }
            }
        }
    });

    return tags;
};

const computeSimpleStats = function (player, buffMap) {

    const returnObj = {
        totalDamage: path(['dpsAll', 0, 'damage'])(player),
        targetDPS: 0,
        totalDPS: path(['dpsAll', 0, 'dps'])(player)
    };

    pathOr([], ['dpsTargets'])(player).forEach((target) => {

        const targetStats = target[0];
        returnObj.targetDPS += targetStats.dps;
    });

    // populate the uptimes
    pathOr([], ['buffUptimes'])(player).forEach((buff) => {

        const buffDesc = buffMap['b' + buff.id];

        const displayBuffs = [
            'Might',
            'Quickness',
            'Alacrity',
            'Protection',
            'Regeneration'
        ];

        if (displayBuffs.includes(buffDesc.name)) {
            returnObj[buffDesc.name] = buff.buffData[0].uptime;
        }
    });

    return returnObj;
};

const isExistingLog = async function (evtcJSON) {

    // Find any existing logs for this boss that this player is a part of
    const query = {
        bossName: evtcJSON.fightName,
        'uniqueChecking.recordedByList': evtcJSON.recordedBy
    };

    const existingLogs = await mongoFind('encounters', query);

    //loop through the existing logs and see if we have a match on the time boundries
    let exists = false;
    existingLogs.forEach((encounter) => {

        const utcTimeEnd = Moment(new Date(evtcJSON.timeEnd));
        if (utcTimeEnd.isAfter(encounter.uniqueChecking.timeEndLowerBound) && utcTimeEnd.isBefore(encounter.uniqueChecking.timeEndUpperBound)) {
            exists = true;
        }
    });

    console.log( exists );
    return exists;
};

const maybeProcessNewBoss = async function (evtcJSON) {

    // TODO, see if redis has the bossName
    // If not, add the name to redis, then create a doc in the 'bosses' collection
    // Holds basic info like the fight icon etc
};

const processNewLog = async function (guildID, dpsReportUrl, evtcJSON) {

    const newEncounter = {
        encounterId: Short().new(),
        uniqueChecking: {
            recordedByList: [],
            timeEndLowerBound: undefined,
            timeEndUpperBound: undefined
        },
        guildIDs: [guildID],
        bossName: '',
        duration: '',
        utcTimeEnd: undefined,
        success: undefined,
        players: [],
        dpsReportUrl
    };

    // Populate the new object
    try {

        newEncounter.duration = path(['duration'])(evtcJSON);
        newEncounter.utcTimeEnd = new Date(evtcJSON.timeEnd);
        newEncounter.bossName = path(['fightName'])(evtcJSON);
        newEncounter.success = path(['success'])(evtcJSON);

        const utcTimeEndMoment = Moment(new Date(evtcJSON.timeEnd)).utc();
        newEncounter.uniqueChecking.timeEndLowerBound = Moment(utcTimeEndMoment).subtract(8, 'seconds').toISOString();
        newEncounter.uniqueChecking.timeEndUpperBound = Moment(utcTimeEndMoment).add(8, 'seconds').toISOString();

        const players = path(['players'])(evtcJSON);

        let totalBossHealthLost = 0;
        evtcJSON.targets.forEach((target) => {

            totalBossHealthLost += (target.totalHealth - target.finalHealth);
        });

        for (let i = 0; i < players.length; ++i) {

            const player = players[i];

            newEncounter.uniqueChecking.recordedByList.push(player.name);

            const simplePlayer = {
                subgroup: player.group,
                icon: await mongoFind('icons', player.profession),
                accountName: player.account,
                profession: player.profession,
                characterName: player.name,
                roles: computeRoles(totalBossHealthLost, player, path(['buffMap'])(evtcJSON)),
                simpleStats: computeSimpleStats(player, path(['buffMap'])(evtcJSON))
            };
            newEncounter.players.push(simplePlayer);
        }

        evtcJSON.gw2rbaEncounterId = newEncounter.encounterId;

        // Add the log to the encounters collection and the evtcJSON to the evtc collection
        await mongoInsert('encounters', newEncounter);
        await mongoInsert('evtc', evtcJSON);
        return;

    }
    catch (err) {
        console.log( 'Error processing log' );
        console.log( err );
        return;
    }
};

const processExistingLog = async function (guildID, evtcJSON) {

    // Get the log from mongo

    // add the guildId to the guild Ids list if it is not already there
    console.log( 'existing!!!!' );

    return;
};

export const maybeProcessEncounter = async function (guildId, message) {

    let dpsReportUrls = [];

    // Lets check if this is a plenBot embed message
    if (message.embeds && message.embeds.length > 0) {
        const embed = message.embeds[0];

        // Lets make sure this is an arcDPS log embed
        if (embed.url && embed.url.includes('dps.report')) {
            dpsReportUrls.push(embed.url);
        }
    }

    if (message.content) {
        // Maybe we have dps reports in the message body we can process?
        const dpsReportRegex = /https:\/\/dps\.report\/\S*-\d{8}-\d{6}_\w*/gm;
        const matches = message.content.match(dpsReportRegex) || [];
        dpsReportUrls = dpsReportUrls.concat(matches);
    }

    if (dpsReportUrls.length === 0) {
        console.log( 'No dps.report logs found. Returning' );
        return 0;
    }

    for (let i = 0; i < dpsReportUrls.length; ++i) {

        const url = dpsReportUrls[i];
        const permalink = url.substring(19);

        try {

            const response = await Axios({
                method: 'GET',
                url: `https://dps.report/getJson?permalink=${permalink}`
            });
            const evtcJSON = response.data;

            if (response.status !== 200 || !evtcJSON || !evtcJSON.arcVersion) {
                throw new Error('Invalid encounter returned from dps.report api');
            }

            // Process the log
            if (await isExistingLog(evtcJSON)) {
                console.log( `Processing existing log with permalink: ${permalink}` );
                await processExistingLog(guildId, evtcJSON);
            }
            else {
                console.log( `Processing new log with permalink: ${permalink}` );
                await maybeProcessNewBoss(evtcJSON);
                await processNewLog(guildId, url, evtcJSON);
            }
        }
        catch (err) {

            console.log( 'Error processing DPS Report' );
            console.log( err );
            continue;
        }
    }

    return dpsReportUrls.length;
};
