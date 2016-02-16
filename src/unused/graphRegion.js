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
