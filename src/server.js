import { handleMessage } from './methods/messages';
import { config as Config } from './config';
import { redisGet, redisSet, redisDel } from './methods/redis';
import { mongoInsert, mongoFind, mongoUpdateById, mongoDeleteById } from './methods/mongo';
import { assert } from 'chai';

const Discord = require('discord.js');
const Redis = require('redis');

export const Server = {
    bot: undefined,
    redisClient: undefined,
    db: undefined
};

const startTestServer = function () {

    console.log( 'Starting Test Server' );

    Server.db = {
        collection: () => {

            return;
        }
    };

    return;
};

export const startServer = async function () {

    if (process.env.APP_ENVIRONMENT === 'TEST') {
        return startTestServer();
    }

    const promises = [];

    // Connect to mongo
    promises.push(new Promise( (resolve, reject) => {

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

            await mongoInsert('icons', test);
            const doc1 = await mongoFind('icons', { val: 'yes' });
            assert.isArray(doc1);
            assert.equal(test.val, doc1[0].val);

            await mongoUpdateById('icons', '12345', { val: 'no' });
            const doc2 = await mongoFind('icons', { val: 'no' });
            assert.isArray(doc2);
            assert.equal('no', doc2[0].val);

            await mongoDeleteById('icons', '12345');
            const doc3 = await mongoFind('icons', { val: 'no' });
            assert.isArray(doc3);

            // Need to store some data in redis
            process.emit('mongoReady');
            return resolve('Mongo Ready');
        });
    }));

    // Connect to Redis
    promises.push(new Promise( (resolve, reject) => {

        const rClient = Redis.createClient(Config.redis);

        rClient.on('ready', async () => {

            Server.redisClient = rClient;

            // a quick IO test
            await redisSet('test', 'testStr');
            const val = await redisGet('test');
            await redisDel('test');
            assert.equal(val, 'testStr');

            console.log('Redis Client Connected');
            return resolve('Redis Ready');
        });

        rClient.on('error', (error) => {

            console.error(error);
        });
    }));

    // Initialize Discord Bot
    promises.push(new Promise( (resolve, reject) => {

        const bot = new Discord.Client();
        bot.login(Config.auth.token);

        bot.on('ready', (evt) => {

            console.log('Connected');
            console.log('Logged in as: ');
            console.log(bot.username + ' - (' + bot.id + ')');

            Server.bot = bot;

            return resolve('Discord Bot Ready');
        });

        bot.on('message', async (message) => {

            console.log( `Message Recieved: UserID: ${message.author.id}, ChannelID: ${message.channel.id}` );
            await handleMessage(message);
        });

    }));

    return await Promise.all(promises);
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
