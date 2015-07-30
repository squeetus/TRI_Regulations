/////////////////////////////////////////////////////////////////////////////
//
//          TRI Dataset Visualization
//          version 1.2
//
//          Created by
//              David Burlinson
//              Spring 2015 (v1.1)
//
//              Modified July 2015 (v1.2)
//
//                                             _
//                                            | \
//                                            | |
//                                            | |
//                       |\                   | |
//                      /, ~\                / /
//                     X     `-.....-------./ /
//                      ~-. ~  ~              |
//                         \             /    |
//                          \  /_     ___\   /
//                          | /\ ~~~~~   \ |
//                          | | \        || |
//                          | |\ \       || )
//                         (_/ (_/      ((_/
//
//
//
//
//
/////////////////////////////////////////////////////////////////////////////




/////////////////////////////////////////////////////////////////////////////
//
//          P R O T O T Y P E S
//
/////////////////////////////////////////////////////////////////////////////

//Move to front
d3.selection.prototype.moveToFront = function() {
    return this.each(function() {
      this.parentNode.appendChild(this);
    });
};

/////////////////////////////////////////////////////////////////////////////
//
//          G L O B A L S
//
/////////////////////////////////////////////////////////////////////////////

var scaleFactor = 1;                                                        // initial scale factor
var translate = [0,0];                                                      // initial translation tuple
var nodeSize = 2;                                                           // base radius size for facilities
var strokeWidth = 0.5;                                                      // base stroke width for facilities
var fac = null;                                                             // selection global for facilities
var states = null;                                                          // selection global for states
var counties = null;                                                        // seletion global for counties
var stateRatios = {};                                                       // state ratios for coloring
var stateLines = null;                                                      // size variable for stateLines
var brushing = false;                                                       // is the user currently brushing (sentinel)
var selectingState = false;                                                 // is the user currently selecting a state (sentinel)
var selectedState = null;                                                   // selected state id
var toolContext = "select";                                                 // context of interaction (select, brush)
var total = null; resetTotal();                                             // create and initialize total
var width = window.innerWidth - 10,                                         // width and height values
    height = window.innerHeight - 15,
    height1 = height - 330;
var x_scale = d3.scale.linear().domain([0, width]).range([0, width]);       // X and Y scales for line chart
var y_scale = d3.scale.linear().domain([0, height1]).range([0, height1]);   //
var graph1, graph2;
var graphs = null;
var releasesLine = [];
var recoveryLine = [];
var treatmentLine = [];
var recyclingLine = [];
var currentComparison = null;                                               // Holds the current selection; can save or discard
var matchScales = false;                                                    // sentinel value for rescaling line graphs
releasesLine[0] = releasesLine[1] = recoveryLine[0] = recoveryLine[1] = treatmentLine[0] = treatmentLine[1] = recyclingLine[0] = recyclingLine[1] = null;

var currentGraphData1, currentGraphData2, currentGraphScale1;
currentGraphData1 = currentGraphData2 = copyTotal();
currentGraphScale1 = d3.scale.linear().range([150-25, 25]).domain([0,0]);

function comparison(name, type, data, collection) {
    this.title = name || "name";
    this.type = type || "type";
    this.data = data || [];
    this.collection = collection || [];
}

var showingGraphTwo = false;
var largerYScale = [0,0];
var graphScaleDomains = [[0,0], [0,0]];
var flagRedrawG2 = false;

var naicsTable = {
  "11": "Agriculture, Forestry, Fishing and Hunting",
  "21": "Mining",
  "22": "Utilities",
  "23": "Construction",
  "33": "Manufacturing",
  "42": "Wholesale Trade",
  "45": "Retail Trade",
  "49": "Transportation and Warehousing",
  "51": "Information",
  "53": "Real Estate Rental and Leasing",
  "54": "Professional, Scientific, and Technical Services",
  "55": "Management of Companies and Enterprises",
  "56": "Administrative, Waste Management, and Remediation",
  "61": "Educational Services",
  "62": "Health Care and Social Assistance",
  "71": "Arts, Entertainment, and Recreation",
  "81": "Other Services (Except Public Administration)",
  "92": "Public Administration",
  "-1": "None Available"
}

var selectedStates = {                                                      // selected state ids (for multiple select)
    "array": [],
    // "numFacilities": 0,
  //  "ids": [],
    "remove": function (item){
        for(var i in this.array){
            if(this.array[i]==item){
                this.array.splice(i,1);
                break;
                }
        }
    },
    "add": function (item) {
        this.array.push(item);
        //this.ids.push(item.id)
    },
    "contains": function (item) {
        for(var i in this.array){
          if(this.array[i] == item)
            return true;
        }
        return false;
    },
    "empty": function () {
        return this.array.length == 0 ? true : false;
    },
    "clear": function () {
        this.array = [];
    }
};

var compareList = {
    "data": [],
    "add": function(comparison) {
        if(this.length < 10) {
            this.data[this.length] = comparison;
            this.length++;
            this.pos = ((this.length - 1) >= 0) ? this.length - 1 : 0;
        } else {
            this.length = 1;
            this.pos = 0;
            this.data[0] = comparison;
            this.length++;
        }
        updateList();
    },
    "reset": function() {
        this.data = [];
        this.length = 0;
        this.pos = 0;
        updateList();
    },
    "length": 0,
    "pos": 0
};

//compareQueue.enqueue({"data": total});
//console.log(compareQueue);
//compareStack.push(copyTotal());

// Zoom behavior
var zoom = d3.behavior.zoom()
    .scaleExtent([0.5,100])
    .x(x_scale)
    .y(y_scale)
    // .on("zoom", throttle(zoomHandler, 50))
    .on("zoom", zoomHandler)
    .on("zoomstart", zoomstart)
    .on("zoomend", debounce(zoomend, 2000))
    zoom.scale(1)
    zoom.translate(translate);

// Quadtree for facility mapping
var quadtree = d3.geom.quadtree()
    .extent([[-1, -1], [width + 1, height + 1]]) //###
    .x(function(d) {
        return d.x;
    })
    .y(function(d) {
        return d.y;
    });

// Color scale for facilities
var facilityColor = d3.scale.quantize()
    .range(colorbrewer.RdYlGn[9]);

var industryColor = d3.scale.category20().domain(0,19);

// Color scale for states
var stateColor = d3.scale.quantize()
    .range(colorbrewer.RdYlGn[9]);

// ALBERSUSA projection function
var projection = d3.geo.albersUsa()
    .scale(1100)
    .translate([width / 2, (height / 2) - 150]); //###

// Path global
var path = d3.geo.path()
    .projection(projection);





/////////////////////////////////////////////////////////////////////////////
//
//          T O O L T I P S
//
/////////////////////////////////////////////////////////////////////////////


var tooltip = d3.select('#tooltip')
     .attr('class', 'popupMessage')
     .style('opacity', 0);

function popupTooltip(message) {
    tooltip.text(message);
    tooltip.transition().delay(50).style('opacity', 0.9).duration(300).transition().delay(1500).style('opacity', 0.0).duration(750);
}

/////////////////////////////////////////////////////////////////////////////
//
//          O V E R L A Y   O P T I O N S
//
/////////////////////////////////////////////////////////////////////////////

overlayExplorationOptions = {
    "options": [
      {"name": "(release / usage)", "color": "black", "toggled": false, "stackable": false},
      {"name": "releases", "color": "red", "toggled": false, "stackable": true},
      {"name": "recycling", "color": "green", "toggled": false, "stackable": true},
      {"name": "treatment", "color": "purple", "toggled": false, "stackable": true},
      {"name": "recovery", "color": "blue", "toggled": false, "stackable": true},
      {"name": "(release - other 3)", "color": "darkgreen", "toggled": false, "stackable": false},
      {"name": "none", "color": "tan", "toggled": false, "stackable": false}
    ],
    "toggle": function(id) {
        for(option in this.options) {
          if(this.options[option].name == id) {
            if(this.options[option].stackable == false) {
              var tmp = this.options[option].toggled;
              this.unToggleAll();
              this.options[option].toggled = (tmp) ? false : true;
            } else {
              this.options[option].toggled = (this.options[option].toggled) ? false : true;
            }
          } else {
            if(!this.options[option].stackable)
              this.options[option].toggled = false;
          }
        }
        for(i in this.options) {
          d3.select("#overlayButton" + i).style("opacity", this.options[i].toggled ? 1 : 0.5);
        }
        // console.log(this.options);
    },
    "unToggleAll": function() {   //Sets 'toggled' attribute to 'false' for all options
        for(i in this.options) {
          this.options[i].toggled = false;
        }
    },
    "reverse": function() {     // returns whether the domain of the current option should be backward
        if(this.options[0].toggled || this.options[5].toggled)
          return true;
        else {
          return false;
        }

    }
}

d3.select("#explorationTools")
  .attr("showing", false)

// console.log(d3.select("#explorationTools").attr("showing") == "false")
var explorationTools = d3.select("#explorationTools").insert("svg", "#explorationBackground")
      .classed("explorationSVG1", true)
      .attr("id", "overlayExplorationToolsSVG")

    .selectAll(".toggleButtons")
        .data(overlayExplorationOptions.options)
      .enter().append('svg:g')
        .classed("overlayOptionButton", true)
        .attr("id", function(d, i) { return "overlayButton" + i; })
        .on("click", function(d, i) {
          return overlayButtonClick(d, i);
        });

  d3.select("#overlayExplorationToolsSVG")
      .append("text")
      .attr("y", 15)
      .attr("x", 35)
      .text("State Overlay Options");

var explorationToolIcons = explorationTools
      .append('rect')
      .attr("x", 25)
      .attr("y", 75)
      .attr("rx", 2)
      .attr("ry", 2)
      .attr("width", 0)
      .attr("height", 0)
      .style("fill", function(d, i) {
          if(d.color)
            return d.color;
          else
            return "black";
      });


var explorationToolText = explorationTools
    .append("text")
        //.attr("class", "y label")
        //.attr("text-anchor", "end")

        .attr("x", 20)
        .attr("y", function(d, i) {
          return 53 + i * 22;
        })

        .text("");

d3.select("#explorationToggle")
  .on("mouseover", function() {
      d3.select(this).transition().duration(150)
          .style("background-color", "white");
      return;
  })
  .on("mouseout", function() {
      d3.select(this).transition().duration(150)
          .style("background-color", "grey");
      return;
  })
  .on("click", function() {
    toggleExplorationTab();
  })
  .on("dblclick", function() {
      d3.event.preventDefault(); return;
  });

var x = d3.scale.linear()
  .range([10, 180]);
var brush1, brush2;
brush1 = brush2 = null;

var arc = d3.svg.arc()
  .outerRadius(15 / 2)
  .startAngle(0)
  .endAngle(function(d, i) { return i ? -Math.PI : Math.PI; });

d3.select("#explorationTools").insert("svg", "#explorationBackground")
      .classed("explorationSVG2", true)
      .attr("id", "explorationSVG2");

d3.select("#auxiliaryInfoTab").insert("svg", "#explorationBackground")
      .classed("auxiliaryInfoSVG", true)
      .attr("id", "auxiliaryInfoSVG1");

function overlayButtonClick(d, i) {

      // Toggle respective overlayExplorationOptionButton on or off
      overlayExplorationOptions.toggle(d.name);
      // d3.select("#overlayButton" + i).style("opacity", overlayExplorationOptions.options[i].toggled ? 1 : 0.5);
      var domain = generateStateColors();

      if(domain) {
        if(domain.length == 0) {
          d3.select("#explorationSVG2").selectAll("*").remove();
          return;
        }

        d3.select("#explorationSVG2").selectAll("*").remove();

        var thisSVG = d3.select("#explorationSVG2");

        x.domain(d3.extent(domain));

        brush1 = d3.svg.brush()
          .x(x)
          .extent([d3.min(domain), d3.max(domain)])
          // .on("brushstart", tmpstart)
          .on("brush", exploreBrush)
          .on("brushend", exploreBrushEnd);


        thisSVG.append("g")
          .attr("transform", "translate(0," + 15 + ")")
          .attr("class", "x axis")
          .call(d3.svg.axis().scale(x).ticks(3).tickSize(10).orient("bottom"))
          .selectAll("text")
            .attr("transform", function(d) {
              return "rotate(15)";
            });
          // .tickFormat(d3.format("d"));

        var brushg = thisSVG.append("g")
          .attr("class", "brush")
          .call(brush1);

        brushg.selectAll(".resize").append("path")
          .attr("transform", "translate(0," +  15 + ")")
          .attr("d", arc);

        brushg.selectAll("rect")
          .attr("height", 20)
          .attr("transform", "translate(0," +  5 + ")");

        brushColorOverlay(domain);

        d3.select("#auxiliaryInfoTab")
          .style("height", "200px")
          .style("width", "200px")
          .style("left", "80%");

        d3.select("#auxiliaryInfoTab").transition().duration(500).delay(100)
            .style("opacity", 1)
            .style("pointer-events", "all");


      } else {
          d3.select("#explorationSVG2").selectAll("*").remove();
          d3.select("#auxiliaryInfoTab").transition().duration(500).delay(100)
              .style("opacity", 0)
              .style("pointer-events", "none");
      }
}

