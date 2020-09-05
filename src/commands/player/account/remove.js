import { removeGW2Account } from '../../../methods/users';

export const handleAccountRemove = async function (channel, userId, accountName) {

    channel.startTyping();

    const response = await removeGW2Account(userId, accountName);

    channel.send(response);
    channel.stopTyping();
};
