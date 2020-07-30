import { Server } from '../server';
import { redisGet } from './redis';

import { handleInit } from '../commands/init';
import { handleDeauth } from '../commands/deauth';
import { handleStatsForSingleBoss } from '../commands/stats';
import { handleStatsDeepForSingleBoss } from '../commands/stats-deep';
import { handleFullRaidReport } from '../commands/report';

const processNewLog = async function (channelID, embed) {

    //TODO
    console.log( 'got a new log!' );
};


const handleListenChannelMessage = async function (channelID, message) {

    // Lets check if this is a plenBot embed message
    if (message.embeds && message.embeds.length > 0) {
        const embed = message.embeds[0];

        // Lets make sure this is an arcDPS log embed
        if (embed.url && embed.url.includes('dps.report')) {

            // process the message
            await processNewLog(channelID, embed);
        }
    }
};

export const handleMessage = async function (user, userID, channelID, message, evt) {

    // We want to listen for messages coming from any of our configured channels.
    const listenChannels = await redisGet('listenChannels');
    if (listenChannels.includes(channelID)) {
        handleListenChannelMessage(channelID, message);
    }

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
                                value: 'Displays a breakdown of kills for the given boss showing number of successful, failed, and success rate'
                            },
                            {
                                name: '`>stats-clean <time> Boss Name`',
                                value: 'Displays a breakdown of kills for the given boss showing number of successful, failed, and success rate, ommitting logs that have a duration less than the specified time. This is to clean up false starts'
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
                handleInit(args, channelID);
                break;

            case 'stats':
                Server.bot.simulateTyping(channelID);
                handleStatsForSingleBoss(args, channelID);
                break;

            case 'stats-clean':
                Server.bot.simulateTyping(channelID);
                const time = args[0];

                handleStatsForSingleBoss(args.slice(1), channelID, true, time);
                break;

            case 'report':
                Server.bot.simulateTyping(channelID);
                handleFullRaidReport(args, channelID);
                break;

            case 'player-summary':
                Server.bot.simulateTyping(channelID);
                _handlePlayerSummary(args, channelID);
                break;

            case 'stats-deep':
                Server.bot.simulateTyping(channelID);
                handleStatsDeepForSingleBoss(args, channelID);
                break;

            case 'deauth':
                handleDeauth(args, channelID, userID);
                break;

            case 'player-summery':
                Server.bot.sendMessage({
                    to: channelID,
                    message: 'Dumb bitch!'
                });
                break;

            default:
                Server.bot.sendMessage({
                    to: channelID,
                    message: 'This command is not supported at this time'
                });
        }
    }
};
