/* eslint-disable no-extend-native */
import { mongoFind, mongoFindOne } from '../../methods/mongo';
import { generatePlayerStatsImage } from '../../methods/canvas/playerStatsImage';
const Discord = require('discord.js');

String.prototype.padding = function (n, c) {

    const val = this.valueOf();
    if ( Math.abs(n) <= val.length ) {
        return val;
    }

    const m = Math.max((Math.abs(n) - this.length) || 0, 0);
    const pad = Array(m + 1).join(String(c || ' ').charAt(0));
    return (n < 0) ? pad + val : val + pad;
};

Number.prototype.formatMsToString = function () {

    const input = this.valueOf();
    const m = Math.floor(input / 60000).toString();
    const s = Math.floor((input - (m * 60000)) / 1000).toString();
    const ms = (input - ((m * 60000) + (s * 1000))).toString();

    return m.padStart(2, '0') + 'm ' + s.padStart(2, '0') + 's ' + ms.padStart(3, '0') + 'ms';
};

const sortAndReturnMap = function (map) {

    const returnObj = {};

    const mapSorted = Object.keys(map).sort((a,b) => {

        return map[b] - map[a];
    });
    returnObj.player = mapSorted[0] || 'N/A';
    returnObj.count = map[mapSorted[0]] || 'N/A';
    returnObj.sorted = mapSorted;

    return returnObj;

};

const calculateMedian = function (sortedArray) {

    if (sortedArray.length % 2 === 0) {
        const i = Math.floor(sortedArray.length / 2);
        const j = Math.floor(sortedArray.length / 2) - 1;
        return (sortedArray[i] + sortedArray[j]) / 2;
    }

    return sortedArray[Math.floor(sortedArray.length / 2)];
};

