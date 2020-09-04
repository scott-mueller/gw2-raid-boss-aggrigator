const fs = require('fs');
const { google } = require('googleapis');

const TOKEN_PATH = 'token.json';

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
const authorize = function (credentials, callback) {

    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    const token = {"access_token":"ya29.a0AfH6SMDji2iIcMTjPwd2uFRM3MBOZ2pKOuPAWFI7iDRT6FVE5JxFHRpWGZp8Ec6Bn-NohNL-ItLStDnJAIrvKWSvrZi0h3aLCng3SaS6yg5Qej7kbL1ZpHqoEpoRrq4_VU196KbRVOF_Ltq3M1mEQgOp7xcfiy31NoU","refresh_token":"1//01k5_hA9j7ulOCgYIARAAGAESNwF-L9IrMQEdVFnP_85Hcp5P7CtDV5nBdrl5zNElq0tfvXk-IKIc7YDepePNH5tsZIM5Pfyk-m8","scope":"https://www.googleapis.com/auth/drive","token_type":"Bearer","expiry_date":1599252738541};

    oAuth2Client.setCredentials(token);
    callback(oAuth2Client);

    // Check if we have previously stored a token.
    /*fs.readFile(TOKEN_PATH, (err, token) => {

        if (err) {
            console.log( 'Unable to locate token file' );
            return;
        }

    });*/
};

const getCredentials = function () {

    return new Promise( (resolve, reject) => {

        const content = {"installed":{"client_id":"321673083598-qhc87v1h4rm8jj0qk6386bredbo04jh8.apps.googleusercontent.com","project_id":"gw2-raid-boss-ag-1599229100183","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_secret":"qSrfpuYxGfRLhJqJYHCMA9cl","redirect_uris":["urn:ietf:wg:oauth:2.0:oob","http://localhost"]}};
        return resolve(content);

        /*fs.readFile('credentials.json', (err, content) => {

            if (err) {
                return console.log('Error loading client secret file:', err);
            }

            // Authorize a client with credentials, then call the Google Drive API.
            //authorize(JSON.parse(content), listFiles);
        });*/
    });
};

export const saveFile = async function (path) {

    const credentials = await getCredentials();
    return new Promise( (resolve, reject) => {

        authorize(credentials, (auth) => {

            console.log( path );

            const folderId = '1i6C07STz9UUa_muUFrIXFX5fpcN46Uq9';
            const fileMetadata = {
                'name': 'photo1.png',
                parents: [folderId]

            };

            const  media = {
                mimeType: 'image/png',
                body: fs.createReadStream(path)
            };

            const drive = google.drive({ version: 'v3', auth });
            drive.files.create({
                resource: fileMetadata,
                media,
                fields: 'id'
            }, (err, file) => {

                if (err) {
                    // Handle error
                    console.error(err);
                }
                else {

                    console.log('File Id: ', file.data.id);
                    return resolve(file.data.id);
                }
            });

        });
    });
};
