import { Server } from '../server';

/**
 *
 * @param {*} key - the key to get from cache
 *
 * Wrapper function for Redis GET
 */
export const redisGet = function (key) {

    return new Promise( (resolve) => {

        Server.redisClient.get(key, (err, result) => {

            if (err) {
                console.log( err );
                return resolve();
            }

            if (!result) {
                return resolve();
            }

            // Lets format stringified JSON back into an object
            if (result.includes('{')) {
                return resolve(JSON.parse(result));
            }

            return resolve(result);
        });
    });

};

/**
 *
 * @param {*} key - the name of the new key
 * @param {*} value - value of said key
 *
 * Wrapper function for Redis SET
 */
export const redisSet = function (key, value) {

    return new Promise( (resolve) => {

        if (typeof value !== 'string') {
            value = JSON.stringify(value);
        }

        Server.redisClient.set(key, value, (err, res) => {

            if (err) {
                console.log( err );
                return resolve();
            }

            return resolve(res);
        });
    });
};

/**
 *
 * @param {*} key - key to delete
 *
 * Wrapper for redis DEL
 */
export const redisDel = function (key) {

    return new Promise( (resolve) => {

        Server.redisClient.del(key, (err, res) => {

            if (err) {
                console.log( err );
                return resolve();
            }

            return resolve(res);
        });
    });
};
