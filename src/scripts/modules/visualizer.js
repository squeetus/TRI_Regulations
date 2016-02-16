define(["modules/interface", "modules/lineChart", "modules/dataInterface" ], function(ui, lineChart, data) {
  var config = {
    data: null,
    domain: [ 0, 26 ],
    range: null,
    width: null,
    height: null,
    svg: null,
    m: null,
    lines: 1
  };

  function init() {
    // config.data = (data.data) ? data.filter({"regulation": "CAIR"}) : null;
    config.data = (data.data) ? data.filter() : null;
    config.width = ui.components.chartSVG[0][0].width.animVal.value * 0.9;
    config.height = ui.components.chartSVG[0][0].height.animVal.value * 0.9;

    // config =
  }

  function setNumberLineCharts(i) {
    console.log(config.lines = (i>0) ? i : 1);
  }


  return {
    init: init,
    setDisplayMode: setNumberLineCharts,
    lineChart: function() {
      lineChart.draw(config);
    }
  };
});
