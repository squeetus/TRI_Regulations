
define( [ "css!style/lineChart" ], function() {

  /* Set up any unset config attributes */
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
    config.style = ( config.style ) ? config.style : 0;
    return config;
  }

  /* Draw a line or area chart based on the given config setup */
  function draw(config) {

    // set up config attributes
    config = init( config );

    // x and y scales
		var x = d3.scale.linear().domain( config.domain ).range( [config.margin.x,config.width] );
		var y = d3.scale.linear().domain( config.range ).range( [config.height, config.margin.y] );

    // line chart generator
    var line = d3.svg.line()
	    .x(function(d,i) {
		      //  console.log('Plotting X value for data point: ' + d + ' using index: ' + i + ' to be at: ' + x(i) + ' using our xScale.');
        return x(i);
		  })
      .y(function(d) {
			    //  console.log('Plotting Y value for data point: ' + d + ' to be at: ' + y(d) + " using our yScale.");
          return y(d);
		  });

    // area chart generator
    var area = d3.svg.area()
      .x(function(d,i) { return x(i); })
      .y0(config.height)
      .y1(function(d) { return y(d); });

    // Add an SVG element with the desired dimensions and margin.
    var graph = d3.select(config.svg)
      .attr("width", config.width)
      .attr("height", config.height)
    .append("svg:g")
      .attr("transform", "translate(" + config.margin.x + "," + config.margin.y + ")");

    // create x axis
    var xAxis = d3.svg.axis().scale(x)
          .tickSize(-config.height)
          .tickSubdivide(true)
          .tickFormat(function(d) { return d + 1986; });
    // add the x axis
    graph.append("svg:g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + (config.height ) + ")")
        .call(xAxis);


    // create left y axis
    var yAxisLeft = d3.svg.axis().scale(y).orient("left")
          .tickSize(-config.width)
          .tickSubdivide(true);
    // add the y axis
    graph.append("svg:g")
          .attr("class", "y axis")
          .attr("transform", "translate(50,0)")
          .call(yAxisLeft);

    // draw area or line chart
  	if(config.style === 0) graph.append("svg:path").attr("d", area(config.data)).attr("class", "area");
    if(config.style === 1) graph.append("svg:path").attr("d", line(config.data)).attr("class", "area");
  }

  return {
    draw: draw
  };
});
