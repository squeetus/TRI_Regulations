
define( [ "css!style/lineChart" ], function() {

  function init (config) {
    var data, domain, range, width, height;
    var defaultData = [[10,20,30,40,50,60,70,80,90,100,90,80,70,60,50,40,30,20,10,0,10,20,30,40,50,60,70]];
    /* set up linechart attributes */
    config.data = ( config.data ) ? config.data : defaultData;
    config.domain = ( config.domain ) ? config.domain : [ 0, 26 ];
    config.range = ( config.range ) ? config.range : [ 0, d3.max( config.data[0] ) ];
    config.width = ( config.width ) ? config.height : 400;
    config.height = ( config.height ) ? config.height : 100;
    config.svg = ( config.svg ) ? config.svg : "#chartSVG";
    config.m = ( config.m ) ? config.m : 5;
    return config;
  }

  function draw(config) {
    config = init( config );

		var x = d3.scale.linear().domain( config.domain ).range( [0,config.width] );
		var y = d3.scale.linear().domain( config.range ).range( [config.height,0] );
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
        .attr("transform", "translate(" + config.m + "," + config.m + ")");

      // create yAxis
      var xAxis = d3.svg.axis().scale(x).tickSize(-config.height).tickSubdivide(true);
      // Add the x-axis.
      graph.append("svg:g")
          .attr("class", "x axis")
          .attr("transform", "translate(0," + config.height + ")")
          .call(xAxis);


      // create left yAxis
      var yAxisLeft = d3.svg.axis().scale(y).ticks(4).orient("left");
      // Add the y-axis to the left
      graph.append("svg:g")
            .attr("class", "y axis")
            .attr("transform", "translate(-25,0)")
            .call(yAxisLeft);

      // do this AFTER the axes above so that the line is above the tick-lines
    	graph.append("svg:path").attr("d", line(config.data[0]));
  }

  return {
    draw: draw
  };
});