function brushColorOverlay(domain) {
  // d3.select("#auxiliaryInfoTab").transition().duration(500).delay(500)
  //     .style("opacity", 1)
  //     .style("pointer-events", "all");

  d3.select("#colorOverlayG").remove();

  d3.select("#auxiliaryInfoSVG1").selectAll("*").remove();

  var auxSVG = d3.select("#auxiliaryInfoSVG1");

  var upper = d3.max(domain),
    lower = d3.min(domain),
    difference = x(upper)-x(lower),
    step = difference/9,
    keyStep = (upper - lower)/9;

    var scaleLocations = d3.range(x(lower), x(upper), step);
    var keyLocations = d3.range(lower, upper, keyStep);

    if(scaleLocations.length > 9)
      scaleLocations = scaleLocations.slice(0, 9);
    if(keyLocations.length > 9)
      keyLocations = keyLocations.slice(0, 9);

    var myColor = d3.scale.quantize()
        .range(stateColor.range());

    if(overlayExplorationOptions.reverse())
        myColor.domain([8, 0]);
    else
        myColor.domain([0, 8]);

    //bind this scale to g of rectangles over brush
    var thisG = d3.select("#explorationSVG2").append("g")
          .attr("id", "colorOverlayG");
    thisG.selectAll(".brushColorOverlay")
        .data(scaleLocations)
      .enter().append("rect")
        .attr("opacity", 0.8)
        .attr("stroke", "lightgrey")
        .attr("y", 0)
        .attr("height", 10)
        .attr("width", step)
        .attr("x", function(d,i) {

          return x(lower) + i * step;
        })
        .style("fill", function(d,i) {
          return myColor(i);
        });

    thisG.append("rect")
      .attr("opacity", 0.8)
      .attr("stroke", "lightgrey")
      .attr("y", 0)
      .attr("height", 10)
      .attr("width", function() {
          return x(lower) - 10;
      })
      .attr("x", 10)
      .style("fill", myColor(0));

    thisG.append("rect")
      .attr("opacity", 0.8)
      .attr("stroke", "lightgrey")
      .attr("y", 0)
      .attr("height", 10)
      .attr("width", function() {
          return 180 - x(upper);
      })
      .attr("x", x(upper))
      .style("fill", myColor(9));

    //bind the scaled color range to auxiliary info tab
    var keysG = auxSVG.selectAll(".brushColorKey")
            .data(keyLocations)
        .enter().append("g")
            .attr("id", "brushColorKeyG");

    keysG.append("rect")
      .attr("opacity", 1)
      .attr("stroke", "lightgrey")
      .attr("height", 15)
      .attr("width", 15)
      .attr("x", 10)
      .attr("y", function(d,i) {
        return 10 + i * 18;
      })
      .attr("fill", function(d, i) {
        return myColor(i);
      });

    var keyFormat = null;
    if(upper <= 1 && lower >= 0)
      keyFormat = d3.format(".3n");
    else
      keyFormat = d3.format(",.4r");

    keysG.append("text")
        .attr("x", 35)
        .attr("y", function(d, i) {
          return 22 + i * 18;
        })
        .text(function(d, i) {
          if(i == 0)
            return "<  " + keyFormat(d + keyStep);
          if(i == 8)
            return ">  " + keyFormat(d);
          else {
            return keyFormat(d) + " - " + keyFormat(d + keyStep);
          }
        });
}

function toggleAuxilliaryTab(arg) {

  if(arg || d3.select("#auxiliaryInfoTab").style("opacity") == 0) {
    d3.select("#auxiliaryInfoTab").transition("fade_in").duration(500).delay(100)
        .style("opacity", 1)
        .style("pointer-events", "all");
  } else {
    d3.select("#auxiliaryInfoTab").transition("fade_out").duration(500).delay(100)
        .style("opacity", 0)
        .style("pointer-events", "none");
  }


  // d3.select("#auxiliaryInfoSVG1").selectAll("*").remove();
  // var auxSVG = d3.select("#auxiliaryInfoSVG1");
}

function exploreBrush() {
    brushColorOverlay(brush1.extent());
    generateStateColors(brush1.extent());
}

function exploreBrushEnd() {
    // console.log(brush1.extent());
    brushColorOverlay(brush1.extent());
    generateStateColors(brush1.extent());
}


// Toggles the exploration tab on the left-hand side
function toggleExplorationTab() {

  if(d3.select("#explorationTools").attr("showing") == "false") {  // Transition in
    // d3.select("#auxiliaryInfoTab").transition().duration(500).delay(250)
    //     .style("opacity", 1)
    //     .style("pointer-events", "all");
    transitioning = true;
    // d3.select("#explorationToggle").style("pointer-events", "none");

    d3.select("#explorationTools")
        .style("left", "45px")
        .style("top", "225px")
        .style("height", "5px")
        .transition("fadeIn").duration(100)
        .style("width", 200 + "px")
        .transition("fadeIn").duration(250)
        .style("top", "50px")
        .style("height", 350 + "px")
        .style("border", "solid 3px darkgrey")
        .attr("showing", true);

    // d3.select("#explorationToggle").transition().delay(300).style("pointer-events", "all");

    explorationToolIcons
        .transition("fadeIn").duration(500).delay(500)
        .attr("width", 20)
        .attr("height", 20)
        .attr("y", function(d,i) { return 40 + i * 22; });

    explorationToolText
        .transition("fadeIn").duration(500).delay(500)
        .attr("x", 55)
        .attr("y", function(d,i) { return 53 + i * 22; })
        .text(function(d, i) {
          return d.name;
        })
        .attr("opacity", 1);

        setTimeout(function () {
          transitioning = false;
        }, 500);

    } else {  // Transition out
      d3.select("#auxiliaryInfoTab").transition().duration(500).delay(250)
          .style("opacity", 0)
          .style("pointer-events", "none");
      transitioning = true;

      // d3.select("#explorationToggle").style("pointer-events", "none");

      d3.select("#explorationTools")//.select("svg")
          .transition("fadeOut").duration(250)
          .style("height", "5px")
          .style("top", "225px")
          .transition("fadeOut").duration(100)
          .style("width", "0px")
          .style("border", "solid 0px darkgrey")
          .attr("showing", false);

      // d3.select("#explorationToggle").transition().delay(300).style("pointer-events", "all");

      explorationToolIcons
          //.transition().duration(500)
          .attr("width", 0)
          .attr("height", 0)
          .attr("y", 75)
          .attr("x", 25);

      explorationToolText
          //.transition().duration(500)
          .attr("x", 25)
          .attr("opacity", 0)

        setTimeout(function () {
          transitioning = false;
        }, 500);
    }
}



/////////////////////////////////////////////////////////////////////////////
//
//          L A Y E R S
//
/////////////////////////////////////////////////////////////////////////////

// Parent SVG element
var svg = d3.select("#map")
    .attr("class", "map")
    .attr("width", width)
    .attr("height", height1)
    .call(zoom).on("dblclick.zoom", null);

// MAP layer
var usaLayer = svg.append("g")
    .style("stroke-width", "1.5px");

// quadtree Layer
var quadTreeLayer = svg.append("g")
    .style("stroke-width", "1.5px");

// facility Layer
var facilityLayer = svg.append("g")
    .style("stroke-width", "1.5px");

// Background rectangle
var backgroundRect = quadTreeLayer.append("rect")
    .attr("class", "background")
    .attr("width", width)
    .attr("height", height)
    // .on("mousedown", function() {
    //   d3.event.stopPropagation();
    // })
    .on("click", clickedBackground);


function clickedBackground() {
  //  console.log("clickedBackground");
    resetTotal();
    lineGraph(total);
    clearFacilities();
    clearState();
    currentComparison = null;
    largerYScale = [0,0];

    fac.classed("clickThrough", false);
    states.classed("highlight", false)
      .attr("stroke-width", strokeWidth);

    d3.select("#auxiliaryInfoTab").style("opacity", 0);
    d3.select("#pieChart_Graph1").selectAll("*").remove();
    d3.select("#pieChart_Graph2").selectAll("*").remove();

    if(graphs) {
      graphs.graphBrush.clear();
      d3.selectAll("#graphBrush1").call(graphs.graphBrush);
    }

    if(showingGraphTwo) {
      hideGraph();
      showingGraphTwo = false;
    } else {
      hideGraph(1);
      d3.select("#key").style("opacity", 0);
      d3.select("#graphLine")
          .classed("hidden", true);
    }
};

function reorderLayers() {
    console.log("reorder layers");
    //backgroundLayer.moveToFront();
    usaLayer.moveToFront();
    quadTreeLayer.moveToFront();
    facilityLayer.moveToFront();
    brushLayer.moveToFront();
}
//
// function scaleTranslateLayers(scale, trans) {
//      usaLayer.transition()
//      .duration(150)
//      .style("stroke-width", 1.5 / scale + "px")
//      .attr("transform", "translate(" + trans + ")scale(" + scale + ")");
//    quadTreeLayer.transition()
//      .duration(750)
//      .style("stroke-width", 1.5 / scale + "px")
//      .attr("transform", "translate(" + trans + ")scale(" + scale + ")");
//    brushLayer.transition()
//      .duration(750)
//      .style("stroke-width", 1.5 / scale + "px")
//      .attr("transform", "translate(" + trans + ")scale(" + scale + ")");
//    facilityLayer.transition()
//        .duration(750)
//        .style("stroke-width", 1.5 / scale + "px")
//        .attr("transform", "translate(" + trans + ")scale(" + scale + ")");
// }



/////////////////////////////////////////////////////////////////////////////
//
//          Z O O M   E V E N T S
//
/////////////////////////////////////////////////////////////////////////////

function zoomstart() {
     currentComparison = null;
     fac.on("mouseover", null);
    // counties.attr("display", "none");
    fac.attr("display", "none");
}

function zoomHandler() {
  //  fac.attr("display", "none");

    if(d3.event) {
      translate = d3.event.translate;
      scaleFactor = d3.event.scale;
    }

    stateLines.attr("stroke-width", (strokeWidth*2)/scaleFactor);
    states.attr("stroke-width", function(d) {
      return (strokeWidth*2)/scaleFactor;
      //TODO: scale this depending on whether a state is highlighted
    });

    // usaLayer.attr("transform", "translate(" + translate + ")scale(" + scaleFactor + ")");
    usaLayer.attr("transform", "translate(" + translate + ")scale(" + scaleFactor + ")");
}

function zoomend() {
  console.log("zoomend");
  //   clearBrush();
  // //  quadTreeLayer.attr("transform", "translate(" + translate + ")scale(" + scaleFactor + ")");
  //   facilityLayer.attr("transform", "translate(" + translate + ")scale(" + scaleFactor + ")");
  //   fac.attr("r", nodeSize/scaleFactor );
  //   fac.attr("stroke-width", strokeWidth/scaleFactor);
  //   stateLines.attr("stroke-width", (strokeWidth*2)/scaleFactor);
  //   states.attr("stroke-width", function(d) {
  //     return (strokeWidth*2)/scaleFactor;
  //     //TODO: scale this depending on whether a state is highlighted
  //   });
  //
  //   // Worth only updating facilityLayer for performance?
  //   //facilityLayer.attr("transform", "translate(" + translate + ")scale(" + scaleFactor + ")");
  //   fac.attr("display", "block");
  //   fac.on("mouseover", hover);
    //counties.attr("display", "inline");

    clearBrush();
    // stateLines.attr("stroke-width", (strokeWidth*2)/scaleFactor);
    // states.attr("stroke-width", function(d) {
    //   return (strokeWidth*2)/scaleFactor;
    //   //TODO: scale this depending on whether a state is highlighted
    // });

    displayFacilities();

    if(toolContext == ("brush") && (!event || !event.shiftKey)) {
        clearEffects();
        currentComparison = null;
        brushLayer.moveToFront();
        d3.selectAll(".brush").call(brush.clear());
        d3.select(".brush")
            .style("display", "block");
        toolContext = "brush";
    }
}



/////////////////////////////////////////////////////////////////////////////
//
//          U S A
//
/////////////////////////////////////////////////////////////////////////////

///TRI/project2/data/us.json
d3.json("data/us.json", function(error, us) {
  states = usaLayer.selectAll("path")
      .data(topojson.feature(us, us.objects.states).features)
    .enter().append("path")
      .attr("d", path)
      .attr("class", "feature")
      .on("mousedown", function() {
        d3.event.stopPropagation();
      })
      .on("click", function(d) {
        if (d3.event.defaultPrevented) return;
        clickedState(d);
      });
//        .on("dblclick", dblClickedState);

    //Counties
    // counties = usaLayer.insert("path", ".graticule")
    //      .datum(topojson.mesh(us, us.objects.counties, function(a, b) { return a !== b && !(a.id / 1000 ^ b.id / 1000); }))
    //      .attr("class", "countyMesh")
    //      .attr("d", path);

    stateLines = usaLayer.append("path")
      .datum(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; }))
      .attr("class", "stateMesh")
      .attr("d", path)
      .attr("stroke-width", strokeWidth*2);

});

