/* eslint-disable no-extend-native */
import { path, pathOr, uniq } from 'ramda';
import { mongoFind, mongoInsert, mongoFindOne, mongoUpdateById } from './mongo';
import { getOrCreatePlayer } from './users';
import { Server } from '../server';
import { config } from '../config';
import { customAlphabet } from 'nanoid';
import Axios from 'axios';
import Moment from 'moment-timezone';

const generateId = customAlphabet(config.idGeneration.alphabet, 8);

String.prototype.convertToMs = function () {

    const inputStr = this.valueOf();
    const splitInputs = inputStr
        .split(' ')
        .map((component) => component.replace(/[a-zA-Z]+/, ''))
        .map((component) => parseInt(component));

    return (splitInputs[0] * 60000) + (splitInputs[1] * 1000) + splitInputs[2];
};

const buildPlayerMechanicArray = function (mechanicData, characterName, accountName) {

    const occurrences = [];

    mechanicData.forEach((occurrence) => {

        if (occurrence.actor === characterName) {
            occurrences.push(occurrence.time);
        }
    });

    return occurrences;
};

const computeRoles = function (bossHealthLost, player, buffMap) {

    // Tag List
    /**
     * Healer
     * Quickness
     * Alacrity
     * Might
     * Fury
     * Banners
     * Power DPS
     * Condi DPS
     */

    const tags = [];

    let totalDamage = 0;
    pathOr([], ['dpsTargets'])(player).forEach((target) => {

        const targetStats = target[0];
        totalDamage += targetStats.damage;
    });

    // Classed as a DPS if you do more than 7% of the total (aka pulling your share - with a buffer)
    if ((totalDamage / bossHealthLost) * 100 > 7) {
        if (player.condition > 5) {
            tags.push('Condi DPS');
        }
        else {
            tags.push('Power DPS');
        }
    }

    if (player.healing >= 4) {
        tags.push('Healer');
    }

    const usefulBuffs = [
        'Quickness',
        'Alacrity',
        'Fury'
    ];

    const computeBuff = (buff) => {

        const totalGeneration = path(['buffData', 0, 'generation'])(buff);
        const buffDesc = buffMap['b' + buff.id];

        if (usefulBuffs.includes(buffDesc.name) && totalGeneration > 20) {
            tags.push(buffDesc.name);
        }

        if (buffDesc.name === 'Might' && totalGeneration > 5) {
            tags.push(buffDesc.name);
        }

        if (player.profession === 'Mirage' ** buffDesc.name === 'Might' && totalGeneration > 3) {
            tags.push(buffDesc.name);
        }

        // Scourges taking Blood Magic are probably heal scourges
        if (player.profession === 'Scourge' && buffDesc.name === 'Last Rites') {
            tags.push('Healer');
        }

        // Maybe they are a banner warrior?
        if (player.profession === 'Warrior' || player.profession === 'Berserker' || player.profession === 'Spellbreaker') {
            if (buffDesc.name === 'Banner of Strength' || buffDesc.name === 'Banner of Discipline') {
                if (totalGeneration > 20 && !tags.includes('Banners')) {
                    tags.push('Banners');
                }
            }
        }
    };

    pathOr([], ['groupBuffs'])(player).forEach((buff) => computeBuff(buff));    // Subgroup
    pathOr([], ['squadBuffs'])(player).forEach((buff) => computeBuff(buff));    // Squad
    return uniq(tags);
};

const computeDmgStats = function (player) {

    const returnObject = {
        totalDamage: path(['dpsAll', 0, 'damage'])(player),
        defianceBarDamage: path(['dpsAll', 0, 'breakbarDamage'])(player),
        targetDPS: 0,
        totalDPS: path(['dpsAll', 0, 'dps'])(player)
    };

    pathOr([], ['dpsTargets'])(player).forEach((target) => {

        const targetStats = target[0];
        returnObject.targetDPS += targetStats.dps;
    });

    return returnObject;
};

const computeBoonUptimes = function (player, buffMap) {

    const returnObject = {};

    // populate the uptimes
    pathOr([], ['buffUptimes'])(player).forEach((buff) => {

        const buffDesc = buffMap['b' + buff.id];

        const displayBuffs = [
            'Might',
            'Quickness',
            'Alacrity',
            'Protection',
            'Regeneration',
            'Fury',
            'Vigor'
        ];

        if (displayBuffs.includes(buffDesc.name)) {
            returnObject[buffDesc.name] = buff.buffData[0].uptime;
        }
    });

    return returnObject;
};

