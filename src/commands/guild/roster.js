import { getGuildRoster } from '../../methods/guildManagement';
const Discord = require('discord.js');

export const handleGuildViewRoster = async function (channel, guildId, reference) {

    channel.startTyping();

    const referenceRegex = RegExp(/\[.{2,4}\]-\d{3}/);
    if (!referenceRegex.test(reference)) {
        channel.send('Invalid guild tag provided');
        channel.stopTyping();
        return;
    }

    const response = await getGuildRoster(guildId, reference);

    if (response.error) {
        channel.send(response.error);
        channel.stopTyping();
        return;
    }

    const sortedRoster = response.guild.roster.sort((a, b) => {

        return a.toLowerCase().localeCompare(b.toLowerCase());
    });

    let rosterString = '';
    for (let i = 0; i < sortedRoster.length; ++i) {
        rosterString += `${i + 1}. ${sortedRoster[i]}\n`;
    }

    const embed = {
        title: `**${response.guild.name} ${response.guild.tag}**`,
        description: `Players on the roster are used identify whether a dps.report log can be associated with this guild. A match of 8 or more is needed.\n
We suggest trying to keep your roster between 10 and 15 players for the best results`,
        color: 4688353,
        fields: [
            {
                name: 'Reference',
                value: response.guild.reference
            },
            {
                name: 'Roster',
                value: rosterString
            }
        ]
    };

    channel.send(new Discord.MessageEmbed(embed));
    channel.stopTyping();

};