function generateStateColors(fixedDomain) {

  var numToggled = 0;
  var toggledIndex = null;
  var stateDomain = null;
  var bounds = (fixedDomain) ? fixedDomain : [-Infinity,Infinity];
  for(option in overlayExplorationOptions.options) {
    if(overlayExplorationOptions.options[option].toggled) {
      numToggled++;
      toggledIndex = option;
    }
  }

  if(numToggled == 0) { // none toggled
    states.style("fill", function(d) {
        if (stateRatios[d.id])
          return "tan";
    });
  } else if(numToggled == 1) { // only one toggled? easy choice, allows us to easily assign color scale to each case
    singleAttribute(toggledIndex);
    //multiAttribute();
  } else {  // more than one toggled
    multiAttribute();
  }

  function multiAttribute() {
    stateDomain = [];
    var tmp = [];
    var on = {};

    //determine which attributes are toggled on
    for(opt in overlayExplorationOptions.options) {
      // if(overlayExplorationOptions.options[opt].stackable)    // values with the potential to trigger multiAttribute
      on[opt] = overlayExplorationOptions.options[opt].toggled;
    }

    //accumulate values for all toggled attributes
    for(state in stateRatios) {
      stateRatios[state].comparison = 0;

      if(on[1]) // releases
        stateRatios[state].comparison += stateRatios[state].totalRelease;
      if(on[2]) // recycling
        stateRatios[state].comparison += stateRatios[state].totalRecycling;
      if(on[3]) // treatment
        stateRatios[state].comparison += stateRatios[state].totalTreatment;
      if(on[4]) // recovery
        stateRatios[state].comparison += stateRatios[state].totalRecovery;

      stateDomain.push(stateRatios[state].comparison);
    }

    var stateDomainMin = 0;
    var stateDomainMax = 0;
    var stateDomainMedian = 0;

    for (value in stateDomain) {
      if(stateDomain[value] < bounds[0])
        stateDomain[value] = bounds[0];
      else if(stateDomain[value] > bounds[1])
        stateDomain[value] = bounds[1];
    }

    stateDomainMin = d3.min(stateDomain);
    stateDomainMax = d3.max(stateDomain);
    stateDomainMean = d3.median(stateDomain);

    //set up color scale
    stateColor.range(colorbrewer.Greys[9]);
    stateColor.domain([stateDomainMin, stateDomainMax]);
    applyStateColors();

    //TODO:
  }

  function singleAttribute(arg) {

    arg = parseInt(arg);
    stateDomain = [];
    var tmp = [];

    for(state in stateRatios) {
        //calculate comparison value based on criteria
        switch(arg) {
          case "ratio":
          case 0:   //Pure ratio: releases / total;
            // if(stateRatios[state].ratio >= )
            stateRatios[state].comparison = stateRatios[state].ratio;
            stateDomain.push(stateRatios[state].comparison);
            break;
          case "releases":
          case 1:   // Release value
            stateRatios[state].comparison = stateRatios[state].totalRelease;// / stateRatios[state].numFacilities;
            stateDomain.push(stateRatios[state].comparison);
            break;
          case "recycling":
          case 2:   // Recycling value
            stateRatios[state].comparison = stateRatios[state].totalRecycling;// / stateRatios[state].numFacilities;
            stateDomain.push(stateRatios[state].comparison);
            break;
          case "treatment":
          case 3:   // Treatment value
            stateRatios[state].comparison = stateRatios[state].totalTreatment;// / stateRatios[state].numFacilities;
            stateDomain.push(stateRatios[state].comparison);
            break;
          case "recovery":
          case 4:   // Recycling value
            stateRatios[state].comparison = stateRatios[state].totalRecovery;// / stateRatios[state].numFacilities;
            stateDomain.push(stateRatios[state].comparison);
            break;
          case 5:   // Recycling value
            stateRatios[state].comparison = stateRatios[state].totalRecovery - (stateRatios[state].totalRecycling + stateRatios[state].totalTreatment + stateRatios[state].totalRecovery);// / stateRatios[state].numFacilities;
            stateDomain.push(stateRatios[state].comparison);
            break;
        }

          tmp.push([state, stateRatios[state].comparison]);
          //tmp.push(stateRatios[state].numFacilities);
      }

    var colorDomainMax = 0;
    var colorDomainMin = 0;
    var stateDomainMin = 0;
    var stateDomainMax = 0;
    var stateDomainMedian = 0;

    for (value in stateDomain) {
      if(stateDomain[value] < bounds[0])
        stateDomain[value] = bounds[0];
      else if(stateDomain[value] > bounds[1])
        stateDomain[value] = bounds[1];
    }

    stateDomainMin = d3.min(stateDomain);
    stateDomainMax = d3.max(stateDomain);
    stateDomainMean = d3.median(stateDomain);

    switch(arg) {
      case "ratio":
      case 0:     //Pure ratio: releases / total;
        stateColor.range(colorbrewer.RdYlGn[9]);
        stateColor.domain([stateDomainMax, stateDomainMean, stateDomainMin]);
        applyStateColors();
        break;
      case "releases":
      case 1:   // Release value
        stateColor.range(colorbrewer.Reds[9]);
        stateColor.domain([stateDomainMin, stateDomainMax]);
        applyStateColors();
        break;
      case "recycling":
      case 2:   // Recycling value
        stateColor.range(colorbrewer.Greens[9]);
        stateColor.domain([stateDomainMin, stateDomainMax]);
        applyStateColors();
        break;
      case "treatment":
      case 3:   // Treatment value
        stateColor.range(colorbrewer.Purples[9]);
        stateColor.domain([stateDomainMin, stateDomainMax]);
        applyStateColors();
        break;
      case "recovery":
      case 4:   // Recycling value
        stateColor.range(colorbrewer.Blues[9]);
        stateColor.domain([stateDomainMin, stateDomainMax]);
        applyStateColors();
        break;
      case 5:   // Difference between release and all the rest
        stateColor.range(colorbrewer.BuPu[9]);
        stateColor.domain([stateDomainMax, stateDomainMean, stateDomainMin]);
        applyStateColors();
        break;
      case "none":
      case 6:   // Reset state color
        applyStateColors(1);
        break;
    }

    // Sort array of states based on ratio (to determine outliers)
    tmp.sort(function(a,b) {
      if(a.comparison && b.comparison) {
          return a.comparison - b.comparison;
      }
    });

        // .attr("transform", "translate(0," +  5 + ")");
    }
    return stateDomain;
  }

// Color all states based on their 'comparison' variable
function applyStateColors(arg) {
  if(!arg) {
    states.style("fill", function(d) {
        if (stateRatios[d.id])
          return stateColor(stateRatios[d.id].comparison);
        else {
          return "tan";
        }
    });
  } else {
    states.style("fill", null);
  }
}


function clickedState(d) {

    showGraph(1);
    if(event.shiftKey)
      addState(d);
    else
      highlightState(d);


    // SCALE TO BOUNDING BOX?
    //  var bounds = path.bounds(d),
    //   dx = bounds[1][0] - bounds[0][0],
    //   dy = bounds[1][1] - bounds[0][1],
    //   x = (bounds[0][0] + bounds[1][0]) / 2,
    //   y = (bounds[0][1] + bounds[1][1]) / 2,
    //   scale = .9 / Math.max(dx / width, dy / height),
    //   trans = [width / 2 - scale * x, height / 2 - scale * y];
     //
    //   // console.log(scaleFactor, translate);////
    //   scaleTranslateLayers(scale, trans);
}

//function dblClickedState(d) {
//    console.log("dblclick");
//}

function highlightState(d) {
    var thisState = d.id;

    selectedStates.clear();

    if(thisState == selectedState) {
        selectingState = false;
        fac.classed("clickThrough", false);
        resetTotal();
        states.classed("fade", false);
        states.classed("highlight", false)
          .attr("stroke-width", strokeWidth);
        fac.classed("fade", function(d) { d.state == thisState ? false : true; });
        fac.classed("selected", function(d) { d.state == thisState ?  true : false; });
        fac.each(function(d, i) { if(d.state == thisState) {removeFacilityFromTotal(d, i); } });
        //lineGraph(total);
        if(showingGraphTwo) {
          clearGraph(1);
          updateComparison();
        } else {
          //hideGraph(1);
          //clearGraph(1);

          lineGraph(getBlankDataArrays());
        }

        selectedState = null;
        selectedStates.remove(thisState);
        currentComparison = null;
        // console.log(selectedStates.array);

        //TODO: remove aux tab (maybe)
        toggleAuxilliaryTab();

    } else {
        selectingState = true;
        fac.classed("clickThrough", true);
        resetTotal();
        if(showingGraphTwo && flagRedrawG2) {
          // console.log("REDRAWING G2");
          var domainG1 =
          [
              Math.min(d3.min(total.releases), d3.min(total.recycling), d3.min(total.recovery), d3.min(total.treatment)),
              Math.max(d3.max(total.releases), d3.max(total.recycling), d3.max(total.recovery), d3.max(total.treatment))
          ];

          var tmp = compareList.data[compareList.pos].data;
          var domainG2 =
          [
              Math.min(d3.min(tmp.releases), d3.min(tmp.recycling), d3.min(tmp.recovery), d3.min(tmp.treatment)),
              Math.max(d3.max(tmp.releases), d3.max(tmp.recycling), d3.max(tmp.recovery), d3.max(tmp.treatment))
          ];

          if(domainG1[1] > domainG2[1]) {
            largerYScale = domainG1;
            resizeGraph(domainG1, 1);
            resizeGraph(domainG1, 2);
          } else {
            largerYScale = domainG2;
            resizeGraph(domainG2, 1);
            resizeGraph(domainG2, 2);
          }

        } else {
          var domainG1 =
          [
              Math.min(d3.min(total.releases), d3.min(total.recycling), d3.min(total.recovery), d3.min(total.treatment)),
              Math.max(d3.max(total.releases), d3.max(total.recycling), d3.max(total.recovery), d3.max(total.treatment))
          ];
          if(domainG1[1] > largerYScale[1]) {
            largerYScale = domainG1;
            resizeGraph(domainG1, 1);
          }
        }

        selectedState = thisState;
        selectedStates.add(thisState)
        // console.log(selectedStates.array);

        //TODO: Update aux tab to contain state info, num states, pie chart!?
        // Corretly position the aux tab
        d3.select("#auxiliaryInfoTab")
          .style("height", "220px")
          .style("width", "200px")
          .style("left", "80%");

        toggleAuxilliaryTab(1);

        d3.select("#auxiliaryInfoSVG1").selectAll("*").remove();
        var auxSVG = d3.select("#auxiliaryInfoSVG1");

        auxSVG.append("text")
            .attr("y", 15)
            .attr("x", 10)
            .text("States selected: " + selectedStates.array.length);

        // console.log(stateRatios[selectedStates.array[0]]);
        var numFac = 0;
        for(state in selectedStates.array) {
            numFac += stateRatios[selectedStates.array[state]].numFacilities;
        }

        auxSVG.append("text")
            .attr("y", 30)
            .attr("x", 10)
            .text("Number of facilities: " + numFac);

        pieChart();

        ///////

        states.classed("fade", function(d) { return d.id != thisState;  });
        states.classed("highlight", function(d) { return d.id == thisState; })
          .attr("stroke-width", function(d) { return (d.id == thisState) ? (strokeWidth * 10)/scaleFactor : strokeWidth; });
        fac.classed("fade", function(d) { return d.state != thisState; });
        fac.classed("selected", function(d) { return d.state == thisState; });
        fac.each(function(d, i) { if(d.state == thisState) {addFacilityToTotal(d, i); } });

        //compareList.add(new comparison( thisState, "states", copyTotal(), selectedStates.array));
        //updateList();
        currentComparison = new comparison( thisState, "states", copyTotal(), selectedStates.array);

        lineGraph(total);
    }
}

