import { mongoFindOne, mongoUpdateById } from '../../methods/mongo';

export const handleCollectorEnd = async function (guildId, channelId) {

    // Lets get the active collector
    const collector = await mongoFindOne('collectors', { active: true, guildId, channelId });
    if (!collector) {
        return 'There are no active collectors running. Start one with `>collector start`';
    }

    // Update the doc
    await mongoUpdateById('collectors', collector._id, { active: false, endTime: Date.now() } );
    return 'TODO - report the stats';
};
