import { Server } from '../server';
import { pathOr } from 'ramda';
import { getMessages } from './discord';

const _getAllmessages = async function () {

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

const _handleGetStats = async function (channelID) {

    const messages = await _getAllmessages();

    console.log( messages.lengh );

    Server.bot.sendMessage({
        to: channelID,
        message: 'Haud yer wheesht!'
    });
};

const _handleSingleBoss = async function (channelID, boss) {

    const messages = await _getAllmessages();

    let successCount = 0;
    let failureCount = 0;
    let totalCount = 0;

    messages.forEach((message) => {

        const embed = message.embeds[0];

        if (embed && embed.title.toLowerCase() === boss.toLowerCase()) {

            if (message.embeds[0].color === 32768) {
                successCount++;
            }

            else {
                failureCount++;
            }

            totalCount++;
        }
    });

    Server.bot.sendMessage({
        to: channelID,
        message: `${boss}: Success: ${successCount}, Failure: ${failureCount}, Total: ${totalCount}, Success Rate: ${((successCount / totalCount) * 100).toFixed(1)}%`
    });

};

export const handleMessage = function (user, userID, channelID, message, evt) {

    // Our bot needs to know if it will execute a command
    // It will listen for messages that will start with `>`
    if (message.substring(0, 1) === '>') {
        const cmd = message.substring(1);

        switch (cmd) {

            // !ping
            case 'ping':
                Server.bot.sendMessage({
                    to: channelID,
                    message: 'Pong!'
                });
                break;

            case 'stats':
                console.log( 'fetching stats' );
                _handleGetStats(channelID);
                break;

            default:
                _handleSingleBoss(channelID, cmd);
                break;
        }
    }
};
