import { mongoFind, mongoFindOne, mongoUpdateById } from '../../methods/mongo';

const computeEncounterStats = async function (collectorId) {

    const encounters = await mongoFind('encounters', { collectorId } );

    console.log(encounters.length);
};


export const handleCollectorEnd = async function (interaction) {

    const { channelId, guildId } = interaction;

    // Lets get the active collector
    const collector = await mongoFindOne('collectors', { active: true, guildId, channelId });
    if (!collector) {
        return 'There are no active collectors running. Start one with `>collector start`';
    }

    // Update the doc
    await mongoUpdateById('collectors', collector._id, { active: false, endTime: Date.now() } );
    computeEncounterStats(collector._id);
    return await interaction.reply('TODO - report the stats');
};
