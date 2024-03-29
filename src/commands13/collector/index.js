import { SlashCommandBuilder } from '@discordjs/builders';

import { handleCollectorStart } from './start';
import { handleCollectorEnd } from './end';
import { handleCollectorProgress } from './progress';

const collector = {
    data: new SlashCommandBuilder()
        .setName('collector')
        .setDescription('Handles collector commands')
        .addSubcommand((subcommand) => subcommand
            .setName('start')
            .setDescription('Collects arc dps Logs until stopped')
        )
        .addSubcommand((subcommand) => subcommand
            .setName('end')
            .setDescription('Ends the active collector on this channel')
        )
        .addSubcommand((subcommand) => subcommand
            .setName('progress')
            .setDescription('Info about the current collector')),
    //Collector Schedule!
    // Start time, end time, chennel
    // starts a collector in the channel at a specific time
    // Our use case: collector starts at 8:20, ends at midnight
    // collector end stops the collector early
    async execute(interaction) {

        switch (interaction.options._subcommand) {
            case 'start': {
                return await handleCollectorStart(interaction);
            }

            case 'progress': {
                return await handleCollectorProgress(interaction);
            }

            case 'end': {
                return await handleCollectorEnd(interaction);
            }
        }

        await interaction.reply({ content: 'Unknown command', ephemeral: true });
    }
};

export default collector;
