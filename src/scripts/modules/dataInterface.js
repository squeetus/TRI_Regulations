/*

  Data import and settings for TRI data

*/
define(['json!data/allCas.json'], function(data) {

  /* sum up the usage data for the given data */
  function aggregateUsage(data) {
      var chartData = [];
      for(var i = 0; i < 27; i++) {
        chartData[i] = 0;
      }

      for(var f in data) {
        for(var j = 0; j < data[f].stack.length; j++) {
          chartData[j] += data[f].stack[j] + data[f].fugitive[j];
        }
      }

      return chartData;
  }

  return {
    data: data,
    filter: function(config) {
      var fData = data.facilities;
      if(!config) {
        return aggregateUsage(fData);
      }
      for(var f in config) {
        switch(f) {
          case "regulation":
            fData = filterByRegulation(config[f]);
        }
      }
      return aggregateUsage(fData);
    }
  };
});
