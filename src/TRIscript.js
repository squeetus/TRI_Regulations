/////////////////////////////////////////////////////////////////////////////
//      
//          TRI Dataset Visualization version 1.1
//          Created by 
//              David Burlinson & Yanli Xu
//
/////////////////////////////////////////////////////////////////////////////       
    
// Globals
var scaleFactor = 1;
var translate = [0,0];
var nodeSize = 2;
var strokeWidth = 0.5;
var facilities = null;
var prevColor = null;

var total = null;
resetTotal();

var width = window.innerWidth - 15,
    height = window.innerHeight - 15,
    height1 = height - 200;
    //active = d3.select(null);

var x_scale = d3.scale.linear().domain([0, width]).range([0, width]);
var y_scale = d3.scale.linear().domain([0, height1]).range([0, height1]);



var zoom = d3.behavior.zoom()
    .scaleExtent([0.75,10])
    .x(x_scale)
    .y(y_scale)
    .on("zoom", zoomHandler)
    .on("zoomstart", zoomstart)
    .on("zoomend", zoomend)
    zoom.scale(1)
    zoom.translate(translate);

var quadtree = d3.geom.quadtree()
    .extent([[-1, -1], [width + 1, height1 + 1]])
    .x(function(d) {
        return d.x;
    })
    .y(function(d) {
        return d.y;
    });

var color = d3.scale.quantize()
    .range(colorbrewer.RdYlGn[9]);

var projection = d3.geo.albersUsa()
    .scale(1500)
    .translate([width / 2, height1 / 2]);

var path = d3.geo.path()
    .projection(projection);

//var svg = d3.select("#container").append("svg")
var svg = d3.select("#map")
    .attr("class", "map")
    .attr("width", width)
    .attr("height", height1);
        
svg.call(zoom);

svg.append("rect")
    .attr("class", "background")
    .attr("width", width)
    .attr("height", height1);
    //.on("click", reset);

var g = svg.append("g")
    .style("stroke-width", "1.5px");
   
var g1 = svg.append("g")
    .style("stroke-width", "1.5px");
    
   
/////////////////////////////////////////////////////////////////////////////
//      
//          U S A
//
/////////////////////////////////////////////////////////////////////////////
    
d3.json("/TRI/project2/data/us.json", function(error, us) {
  g.selectAll("path")
      .data(topojson.feature(us, us.objects.states).features)
    .enter().append("path")
      .attr("d", path)
      .attr("class", "feature");
      //.on("click", clicked);
    
    //Counties
//    g.insert("path", ".graticule")
//      .datum(topojson.mesh(us, us.objects.counties, function(a, b) { return a !== b && !(a.id / 1000 ^ b.id / 1000); }))
//      .attr("class", "countyMesh")
//      .attr("d", path);
  
    g.append("path")
      .datum(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; }))
      .attr("class", "stateMesh")
      .attr("d", path);
});



    
/////////////////////////////////////////////////////////////////////////////
//      
//          F A C I L I T I E S
//
/////////////////////////////////////////////////////////////////////////////    
    
d3.json("/TRI/project2/data/facilities.json", function(error, f) {
    //console.log(error);
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
    
    g1.selectAll(".node")
        .data(nodes(quadtree))
      .enter().append("rect")
        .attr("class", "node")
        .attr("x", function(d) { return d.x; })
        .attr("y", function(d) { return d.y; })
        .attr("width", function(d) { return d.width; })
        .attr("height", function(d) { return d.height; });

    facilities = g1.selectAll(".facility")
        .data(arr)
      .enter().append("circle")
        .attr("class", "facility")
        .attr("fill", function(d, i) { return color(d.colorIndex); }) 
        .attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; })
        .attr("r", nodeSize)
        .attr("stroke-width", strokeWidth)
        .attr("id", function(d) {return "f" + d.facilityName;})
        .on("mouseover", hover)
        .on("mouseout", out)
        .call(zoom);

});  

/////////////////////////////////////////////////////////////////////////////
//      
//          B R U S H
//
///////////////////////////////////////////////////////////////////////////// 

//var brush = svg.append("g")
//      .attr("class", "brush")
//      .call(d3.svg.brush()
//        .x(d3.scale.identity().domain([0, width]))
//        .y(d3.scale.identity().domain([0, height]))
//        .on("brush", brushed);

var brush = d3.svg.brush()
    //.x(d3.scale.identity().domain([0, width]))
    //.y(d3.scale.identity().domain([0, height]))
    .x(zoom.x())
    .y(zoom.y())
    //.extent([[100, 100], [200, 200]])
    .on("brush", brushed)
    .on("brushstart", brushstart)
    .on("brushend", brushend);

svg.append("g")
    .attr("class", "brush")
    .call(brush);



/////////////////////////////////////////////////////////////////////////////
//      
//          L I N E   G R A P H
//
///////////////////////////////////////////////////////////////////////////// 

