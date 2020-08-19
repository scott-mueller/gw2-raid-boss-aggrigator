import { createGuild } from '../../methods/guildManagement';
import { Server } from '../../server';

export const handleGuildCreate = async function (channelId, userId, name, tag, guildId) {

    Server.bot.simulateTyping(channelId);

    // Validate the name
    if (name.length < 4 || name.length > 30) {
        Server.bot.sendMessage({
            to: channelId,
            message: 'Invalid guild name provided'
        });
        return;
    }

    console.log( name );
    console.log( tag );

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

    Server.bot.sendMessage({
        to: channelId,
        message: response
    });
};
