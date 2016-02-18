
define(function() {

  /* filter types supported */
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

  /* filter values */
  var filter = {
    industry: [2211],
    chemical: []
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


  return {
    filter: filter,
    options: filterOptions,
    updateFilter: updateFilter
  };
});
