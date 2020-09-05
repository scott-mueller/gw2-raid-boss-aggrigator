import { Server } from '../../server';
import { grantUserAdmin } from '../../methods/guildManagement';

export const handleGuildGrantAdmin = async function (channel, guildId, reference, grantorUserId, granteeUserId) {

    channel.startTyping();

    const trimmedGranteeUserId = granteeUserId.substring(2, granteeUserId.length - 1);

    const serverMembersObject = Server.bot.servers[guildId].members;

    if (!Object.keys(serverMembersObject).includes(trimmedGranteeUserId)) {
        channel.send('You did not pass a user, or this user is not a member of this server');
        channel.stopTyping();
        return;
    }

    const response = await grantUserAdmin(grantorUserId, trimmedGranteeUserId, reference);

    channel.send(response);
    channel.stopTyping();
};
