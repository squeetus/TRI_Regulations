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
      json: 'components/json',
      text: 'components/text'
    }
});

// Start the main app logic.
requirejs(["RegulationScript"]);
