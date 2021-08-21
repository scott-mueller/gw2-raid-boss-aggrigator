require('dotenv').config();

export const config = {

    auth: {
        token: process.env.DISCORD_AUTH_TOKEN
    },

    idGeneration: {
        alphabet: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
    },

    mongo: {
        url: 'mongodb://localhost:27017',
        dbName: 'gw2rba'
    },

    apis: {
        dpsReport: {
            baseUrl: `https://dps.report`
        },

        GW2API: {
            baseUrl: `https://api.guildwars2.com`
        }
    }
};
