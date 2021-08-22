import { SlashCommandBuilder } from '@discordjs/builders';

import { handleCollectorStart } from './collector/start';
import { handleCollectorEnd } from './collector/end';

const collector = {
    data: new SlashCommandBuilder()
        .setName('collector')
        .setDescription('Handles collector commands')
        .addSubcommand((subcommand) => subcommand
            .setName('start')
            .setDescription('Starts a collector to keep track of arc dps logs posted to this channel')
        )
        .addSubcommand((subcommand) => subcommand
            .setName('end')
            .setDescription('Ends the active collector on this channel')
        ),
    async execute(interaction) {

        switch (interaction.options._subcommand) {
            case 'start': {
                return handleCollectorStart(interaction);
            }

            case 'end': {
                return handleCollectorEnd(interaction);
            }
        }

        await interaction.reply({ content: 'Unknown command', ephemeral: true });
    }
};

export default collector;
