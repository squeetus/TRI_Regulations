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

requirejs.config({
    //By default load any module IDs from src/scripts
    baseUrl: 'src/scripts',
    paths: {
      data: '../data',
      json: '../../bower_components/requirejs-plugins/src/json',
      text: '../../bower_components/text/text',
      css: '../../bower_components/require-css/css',
      style: '../styles/'
    },
    urlArgs: "ts="+new Date().getTime() // remove for production
});

// Start the main app logic.
requirejs(["RegulationScript"]);
