/* eslint-disable no-extend-native */
import { MessageEmbed } from 'discord.js';
import { equals } from 'ramda';
import { mongoFind, mongoFindOne, mongoUpdateById } from '../../methods/mongo';
import Moment from 'moment-timezone';
import { LinkedList, ListNode } from '../../methods/LinkedList';

String.prototype.padding = function (n, c) {

    const val = this.valueOf();
    if ( Math.abs(n) <= val.length ) {
        return val;
    }

    const m = Math.max((Math.abs(n) - this.length) || 0, 0);
    const pad = Array(m + 1).join(String(c || ' ').charAt(0));
    return (n < 0) ? pad + val : val + pad;
};

String.prototype.formatDPS = function () {

    const val = this.valueOf();
    return val.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ',');
};

const buildGeneralStatsString = function (stats) {

    const abdps = 'Avg Boss DPS:';
    const acdps = 'Avg Cleave DPS:';
    const sr = 'Success Rate:';

    const str =
`\`\`\`
${sr.padding(20)}${((stats.successCount / stats.logCount) * 100).toFixed(1)}% (S: ${stats.successCount} / F: ${stats.logCount - stats.successCount})
${abdps.padding(20)}${(stats.totalBossDps / stats.logCount).toFixed(0).toString().formatDPS()}
${acdps.padding(20)}${(stats.totalCleaveDps / stats.logCount).toFixed(0).toString().formatDPS()}
\`\`\``;

    return str;
};

