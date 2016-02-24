$(function() {
  var getUrlParameter = function getUrlParameter(sParam) {
    var sPageURL = decodeURIComponent(window.location.search.substring(1)),
        sURLVariables = sPageURL.split('&'),
        sParameterName,
        i;

    for (i = 0; i < sURLVariables.length; i++) {
      sParameterName = sURLVariables[i].split('=');

      if (sParameterName[0] === sParam) {
          return sParameterName[1] === undefined ? true : sParameterName[1];
      }
    }
  }

  var startDate = new Date(getUrlParameter('startDate')) || new Date('November 1 2013');
  var endDate = new Date(getUrlParameter('endDate')) || new Date();
  $("#datepicker1").datepicker().datepicker("setDate", startDate);
  $("#datepicker2").datepicker().datepicker("setDate", endDate);

  function setTimeframe(startingDate) {
    var url = '?startDate=' + startingDate.toISOString() + '&endDate=' + new Date().toISOString();
    var city = getUrlParameter('city');
    if (city) {
      url += '&city=' + city;
    }
    return url;
  }

  function getCurrentDateLessMonths(months) {
    var a = new Date();
    a.setMonth(a.getMonth() - months);
    return a;
  }

  document.getElementById('allTimeButton').setAttribute('href', setTimeframe(new Date('November 1 2013')));
  document.getElementById('lastMonthButton').setAttribute('href', setTimeframe(getCurrentDateLessMonths(1)));
  document.getElementById('lastThreeMonthsButton').setAttribute('href', setTimeframe(getCurrentDateLessMonths(3)));
  document.getElementById('lastSixMonthsButton').setAttribute('href', setTimeframe(getCurrentDateLessMonths(6)));
  document.getElementById('lastTwelveMonthsButton').setAttribute('href', setTimeframe(getCurrentDateLessMonths(12)));
});
