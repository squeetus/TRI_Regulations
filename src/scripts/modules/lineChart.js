
define( [ "css!style/lineChart" ], function() {

  function init (config) {
    var data, domain, range, width, height;
    var defaultData = [[10,20,30,40,50,60,70,80,90,100,90,80,70,60,50,40,30,20,10,0,10,20,30,40,50,60,70]];
    /* set up linechart attributes */
    config.data = ( config.data ) ? config.data : defaultData;
    config.domain = ( config.domain ) ? config.domain : [ 0, 26 ];
    config.range = ( config.range ) ? config.range : [ 0, d3.max( config.data ) ];
    config.width = ( config.width ) ? config.width : 400;
    config.height = ( config.height ) ? config.height : 100;
    config.svg = ( config.svg ) ? config.svg : "#chartSVG";
    config.margin = ( config.margin ) ? config.margin : { x: 50, y: 10 };
    return config;
  }

  function draw(config) {

    config = init( config );
		var x = d3.scale.linear().domain( config.domain ).range( [config.margin.x,config.width] );
		var y = d3.scale.linear().domain( config.range ).range( [config.height, config.margin.y] );
    var line = d3.svg.line()
	    .x(function(d,i) {
		      //  console.log('Plotting X value for data point: ' + d + ' using index: ' + i + ' to be at: ' + x(i) + ' using our xScale.');
        return x(i);
		  })
      .y(function(d) {
			    //  console.log('Plotting Y value for data point: ' + d + ' to be at: ' + y(d) + " using our yScale.");
          return y(d);
		  });


      // Add an SVG element with the desired dimensions and margin.
      var graph = d3.select(config.svg)
        .attr("width", config.width)
        .attr("height", config.height)
      .append("svg:g")
        .attr("transform", "translate(" + config.margin.x + "," + config.margin.y + ")");

      // create yAxis
      var xAxis = d3.svg.axis().scale(x)
            .tickSize(-config.height)
            .tickSubdivide(true)
            .tickFormat(function(d) { return d + 1986; });
      // Add the x-axis.
      graph.append("svg:g")
          .attr("class", "x axis")
          .attr("transform", "translate(0," + (config.height ) + ")")
          .call(xAxis);


      // create left yAxis
      var yAxisLeft = d3.svg.axis().scale(y).orient("left")
            .tickSize(-config.width)
            .tickSubdivide(true);
      // Add the y-axis to the left
      graph.append("svg:g")
            .attr("class", "y axis")
            .attr("transform", "translate(40,0)")
            .call(yAxisLeft);

      // do this AFTER the axes above so that the line is above the tick-lines
    	graph.append("svg:path").attr("d", line(config.data));
  }

  return {
    draw: draw
  };
});
