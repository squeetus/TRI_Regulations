////////////////////////////////////////////////////////////
//              UNUSED CODE
////////////////////////////////////////////////////////////


//function reset() {
//    scaleFactor = 1;
//    translate = [0,0];
//    zoom.scale(1);
//    zoom.translate([0,0]);
//    svg.attr("transform", "translate(" + zoom.translate() + ")scale(" + zoom.scale() + ")");
//    
//    facilities.attr("fill", "black").attr("r", nodeSize/scaleFactor).attr("opacity", "1");
//}
    
//function throttle(fn, threshhold, scope) {
//  threshhold || (threshhold = 250);
//  var last,
//      deferTimer;
//  return function () {
//    var context = scope || this;
//
//    var now = +new Date,
//        args = arguments;
//    if (last && now < last + threshhold) {
//      // hold on to it
//      clearTimeout(deferTimer);
//      deferTimer = setTimeout(function () {
//        last = now;
//        fn.apply(context, args);
//      }, threshhold);
//    } else {
//      last = now;
//      fn.apply(context, args);
//    }
//  };
//}
