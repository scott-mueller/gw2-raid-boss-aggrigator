import { mongoFindOne } from '../../methods/mongo';

const getCollector = async (request, response) => {

    const collector = await mongoFindOne('collectors', { _id: request.params.collectorId });
    if (!collector) {
        return response.status(404).send({
            message: 'Collector not found'
        });
    }

    if (collector.active === false && collector.stats) {
        return response.send(collector.stats);
    }

    response.status(204).send({
        message: 'Collector is still running'
    });

};

export default getCollector;
