export const config = {

    auth: {
        token: process.env.AUTH_TOKEN
    },

    redis: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: process.env.REDIS_PORT || '6379',
        password: process.env.REDIS_PASSWORD || undefined
    }
};
