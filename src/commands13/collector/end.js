import { mongoFind, mongoFindOne, mongoUpdateById } from '../../methods/mongo';

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
        globalStats.bosses[formattedBossName]
            ? globalStats.bosses[formattedBossName]++
            : globalStats.bosses[formattedBossName] = 1;


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
    await mongoUpdateById('collectors', collector._id, { active: false, endTime: Date.now() } );
    const collectorStats = await computeEncounterStats(collector._id);

    console.log(JSON.stringify(collectorStats));
    // Format the stats into the reply

    return await interaction.reply(`\`\`\`${JSON.stringify(collectorStats).substr(0, 1800)}\`\`\``);
};