const computeEncounterStats = async function (collectorId) {

    const encounters = await mongoFind('encounters', { collectors: collectorId } );

    const globalStats = {
        logCount: encounters.length,
        successCount: 0,
        combatTime: 0,
        firstEncounterStart: new Date('3000-12-31'),
        lastEncounterEnd: new Date('1960-1-1'),
        bosses: {},
        timeline: new LinkedList(new ListNode('start')),
        accounts: {},
        totalBossDps: 0,
        totalCleaveDps: 0
    };

    // Sort the encounters by startTime, then we can collect groups of bosses by same consecutive
    const sortedEncounters = encounters.sort((a, b) => {
        if (Moment(a.utcTimeStart).isBefore(Moment(b.utcTimeStart))) {
            return -1;
        }

        return 1;
    });

    sortedEncounters.forEach((encounter) => {

        const formattedBossName = encounter.bossName.split(' ').join('-');
        const boss = globalStats.bosses[formattedBossName] || {
            name: encounter.bossName,
            icon: encounter.fightIcon,
            totalBossDps: 0,
            totalCleaveDps: 0,
            combatTime: 0,
            firstEncounterStart: new Date('3000-12-31'),
            lastEncounterEnd: new Date('1960-1-1'),
            success: 0,
            fail: 0,
            downs: 0,
            deaths: 0
        };

        const currentNode = globalStats.timeline.getLast();
        const timelineNode = currentNode.data?.name === encounter.bossName ?
            currentNode.data : {
                name: encounter.bossName,
                icon: encounter.fightIcon,
                count: 0,
                combatTime: 0,
                success: false,
                firstEncounterStart: new Date('3000-12-31'),
                lastEncounterEnd: new Date('1960-1-1'),
                encounterArray: []
            };

        if (encounter.success) {
            globalStats.successCount++;
            boss.success++;
            currentNode.success = true;
        }
        else {
            boss.fail++;
        }

        timelineNode.encounterArray.push(encounter.encounterId);
        timelineNode.count++;

        // Timeline Combat Time
        timelineNode.combatTime += encounter.durationMs;
        if (Moment(encounter.utcTimeStart).isBefore(timelineNode.firstEncounterStart)) {
            timelineNode.firstEncounterStart = encounter.utcTimeStart;
        }

        if (Moment(encounter.utcTimeEnd).isAfter(timelineNode.lastEncounterEnd)) {
            timelineNode.lastEncounterEnd = encounter.utcTimeEnd;
        }

        if (currentNode.data?.name !== timelineNode.name) {
            currentNode.next = new ListNode(timelineNode);
        }
        else {
            currentNode.replaceData(timelineNode);
        }

        // Boss Combat Time
        boss.combatTime += encounter.durationMs;
        if (Moment(encounter.utcTimeStart).isBefore(boss.firstEncounterStart)) {
            boss.firstEncounterStart = encounter.utcTimeStart;
        }

        if (Moment(encounter.utcTimeEnd).isAfter(boss.lastEncounterEnd)) {
            boss.lastEncounterEnd = encounter.utcTimeEnd;
        }

        // Global Combat Time
        globalStats.combatTime += encounter.durationMs;
        if (Moment(encounter.utcTimeStart).isBefore(globalStats.firstEncounterStart)) {
            globalStats.firstEncounterStart = encounter.utcTimeStart;
        }

        if (Moment(encounter.utcTimeEnd).isAfter(globalStats.lastEncounterEnd)) {
            globalStats.lastEncounterEnd = encounter.utcTimeEnd;
        }

        encounter.players.forEach((player) => {

            if (player.subgroup > 20) {
                return;
            }

            const formattedAccountName = player.accountName.split(' ').join('-');
            const playerStats = globalStats.accounts[formattedAccountName] || {
                accountName: player.accountName,
                professionAggrigates: {},
                downDeathStats: {
                    firstDownCount: 0,
                    firstDeathCount: 0,
                    downs: 0,
                    deaths: 0
                },
                revives: 0,
                reviveTime: 0,
                roleMap: {},
                encounterCount: 0,
                totalBossDps: 0,
                totalCleaveDps: 0,
                totalBreakbarDamage: 0,
                totalDamageTaken: 0,
                totalBarrierTaken: 0,
                totalScholarRuneUptime: 0,
                totalThiefRuneUptime: 0
            };

            playerStats.downDeathStats.downs += player.defensiveStats.downs.length;
            playerStats.downDeathStats.deaths += player.defensiveStats.deaths.length;
            playerStats.downDeathStats.firstDownCount += encounter.firstDown === player.accountName ? 1 : 0;
            playerStats.downDeathStats.firstDeathCount += encounter.firstDeath === player.accountName ? 1 : 0;
            playerStats.revives += player.supportStats.revives;
            playerStats.reviveTime += player.supportStats.reviveTimes;
            playerStats.encounterCount++;
            playerStats.totalBossDps += player.dmgStats.targetDPS;
            playerStats.totalCleaveDps += player.dmgStats.totalDPS;
            playerStats.totalBreakbarDamage += player.dmgStats.defianceBarDamage;
            playerStats.totalDamageTaken += player.defensiveStats.damageTaken;
            playerStats.totalBarrierTaken += player.defensiveStats.damageBarrier;

            playerStats.totalScholarRuneUptime += player.damageModifiers.scholarRuneUptime;
            playerStats.totalThiefRuneUptime += player.damageModifiers.thiefRuneUptime;

            globalStats.totalBossDps += player.dmgStats.targetDPS;
            globalStats.totalCleaveDps += player.dmgStats.totalDPS;

            boss.totalBossDps += player?.dmgStats?.targetDPS;
            boss.totalCleaveDps += player?.dmgStats?.totalDPS;
            boss.downs += player.defensiveStats.downs.length;
            boss.deaths += player.defensiveStats.deaths.length;

            const professionArr = playerStats.professionAggrigates[player.profession] || [];
            const profession = professionArr.find((value) => {
                const existingRoles = value.roles.sort();
                const incomingRoles = player.roles.sort();
                return equals(existingRoles, incomingRoles);
            }) || {
                count: 0,
                roles: player.roles,
                totalBossDps: 0,
                totalCleaveDps: 0,
                revives: 0,
                reviveTime: 0,
                downs: 0,
                deaths: 0
            };
            const spliceIndex = professionArr.indexOf(profession);

            profession.count++;
            profession.totalBossDps += player.dmgStats.targetDPS;
            profession.totalCleaveDps += player.dmgStats.totalDPS;
            profession.revives += player.supportStats.revives;
            profession.reviveTime += player.supportStats.reviveTimes;
            profession.downs += player.defensiveStats.downs.length;
            profession.deaths += player.defensiveStats.deaths.length;

            if (spliceIndex === -1) {
                professionArr.push(profession);
            }
            else {
                professionArr.splice(spliceIndex, 1, profession);
            }

            playerStats.professionAggrigates[player.profession] = professionArr;

            player.roles.forEach((role) => {
                const formattedRoleName = role.split(' ').join('-');
                playerStats.roleMap[formattedRoleName]
                    ? playerStats.roleMap[formattedRoleName].count++
                    : playerStats.roleMap[formattedRoleName] = {
                        name: role,
                        count: 1
                    };
            });

            globalStats.accounts[formattedAccountName] = playerStats;
            globalStats.bosses[formattedBossName] = boss;

        });
    });

    globalStats.timeline.getLast().next = new ListNode('end');

    return globalStats;
};

export const handleCollectorEnd = async function (interaction) {

    const { channelId, guildId } = interaction;

    // Lets get the active collector
    const collector = await mongoFindOne('collectors', { active: true, guildId, channelId });
    if (!collector) {
        return await interaction.reply('There are no active collectors running. Start one with `/collector start`');
    }

    // Update the doc
    const endTime = Date.now();
    const collectorStats = await computeEncounterStats(collector._id);
    await mongoUpdateById('collectors', collector._id, { active: false, endTime, stats: collectorStats } );

    // Format the stats into the reply
    const general = new MessageEmbed()
        .setTitle(`Statistics! - ${collector._id}`)
        .setDescription(`Click here for Stats!\nhttps://scott-mueller.github.io/gw2-raid-dashboard/#/collector?collectorId=${collector._id}`)
        .setURL(`https://scott-mueller.github.io/gw2-raid-dashboard/#/collector?collectorId=${collector._id}`)
        .setColor(4688353)
        .setTimestamp()
        .setThumbnail('https://i.imgur.com/qb3bRS9.png')
        .addFields(
            [
                { name: 'General', value: buildGeneralStatsString(collectorStats) }
            ]
        );

    return await interaction.reply({ embeds: [general] });
};
