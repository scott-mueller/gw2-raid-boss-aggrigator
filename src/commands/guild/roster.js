import { Server } from '../../server';
import { getGuildRoster } from '../../methods/guildManagement';

export const handleGuildViewRoster = async function (channelId, guildId, reference) {

    Server.bot.simulateTyping(channelId);

    const referenceRegex = RegExp(/\[.{2,4}\]-\d{3}/);
    if (!referenceRegex.test(reference)) {
        Server.bot.sendMessage({
            to: channelId,
            message: 'Invalid guild tag provided'
        });
        return;
    }

    const response = await getGuildRoster(guildId, reference);

    Server.bot.sendMessage({
        to: channelId,
        message: response
    });
};
