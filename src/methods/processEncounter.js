import { path } from 'ramda';
import { mongoFind, mongoInsert } from './mongo';

const Axios = require('axios');
const Short = require('short-uuid');
const Moment = require('moment-timezone');

const computeRole = function (player, buffMap) {

    // Do they have support stats
    const supportCountStat = player.concentration + player.healing + player.toughness;
    if (supportCountStat > 5) {
        return 'Support';
    }

    const usefulBuffs = [
        'Quickness',
        'Alacrity',
        'Protection',
        'Regeneration'
    ];

    // If not lets see whether they generate any useful boons
    player.groupBuffs.forEach((buff) => {

        const totalGeneration = path(['buffData', 0, 'generation'])(buff);
        const buffDesc = buffMap['b' + buff.id];

        if (usefulBuffs.includes(buffDesc.name) && totalGeneration > 20) {

            return 'Support';
        }

        // Maybe they are a banner warrior?
        if (player.profession === 'Warrior' || player.profession === 'Berserker' || player.profession === 'Spellbreaker') {
            if (buffDesc.name === 'Banner of Strength' || buffDesc.name === 'Banner of Discipline') {
                if (totalGeneration > 40) {
                    return 'Banners';
                }
            }
        }
    });

    // No useful buffs too, they must be a dps
    return 'DPS';
};

const computeSimpleStats = function (player, buffMap) {

    const returnObj = {
        totalDamage: path(['dpsAll', 0, 'damage'])(player),
        targetDPS: 0,
        totalDPS: path(['dpsAll', 0, 'dps'])(player),
        Might: undefined,
        Quickness: undefined,
        Alacrity: undefined,
        Protectiion: undefined,
        Regeneration: undefined
    };

    player.dpsTargets.forEach((target) => {

        const targetStats = target[0];
        returnObj.targetDPS += targetStats.dps;
    });

    // populate the uptimes
    player.buffUptimes.forEach((buff) => {

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
        uniqueChecking: {
            recordedByList: [evtcJSON.recordedBy]
        }
    };

    const existingLogs = await mongoFind('encunters', query);

    //loop through the existing logs and see if we have a match on the time boundries
    let exists = false;
    existingLogs.forEach((encounter) => {

        const utcTimeEnd = Moment(new Date(evtcJSON.timeEnd));
        if (utcTimeEnd.isAfter(encounter.uniqueChecking.timeEndLowerBound) && utcTimeEnd.isBefore(encounter.uniqueChecking.timeEndUpperBound)) {
            exists = true;
        }
    });

    return exists;
};

const processNewLog = async function (guildID, dpsReportUrl, evtcJSON) {

    const newEncounter = {
        encounterId: Short.new(),
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
        dpsReportUrl,
        arcDpsRaw: undefined
    };

    // Populate the new object
    try {

        newEncounter.arcDpsRaw = evtcJSON;
        newEncounter.duration = path(['duration'])(evtcJSON);
        newEncounter.utcTimeEnd = new Date(evtcJSON.timeEnd);
        newEncounter.bossName = path(['fightName'])(evtcJSON);
        newEncounter.success = path(['success'])(evtcJSON);

        const utcTimeEndMoment = Moment(new Date(evtcJSON.timeEnd)).utc();
        newEncounter.uniqueChecking.timeEndLowerBound = Moment(utcTimeEndMoment).subtract(8, 'seconds').toISOString();
        newEncounter.uniqueChecking.timeEndUpperBound = Moment(utcTimeEndMoment).add(8, 'seconds').toISOString();

        const players = path(['players'])(evtcJSON);
        for (let i = 0; i < players.length; ++i) {

            const player = players[i];

            newEncounter.uniqueChecking.recordedByList.push(player.name);

            const simplePlayer = {
                subgroup: player.group,
                icon: await mongoFind('icons', player.profession),
                accountName: player.account,
                profession: player.profession,
                characterName: player.name,
                role: computeRole(player, path(['buffMap'])(evtcJSON)),
                simpleStats: computeSimpleStats(player, path(['buffMap'])(evtcJSON))
            };
            newEncounter.players.push(simplePlayer);
        }

        // Add the log to the encounters collection
        await mongoInsert('encounters', newEncounter);

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

    // Maybe we have dps reports in the message body we can process?
    const dpsReportRegex = /https:\/\/dps\.report\/\S*-\d{8}-\d{6}_\w*/gm;
    const matches = message.content.match(dpsReportRegex);
    dpsReportUrls = dpsReportUrls.concat(matches);

    if (dpsReportUrls.length === 0) {
        return;
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

            if (response.code !== 200 || !evtcJSON || !evtcJSON.arcVersion) {
                throw new Error('Invalid encounter returned from dps.report api');
            }

            // Process the log
            if (isExistingLog(evtcJSON)) {
                processExistingLog(guildId, evtcJSON);
            }
            else {
                processNewLog(guildId, url, evtcJSON);
            }
        }
        catch (err) {

            console.log( 'Error processing DPS Report' );
            console.log( err );
            continue;
        }
    }

    return true;

};
