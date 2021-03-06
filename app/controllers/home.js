var express = require('express');
var router = express.Router();
var Keen = require('keen-js');
var _ = require('lodash');
var mongoose = require('mongoose');
var QueryResult = mongoose.model('QueryResult');

var FROM_BEGINNING_TIMEFRAME = {
  'start': new Date('February 1 2014').toISOString(),
  'end': new Date(new Date().setHours(0, 0, 0, 0)).toISOString()
};

// Initial values for timeframe and city
var OVERALL_TIMEFRAME = FROM_BEGINNING_TIMEFRAME;
var QUERY_CITY = "";

// Keen clients
var keenClientSurveys = new Keen({
  projectId: process.env.KEEN_CLIENT_SURVEYS_PROJECT_ID,
  readKey: process.env.KEEN_CLIENT_SURVEYS_READ_KEY
});
var keenParticipantsList = new Keen({
  projectId: process.env.KEEN_PARTICIPANTS_LIST_PROJECT_ID,
  readKey: process.env.KEEN_PARTICIPANTS_LIST_READ_KEY
});

// KeenClientSurveys queries
// NPS score average
var npsScoreAverage = {
  queries: [new Keen.Query('average', {
    eventCollection: 'Participants Answers',
    targetProperty: 'nps_score',
    timeframe: OVERALL_TIMEFRAME
  })],
  callback: sendSimpleResult
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

var npsScoreQuery = {
  queries: [npsScoreCount, npsScoreDetractors, npsScorePromoters],
  callback: function(res, name) {
    return function(err, result) {
      if (err) throw('error charting: ' + err);
      else {
        var queryResult = ((result[2].result - result[1].result) / result[0].result).toFixed(2) * 100;
        sendResult(res, name, queryResult);
      }
    };
  }
};

keenClientSurveys.queries = {
  npsScoreAverage: npsScoreAverage,
  npsScoreParticipants: npsScoreQuery
};

// keenParticipantsList queries
var totalEditions = {
  queries: [new Keen.Query('count_unique', {
    eventCollection: 'Event Participants',
    targetProperty: 'event_id',
    timeframe: OVERALL_TIMEFRAME
  })],
  callback: sendSimpleResult
};

var allTimeSignups = {
  queries: [new Keen.Query('count', {
    eventCollection: 'Event Participants',
    targetProperty: 'keen.timestamp',
    timeframe: OVERALL_TIMEFRAME
  })],
  callback: sendSimpleResult
};

var allTimeUniqueSignups = {
  queries: [new Keen.Query('count_unique', {
    eventCollection: 'Event Participants',
    targetProperty: 'email',
    timeframe: OVERALL_TIMEFRAME
  })],
  callback: sendSimpleResult
};

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

var monthlySignupAndCheckins = {
  queries: [monthlySignupCountQuery, monthlyCheckinCountQuery],
  callback: function(res, name) {
    return function(err, result) {
      var result1 = result[0].result;
      var result2 = result[1].result;
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

      var results = {
        result: [
          {name: name, result: data},
          {name: 'averageCheckInPercentage', result: (checkInPercentage / result2.length).toFixed(2) * 100},
          {name: 'averageSignups', result: Math.round((averageSignupsResult / result1.length) * 100) / 100},
          {name: 'averageCheckins', result: Math.round((averageCheckinsResult / result2.length) * 100) / 100}
        ]
      };

      saveQuery(name, results.result);

      res.json(results);
    };
  }
};

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

programmingLanguages = {
  queries: [allProgrammingColumnsQuery, javaScriptQuery, nodeJSQuery],
  callback: function(res, name) {
    return function(err, result) {
      var resultArray = result[0].result;

      var jsAndNodeArray = result[1].result.concat(result[2].result);
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

      sendResult(res, name, resultArray);
    };
  }
};

keenParticipantsList.queries = {
  totalEditions: totalEditions,
  allTimeSignups: allTimeSignups,
  allTimeUniqueSignups: allTimeUniqueSignups,
  monthlySignupsAndCheckins: monthlySignupAndCheckins,
  programmingLanguages: programmingLanguages
};

router.get('/', function(req, res, next) {
  QUERY_CITY = req.query.city ? req.query.city : "";
  if (req.query.startDate && req.query.endDate) {
    OVERALL_TIMEFRAME = {
      "start": req.query.startDate,
      "end": req.query.endDate
    };
  } else {
    OVERALL_TIMEFRAME = FROM_BEGINNING_TIMEFRAME;
  }

  res.render('index', {
    title: 'devbeers Dashboard',
    CITY: QUERY_CITY
  });
});

function createRoutes(keenClient) {
  for (var queryName in keenClient.queries) {
    var query = keenClient.queries[queryName];
    (function(query, queryName) {
      // console.log('resgistering:', queryName)
      router.get('/' + queryName, function(req, res, next) {
        QueryResult.findOne({ name: queryName, city: QUERY_CITY, timeframe: OVERALL_TIMEFRAME }, runQuery(res, queryName, query, keenClient));
      });
    })(query, queryName);
  }
}

createRoutes(keenClientSurveys);
createRoutes(keenParticipantsList);

function isEmpty(str) {
  return (!str || 0 === str.length);
}

function sendResult(res, name, result) {
  saveQuery(name, result);
  res.json({
    name: name,
    result: result
  });
}

function sendSimpleResult(res, name) {
  return function(err, result) {
    if (err) throw('error charting: ' + err);
    else {
      sendResult(res, name, result.result);
    }
  };
}

function saveQuery(queryName, queryResult) {
  var query = new QueryResult();
  query.name = queryName;
  query.result = queryResult;
  query.city = QUERY_CITY;
  query.timeframe = OVERALL_TIMEFRAME;

  query.save(function (err) {
    if (err) {
      throw('error saving: ' + err);
    }
  });
}

function runQuery(res, queryName, query, keenClient) {
  return function(err, queryResult) {
    if (err) throw('error finding: ' + err);
    if (!queryResult) {
      for (var i = 0; i < query.queries.length; i++) {
        //update queries timeframe property
        query.queries[i].params.timeframe = OVERALL_TIMEFRAME;

        // clean out 'city' filter in case the user wants to see overall info
        if (!query.queries[i].params.filters) {
          query.queries[i].params.filters = [];
        }

        for (var j = 0; j < query.queries[i].params.filters.length; j++) {
          if (query.queries[i].params.filters[j].property_name === 'city') {
            query.queries[i].params.filters.splice(j, 1);
          }
        }

        // add new 'city' filter if there is one
        if (!isEmpty(QUERY_CITY)) {
          query.queries[i].params.filters.push({
            property_name: 'city',
            operator: 'eq',
            property_value: QUERY_CITY
          });
        }
      }

      keenClient.run(query.queries, query.callback(res, queryName));
    } else {
      res.json(queryResult);
    }
  };
}

router.get('/allTimeSignupsChart', function(req, res, next) {
  res.render('react', {title: 'react'});
});

router.get('/allTimeSignupsDetail', function(req, res, next) {
  var query = new Keen.Query('count', {
    eventCollection: 'Event Participants',
    timeframe: FROM_BEGINNING_TIMEFRAME,
    interval: 'monthly'
  });
  keenParticipantsList.run(query, function(err, result) {
    if (err) { throw(err); }
    else {
      result.title = 'All time signups';
      res.json(result);
    }
  });
});

router.get('/allTimeUniqueSignupsChart', function(req, res, next) {
  res.render('react', {title: 'react'});
});

router.get('/allTimeUniqueSignupsDetail', function(req, res, next) {
  var query = new Keen.Query('select_unique', {
    eventCollection: 'Event Participants',
    targetProperty: 'email',
    timeframe: FROM_BEGINNING_TIMEFRAME,
    interval: 'monthly'
  });
  keenParticipantsList.run(query, function(err, result) {
    if (err) { throw(err); }
    else {
      // filtering all time unique emails
      var groupByTimeframe = result.result;
      for (var i = 0; i < groupByTimeframe.length; i++) {
        var emailList = groupByTimeframe[i].value;
        for (var j = 0; j < emailList.length; j++) {
          for (var k = i+1; k < groupByTimeframe.length; k++) {
            var nextEmailList = groupByTimeframe[k].value;
            var index = nextEmailList.indexOf(emailList[j]);
            if (index > -1) {
              nextEmailList.splice(index, 1);
            }
          }
        }
      }

      // making a list of all time unique emails totals by month
      var count = [];
      for (i = 0; i < groupByTimeframe.length; i++) {
        count.push({value: groupByTimeframe[i].value.length});
      }

      result.title = 'All time unique signups';
      result.result = count;
      res.json(result);
    }
  });
});

module.exports = function(app, server) {
  app.use('/', router);
};
