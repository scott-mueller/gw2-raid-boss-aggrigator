import { customAlphabet } from 'nanoid';

import { config } from '../../config';
import { mongoFind, mongoInsert } from '../../methods/mongo';

const generateId = customAlphabet(config.idGeneration.alphabet, 8);

/**
 * >collector start
 */
export const handleCollectorStart = async function (interaction) {

    const { channelId, guildId } = interaction;

    // check if any are running - only 1 allowed
    const collectors = await mongoFind('collectors', { active: true, guildId, channelId });
    if (collectors.length > 0) {
        return await interaction.reply('There is already an active collector on this channel, please stop the current collector with `/collector end`');
    }

    const collectorDocument = {
        _id: generateId(),
        active: true,
        guildId,
        channelId,
        startTime: Date.now()
    };

    await mongoInsert('collectors', collectorDocument);
    return await interaction.reply('Collector started!');
};
