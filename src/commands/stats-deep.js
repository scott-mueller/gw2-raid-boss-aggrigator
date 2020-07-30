import { Server } from '../server';
import { getAllmessages } from '../methods/discord';
import { redisGet } from '../methods/redis';

export const handleStatsDeepForSingleBoss = async function (args, channelID) {

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
    console.log( messages.length );


    Server.bot.sendMessage({
        to: channelID,
        message: 'This command (stats-deep) is not ready yet :( Sorry'
    });
};
