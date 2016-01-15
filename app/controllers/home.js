require('dotenv').load();

var express = require('express'),
  router = express.Router(),
  mongoose = require('mongoose'),
  QueryResult = mongoose.model('QueryResult'),
  Keen = require('keen-js'),
  _ = require('lodash'),
  io;

var OVERALL_TIMEFRAME = {
  'start': new Date('November 1 2013').toISOString(),
  'end': new Date(new Date().setHours(0, 0, 0, 0)).toISOString()
};
var QUERY_CITY = "";

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

var totalEditions = { name: 'totalEditions' };
totalEditions.queries = [new Keen.Query('count_unique', {
  eventCollection: 'Event Participants',
  targetProperty: 'event_id',
  timeframe: OVERALL_TIMEFRAME
})];
totalEditions.callback = function(err, res) {
  if (err) throw('error charting: ' + err);
  else {
    var queryResult = res.result;
    
    saveAndEmitQuery(totalEditions.name, queryResult);
  }
};

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
    if (!isEmpty(QUERY_CITY)) {
      data[i] = { category: result1[i].event_id.substring(2), signups: result1[i].result };
    } else {
      data[i] = { category: result1[i].event_id, signups: result1[i].result };
    }
    
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
    } else {
      data[i].checkins = 0;
    }
    i++;
  }
  
  if (!isEmpty(QUERY_CITY)) {
    data.sort(function(a, b) {
      if (parseInt(a.category) < parseInt(b.category)) {
        return -1;
      }
      if (parseInt(a.category) > parseInt(b.category)) {
        return 1;
      }
      return 0;
    });
  }
  
  saveAndEmitQuery(monthlySignupAndCheckins.name, data);
  saveAndEmitQuery(averageCheckInPercentage.name, (checkInPercentage / result2.length).toFixed(2) * 100);
  saveAndEmitQuery(averageSignups.name, Math.round((averageSignupsResult / result1.length) * 100) / 100);
  saveAndEmitQuery(averageCheckins.name, Math.round((averageCheckinsResult / result2.length) * 100) / 100);
};

var programmingLanguages = { name: 'programmingLanguages' };

// JavaScript, Objective-C/Swift, Java, C#, C++, Ruby, Python
var allProgrammingColumnsQuery = new Keen.Query('count_unique', {
  eventCollection: 'Programming Languages',
  timeframe: OVERALL_TIMEFRAME,
  target_property: 'email',
  group_by: "programming_language",
  filters: [{
    "property_name": "programming_language",
    "operator": "ne",
    "property_value": null
  }]
});

var javaScriptQuery = new Keen.Query('count_unique', {
  eventCollection: 'Programming Languages',
  timeframe: OVERALL_TIMEFRAME,
  target_property: 'email',
  group_by: "email",
  filters: [{
      "property_name": "programming_language",
      "operator": "eq",
      "property_value": "JavaScript"
    }]
});

var nodeJSQuery = new Keen.Query('count');
nodeJSQuery.params = _.cloneDeep(javaScriptQuery.params);
nodeJSQuery.params.filters[0].property_value = 'Node.js';

var rubyQuery = new Keen.Query('count');
rubyQuery.params = _.cloneDeep(javaScriptQuery.params);
rubyQuery.params.filters[0].property_value = 'Ruby';

var pythonQuery = new Keen.Query('count');
pythonQuery.params = _.cloneDeep(javaScriptQuery.params);
pythonQuery.params.filters[0].property_value = 'Python';

var phpQuery = new Keen.Query('count');
phpQuery.params = _.cloneDeep(javaScriptQuery.params);
phpQuery.params.filters[0].property_value = 'PHP';

var cSharpQuery = new Keen.Query('count');
cSharpQuery.params = _.cloneDeep(javaScriptQuery.params);
cSharpQuery.params.filters[0].property_value = 'C#';

var javaQuery = new Keen.Query('count');
javaQuery.params = _.cloneDeep(javaScriptQuery.params);
javaQuery.params.filters[0].property_value = 'Java';

var objcQuery = new Keen.Query('count');
objcQuery.params = _.cloneDeep(javaScriptQuery.params);
objcQuery.params.filters[0].property_value = 'Objective-C';

programmingLanguages.queries = [allProgrammingColumnsQuery, javaScriptQuery, nodeJSQuery];
programmingLanguages.callback = function(err, res) {
  var resultArray = res[0].result;
  
  var jsAndNodeArray = res[1].result.concat(res[2].result);
  var jsAndNodeUniq = _.uniq(jsAndNodeArray, 'email');
  var jsAndNodeValue = jsAndNodeArray.length - jsAndNodeUniq.length;
  
  var nodeTotal = 0;
  for(var i = 0; i < resultArray.length; i++) {
    if(resultArray[i].programming_language === 'Node.js') {
      nodeTotal = resultArray[i].result;
      resultArray.splice(i, 1);
      break;
    }
  }
  for(var j = 0; j < resultArray.length; j++) {
    if(resultArray[j].programming_language === 'JavaScript') {
      resultArray[j].result += nodeTotal - jsAndNodeValue;
    }
  }
  
  for(var k = 0; k < resultArray.length; k++) {
    if(resultArray[k].programming_language === 'HTML5' ||
       resultArray[k].programming_language === 'Android' || 
       resultArray[k].programming_language === '.NET') {
      resultArray.splice(k, 1);
      k--;
    }
  }
  
  console.log(resultArray);
  
  saveAndEmitQuery(programmingLanguages.name, resultArray);
};

