import { Server } from '../server';


export const mongoFind = function (collection, query) {

    return new Promise( (resolve, reject) => {

        const col = Server.db.collection(collection);

        if (!col) {
            return resolve([]);
        }

        col.find(query).toArray( (err, docs) => {

            if (err) {
                console.log( err );
                return resolve([]);
            }

            return resolve(docs || []);
        });
    });
};

export const mongoFindOne = function (collection, query) {

    return new Promise( (resolve, reject) => {

        const col = Server.db.collection(collection);

        if (!col) {
            return resolve([]);
        }

        col.findOne(query, (err, doc) => {

            if (err) {
                console.log( err );
                return resolve([]);
            }

            return resolve(doc);
        });
    });
};

export const mongoInsert = function (collection, document) {

    return new Promise( (resolve, reject) => {

        const col = Server.db.collection(collection);

        if (!col) {
            console.log( 'collection not found. Unable to insert' );
            return resolve(false);
        }

        col.insertMany([document], (err, result) => {

            if (err) {
                console.log( err );
                return resolve([]);
            }

            return resolve(result);
        });
    });
};

export const mongoUpdateById = function (collection, id, updateFields) {

    return new Promise( (resolve, reject) => {

        const col = Server.db.collection(collection);

        if (!col) {
            console.log( 'collection not found. Unable to update' );
            return resolve(false);
        }

        col.updateOne(
            { _id: id },
            { $set: updateFields },
            (err, result) => {

                if (err) {
                    console.log( err );
                    return resolve(false);
                }

                return resolve(result);
            }
        );
    });
};

export const mongoUpdateMany = function (collection, query, updateFields) {

    return new Promise( (resolve, reject) => {

        const col = Server.db.collection(collection);

        if (!col) {
            console.log( 'collection not found. Unable to update' );
            return resolve(false);
        }

        col.updateMany(
            query,
            { $set: updateFields },
            (err, result) => {

                if (err) {
                    console.log( err );
                    return resolve(false);
                }

                return resolve(result);
            }
        );
    });
};

export const mongoDeleteById = function (collection, id) {

    return new Promise( (resolve, reject) => {

        const col = Server.db.collection(collection);

        if (!col) {
            console.log( 'collection not found. Unable to delete' );
            return resolve(false);
        }

        col.deleteOne(
            { _id: id },
            (err, result) => {

                if (err) {
                    console.log( err );
                    return resolve(false);
                }

                return resolve(result);
            }
        );
    });
};