const computeDamageModifierStats = function (player, damageModMap) {

    const computeDamageModifierUptime = (modifierName) => {

        const modifierKey =
            Object
                .keys(damageModMap)
                .find((key) => damageModMap[key].name.toLowerCase() === modifierName.toLowerCase());

        const dataPoint = player.damageModifiersTarget[0].find((modifier) => modifier.id.toString() === modifierKey?.substring(1))?.damageModifiers[0];

        if (dataPoint) {
            return parseFloat(((dataPoint.hitCount / dataPoint.totalHitCount) * 100).toFixed(1));
        }

        return 100;
    };

    return {
        scholarRuneUptime: computeDamageModifierUptime('Scholar Rune'),
        thiefRuneUptime: computeDamageModifierUptime('Thief Rune')
    };
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

const isExistingLog = async function (evtcJSON) {

    // Find any existing logs for this boss that this player is a part of
    const query = {
        bossName: evtcJSON.fightName,
        'uniqueChecking.recordedByList': evtcJSON.recordedBy
    };

    const existingLogs = await mongoFind('encounters', query);

    //loop through the existing logs and see if we have a match on the time boundries
    const returnObj = {
        exists: false,
        encounter: undefined
    };

    existingLogs.forEach((encounter) => {

        const utcTimeEnd = Moment(new Date(evtcJSON.timeEnd));

        if (utcTimeEnd.isAfter(encounter.uniqueChecking.timeEndLowerBound) && utcTimeEnd.isBefore(encounter.uniqueChecking.timeEndUpperBound)) {
            returnObj.exists = true;
            returnObj.encounter = encounter;
        }
    });

    return returnObj;
};

const getActiveCollector = async function (guildId, channelId) {

    const query = {
        active: true,
        guildId,
        channelId
    };
    const collector = await mongoFindOne('collectors', query) || {};
    return collector._id || undefined;
};

const processNewLog = async function (dpsReportUrl, permalink, evtcJSON, collectorId) {

    const newEncounter = {
        encounterId: generateId(),
        collectors: collectorId ? [collectorId] : [],
        uniqueChecking: {
            recordedByList: [],
            timeEndLowerBound: undefined,
            timeEndUpperBound: undefined
        },
        accountNames: [],
        bossName: path(['fightName'])(evtcJSON),
        fightIcon: evtcJSON?.fightIcon,
        duration: path(['duration'])(evtcJSON),
        durationMs: path(['duration'])(evtcJSON).convertToMs(),
        utcTimeStart: new Date(evtcJSON.timeStart),
        utcTimeEnd: new Date(evtcJSON.timeEnd),
        success: path(['success'])(evtcJSON),
        players: [],
        dpsReportUrl,
        dpsReportPermaLink: permalink,
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

        const players = path(['players'])(evtcJSON);
        for (let i = 0; i < players.length; ++i) {

            const player = players[i];
            if (player.isFake) {
                continue;
            }

            const storedPlayer = await getOrCreatePlayer(player.account);

            newEncounter.uniqueChecking.recordedByList.push(player.name);
            newEncounter.accountNames.push(player.account);

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
                dmgStats: computeDmgStats(player, path(['buffMap'])(evtcJSON)),
                boonUptimes: computeBoonUptimes(player, path(['buffMap'])(evtcJSON)),
                defensiveStats: {
                    downs: buildPlayerMechanicArray(downs, player.name, player.account),
                    deaths: buildPlayerMechanicArray(deaths, player.name, player.account),
                    damageTaken: path(['defenses', '0', 'damageTaken'])(player),
                    damageBarrier: path(['defenses', '0', 'damageBarrier'])(player)
                },
                damageModifiers: computeDamageModifierStats(player, path(['damageModMap'])(evtcJSON)),
                supportStats: {
                    revives: pathOr(0, ['support', '0', 'resurrects'])(player),
                    reviveTimes: pathOr(0, ['support', '0', 'resurrectTime'])(player),
                    outgoingCondiCleanse: pathOr(0, ['support', '0', 'condiCleanse'])(player),
                    boonStrips: pathOr(0, ['support', '0', 'boonStrips'])(player)
                },
                roles: computeRoles(totalBossHealthLost, player, path(['buffMap'])(evtcJSON)),
                simpleStats: {
                    condition: player.condition,
                    concentration: player.concentration,
                    healing: player.healing,
                    toughness: player.toughness
                }
            };
            newEncounter.players.push(simplePlayer);
        }

        evtcJSON.gw2rbaEncounterId = newEncounter.encounterId;

        // Add the log to the encounters collection and the evtcJSON to the evtc collection
        await mongoInsert('encounters', newEncounter);
        //await mongoInsert('evtc', evtcJSON);
        return;

    }
    catch (err) {
        console.log( 'Error processing log' );
        console.log( err );
        return;
    }
};

export const processEncounter = async ({ guildId, channelId, url }) => {

    try {
        const permalink = url.substring(19);

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
        const collectorId = await getActiveCollector(guildId, channelId);

        // Process the log
        if (existingLogStatus.exists) {
            console.log( `Log already captured for permalink: ${permalink}` );

            // add the collector if one is running
            const { encounter } = existingLogStatus;
            if (collectorId) {
                console.log('Adding collector to existing log');
                if (encounter.collectors) {
                    await mongoUpdateById('encounters', encounter._id, { collectors: uniq([...encounter.collectors, collectorId]) });
                }
                else {
                    await mongoUpdateById('encounters', encounter._id, { collectors: [collectorId] });
                }
            }
        }
        else {
            console.log( `Processing new log with permalink: ${permalink}` );
            await processNewLog(url, permalink, evtcJSON, collectorId);
        }

        console.log(`Processing Complete for permalink: ${permalink}`);
    }
    catch (err) {

        console.log( 'Error processing DPS Report' );
        console.log( err );
        return;
    }

};

export const captureLogsForProcessing = async function (guildId, message) {

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

    // Queue the messages for processing
    dpsReportUrls.forEach((url) => {

        const msg = {
            guildId,
            channelId: message.channel.id,
            url
        };
        Server.amqpChannel.sendToQueue(config.amqp.queueName, Buffer.from( JSON.stringify( msg ), 'utf8' ));
    });

    console.log( `Queued ${dpsReportUrls.length} Logs for processing` );
    return dpsReportUrls.length;
};
