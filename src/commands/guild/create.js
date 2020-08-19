import { createGuild } from '../../methods/guildManagement';
import { Server } from '../../server';

export const handleGuildCreate = async function (channelId, userId, name, tag, guildId) {

    Server.bot.simulateTyping(channelId);

    // Validate the name
    if (name.length < 4 || name.length > 50) {
        Server.bot.sendMessage({
            to: channelId,
            message: 'Invalid guild name provided'
        });
        return;
    }

    // valiidate the tag
    const guildTagRegex = RegExp(/\[.{2,4}\]/);
    if (!guildTagRegex.test(tag)) {
        Server.bot.sendMessage({
            to: channelId,
            message: 'Invalid guild tag provided'
        });
        return;
    }

    const response = await createGuild(name, tag, userId, guildId);

    if (response.error) {
        Server.bot.sendMessage({
            to: channelId,
            message: response.error
        });
        return;
    }

    const embed = {
        title: `**${response.guild.name} ${response.guild.tag} Created**`,
        color: 4688353,
        fields: [
            {
                name: 'Reference',
                value: response.guild.reference
            }
        ]
    };

    switch (response.result) {

        case 'SUCCESS_IS_DEFAULT':
            embed.fields.push({
                name: 'Default status - Default',
                value: 'You can use guild commands without a reference in this server\ne.g: `>guild roster`'
            });
            break;

        case 'SUCCESS_NOT_DEFAULT':
            embed.fields.push({
                name: 'Default status - Not Default',
                value: 'If you want to change the default guild for this server, contact a server admin'
            });
            break;
    }

    Server.bot.sendMessage({
        to: channelId,
        embed
    });
};
