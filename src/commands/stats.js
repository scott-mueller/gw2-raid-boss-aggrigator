import { Server } from '../server';
import { getAllmessages } from '../methods/discord';
import { redisGet } from '../methods/redis';

export const handleStatsForSingleBoss = async function (args, channelID, statsClean, limitTime) {

    const guildId = Server.bot.channels[channelID].guild_id;
    const serverConfig = await redisGet( guildId );
    if (!serverConfig) {
        Server.bot.sendMessage({
            to: channelID,
            message: 'This server is not configured yet. Please run `>init #channelName` first'
        });
        return;
    }

    const messages = await getAllmessages(Server.bot.channels[channelID].guild_id, serverConfig.logChannel);

    const bossName = args.join(' ');
    const config = await redisGet(guildId);
    const bossNames = config.bossNames || [];

    if (!bossNames.includes(bossName.toLowerCase())) {
        Server.bot.sendMessage({
            to: channelID,
            message: `No logs were found for this boss: ${bossName}`
        });
        return;
    }

    let successCount = 0;
    let failureCount = 0;
    let totalCount = 0;

    messages.forEach((message) => {

        if (message.embeds && message.embeds.length > 0) {
            const embed = message.embeds[0];

            // Lets make sure this is an arcDPS log embed
            if (embed.url && embed.url.includes('dps.report')) {

                if (embed && embed.title.toLowerCase() === bossName.toLowerCase()) {

                    // If stats clean, we only care about logs longer than 40 seconds
                    const descriptionSplit = embed.description.split('\n');
                    const time = descriptionSplit[1].substring(10);
                    const timeSplit = time.split(' ');

                    if (timeSplit.length === 3) {
                        timeSplit[0] = parseInt(timeSplit[0].substring(0, 2));
                        timeSplit[1] = parseInt(timeSplit[1].substring(0, 2));
                        timeSplit[2] = parseInt(timeSplit[2].substring(0, 3));

                        const lTime = parseInt(limitTime) !== 'NaN' ? parseInt(limitTime) : 40;

                        if (statsClean && timeSplit[0] === 0 && timeSplit[1] < lTime) {
                            return;
                        }
                    }

                    if (message.embeds[0].color === 32768) {
                        successCount++;
                    }

                    else {
                        failureCount++;
                    }

                    totalCount++;
                }
            }
        }
    });

    // Format the boss name we're returning
    const bossNameArr = bossName.toLowerCase().split(' ');
    if (bossNameArr[bossNameArr.length - 1].toLowerCase() === 'cm') {
        bossNameArr[bossNameArr.length - 1] = bossNameArr[bossNameArr.length - 1].toUpperCase();
    }

    for (let i = 0; i < bossNameArr.length; ++i) {

        bossNameArr[i] = bossNameArr[i].charAt(0).toUpperCase() + bossNameArr[i].slice(1);
    }

    const embed = {
        title: `**${bossNameArr.join(' ')}**`,
        color: 4688353,
        fields: [
            {
                name: 'Totals',
                value: `**Success**: ${successCount}\n**Failure**: ${failureCount}\n**Total**: ${totalCount}`
            },
            {
                name: 'Success Rate',
                value: `${((successCount / totalCount) * 100).toFixed(1)}%`
            }
        ]
    };

    const thumbnailUrl = await redisGet(bossNameArr.join(' '));
    if (thumbnailUrl) {
        embed.thumbnail = {
            url: thumbnailUrl
        };
    }

    Server.bot.sendMessage({
        to: channelID,
        embed
    });
};
