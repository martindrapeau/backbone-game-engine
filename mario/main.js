$(window).on("load", function() {

  /**
   *
   * Backbone Game Engine - An elementary HTML5 canvas game engine using Backbone.
   *
   * Copyright (c) 2014 Martin Drapeau
   * https://github.com/martindrapeau/backbone-game-engine
   *
   */
   
  // Mario alone in an empty world. Control him with the touchpad.

  Backbone.Mario = Backbone.Hero.extend({
    defaults: _.extend({}, Backbone.Hero.prototype.defaults, {
      name: "mario",
      spriteSheet: "mario"
    })
  });

  var canvas = document.getElementById("foreground");
  adjustViewport(canvas);

  var spriteSheets = new Backbone.SpriteSheetCollection([{
    id: "mario",
    img: "#mario",
    tileWidth: 32,
    tileHeight: 64,
    tileColumns: 21,
    tileRows: 6
  }]).attachToSpriteClasses();

  var debugPanel = new Backbone.DebugPanel();

  var input = new Backbone.Input({
    drawTouchpad: true,
    drawPause: true
  });

  var mario = new Backbone.Mario({
  	x: 400, y: 200, floor: 500
  }, {
    input: input
  });

  var world = new Backbone.World({
  	width: 30, height: 17,
  	tileWidth: 32, tileHeight: 32,
    viewportBottom: 156,
    backgroundColor: "rgba(66, 66, 255, 1)"
  }, {
    input: input
  });
  world.add(mario);

  var engine = new Backbone.Engine({}, {
    canvas: canvas,
    debugPanel: debugPanel,
    input: input
  });
  engine.add([
    world,
    input,
    debugPanel
  ]);

  // Expose things as globals - easier to debug
  _.extend(window, {
    canvas: canvas,
    engine: engine,
    world: world,
    mario: mario
  });
  
});