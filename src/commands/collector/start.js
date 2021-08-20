import { customAlphabet } from 'nanoid';

import { config } from '../../config';
import { mongoFind, mongoInsert } from '../../methods/mongo';

const generateId = customAlphabet(config.idGeneration.alphabet, 8);

export const handleCollectorStart = async function (guildId, channelId) {

    // check if any are running - only 1 allowed
    const collectors = await mongoFind('collectors', { active: true, guildId, channelId });
    if (collectors.length > 0) {
        return 'There is already an active collector on this channel, please stop the current collector with `>collector end`';
    }

    const collectorDocument = {
        _id: generateId(),
        active: true,
        guildId,
        channelId,
        startTime: Date.now()
    };

    await mongoInsert('collectors', collectorDocument);
    return 'Collector started!';
};
