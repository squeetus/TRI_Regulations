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
var stateRatios = {};                                                       // state ratios for coloring
var stateLines = null;                                                      // size variable for stateLines
var brushing = false;                                                       // is the user currently brushing (sentinel)
var selectingState = false;                                                 // is the user currently selecting a state (sentinel)
var selectedState = null;                                                   // selected state id
var toolContext = "select";                                                 // context of interaction (select, brush)
var total = null; resetTotal();                                             // create and initialize total
var width = window.innerWidth - 15,                                         // width and height values
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

var selectedStates = {                                                      // selected state ids (for multiple select)
    "array": [],
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
    .on("zoom", zoomHandler)
    .on("zoomstart", zoomstart)
    .on("zoomend", zoomend)
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
var color = d3.scale.quantize()
    .range(colorbrewer.RdYlGn[9]);

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
//          T O O L T I P
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
    .attr("height", height) //###
    .on("click", clickedBackground);


function clickedBackground() {
//    console.log("clickedBackground");
    resetTotal();
    lineGraph(total);
    clearFacilities();
    clearState();
    currentComparison = null;
    largerYScale = [0,0];

    fac.classed("clickThrough", false);

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
//function scaleTranslateLayers(scale, trans) {
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
//}



/////////////////////////////////////////////////////////////////////////////
//
//          Z O O M   E V E N T S
//
/////////////////////////////////////////////////////////////////////////////

function zoomstart() {
     currentComparison = null;
     fac.on("mouseover", null);
}

function zoomHandler() {
    clearBrush();
    translate = d3.event.translate;
    scaleFactor = d3.event.scale;

    quadTreeLayer.attr("transform", "translate(" + translate + ")scale(" + scaleFactor + ")");
    usaLayer.attr("transform", "translate(" + translate + ")scale(" + scaleFactor + ")");
    facilityLayer.attr("transform", "translate(" + translate + ")scale(" + scaleFactor + ")");
    fac.attr("r", nodeSize/scaleFactor );
    fac.attr("stroke-width", strokeWidth/scaleFactor);
    stateLines.attr("stroke-width", (strokeWidth*2)/scaleFactor);
}

function zoomend() {
    // Worth only updating facilityLayer for performance?
    //facilityLayer.attr("transform", "translate(" + translate + ")scale(" + scaleFactor + ")");

    fac.on("mouseover", hover);

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
      .on("click", function(d) {
        if (d3.event.defaultPrevented) return;
        clickedState(d);
      });
//        .on("dblclick", dblClickedState);

    //Counties
    //    usaLayer.insert("path", ".graticule")
    //      .datum(topojson.mesh(us, us.objects.counties, function(a, b) { return a !== b && !(a.id / 1000 ^ b.id / 1000); }))
    //      .attr("class", "countyMesh")
    //      .attr("d", path);

    stateLines = usaLayer.append("path")
      .datum(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; }))
      .attr("class", "stateMesh")
      .attr("d", path)
      .attr("stroke-width", strokeWidth*2);

});


function clickedState(d) {
    showGraph(1);
    if(event.shiftKey)
      addState(d);
    else
      highlightState(d);


    // SCALE TO BOUNDING BOX?
//     var bounds = path.bounds(d),
//      dx = bounds[1][0] - bounds[0][0],
//      dy = bounds[1][1] - bounds[0][1],
//      x = (bounds[0][0] + bounds[1][0]) / 2,
//      y = (bounds[0][1] + bounds[1][1]) / 2,
//      scaleFactor = .9 / Math.max(dx / width, dy / height),
//      translate = [width / 2 - scaleFactor * x, height / 2 - scaleFactor * y];
////
      //  scaleTranslateLayers(scaleFactor, translate);
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

        states.classed("fade", function(d) { return d.id != thisState;  });
        fac.classed("fade", function(d) { return d.state != thisState; });
        fac.classed("selected", function(d) { return d.state == thisState; });
        fac.each(function(d, i) { if(d.state == thisState) {addFacilityToTotal(d, i); } });
        lineGraph(total);
        //compareList.add(new comparison( thisState, "states", copyTotal(), selectedStates.array));
        //updateList();
        currentComparison = new comparison( thisState, "states", copyTotal(), selectedStates.array);
    }
}

