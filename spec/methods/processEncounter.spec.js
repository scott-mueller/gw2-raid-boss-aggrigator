/* eslint-disable no-undef */
import Nock from 'nock';
import Sinon from 'sinon';
import { Server } from '../../src/server';

import { maybeProcessEncounter } from '../../src/methods/processEncounter';

import { dhuumEVTC } from '../data/evtc.js';

const ServerModule = require('../../src/server');

describe( 'processEncounter.js', () => {

    beforeAll(async () => {

        await ServerModule.startServer();
    });

    it( 'should process an embed succesfully', async () => {

        const guildId = '123456';

        const message = {
            embeds: [
                {
                    url: 'https://dps.report/Ids8-20200804-231315_dhuum'
                }
            ]
        };

        const mockDbCollection = {
            find: () => {

                console.log( 'mockFind' );

                return {
                    toArray: () => {

                        console.log( 'mockToArray' );

                        return {};
                    }
                };
            },
            insertMany: () => {

                return 'success';
            }
        };
        const db = Server.db;
        const stub = Sinon.stub(db, 'collection').returns(mockDbCollection);

        const dpsReportLookupNock = Nock('https://dps.report')
            .get('/getJson?permalink=Ids8-20200804-231315_dhuum')
            .reply(200, dhuumEVTC);

        const logCount = await maybeProcessEncounter(guildId, message);

        stub.restore();

        expect(dpsReportLookupNock.isDone()).toBe(true);
        expect(logCount).toBe(1);
    });

    /*it( 'should process a log in a message sucessfully', async () => {

        const guildId = '123456';

        const message = {
            content: 'Here is a dhuum log: https://dps.report/Ids8-20200804-231315_dhuum'
        };

        const mockDbCollection = {
            find: () => {

                return {
                    toArray: () => {

                        return [];
                    }
                };
            },
            insertMany: () => {

                console.log( 'big insert energy' );
                return 'success';
            }
        };
        const db = Server.db;
        const stub = Sinon.stub(db, 'collection').returns(mockDbCollection);

        const dpsReportLookupNock = Nock('https://dps.report')
            .get('/getJson?permalink=Ids8-20200804-231315_dhuum')
            .reply(200, dhuumEVTC);

        const logCount = await maybeProcessEncounter(guildId, message);

        stub.restore();

        expect(dpsReportLookupNock.isDone()).toBe(true);
        expect(logCount).toBe(1);
    });

    it( 'should not find a message to proceess', async () => {

        const guildId = '123456';

        const message = {
            content: 'Just a basic message with nothing fancy'
        };

        const logCount = await maybeProcessEncounter(guildId, message);
        expect(logCount).toBe(0);
    });*/
});