function addState(d) {

  //console.log("adding state");
    var thisState = d.id;

    if(selectedStates.contains(thisState)) {   //UNTOGGLE

        //console.log("already selected: ", selectedStates.array);

        selectedStates.remove(thisState);
        //console.log("removing...", thisState, selectedStates.array);

        //Last value in selectedStates
        if(selectedStates.array.length <= 0) {
          selectingState = false;
          fac.classed("clickThrough", false);
          // console.log("LAST STATE, NO FADE");
          states.classed("fade", false);
          states.classed("highlight", false)
            .attr("stroke-width", strokeWidth);
          fac.classed("fade", false);
          fac.classed("selected", false);
          selectedState = null;
          resetTotal();
          if(showingGraphTwo) {
            //hideGraph();
            clearGraph(1);
            updateComparison();
          } else {
            //hideGraph(1);
            lineGraph(total, 1);
          }
          currentComparison = null;

          toggleAuxilliaryTab();

        // Still some selected states...
        } else {
          // console.log("STILL STATES..", selectedStates.array);
          states.classed("fade", function(d) { return !selectedStates.contains(d.id); });
          states.classed("highlight", function(d) { return selectedStates.contains(d.id); })
            .attr("stroke-width", function(d) { return selectedStates.contains(d.id) ? (strokeWidth * 10)/scaleFactor : strokeWidth; });
          fac.classed("fade", function(d) { return !selectedStates.contains(d.state); });
          fac.classed("selected", function(d) { return selectedStates.contains(d.state); });
          fac.each(function(d, i) { if(d.state == thisState) { removeFacilityFromTotal(d, i); } });

          if(showingGraphTwo && flagRedrawG2) {
            var domainG1 =
            [
                Math.min(d3.min(total.releases), d3.min(total.recycling), d3.min(total.recovery), d3.min(total.treatment)),
                Math.max(d3.max(total.releases), d3.max(total.recycling), d3.max(total.recovery), d3.max(total.treatment))
            ];

            var tmp = compareList.data[compareList.pos].data;
            var domainG2 =
            [
                Math.min(d3.min(tmp.releases), d3.min(tmp.recycling), d3.min(tmp.recovery), d3.min(tmp.treatment)),
                Math.max(d3.max(tmp.releases), d3.max(tmp.recycling), d3.max(tmp.recovery), d3.max(tmp.treatment))
            ];

            if(domainG1[1] > domainG2[1]) {

              largerYScale = domainG1;
              resizeGraph(domainG1, 1);
              resizeGraph(domainG1, 2);
            } else if(domainG1[1] <= domainG2[1]){
              largerYScale = domainG2;
              resizeGraph(domainG2, 1);
              resizeGraph(domainG2, 2);
            }
          } else {
            var domainG1 =
            [
                Math.min(d3.min(total.releases), d3.min(total.recycling), d3.min(total.recovery), d3.min(total.treatment)),
                Math.max(d3.max(total.releases), d3.max(total.recycling), d3.max(total.recovery), d3.max(total.treatment))
            ];
            if(domainG1[1] > largerYScale[1]) {
              largerYScale = domainG1;
              resizeGraph(domainG1, 1);
            }
          }

          d3.select("#auxiliaryInfoSVG1").selectAll("*").remove();
          var auxSVG = d3.select("#auxiliaryInfoSVG1");

          auxSVG.append("text")
              .attr("y", 15)
              .attr("x", 10)
              .text("States selected: " + selectedStates.array.length);

          // console.log(stateRatios[selectedStates.array[0]]);
          var numFac = 0;
          for(state in selectedStates.array) {
              numFac += stateRatios[selectedStates.array[state]].numFacilities;
          }

          auxSVG.append("text")
              .attr("y", 30)
              .attr("x", 10)
              .text("Number of facilities: " + numFac);

          pieChart();
          ///////



          // TODO: Set this up to show a list of the states in the selection?
          if(selectedStates.array.length == 1)
            currentComparison = new comparison( thisState, "states", copyTotal(), selectedStates.array);
          else
            currentComparison = new comparison( "multiple states", "states", copyTotal(), selectedStates.array);
          // compareList.add(new comparison( "multiple states", "states", copyTotal(), selectedStates.array));
          // updateList();
          lineGraph(total);
        }

    } else {  // TOGGLE STATE
        selectingState = true;
        fac.classed("clickThrough", true);
        selectedStates.add(thisState);
        // console.log("adding.. ", thisState, selectedStates.array);
        states.classed("highlight", function(d) { return selectedStates.contains(d.id); })
          .attr("stroke-width", function(d) { return selectedStates.contains(d.id) ? (strokeWidth * 10)/scaleFactor : strokeWidth; });
        states.classed("fade", function(d) { return !selectedStates.contains(d.id);  });
        fac.classed("fade", function(d) { return !selectedStates.contains(d.state); });
        fac.classed("selected", function(d) { return selectedStates.contains(d.state); });
        fac.each(function(d, i) { if(d.state == thisState) { addFacilityToTotal(d, i); } });

        //console.log("should be different; cgd1 not updated yet.", currentGraphData1.releases, total.releases);

        //Update aux tab to contain state info, num states, pie chart!?
        // Corretly position the aux tab
        d3.select("#auxiliaryInfoTab")
          .style("height", "220px")
          .style("width", "200px")
          .style("left", "80%");

        toggleAuxilliaryTab(1);

        d3.select("#auxiliaryInfoSVG1").selectAll("*").remove();
        var auxSVG = d3.select("#auxiliaryInfoSVG1");

        auxSVG.append("text")
            .attr("y", 15)
            .attr("x", 10)
            .text("States selected: " + selectedStates.array.length);

        // console.log(stateRatios[selectedStates.array[0]]);
        var numFac = 0;
        for(state in selectedStates.array) {
            numFac += stateRatios[selectedStates.array[state]].numFacilities;
        }

        auxSVG.append("text")
            .attr("y", 30)
            .attr("x", 10)
            .text("Number of facilities: " + numFac);

        pieChart();
        ///////




        if(selectedStates.array.length == 1)
          currentComparison = new comparison( thisState, "states", copyTotal(), selectedStates.array);
        else
          currentComparison = new comparison( "multiple states", "states", copyTotal(), selectedStates.array);
        // compareList.add(new comparison("multiple states", "states", copyTotal(), selectedStates.array));
        // updateList();

        lineGraph(total);
    }
}

function highlightStates(arr) {
    states.classed("fade", function(d) { if(arr.indexOf(d.id) >= 0) return false; else return true; });
    fac.classed("fade", function(d) { if(arr.indexOf(d.state) >= 0) return false; else return true; });
    fac.classed("selected", function(d) { if(arr.indexOf(d.state) >= 0) return true; else return false; });
}

function clearState() {
    selectedState = null;
    selectedStates.clear();
    selectingState = false;
    states.classed("fade", false);
    //console.log("clearing state");
    fac.classed("fade", function(d) { return false; });
}



/////////////////////////////////////////////////////////////////////////////
//
//          F A C I L I T I E S
//
/////////////////////////////////////////////////////////////////////////////



//var facilityLayer = svg.append("g")
//    .style("stroke-width", "1.5px");

d3.json("data/facilities.json", function(error, f) {
    if(error)
        console.log(error);

    stateRatios = {};

    var arr = [];
    var x, y, s;
    var domain = [];
    var flag = true;
    var totalRelease, totalTreatment, totalRecycling, totalRecovery, totals;

    var uniqueSIC = [];
    var uniqueNAICS = [];

    var naicsTable = {
      "11": 0,
      "21": 0,
      "22": 0,
      "23": 0,
      "31": 0,
      "32": 0,
      "33": 0,
      "42": 0,
      "45": 0,
      "49": 0,
      "51": 0,
      "53": 0,
      "54": 0,
      "55": 0,
      "56": 0,
      "61": 0,
      "62": 0,
      "71": 0,
      "72": 0,
      "81": 0,
      "92": 0,
      "-1": 0
    }


    for(facility in f.facilities) {
        if(projection([f.facilities[facility].long, f.facilities[facility].lat]) == null) {
            f.facilities[facility].x = f.facilities[facility].y = null;
        } else {
            f.facilities[facility].x = projection([f.facilities[facility].long, f.facilities[facility].lat])[0];
            f.facilities[facility].y = projection([f.facilities[facility].long, f.facilities[facility].lat])[1];

            totalRecovery = totalRecycling = totalTreatment = totals = totalRelease = 0;

            for(i = 0; i < 27; i++) {
                totalRelease += f.facilities[facility].releases[i];
                totalTreatment += f.facilities[facility].treatment[i];
                totalRecycling += f.facilities[facility].recycling[i];
                totalRecovery += f.facilities[facility].recovery[i];
            }
            totals += totalRelease + totalTreatment + totalRecycling + totalRecovery;

            //ADAPT THIS TO INTEGRATE VALUES FOR EACH STATE YEAR BY YEAR !!!!!!!

            // update state information
            s = f.facilities[facility].state;
            if(s) {   // state is already in the stateRatios object
              if(stateRatios.hasOwnProperty(s)) {
                stateRatios[s].totalRelease += totalRelease;
                stateRatios[s].totalTreatment += totalTreatment;
                stateRatios[s].totalRecycling += totalRecycling;
                stateRatios[s].totalRecovery += totalRecovery;
                for(i = 0; i < 27; i++) {
                    stateRatios[s].releases[i] += f.facilities[facility].releases[i];
                    stateRatios[s].treatment[i] += f.facilities[facility].treatment[i];
                    stateRatios[s].recycling[i] += f.facilities[facility].recycling[i];
                    stateRatios[s].recovery[i] += f.facilities[facility].recovery[i];
                }
                stateRatios[s].total += totals;
                stateRatios[s].numFacilities++;
                //stateRatios[s].ratio = (stateRatios[s].totalRelease / stateRatios[s].total) / stateRatios[s].numFacilities;
                stateRatios[s].ratio = (stateRatios[s].totalRelease / stateRatios[s].total);
                //stateRatios[s].ratio = stateRatios[s].totalRelease / (stateRatios[s].totalRecovery + totalTreatment + totalRecycling);

              } else {   // state is not yet in the stateRatios object
                stateRatios[s] = {
                  "totalRelease": totalRelease,
                  "releases": f.facilities[facility].releases,
                  "totalTreatment": totalTreatment,
                  "treatment": f.facilities[facility].treatment,
                  "totalRecycling": totalRecycling,
                  "recycling": f.facilities[facility].recycling,
                  "totalRecovery": totalRecovery,
                  "recovery": f.facilities[facility].recovery,
                  "total": totals,
                  "ratio": totalRelease / totals,
                  //"ratio": totalRelease / (totals - totalRelease),
                  "numFacilities": 1
                }
              }
            }

            if(totals > 0)
                totals = totalRelease / totals;

            f.facilities[facility].colorIndex = totals;
            domain.push(totals);
            arr.push(f.facilities[facility]);
        }

       //console.log(f.facilities[facility].SIC);
        // set industry sector identifier based on SIC and NAICS number
        var naics, sic = null;
        naics = String(f.facilities[facility].NAICS).substring(0,2);
        sic = f.facilities[facility].SIC;

        if(naics && naics >= 0) {

          if(naics == "72")
            naics = "71"; //!!!!
          if(naics == "45")
            naics = "44"; //!!!!
          if(naics == "61")
            naics = "62"; //!!!!
          if(naics == "31" || naics == "32")
            naics = "33";
          if(naics == "44")
            naics = "45";
          if(naics == "48")
            naics = "49";

          naicsTable[naics]++;

          f.facilities[facility].NAICS = naics;
        }

        if(sic && sic >= 0) {
          if(uniqueSIC.indexOf(sic) >= 0) {
            //update count
          } else {
            uniqueSIC.push(sic);
          }
        }
        //
    }

    //console.log(naicsTable)

    generateStateColors();
    // Set up colors for facilities
    facilityColor.domain([d3.max(domain), d3.mean(domain), d3.min(domain)]);
    // facilityColor["_domain"] = facilityColor.domain();
    // console.log(facilityColor._domain);
    quadtree = quadtree(arr);

    quadTreeLayer = usaLayer.selectAll(".node")
    // quadTreeLayer.selectAll(".node")
        .data(nodes(quadtree))
      .enter().append("rect")
        .attr("class", "node")
        .attr("x", function(d) { return d.x; })
        .attr("y", function(d) { return d.y; })
        .attr("width", function(d) { return d.width; })
        .attr("height", function(d) { return d.height; })
        .attr("pointer-events", "none");

//    facilityLayer = quadTreeLayer.selectAll(".facility")
    fac = facilityLayer.selectAll(".facility")
        .data(arr)
      .enter().append("circle")
        .attr("class", "facility")
        .attr("fill", function(d, i) { return facilityColor(d.colorIndex); })
        .attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; })
        .attr("r", nodeSize)
        .attr("stroke-width", strokeWidth)
        .attr("id", function(d, i) {return "f" + i;})
        //.each(function(d) { d.id = "f" + d.facilityName; })
        .each(function(d, i) { d.id = "f" + i; })
        .on("mouseover", hover)
        .on("mouseout", out)
        .on("click", facilityClick)
        /// not visible at first
        .attr("display", "none")
        ///
        .call(zoom);

});

// Collapse the quadtree into an array of rectangles.
function nodes(quadtree) {
  var nodes = [];
  quadtree.visit(function(node, x1, y1, x2, y2) {
    nodes.push({x: x1, y: y1, width: x2 - x1, height: y2 - y1});
  });
  return nodes;
}

// Find the nodes within the specified rectangle.
function search(quadtree, x0, y0, x3, y3) {
  quadtree.visit(function(node, x1, y1, x2, y2) {
    var p = node.point;
    if (p) {
      p.scanned = true;
      p.selected = (p.x >= x0) && (p.x < x3) && (p.y >= y0) && (p.y < y3);
    }
    return x1 >= x3 || y1 >= y3 || x2 < x0 || y2 < y0;
  });
}

function facilityClick(d) {
    console.log(d);
    d3.event.stopPropagation;
}

function hover(d) {
    if(brushing || selectedState || !selectedStates.empty())
        return;

    showGraph(1);

    //Update position of dataView div
    var dataDiv = d3.select("#dataView")
        .style("left", function() {
            if(d3.event.pageX >= width/2)
                return d3.event.pageX-350 + "px";
            else
                return d3.event.pageX+50 + "px";
        })
        .style("top", d3.event.pageY - 25 + "px");

   //Style the selected facility
    d3.select(this)
        .classed("brushed", true);

    //Create line graph
    resetTotal();
    addFacilityToTotal(d,0);

    // compareList.add(new comparison(d.facilityName, "facility", copyTotal(), d.id));
    // updateList();

    currentComparison = new comparison( d.facilityName, "facility", copyTotal(), d.id);
    lineGraph(total);
    //Show data div
    showData(dataDiv, d);

    if(showingGraphTwo && flagRedrawG2) {
      // console.log("REDRAWING G2");
      var domainG1 =
      [
          Math.min(d3.min(total.releases), d3.min(total.recycling), d3.min(total.recovery), d3.min(total.treatment)),
          Math.max(d3.max(total.releases), d3.max(total.recycling), d3.max(total.recovery), d3.max(total.treatment))
      ];

      var tmp = compareList.data[compareList.pos].data;
      var domainG2 =
      [
          Math.min(d3.min(tmp.releases), d3.min(tmp.recycling), d3.min(tmp.recovery), d3.min(tmp.treatment)),
          Math.max(d3.max(tmp.releases), d3.max(tmp.recycling), d3.max(tmp.recovery), d3.max(tmp.treatment))
      ];

      if(domainG1[1] > domainG2[1]) {
        largerYScale = domainG1;
        resizeGraph(domainG1, 1);
        resizeGraph(domainG1, 2);
      } else {
        largerYScale = domainG2;
        resizeGraph(domainG2, 1);
        resizeGraph(domainG2, 2);
      }

    }
}

