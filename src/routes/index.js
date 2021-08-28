import getCollector from './collector/getCollector';

const registerRoutes = (server) => {

    server.get('/collector/:collectorId', getCollector);
};

export default registerRoutes;
