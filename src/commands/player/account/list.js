import { viewVerifiedAccounts } from '../../../methods/users';
import { Server } from '../../../server';

export const handleAccountList = async function (channelId, userId) {

    Server.bot.simulateTyping(channelId);

    const response = await viewVerifiedAccounts(userId);

    if (response.error) {
        Server.bot.sendMessage({
            to: channelId,
            message: response.error
        });
    }

    let accountsString;
    for (let i = 0; i < response.players.length; ++i) {
        const player = response.players[i];
        accountsString += `${i + 1} ${player.accountName}`;
    }

    const embed = {
        title: `**Player Details**`,
        description: '',
        color: 4688353,
        fields: [
            {
                name: 'Accounts',
                value: accountsString
            },
            {
                name: 'Guilds',
                value: guildsString
            }
        ]
    };

    Server.bot.sendMessage({
        to: channelId,
        embed
    });

    let returnMessage = '**Registered Accounts:**\n';
    for (let i = 0; i < playerRecords.length; ++i) {

        const record = playerRecords[i];

        const formattedAccountAge = Moment(record.verification.storedAt).format('MMM Do YYYY');

        returnMessage += `${i + 1}: ${record.accountName},             Stored: ${formattedAccountAge}\n`;
    }



};
