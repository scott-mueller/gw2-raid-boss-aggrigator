import { handleMessage } from './methods/messages';
import { config as Config } from './config';
import { redisGet, redisSet, redisDel } from './methods/redis';
import { mongoInsert, mongoFind, mongoUpdateById, mongoDeleteById } from './methods/mongo';
import { assert } from 'chai';

const Discord = require('discord.io');
const Redis = require('redis');


export const Server = {
    bot: undefined,
    redisClient: undefined,
    db: undefined
};

export const startServer = async function () {

    // Connect to mongo
    const MongoClient = require('mongodb').MongoClient;

    MongoClient.connect(Config.mongo.url, async (err, client) => {

        assert.equal(null, err);
        console.log( 'MongoDB connected' );

        Server.db = client.db(Config.mongo.dbName);

        // Quick IO test
        const test = {
            _id: '12345',
            val: 'yes'
        };

        await mongoInsert('messages', test);
        const doc1 = await mongoFind('messages', { val: 'yes' });
        assert.isArray(doc1);
        assert.equal(test.val, doc1[0].val);

        await mongoUpdateById('messages', '12345', { val: 'no' });
        const doc2 = await mongoFind('messages', { val: 'no' });
        assert.isArray(doc2);
        assert.equal('no', doc2[0].val);

        await mongoDeleteById('messages', '12345');
        const doc3 = await mongoFind('messages', { val: 'no' });
        assert.isArray(doc3);

        // Need to store some data in redis
        process.emit('mongoReady');
    });

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

process.on( 'mongoReady', async () => {

    // We need to get the list of configured channels
    const guilds = await mongoFind('guild-configs', {});

    const listenChannels = [];
    guilds.forEach((guild) => {

        listenChannels.push(guild.logChannel);
    });

    await redisSet('listenChannels', listenChannels);
});

process.on( 'unhandledRejection', (err) => {

    console.log( err );
    process.exit( 1 );
});
