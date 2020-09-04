
/**
 * A ping pong bot, whenever you send "ping", it replies "pong".
 */

// Import the discord.js module
const Discord = require('discord.js');

// Create an instance of a Discord client
const client = new Discord.Client();

/**
 * The ready event is vital, it means that only _after_ this will your bot start reacting to information
 * received from Discord
 */
client.on('ready', () => {

    console.log('I am ready!');
});

// Create an event listener for messages
client.on('message', (message) => {

    // If the message is "ping"
    if (message.content === 'ping') {
        // Send "pong" to the same channel
        message.channel.send('pong');
    }

    if (message.content === 'test') {

        const myInfo = new Discord.MessageEmbed();
        myInfo.setTitle("Hound")
        myInfo.addField("Name", "Hound")
        myInfo.addField("Age", "12")
        myInfo.addField("Description", "Im good at siege, I stream occasionally and ya")
        myInfo.setColor("#020B0C")
        myInfo.attachFiles(['./img/image3.png'])
        myInfo.setImage('attachment://image3.png');

        message.channel.send(myInfo);
    }
});

// Log our bot in using the token from https://discord.com/developers/applications
client.login('NzMwNTQ5NDg5MjAyMzY0NDE2.XwaULQ.BmihWlz-lmk--pkRGKfa84bw8Iw');
