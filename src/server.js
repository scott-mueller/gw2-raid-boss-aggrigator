import { handleMessage } from './methods/messages';

const Discord = require('discord.io');
const Logger = require('winston');
const Auth = require('./auth.json');

export const Server = {
    bot: undefined
};

export const startServer = async function () {

    // Configure logger settings
    Logger.remove(Logger.transports.Console);
    Logger.add(new Logger.transports.Console(), {
        colorize: true
    });
    Logger.level = 'debug';

    // Initialize Discord Bot
    const bot = new Discord.Client({
        token: Auth.token,
        autorun: true
    });

    bot.on('ready', (evt) => {

        Logger.info('Connected');
        Logger.info('Logged in as: ');
        Logger.info(bot.username + ' - (' + bot.id + ')');

        Server.bot = bot;
    });

    bot.on('message', (user, userID, channelID, message, evt) => {

        handleMessage(user, userID, channelID, message, evt);
    });
};

process.on( 'unhandledRejection', (err) => {

    console.log( err );
    process.exit( 1 );
});
