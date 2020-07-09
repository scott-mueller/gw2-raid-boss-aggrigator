import { Server } from '../server';

export const getMessages = function (before) {

    const options = {
        channelID: '702009085024927744',
        limit: 100,
        before
    };

    return new Promise( (resolve, reject) => {

        Server.bot.getMessages(options, (err, messages) => {

            if (err) {
                console.log( err );
                return [];
            }

            return resolve(messages);
        });
    });
};
