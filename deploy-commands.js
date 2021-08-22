const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');

import { config as Config } from './src/config';
import commands from './src/commands13';

require('dotenv').config();

const JSONCommands = commands.map((command) => command.data.toJSON());

const rest = new REST({ version: '9' }).setToken(Config.auth.token);

const deployCommands = async function () {

    try {
        await rest.put(
            Routes.applicationGuildCommands('730549489202364416', '743476806627098624'),
            { body: JSONCommands }
        );

        console.log('Commands registered');
    }
    catch (err) {
        console.log(err);
    }
};

deployCommands();