function out() {
    if(selectedState || !selectedStates.empty())
        return;

    d3.select(this)
        .classed("brushed", false);

    showData(null, null);

    //currentComparison = null;
}

function showData(facility, d) {
    var dataView = d3.select("#dataView");
    if(facility == null) {
        dataView.style("opacity", "0");
        //dataView.text("");
    } else {
        dataView.style("opacity", ".95");
        var info = "";
        //console.log(facility, d);
        info += "Facility Name: " + d.facilityName + "<br />";
        info += "NAICS Code: " + naicsTable[d.NAICS] + "<br />";
        //info += "test: " + d.colorIndex + "<br />";
        dataView.html(info);
    }
}

function clearFacilities() {
    fac.each(function(d) { d.scanned = d.selected = false; });
    fac.classed("brushed", function(d) { return d.selected; } );
    fac.classed("selected", false);
    fac.classed("fade", false );

    //hideGraph();
}

// Toggle facility color overlay
function colorFacilities(arg) {
    toggleAuxilliaryTab(1);

    d3.select("#auxiliaryInfoSVG1").selectAll("*").remove();
    var auxSVG = d3.select("#auxiliaryInfoSVG1");

    var industryLookup = ["11", "21", "22", "23", "33", "42", "45", "49", "51", "53", "54", "55", "56", "62", "71", "81", "92", "-1"];
    var tmpData = null;
    switch(arg) {
        case 0:
          break;
        case 1:

          // Corretly position the aux tab
          d3.select("#auxiliaryInfoTab")
            .style("height", "180px")
            .style("width", "80px")
            .style("left", "90%")
            .style("top", "10%");

          facilityColor = d3.scale.quantize().range(colorbrewer.RdYlGn[9]).domain([1,0]);
          tmpData = facilityColor.range();
          fac.attr("fill", function(d, i) { return facilityColor(d.colorIndex); })
          break;
        case 2:

          // Corretly position the aux tab
          d3.select("#auxiliaryInfoTab")
            .style("height", "340px")
            .style("width", "285px")
            .style("left", "70%")
            .style("top", "5%");

          //facilityColor = d3.scale.category20();
          tmpData = industryColor.range().slice(0, industryLookup.length);
          fac.attr("fill", function(d, i) {
              //return facilityColor(industryLookup.indexOf(d.NAICS));
              return industryColor(industryLookup.indexOf(d.NAICS));
              //return facilityColor();
          })
          break;
    }

    //bind the facility color scale to auxiliary info tab
    var facColorScale = auxSVG.selectAll(".facColorGroup")
            // .data(facilityColor.range().slice(0, industryLookup.length))
            .data(tmpData)
        .enter().append("g")
            .attr("id", "facilityColorGroup");

    facColorScale.append("rect")
      .attr("opacity", 1)
      .attr("stroke", "lightgrey")
      .attr("height", 15)
      .attr("width", 15)
      .attr("x", 10)
      .attr("y", function(d,i) {
        return 10 + i * 18;
      })
      .attr("fill", function(d, i) {
        if(arg == 1) return facilityColor.range()[i];
        if(arg == 2) return industryColor(i);
      });

    facColorScale.append("text")
        .attr("x", 35)
        .attr("y", function(d, i) {
          return 22 + i * 18;
        })
        .text(function(d, i) {
            if(arg == 2)
              return naicsTable[industryLookup[i]];
            else {
              //console.log(i * 1/9);
              return d3.format(".2n")(1 - (i * 1/9));
            }
        });

}

function displayFacilities() {
  facilityLayer.attr("transform", "translate(" + translate + ")scale(" + scaleFactor + ")");
  fac.attr("r", nodeSize/scaleFactor );
  fac.attr("stroke-width", strokeWidth/scaleFactor);

  fac.attr("display", "block");
  fac.on("mouseover", hover);
}


/////////////////////////////////////////////////////////////////////////////
//
//          B R U S H
//
/////////////////////////////////////////////////////////////////////////////

var brush = d3.svg.brush()
    .x(zoom.x())
    .y(zoom.y())
    .on("brush", brush)
    .on("brushstart", brushstart)
    .on("brushend", brushend);

var brushLayer = svg.append("g")
    .attr("id", "mapBrush")
    .attr("class", "brush")
    .call(brush);

// Clear brush at first
d3.select(".brush")
    .style("display", "none");
d3.selectAll(".brush").call(brush.clear());

d3.select("#graph")
    .style("opacity", 0);
d3.select("#key")
    .style("opacity", 0);

function brushstart() {
    //STOPS ZOOM EVENT ALONGSIDE BRUSH
    d3.event.sourceEvent.stopPropagation();
    brushing = true;
//    facilities.each(function(d) { d.scanned = d.selected = false; });
    //clearFacilities();
//    resetTotal();
//    lineGraph(total);
}


function brush() {
    var extent = brush.extent();
    fac.each(function(d) { d.scanned = d.selected = false; });

    if (extent[0][0] == extent[1][0] && extent[0][1] == extent[1][1])
      return;   //if the extent is a single click, don't fade stuff

    search(quadtree, extent[0][0], extent[0][1], extent[1][0], extent[1][1]);
    fac.classed("brushed", function(d) { return d.selected; });
    fac.classed("fade", function(d) { return !d.selected; });
}

function brushend() {
    // TODO: remove this segment now that brushing prevents event default
    // if(!event.shiftKey) {
    //     brushing = false;
    //     brush.clear();
    //     usaLayer.moveToFront();
    //     quadTreeLayer.moveToFront();
    //     facilityLayer.moveToFront();
    //     brushLayer.moveToFront();
    //
    //     return;
    // }

    var these = d3.select(null);
    var extent = brush.extent();
    fac.each(function(d) { d.scanned = d.selected = false; });
    search(quadtree, extent[0][0], extent[0][1], extent[1][0], extent[1][1]);
    fac.classed("brushed", function(d) { return d.selected; });
    fac.classed("fade", function(d) { return !d.selected; });
    resetTotal();
    fac.each(function(d, i) {
        if(!d.selected && total.contains.indexOf(i) >= 0) {
            total.contains.splice(total.contains.indexOf(i), 1);
            for(var j = 0; j < 27; j++) {
                total.releases[j] -= d.releases[j];
                total.recycling[j] -= d.recycling[j];
                total.treatment[j] -= d.treatment[j];
                total.recovery[j] -= d.recovery[j];
            }
        }

       if(d.selected && total.contains.indexOf(i) < 0) {
            total.contains.push(i);
            for(var i = 0; i < 27; i++) {
                total.releases[i] += d.releases[i];
                total.recycling[i] += d.recycling[i];
                total.treatment[i] += d.treatment[i];
                total.recovery[i] += d.recovery[i];
            }
       }
    });

    var brushedFac = fac.filter(function(d,i){
      return d.selected;
    });

    if(total.contains.length < 1) {
        fac.classed("fade", false);
        resetTotal();
    }

    if(showingGraphTwo && flagRedrawG2) {
        // console.log("REDRAWING G2");
        var domainG1 =
        [
            Math.min(d3.min(total.releases), d3.min(total.recycling), d3.min(total.recovery), d3.min(total.treatment)),
            Math.max(d3.max(total.releases), d3.max(total.recycling), d3.max(total.recovery), d3.max(total.treatment))
        ];

        var tmp = compareList.data[compareList.pos].data;
        var domainG2 =
        [
            Math.min(d3.min(tmp.releases), d3.min(tmp.recycling), d3.min(tmp.recovery), d3.min(tmp.treatment)),
            Math.max(d3.max(tmp.releases), d3.max(tmp.recycling), d3.max(tmp.recovery), d3.max(tmp.treatment))
        ];

        if(domainG1[1] > domainG2[1]) {
          largerYScale = domainG1;
          resizeGraph(domainG1, 1);
          resizeGraph(domainG1, 2);
        } else {
          largerYScale = domainG2;
          resizeGraph(domainG2, 1);
          resizeGraph(domainG2, 2);
        }

      }



    showGraph(1);
    // TODO: rather than a selection of brushed facilities, just pass brush extent and re-draw brush with that extent.
    currentComparison = new comparison( "Brushed Region", "brush", copyTotal(), brushedFac);
    lineGraph(total);

    brushing = false;

    usaLayer.moveToFront();
    quadTreeLayer.moveToFront();
    facilityLayer.moveToFront();
    brushLayer.moveToFront();
}


function clearBrush() {
    d3.select("#mapBrush")
        .style("display", "none");
    d3.select("#mapBrush").call(brush.clear());
    fac.each(function(d) { d.scanned = d.selected = false; });
//    fac.classed("fade", function(d) { return !d.selected; } );
    fac.classed("brushed", function(d) { return d.selected; } );

    //hideGraph();
}

/////////////////////////////////////////////////////////////////////////////
//
//          K E Y
//
/////////////////////////////////////////////////////////////////////////////

keySelected = {
    "1": {"name": "Releases",
      "value": true},
    "2": {"name": "Recycling",
      "value": true},
    "3": {"name": "Treatment",
      "value": true},
    "4": {"name": "Recovery",
      "value": true},
    "reset": resetKey,
    "numSelected": function() {
      var num = 0;
      if(this[1].value)
        num++;
      if(this[2].value)
        num++;
      if(this[3].value)
        num++;
      if(this[4].value)
        num++;
      return num;
    }
}

d3.select("#keyReleases").on("click", function() { updateKey(1); });
d3.select("#keyRecycling").on("click", function() { updateKey(2); });
d3.select("#keyTreatment").on("click", function() { updateKey(3); });
d3.select("#keyRecovery").on("click", function() { updateKey(4); });

function resetKey() {
    keySelected[1].value = true;
    keySelected[2].value = true;
    keySelected[3].value = true;
    keySelected[4].value = true;

    d3.select("#key" + keySelected[1].name).classed("deselected", false);
    d3.select("#key" + keySelected[2].name).classed("deselected", false);
    d3.select("#key" + keySelected[3].name).classed("deselected", false);
    d3.select("#key" + keySelected[4].name).classed("deselected", false);

    if(releasesLine[0]) {
      releasesLine[0].classed("deselected", false);
      recyclingLine[0].classed("deselected", false);
      treatmentLine[0].classed("deselected", false);
      recoveryLine[0].classed("deselected", false);
    }
    if(releasesLine[1]) {
      releasesLine[1].classed("deselected", false);
      recyclingLine[1].classed("deselected", false);
      treatmentLine[1].classed("deselected", false);
      recoveryLine[1].classed("deselected", false);
    }
}

function updateKey(id) {

    if(keySelected[id].value) {
      keySelected[id].value = false;
      d3.select("#key" + keySelected[id].name).classed("deselected", true);

      switch(id) {
        case 1:
          releasesLine[0].classed("deselected", true);
          if(releasesLine[1]) releasesLine[1].classed("deselected", true);
          break;
        case 2:
          recyclingLine[0].classed("deselected", true);
          if(releasesLine[1]) recyclingLine[1].classed("deselected", true);
          break;
        case 3:
          treatmentLine[0].classed("deselected", true);
          if(releasesLine[1]) treatmentLine[1].classed("deselected", true);
          break;
        case 4:
          recoveryLine[0].classed("deselected", true);
          if(releasesLine[1]) recoveryLine[1].classed("deselected", true);
          break;
      }
    } else {
      keySelected[id].value = true;

      d3.select("#key" + keySelected[id].name).classed("deselected", false);

      switch(id) {
        case 1:
          releasesLine[0].classed("deselected", false);
          if(releasesLine[1]) releasesLine[1].classed("deselected", false);
          break;
        case 2:
          recyclingLine[0].classed("deselected", false);
          if(releasesLine[1]) recyclingLine[1].classed("deselected", false);
          break;
        case 3:
          treatmentLine[0].classed("deselected", false);
          if(releasesLine[1]) treatmentLine[1].classed("deselected", false);
          break;
        case 4:
          recoveryLine[0].classed("deselected", false);
          if(releasesLine[1]) recoveryLine[1].classed("deselected", false);
          break;
      }
    }

    if(currentComparison)
      pieChart2();
    if(compareList)
      pieChart2(null, null, 2);



}

/////////////////////////////////////////////////////////////////////////////
//
//          L I N E   G R A P H
//
/////////////////////////////////////////////////////////////////////////////


