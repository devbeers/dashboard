var socket = io('http://localhost');
socket.on('message' + window.location.search.slice(-2), function(msg) {
  drawObj(msg);
});

var totalEditionsChart = new Keen.Dataviz()
  .el(document.getElementById('total-editions'))
  .chartType('metric')
  .colors(['#49c5b1'])
  .title('Number of Editions')
  .prepare();

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
  
var monthlySignupsAndCheckinsChart = new Keen.Dataviz()
  .el(document.getElementById('monthly-signups-and-checkins-sp'))
  .chartType('columnchart')
  .prepare();
  
var averageCheckInPercentageChart = new Keen.Dataviz()
  .el(document.getElementById('average-check-in-percentage'))
  .chartType('metric')
  .title('Check-in Rate')
  .colors(['#49c5b1'])
  .chartOptions({suffix: '%'})
  .prepare();
  
var averageSignupsChart = new Keen.Dataviz()
  .el(document.getElementById('average-signups'))
  .chartType('metric')
  .title('Average Signups')
  .colors(['#49c5b1'])
  .chartOptions({
    prettyNumber: false
  })
  .prepare();

var averageCheckinsChart = new Keen.Dataviz()
  .el(document.getElementById('average-checkins'))
  .chartType('metric')
  .title('Average Check-ins')
  .colors(['#49c5b1'])
  .chartOptions({
    prettyNumber: false
  })
  .prepare();

var keenObjs = {};

keenObjs.totalEditionsChart = totalEditionsChart;
keenObjs.npsScoreAverageChart = npsScoreAverageChart;
keenObjs.npsScoreParticipantsChart = npsScoreParticipantsChart;
keenObjs.allTimeSignupsChart = allTimeSignupsChart;
keenObjs.allTimeUniqueSignupsChart = allTimeUniqueSignupsChart;
keenObjs.monthlySignupsAndCheckinsChart = monthlySignupsAndCheckinsChart;
keenObjs.averageCheckInPercentageChart = averageCheckInPercentageChart;
keenObjs.averageSignupsChart = averageSignupsChart;
keenObjs.averageCheckinsChart = averageCheckinsChart;

function drawObj(queryResult) {
  Keen.ready(function() {
    if(queryResult) {
      keenObjs[queryResult.name + 'Chart']
        .parseRawData({
          result: queryResult.result
        })
        .render();
    }
  });
}