import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';

import { config as Config } from './src/config';
import commands from './src/commands13/index';

const JSONCommands = commands.map((command) => command.data.toJSON());

const rest = new REST({ version: '9' }).setToken(Config.auth.token);

const deployCommands = async function () {

    try {
        await rest.put(
            Routes.applicationCommands('730549489202364416'),
            { body: JSONCommands }
        );

        console.log('Commands registered');
    }
    catch (err) {
        console.log(err);
    }
};

export default deployCommands;
