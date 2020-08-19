import { mongoInsert, mongoFindOne, mongoUpdateById } from './mongo';
import { getOrCreatePlayer } from './users';
import { uniq } from 'ramda';

import { customAlphabet } from 'nanoid';

const generateId = customAlphabet('0123456789', 3);

export const createGuild = async function (name, tag, userId, guildId) {

    if (!name || !tag) {
        return 'Invalid guild information recieved. Unable to add guild';
    }

    // Does this guild already exist
    const guild = await mongoFindOne('guilds', { name, tag });

    if (guild) {
        return `This guild is already registered. Use \`>guild view ${guild.reference}\` to view this guild`;
    }

    const newGuild = {
        name,
        tag,
        homeServerId: guildId,
        reference: tag + '-' + await generateId(),
        roster: [],
        adminList: [userId]
    };

    await mongoInsert('guilds', newGuild);

    return `Guild: ${name} ${tag} created.\nThe following ID should be used to refer to it in future commands: ${newGuild.reference}`;

};

export const addGuildMember = async function (userId, reference, accountName, ) {

    // Get the guild
    const guild = await mongoFindOne('guilds', { reference });

    if (!guild) {
        return 'The specified guild does not exist';
    }

    if (!guild || !guild.adminList.includes(userId)) {
        return 'You are not on the admin list for this guild and cannot add players to the roster';
    }

    if (guild.roster.includes(accountName)) {
        return `${accountName} is already on the roster for ${guild.name} ${guild.tag}`;
    }

    const newRoster = guild.roster;
    newRoster.push(accountName);
    await mongoUpdateById('guilds', guild._id, { roster: newRoster });

    // Need to find or create the player record for this accounName and add this guild to their guildIds list
    const player = await getOrCreatePlayer(accountName);
    const newGuildIds = player.guildIds;
    newGuildIds.push(guild._id);
    await mongoUpdateById('players', player._id, { guildIds: uniq(newGuildIds) });

    return `${accountName} addeed to the roster for ${guild.name} ${guild.tag}`;
};

export const removeGuildMember = async function (userId, reference, accountName) {

};

export const getGuildRoster = async function (guildId, reference) {

    console.log( reference );

    // Get the guild
    const guild = await mongoFindOne('guilds', { reference });

    if (!guild) {
        return 'The specified guild does not exist';
    }

    if (guildId !== guild.homeServerId) {
        return 'You can only view a guild\'s roster on the server where the guild is based';
    }

    let returnMessage = `**Guild roster for:** ${guild.name} ${guild.tag}\n`;
    for (let i = 0; i < guild.roster.length; ++i) {

        returnMessage += `${i + 1}: ${guild.roster[i]}\n`;
    }

    return returnMessage;
};

export const changeGuildHomeServer = async function (newGuildId, reference) {

};

export const grantUserAdmin = async function (grantorUserId, granteeUserId, reference) {

};
