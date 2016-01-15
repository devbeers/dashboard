var request = require('superagent');

var socket = io.connect();
var city = '';
if (window.location.search.slice(-2) === 'SP' ||
    window.location.search.slice(-2) === 'BH' || 
    window.location.search.slice(-2) === 'RJ') {
    city = window.location.search.slice(-2);
}
socket.on('message' + city, function(msg) {
    drawObj(msg);
});

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
    console.log(request);
}