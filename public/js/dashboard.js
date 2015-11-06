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
  
var keenObjs = {};

keenObjs.npsScoreAverageChart = npsScoreAverageChart;
keenObjs.npsScoreParticipantsChart = npsScoreParticipantsChart;

function drawObj(queryResult) {
  keenObjs[queryResult.name + 'Chart']
    .parseRawData({
      result: queryResult.result
    })
    .render();
}