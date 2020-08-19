import { addGuildMember } from '../../../methods/guildManagement';
import { Server } from '../../../server';

export const handleGuildMemberAdd = async function (channelId, userId, reference, accountName) {

    Server.bot.simulateTyping(channelId);

    const accountNameRegex = RegExp(/[a-zA-z ]{2,24}\.\d{4}/);
    if (!accountNameRegex.test(accountName)) {
        Server.bot.sendMessage({
            to: channelId,
            message: 'Invalid Guild Wars 2 account name provided'
        });
        return;
    }

    const referenceRegex = RegExp(/\[.{2,4}\]-\d{3}/);
    if (!referenceRegex.test(reference)) {
        Server.bot.sendMessage({
            to: channelId,
            message: 'Invalid guild tag provided'
        });
        return;
    }

    const response = await addGuildMember(userId, reference, accountName);

    Server.bot.sendMessage({
        to: channelId,
        message: response
    });
};
