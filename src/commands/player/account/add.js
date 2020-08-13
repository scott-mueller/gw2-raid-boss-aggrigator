import { addGW2Account } from '../../../methods/users';
import { Server } from '../../../server';

export const handleAccountAdd = async function (channelId, userId, toDeleteMessageID, apiKey) {

    Server.bot.simulateTyping(channelId);

    Server.bot.deleteMessage({
        channelID: channelId,
        messageID: toDeleteMessageID
    });

    const response = await addGW2Account(userId, apiKey);

    Server.bot.sendMessage({
        to: channelId,
        message: `${response}\nYour Key has been removed for privacy`
    });
};
