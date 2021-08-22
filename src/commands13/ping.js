import { SlashCommandBuilder } from '@discordjs/builders';

const pong = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with pong!')
        .addIntegerOption((option) => option
            .setName('amount')
            .setDescription('Will pong n number of times')
            .setRequired(true)
        ),
    async execute(interaction) {
        const amount = interaction.options.get('amount').value;
        const pongArr = [];
        for (let i = 0; i < amount; ++i) {
            pongArr.push('Pong!');
        }

        await interaction.reply(pongArr.join(' '));
    }
};

export default pong;
