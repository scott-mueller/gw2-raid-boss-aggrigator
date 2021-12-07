import mongodb from 'mongodb';

import { captureLogsForProcessing, processEncounter } from './methods/processEncounter';
import { config as Config } from './config';
import { mongoInsert, mongoFind, mongoUpdateById, mongoDeleteById } from './methods/mongo';
import { assert } from 'chai';
import { Client, Collection, Intents } from 'discord.js';
import commands from './commands13';
import amqp from 'amqplib';

export const Server = {
    bot: undefined,
    db: undefined,
    amqpChannel: undefined
};

export const startServer = async function () {

    const promises = [];

    // Connect to mongo
    promises.push(new Promise( (resolve, reject) => {

        //const MongoClient = require('mongodb').MongoClient;

        mongodb.MongoClient.connect(Config.mongo.url, async (err, client) => {

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

            return resolve('Mongo Ready');
        });
    }));

    // RabbitMQ
    promises.push(new Promise( async (resolve, reject) => {

        console.log('connecting to AMQP');
        try {
            const connection = await amqp.connect(Config.amqp.host);
            const channel = await connection.createChannel();

            channel.assertQueue(Config.amqp.queueName);
            channel.prefetch(1);
            Server.amqpChannel = channel;

            channel.consume(Config.amqp.queueName, async (msg) => {

                await processEncounter(JSON.parse(msg.content.toString()));
                channel.ack(msg);
            });

            console.log('Connected to AMQP');

        }
        catch (err) {
            console.log(err);
            return reject(err);
        }

        resolve();
    }));

    // Initialize Discord Bot
    promises.push(new Promise( (resolve, reject) => {

        const bot = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });
        bot.commands = new Collection();

        for (const command of commands) {
            bot.commands.set(command.data.name, command);
        }

        bot.login(Config.auth.token);

        bot.once('ready', (evt) => {

            console.log('Connected to Discord');
            console.log('Logged in as: ' + bot.user.username + ' - (' + bot.user.id + ')');

            Server.bot = bot;

            return resolve('Discord Bot Ready');
        });

        bot.on('messageCreate', async (message) => {

            console.log( `Message Recieved: UserID: ${message.author.id}, ChannelID: ${message.channel.id}` );
            const guildId = message.guild.id;
            await captureLogsForProcessing(guildId, message);
            return;
        });

        bot.on('interactionCreate', async (interaction) => {

            const command = bot.commands.get(interaction.commandName);
            if (!interaction.isCommand() || !command) {
                return;
            }

            try {
                await command.execute(interaction);
            }
            catch (err) {
                console.log(err);
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
            }
        });

    }));

    return await Promise.all(promises);
};

process.on( 'unhandledRejection', (err) => {

    console.log( err );
    process.exit( 1 );
});
