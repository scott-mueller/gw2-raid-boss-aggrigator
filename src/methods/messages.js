import { Server } from '../server';
import { getAllmessages } from './discord';
import { redisGet, redisSet, redisDel } from './redis';

const _handleInit = async function (args, channelID) {

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

const _handleDeauth = async function (args, channelID, userID) {

    // We need to authenticate the use to make this call
    const activeGuildId = Server.bot.channels[channelID].guild_id;
    const discordServer = Server.bot.servers[activeGuildId];
    const userRoles = discordServer.members[userID].roles;

    let isAdmin = false;
    userRoles.forEach((role) => {

        const currentRole = discordServer.roles[role];

        if (currentRole.GENERAL_ADMINISTRATOR) {
            isAdmin = true;
        }
    });

    if (!isAdmin) {
        Server.bot.sendMessage({
            to: channelID,
            message: 'You are not authorized to change this bot\'s configuration'
        });
        return;
    }

    await redisDel(activeGuildId);

    Server.bot.sendMessage({
        to: channelID,
        message: 'Initialization removed.'
    });
};

const _handleStatsForSingleBoss = async function (args, channelID) {

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
    const allowedBossNames = await redisGet(guildId).bossNames || ['deimos'];

    if (!allowedBossNames.includes(bossName.toLowerCase())) {
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

    Server.bot.sendMessage({
        to: channelID,
        message: `${bossName}: Success: ${successCount}, Failure: ${failureCount}, Total: ${totalCount}, Success Rate: ${((successCount / totalCount) * 100).toFixed(1)}%`
    });
};

const _handleStatsDeepForSingleBoss = async function (args, channelID) {

    Server.bot.sendMessage({
        to: channelID,
        message: 'This command is not ready yet :( Sorry'
    });
};

const _handleFullRaidReport = async function (args, channelID) {

    Server.bot.sendMessage({
        to: channelID,
        message: 'This command is not ready yet :( Sorry'
    });
};

const _handlePlayerSummary = async function (args, channelID) {

    Server.bot.sendMessage({
        to: channelID,
        message: 'This command is not ready yet :( Sorry'
    });
};


export const handleMessage = function (user, userID, channelID, message, evt) {

    // Our bot needs to know if it will execute a command
    // It will listen for messages that will start with `>`
    if (message.substring(0, 1) === '>') {

        let args = message.substring(1).split(' ');
        const cmd = args[0];
        args = args.splice(1);

        switch (cmd) {

            // !ping
            case 'ping':
                Server.bot.sendMessage({
                    to: channelID,
                    message: 'Pong!'
                });
                break;

            case 'help':
                Server.bot.sendMessage({
                    to: channelID,
                    message: 'Here is a list of commands I can respond to:',
                    embed: {
                        color: 4688353,
                        fields: [
                            {
                                name: '`>init #channelName`',
                                value: 'Sets up the bot to look for arc dps log embeds produced by plenbot'
                            },
                            {
                                name: '`>stats Boss Name`',
                                value: 'Displays a breakdown of kills for the given boss showing number oof successful, failed, and success rate'
                            },
                            {
                                name: '`>report`',
                                value: 'Displays the same data as the above command, but for every boss'
                            },
                            {
                                name: '`>player-summary AccountName.xxxx`',
                                value: 'Displays personal statistics for the given accoount name'
                            },
                            {
                                name: '`>stats-deep Boss Name`',
                                value: 'Provides a more in depth report for the given boss.'
                            },
                            {
                                name: '`>deauth`',
                                value: 'Removes the configs created during initialization. Can only be performed by an admin of the server.'
                            }
                        ]
                    }
                });
                break;

            case 'init':
                _handleInit(args, channelID);
                break;

            case 'stats':
                Server.bot.simulateTyping(channelID);
                _handleStatsForSingleBoss(args, channelID);
                break;

            case 'report':
                _handleFullRaidReport(args, channelID);
                break;

            case 'player-summary':
                _handlePlayerSummary(args, channelID);
                break;

            case 'stats-deep':
                _handleStatsDeepForSingleBoss(args, channelID);
                break;

            case 'deauth':
                _handleDeauth(args, channelID, userID);
                break;

            default:
                Server.bot.sendMessage({
                    to: channelID,
                    message: 'This command is not supported at this time'
                });
        }
    }
}

;
