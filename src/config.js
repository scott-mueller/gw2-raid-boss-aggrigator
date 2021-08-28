require('dotenv').config();

export const config = {

    port: 3100,

    auth: {
        token: process.env.DISCORD_AUTH_TOKEN
    },

    idGeneration: {
        alphabet: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
    },

    mongo: {
        url: process.env.MONGO_URI || 'mongodb://localhost:27017',
        dbName: 'gw2-rba'
    },

    apis: {
        dpsReport: {
            baseUrl: `https://dps.report`
        },

        GW2API: {
            baseUrl: `https://api.guildwars2.com`
        }
    },

    roleList: [
        'Healer',
        'Quickness',
        'Alacrity',
        'Might',
        'Fury',
        'Banners',
        'Power-DPS',
        'Condi-DPS'
    ]
};
