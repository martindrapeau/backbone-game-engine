$(document).ready(function() {

  /**
   *
   * Backbone Game Engine - Mario Demo
   *
   * Copyright (c) 2014 Martin Drapeau
   * https://github.com/martindrapeau/backbone-game-engine
   *
   */

  // Our DOM objects. Everything is already loaded (no need
  // for async loads).
  var canvas = $('canvas')[0],
      img = $('img')[0],
      context = canvas.getContext('2d');

  // Extend Backbone DebugPanel with a custom renderer
  Backbone.MyDebugPanel = Backbone.DebugPanel.extend({
    addSection: function(attrs, width) {
      var $section = $('<div class="section" style="width:'+ width + ';"></div>');
      _.each(attrs, function(value, name) {
        $section.append(name + ": " + JSON.stringify(value) + '<br/>');
      });
      this.$el.append($section);
      return this;
    },
    render: function() {
      this.$el.empty();
      var json = this.model.toJSON();
      this.addSection(_.pick(json, ["state", "nextState", "dt"]), "25%");
      this.addSection(_.pick(json, ["x", "velocity", "acceleration"]), "25%");
      this.addSection(_.pick(json, ["y", "yVelocity", "yAcceleration"]), "25%");
      this.addSection(_.pick(json, ["pressed", "touched", "clicked"]), "25%");
      return this;
    }
  });

  // Create the debug panel
  var debugPanel = new Backbone.MyDebugPanel({
    el: $('#debug')
  });

  // Capture user input
  var input = new Backbone.Input({
    touchpad: true
  }, {
    debugPanel: debugPanel
  });

  // Our Mario sprite
  var mario = new Backbone.Mario({
    // Initial position and state
    x: 400,
    y: 150,
    state: "idle-right",
    // Spritesheet
    img: img,
    tileWidth: 16,
    tileHeight: 32,
    tileColumns: 21,
    tileRows: 1
  }, {
    input: input,
    debugPanel: debugPanel
  });

  // The game engine, with no sprites to start
  var engine = new Backbone.Engine([], {
    canvas: canvas,
    debugPanel: debugPanel,
    input: input
  });

  // Add Mario and the Input (to display the touchpad)
  engine.add([mario, input]);

  // Expose things as globals - easier to debug
  _.extend(window, {
    canvas: canvas,
    engine: engine,
    input: input,
    mario: mario,
    debugPanel: debugPanel
  });

});