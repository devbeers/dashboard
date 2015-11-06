require('dotenv').load();

var path = require('path'),
    rootPath = path.normalize(__dirname + '/..'),
    env = process.env.NODE_ENV || 'development';

var config = {
  development: {
    root: rootPath,
    app: {
      name: 'devbeers-dashboard-express'
    },
    port: 3000,
    db: 'mongodb://localhost/devbeers-dashboard-express-development'
  },

  test: {
    root: rootPath,
    app: {
      name: 'devbeers-dashboard-express'
    },
    port: 3000,
    db: 'mongodb://localhost/devbeers-dashboard-express-test'
  },

  production: {
    root: rootPath,
    app: {
      name: 'devbeers-dashboard-express'
    },
    port: process.env.PORT,
    db: process.env.MONGODB_URI
  }
};

module.exports = config[env];