const processStatsDeepEncounters = function (encounters) {

    const returnObject = {
        general: {
            successful: 0,
            failed: 0,
            total: 0,
            duration: {
                fastest: undefined,
                slowest: undefined,
                mean: undefined,
                fastestLog: undefined,
                slowestLog: undefined
            }
        },
        dps: {
            averageSuccessfulTotalDPS: 0,
            medianPlayerTargetDps: 0,
            mediantargetDps: 0,
            highest: 0,
            lowest: 99999999,
            highestPlayer: undefined,
            lowestPlayer: undefined
        },
        downDeath: {},
        roles: {},
        support: {},
        players: {}
    };

    let totalTargetDPS = 0;
    const encounterDPSArray = [];
    const playerDPSArray = [];

    let slowest = 0;
    let fastest = 99999999999999;
    const durationArray = [];
    const topDPSMap = {};
    const downMap = {};
    const deathMap = {};
    const firstDownMap = {};
    const firstDeathMap = {};
    const healerMap = {};
    const quickMap = {};
    const mightMap = {};
    const alacMap = {};
    const topReviveMap = {};
    const topCleanseMap = {};
    const topBoonStripMap = {};

    encounters.forEach((encounter) => {

        // General - success/fail/total/success rate
        encounter.success ? returnObject.general.successful++ : returnObject.general.failed++;
        returnObject.general.total++;

        // Gets the total target dps
        let encounterTargetDPS = 0;
        let highestDPS = 0;
        let encounterHighestDPSPlayer;

        let encounterTopRevivePlayer;
        let encounterTopReviveCount = 0;

        let encounterTopCleansePlayer;
        let encounterTopCleanseCount = 0;

        let encounterTopBoonStripPlayer;
        let encounterTopBoonStripCount = 0;

        encounter.players.forEach((player) => {

            encounterTargetDPS += player.dmgStats.targetDPS;
            playerDPSArray.push(Math.round(player.dmgStats.targetDPS / 100) * 100);

            player.roles.forEach((role) => {

                switch (role) {
                    case 'Healer':
                        healerMap[player.accountName] = (healerMap[player.accountName] || 0) + 1;
                        break;
                    case 'Quickness':
                        quickMap[player.accountName] = (quickMap[player.accountName] || 0) + 1;
                        break;
                    case 'Might':
                        mightMap[player.accountName] = (mightMap[player.accountName] || 0) + 1;
                        break;
                    case 'Alacrity':
                        alacMap[player.accountName] = (alacMap[player.accountName] || 0) + 1;
                        break;
                }
            });

            if (encounter.success) {
                if (returnObject.dps.highest < player.dmgStats.targetDPS) {
                    returnObject.dps.highest = player.dmgStats.targetDPS;
                    returnObject.dps.highestPlayer = player.accountName;
                }

                if (returnObject.dps.lowest > player.dmgStats.targetDPS) {
                    returnObject.dps.lowest = player.dmgStats.targetDPS;
                    returnObject.dps.lowestPlayer = player.accountName;
                }
            }

            if (player.supportStats.revives > encounterTopReviveCount) {
                encounterTopRevivePlayer = player.accountName;
                encounterTopReviveCount = player.supportStats.revives;
            }

            if (player.supportStats.outgoingCondiCleanse > encounterTopCleanseCount) {
                encounterTopCleansePlayer = player.accountName;
                encounterTopCleanseCount = player.supportStats.outgoingCondiCleanse;
            }

            if (player.supportStats.boonStrips > encounterTopBoonStripCount) {
                encounterTopBoonStripPlayer = player.accountName;
                encounterTopBoonStripCount = player.supportStats.boonStrips;
            }

            if (player.dmgStats.targetDPS > highestDPS) {
                highestDPS = player.dmgStats.targetDPS;
                encounterHighestDPSPlayer = player.accountName;
            }

            downMap[player.accountName] = (downMap[player.accountName] || 0) + player.defensiveStats.downs.length;
            deathMap[player.accountName] = (deathMap[player.accountName] || 0) + player.defensiveStats.deaths.length;

            // Revives, Downs, Deaths
            const defensiveStats = player.defensiveStats;
            const supportStats = player.supportStats;
            const current = returnObject.players[player.accountName] || {};
            current.revives = (current.revives || 0) + supportStats.revives;
            current.downs = (current.downs || 0) + defensiveStats.downs.length;
            current.deaths = (current.deaths || 0) + defensiveStats.deaths.length;
            returnObject.players[player.accountName] = current;

        });

        topDPSMap[encounterHighestDPSPlayer] = (topDPSMap[encounterHighestDPSPlayer] || 0) + 1;
        encounter.firstDown !== undefined ? firstDownMap[encounter.firstDown] = (firstDownMap[encounter.firstDown] || 0) + 1 : false;
        encounter.firstDeath !== undefined ? firstDeathMap[encounter.firstDeath] = (firstDownMap[encounter.firstDeath] || 0) + 1 : false;
        encounterTopRevivePlayer !== undefined ? topReviveMap[encounterTopRevivePlayer] = (topReviveMap[encounterTopRevivePlayer] || 0) + 1 : false;
        encounterTopCleansePlayer !== undefined ? topCleanseMap[encounterTopCleansePlayer] = (topCleanseMap[encounterTopCleansePlayer] || 0) + 1 : false;
        encounterTopBoonStripPlayer !== undefined ? topBoonStripMap[encounterTopBoonStripPlayer] = (topBoonStripMap[encounterTopBoonStripPlayer] || 0) + 1 : false;

        if (encounter.success) {
            totalTargetDPS += encounterTargetDPS;

            durationArray.push(encounter.durationMs);

            // Finding the fastest
            if (encounter.durationMs < fastest) {
                fastest = encounter.durationMs;
                returnObject.general.duration.fastest = encounter.duration;
                returnObject.general.duration.fastestLog = encounter.dpsReportUrl;
            }

            // Finding the slowest
            if (encounter.durationMs > slowest) {
                slowest = encounter.durationMs;
                returnObject.general.duration.slowest = encounter.duration;
                returnObject.general.duration.slowestLog = encounter.dpsReportUrl;
            }
        }

        encounterDPSArray.push(Math.round(encounterTargetDPS / 1000) * 1000);
    });

    returnObject.dps.topDPSMap = topDPSMap;
    returnObject.dps.dpsSorted =  Object.keys(topDPSMap).sort((a,b) => {

        return topDPSMap[b] - topDPSMap[a];
    });

    let totalDuration = 0;
    durationArray.forEach((duration) => {

        totalDuration += duration;
    });
    returnObject.general.duration.mean = totalDuration / durationArray.length;

    returnObject.dps.mediantargetDps = calculateMedian(encounterDPSArray.sort((a,b) => b - a));
    returnObject.dps.medianPlayerTargetDps = calculateMedian(playerDPSArray.sort((a,b) => b - a));

    // put together the top player maps
    returnObject.downDeath.downs = sortAndReturnMap(downMap);
    returnObject.downDeath.deaths = sortAndReturnMap(deathMap);
    returnObject.downDeath.firstDown = sortAndReturnMap(firstDownMap);
    returnObject.downDeath.firstDeath = sortAndReturnMap(firstDeathMap);
    returnObject.roles.healer = sortAndReturnMap(healerMap);
    returnObject.roles.might = sortAndReturnMap(mightMap);
    returnObject.roles.quickness = sortAndReturnMap(quickMap);
    returnObject.roles.alacrity = sortAndReturnMap(alacMap);
    returnObject.support.revives = sortAndReturnMap(topReviveMap);
    returnObject.support.cleanses = sortAndReturnMap(topCleanseMap);
    returnObject.support.boonStrips = sortAndReturnMap(topBoonStripMap);

    if (returnObject.general.successful > 0) {
        returnObject.dps.averageSuccessfulTotalDPS = Math.round((totalTargetDPS / returnObject.general.successful) / 1000) * 1000;
    }

    return returnObject;
};

