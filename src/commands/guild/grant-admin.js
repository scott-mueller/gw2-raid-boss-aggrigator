import { Server } from '../../server';
import { grantUserAdmin } from '../../methods/guildManagement';

export const handleGuildGrantAdmin = async function (channelId, guildId, reference, grantorUserId, granteeUserId) {

    Server.bot.simulateTyping(channelId);

    const trimmedGranteeUserId = granteeUserId.substring(2, granteeUserId.length - 1);

    const serverMembersObject = Server.bot.servers[guildId].members;

    console.log( Object.keys(serverMembersObject) );
    if (!Object.keys(serverMembersObject).includes(trimmedGranteeUserId)) {
        Server.bot.sendMessage({
            to: channelId,
            message: 'You did not pass a user, or this user is not a member of this server'
        });
        return;
    }

    const response = await grantUserAdmin(grantorUserId, trimmedGranteeUserId, reference);

    Server.bot.sendMessage({
        to: channelId,
        message: response
    });
};
