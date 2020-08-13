import { config } from '../config';

const Axios = require('axios');


export const getGW2Account = async function (apiKey) {

    const GW2APIBaseUrl = config.apis.GW2API.baseUrl;

    try {
        const response = await Axios({
            method: 'GET',
            url: `${GW2APIBaseUrl}/v2/account/?access_token=${apiKey}`
        });

        return {
            code: response.status,
            data: response.data
        };
    }
    catch (err) {

        console.log( err );

        return {
            error: err,
            code: err.response.status
        };
    }
};