function lineGraph(d) {
    d3.select("#key")
        .style("opacity", 1);
    
    var graph = d3.select("#graph")
        //.attr("id", "graph")
        .attr("width", width)
        .attr("height", 200);
        
    graph.selectAll("*").remove();
        
    var xScale = d3.scale.linear().range([100, width-50]).domain([1986, 2013]),
        
    yScale = d3.scale.linear().range([200-25, 25]).domain(
        [
            Math.min(d3.min(d.releases), d3.min(d.recycling), d3.min(d.recovery), d3.min(d.treatment)),
            Math.max(d3.max(d.releases), d3.max(d.recycling), d3.max(d.recovery), d3.max(d.treatment))
        ]),
                        
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
        .attr("transform", "translate(" + (100) + ",0)")
        .call(yAxis);
    var lineGen = d3.svg.line()
        .x(function(d,i) {
            return xScale(i + 1986);
        })
        .y(function(d) {
            return yScale(d);
        })
        .interpolate("linear");
    
    // Add a y-axis label.
    graph.append("text")
        .attr("class", "y label")
        .attr("text-anchor", "end")
        .attr("y", 6)
        .attr("dy", ".75em")
        .attr("transform", "rotate(-90)")
        .text("Chemical Usage (lbs)");
    
    graph.append('svg:path')
        .attr('d', lineGen(d.releases))
        .attr('stroke', 'red')
        .attr('stroke-width', 3)
        .attr('fill', 'none');
    graph.append('svg:path')
        .attr('d', lineGen(d.recycling))
        .attr('stroke', 'green')
        .attr('stroke-width', 3)
        .attr('fill', 'none');
   graph.append('svg:path')
        .attr('d', lineGen(d.treatment))
        .attr('stroke', 'purple')
        .attr('stroke-width', 3)
        .attr('fill', 'none');
   graph.append('svg:path')
        .attr('d', lineGen(d.recovery))
        .attr('stroke', 'lightblue')
        .attr('stroke-width', 3)
        .attr('fill', 'none');
}
    
/////////////////////////////////////////////////////////////////////////////
//      
//          M E T H O D S
//
/////////////////////////////////////////////////////////////////////////////
    
function hover(d) {
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
    prevColor = d3.select(this).style("fill");
    d3.select(this)
        .style("fill", "white");
//        .attr("r", function(d) {
//                console.log(d);
//                return this.r.animVal.value/scaleFactor} //rather than nodeSize
//             );
    
    lineGraph(d);
 
    showData(dataDiv, d);
}
        
function out() { 
    d3.select(this)
        .style("fill", prevColor);
    
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
    
var g1 = svg.append("g")
    .style("stroke-width", "1.5px");

function brushstart() {
    facilities.each(function(d) { d.scanned = d.selected = false; });
}

function brushed() {
    var these = d3.select(null);
    var extent = brush.extent();
    facilities.each(function(d) { d.scanned = d.selected = false; });
    //these.each(function(d) { d.scanned = d.selected = false; });
    search(quadtree, extent[0][0], extent[0][1], extent[1][0], extent[1][1]);
    facilities.classed("brushed", function(d) { return d.selected; } );
    
    facilities.each(function(d, i) {
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
}

function brushend() {
    facilities.each(function(d) { d.scanned = d.selected = false; });
    resetTotal();
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


function zoomstart() { 
     if (event.shiftKey) 
         d3.select("#graph")
            .style("opacity", 0);
}
        
function zoomHandler() {
    
    
    if (event.shiftKey) {
        d3.select(".brush")
            .style("display", "block"); 
         d3.select("#graph")
            .style("opacity", 1);
        zoom.translate(translate);
        zoom.scale(scaleFactor);
    }
    else {
        d3.select("#graph")
            .style("opacity", 0);
        translate = d3.event.translate;
        scaleFactor = d3.event.scale;
        d3.select(".brush")
            .style("display", "none"); 
        brush.clear();
    }
    
    
    g1.attr("transform", "translate(" + translate + ")scale(" + scaleFactor + ")");
    g.attr("transform", "translate(" + translate + ")scale(" + scaleFactor + ")");
    facilities.attr("r", nodeSize/scaleFactor );
    facilities.attr("stroke-width", strokeWidth/scaleFactor);
}
    
function zoomend() {  
    
}

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
    
function reset() {
//    scaleFactor = 1;
//    translate = [0,0];
//    zoom.scale(1);
//    zoom.translate([0,0]);
//    svg.attr("transform", "translate(" + zoom.translate() + ")scale(" + zoom.scale() + ")");
    
    facilities.attr("fill", "black").attr("r", nodeSize/scaleFactor).attr("opacity", "1");
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

d3.select("body").on( 'keydown', function () { 
    if ( d3.event.keyCode === 32 ) { 
        reset();
    }
    
    if ( d3.event.keyCode === 16 ) { 
        d3.selectAll(".brush").call(brush.clear());
        d3.select(".brush")
            .style("display", "block"); 
        
    }
    
}); 


    