var socket = io();
socket.on('message', function(msg) {
  drawObj(msg);
});

var npsScoreAverageChart = new Keen.Dataviz()
  .el(document.getElementById('nps-score-participants-average'))
  .chartType('metric')
  .colors(['#49c5b1'])
  .title('NPS Score Average')
  .prepare();
  
var npsScoreParticipantsChart = new Keen.Dataviz()
  .el(document.getElementById('nps-score-participants'))  
  .chartType('metric')
  .title('NPS Score')
  .colors(['#49c5b1'])
  .prepare();

var allTimeSignupsChart = new Keen.Dataviz()
  .el(document.getElementById('all-time-signups'))
  .chartType('metric')
  .title('All-time signups')
  .colors(['#49c5b1'])
  .chartOptions({
    prettyNumber: false
  })
  .prepare();

var allTimeUniqueSignupsChart = new Keen.Dataviz()
  .el(document.getElementById('all-time-unique-signups'))
  .chartType('metric')
  .title('All-time unique signups')
  .colors(['#49c5b1'])
  .chartOptions({
    prettyNumber: false
  })
  .prepare();
  
var monthlySignupCountChart = new Keen.Dataviz()
  .el(document.getElementById('monthly-signups-sp'))
  .chartType('columnchart')
  .prepare();

var keenObjs = {};

keenObjs.npsScoreAverageChart = npsScoreAverageChart;
keenObjs.npsScoreParticipantsChart = npsScoreParticipantsChart;
keenObjs.allTimeSignupsChart = allTimeSignupsChart;
keenObjs.allTimeUniqueSignupsChart = allTimeUniqueSignupsChart;
keenObjs.monthlySignupCountChart = monthlySignupCountChart;

function drawObj(queryResult) {
  Keen.ready(function() {
    keenObjs[queryResult.name + 'Chart']
      .parseRawData({
        result: queryResult.result
      })
      .render();
  });
}