function addState(d) {

  //console.log("adding state");
    var thisState = d.id;

    if(selectedStates.contains(thisState)) {

        //console.log("already selected: ", selectedStates.array);

        selectedStates.remove(thisState);
        //console.log("removing...", thisState, selectedStates.array);

        //Last value in selectedStates
        if(selectedStates.array.length <= 0) {
          selectingState = false;
          fac.classed("clickThrough", false);
          // console.log("LAST STATE, NO FADE");
          states.classed("fade", false);
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

        // Still some selected states...
        } else {
          // console.log("STILL STATES..", selectedStates.array);
          states.classed("fade", function(d) { return !selectedStates.contains(d.id); });
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

          lineGraph(total);

          // TODO: Set this up to show a list of the states in the selection?
          if(selectedStates.array.length == 1)
            currentComparison = new comparison( thisState, "states", copyTotal(), selectedStates.array);
          else
            currentComparison = new comparison( "multiple states", "states", copyTotal(), selectedStates.array);
          // compareList.add(new comparison( "multiple states", "states", copyTotal(), selectedStates.array));
          // updateList();
        }

    } else {
        selectingState = true;
        fac.classed("clickThrough", true);
        selectedStates.add(thisState);
        // console.log("adding.. ", thisState, selectedStates.array);

        states.classed("fade", function(d) { return !selectedStates.contains(d.id);  });
        fac.classed("fade", function(d) { return !selectedStates.contains(d.state); });
        fac.classed("selected", function(d) { return selectedStates.contains(d.state); });
        fac.each(function(d, i) { if(d.state == thisState) { addFacilityToTotal(d, i); } });

        //console.log("should be different; cgd1 not updated yet.", currentGraphData1.releases, total.releases);

        lineGraph(total);

        if(selectedStates.array.length == 1)
          currentComparison = new comparison( thisState, "states", copyTotal(), selectedStates.array);
        else
          currentComparison = new comparison( "multiple states", "states", copyTotal(), selectedStates.array);
        // compareList.add(new comparison("multiple states", "states", copyTotal(), selectedStates.array));
        // updateList();
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

    var arr = [];
    var x, y, s;
    var domain = [];
    var stateDomain = [];
    stateRatios = {};
    var flag = true;
    var totalRelease, totalTreatment, totalRecycling, totalRecovery, totals;

    for(facility in f.facilities) {
        if(projection([f.facilities[facility].long, f.facilities[facility].lat]) == null) {
            f.facilities[facility].x = f.facilities[facility].y = null;
        } else {
            f.facilities[facility].x = projection([f.facilities[facility].long, f.facilities[facility].lat])[0];
            f.facilities[facility].y = projection([f.facilities[facility].long, f.facilities[facility].lat])[1];

            totalRecovery = totalRecycling = totalTreatment = totals = totalRelease = 0;

            //var badYears = 0; ??
            for(i = 0; i < 27; i++) {
                totalRelease += f.facilities[facility].releases[i];
                totalTreatment += f.facilities[facility].treatment[i];
                totalRecycling += f.facilities[facility].recycling[i];
                totalRecovery += f.facilities[facility].recovery[i];
            }
            totals += totalRelease + totalTreatment + totalRecycling + totalRecovery;

            // update state information
            s = f.facilities[facility].state;
            if(s) {
              if(stateRatios.hasOwnProperty(s)) {
                stateRatios[s].totalRelease += totalRelease;
                stateRatios[s].totalTreatment += totalTreatment;
                stateRatios[s].totalRecycling += totalRecycling;
                stateRatios[s].totalRecovery += totalRecovery;
                stateRatios[s].total += totals;
                stateRatios[s].numFacilities++;
                //stateRatios[s].ratio = (stateRatios[s].totalRelease / stateRatios[s].total) / stateRatios[s].numFacilities;
                // stateRatios[s].ratio = (stateRatios[s].totalRelease / stateRatios[s].total);
                stateRatios[s].ratio = stateRatios[s].totalRelease / (stateRatios[s].totalRecovery + totalTreatment + totalRecycling);

              } else {
                stateRatios[s] = {
                  "totalRelease": totalRelease,
                  "totalTreatment": totalTreatment,
                  "totalRecycling": totalRecycling,
                  "totalRecovery": totalRecovery,
                  "total": totals,
                  //"ratio": totalRelease / totals,
                  "ratio": totalRelease / (totals - totalRelease),
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
    }

    var tmp = []; // tmp!!! number of facs in each state
    for(state in stateRatios) {
        stateDomain.push(stateRatios[state].ratio);
        //tmp.push({"state": state, "numFac": stateRatios[state].numFacilities});
        tmp.push(stateRatios[state].numFacilities);
    }

    //console.log(tmp);
    console.log(stateRatios[2]);
    console.log(stateDomain.sort());
    console.log(d3.max(stateDomain), d3.min(stateDomain), d3.mean(stateDomain), d3.median(stateDomain), d3.extent(stateDomain));
    //console.log(stateDomain;

    stateColor.domain([d3.max(stateDomain), d3.mean(stateDomain), d3.min(stateDomain)]);
    color.domain([d3.max(domain), d3.mean(domain), d3.min(domain)]);

    states.style("fill", function(d) {
        if (stateRatios[d.id])
          return stateColor(stateRatios[d.id].ratio);
        else {
          return "tan";
        }
    });

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
        .attr("fill", function(d, i) { return color(d.colorIndex); })
        .attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; })
        .attr("r", nodeSize)
        .attr("stroke-width", strokeWidth)
        .attr("id", function(d, i) {return "f" + i;})
        //.each(function(d) { d.id = "f" + d.facilityName; })
        .each(function(d, i) { d.id = "f" + i; })
        .on("mouseover", hover)
        .on("mouseout", out)
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
    lineGraph(total);
    // compareList.add(new comparison(d.facilityName, "facility", copyTotal(), d.id));
    // updateList();
    currentComparison = new comparison( d.facilityName, "facility", copyTotal(), d.id);

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
        info += "Facility Name: " + d.facilityName + "<br />";
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


    lineGraph(total);
    showGraph(1);
    // TODO: rather than a selection of brushed facilities, just pass brush extent and re-draw brush with that extent.
    currentComparison = new comparison( "Brushed Region", "brush", copyTotal(), brushedFac);

    brushing = false;

    usaLayer.moveToFront();
    quadTreeLayer.moveToFront();
    facilityLayer.moveToFront();
    brushLayer.moveToFront();
}


function clearBrush() {
//    console.log("clearing brush");
    d3.select(".brush")
        .style("display", "none");
    d3.selectAll(".brush").call(brush.clear());
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
    "reset": resetKey
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

}

/////////////////////////////////////////////////////////////////////////////
//
//          L I N E   G R A P H
//
/////////////////////////////////////////////////////////////////////////////

function initializeLineGraphs() {

  graph1 = d3.select("#graph1")
    .attr("width", width-50)
    .attr("height", 150)
    .attr("opacity", 0)
    .on("mouseover", graphHover)
    .on("mousemove", graphMove)
    .on("mouseout", graphOut);

  graph2 = d3.select("#graph2")
      .attr("x", 150)
      .attr("width", width-100)
      .attr("height", 150)
      .attr("opacity", 1)
      .on("mouseover", graphHover)
      .on("mousemove", graphMove)
      .on("mouseout", graphOut);

  var xScale = d3.scale.linear().range([144, width-100]).domain([1987, 2013]).clamp(true);
  var yScale = d3.scale.linear().range([150-25, 25]).domain([0,0]);
  var legendScale = d3.scale.linear().range([0, 75]).domain([0, 100,000,000]).clamp(true);

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
        .tickSize(width-250, 0)
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
      yGrid: yGrid
    }
}

function graphHover() {
  if(d3.select("#graph1").style("opacity") > 0)
    d3.select("#graphLine")
      .classed("hidden", false);
}

function graphOut() {
  d3.select("#graphLine")
      .classed("hidden", true);
}

// var graphHoverRectangle = d3.select("#graphs").append("path").attr("class", "area");
var graphHoverRectangle = d3.select("#graphLine").append("svg:rect").attr("class", "area");
var graphHoverRectangle2 = d3.select("#graphLine").append("svg:rect").attr("class", "area");


function graphMove() {
  if(d3.select("#graph1").style("opacity") == 0)
    return;

  var m = d3.mouse(this),
   thisYear = Math.floor(graphs.xScale.invert(m[0]));
  var bounds = [
    Math.floor(graphs.xScale(thisYear)),
    Math.floor(graphs.xScale(thisYear+1))
  ]


  if(bounds[0] != graphHoverRectangle.attr("x")) {

    graphHoverRectangle
        .attr("x", function() { return bounds[0]; })
        .attr("y", 25)
        .attr("width", bounds[1]-bounds[0])
        .attr("height", 150)

    //INFORMATION FROM LINEGRAPH hover
    if(currentComparison)
      console.log({
          "year": thisYear,
          "releases": currentComparison.data.releases[thisYear-1987],
          "recycling": currentComparison.data.recycling[thisYear-1987],
          "treatment": currentComparison.data.treatment[thisYear-1987],
          "recovery": currentComparison.data.recovery[thisYear-1987]
      });


    if(showingGraphTwo) {
        console.log({
            "year": thisYear,
            "releases": compareList.data[compareList.pos].data.releases[thisYear-1987],
            "recycling": compareList.data[compareList.pos].data.recycling[thisYear-1987],
            "treatment": compareList.data[compareList.pos].data.treatment[thisYear-1987],
            "recovery": compareList.data[compareList.pos].data.recovery[thisYear-1987]
        });
        graphHoverRectangle2
          .classed("hidden", false);

        graphHoverRectangle2
            .attr("x", function() { return bounds[0]; })
            .attr("y", 175)
            .attr("width", 32)
            .attr("height", 150)
    } else {
        graphHoverRectangle2
          .classed("hidden", true);
    }
  }
}

function lineGraph(d, id) {
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
              reSelect(d);
            } else {
              showingGraphTwo = true;
              showGraph(2);
              lineGraph(d.data, 2);
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
            clearEffects();
            brushLayer.moveToFront();
            d3.selectAll(".brush").call(brush.clear());
            d3.select(".brush")
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
            console.log(currentComparison, compareList.data);
            // resetTotal()
            // lineGraph(total, 1);
            // lineGraph(total, 2);
            // hideGraph(1);
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
