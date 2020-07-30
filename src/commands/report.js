import { Server } from '../server';

export const handleFullRaidReport = async function (args, channelID) {

    Server.bot.sendMessage({
        to: channelID,
        message: 'This command (report) is not ready yet :( Sorry'
    });
};
