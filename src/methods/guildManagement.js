import { mongoInsert, mongoFindOne, mongoUpdateById } from './mongo';
import { getOrCreatePlayer } from './users';
import { uniq } from 'ramda';

import { customAlphabet } from 'nanoid';

const generateId = customAlphabet('0123456789', 3);

export const createGuild = async function (name, tag, userId, guildId) {

    const returnObject = {
        error: undefined,
        result: undefined
    };

    if (!name || !tag) {
        returnObject.error = 'Invalid guild information recieved. Unable to add guild';
    }

    // Does this guild already exist
    const guild = await mongoFindOne('guilds', { name, tag });

    if (guild) {
        returnObject.error = `This guild is already registered. Use \`>guild ${guild.reference} roster\` to view this guild`;
    }

    const newGuild = {
        name,
        tag,
        homeServerId: guildId,
        reference: tag + '-' + await generateId(),
        roster: [],
        adminList: [userId]
    };
    returnObject.guild = newGuild;

    await mongoInsert('guilds', newGuild);

    const serverConfig = await mongoFindOne('discord-servers', { serverId: guildId });

    // New server - assign it as the default and return
    if (!serverConfig) {
        await mongoInsert('discord-servers', {
            defaultGuildRef: newGuild.reference,
            serverId: guildId
        });

        returnObject.result = 'SUCCESS_IS_DEFAULT';
        return returnObject;
    }

    // Server already has a default
    if (serverConfig.defaultGuildRef) {
        returnObject.result = 'SUCCESS_NOT_DEFAULT';
        return returnObject;
    }

    // Server exists but no guild
    await mongoUpdateById('discord-servers', serverConfig._id, { defaultGuildRef: newGuild.reference });
    returnObject.result = 'SUCCESS_IS_DEFAULT';

    return returnObject;
};

export const addGuildMember = async function (userId, reference, accountName) {

    // Get the guild
    const guild = await mongoFindOne('guilds', { reference });

    if (!guild) {
        return 'The specified guild does not exist';
    }

    if (!guild || !guild.adminList.includes(userId)) {
        return 'You are not on the admin list for this guild and cannot add players to the roster';
    }

    if (guild.roster.includes(accountName)) {
        return `${accountName} is already on the roster for __${guild.name} ${guild.tag}__`;
    }

    const newRoster = guild.roster;
    newRoster.push(accountName);
    await mongoUpdateById('guilds', guild._id, { roster: newRoster });

    // Need to find or create the player record for this accounName and add this guild to their guildIds list
    const player = await getOrCreatePlayer(accountName);
    const newGuildIds = player.guildIds;
    newGuildIds.push(guild._id);
    await mongoUpdateById('players', player._id, { guildIds: uniq(newGuildIds) });

    return `${accountName} added to the roster for __${guild.name} ${guild.tag}__`;
};

export const removeGuildMember = async function (userId, reference, accountName) {

};

export const getGuildRoster = async function (guildId, reference) {

    // Get the guild
    const guild = await mongoFindOne('guilds', { reference });

    const returnObject = {
        error: undefined,
        guild: undefined
    };

    if (!guild) {
        returnObject.error =  'The specified guild does not exist';
    }

    if (guildId !== guild.homeServerId) {
        returnObject.error = 'You can only view a guild\'s roster on the server where the guild is based';
    }

    if (guild.roster.length === 0) {
        returnObject.error = 'There are no players on this guild\'s roster';
    }

    returnObject.guild = guild;
    return returnObject;
};

export const changeGuildHomeServer = async function (newGuildId, reference) {

};

export const grantUserAdmin = async function (grantorUserId, granteeUserId, reference) {

    // Get the guild
    const guild = await mongoFindOne('guilds', { reference });

    if (!guild) {
        return 'The specified guild does not exist';
    }

    if (!guild.adminList.includes(grantorUserId)) {
        return 'You do not have permission to grant another user admin';
    }

    if (guild.adminList.includes(granteeUserId)) {
        return 'This user is already on the admin list for this guild';
    }

    const newAdminList = guild.adminList;
    newAdminList.push(granteeUserId);

    await mongoUpdateById('guilds', guild._id, { adminList: newAdminList });

    return `Admin list for __${guild.name} ${guild.tag}__ Updated`;
};
