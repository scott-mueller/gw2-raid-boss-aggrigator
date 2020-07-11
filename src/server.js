import { handleMessage } from './methods/messages';
import { config as Config } from './config';
import { redisGet, redisSet, redisDel } from './methods/redis';
import { assert } from 'chai';

const Discord = require('discord.io');
const Redis = require('redis');


export const Server = {
    bot: undefined,
    redisClient: undefined
};

export const startServer = async function () {

    // Connect to Redis
    const rClient = Redis.createClient(Config.redis);

    rClient.on('ready', async () => {

        console.log('Redis Client Connected');
        Server.redisClient = rClient;


        // a quick IO test
        await redisSet('test', 'testStr');
        const val = await redisGet('test');
        await redisDel('test');
        assert.equal(val, 'testStr');


        const metadata = await redisGet('metadata');
        if (!metadata) {
            await redisSet('metadata', {
                bossicons: []
            });
        }

    });

    rClient.on('error', (error) => {

        console.error(error);
    });

    // Initialize Discord Bot
    const bot = new Discord.Client({
        token: Config.auth.token,
        autorun: true
    });

    bot.on('ready', (evt) => {

        console.log('Connected');
        console.log('Logged in as: ');
        console.log(bot.username + ' - (' + bot.id + ')');

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
