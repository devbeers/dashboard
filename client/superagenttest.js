var request = require('superagent');

var city = '';
if (window.location.search.slice(-2) === 'SP' ||
    window.location.search.slice(-2) === 'BH' ||
    window.location.search.slice(-2) === 'RJ') {
    city = window.location.search.slice(-2);
}


var keenObjs = {
    totalEditions: {
        chart: new Keen.Dataviz()
            .el(document.getElementById('total-editions'))
            .chartType('metric')
            .colors(['#49c5b1'])
            .title('Number of Editions')
            .prepare(),
        callback: callback
    },
    npsScoreAverage: {
        chart: new Keen.Dataviz()
            .el(document.getElementById('nps-score-participants-average'))
            .chartType('metric')
            .colors(['#49c5b1'])
            .title('NPS Score Average')
            .prepare(),
        callback: callback
    },
    npsScoreParticipants: {
        chart: new Keen.Dataviz()
            .el(document.getElementById('nps-score-participants'))
            .chartType('metric')
            .title('NPS Score')
            .colors(['#49c5b1'])
            .prepare(),
        callback: callback
    },
    allTimeSignups: {
        chart: new Keen.Dataviz()
            .el(document.getElementById('all-time-signups'))
            .chartType('metric')
            .title('All-time signups')
            .colors(['#49c5b1'])
            .chartOptions({
                prettyNumber: false
            })
            .prepare(),
        callback: callback
    },
    allTimeUniqueSignups: {
        chart: new Keen.Dataviz()
            .el(document.getElementById('all-time-unique-signups'))
            .chartType('metric')
            .title('All-time unique signups')
            .colors(['#49c5b1'])
            .chartOptions({
                prettyNumber: false
            })
            .prepare(),
        callback: callback
    },
    monthlySignupsAndCheckins: {
        charts: {
            monthlySignupsAndCheckins: new Keen.Dataviz()
                .el(document.getElementById('monthly-signups-and-checkins-sp'))
                .chartType('columnchart')
                .prepare(),
            averageCheckInPercentage: new Keen.Dataviz()
                .el(document.getElementById('average-check-in-percentage'))
                .chartType('metric')
                .title('Check-in Rate')
                .colors(['#49c5b1'])
                .chartOptions({suffix: '%'})
                .prepare(),
            averageSignups: new Keen.Dataviz()
                .el(document.getElementById('average-signups'))
                .chartType('metric')
                .title('Average Signups')
                .colors(['#49c5b1'])
                .chartOptions({
                prettyNumber: false
                })
                .prepare(),
            averageCheckins: new Keen.Dataviz()
                .el(document.getElementById('average-checkins'))
                .chartType('metric')
                .title('Average Check-ins')
                .colors(['#49c5b1'])
                .chartOptions({
                    prettyNumber: false
                })
                .prepare()
        },
        callback: function(err, res) {
            if (err) {
                console.log(err);
            } else {
                for (var i = 0; i < res.body.result.length; i++) {
                    var chart = res.body.result[i];
                    keenObjs.monthlySignupsAndCheckins.charts[chart.name].parseRawData({
                        result: chart.result
                    }).render();
                }
            }
        }
    },
    programmingLanguages: {
        chart: new Keen.Dataviz()
            .el(document.getElementById('programming-languages'))
            .chartType('columnchart')
            .prepare(),
        callback:callback
    }
};

function drawObj(queryResult) {
    Keen.ready(function() {
        if(queryResult) {
            keenObjs[queryResult.name].chart
            .parseRawData({
              result: queryResult.result
            })
            .render();
        }
  });
}

function callback(err, res) {
    if (err) {
        console.log(err);
    } else {
        drawObj(res.body);
    }
}

window.onload = function() {
    for (var chart in keenObjs) {
        request.get('/' + chart, keenObjs[chart].callback);
    }
}
