import { config } from '../config';
import { Server } from '../server';

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

const _handleGuildCommand = async function (args, message) {

    const guildId = message.channel.guild.id;

    if (args[0] === 'create') {

        const name = args.slice(1, args.length - 1).join(' ');
        const tag = args[args.length - 1];
        await handleGuildCreate(message.channel, message.author.id, name, tag, guildId);
        return;
    }

    if (args[0] === 'delete') {

        // TODO
        return;
    }

    const argsWithReference = await _appendGuildReferenceToBeginningOfArgs(args, guildId);

    if (!argsWithReference) {
        message.channel.send('No reference passed and unable to locate a default reference for this guild.\n You may need to create a guild first');
        return;
    }

    switch (args[1]) {

        case 'member':
            if (args[2] === 'add') {
                const accountName = args.slice(3).join(' ');
                await handleGuildMemberAdd(message.channel, message.author.id, args[0], accountName);
                break;
            }
            // remove

            break;

        case 'roster':
            await handleGuildViewRoster(message.channel, guildId, args[0]);
            break;

        case 'grant-admin':
            await handleGuildGrantAdmin(message.channel, guildId, args[0], message.author.id, args[2]);
            break;

        default:
            message.channel.send('Unknown guild command');
            break;
    }
};

const _handlePlayerCommand = async function (args, message) {

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

                await handleAccountAdd(message, message.channel, message.author.id, args[2]);
                break;

            case 'remove':

                if (!args[2]) {
                    return;
                }

                await handleAccountRemove(message.channel, message.author.id, args[2]);
                break;

            case 'view':

                await handleAccountList(message.channel, message.author.id);
                break;
        }
    }
    else if (args[0] === 'summary') {
        // handle player summary
    }
};

const _handleStatsCommand = async function (args, message) {

    const guildId = message.channel.guild.id;

    if (args[0] === 'deep') {
        const bossName = args.slice(1).join(' ');

        const argsWithReference = await _appendGuildReferenceToBeginningOfArgs(args, guildId);

        await handleStatsDeep(message.channel, argsWithReference[0], bossName );
    }
};

export const handleMessage = async function (message) {

    const msgContent = message.content;

    if (msgContent.substring(0, 1) === '>') {

        let args = msgContent.substring(1).split(' ');
        const baseCmd = args[0];
        args = args.splice(1);

        const commandHandlerMap = {
            guild: (a, m) => _handleGuildCommand(a, m),         // Deprecated
            player: (a, m) => _handlePlayerCommand(a, m),       // Deprecated
            stats: (a, m) => _handleStatsCommand(a, m),         // Deprecated
            test: (a, m) => {


            }
        };

        await commandHandlerMap[baseCmd](args, message);
    }

    // No commands found. Maybe we have en encounter to process?
    const guildId = message.guild.id;
    await maybeProcessEncounter(guildId, message);
    return;
};
