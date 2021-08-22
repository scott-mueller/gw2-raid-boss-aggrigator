import { SlashCommandBuilder } from '@discordjs/builders';

const pong = {
    data: new SlashCommandBuilder().setName('ping').setDescription('Replies with pong!'),
    async execute(interaction) {
        await interaction.reply('Pong!');
    }
};

export default pong;
