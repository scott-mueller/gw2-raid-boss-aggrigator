import { removeGW2Account } from '../../../methods/users';
import { Server } from '../../../server';

export const handleAccountRemove = async function (channelId, userId, accountName) {

    Server.bot.simulateTyping(channelId);

    const response = await removeGW2Account(userId, accountName);

    Server.bot.sendMessage({
        to: channelId,
        message: response
    });
};
