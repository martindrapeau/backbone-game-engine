(function() {

  /**
  *
  * Backbone Game Engine - An elementary HTML5 canvas game engine using Backbone.
  *
  * Copyright (c) 2014 Martin Drapeau
  * https://github.com/martindrapeau/backbone-game-engine
  *
  */

  // Ensures the canvas is always visible and centered by adjusting
  // the viewport and the canvas left position.
  var resizeCount = 0;
  function adjustViewport(canvas, width, height) {

    var viewport = document.querySelector("meta[name=viewport]");

    function onResize() {
      if (window.innerWidth > window.innerHeight) {
        // Landscape
        canvas.style.left = _.max([0, (window.innerWidth - width) / 2]) + "px";
        viewport.setAttribute("content", "width=" + Math.ceil(height * window.innerWidth / window.innerHeight) + ",user-scalable=no");
      } else {
        // Portrait
        canvas.style.left = "0px";
        viewport.setAttribute("content", "width=" + width + ",user-scalable=no");
      }
    }

    window.addEventListener("resize", _.debounce(onResize, 300));
    setTimeout(onResize, 10);
  }

  _.extend(window, {
    adjustViewport: adjustViewport,
  });

}).call(this);