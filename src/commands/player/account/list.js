import { viewVerifiedAccounts } from '../../../methods/users';
const Discord = require('discord.js');

export const handleAccountList = async function (channel, userId) {

    channel.startTyping();

    const response = await viewVerifiedAccounts(userId);

    if (response.error) {
        channel.send(response.error);
        channel.stopTyping();
    }

    let accountsString;
    for (let i = 0; i < response.players.length; ++i) {
        const player = response.players[i];
        accountsString += `${i + 1} ${player.accountName}`;
    }

    const embed = new Discord.MessageEmbed();
    embed.setTitle(`**Player Details**`);
    embed.setColor(4688353);
    embed.addFields(
        {
            name: 'Accounts',
            value: accountsString
        },
        {
            name: 'Guilds',
            value: 'TODO'
        }
    );

    channel.send(embed);
    channel.stopTyping();

    /*let returnMessage = '**Registered Accounts:**\n';
    for (let i = 0; i < playerRecords.length; ++i) {

        const record = playerRecords[i];

        const formattedAccountAge = Moment(record.verification.storedAt).format('MMM Do YYYY');

        returnMessage += `${i + 1}: ${record.accountName},             Stored: ${formattedAccountAge}\n`;
    }*/



};
