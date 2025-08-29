const { MongoMemoryServer } = require('mongodb-memory-server');

module.exports = async () => {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  global.__MONGOD__ = mongod;
  process.env.MONGO_URL = uri;
  global.__MONGO_URI__ = uri;
};
