import { Server } from '../server';
import { redisDel } from '../methods/redis';

export const handleDeauth = async function (args, channelID, userID) {

    // We need to authenticate the use to make this call
    const activeGuildId = Server.bot.channels[channelID].guild_id;
    const discordServer = Server.bot.servers[activeGuildId];
    const userRoles = discordServer.members[userID].roles;

    let isAdmin = false;
    userRoles.forEach((role) => {

        const currentRole = discordServer.roles[role];

        if (currentRole.GENERAL_ADMINISTRATOR) {
            isAdmin = true;
        }
    });

    if (!isAdmin) {
        Server.bot.sendMessage({
            to: channelID,
            message: 'You are not authorized to change this bot\'s configuration'
        });
        return;
    }

    await redisDel(activeGuildId);

    Server.bot.sendMessage({
        to: channelID,
        message: 'Initialization removed.'
    });
};