var keenSurveyQueries = [npsScoreAverage, npsScoreQuery];

var keenParticipantQueries = [totalEditions, allTimeSignups, allTimeUniqueSignups, monthlySignupAndCheckins, averageCheckInPercentage, averageSignups, averageCheckins, programmingLanguages];

function saveAndEmitQuery(queryName, queryResult) {
  var query = new QueryResult();
  query.name = queryName;
  query.result = queryResult;
  query.city = QUERY_CITY;
  query.timeframe = OVERALL_TIMEFRAME;
  
  query.save(function (err) {
    if (err) {
      throw('error saving: ' + err);
    } else {
      io.emit('message' + QUERY_CITY, query);
    }
  });
}

function runQueryForKeenReady(query, keenClient) {
  return function() {
    keenClient.run(query.queries, query.callback);
  };
}

function runQuery(query, keenClient) {
  return function(err, queryResult) {
    if (err) throw('error finding: ' + err);
    if (!queryResult) {
      //update queries timeframe property
      if(query.queries) {
        for (var k = 0; k < query.queries.length; k++) {
          query.queries[k].params.timeframe = OVERALL_TIMEFRAME;
        }
      }
      
      // clean out 'city' filter in case the user wants to see overall info
      if (query.queries && query.callback) {
        for(var i = 0; i < query.queries.length; i++) {
          if(!query.queries[i].params.filters) {
            query.queries[i].params.filters = [];
          }
          for(var j = 0; j < query.queries[i].params.filters.length; j++) {
            if(query.queries[i].params.filters[j].property_name === 'city') {
              query.queries[i].params.filters.splice(j, 1);
            }
          }
          // add new 'city' filter if there is one
          if (!isEmpty(QUERY_CITY)) {
            query.queries[i].params.filters.push({
              "property_name": "city",
              "operator": "eq",
              "property_value": QUERY_CITY
            });
          }
        }
        Keen.ready(runQueryForKeenReady(query, keenClient));
      }
    } else {
      io.emit('message' + QUERY_CITY, queryResult);
    }
  };
}

function runKeenQueries(keenQueries, keenClient) {
  for(var i = 0; i < keenQueries.length; i++) {
    var query = keenQueries[i];
    QueryResult.findOne({ 'name': query.name, 'city': QUERY_CITY, 'timeframe': OVERALL_TIMEFRAME }, runQuery(query, keenClient));
  }
}

function isEmpty(str) {
  return (!str || 0 === str.length);
}

router.get('/', function (req, res, next) {
  QUERY_CITY = req.query.city ? req.query.city : "";
  if (req.query.startDate && req.query.endDate) {
    OVERALL_TIMEFRAME = {
      "start": new Date(req.query.startDate).toISOString(),
      "end": new Date(req.query.endDate).toISOString()
    };
  } else {
    OVERALL_TIMEFRAME = {
      'start': new Date('November 1 2013').toISOString(),
      'end': new Date(new Date().setHours(0, 0, 0, 0)).toISOString()
    };
  }
  
  res.render('index', {
    title: 'devbeers Dashboard',
    CITY: QUERY_CITY
  });
});

router.get('/superagenttest', function(req, res, next) {
  QUERY_CITY = req.query.city ? req.query.city : "";
  OVERALL_TIMEFRAME = {
    'start': new Date('November 1 2013').toISOString(),
    'end': new Date(new Date().setHours(0, 0, 0, 0)).toISOString()
  };

  res.render('superagent', {
    title: 'neto dashboard',
    CITY: QUERY_CITY
  });
//   var npsScoreAverage = {
//     name: 'npsScoreAverage',
//     queries: [new Keen.Query('average', {
//       eventCollection: 'Participants Answers',
//       targetProperty: 'nps_score',
//       timeframe: OVERALL_TIMEFRAME
//     })],
//     callback: function(err, res) {
//       if (err) throw('error charting: ' + err);
//       else {
//         var queryResult = res.result;
//         var query = new QueryResult();
//         query.name = queryName;
//         query.result = queryResult;
//         query.city = QUERY_CITY;
//         query.timeframe = OVERALL_TIMEFRAME;
        
//         saveAndEmitQuery(npsScoreAverage.name, queryResult);
//       }
//     }};
});

module.exports = function (app, server) {
  io = require('socket.io')(server);
  
  io.on('connection', function(socket) {
    runKeenQueries(keenSurveyQueries, keenClientSurveys);  
    runKeenQueries(keenParticipantQueries, keenParticipantsList);
  });
  
  app.use('/', router);
};