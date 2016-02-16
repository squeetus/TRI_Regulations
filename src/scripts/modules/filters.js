/*

  Filter options and settings

*/
define(function() {
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
  return {
    options: filterOptions,
    filter: function(args) {
      console.log(args);
    }
  };
});