function initializeLineGraphs() {

  graph1 = d3.select("#graph1")
    .attr("width", width-250)
    .attr("height", 150)
    .attr("opacity", 0);
    // .on("mouseover", graphHover)
    // .on("mousemove", graphMove)
    // .on("mouseout", graphOut);

  graph2 = d3.select("#graph2")
      .attr("x", 150)
      .attr("width", width-250)
      .attr("height", 150)
      .attr("opacity", 1);
      // .on("mouseover", graphHover)
      // .on("mousemove", graphMove)
      // .on("mouseout", graphOut);

  var xScale = d3.scale.linear().range([144, width-300]).domain([1987, 2013]).clamp(true);
  var yScale = d3.scale.linear().range([150-25, 25]).domain([0,0]);
  var legendScale = d3.scale.linear().range([0, 75]).domain([0, 100,000,000]).clamp(true);

  var graphBrush = d3.svg.brush()
          .x(xScale)
          // .classed(".graphBrush")
          // .on("brush", graphBrushed);
          .on("brushend", graphBrushEnded);

  d3.select("#graph1").append("g")
            .attr("id", "graphBrush1")
            .classed(".graphBrush", true)
            .call(graphBrush)
            .selectAll("rect")
            .attr("y", 25)
            .attr("height", 100)
            .style({
               "fill": "grey",
               "fill-opacity": "0.2"
            });

  d3.select("#graph2").append("g")
            .attr("id", "graphBrush2")
            .classed(".graphBrush", true)
            .call(graphBrush)
            .selectAll("rect")
            .attr("y", 25)
            .attr("height", 100)
            .style({
               "fill": "grey",
               "fill-opacity": "0.2"
            });

  var xAxis = d3.svg.axis()
      .scale(xScale)
      .tickSize(8)
      .tickFormat(d3.format("####")),

      yAxis = d3.svg.axis()
        .scale(yScale)
        .ticks(5)
        .orient("left");//,

        //largerYScale = d3.scale.linear().range([150-25, 25]).domain([0,0]);

  graph1.append("svg:g")
      .attr("class", "y axis")
      .attr("transform", "translate(" + (150) + ",0)")
      .call(yAxis);

  graph2.append("svg:g")
      .attr("class", "y axis")
      .attr("transform", "translate(" + (150) + ",0)")
      .call(yAxis);

  var yGrid = yAxis.ticks(5)
        .tickSize(width-150-300, 0)
        .tickFormat("")
        .orient("right");

  graph1.append("svg:g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + (150 - 25) + ")")
      .call(xAxis);

  graph1.append("svg:g")
      .classed('y', true)
      .classed('grid', true)
      .attr("transform", "translate(" + (150) + ",0)")
      .call(yGrid);

  graph2.append("svg:g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + (150 - 25) + ")")
      .call(xAxis);

  graph2.append("svg:g")
      .classed('y', true)
      .classed('grid', true)
      .attr("transform", "translate(" + (150) + ",0)")
      .call(yGrid);

  // Add a y-axis label
  graph1.append("text")
      .attr("class", "y label")
      .attr("text-anchor", "end")
      .attr("y", function() {
          return 100 - legendScale(yScale.domain()[1]); })
      .attr("dy", ".75em")

      .attr("transform", "rotate(-90)")
      .text("Chemical Usage (lbs)");

  var lineGen = d3.svg.line()
      .x(function(d,i) {
          return xScale(i + 1987);
      })
      .y(function(d) {
          return currentGraphScale1(d);
      })
      .interpolate("linear");

  releasesLine[0] = graph1.append('svg:path')
      .attr('d', lineGen(currentGraphData1.releases))
      .attr('stroke', 'red')
      .classed('lineChart', true)
      .classed('deselected', function(d) {
          return !keySelected[1].value
      });
  recyclingLine[0] = graph1.append('svg:path')
      .attr('d', lineGen(currentGraphData1.recycling))
      .attr('stroke', 'green')
      .classed('lineChart', true)
      .classed('deselected', function(d) {
          return !keySelected[2].value
      });
  treatmentLine[0] = graph1.append('svg:path')
      .attr('d', lineGen(currentGraphData1.treatment))
      .attr('stroke', 'purple')
      .classed('lineChart', true)
      .classed('deselected', function(d) {
          return !keySelected[3].value
      });
  recoveryLine[0] = graph1.append('svg:path')
     .attr('d', lineGen(currentGraphData1.recovery))
     .attr('stroke', 'blue')
     .classed('lineChart', true)
     .classed('deselected', function(d) {
         return !keySelected[4].value
     });

  releasesLine[1] = graph2.append('svg:path')
     .attr('d', lineGen(currentGraphData1.releases))
     .attr('stroke', 'red')
     .classed('lineChart', true)
     .classed('deselected', function(d) {
         return !keySelected[1].value
     });
  recyclingLine[1] = graph2.append('svg:path')
     .attr('d', lineGen(currentGraphData1.recycling))
     .attr('stroke', 'green')
     .classed('lineChart', true)
     .classed('deselected', function(d) {
         return !keySelected[2].value
     });
  treatmentLine[1] = graph2.append('svg:path')
     .attr('d', lineGen(currentGraphData1.treatment))
     .attr('stroke', 'purple')
     .classed('lineChart', true)
     .classed('deselected', function(d) {
         return !keySelected[3].value
     });
  recoveryLine[1] = graph2.append('svg:path')
    .attr('d', lineGen(currentGraphData1.recovery))
    .attr('stroke', 'blue')
    .classed('lineChart', true)
    .classed('deselected', function(d) {
        return !keySelected[4].value
    });

    //reinitialize yAxis
    yAxis = d3.svg.axis()
      .scale(yScale)
      .ticks(5)
      .orient("left");

    return {
      xScale: xScale,
      yScale: yScale,
      xAxis: xAxis,
      yAxis: yAxis,
      lineGen: lineGen,
      legendScale: legendScale,
      yGrid: yGrid,
      graphBrush: graphBrush
    }
}

function graphBrushed() {
  var extent0 = graphs.graphBrush.extent(),
      extent1;

  // if dragging, preserve the width of the extent
  if (d3.event.mode === "move") {
    var d0 = Math.round(extent0[0]),
        d1 = Math.floor(extent0[1]);
    extent1 = [d0, d1];
  }

  // otherwise, if resizing, round both dates
  else {
    extent1 = extent0.map(Math.round);

    // if empty when rounded, use floor & ceil instead
    if (extent1[0] >= extent1[1]) {
      extent1[0] = Math.floor(extent0[0]);
      extent1[1] = Math.ceil(extent0[1]);
    }

    pieChart2(extent1);
  }

  d3.select(this).call(graphs.graphBrush.extent(extent1));


}


function graphBrushEnded() {
  if (!d3.event.sourceEvent) return; // only transition after input

  var extent0 = graphs.graphBrush.extent(),
      extent1 = extent0.map(Math.round);

  // if empty when rounded, use floor & ceil instead
  if (extent1[0] >= extent1[1]) {
    extent1[0] = Math.floor(extent0[0]);
    extent1[1] = Math.ceil(extent0[1]);
  }
  console.log(d3.select(this));
  d3.select("#graphBrush1").transition("brushResize").duration(250)
      .call(graphs.graphBrush.extent(extent1))
      .call(graphs.graphBrush.event);

  d3.select("#graphBrush2").transition("brushResize").duration(250)
      .call(graphs.graphBrush.extent(extent1))
      .call(graphs.graphBrush.event);

  pieChart2(extent1);
  pieChart2(extent1, null, 2);
}

// function graphHover() {
//   if(d3.select("#graph1").style("opacity") > 0)
//     d3.select("#graphLine")
//       .classed("hidden", false);
// }
//
// function graphOut() {
//   d3.select("#graphLine")
//       .classed("hidden", true);
// }
//
// // var graphHoverRectangle = d3.select("#graphs").append("path").attr("class", "area");
// var graphHoverRectangle = d3.select("#graphLine").append("svg:rect").attr("class", "area");
// var graphHoverRectangle2 = d3.select("#graphLine").append("svg:rect").attr("class", "area");
//
//
// function graphMove() {
//   if(d3.select("#graph1").style("opacity") == 0)
//     return;
//
//   var m = d3.mouse(this),
//    thisYear = Math.floor(graphs.xScale.invert(m[0]));
//   var bounds = [
//     Math.floor(graphs.xScale(thisYear)),
//     Math.floor(graphs.xScale(thisYear+1))
//   ]
//
//
//   if(bounds[0] != graphHoverRectangle.attr("x")) {
//
//     graphHoverRectangle
//         .attr("x", function() { return bounds[0]; })
//         .attr("y", 25)
//         .attr("width", bounds[1]-bounds[0])
//         .attr("height", 150)
//
//     //INFORMATION FROM LINEGRAPH hover
//     if(currentComparison)
//       console.log({
//           "year": thisYear,
//           "releases": currentComparison.data.releases[thisYear-1987],
//           "recycling": currentComparison.data.recycling[thisYear-1987],
//           "treatment": currentComparison.data.treatment[thisYear-1987],
//           "recovery": currentComparison.data.recovery[thisYear-1987]
//       });
//
//
//     if(showingGraphTwo) {
//         console.log({
//             "year": thisYear,
//             "releases": compareList.data[compareList.pos].data.releases[thisYear-1987],
//             "recycling": compareList.data[compareList.pos].data.recycling[thisYear-1987],
//             "treatment": compareList.data[compareList.pos].data.treatment[thisYear-1987],
//             "recovery": compareList.data[compareList.pos].data.recovery[thisYear-1987]
//         });
//         graphHoverRectangle2
//           .classed("hidden", false);
//
//         graphHoverRectangle2
//             .attr("x", function() { return bounds[0]; })
//             .attr("y", 175)
//             .attr("width", 32)
//             .attr("height", 150)
//     } else {
//         graphHoverRectangle2
//           .classed("hidden", true);
//     }
//   }
// }

function lineGraph(d, id) {
    if(!id)
      pieChart2();
    else if(id == 2)
      pieChart2(null, null, 2);

    if(!d || !d.releases) return;
  // console.log(largerYScale.domain(), graphs.yScale.domain());
    var graph = (id == 2) ? graph2 : graph1;
    var index = (id == 2) ? 1 : 0;

    graphs.yScale.domain(
    [
        Math.min(d3.min(d.releases), d3.min(d.recycling), d3.min(d.recovery), d3.min(d.treatment)),
        Math.max(d3.max(d.releases), d3.max(d.recycling), d3.max(d.recovery), d3.max(d.treatment))
    ]);

    // Scale both graphs appropriately
    if(showingGraphTwo) {

      if(!largerYScale) {
        largerYScale = graphs.yScale.domain();
        //console.log("!!", largerYScale);
      } else {
        //console.log(largerYScale[1], graphs.yScale.domain()[1]);
        // new scale is larger than current graph2
        if(graphs.yScale.domain()[1] > largerYScale[1]) {
            largerYScale = graphs.yScale.domain();
            //console.log(largerYScale);
            if(showingGraphTwo)
              resizeGraph(largerYScale, 2);
        // new scale is smaller than current graph2; use graph2's scale
      } else if (graphs.yScale.domain()[1] < largerYScale[1]) {
            graphs.yScale.domain(largerYScale);
        } else {
            // scales are the same, proceed as normal
        }
      }
    }

  //  graphScaleDomains[index] = graphs.yScale.domain();

    yAxis = d3.svg.axis()
        .scale(graphs.yScale)
        .ticks(5)
        .orient("left");

    graph.select(".y.axis").transition().duration(1000).call(graphs.yAxis);

    yGrid = yAxis.ticks(5)
      .tickSize(width-200, 0)
      .tickFormat("")
      .orient("right");

    graph.select(".y.grid").transition().duration(1000).call(graphs.yGrid);

    graph.select(".y.label").transition().duration(1000).attr("y", function() {
        return 100 - graphs.legendScale(graphs.yScale.domain()[1]); });

    // Update lineGen with the appropriate y()
    graphs.lineGen.y(function(d) {
      return graphs.yScale(d);
    })

    releasesLine[index]
        .transition().duration(250).delay(100)
        .attr('d', graphs.lineGen(d.releases));
    recyclingLine[index]
        .transition().duration(250).delay(200)
        .attr('d', graphs.lineGen(d.recycling))
    treatmentLine[index]
         .transition().duration(250).delay(300)
         .attr('d', graphs.lineGen(d.treatment))
    recoveryLine[index]
         .transition().duration(250).delay(400)
         .attr('d', graphs.lineGen(d.recovery))

    currentGraphData1 = copyData(d);

}

function resizeGraph(yScaleDomain, id) {
    //console.log("resizing", yScaleDomain);
    var index = (id == 2) ? 1 : 0;
    var graph = (id == 2) ? graph2 : graph1;
    var d;

    if(index == 1)
      d = compareList.data[compareList.pos].data;
    else d = total;

    graphs.yScale.domain(yScaleDomain);
    if(index == 1) flagRedrawG2 = true;
    //console.log("Resizing both graphs to use the larger scale: ", graphs.yScale.domain(), flagRedrawG2);

    // var g1 = d3.select("#graph1"),
    //     g2 = d3.select("#graph2");

    var newAxis = d3.svg.axis()
        .scale(graphs.yScale)
        .ticks(5)
        .orient("left");

    graph.selectAll(".y.axis").transition().duration(1000).call(newAxis);
    //g2.selectAll(".y.axis").transition().duration(1000).call(newAxis);

    var newYAxisGrid = newAxis.ticks(5)
      .tickSize(width-200, 0)
      .tickFormat("")
      .orient("right");

    graph.selectAll(".y.grid").transition().duration(1000).call(newYAxisGrid);
    //g2.selectAll(".y.grid").transition().duration(1000).call(newYAxisGrid);

    // Update lineGen with the appropriate y()
    graphs.lineGen.y(function(d) {
      return graphs.yScale(d);
    })

    releasesLine[index].transition().duration(1000).attr('d', graphs.lineGen(d.releases));
    recyclingLine[index].transition().duration(1000).attr('d', graphs.lineGen(d.recycling));
    treatmentLine[index].transition().duration(1000).attr('d', graphs.lineGen(d.treatment));
    recoveryLine[index].transition().duration(1000).attr('d', graphs.lineGen(d.recovery));
}

function updateComparison() {
    //console.log("updating graph2 scales");
    largerYScale = null;
    lineGraph(getBlankDataArrays(), 1);
    lineGraph(compareList.data[compareList.pos].data, 2);
}

