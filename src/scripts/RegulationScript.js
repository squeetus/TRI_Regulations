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
requirejs(['modules/visualizer'], function(vis) {
  vis.init();
  vis.setNumCharts(2);
  vis.lineChart(1);
  vis.lineChart(2);
});
