
define(function() {

  /* filter types supported */
  var filterOptions = {
    facilities: [           // filter facilities
      "byNaics"
    ],
    chemicals: [            // filter chemicals
      "byChemical",
      "byHealthImpact",
      "byClassification"
    ],
    usage: [                // filter usage type
      "fugitiveAir",
      "stackAir"
    ]
  };

  /* filter values */
  var filters = {
    industry: [2211],
    chemical: [],
    usage: []
  };

  /* update filter for charts */
  function updateFilter(args) {
    if( args.industry ) {
      // see if args industry is in filter industry list, add if not
    }

    if(args.chemical) {
      // see if args chemical is in filter chemical list, add if not
    }
  }

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

  function filter(data) {
    var fData = data.facilities;



    /* filter by particular filter settings */
    // for(var f in config) {
    //   switch(f) {
    //     case "regulation":
    //       fData = filterByRegulation(config[f]);
    //   }
    // }
    return aggregateUsage(fData);
  }

  return {
    filter: filter,
    filters: filters,
    options: filterOptions,
    updateFilter: updateFilter
  };
});