function showGraph(arg) {
  if(!arg) {
    d3.select("#graphs")
        .style("opacity", 1);
  } else if (arg == 1) {
    d3.select("#graphs")
        .style("opacity", 1);
    d3.select("#graph1", 1)
        .style("opacity", 1);

  } else if (arg == 2) {
    d3.select("#graphs")
        .style("opacity", 1);
    d3.select("#graph2")
        .style("opacity", 1);
  }

  d3.select("#key")
      .style("opacity", 1);
}

function hideGraph(arg) {
    if(!arg) {
      d3.select("#graphs")
          .style("opacity", 0);
      d3.select("#graph1")
          .style("opacity", 0);
      d3.select("#graph2")
          .style("opacity", 0);
      d3.select("#key")
          .style("opacity", 0);
      d3.select("#graphLine")
          .classed("hidden", true);

    } else if (arg == 1) {
      d3.select("#graph1")
          .style("opacity", 0);
      d3.select("#graphLine")
          .classed("hidden", true);
    } else if (arg == 2) {
      d3.select("#graph2")
          .style("opacity", 0);
    }
}

function clearGraph(id) {
  resetTotal();

  if(!id) {
    //clear all
    releasesLine[0].attr('d', graphs.lineGen(copyTotal()));
    recyclingLine[0].attr('d', graphs.lineGen(copyTotal()));
    treatmentLine[0].attr('d', graphs.lineGen(copyTotal()));
    recoveryLine[0].attr('d', graphs.lineGen(copyTotal()));
    releasesLine[1].attr('d', graphs.lineGen(copyTotal()));
    recyclingLine[1].attr('d', graphs.lineGen(copyTotal()));
    treatmentLine[1].attr('d', graphs.lineGen(copyTotal()));
    recoveryLine[1].attr('d', graphs.lineGen(copyTotal()));

  } else if (id == 1) {
    releasesLine[0].attr('d', graphs.lineGen(copyTotal()));
    recyclingLine[0].attr('d', graphs.lineGen(copyTotal()));
    treatmentLine[0].attr('d', graphs.lineGen(copyTotal()));
    recoveryLine[0].attr('d', graphs.lineGen(copyTotal()));


  } else if (id == 2) {
    releasesLine[1].attr('d', graphs.lineGen(copyTotal()));
    recyclingLine[1].attr('d', graphs.lineGen(copyTotal()));
    treatmentLine[1].attr('d', graphs.lineGen(copyTotal()));
    recoveryLine[1].attr('d', graphs.lineGen(copyTotal()));
  }
}

function resetTotal() {

    total = getBlankDataArrays();
}

function getBlankDataArrays() {
    return {
        "releases":     [0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0],
        "recycling":    [0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0],
        "treatment":    [0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0],
        "recovery":     [0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0],
        "contains":     []
    }
}

function addFacilityToTotal(d, i) {
    if(total.contains.indexOf(i) >= 0) {
            total.contains.splice(total.contains.indexOf(i), 1);
            for(var j = 0; j < 27; j++) {
                total.releases[j] -= d.releases[j];
                total.recycling[j] -= d.recycling[j];
                total.treatment[j] -= d.treatment[j];
                total.recovery[j] -= d.recovery[j];
            }
        }

   if(total.contains.indexOf(i) < 0) {
        total.contains.push(i);
        for(var i = 0; i < 27; i++) {
            total.releases[i] += d.releases[i];
            total.recycling[i] += d.recycling[i];
            total.treatment[i] += d.treatment[i];
            total.recovery[i] += d.recovery[i];
        }
   }
}

function removeFacilityFromTotal(d, i) {
    if(total.contains.indexOf(i) >= 0) {

            total.contains.splice(total.contains.indexOf(i),1);
            for(var j = 0; j < 27; j++) {
                total.releases[j] -= d.releases[j];
                total.recycling[j] -= d.recycling[j];
                total.treatment[j] -= d.treatment[j];
                total.recovery[j] -= d.recovery[j];
            }
        }

}

function copyTotal() {
    return {
        "releases": total.releases.slice(),
        "recycling": total.recycling.slice(),
        "treatment": total.treatment.slice(),
        "recovery": total.recovery.slice(),
        "contains": []
        //"contains": total.contains.slice()
    }
}

function copyData(array) {
    return {
      "releases": array.releases.slice(),
      "recycling": array.recycling.slice(),
      "treatment": array.treatment.slice(),
      "recovery": array.recovery.slice(),
      "contains": array.contains.slice()
    }
}




/////////////////////////////////////////////////////////////////////////////
//
//          L I S T
//
/////////////////////////////////////////////////////////////////////////////

var listLayer = d3.select("#list").append("g");

function updateList() {
    var listContents = listLayer.selectAll("rect")
      .data(compareList.data)
        .classed("listEleCurr", function(d, i) { return i == compareList.pos; })

    listContents.enter().append("rect")
        .attr("opacity", 0)
        .attr("x", 5)
        .attr("y", function(d, i) { return 280 - (12 * i); })
        .attr("width", "30px")
        .attr("height", "10px")
        .classed("listEle", true)
        //
        .attr("id", function(d, i) { return i; })
        .on("click", function(d, i) {
            flagRedrawG2 = false;
            if(event.shiftKey) {
              showGraph(2);
              lineGraph(d.data, 1);
              compareList.pos = i;
              listContents.classed("listEleCurr", function(d, i) { return i == compareList.pos; })
              reSelect(d);
            } else {
              showingGraphTwo = true;
              showGraph(2);
              lineGraph(d.data, 2);
              console.log(listContents)
              compareList.pos = i;
              listContents.classed("listEleCurr", function(d, i) { return i == compareList.pos; })
              reSelect(d);

            }

        })
        .on("mouseover", function(d) {
            hoverList(d);
        })
        .on("mouseout", function() {
            hoverList(null);
        });

    listContents.transition().duration(2000)
        .attr("opacity", 1);

    listContents.exit().transition().duration(1500).attr("opacity", 0).remove();
}

function hoverList(d) {

      //Update position of listView tooltip div
      var listView = d3.select("#listView")
          .style("left", d3.event.pageX+25 + "px")
          .style("top", d3.event.pageY-25 + "px");

      if(!d) {
          listView.style("opacity", "0");
      } else {
          listView.style("opacity", ".95");
          var info = "";
          info += d.type + ": " + d.title + "<br />";
          //info += "test: " + d.colorIndex + "<br />";
          listView.html(info);
      }
}

function reSelect(d) {
    clearEffects();

    switch(d.type) {
        case "states":
          highlightStates(d.collection);
          selectedStates.array = d.collection;
          break;
        case "facility":
          d3.select("#"+d.collection).classed("facility selected", true);
          break;
        case "brush":
          d.collection.classed("facility selected", true);
          break;
    }
}

function clearList() {
    listLayer.selectAll("*").remove();
    compareList.reset();

    updateList();
}



/////////////////////////////////////////////////////////////////////////////
//
//          U T I L I T Y   M E T H O D S
//
/////////////////////////////////////////////////////////////////////////////

function clearEffects() {
    //console.log("clearEffects ");
    if(brush)
        clearBrush();

    if(states)
        clearState();

    if(fac)
      clearFacilities();

    keySelected.reset();
    // d3.select("#graph")
    //     .style("opacity", 0);
};

function debounce(fn, delay) {
  var timer = null;
  return function () {
    var context = this, args = arguments;
    clearTimeout(timer);
    timer = setTimeout(function () {
      fn.apply(context, args);
    }, delay);
  };
}

function throttle(fn, threshhold, scope) {
  threshhold || (threshhold = 250);
  var last,
      deferTimer;
  return function () {
    var context = scope || this;

    var now = +new Date,
        args = arguments;
    if (last && now < last + threshhold) {
      // hold on to it
      clearTimeout(deferTimer);
      deferTimer = setTimeout(function () {
        last = now;
        fn.apply(context, args);
      }, threshhold);
    } else {
      last = now;
      fn.apply(context, args);
    }
  };
}



////////////////////////////////////////////////////////////
//
//              I N I T   F U N C T I O N S
//
////////////////////////////////////////////////////////////

function init() {
//    console.log("init!");
    bindKeys();
//    updateStack();
    updateList();

    usaLayer.moveToFront();
    facilityLayer.moveToFront();


    graphs = initializeLineGraphs();
    hideGraph();
}



function bindKeys() {

    d3.select("body").on( 'keydown', function () {
        // SPACE
        if ( d3.event.keyCode === 32 ) {
            //reorderLayers();

            clearBrush();
            clearState();
            clearFacilities();
            hideGraph();
            showingGraphTwo = false;
            flagRedrawG2 = false;
            fac.classed("clickThrough", false);
            keySelected.reset();

//            usaLayer.transition()
//              .duration(750)
//              .style("stroke-width", "1.5px")
//              .attr("transform", "");
        }

        // SHIFT
        if ( d3.event.keyCode === 16 ) {
//            d3.selectAll(".brush").call(brush.clear());
//            d3.select(".brush")
//                .style("display", "block");
        }

        // ONE
        if ( d3.event.keyCode === 49 ) {
//            console.log("ONE");
            popupTooltip("select");
            d3.select("#mode").text("Select (1)");
            clearEffects();
            fac.on("mouseover", hover);
            usaLayer.moveToFront();
            quadTreeLayer.moveToFront();
            facilityLayer.moveToFront();
            backgroundRect.moveToFront();
            toolContext = "select";
        }
        // TWO
        if ( d3.event.keyCode === 50 ) {
//            console.log("TWO");
            popupTooltip("brush");
            d3.select("#mode").text("Brush (2)");
            clearEffects();
            brushLayer.moveToFront();
            d3.selectAll("#mapBrush").call(brush.clear());
            d3.select("#mapBrush")
                .style("display", "block");
            toolContext = "brush";
        }
        // THREE
        if ( d3.event.keyCode === 51 ) {
            // clearEffects();
            if(currentComparison) {
              popupTooltip("Added");
              compareList.add(currentComparison);
              lineGraph(currentComparison.data,2);
              showGraph(2);
              showingGraphTwo = true;
              updateList();
            }
        }
        // FOUR
        if ( d3.event.keyCode === 52) {
//            clearStack();
            clearState();
            clearFacilities();
            clearList();
            hideGraph();
            fac.classed("clickThrough", false);
            popupTooltip("clear list");
            showingGraphTwo = false;
            flagRedrawG2 = false;

        }

        // FIVE
        if ( d3.event.keyCode === 53) {
            //console.log(currentComparison, compareList.data);
            //toggleExplorationTab();
            colorFacilities(1);
            fac.attr("display", "default")
        }

        // SIX
        if ( d3.event.keyCode === 54) {
            //console.log(currentComparison, compareList.data);
            //toggleExplorationTab();
            colorFacilities(2);
            fac.attr("display", "default")
            //toggleAuxilliaryTab();
        }

        // SEVEN
        if( d3.event.keyCode === 55) {
            displayFacilities();

        }

        // <
        if( d3.event.keyCode === 37) {
          var bounds = graphs.graphBrush.extent();
          if((bounds[0] == bounds[1]) || (bounds[0] <= 1987)) {
            return;
          } else {
              graphs.graphBrush.extent([bounds[0]-1, bounds[1]-1]);
              d3.select("#graphBrush1").call(graphs.graphBrush);
              d3.select("#graphBrush2").call(graphs.graphBrush);
              pieChart2(graphs.graphBrush.extent());
              pieChart2(graphs.graphBrush.extent(), null, 2);
          }

        }

        // >
        if( d3.event.keyCode === 39) {
            var bounds = graphs.graphBrush.extent();
            if((bounds[0] == bounds[1]) || (bounds[1] >= 2013)) {
              return;
            } else {
                graphs.graphBrush.extent([bounds[0]+1, bounds[1]+1]);
                d3.select("#graphBrush1").call(graphs.graphBrush);
                d3.select("#graphBrush2").call(graphs.graphBrush);
                pieChart2(graphs.graphBrush.extent());
                pieChart2(graphs.graphBrush.extent(), null, 2);
            }
        }
    });
}



////////////////////////////////////////////////////////////
//
//                      M A I N
//
//
//                _
//                \`*-.
//                 )  _`-.
//                .  : `. .
//                : _   '  \
//                ; *` _.   `*-._
//                `-.-'          `-.
//                  ;       `       `.
//                  :.       .        \
//                  . \  .   :   .-'   .
//                  '  `+.;  ;  '      :
//                  :  '  |    ;       ;-.
//                  ; '   : :`-:     _.`* ;
//               .*' /  .*' ; .*`- +'  `*'
//               `*-*   `*-*  `*-*'
//
//
////////////////////////////////////////////////////////////

(function main() {
//    console.log("main!");

    init();
})();








