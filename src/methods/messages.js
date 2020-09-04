import { config } from '../config';
import { Server } from '../server';

import { handleInit } from '../commands/init';
import { handleDeauth } from '../commands/deauth';
import { handleStatsForSingleBoss } from '../commands/stats';
import { handleStatsDeepForSingleBoss } from '../commands/stats-deep';
import { handleFullRaidReport } from '../commands/report';

import { handleInitialPopulate } from './maintenance';

import { maybeProcessEncounter } from './processEncounter';
import { handleAccountAdd } from '../commands/player/account/add';
import { handleAccountRemove } from '../commands/player/account/remove';
import { handleAccountList } from '../commands/player/account/list';

import { handleGuildCreate } from '../commands/guild/create';
import { handleGuildMemberAdd } from '../commands/guild/member/add';
import { handleGuildViewRoster } from '../commands/guild/roster';
import { handleGuildGrantAdmin } from '../commands/guild/grant-admin';
import { mongoFindOne } from './mongo';
import { handleStatsDeep } from '../commands/stats/deep';

const _appendGuildReferenceToBeginningOfArgs = async function (args, guildId) {

    const referenceRegex = RegExp(/\[.{2,4}\]-\d{3}/);
    if (referenceRegex.test(args[0])) {
        return args;
    }

    const serverConfig = await mongoFindOne('discord-servers', { serverId: guildId });

    if (!serverConfig) {
        return undefined;
    }

    const newArgs = args;
    args.unshift(serverConfig.defaultGuildRef);
    return newArgs;
};

const _handleGuildCommand = async function (args, userID, channelID) {

    const guildId = Server.bot.channels[channelID].guild_id;

    if (args[0] === 'create') {

        const name = args.slice(1, args.length - 1).join(' ');
        const tag = args[args.length - 1];
        await handleGuildCreate(channelID, userID, name, tag, guildId);
        return;
    }

    if (args[0] === 'delete') {

        // TODO
        return;
    }

    const argsWithReference = await _appendGuildReferenceToBeginningOfArgs(args, guildId);

    if (!argsWithReference) {
        Server.bot.sendMessage({
            to: channelID,
            message: 'No reference passed and unable to locate a default reference for this guild.\n You may need to create a guild first'
        });
        return;
    }

    switch (args[1]) {

        case 'member':
            if (args[2] === 'add') {
                const accountName = args.slice(3).join(' ');
                await handleGuildMemberAdd(channelID, userID, args[0], accountName);
                break;
            }
            // remove

            break;

        case 'roster':
            await handleGuildViewRoster(channelID, guildId, args[0]);
            break;

        case 'grant-admin':
            await handleGuildGrantAdmin(channelID, guildId, args[0], userID, args[2]);
            break;

        default:
            Server.bot.sendMessage({
                to: channelID,
                message: 'Unknown guild command'
            });
            break;
    }
};

const _handlePlayerCommand = async function (args, user, userID, channelID, message, evt) {

    if (args.length < 1) {
        return;
    }

    if (args[0] === 'account') {

        if (!args[1]) {
            return;
        }

        switch (args[1]) {

            // >player account add {api_key}
            case 'add':

                if (!args[2]) {
                    return;
                }

                await handleAccountAdd(channelID, userID, evt.d.id, args[2]);
                break;

            case 'remove':

                if (!args[2]) {
                    return;
                }

                await handleAccountRemove(channelID, userID, args[2]);
                break;

            case 'view':

                await handleAccountList(channelID, userID);
                break;
        }
    }
    else if (args[0] === 'summary') {
        // handle player summary
    }
};

const _handleStatsCommand = async function (args, userID, channelID) {

    const guildId = Server.bot.channels[channelID].guild_id;

    if (args[0] === 'deep') {
        const bossName = args.slice(1).join(' ');

        const argsWithReference = await _appendGuildReferenceToBeginningOfArgs(args, guildId);

        await handleStatsDeep(channelID, argsWithReference[0], bossName );
    }
};

export const handleMessage = async function (user, userID, channelID, message, evt) {

    if (message.substring(0, 1) === '>') {

        let args = message.substring(1).split(' ');
        const baseCmd = args[0];
        args = args.splice(1);

        switch (baseCmd) {

            case 'player':
                _handlePlayerCommand(args, user, userID, channelID, message, evt);
                break;

            case 'guild':
                _handleGuildCommand(args, userID, channelID);
                break;

            case 'stats':
                _handleStatsCommand(args, userID, channelID);
                break;

            case 'quick-start':
                break;
        }
    }

    // No commands found. Maybe we have en encounter to process?
    const guildId = Server.bot.channels[channelID].guild_id;
    await maybeProcessEncounter(guildId, evt.d);
    return;

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
                //handlePlayerSummary(args, channelID);
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

        return;
    }

    // Maintenance routes stats with `}`
    // These are not publically accsessible and can only be executed by certain userIds
    if (message.substring(0, 1) === '}') {

        if (!config.maintenanceUsers.includes(userID)) {
            Server.bot.sendMessage({
                to: channelID,
                message: 'You do not have permission to run maintenance commands'
            });
            return;
        }

        let args = message.substring(1).split(' ');
        const cmd = args[0];
        args = args.splice(1);

        switch (cmd) {

            case 'initial-db-populate':
                handleInitialPopulate(args, channelID);
                break;

            case 'scrape-channel':
                //TODO - scrapes all messages in a channel for logs
                // WARNING - Wiill be very resource intensive, don't expect a response for a while and the bot will be unusable during this time
                break;
        }

        return;
    }
};
