import { Server } from '../server';
import { redisGet, redisSet } from './redis';
import { pathOr, uniq } from 'ramda';

const _maybeAddBossNamesToAllowedBossesList = async function (guildId, messages) {

    const config = await redisGet(guildId);
    const bossNames = config.bossNames || [];

    messages.forEach((message) => {

        if (message.embeds && message.embeds.length > 0) {
            const embed = message.embeds[0];

            // Lets make sure this is an arcDPS log embed
            if (embed.url && embed.url.includes('dps.report')) {
                if (!bossNames.includes(embed.title.toLowerCase())) {
                    bossNames.push(embed.title.toLowerCase());
                }
            }
        }
    });

    config.bossNames = uniq(bossNames);

    await redisSet(guildId, config);
};

export const getMessages = function (guildId, channelID, before) {

    const options = {
        channelID,
        limit: 100,
        before
    };

    return new Promise( (resolve, reject) => {

        Server.bot.getMessages(options, async (err, messages) => {

            if (err) {
                console.log( err );
                return [];
            }

            await _maybeAddBossNamesToAllowedBossesList(guildId, messages);

            return resolve(messages);
        });
    });
};

export const getAllmessages = async function (guildId, channelID) {

    let allMessages = [];
    let gotAllMessages = false;

    console.log( `Fetching messages for ${guildId}` );

    while (!gotAllMessages) {

        const id = pathOr(undefined, ['id'])(allMessages[allMessages.length - 1]);
        const messages = await getMessages(guildId, channelID, id);

        if (messages.length === 0 || allMessages.length >= 10000) {
            gotAllMessages = true;
            break;
        }

        allMessages = allMessages.concat(messages);
    }

    console.log( 'DONE - TotalMessages: ' + allMessages.length );
    return allMessages;
};
