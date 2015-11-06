require('dotenv').load();

var express = require('express'),
  router = express.Router(),
  mongoose = require('mongoose'),
  QueryResult = mongoose.model('QueryResult'),
  Keen = require('keen-js'),
  io;

var overallTimeframe = 'this_2_years';

var keenClientSurveys = new Keen({
  projectId: process.env.KEEN_CLIENT_SURVEYS_PROJECT_ID,
  readKey: process.env.KEEN_CLIENT_SURVEYS_READ_KEY
});

var keenParticipantsList = new Keen({
  projectId: process.env.KEEN_PARTICIPANTS_LIST_PROJECT_ID,
  readKey: process.env.KEEN_PARTICIPANTS_LIST_READ_KEY
});

var npsScoreAverage = { name: 'npsScoreAverage' };
npsScoreAverage.queries = [new Keen.Query('average', {
  eventCollection: 'Participants Answers',
  targetProperty: 'nps_score',
  timeframe: overallTimeframe
})];
npsScoreAverage.callback = function(err, res) {
  if (err) throw('error charting: ' + err);
  else {
    var queryResult = res.result;
    
    saveAndEmitQuery(npsScoreAverage.name, queryResult);
  }
};

// Calculate NPS score
var npsScoreCount = new Keen.Query('count', {
  eventCollection: 'Participants Answers',
  targetProperty: 'nps_score',
  timeframe: overallTimeframe
});

var npsScoreDetractors = new Keen.Query('count', {
  eventCollection: 'Participants Answers',
  targetProperty: 'nps_score',
  timeframe: overallTimeframe,
  filters: [
          {
            "property_name" : "nps_score",
            "operator" : "lt",
            "property_value" : 7
          }
       ]
});

var npsScorePromoters = new Keen.Query('count', {
  eventCollection: 'Participants Answers',
  targetProperty: 'nps_score',
  timeframe: overallTimeframe,
  filters: [
          {
            "property_name" : "nps_score",
            "operator" : "gt",
            "property_value" : 8
          }
       ]
});

var npsScoreQuery = { name: 'npsScoreParticipants' };
npsScoreQuery.queries = [npsScoreCount, npsScoreDetractors, npsScorePromoters];
npsScoreQuery.callback = function(err, res) {
  if (err) throw('error charting: ' + err);
  else {
    var queryResult = ((res[2].result - res[1].result) / res[0].result).toFixed(2) * 100;
    
    saveAndEmitQuery(npsScoreQuery.name, queryResult);
  }
};

var keenSurveyQueries = [npsScoreAverage, npsScoreQuery];

var allTimeSignups = { name: 'allTimeSignups' };
allTimeSignups.queries = [new Keen.Query('count', {
  eventCollection: 'Event Participants',
  targetProperty: 'keen.timestamp',
  timeframe: overallTimeframe
})];
allTimeSignups.callback = function(err, res) {
  if (err) throw('error charting: ' + err);
  else {
    var queryResult = res.result;
    
    saveAndEmitQuery(allTimeSignups.name, queryResult);
  }
};

var allTimeUniqueSignups = { name: 'allTimeUniqueSignups' };
allTimeUniqueSignups.queries = [new Keen.Query('count_unique', {
  eventCollection: 'Event Participants',
  targetProperty: 'email',
  timeframe: overallTimeframe
})];
allTimeUniqueSignups.callback = function(err, res) {
  if (err) throw('error charting: ' + err);
  else {
    var queryResult = res.result;
    
    saveAndEmitQuery(allTimeUniqueSignups.name, queryResult);
  }
};

var monthlySignupCount = { name: 'monthlySignupCount' };
monthlySignupCount.queries = [new Keen.Query('count', {
  eventCollection: 'Event Participants',
  targetProperty: 'keen.timestamp',
  timeframe: overallTimeframe,
  group_by: "edition",
  filters: [
    {
      "property_name": "city",
      "operator": "eq",
      "property_value": 'SP'
    }
  ]
})];
monthlySignupCount.callback = function(err, res) {
  if (err) throw('error charting: ' + err);
  else {
    var queryResult = res.result;
    
    saveAndEmitQuery(monthlySignupCount.name, queryResult);
  }
};

var keenParticipantQueries = [allTimeSignups, allTimeUniqueSignups, monthlySignupCount];

function saveAndEmitQuery(queryName, queryResult) {
  var query = new QueryResult();
  query.name = queryName;
  query.result = queryResult;
  query.save(function (err) {
    if (err) throw('error saving: ' + err);
    else {
      io.on('connection', function(socket) {
        io.emit('message', query);
      });
    }
  });
}

module.exports = function (app, server) {
  io = require('socket.io')(server);
  app.use('/', router);
};

router.get('/', function (req, res, next) {  
  keenSurveyQueries.forEach(function(query) {
    QueryResult.findOne({ 'name': query.name }, function(err, queryResult) {
      if (err) throw('error saving: ' + err);
      if (!queryResult) {
        Keen.ready(function() {  
          keenClientSurveys.run(query.queries, query.callback);
        });
      } else {
        io.on('connection', function(socket) {
          io.emit('message', queryResult);
        });
      }
    });
  });
  
  keenParticipantQueries.forEach(function(query) {
    QueryResult.findOne({ 'name': query.name }, function(err, queryResult) {
      if (err) throw('error saving: ' + err);
      if (!queryResult) {
        Keen.ready(function() {  
          keenParticipantsList.run(query.queries, query.callback);
        });
      } else {
        io.on('connection', function(socket) {
          io.emit('message', queryResult);
        });
      }
    });
  });
    
  res.render('index', {
    title: 'devbeers Dashboard'
  });
});
