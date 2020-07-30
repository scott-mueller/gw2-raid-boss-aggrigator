import { Server } from '../server';
import { redisGet, redisSet } from '../methods/redis';

export const handleInit = async function (args, channelID) {

    // Lets see whether this server is already initialised
    const activeGuildId = Server.bot.channels[channelID].guild_id;
    const serverCache = await redisGet(activeGuildId.toString());
    if (serverCache !== undefined) {
        Server.bot.sendMessage({
            to: channelID,
            message: 'This server is already initialised. If you would like to reinitialise, please use command `>deauth`, followed by `>init {#channelName}`'
        });
        return;
    }

    // First argument needs to be a channelID
    const channelIdRegex = new RegExp(/<#\d*>/);
    if (!channelIdRegex.test(args[0])) {
        Server.bot.sendMessage({
            to: channelID,
            message: 'You did not provide a valid channel to init on'
        });
        return;
    }

    // Ensure the channel we got is on the same server the init command came fromo
    const initChannelId = args[0].substring(2, args[0].length - 1);
    const initChannel = Server.bot.channels[initChannelId];
    if (!initChannel || initChannel.guild_id !== activeGuildId) {
        Server.bot.sendMessage({
            to: channelID,
            message: 'This channel does not exist on this server'
        });
        return;
    }

    // Lets do the init
    await redisSet(activeGuildId, {
        logChannel: initChannelId
    });

    console.log( `Initializing ${activeGuildId} for channel: ${initChannelId}` );
    Server.bot.sendMessage({
        to: channelID,
        message: 'this server has now been initialized'
    });
};
