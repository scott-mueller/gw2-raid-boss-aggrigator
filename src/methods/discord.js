import { Server } from '../server';
import { redisGet, redisSet } from './redis';

const _maybeAddBossNamesToAllowedBossesList = async function (messages) {

    const messageNames = await redisGet('bossNames') || [];

    messages.forEach((message) => {

        const embed = message.embeds[0];

        if (embed && !messageNames.includes(embed.title)) {
            messageNames.push(embed.title);
        }
    });

    await redisSet('bossNames', messageNames);
};

export const getMessages = function (before) {

    const options = {
        channelID: '702009085024927744',
        limit: 100,
        before
    };

    return new Promise( (resolve, reject) => {

        Server.bot.getMessages(options, async (err, messages) => {

            if (err) {
                console.log( err );
                return [];
            }

            await _maybeAddBossNamesToAllowedBossesList(messages);

            return resolve(messages);
        });
    });
};

export const getAllmessages = async function () {

    let allMessages = [];
    let gotAllMessages = false;

    while (!gotAllMessages) {

        const id = pathOr(undefined, ['id'])(allMessages[allMessages.length - 1]);
        const messages = await getMessages(id);

        if (messages.length === 0 || allMessages.length >= 10000) {
            gotAllMessages = true;
            console.log( 'DONE!!' );
            break;
        }

        allMessages = allMessages.concat(messages);
    }

    console.log( 'TotalMessages: ' + allMessages.length );
    return allMessages;
};