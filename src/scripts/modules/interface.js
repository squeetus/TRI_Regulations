/*

User Interface

  -   Chart

  -   Filters
      - facility
      - chemical
      - regulation

*/

define(["components/d3.v3.min", "modules/lineChart"], function(d3, lineChart) {

  var components = [],
    dimensions,
    facilityFilter,
    chemicalFilter,
    regulationFilter,
    chartArea;

  dimensions = [
      (window.innerWidth > 960) ? window.innerWidth : 960,
      (window.innerHeight > 500) ? window.innerHeight: 500
    ];

  setupContainers(dimensions);

  return {
    lineChart: lineChart,
    "stuff": "things"
  };


});




/*

  Set up the primary components

  Notes:
    this function could be generalized to set up a collection of objects with
    screen positions based on a config file or set of values.

  Params:
    dimensions - [clientWidth, clientHeight]

*/
function setupContainers(dimensions) {
  chartArea = d3.select("#chartContainer")
      .style("width", dimensions[0] * 0.6 + "px")
      .style("height", dimensions[1] * 0.6 + "px")
      .style("border", "solid 1px black")
      .style("margin-left", dimensions[0] * 0.2 + "px")
      .style("margin-top", dimensions[1] * 0.1 + "px")
      .style("position", "fixed");

  facilityFilter = d3.select("#facilityFilterContainer")
    // .append("svg")
        .style("width", dimensions[0] * 0.05 + "px")
        .style("height", dimensions[1] * 0.6 + "px")
        .style("border", "solid 1px black")
        .style("margin-left", dimensions[0] * 0.85 + "px")
        .style("margin-top", dimensions[1] * 0.1 + "px")
        .style("position", "fixed");

  chemicalFilter = d3.select("#chemicalFilterContainer")
    // .append("svg")
        .style("width", dimensions[0] * 0.05 + "px")
        .style("height", dimensions[1] * 0.6 + "px")
        .style("border", "solid 1px black")
        .style("margin-left", dimensions[0] * 0.10 + "px")
        .style("margin-top", dimensions[1] * 0.1 + "px")
        .style("position", "fixed");

  regulationFilter = d3.select("#regulationFilterContainer")
    // .append("svg")
        .style("width", dimensions[0] * 0.6 + "px")
        .style("height", dimensions[1] * 0.08 + "px")
        .style("border", "solid 1px black")
        .style("margin-left", dimensions[0] * 0.20 + "px")
        .style("margin-top", dimensions[1] * 0.75 + "px")
        .style("position", "fixed");
}