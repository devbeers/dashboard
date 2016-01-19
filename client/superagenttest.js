var request = require('superagent');

var city = '';
if (window.location.search.slice(-2) === 'SP' ||
    window.location.search.slice(-2) === 'BH' || 
    window.location.search.slice(-2) === 'RJ') {
    city = window.location.search.slice(-2);
}

var npsScoreAverageChart = new Keen.Dataviz()
    .el(document.getElementById('nps-score-participants-average'))
    .chartType('metric')
    .colors(['#49c5b1'])
    .title('NPS Score Average')
    .prepare();

var keenObjs = {};
keenObjs.npsScoreAverageChart = npsScoreAverageChart;

function drawObj(queryResult) {
    Keen.ready(function() {
        if(queryResult) {
            if (keenObjs[queryResult.name + 'Chart']) {
                keenObjs[queryResult.name + 'Chart']
                .parseRawData({
                  result: queryResult.result
                })
                .render();
            }
        }
  });
}

window.onload = function() {
    request.get('/npsScoreAverage', function(err, res) {
        if (err) {
            console.log(err);
        } else {
            drawObj(res.body);
        }
    });
}