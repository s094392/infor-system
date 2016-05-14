var mongodb = require('mongodb');
var mongo = mongodb.MongoClient;
var Server = mongodb.Server,
    Db = mongodb.Db,
    BSON = mongodb.BSONPure;
var mongodbserver = new Server('localhost', 27017, {auto_reconnect: true});
db = new Db('infor-system', mongodbserver);

module.exports = db;
