require('dotenv').load();

var express = require('express'),
  router = express.Router(),
  mongoose = require('mongoose'),
  QueryResult = mongoose.model('QueryResult');
  
var io;
  
function getKeenResults() {
  var Keen = require('keen-js');

  var keen_client_surveys = new Keen({
    projectId: process.env.KEEN_CLIENT_SURVEYS_PROJECT_ID,
    readKey: process.env.KEEN_CLIENT_SURVEYS_READ_KEY
  });

  var npsScoreAverage = new Keen.Query('average', {
    eventCollection: 'Participants Answers',
    targetProperty: 'nps_score',
    timeframe: 'this_2_years'
  });

  Keen.ready(function() {  
    keen_client_surveys.run([npsScoreAverage], function(err, res) {
      io.on('connection', function(socket) {
        io.emit('message', res);
      });
    });
  });
}

module.exports = function (app, server) {
  io = require('socket.io')(server);
  app.use('/', router);
};

router.get('/', function (req, res, next) {  
  getKeenResults();
  
  res.render('index', {
    title: 'devbeers Dashboard'
  });
});
