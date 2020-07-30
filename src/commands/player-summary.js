import { Server } from '../server';
import { getAllmessages } from '../methods/discord';
import { redisGet } from '../methods/redis';

export const _handlePlayerSummary = async function (args, channelID) {

    const guildId = Server.bot.channels[channelID].guild_id;
    const serverConfig = await redisGet( guildId );
    if (!serverConfig) {
        Server.bot.sendMessage({
            to: channelID,
            message: 'This server is not configured yet. Please run `>init #channelName` first'
        });
        return;
    }

    // First argument needs to be a Guild Wars 2 Account Name (Account Name.xxxx)
    const accountName = args.join(' ');
    const accountNameRegex = new RegExp(/[a-zA-z]*.\d\d\d\d/);
    if (!accountNameRegex.test(accountName)) {
        Server.bot.sendMessage({
            to: channelID,
            message: `This is not a valid Guild Wars 2 account name: ${accountName}`
        });
        return;
    }

    // Get the messages and filter them down to only ones with embedded arcDPS logs
    const messages = await getAllmessages(Server.bot.channels[channelID].guild_id, serverConfig.logChannel);
    const filteredMessages = messages.filter((message) => {

        if (message.embeds && message.embeds.length > 0) {
            const embed = message.embeds[0];

            // Lets make sure this is an arcDPS log embed
            if (embed.url && embed.url.includes('dps.report')) {
                return true;
            }
        }

        return false;
    });

    const personalStats = {
        classMap: {},
        clearBreakdown: {
            success: 0,
            failure: 0,
            total: 0
        }
    };

    // Gather the stats to display
    filteredMessages.forEach((message) => {

        const embed = message.embeds[0];

        if (embed.fields && embed.fields.length > 0) {

            embed.fields.forEach((field) => {

                // We only care about messages with this account name in them
                if (field.value.toLowerCase().includes(accountName.toLowerCase())) {

                    // Personal Success Rate
                    personalStats.clearBreakdown.total++;
                    if (embed.color === 32768) {
                        personalStats.clearBreakdown.success++;
                    }

                    else {
                        personalStats.clearBreakdown.failure++;
                    }

                    // Put together the class breakdown
                    const components = field.value.split('\n');
                    if (personalStats.classMap[components[3]] > 0) {
                        personalStats.classMap[components[3]]++;
                    }
                    else {
                        personalStats.classMap[components[3]] = 1;
                    }

                }
            });
        }
    });

    Server.bot.sendMessage({
        to: channelID,
        message: 'This is still a work in progress:',
        embed: {
            color: 4688353,
            fields: [
                {
                    name: 'Class Breakdown',
                    value: JSON.stringify(personalStats.classMap)
                },
                {
                    name: 'Personal Success Stats',
                    value: `Total Attempts: ${personalStats.clearBreakdown.total}, Successful: ${personalStats.clearBreakdown.success}, Failed: ${personalStats.clearBreakdown.failure}`
                },
                {
                    name: 'Personal Success Percentage: ',
                    value: `${((personalStats.clearBreakdown.success / personalStats.clearBreakdown.total) * 100).toFixed(2)}%`
                }
            ]
        }
    });
};