const buildSupportPlayerStatsString = function (processedEncounterJSON) {

    let str =
        '```' +
        'Account'.padding(20) + 'Downs'.padding(8) + 'Deaths'.padding(9) + 'Revives' + '\n\n';

    // Sort the results?

    Object.keys(processedEncounterJSON.players).forEach((player) => {

        const revives = processedEncounterJSON.players[player].revives.toString();
        const downs = processedEncounterJSON.players[player].downs.toString();
        const deaths = processedEncounterJSON.players[player].deaths.toString();


        str += player.padding(20) + downs.padding(8) + deaths.padding(9) + revives + '\n';
    });

    str += '```';
    return str;
};

const buildGeneralStatsString = function (processedEncounterJSON) {

    const s = `Successful:`;
    const f = 'Failed:';
    const t = 'Total:';
    const sr = 'Success Rate:';

    const str =
        '```diff\n' +
        '+' + s.padding(15) + processedEncounterJSON.general.successful  + '\n' +
        '-' + f.padding(15) + processedEncounterJSON.general.failed + '\n\n' +
        t.padding(15) + processedEncounterJSON.general.total + '\n' +

        sr.padding(15) + ((processedEncounterJSON.general.successful / processedEncounterJSON.general.total) * 100).toFixed(1) + '%' + '\n\n' +
        '```';

    return str;
};

const buildDurationStatsString = function (processedEncounterJSON) {

    const fast = 'Fastest:';
    const slow = 'Slowest:';
    const avgkt = 'Average:';

    const str =
        '```' +
        avgkt.padding(10) + processedEncounterJSON.general.duration.mean.formatMsToString() + '\n\n' +

        fast.padding(10) + processedEncounterJSON.general.duration.fastest + '\n' +
        slow.padding(10) + processedEncounterJSON.general.duration.slowest +
        '```' + `[Fastest](${processedEncounterJSON.general.duration.fastestLog})  /  [Slowest](${processedEncounterJSON.general.duration.slowestLog})`;

    return str;
};

const buildDpsStatsString = function (processedEncounterJSON) {

    const avg = 'Mean Squad Target DPS:';
    const meds = 'Median Squad Target DPS:';
    const medp = 'Median Player Target DPS:';
    const h = 'Highest:';
    const l = 'Lowest:';

    const str =
        '```' +
        avg.padding(26) + processedEncounterJSON.dps.averageSuccessfulTotalDPS + '\n' +
        meds.padding(26) + processedEncounterJSON.dps.mediantargetDps + '\n\n' +

        medp.padding(26) + processedEncounterJSON.dps.medianPlayerTargetDps + '\n\n' +
        h.padding(12) + processedEncounterJSON.dps.highest.toString().padding(8) + '-'.padding(4) + processedEncounterJSON.dps.highestPlayer + '\n' +
        l.padding(12) + processedEncounterJSON.dps.lowest.toString().padding(8) + '-'.padding(4) + processedEncounterJSON.dps.lowestPlayer + '\n' +
        '```';

    return str;
};

const buildTopDpsStatsString = function (processedEncounterJSON) {

    const topDpsDisplayArr = [];
    processedEncounterJSON.dps.dpsSorted.forEach((player) => {

        topDpsDisplayArr.push(player.padding(25) + processedEncounterJSON.dps.topDPSMap[player] );
    });

    const str =
        '```' +
        'Player'.padding(25) + 'Times Achieved' + '\n\n' +
        topDpsDisplayArr.join('\n') +
        '```';

    return str;
};

const buildSupportStatsString = function (processedEncounterJSON) {

    const support = processedEncounterJSON.support;

    const healers = 'Mean # of Healers:';

    const mRevs = 'Most Top Revives:';
    const mCleanse = 'Most Top Cleanse:';
    const mStrips = 'Most Boon Strips:';

    const str =
        '```' +
        mRevs.padding(20) + support.revives.player.padding(20) + support.revives.count + '\n' +
        mCleanse.padding(20) + support.cleanses.player.padding(20) + support.cleanses.count + '\n' +
        mStrips.padding(20) + support.boonStrips.player.padding(20) + support.boonStrips.count + '\n' +
        '```';

    return str;
};

