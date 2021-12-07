import { MessageEmbed } from 'discord.js';
import moment from 'moment';
import { mongoFindOne, mongoFind } from '../../methods/mongo';

export const handleCollectorProgress = async function (interaction) {

    const { channelId, guildId } = interaction;

    // Lets get the active collector
    const collector = await mongoFindOne('collectors', { active: true, guildId, channelId });
    if (!collector) {
        return await interaction.reply('There are no active collectors running. Start one with `/collector start`');
    }

    const encounters = await mongoFind('encounters', { collectors: collector._id } );

    const returnEmbed = new MessageEmbed()
        .setTitle(`Progress Report! - ${collector._id} `)
        .setColor(4688353)
        .setTimestamp()
        .setThumbnail('https://i.imgur.com/qb3bRS9.png')
        .addFields(
            [
                { name: 'Started', value: moment(collector.startTime).format('ddd, MMM Do YY, h:mm:ss a') },
                { name: 'Logs in collector', value: `${encounters.length} Logs` }
            ]
        );

    return await interaction.reply({ embeds: [returnEmbed] });
};
