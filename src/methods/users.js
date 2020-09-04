import { path, pathOr, filter, unfold } from 'ramda';

import { mongoFindOne, mongoUpdateById, mongoInsert, mongoFind } from './mongo';
import { getGW2Account } from './GW2Api';

const Moment = require('moment-timezone');

export const verifyGW2Account = function (userId, accountName) {

    // Checks the userId against the accountName given, if its present for that user return it
};

export const addGW2Account = async function (userId, apiKey) {

    const account = await getGW2Account(apiKey);

    if (account.error) {

        if (account.code === 400 || account.code === 401) {
            return `An invalid api key was provided. Please visit https://account.arena.net/applications to manage your keys`;
        }

        return `A problem occoured while contacting the guild wars 2 api. Please try again later.`;
    }

    // Call getOrCreatePlayer for this accountName
    const playerRecord = await getOrCreatePlayer(account.data.name);

    if (playerRecord.verification) {
        return 'This account has already been registered. Use `>player account list` to list all registered accounts';
    }

    // Add a verification object to the result
    const verification = {
        apiKey,
        userId,
        storedAt: new Date(),
        accountCreatedAt: new Date(account.created)
    };

    // Update the doc
    await mongoUpdateById('players', playerRecord._id, { verification });

    return `Key verified for Account: \`${account.data.name}\``;
};

export const removeGW2Account = async function (userId, accountName) {

    // Try to find an existing record for this user
    const query = {
        'verification.userId': userId,
        accountName
    };
    const playerRecord = await mongoFindOne('players', query);

    if (!playerRecord) {
        return 'This account is not registered';
    }

    delete playerRecord.verification;

    await mongoUpdateById('players', playerRecord._id, { verification: undefined });

    return `${accountName} has been removed`;
};

export const viewVerifiedAccounts = async function (userId) {

    const returnObject = {
        error: undefined,
        players: undefined
    };

    const playerRecords = await mongoFind('players', { 'verification.userId': userId });

    if (playerRecords.length === 0) {
        returnObject.error = 'You have not added any Guild Wars 2 Api Keys. Use `>player account add {apiKey}` to add one';
        return returnObject;
    }

    returnObject.players = playerRecords;
    return returnObject;
};

export const getOrCreatePlayer = async function (accountName) {

    let player = await mongoFindOne('players', { accountName });

    if (!player) {
        const newPlayer = {
            accountName,
            guildIds: []
        };

        const result = await mongoInsert('players', newPlayer);
        player = pathOr(newPlayer, ['ops', 0])(result);
    }

    return player;
};