const buildRoleBreakdownString = function (processedEncounterJSON) {

    const roles = processedEncounterJSON.roles;

    const str =
        '```' +
        'Metric'.padding(20) + 'Player'.padding(20) + 'Count' + '\n\n' +
        'Healer'.padding(20) + roles.healer.player.padding(20) + roles.healer.count + '\n' +
        'Might'.padding(20) + roles.might.player.padding(20) + roles.might.count + '\n' +
        'Quickness'.padding(20) + roles.quickness.player.padding(20) + roles.quickness.count + '\n' +
        'Alacrity'.padding(20) + roles.alacrity.player.padding(20) + roles.alacrity.count + '\n' +
        '```';

    return str;
};

const buildDownDeathStatsString = function (processedEncounterJSON) {

    const mDowns = 'Most Downs:';
    const mDeaths = 'Most Deaths:';
    const fDowns = 'Most First Downs:';
    const fDeaths = 'Most First Deaths:';

    const str =
        '```' +
        'Metric'.padding(20) + 'Player'.padding(20) + 'Count' + '\n\n' +
        mDowns.padding(20) + processedEncounterJSON.downDeath.downs.player.padding(20) + processedEncounterJSON.downDeath.downs.count + '\n' +
        mDeaths.padding(20) + processedEncounterJSON.downDeath.deaths.player.padding(20) + processedEncounterJSON.downDeath.deaths.count + '\n\n' +

        fDowns.padding(20) + processedEncounterJSON.downDeath.firstDown.player.padding(20) + processedEncounterJSON.downDeath.firstDown.count + '\n' +
        fDeaths.padding(20) + processedEncounterJSON.downDeath.firstDeath.player.padding(20) + processedEncounterJSON.downDeath.firstDeath.count + '\n' +
        '```';

    return str;
};

const getPlayerStatsImageId = async function (processedEncounterJSON) {

    //const path = await generatePlayerStatsImage(processedEncounterJSON);

    return {
        path: 'img/image3.png',
        name: 'image3.png'
    };
};

export const handleStatsDeep = async function (channel, reference, bossName) {

    channel.startTyping();

    // valiidate the tag
    const guildTagRegex = RegExp(/\[.{2,4}\]/);
    if (!guildTagRegex.test(reference)) {
        channel.send('Invalid guild reference provided');
        channel.stopTyping();
        return;
    }

    /*const boss = await mongoFindOne('bosses', { name: bossName });

    if (!boss) {
        Server.bot.sendMessage({
            to: channelId,
            message: 'No encounters with this boss name were found'
        });
        return;
    }*/

    const guild = await mongoFindOne('guilds', { reference });

    if (!guild) {
        channel.send('The specified guild does not exist');
        channel.stopTyping();
        return;
    }

    // Get the logs
    const query = {
        bossName,
        guildIds: guild._id
    };

    const encounters = await mongoFind('encounters', query);

    const processedEncounterJSON = processStatsDeepEncounters(encounters);
    console.log( processedEncounterJSON );

    const img = await getPlayerStatsImageId();

    // First embed contains general stats, dps/support and death information
    await new Promise( (resolve, reject) => {

        const statsEmbed = new Discord.MessageEmbed();
        statsEmbed.setTitle(`**${bossName}**`);
        statsEmbed.setColor(4688353);
        statsEmbed.setDescription(`Statistics for - ${guild.name} ${guild.tag}`);
        statsEmbed.setThumbnail('https://wiki.guildwars2.com/images/c/c8/Mini_Mursaat_Overseer.png'); //boss.thumbnail
        statsEmbed.addFields(
            { name: 'General',                  value: buildGeneralStatsString(processedEncounterJSON), inline: true },
            { name: 'Time to Kill Breakdown',   value: buildDurationStatsString(processedEncounterJSON), inline: true },
            { name: 'DPS',                      value: buildDpsStatsString(processedEncounterJSON) },
            { name: 'Top DPS Rankings',         value: buildTopDpsStatsString(processedEncounterJSON) },
            { name: 'Support',                  value: buildSupportStatsString(processedEncounterJSON) },
            { name: 'Roles',                    value: buildRoleBreakdownString(processedEncounterJSON) },
            { name: 'Down / Death Breakdown',   value: buildDownDeathStatsString(processedEncounterJSON) }
        );
        statsEmbed.attachFiles([img.path]);
        statsEmbed.setImage(`attachment://${img.name}`);

        channel.send(statsEmbed);
        channel.stopTyping();
        return resolve();
    });
};

//         'Account'.padding(20) + 'Revs'.padding(7) + 'Downs'.padding(8) + 'Deaths' + '\n';
