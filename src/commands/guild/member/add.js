import { addGuildMember } from '../../../methods/guildManagement';

export const handleGuildMemberAdd = async function (channel, userId, reference, accountName) {

    channel.startTyping();

    const accountNameRegex = RegExp(/[a-zA-z ]{2,24}\.\d{4}/);
    if (!accountNameRegex.test(accountName)) {
        channel.send('Invalid Guild Wars 2 account name provided');
        channel.stopTyping();
        return;
    }

    const referenceRegex = RegExp(/\[.{2,4}\]-\d{3}/);
    if (!referenceRegex.test(reference)) {
        channel.send('Invalid guild tag provided');
        channel.stopTyping();
        return;
    }

    const response = await addGuildMember(userId, reference, accountName);

    channel.send(response);
    channel.stopTyping();
};
