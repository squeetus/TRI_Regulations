/*

  Filter options and settings for TRI data

*/
define(['json!data/allCas.json'], function(data) {
  var filterOptions = {
    facilities: [
      "byNaics"
    ],
    chemicals: [
      "byChemical",
      "byHealthImpact",
      "byClassification"
    ]
  };

  function filterByRegulation(regulation) {
    //lookup regulation in a regulation dataset or class
    // obtain the attributes to filter by..
    // hard-coded in this first case:
    //    only correct state in dataset
    //    only correct industry in dataset

    var filteredData = data.facilities.filter(function(f) {
      console.log(f);
    });

    return filteredData;

  }

  /*

    sum up the usage data for the given data

  */
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
    options: filterOptions,
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
