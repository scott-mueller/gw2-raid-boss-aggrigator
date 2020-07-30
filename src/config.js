export const config = {

    auth: {
        token: process.env.AUTH_TOKEN || 'NzMwNTQ5NDg5MjAyMzY0NDE2.XwaULQ.BmihWlz-lmk--pkRGKfa84bw8Iw'
    },

    mongo: {
        url: 'mongodb://192.168.99.1:27017',
        dbName: 'GW2-Raid-Boss-Aggrigator'
    },

    redis: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: process.env.REDIS_PORT || '6379',
        password: process.env.REDIS_PASSWORD || undefined
    }
};
