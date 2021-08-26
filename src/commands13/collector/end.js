/* eslint-disable no-extend-native */
import { MessageEmbed } from 'discord.js';
import { uniq } from 'ramda';
import { mongoFind, mongoFindOne, mongoUpdateById } from '../../methods/mongo';

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
${'Downs:'.padding(12)}${account.downs} 
${'Deaths:'.padding(12)}${account.deaths}
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

const computeEncounterStats = async function (collectorId) {

    const encounters = await mongoFind('encounters', { collectorId } );

    const globalStats = {
        logCount: encounters.length,
        successCount: 0,
        bosses: {

        },
        accounts: {},
        totalBossDps: 0,
        totalCleaveDps: 0
    };

    encounters.forEach((encounter) => {

        // Global Stats
        if (encounter.success) {
            globalStats.successCount++;
        }

        const formattedBossName = encounter.bossName.split(' ').join('-');
        if (globalStats.bosses[formattedBossName]) {
            encounter.success
                ? globalStats.bosses[formattedBossName].success++
                : globalStats.bosses[formattedBossName].fail++;
        }
        else {
            const boss = { name: encounter.bossName, success: 0, fail: 0 };
            encounter.success
                ? boss.success++
                : boss.fail++;
            globalStats.bosses[formattedBossName] = boss;
        }

        encounter.players.forEach((player) => {

            if (player.subgroup > 20) {
                return;
            }

            const formattedAccountName = player.accountName.split(' ').join('-');
            const playerStats = globalStats.accounts[formattedAccountName] || {
                accountName: player.accountName,
                downs: 0,
                deaths: 0,
                revives: 0,
                reviveTime: 0,
                roleMap: {},
                encounterCount: 0,
                totalBossDps: 0,
                totalCleaveDps: 0
            };

            playerStats.downs += player.defensiveStats.downs.length;
            playerStats.deaths += player.defensiveStats.deaths.length;
            playerStats.revives += player.supportStats.revives;
            playerStats.reviveTime += player.supportStats.reviveTimes;
            playerStats.encounterCount++;
            playerStats.totalBossDps += player.dmgStats.targetDPS;
            playerStats.totalCleaveDps += player.dmgStats.totalDPS;

            globalStats.totalBossDps += player.dmgStats.targetDPS;
            globalStats.totalCleaveDps += player.dmgStats.totalDPS;

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
