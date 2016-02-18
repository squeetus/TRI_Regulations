
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
    chemical: ["71432", "N100"],
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

      for( var f in data ) {
        for( var j = 0; j < data[ f ].stack.length; j++ ) {
          chartData[j] += data[ f ].stack[ j ] + data[ f ].fugitive[ j ];
        }
      }

      return chartData;
  }

  function filter( data ) {
    var fData = [],
      i = 0, // loop counter
      j = 0, // loop counter
      facility = null,
      industryMatch = false,
      chemicalMatch = false;
    //
    // for( i = 0; i < data.facilities.length; i++ ) {
    //   fData[i] = data.facilities[i];
    // }
    console.log( "STARTING with ", data.facilities.length, "facilities" );

    for( var fac in data.facilities ) {
      facility = data.facilities[ fac ];
      industryMatch = false;
      chemicalMatch = false;
      // filter industry sector

      if( filters.industry.length > 0 ) { // only filter by industry if industry filters exist
        for( i = 0; i < filters.industry.length; i++ ) {      // for each filter industry
          if( facility.industry.indexOf(filters.industry[ i ]) === 0 ) {  // keep if industry matches facility
            industryMatch = true;
            // console.log(industryMatch);
            break;    // stop looking at industries
          }
        }
        if( !industryMatch ) { // facility does not match filtered industry sectors
          // console.log( facility, "does not conform to industry filter" );
          // // fData.splice( fac, 1 );
          // console.log( fac );
          // toDelete++;
          continue;
        }
      } else
        industryMatch = true;

      // filter chemicals
      if( filters.chemical.length > 0 ) { // only filter by chemical if chemical filters exist
        for( i = 0; i < filters.chemical.length; i++ ) {    // for each filter chemical
          for( j = 0; j < facility.chemicals.length; j++ ) { // see if the chemical is in the facility
            if( filters.chemical[ i ] == facility.chemicals[ j ].chemical ) { // keep if a chemical matches
              // console.log("keeping", facility);
              chemicalMatch = true;
              break;
            }
          }
        }
        if( !chemicalMatch ) { // facility does not match filtered industry sectors
          // console.log( fac, "does not conform to chemical filter.. deleting" );
          // fData.splice( fac, 1 );
          // toDelete++;
          continue;
        }
      } else
        chemicalMatch = true;

      if(chemicalMatch && industryMatch) {
        fData.push( facility );
      }
    } // finished filtering facilities

    console.log( "Filtered down to ", fData.length, "facilities:", fData);

    // filter aggregation by chemical still
    return aggregateUsage(fData);
  }

  return {
    filter: filter,
    filters: filters,
    options: filterOptions,
    updateFilter: updateFilter
  };
});
