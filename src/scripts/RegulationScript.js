/*
*
*          TRI Regulation Visualization
*          version 1.1
*
*          Created by
*              David Burlinson
*              Spring 2016 (v1.0)
*
*/
requirejs(['modules/visualizer', 'json!data/allCas.json'], function(vis, data) {
  vis.init();
  vis.lineChart.draw({});
  console.log(data);

});
