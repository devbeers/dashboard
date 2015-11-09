require('dotenv').load();

var express = require('express'),
  router = express.Router(),
  mongoose = require('mongoose'),
  QueryResult = mongoose.model('QueryResult'),
  Keen = require('keen-js'),
  io;

var OVERALL_TIMEFRAME = 'this_2_years';

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
  timeframe: OVERALL_TIMEFRAME
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
  timeframe: OVERALL_TIMEFRAME
});

var npsScoreDetractors = new Keen.Query('count', {
  eventCollection: 'Participants Answers',
  targetProperty: 'nps_score',
  timeframe: OVERALL_TIMEFRAME,
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
  timeframe: OVERALL_TIMEFRAME,
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
  timeframe: OVERALL_TIMEFRAME
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
  timeframe: OVERALL_TIMEFRAME
})];
allTimeUniqueSignups.callback = function(err, res) {
  if (err) throw('error charting: ' + err);
  else {
    var queryResult = res.result;
    
    saveAndEmitQuery(allTimeUniqueSignups.name, queryResult);
  }
};

var monthlySignupAndCheckins = { name: 'monthlySignupsAndCheckins' };

// Signup Query
var monthlySignupCountQuery = new Keen.Query('count', {
  eventCollection: 'Event Participants',
  targetProperty: 'keen.timestamp',
  timeframe: OVERALL_TIMEFRAME,
  group_by: "event_id"
});

// Checkin Query
var monthlyCheckinCountQuery = new Keen.Query('count', {
  eventCollection: 'Event Participants',
  targetProperty: 'keen.timestamp',
  timeframe: OVERALL_TIMEFRAME,
  group_by: "event_id",
  filters: [
    {
      "property_name": "check_in_date",
      "operator": "gt",
      "property_value": '2013-12-31'
    }
  ]
});

monthlySignupAndCheckins.queries = [monthlySignupCountQuery, monthlyCheckinCountQuery];
var averageCheckInPercentage = { name: 'averageCheckInPercentage' };
var averageSignups = { name: 'averageSignups' };
var averageCheckins = { name: 'averageCheckins' };
monthlySignupAndCheckins.callback = function(err, res) {
  var result1 = res[0].result;
  var result2 = res[1].result;
  var data = [];
  var i = 0;
  var j = 0;
  var checkInPercentage = 0;
  var averageSignupsResult = 0;
  var averageCheckinsResult = 0;

  while (i < result1.length) {
    data[i] = { category: result1[i].event_id, signups: result1[i].result };
    
    averageSignupsResult += result1[i].result;
    
    if(result2[j] && result1[i].event_id === result2[j].event_id) {
      data[i].checkins = result2[j].result;
      averageCheckinsResult += result2[j].result;
      
      // Calculate no show percentage
      var editionNoShowPercentage = result2[j].result / result1[i].result;
      // Don't add to overall edition percentage if value is smaller than 0.1
      if (editionNoShowPercentage > 0.1) {
        checkInPercentage += editionNoShowPercentage;
      }
      j++;
    }
    i++;
  }
  saveAndEmitQuery(monthlySignupAndCheckins.name, data);
  saveAndEmitQuery(averageCheckInPercentage.name, (checkInPercentage / result2.length).toFixed(2) * 100);
  saveAndEmitQuery(averageSignups.name, Math.round((averageSignupsResult / result1.length) * 100) / 100);
  saveAndEmitQuery(averageCheckins.name, Math.round((averageCheckinsResult / result2.length) * 100) / 100);
};

var keenParticipantQueries = [allTimeSignups, allTimeUniqueSignups, monthlySignupAndCheckins, averageCheckInPercentage, averageSignups, averageCheckins];

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

function runKeenQueries() {
  keenSurveyQueries.forEach(function(query) {
    QueryResult.findOne({ 'name': query.name }, function(err, queryResult) {
      if (err) throw('error saving: ' + err);
      if (!queryResult && query.queries && query.callback) {
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
      if (!queryResult && query.queries && query.callback) {
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
}

router.get('/', function (req, res, next) {    
  runKeenQueries();  
    
  res.render('index', {
    title: 'devbeers Dashboard'
  });
});