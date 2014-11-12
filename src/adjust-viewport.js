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
  // the viewport and its left position.
  // Assumes the meta element viewport has an id called viewport.
  function adjustViewport(canvas, width, height) {

    function onResize() {
      if (window.innerWidth > window.innerHeight) {
        // Landscape
        canvas.style.left = _.max([0, (window.innerWidth - width) / 2]) + "px";
        $("#viewport").attr({content: "width=" + Math.ceil(height * window.innerWidth / window.innerHeight)});
      } else {
        // Portrait
        canvas.style.left = "0px";
        $("#viewport").attr({content: "width=" + width});
      }
    }

    $(window).on("resize", _.debounce(onResize, 300));
    onResize();
  }

  _.extend(window, {
    adjustViewport: adjustViewport,
  });

}).call(this);