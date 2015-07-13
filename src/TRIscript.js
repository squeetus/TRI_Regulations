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

function Queue(){var a=[],b=0;this.getLength=function(){return a.length-b};this.isEmpty=function(){return 0==a.length};this.enqueue=function(b){a.push(b)};this.dequeue=function(){if(0!=a.length){var c=a[b];2*++b>=a.length&&(a=a.slice(b),b=0);return c}};this.peek=function(){return 0<a.length?a[b]:void 0}};

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
var stateLines = null;                                                      // size variable for stateLines
var brushing = false;                                                       // is the user currently brushing (sentinel)
var selectingState = false;                                                 // is the user currently selecting a state (sentinel)
var selectedState = null;                                                   // selected state id
var selectedStates = {                                                      // selected state ids (for multiple select)
    "array": [],
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

var toolContext = "select";                                                 // context of interaction (select, brush)
var total = null; resetTotal();                                             // create and initialize total
var width = window.innerWidth - 15,                                         // width and height values
    height = window.innerHeight - 15,
    height1 = height - 200;
var x_scale = d3.scale.linear().domain([0, width]).range([0, width]);       // X and Y scales for line chart
var y_scale = d3.scale.linear().domain([0, height1]).range([0, height1]);   //

var releasesLine, recoveryLine, treatmentLine, recyclingLine;
releasesLine = recoveryLine = treatmentLine = recyclingLine = null;

//var compareStack = [];
//var compareQueue = new Queue();
var compareList = {
    "data": [],
    "add": function(stuff) {
        if(this.length < 10) {
            this.data[this.length] = stuff;
            this.length++;
            this.pos = ((this.length - 1) >= 0) ? this.length - 1 : 0;
        } else {
            this.length = 1;
            this.pos = 0;
            this.data[0] = stuff;
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
    .scaleExtent([0.75,100])
    .x(x_scale)
    .y(y_scale)
    .on("zoom", zoomHandler)
    .on("zoomstart", zoomstart)
    .on("zoomend", zoomend)
    zoom.scale(1)
    zoom.translate(translate);

// Quadtree for facility mapping
var quadtree = d3.geom.quadtree()
    .extent([[-1, -1], [width + 1, height1 + 1]])
    .x(function(d) {
        return d.x;
    })
    .y(function(d) {
        return d.y;
    });

// Color scale for facilities
var color = d3.scale.quantize()
    .range(colorbrewer.RdYlGn[9]);

// ALBERSUSA projection function
var projection = d3.geo.albersUsa()
    .scale(1500)
    .translate([width / 2, height1 / 2]);

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

// Facility Layer
var quadTreeLayer = svg.append("g")
    .style("stroke-width", "1.5px");

// Background rectangle
var backgroundRect = quadTreeLayer.append("rect")
    .attr("class", "background")
    .attr("width", width)
    .attr("height", height1)
    .on("click", clickedBackground);


function clickedBackground() {
//    console.log("clickedBackground");
    resetTotal();
    lineGraph(total);
    clearFacilities();
    clearState();
};

function reorderLayers() {
    console.log("reorder layers");
    //backgroundLayer.moveToFront();
    usaLayer.moveToFront();
    quadTreeLayer.moveToFront();
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
//    console.log("zoomstart");
     if (toolContext == ("brush") && event.shiftKey)
         d3.select("#graph")
            .style("opacity", 0);
}

function zoomHandler() {

    if (toolContext == ("brush") && event.shiftKey) {
        d3.select(".brush")
            .style("display", "block");
        d3.select("#graph")
            .style("opacity", 1);
        d3.select("#key")
            .style("opacity", 1);
        zoom.translate(translate);
        zoom.scale(scaleFactor);
    } else if(toolContext == ("brush")) {
        d3.select(".brush")
            .style("display", "none");

        translate = d3.event.translate;
        scaleFactor = d3.event.scale;
    } else {
        clearBrush();
        translate = d3.event.translate;
        scaleFactor = d3.event.scale;
//        d3.select(".brush")
//            .style("display", "none");
//        brush.clear();
    }


    quadTreeLayer.attr("transform", "translate(" + translate + ")scale(" + scaleFactor + ")");
    usaLayer.attr("transform", "translate(" + translate + ")scale(" + scaleFactor + ")");
    fac.attr("r", nodeSize/scaleFactor );
    fac.attr("stroke-width", strokeWidth/scaleFactor);
    stateLines.attr("stroke-width", (strokeWidth*2)/scaleFactor);
}

function zoomend() {
    if(toolContext == ("brush") && !event.shiftKey) {
        clearEffects();
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
        resetTotal();
        states.classed("fade", false);
        fac.classed("fade", function(d) { d.state == thisState ? false : true; });
        fac.classed("selected", function(d) { d.state == thisState ?  true : false; });
        fac.each(function(d, i) { if(d.state == thisState) {removeFacilityFromTotal(d, i); } });
        //lineGraph(total);
        hideGraph();

        selectedState = null;
        selectedStates.remove(thisState);
        // console.log(selectedStates.array);

    } else {
        resetTotal();
        selectedState = thisState;
        selectedStates.add(thisState)
        // console.log(selectedStates.array);

        states.classed("fade", function(d) { return d.id != thisState;  });
        fac.classed("fade", function(d) { return d.state != thisState; });
        fac.classed("selected", function(d) { return d.state == thisState; });
        fac.each(function(d, i) { if(d.state == thisState) {addFacilityToTotal(d, i); } });
        lineGraph(total);
        compareList.add(copyTotal());
        updateList();
    }
}

function addState(d) {
  //console.log("adding state");
    var thisState = d.id;

    if(selectedStates.contains(thisState)) {
        // console.log("already selected: ", selectedStates.array);

        selectedStates.remove(thisState);
        // console.log("removing...", thisState, selectedStates.array);

        //Last value in selectedStates
        if(selectedStates.array.length <= 0) {
          // console.log("LAST STATE, NO FADE");
          states.classed("fade", false);
          fac.classed("fade", false);
          fac.classed("selected", false);
          selectedState = null;
          resetTotal();
          hideGraph();
        // Still some selected states...
        } else {
          // console.log("STILL STATES..", selectedStates.array);
          states.classed("fade", function(d) { return !selectedStates.contains(d.id); });
          // fac.classed("fade", function(d) { selectedStates.contains(d.state) ? false : true; });
          // fac.classed("selected", function(d) { selectedStates.contains(d.state) ?  true : false; });
          fac.classed("fade", function(d) { return !selectedStates.contains(d.state); });
          fac.classed("selected", function(d) { return selectedStates.contains(d.state); });
          fac.each(function(d, i) { if(d.state == thisState) { removeFacilityFromTotal(d, i); } });
          lineGraph(total);
          compareList.add(copyTotal());
          updateList();

        }

    } else {
        //console.log("not selected: ", selectedStates.array);
        // resetTotal();
        selectedStates.add(thisState);
        // console.log("adding.. ", thisState, selectedStates.array);

        states.classed("fade", function(d) { return !selectedStates.contains(d.id);  });
        fac.classed("fade", function(d) { return !selectedStates.contains(d.state); });
        fac.classed("selected", function(d) { return selectedStates.contains(d.state); });
        fac.each(function(d, i) { if(d.state == thisState) { addFacilityToTotal(d, i); } });
        lineGraph(total);
        compareList.add(copyTotal());
        updateList();
    }
}

function clearState() {
    selectedState = null;
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
    var x, y;
    var domain = [];
    var flag = true;
    var totalRelease, totalTreatment, totalRecycling, totalRecovery, totals;

    for(facility in f.facilities) {
        if(projection([f.facilities[facility].long, f.facilities[facility].lat]) == null) {
            f.facilities[facility].x = f.facilities[facility].y = null;
        } else {
            f.facilities[facility].x = projection([f.facilities[facility].long, f.facilities[facility].lat])[0];
            f.facilities[facility].y = projection([f.facilities[facility].long, f.facilities[facility].lat])[1];

            totalRecovery = totalRecycling = totalTreatment = totals = totalRelease = 0;

            var badYears = 0;
            for(i = 0; i < 27; i++) {
                totalRelease += f.facilities[facility].releases[i];
                totalTreatment += f.facilities[facility].treatment[i];
                totalRecycling += f.facilities[facility].recycling[i];
                totalRecovery += f.facilities[facility].recovery[i];
            }
            totals += totalRelease + totalTreatment + totalRecycling + totalRecovery;

            if(totals > 0)
                totals = totalRelease / totals;

            f.facilities[facility].colorIndex = totals;
            domain.push(totals);
            arr.push(f.facilities[facility]);
        }
    }
     color.domain([d3.max(domain), d3.mean(domain), d3.min(domain)])
//console.log(d3.extent(domain));

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
    fac = usaLayer.selectAll(".facility")
        .data(arr)
      .enter().append("circle")
        .attr("class", "facility")
        .attr("fill", function(d, i) { return color(d.colorIndex); })
        .attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; })
        .attr("r", nodeSize)
        .attr("stroke-width", strokeWidth)
        //.attr("id", function(d) {return "f" + d.facilityName;})
        .each(function(d) { d.id = "f" + d.facilityName; })
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

    d3.select("#graph")
            .style("opacity", 1);

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
    compareList.add(copyTotal());
    updateList();

    //Show data div
    showData(dataDiv, d);
}

function out() {
    if(selectedState || !selectedStates.empty())
        return;

    d3.select(this)
        .classed("brushed", false);

    showData(null, null);
    d3.select("#graph").selectAll("*").remove();

    d3.select("#key")
        .style("opacity", 0);
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

    hideGraph();
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
//    console.log("brushstart");
    brushing = true;
//    facilities.each(function(d) { d.scanned = d.selected = false; });
    clearFacilities();
//    resetTotal();
//    lineGraph(total);
}


function brushed() {
    console.log("brushed");
}

function brushend() {

    if(!event.shiftKey) {
        brushing = false;
        brush.clear();
        usaLayer.moveToFront();
        quadTreeLayer.moveToFront();
        brushLayer.moveToFront();

        return;
    }

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

    if(total.contains.length < 1) {
        resetTotal();
    }


    lineGraph(total);
    compareList.add(copyTotal());
    updateList();
    //console.log("brushend");
    brushing = false;
    brush.clear();
    usaLayer.moveToFront();
    quadTreeLayer.moveToFront();
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

    hideGraph();
}



/////////////////////////////////////////////////////////////////////////////
//
//          L I N E   G R A P H
//
//          A N D
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
}

d3.select("#keyReleases").on("click", function() { updateKey(1); });
d3.select("#keyRecycling").on("click", function() { updateKey(2); });
d3.select("#keyTreatment").on("click", function() { updateKey(3); });
d3.select("#keyRecovery").on("click", function() { updateKey(4); });

function updateKey(id) {

    if(keySelected[id].value) {
      keySelected[id].value = false;
      d3.select("#key" + keySelected[id].name).classed("deselected", true);

      switch(id) {
        case 1:
          releasesLine.classed("deselected", true);
          break;
        case 2:
          recyclingLine.classed("deselected", true);
          break;
        case 3:
          treatmentLine.classed("deselected", true);
          break;
        case 4:
          recoveryLine.classed("deselected", true);
          break;
      }
    } else {
      keySelected[id].value = true;

      d3.select("#key" + keySelected[id].name).classed("deselected", false);

      switch(id) {
        case 1:
          releasesLine.classed("deselected", false);
          break;
        case 2:
          recyclingLine.classed("deselected", false);
          break;
        case 3:
          treatmentLine.classed("deselected", false);
          break;
        case 4:
          recoveryLine.classed("deselected", false);
          break;
      }
    }

}

function lineGraph(d) {
    //console.log(d);

    d3.select("#key")
        .style("opacity", 1);




    var graph = d3.select("#graph")
        //.attr("id", "graph")
        .attr("x", 150)
        .attr("width", width-100)
        .attr("height", 200)
        .attr("opacity", 1);

    graph.selectAll("*").remove();

    var xScale = d3.scale.linear().range([144, width-100]).domain([1987, 2014]),

    yScale = d3.scale.linear().range([200-25, 25]).domain(
        [
            Math.min(d3.min(d.releases), d3.min(d.recycling), d3.min(d.recovery), d3.min(d.treatment)),
            Math.max(d3.max(d.releases), d3.max(d.recycling), d3.max(d.recovery), d3.max(d.treatment))
        ]),

    legendScale = d3.scale.linear().range([0, 75]).domain([0, 100,000,000]).clamp(true),

    xAxis = d3.svg.axis()
        .scale(xScale)
        .tickFormat(d3.format("####")),

    yAxis = d3.svg.axis()
        .scale(yScale)
        .orient("left");

    graph.append("svg:g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + (200 - 25) + ")")
        .call(xAxis);
    graph.append("svg:g")
        .attr("class", "y axis")
        .attr("transform", "translate(" + (150) + ",0)")
        .call(yAxis);
    var lineGen = d3.svg.line()
        .x(function(d,i) {
            return xScale(i + 1987);
        })
        .y(function(d) {
            return yScale(d);
        })
        .interpolate("linear");

    // Add a y-axis label.
    graph.append("text")
        .attr("class", "y label")
        .attr("text-anchor", "end")
        .attr("y", function() {
//            console.log(yScale.domain()[1], 60 - legendScale(yScale.domain()[1]));
            return 100 - legendScale(yScale.domain()[1]); })
        .attr("dy", ".75em")
        .attr("transform", "rotate(-90)")
        .text("Chemical Usage (lbs)");

    releasesLine = graph.append('svg:path')
        .attr('d', lineGen(d.releases))
        .attr('stroke', 'red')
        .attr('stroke-width', 3)
        .attr('fill', 'none')
        .classed('deselected', function(d) {
            return !keySelected[1].value
        });
    recyclingLine = graph.append('svg:path')
        .attr('d', lineGen(d.recycling))
        .attr('stroke', 'green')
        .attr('stroke-width', 3)
        .attr('fill', 'none')
        .classed('deselected', function(d) {
            return !keySelected[2].value
        });;
   treatmentLine = graph.append('svg:path')
        .attr('d', lineGen(d.treatment))
        .attr('stroke', 'purple')
        .attr('stroke-width', 3)
        .attr('fill', 'none')
        .classed('deselected', function(d) {
            return !keySelected[3].value
        });;
   recoveryLine = graph.append('svg:path')
        .attr('d', lineGen(d.recovery))
        .attr('stroke', 'blue')
        .attr('stroke-width', 3)
        .attr('fill', 'none')
        .classed('deselected', function(d) {
            return !keySelected[4].value
        });;

    showGraph();
    //compareList.add(copyTotal());
//    compareStack.push(copyTotal());
//    updateList();
}

function resetTotal() {
    total = {
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

function hideGraph() {
//    console.log("hidegraph");
    d3.select("#graph")
        .style("opacity", 0);
    d3.select("#key")
        .style("opacity", 0);
}

function showGraph() {
//    console.log("hidegraph");
    d3.select("#graph")
        .style("opacity", 1);
    d3.select("#key")
        .style("opacity", 1);
}



/////////////////////////////////////////////////////////////////////////////
//
//          S T A C K
//
/////////////////////////////////////////////////////////////////////////////

var stackLayer = d3.select("#stack").append("g");

function updateList() {
    var listContents = stackLayer.selectAll("rect")
      .data(compareList.data)
        .classed("listEleCurr", function(d, i) { return i == compareList.pos; })

    listContents.enter().append("rect")
        .attr("opacity", 0)
        .attr("x", 5)
        .attr("y", function(d, i) { return 180 - (12 * i); })
        .attr("width", "30px")
        .attr("height", "10px")
        .classed("listEle", true)
        //
        .attr("id", function(d, i) { return i; })
        .on("click", function(d, i) {
//            console.log(i, compareStack[i]);
            lineGraph(compareList.data[i]);
        });

    listContents.transition().duration(2000)
        .attr("opacity", 1);

    listContents.exit().transition().duration(1500).attr("opacity", 0).remove();
}

//function clearStack() {
//    compareStack = [];
//    updateStack();
//}

function clearList() {
    stackLayer.selectAll("*").remove();
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

    d3.select("#graph")
        .style("opacity", 0);
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
}



function bindKeys() {

    d3.select("body").on( 'keydown', function () {
        // SPACE
        if ( d3.event.keyCode === 32 ) {
            //reorderLayers();

            clearBrush();
            clearState();
            d3.select("#graph")
                .style("opacity", 0);

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
            usaLayer.moveToFront();
            quadTreeLayer.moveToFront();
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
            clearEffects();
            console.log("THREE");
        }
        // FOUR
        if ( d3.event.keyCode === 52) {
//            clearStack();
            clearList();
            hideGraph();
            popupTooltip("clear list");

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
