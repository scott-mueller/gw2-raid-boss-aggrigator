import { path, pathOr, uniq } from 'ramda';
import { mongoFind, mongoInsert, mongoFindOne } from './mongo';
import { getOrCreatePlayer } from './users';

import { config } from '../config';

import { customAlphabet } from 'nanoid';

const generateId = customAlphabet(config.idGeneration.alphabet, 8);

const Axios = require('axios');
const Moment = require('moment-timezone');

const buildPlayerMechanicObject = function (mechanicData, characterName, accountName) {

    const playerMechanicData = {
        player: accountName,
        occurrences: []
    };

    mechanicData.forEach((occurrence) => {

        if (occurrence.actor === characterName) {
            playerMechanicData.occurrences.push(occurrence.time);
        }
    });

    return playerMechanicData;
};

const computeRoles = function (bossHealthLost, player, buffMap) {

    // Tag List
    /**
     * Healer
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

const determineFirstMechanicOccurrence = function (mechanicsData) {

    let first = 9999999999;
    let firstActor;
    mechanicsData.forEach((occurrence) => {

        if (occurrence.time < first) {
            first = occurrence.time;
            firstActor = occurrence.actor;
        }
    });

    return firstActor;
};

const determineMechanicsIndex = function (logMechanics, mechanicName) {

    for (let i = 0; i < logMechanics.length; ++i) {
        const mechanic = logMechanics[i];

        if (mechanic.name.toLowerCase() === mechanicName.toLowerCase()) {
            return i;
        }
    }

    return false;
};

const doesEncounterMatchGuildRoster = async function (guildId, accountNames) {

    const guild = await mongoFindOne('guilds', { _id: guildId });
    if (!guild) {
        console.log( `Unable to find guild with id: ${guildId}` );
        return false;
    }

    let matchCount = 0;
    accountNames.forEach((name) => {

        if (guild.roster.includes(name)) {
            matchCount++;
        }
    });

    return matchCount >= 8;

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

    return {
        exists,
        encounter: existingLogs[0]
    };
};

const maybeProcessNewBoss = async function (evtcJSON) {

    // TODO, see if redis has the bossName
    // If not, add the name to redis, then create a doc in the 'bosses' collection
    // Holds basic info like the fight icon etc
};

const processNewLog = async function (dpsReportUrl, evtcJSON) {

    const newEncounter = {
        encounterId: generateId(),
        uniqueChecking: {
            recordedByList: [],
            timeEndLowerBound: undefined,
            timeEndUpperBound: undefined
        },
        accountNames: [],
        guildIDs: [],
        bossName: path(['fightName'])(evtcJSON),
        duration: path(['duration'])(evtcJSON),
        utcTimeEnd: new Date(evtcJSON.timeEnd),
        success: path(['success'])(evtcJSON),
        players: [],
        dpsReportUrl,
        downs: [],
        deaths: [],
        firstDeath: undefined,
        firstDown: undefined
    };

    // Populate the new object
    try {

        const utcTimeEndMoment = Moment(new Date(evtcJSON.timeEnd)).utc();
        newEncounter.uniqueChecking.timeEndLowerBound = Moment(utcTimeEndMoment).subtract(8, 'seconds').toISOString();
        newEncounter.uniqueChecking.timeEndUpperBound = Moment(utcTimeEndMoment).add(8, 'seconds').toISOString();

        let totalBossHealthLost = 0;
        evtcJSON.targets.forEach((target) => {

            totalBossHealthLost += (target.totalHealth - target.finalHealth);
        });

        const deathIndex = determineMechanicsIndex(evtcJSON.mechanics, 'Dead');
        const deaths = pathOr([], ['mechanics', deathIndex, 'mechanicsData'])(evtcJSON);
        newEncounter.firstDeath = determineFirstMechanicOccurrence(deaths);

        const downedIndex = determineMechanicsIndex(evtcJSON.mechanics, 'Downed');
        const downs = pathOr([], ['mechanics', downedIndex, 'mechanicsData'])(evtcJSON);
        newEncounter.firstDown = determineFirstMechanicOccurrence(downs);

        let guildIds = [];

        const players = path(['players'])(evtcJSON);
        for (let i = 0; i < players.length; ++i) {

            const player = players[i];

            const storedPlayer = await getOrCreatePlayer(player.account);
            guildIds = guildIds.concat(storedPlayer.guildIds);

            newEncounter.uniqueChecking.recordedByList.push(player.name);
            newEncounter.accountNames.push(player.account);
            newEncounter.downs.push(buildPlayerMechanicObject(downs, player.name, player.account));
            newEncounter.deaths.push(buildPlayerMechanicObject(deaths, player.name, player.account));

            if (newEncounter.firstDeath && newEncounter.firstDeath === player.name) {
                newEncounter.firstDeath = player.account;
            }

            if (newEncounter.firstDown && newEncounter.firstDown === player.name) {
                newEncounter.firstDown = player.account;
            }

            const simplePlayer = {
                subgroup: player.group,
                accountName: player.account,
                profession: player.profession,
                characterName: player.name,
                roles: computeRoles(totalBossHealthLost, player, path(['buffMap'])(evtcJSON)),
                simpleStats: computeSimpleStats(player, path(['buffMap'])(evtcJSON))
            };
            newEncounter.players.push(simplePlayer);
        }

        const uniqueGuildIds = uniq(guildIds);
        for (let i = 0; i < uniqueGuildIds.length; ++i) {

            if (await doesEncounterMatchGuildRoster(uniqueGuildIds[i], newEncounter.accountNames)) {
                newEncounter.guildIDs.push(uniqueGuildIds[i]);
            }
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
        console.log( 'No dps.report logs found' );
        return 0;
    }

    for (let i = 0; i < dpsReportUrls.length; ++i) {

        const url = dpsReportUrls[i];
        const permalink = url.substring(19);

        try {
            const dpsReportBaseUrl = config.apis.dpsReport.baseUrl;
            const response = await Axios({
                method: 'GET',
                url: `${dpsReportBaseUrl}/getJson?permalink=${permalink}`
            });
            const evtcJSON = response.data;

            if (response.status !== 200 || !evtcJSON || !evtcJSON.arcVersion) {
                throw new Error('Invalid encounter returned from dps.report api');
            }

            const existingLogStatus = await isExistingLog(evtcJSON);

            // Process the log
            if (existingLogStatus.exists) {
                console.log( `Log already captured for permalink: ${permalink}` );
            }
            else {
                console.log( `Processing new log with permalink: ${permalink}` );
                await maybeProcessNewBoss(evtcJSON);
                await processNewLog(url, evtcJSON);
            }
        }
        catch (err) {

            console.log( 'Error processing DPS Report' );
            console.log( err );
            continue;
        }
    }

    console.log( `Processed ${dpsReportUrls.length} Logs` );
    return dpsReportUrls.length;
};
