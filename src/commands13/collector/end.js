/* eslint-disable no-extend-native */
import { MessageEmbed } from 'discord.js';
import { equals, uniq } from 'ramda';
import { mongoFind, mongoFindOne, mongoUpdateById } from '../../methods/mongo';
import Moment from 'moment-timezone';

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

const buildBossStatsString = function (stats) {

    const { bosses } = stats;

    const header = `${'Boss Name'.padding(25)}${'Success'.padding(10)}${'Fail'.padding(10)}${'Success Rate'}\n\n`;
    const str = Object
        .keys(bosses)
        .map((key) => {
            const boss = bosses[key];
            return `${boss.name.padding(25)}${boss.success.toString().padding(10)}${boss.fail.toString().padding(10)}${((boss.success / (boss.success + boss.fail)) * 100).toFixed(1)}%`;
        })
        .join('\n');

    return `\`\`\`${header}${str}\`\`\``;
};

const buildPlayerStatsFields = function (stats) {

    const fieldArray = [];

    const { accounts } = stats;
    Object.keys(accounts).forEach((key) => {
        const account = accounts[key];

        fieldArray.push({ name: account.accountName, value: buildAccountStatsString(account), inline: true });
    });

    return fieldArray;
};

const buildAccountStatsString = function (account) {

    const str =
`\`\`\`
Avg DPS:
${'Boss:'.padding(12)}${(account.totalBossDps / account.encounterCount).toFixed(0).toString().formatDPS()}
${'Cleave:'.padding(12)}${(account.totalCleaveDps / account.encounterCount).toFixed(0).toString().formatDPS()}
\`\`\`` +
`\`\`\`
${'Revives:'.padding(12)}${account.revives} 
${'ReviveTime:'.padding(12)}${account.reviveTime.toFixed(1)}s
\`\`\`` +
`\`\`\`
${'Downs:'.padding(12)}${account.downDeathStats.downs} 
${'Deaths:'.padding(12)}${account.downDeathStats.deaths}
\`\`\``;

    return str;
};

const buildRoleStatsFields = function (stats) {

    const fieldArray = [];

    const { accounts } = stats;

    let presentRoles = [];
    Object.keys(accounts).forEach((key) => {
        const roles = accounts[key].roleMap;
        presentRoles.push(...Object.keys(roles));
    });
    presentRoles = uniq(presentRoles);

    presentRoles.forEach((role) => {

        const roleStat = {
            roleName: undefined,
            accounts: []
        };

        Object.keys(accounts).forEach((key) => {
            const account = accounts[key];
            const accountRole = account.roleMap[role];
            if (accountRole) {
                if (!roleStat.roleName) {
                    roleStat.roleName = accountRole.name;
                }

                roleStat.accounts.push({ name: account.accountName, count: accountRole.count });
            }
        });

        fieldArray.push({ name: roleStat.roleName, value: buildRoleString(roleStat) });
    });

    return fieldArray;
};

const buildRoleString = function (roleStat) {

    const str = roleStat.accounts
        .map((account) => `${account.name.padding(25)}${account.count}`)
        .join('\n');

    return `\`\`\`${str}\`\`\``;
};


///////////////////////////////////// ^^^
///////////////////////////////////// Above is garbage!!

const computeEncounterStats = async function (collectorId) {

    const encounters = await mongoFind('encounters', { collectorId } );

    const globalStats = {
        logCount: encounters.length,
        successCount: 0,
        combatTime: 0,
        firstEncounterStart: new Date('3000-12-31'),
        lastEncounterEnd: new Date('1960-1-1'),
        bosses: {

        },
        accounts: {},
        totalBossDps: 0,
        totalCleaveDps: 0
    };

    encounters.forEach((encounter) => {

        const formattedBossName = encounter.bossName.split(' ').join('-');
        const boss = globalStats.bosses[formattedBossName] || {
            name: encounter.bossName,
            icon: encounter.fightIcon,
            totalBossDps: 0,
            totalCleaveDps: 0,
            success: 0,
            fail: 0,
            downs: 0,
            deaths: 0
        };

        if (encounter.success) {
            globalStats.successCount++;
            boss.success++;
        }
        else {
            boss.fail++;
        }

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
                totalBarrierTaken: 0
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
            playerStats.totalDamageTaken += player.defensiveStats.damageTaken;
            playerStats.damageBarrier += player.defensiveStats.damageBarrier;

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
        .setTitle(`Statistics!`)
        .setDescription('General statistics for period starting x and ending y')
        .setColor(4688353)
        .addFields(
            [
                { name: 'General', value: buildGeneralStatsString(collectorStats) },
                { name: 'Boss Stats', value: buildBossStatsString(collectorStats) }
            ]
        );

    const playerbreakdown = new MessageEmbed()
        .setTitle('Player Breakdown')
        .setColor(4688353)
        .addFields(
            [
                ...buildPlayerStatsFields(collectorStats)
            ]
        );

    const roles = new MessageEmbed()
        .setTitle('Roles')
        .setColor(4688353)
        .setDescription(`\`\`\`${'Account Name'.padding(25)}Count\`\`\``)
        .addFields(
            [
                ...buildRoleStatsFields(collectorStats)
            ]
        );

    return await interaction.reply({ embeds: [general, playerbreakdown, roles] });
};
