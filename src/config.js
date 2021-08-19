export const config = {

    auth: {
        token: process.env.AUTH_TOKEN || 'NzMwNTQ5NDg5MjAyMzY0NDE2.XwaULQ.BmihWlz-lmk--pkRGKfa84bw8Iw'
    },

    idGeneration: {
        alphabet: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
    },

    mongo: {
        url: 'mongodb://localhost:27017',
        dbName: 'gw2rba'
    },

    redis: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: process.env.REDIS_PORT || '6379',
        password: process.env.REDIS_PASSWORD || undefined
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
