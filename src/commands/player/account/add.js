import { addGW2Account } from '../../../methods/users';

export const handleAccountAdd = async function (message, channel, userId, apiKey) {

    channel.startTyping();

    message.delete();

    const response = await addGW2Account(userId, apiKey);

    channel.send(`${response}\nYour Key has been removed for privacy`);
    channel.stopTyping();
};
