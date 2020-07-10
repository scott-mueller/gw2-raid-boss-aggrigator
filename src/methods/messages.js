import { Server } from '../server';
import { pathOr, type } from 'ramda';
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


const _handleInit = async function (args, channelID) {

    // First argument needs to be a channelID
    const channelIdRegex = new RegExp('<#\d*>');
    console.log( args[0] );
    console.log( !channelIdRegex.test(args[0]) );
    if (!channelIdRegex.test(args[0])) {
        Server.bot.sendMessage({
            to: channelID,
            message: 'You did not provide a valid channel to init on'
        });
    }

    // ChannelID also needs to be a channel on the server this message was sent on
    console.log( Server.channels );

};

const _handleStatsForSingleBoss = async function (args, channelID) {

    Server.bot.sendMessage({
        to: channelID,
        message: 'This command is not ready yet :( Sorry'
    });
};

const _handleStatsDeepForSingleBoss = async function (args, channelID) {

    Server.bot.sendMessage({
        to: channelID,
        message: 'This command is not ready yet :( Sorry'
    });
};

const _handleFullRaidReport = async function (args, channelID) {

    Server.bot.sendMessage({
        to: channelID,
        message: 'This command is not ready yet :( Sorry'
    });
};

const _handlePlayerSummary = async function (args, channelID) {

    Server.bot.sendMessage({
        to: channelID,
        message: 'This command is not ready yet :( Sorry'
    });
};


export const handleMessage = function (user, userID, channelID, message, evt) {

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

            case 'init':
                _handleInit(args, channelID);
                break;

            case 'stats':
                _handleStatsForSingleBoss(args, channelID);
                break;

            case 'report':
                _handleFullRaidReport(args, channelID);
                break;

            case 'player-summary':
                _handlePlayerSummary(args, channelID);
                break;

            case 'stats-deep':
                _handleStatsDeepForSingleBoss(args, channelID);
                break;

            default:
                Server.bot.sendMessage({
                    to: channelID,
                    message: 'This command is not supported at this time'
                });
        }
    }
}

;
