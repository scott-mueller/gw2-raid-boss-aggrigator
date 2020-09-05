import { createGuild } from '../../methods/guildManagement';
const Discord = require('discord.js');

export const handleGuildCreate = async function (channel, userId, name, tag, guildId) {

    channel.startTyping();

    // Validate the name
    if (name.length < 4 || name.length > 50) {
        channel.send('Invalid guild name provided');
        channel.stopTyping();
        return;
    }

    // valiidate the tag
    const guildTagRegex = RegExp(/\[.{2,4}\]/);
    if (!guildTagRegex.test(tag)) {
        channel.send('Invalid guild tag provided');
        channel.stopTyping();
        return;
    }

    const response = await createGuild(name, tag, userId, guildId);

    if (response.error) {
        channel.send(response.error);
        channel.stopTyping();
        return;
    }

    const embed = new Discord.MessageEmbed();
    embed.setTitle(`**${response.guild.name} ${response.guild.tag} Created**`);
    embed.setColor(4688353);
    embed.addFields({
        name: 'Reference',
        value: response.guild.reference
    });

    switch (response.result) {

        case 'SUCCESS_IS_DEFAULT':
            embed.addFields({
                name: 'Default status - Default',
                value: 'You can use guild commands without a reference in this server\ne.g: `>guild roster`'
            });
            break;

        case 'SUCCESS_NOT_DEFAULT':
            embed.addFields({
                name: 'Default status - Not Default',
                value: 'If you want to change the default guild for this server, contact a server admin'
            });
            break;
    }

    channel.send(embed);
};
