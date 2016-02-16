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
requirejs(["modules/interface", 'json!data/allCas.json'], function(ui, data) {
  ui.lineChart("hi");
  console.log(data);

});
