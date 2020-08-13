import { viewVerifiedAccounts } from '../../../methods/users';
import { Server } from '../../../server';

export const handleAccountList = async function (channelId, userId) {

    Server.bot.simulateTyping(channelId);

    const response = await viewVerifiedAccounts(userId);

    Server.bot.sendMessage({
        to: channelId,
        message: response
    });
};
