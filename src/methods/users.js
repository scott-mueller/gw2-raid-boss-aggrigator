import { pathOr, filter } from 'ramda';

import { mongoFindOne, mongoUpdateById, mongoInsert } from './mongo';
import { getGW2Account } from './GW2Api';
import { useFakeXMLHttpRequest } from 'sinon';

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

    // Try to find an existing record for this user
    const query = {
        userId
    };
    const user = await mongoFindOne('discord-users', query);

    if (user) {

        let found = false;

        pathOr([], ['verifiedAccounts'])(user).forEach((verifiedAccount) => {

            if (verifiedAccount.accountName === account.data.name) {
                found = true;
            }
        });

        if (!found) {

            const newVerifiedAccounts = user.verifiedAccounts || [];
            newVerifiedAccounts.push({
                apiKey,
                accountName: account.data.name,
                storedAt: new Date()
            });

            await mongoUpdateById('discord-users', user._id, { verifiedAccounts: newVerifiedAccounts });
        }
        else {
            return 'This account has already been registered. Use `>player account list` to list all registered accounts';
        }
    }
    else {

        const newUser = {
            userId,
            verifiedAccounts: [
                {
                    apiKey,
                    accountName: account.data.name,
                    storedAt: new Date()
                }
            ]
        };

        await mongoInsert('discord-users', newUser);
    }

    return `Key verified for Account: \`${account.data.name}\``;
};

export const removeGW2Account = async function (userId, accountName) {

    // Try to find an existing record for this user
    const query = {
        userId
    };
    const user = await mongoFindOne('discord-users', query);

    if (user && user.verifiedAccounts && user.verifiedAccounts.length > 0) {

        const newVerifiedAccounts = filter((account) => {

            if (account.accountName === accountName) {
                return false;
            }

            return true;
        }, user.verifiedAccounts);

        await mongoUpdateById('discord-users', user._id, { verifiedAccounts: newVerifiedAccounts });

        return `${accountName} has been removed`;
    }

    return 'No Guild Wars 2 accounts were found';

};

export const viewVerifiedAccounts = async function (userId) {

    // Try to find an existing record for this user
    const query = {
        userId
    };
    const user = await mongoFindOne('discord-users', query);

    if (user) {

        if (!user.verifiedAccounts || user.verifiedAccounts.length === 0) {
            return 'You have not added any Guild Wars 2 Api Keys. Use `>player account add {apiKey}` to add one';
        }

        let returnMessage = '**Registered Accounts:**\n';
        for (let i = 0; i < user.verifiedAccounts.length; ++i) {

            const acc = user.verifiedAccounts[i];

            const formattedAccountAge = Moment(acc.storedAt).format('MMM Do YYYY');

            returnMessage += `${i + 1}: ${acc.accountName},             Stored: ${formattedAccountAge}\n`;
        }

        return returnMessage;
    }
};