function pieChart(data) {

  var r = 75;
  var industryLookup = ["11", "21", "22", "23", "33", "42", "45", "49", "51", "53", "54", "55", "56", "62", "71", "81", "92", "-1"];
  var naicsCountTable = [
    {"naics": "11", "number": 0},
    {"naics": "21", "number": 0},
    {"naics": "22", "number": 0},
    {"naics": "23", "number": 0},
    {"naics": "33", "number": 0},
    {"naics": "42", "number": 0},
    {"naics": "45", "number": 0},
    {"naics": "49", "number": 0},
    {"naics": "51", "number": 0},
    {"naics": "53", "number": 0},
    {"naics": "54", "number": 0},
    {"naics": "55", "number": 0},
    {"naics": "56", "number": 0},
    {"naics": "62", "number": 0},
    {"naics": "71", "number": 0},
    {"naics": "81", "number": 0},
    {"naics": "92", "number": 0},
    {"naics": "-1", "number": 0},
  ]

  var facilities = fac.filter(function(d) { return selectedStates.array.indexOf(d.state) >= 0; })

  facilities.each(function(d) {
    for (var i=0; i < naicsCountTable.length; i++) {
        if (naicsCountTable[i].naics === d.NAICS) {
            naicsCountTable[i].number++;
            break;
        }
    }
  });


    data = naicsCountTable;

  toggleAuxilliaryTab(1);
  // d3.select("#auxiliaryInfoSVG1").selectAll("*").remove();
  var auxSVG = d3.select("#auxiliaryInfoSVG1");

  var pieChartArea = auxSVG
    .data([data])
    .append("svg:g")
        .attr("transform", "translate(" + (25 + r) + "," + (40 + r) + ")")

  var arc = d3.svg.arc()
    .innerRadius(40)
    .outerRadius(r);

  var pie = d3.layout.pie()
    .value(function(d) { return d.number; });

  var arcs = pieChartArea.selectAll("auxSlice")
    .data(pie)
    .enter()
        .append("svg:g")
            .attr("class", "auxSlice")
            .on("mouseover", function(d, i){
              //update text area to display the industry sector
              var industry = "";
              if(naicsTable[data[i].naics].length > 25)
                industry = naicsTable[data[i].naics].substring(0, 25) + "... "
              else {
                industry = naicsTable[data[i].naics] + ": "
              }
              d3.select("#industryInfo").text(industry + d.value + " facilities");
              //console.log(naicsTable[data[i].naics]);
              var thisone = i;
              d3.selectAll(".auxSlice").style("opacity", function(d,i) {
                if(i == thisone) {
                  return 1;
                } else {
                  return 0.2;
                }
              })
            })
            .on("mouseout", function(d) {
              d3.selectAll(".auxSlice").style("opacity", 1);
              d3.select("#industryInfo").text("");
            });


    arcs.append("svg:path")
            .attr("fill", function(d, i) {
              // console.log(industryColor.range()[i]);
              return industryColor(i);
            })
            .attr("d", arc);

    arcs.append("svg:text")
          .attr("transform", function(d) {
              d.innerRadius = 0;
              d.outerRadius = r;
              return "translate(" + arc.centroid(d) + ")";
          })
          .attr("text-anchor", "middle")
          .attr("pointer-events", "none")
          .text(function(d, i) {
              return (d.endAngle - d.startAngle > 0.5) ? naicsTable[data[i].naics] : "";
          });

    auxSVG.append("text")
        .attr("transform", "translate(10, 210)")
        .attr("id", "industryInfo")
        .text("");
}

d3.select("#graphs").insert("svg:svg", "#graph2")
    .attr("id", "pieChart_Graph1")
    .classed("graph_pieChart");

d3.select("#graphs").append("svg:svg")
    .attr("id", "pieChart_Graph2")
    .classed("graph_pieChart");

// Pie chart for line graphs; total releases (or 4 vars) by industry sector
// bounds are the year restrictions from brushing
// mode is state or facility
//
function pieChart2(bounds, mode, loc) {
  if(!currentComparison) return;
  if(!bounds || bounds[0] < 1986 || bounds[1] > 2013) {
    bounds = [1986, 2013];
    graphs.graphBrush.clear();
    // d3.select(".graphBrush").call(graphs.graphBrush);
  }

  if(!loc) {
    loc = 1;
  }

  var r = 50,
      facilities = null;
  var industryLookup = ["11", "21", "22", "23", "33", "42", "45", "49", "51", "53", "54", "55", "56", "62", "71", "81", "92", "-1"];
  var dataTable = [
    {"naics": "11", "value": 0},
    {"naics": "21", "value": 0},
    {"naics": "22", "value": 0},
    {"naics": "23", "value": 0},
    {"naics": "33", "value": 0},
    {"naics": "42", "value": 0},
    {"naics": "45", "value": 0},
    {"naics": "49", "value": 0},
    {"naics": "51", "value": 0},
    {"naics": "53", "value": 0},
    {"naics": "54", "value": 0},
    {"naics": "55", "value": 0},
    {"naics": "56", "value": 0},
    {"naics": "62", "value": 0},
    {"naics": "71", "value": 0},
    {"naics": "81", "value": 0},
    {"naics": "92", "value": 0},
    {"naics": "-1", "value": 0},
  ]

  mode = 2; //states
  if(loc == 1) {
    switch(currentComparison.type) {
      case "states":
        facilities = fac.filter(function(d) { return selectedStates.array.indexOf(d.state) >= 0; })
        var updateCount = 0;
        facilities.each(function(d) {
          for (var i=0; i < dataTable.length; i++) {
              if (dataTable[i].naics === d.NAICS) {
                  for(var j= (bounds[0]- 1986); j < (bounds[1] - 1986); j++) {
                      if(keySelected[1].value) {
                        dataTable[i].value += d.releases[j];
                        updateCount += d.releases[j];
                      }
                      if(keySelected[2].value) {
                        dataTable[i].value += d.recycling[j];
                        updateCount += d.recycling[j];
                      }
                      if(keySelected[3].value) {
                        dataTable[i].value += d.treatment[j];
                        updateCount += d.treatment[j];
                      }
                      if(keySelected[4].value) {
                        dataTable[i].value += d.recovery[j];
                        updateCount += d.recovery[j];
                      }
                  }
                  break;
              }
          }
        });

        if(updateCount == 0) {
          d3.select("#pieChart_Graph1").selectAll("*").remove();
          return;
        }
        break;
      case "facility":
        mode = 1; // facilities
        dataTable = [
          {"name": "releases", "value": 0},
          {"name": "recycling", "value": 0},
          {"name": "treatment", "value": 0},
          {"name": "recovery", "value": 0}
        ]
        var updateCount = 0;
        facility = fac.filter(function(d) {
            return currentComparison.collection == d.id;
        });

        for(var j= (bounds[0]- 1986); j < (bounds[1] - 1986); j++) {
          dataTable[0].value += currentComparison.data.releases[j];
          updateCount += currentComparison.data.releases[j];

          dataTable[1].value += currentComparison.data.recycling[j];
          updateCount += currentComparison.data.recycling[j];

          dataTable[2].value += currentComparison.data.treatment[j];
          updateCount += currentComparison.data.treatment[j];

          dataTable[3].value += currentComparison.data.recovery[j];
          updateCount += currentComparison.data.recovery[j];
        }

        if(updateCount == 0) {
          d3.select("#pieChart_Graph1").selectAll("*").remove();
          return;
        }

        break;
      case "brush":
        //TODO
        break;
    }
  } else if(loc == 2) {
    console.log(compareList.data[compareList.pos].collection);
    switch(compareList.data[compareList.pos].type) {
      case "states":
        facilities = fac.filter(function(d) { return compareList.data[compareList.pos].collection.indexOf(d.state) >= 0; })
        var updateCount = 0;
        facilities.each(function(d) {
          for (var i=0; i < dataTable.length; i++) {
              if (dataTable[i].naics === d.NAICS) {
                  for(var j= (bounds[0]- 1986); j < (bounds[1] - 1986); j++) {
                      if(keySelected[1].value) {
                        dataTable[i].value += d.releases[j];
                        updateCount += d.releases[j];
                      }
                      if(keySelected[2].value) {
                        dataTable[i].value += d.recycling[j];
                        updateCount += d.recycling[j];
                      }
                      if(keySelected[3].value) {
                        dataTable[i].value += d.treatment[j];
                        updateCount += d.treatment[j];
                      }
                      if(keySelected[4].value) {
                        dataTable[i].value += d.recovery[j];
                        updateCount += d.recovery[j];
                      }
                  }
                  break;
              }
          }
        });

        if(updateCount == 0) {
          d3.select("#pieChart_Graph2").selectAll("*").remove();
          return;
        }
        break;
      case "facility":
        mode = 1; // facilities
        dataTable = [
          {"name": "releases", "value": 0},
          {"name": "recycling", "value": 0},
          {"name": "treatment", "value": 0},
          {"name": "recovery", "value": 0}
        ]
        var updateCount = 0;
        facility = fac.filter(function(d) {
            return compareList.data[compareList.pos].collection == d.id;
        });

        for(var j= (bounds[0]- 1986); j < (bounds[1] - 1986); j++) {
          dataTable[0].value += compareList.data[compareList.pos].data.releases[j];
          updateCount += compareList.data[compareList.pos].data.releases[j];

          dataTable[1].value += compareList.data[compareList.pos].data.recycling[j];
          updateCount += compareList.data[compareList.pos].data.recycling[j];

          dataTable[2].value += compareList.data[compareList.pos].data.treatment[j];
          updateCount += compareList.data[compareList.pos].data.treatment[j];

          dataTable[3].value += compareList.data[compareList.pos].data.recovery[j];
          updateCount += compareList.data[compareList.pos].data.recovery[j];
        }

        if(updateCount == 0) {
          d3.select("#pieChart_Graph2").selectAll("*").remove();
          return;
        }

        break;
      case "brush":
        //TODO
        break;
    }
}

  //toggleAuxilliaryTab(1);
  d3.select("#pieChart_Graph" + loc).selectAll("*").remove();
  var auxSVG = d3.select("#pieChart_Graph" +loc)
                .attr("x", width-230)
                .attr("y", 20 + ((loc-1) * 150))
                .attr("width", "200px")
                .attr("height", "150px");

  auxSVG.append("text")
      .attr("transform", "translate(10, 10)")
      .attr("id", "infoTable1_Graph" + loc)
      .classed("graphChartTable", true)
      .text(function() {
        if(mode == 2) {
          var title = "";
          if(keySelected.numSelected() == 4)
            return "Total Usage";
          else {
            if(keySelected[1].value) {
              title += "Releases "
            }
            if(keySelected[2].value) {
              if(title.length > 0)
                title += "+ Recycling "
              else {
                title += "Recycling "
              }
            }
            if(keySelected[3].value) {
              if(title.length > 0)
                title += "+ Treatment "
              else {
                title += "Treatment "
              }
            }
            if(keySelected[4].value) {
              if(title.length > 0)
                title += "+ Recovery "
              else {
                title += "Recovery "
              }
            }
            return title;
          }
        } else if(mode == 1) {
          return "Usage"
        }



      });

  auxSVG.append("text")
      .attr("transform", "translate(10, 22)")
      .attr("id", "infoTable2_Graph" + loc)
      .classed("graphChartTable", true)
      .text(function() {
        return (bounds[0]) + " - " + (bounds[1]);
      });

  var pieChartArea = auxSVG
    .data([dataTable])
    .append("svg:g")
        .attr("transform", "translate(" + (40 + r) + "," + (25 + r) + ")")

  var arc = d3.svg.arc()
    // .innerRadius(25)
    .outerRadius(r);

  var pie = d3.layout.pie()
    .value(function(d) { return d.value; });

  var arcs = pieChartArea.selectAll(".graph" + loc + "Slice")
    .data(pie)
    .enter()
        .append("svg:g")
            .attr("class", "graph" + loc + "Slice")
            .on("mouseover", function(d, i){
              //update text area to display the industry sector
              if(mode == 2) {
                var industry = "";
                if(naicsTable[dataTable[i].naics].length > 25)
                  industry = naicsTable[dataTable[i].naics].substring(0, 25) + "... "
                else {
                  industry = naicsTable[dataTable[i].naics] + ": "
                }
                //d3.select("#infoTable1_Graph1").text("Releases:");
                d3.select("#infoTable_Graph" + loc).text(industry + d3.format(",.8r")(d.value) + " lbs");
                //console.log(naicsTable[data[i].naics]);
              } else if(mode == 1) {
                d3.select("#infoTable_Graph" + loc).text(dataTable[i].name + ": " + d3.format(",.8r")(d.value) + " lbs");
              }

              var thisone = i;
              d3.selectAll(".graph" + loc + "Slice").style("opacity", function(d,i) {
                if(i == thisone) {
                  return 1;
                } else {
                  return 0.2;
                }
              })
            })
            .on("mouseout", function(d) {
              d3.selectAll(".graph" + loc + "Slice").style("opacity", 1);
              d3.select("#infoTable_Graph" + loc).text("");
            });


    arcs.append("svg:path")
            .attr("fill", function(d, i) {
              if(mode == 2) {
                // console.log(industryColor.range()[i]);
                return industryColor(i);
              } else if(mode == 1) {
                switch(i) {
                  case 0:
                    return "red";
                    break;
                  case 1:
                    return "green";
                    break;
                  case 2:
                    return "purple";
                    break;
                  case 3:
                    return "blue";
                    break;
                }
              }

            })
            .attr("d", arc);

    arcs.append("svg:text")
          .attr("transform", function(d) {
              d.innerRadius = 0;
              d.outerRadius = r;
              if(!isNaN(arc.centroid(d)[0])) {
              // if(arc.centroid(d)) {
                return "translate(" + arc.centroid(d) + ")";
              } else {
                return "translate(25,25)";
              }
          })
          .attr("text-anchor", "middle")
          .attr("pointer-events", "none")
          .text(function(d, i) {
              if(mode == 2) {
                return (d.endAngle - d.startAngle > 1) ? naicsTable[dataTable[i].naics] : "";
              } else if(mode == 1) {
                return (d.endAngle - d.startAngle > 1) ? dataTable[i].name : "";
              }
          });

    auxSVG.append("text")
        .attr("transform", "translate(10, 140)")
        .attr("id", "infoTable_Graph" + loc)
        .classed("graphChartTable", true)
        .text("");
}
