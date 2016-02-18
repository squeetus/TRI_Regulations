define( [ "modules/interface", "modules/lineChart", "modules/dataInterface", "modules/filter" ], function( ui, lineChart, data, filter ) {

  /* Configure the visualization chart/data */
  var config = {
    data: null,         // data to visualize
    domain: [ 0, 26 ],  // domain: fixed to 1986-2013
    range: null,        // range of chart data
    width: null,        // width of chart
    height: null,       // height of chart
    svg: null,          // which svg to draw to
    m: null,            // margins
    lines: 2,           // number of charts to show
    style: 0            // 0 for area chart, 1 for line chart
  };

  /* Initialize the config object */
  function init() {
    // console.log( new filter() );
    // config.data = (data.data) ? data.filter({"regulation": "CAIR"}) : null;
    config.data = ( data.data ) ? filter.filter( data.data ) : null;
    config.width = ( ui.components.chartSVG[ 0 ][ 0 ].width.animVal.value * 0.9 );
    config.height = ( ui.components.chartSVG[ 0 ][ 0 ].height.animVal.value * 0.9 ) / config.lines;
  }

  /* Modify the number of line chart objects to show */
  function setNumberLineCharts( i ) {
    config.lines = (config.lines = ( i > 0 ) ? i : 1);
  }

  /* Return an object with the visualizer commands */
  return {
    init: init,
    setNumCharts: setNumberLineCharts,
    lineChart: function( arg ) {
      if( arg === 1 )
        lineChart.draw( config, arg );
      if( arg === 2 ) 
        lineChart.draw( config, arg );
    }
  };
});
