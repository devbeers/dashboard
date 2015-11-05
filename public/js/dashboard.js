var socket = io();
socket.on('message', function(msg) {
  drawObj(msg);
});

function drawObj(queryResult) {
  Keen.ready(function() {  
    var npsScoreAverageChart = new Keen.Dataviz()
      .el(document.getElementById('nps-score-participants-average'))
      .chartType('metric')
      .title('NPS Score Average - Participants')
      .colors(['#49c5b1'])
      .prepare();

    npsScoreAverageChart
      .parseRawData({
        result: queryResult.result
      })
      .render();
  });
}