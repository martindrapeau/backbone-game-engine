(function() {

  /**
   *
   * Backbone Game Engine - Core
   *
   * An elementary HTML5 game engine using Backbone. Leverages Events,
   * Model and Collection classes. Model getters and setters are great
   * for storing and publishing changes on a Sprite.
   *
   * Available classes:
   *  - Backbone.Engine: A Backbone Collection which implements an animation
   *                     loop to update and draw its Models (typically Sprites).
   *  - Backbone.Sprite: A Backbone Model representing a sprite on screen.
   *  - Backbone.DebugPanel: A Backbone View to display debug information on screen.
   *
   * Dependencies: 
   *  - jQuery
   *  - underscore (http://underscorejs.org/)
   *  - backbone (http://backbonejs.org/)
   *
   * Copyright (c) 2014 Martin Drapeau
   * https://github.com/martindrapeau/backbone-game-engine
   *
   */

  // Sprite class; a Backbone Model which implements the required update
  // and draw functions to animate a sprite, frame by frame.
  Backbone.Sprite = Backbone.Model.extend({
    defaults: {
      // Position and state
      x: 0,
      y: 0,
      state: "idle",

      // Spritesheet information. Used to construct tiles.
      img: undefined,
      tileWidth: undefined,
      tileHeight: undefined,
      tileColumns: undefined,
      tileRows: undefined,

      // Animations
      animationIndex: 0,
      animations: {
        idle: {
          tiles: [0], // Array of tile indices for the animation
          delay: 0 // Delay per frame in milliseconds.
        }
      }
    },
    initialize: function(attributes, options) {
      options || (options = {});

      Backbone.Model.prototype.initialize.apply(this, arguments);

      _.bindAll(this, "buildTiles", "update", "draw", "getAnimation");

      this.tiles = [];
      this.lastTileChangeTime = 0;
      this.buildTiles();
    },
    // Constructs the tiles array. A tile is an object with x, y width and height.
    // Determines the image position in the spritesheet. Used as sx
    buildTiles: function() {
      var sprite = this.toJSON();
      for (var col = 0; col < sprite.tileColumns; col++)
        for (var row = 0; row < sprite.tileRows; row++) {
          this.tiles.push({
            x: col * sprite.tileWidth,
            y: row * sprite.tileHeight,
            width: sprite.tileWidth,
            height: sprite.tileHeight
          });
        }
      return this;
    },
    update: function(dt) {
      // Fetch animation and change frame if need be
      var animation = this.getAnimation(),
          animationIndex = this.get("animationIndex"),
          delay = this.frameDelay ? this.frameDelay(animation) : animation.delay || 200,
          now = new Date().getTime();

      if (!animation || animationIndex >= animation.tiles.length) {
        this.set("animationIndex", 0);
        this.lastTileChangeTime = now;
      } else if (animation && delay && now > this.lastTileChangeTime + delay) {
        this.set("animationIndex", animationIndex < animation.tiles.length-1 ? animationIndex + 1 : 0);
        this.lastTileChangeTime = now;
      }

      // Tell the engine to draw
      return true;
    },
    draw: function(context) {
      var animation = this.getAnimation(),
          animationIndex = this.get("animationIndex") || 0,
          tileIndex = animation && animationIndex < animation.tiles.length ? animation.tiles[animationIndex] : 0,
          x = this.get("x"),
          y = this.get("y"),
          tile = this.tiles[tileIndex];

      context.save();

      // Handle transformations (only scaling for now)
      if (animation && (animation.scaleX || animation.scaleY)) {
        var flipAxis = x + tile.width / 2;
        context.translate(flipAxis, 0);
        context.scale(animation.scaleX || 1, animation.scaleY || 1);
        context.translate(-flipAxis, 0);
      }

      context.drawImage(
        this.get("img"),
        tile.x, tile.y, tile.width, tile.height,
        x, y, tile.width, tile.height
      );

      context.restore();
      return this;
    },
    getAnimation: function(state) {
      state || (state = this.get("state"));
      var animations = this.get("animations");
      return animations[state];
    }
  });


  // Engine class; a Backbone Collection of Sprites
  // Uses requestAnimationFrame to do a render of all sprites
  // in the collection.
  Backbone.Engine = Backbone.Collection.extend({
    initialize: function(sprites, options) {
      _.extend(this, engineDefaultOptions, _.pick(options || {}, _.keys(engineDefaultOptions)));

      _.bindAll(this, "start", "pause", "togglePause", "onAnimationFrame");

      if (!this.canvas || typeof this.canvas.getContext !== "function")
        throw new Error("Missing or invalid canvas.");

      // Handle the pause button
      var input = this.input,
          toggleFn = _.debounce(this.togglePause, 50);
      if (input) this.listenTo(input, "change:pause", function(input) {
        if (input.get("pause")) toggleFn();
      });

      this.context = this.canvas.getContext("2d");
      this.context.imageSmoothingEnabled = false;
      this.lastTime = new Date().getTime();
      this.start();
    },
    start: function() {
      this.lastTime = new Date().getTime();
      this.timerId = requestAnimationFrame(this.onAnimationFrame);
      return this;
    },
    pause: function() {
      cancelAnimationFrame(this.timerId);
      this.timerId = null;
      return this;
    },
    togglePause: function() {
      if (this.timerId)
        this.pause();
      else
        this.start();
      return this;
    },
    onAnimationFrame: function() {
      var context = this.context,
      spritesToDraw = [],
      dt = new Date().getTime() - this.lastTime;

      // Clear the canvas
      this.clear();

      // Update each sprite and draw ones requiring a redraw
      this.each(function(sprite) {
        // Pass time delta since previous call in milliseconds
        if (sprite.update(dt)) spritesToDraw.push(sprite);
      });
      _.each(spritesToDraw, function(sprite) {
        // Pass the canvas drawing context
        sprite.draw(context);
      });

      // Call ourself again next time
      this.timerId = requestAnimationFrame(this.onAnimationFrame);

      // Save our timestamp
      this.lastTime = new Date().getTime();

      if (this.debugPanel) this.debugPanel.set({dt: dt});
      return this;
    },
    clear: function() {
      this.context.fillStyle = this.backgroundColor;
      this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
      return this;
    }
  });
  var engineDefaultOptions = {
    canvas: undefined,
    width: 800,
    height: 600,
    backgroundColor: "#000",
    debugPanel: null,
    input: null
  };


  // Debug panel; a Backbone View to display debug information.
  // Wraps a Backbone Model that you call set to track things
  // you want displayed. It will simply render the model JSON
  // upon the change event. Extend the render function for
  // something fancier.
  Backbone.DebugPanel = Backbone.View.extend({
    initialize: function() {
      // Ensure model exists
      if (!this.model) this.model = new Backbone.Model();

      // Expose the getter and setter functions at the view.
      _.bindAll(this, "set", "get", "render");

      // Upon any change, render again.
      // TO DO: Debounce this sucker....
      this.listenTo(this.model, "change", this.render);
    },
    render: function() {
      this.$el.empty().text(JSON.stringify(this.model.toJSON()));
      return this;
    },
    set: function() {
      return this.model.set.apply(this.model, arguments);
    },
    get: function() {
      return this.model.get.apply(this.model, arguments);
    }
  });


  // The global timer function. Aims to do 60 frames per second.

  // requestAnimationFrame polyfill
  // Source: http://www.paulirish.com/2011/requestanimationframe-for-smart-animating/
  var lastTime = 0;
  var vendors = ['webkit', 'moz'];
  for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
    window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
    window.cancelAnimationFrame =
    window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
  }

  if (!window.requestAnimationFrame)
    window.requestAnimationFrame = function(callback, element) {
      var currTime = new Date().getTime();
      var timeToCall = Math.max(0, 16 - (currTime - lastTime));
      var id = window.setTimeout(function() { callback(currTime + timeToCall); },
        timeToCall);
      lastTime = currTime + timeToCall;
      return id;
    };

  if (!window.cancelAnimationFrame)
    window.cancelAnimationFrame = function(id) {
      clearTimeout(id);
    };

}).call(this);
