(function() {

  /**
   *
   * Backbone Game Engine - Core
   *
   * An elementary HTML5 canvas game engine using Backbone. Leverages Events,
   * Model and Collection classes. Model getters and setters are great
   * for storing Sprite attributes, and publishing their changes.
   *
   * Available classes:
   *  - Backbone.Engine: A Backbone Collection which implements an animation
   *    loop to update and draw its Models (typically Sprites).
   *
   *  - Backbone.SpriteSheet: A Backbone Model representing a sprite sheet. Tied
   *    to an Image, breaks it into frames used for animations.
   *
   *  - Backbone.Sprite: A Backbone Model representing a sprite on screen. Implements
   *    animation sequences, drawing frame by frame from a sprite sheet.
   *
   *  - Backbone.Button: A button with an optional image.
   *
   *  - Backbobe.Clock: A timer which triggers tick events at a given interval.
   *
   *  - Backbone.Message: A message drawn on screen, which disapears after a delay.
   *
   *  - Backbone.DebugPanel: A Backbone View to display debug information on screen.
   *
   * Dependencies:
   *  - underscore (http://underscorejs.org/)
   *  - backbone (http://backbonejs.org/)
   *  - hammer.js (http://eightmedia.github.io/hammer.js/)
   *
   * Copyright (c) 2014 Martin Drapeau
   * https://github.com/martindrapeau/backbone-game-engine
   *
   */

  // Sprite class; a Backbone Model which implements the required update
  // and draw functions to animate a sprite, frame by frame.
  //
  // Graphics are obtained from a sprite sheet. Property spriteSheet must
  // point to the sprite sheet model.
  // If you define a sprite sheet collection, you can simply set attribute
  // spriteSheet to an existing sprite sheet model id. The collection will
  // automatically attach it to the sprite. Otherwise, you will need to
  // set property spriteSheet to a sprite sheet model yourself.
  //
  // Animations:
  // Sprite property animations contains a hash of animations. Each 
  // animation contains a sequence of frames and a delay between
  // frames for animation. For example:
  // animations: {
  //   idle: {
  //     sequences: [0, 1],
  //     delay: 200
  //   }
  // }
  // This defines an animation of two frames, alternating at an interval
  // of 200ms. Values 0 and 1 in the sequences array are frame indices
  // defined in the sprite sheet. Sprite attributes state and sequenceIndex
  // control which animation, and sequence are currently used. The
  // sequenceIndex is automatically adjusted by the sprite's draw function.
  // Attribute state determines the current animation. Must be set to
  // idle in the above example (as there is only one).
  //
  // Extra animation options are available. Here is a complete list:
  //  - sequences: Array of frame indices, or squence objects. A sequence
  //    object looks like this:
  //    {frame: 52, x: 0, y: -32, scaleX: 1.00, scaleY: 1}
  //    If allows to specify an offset to apply when the sprite is drawn,
  //    and a scaling factor.
  //  - scaleX, scaleY: Optional. Scaling factors. Set scaleX to -1 to flip 
  //    horizontally. Defaults to 1 if omitted.
  //  - delay: Optional. The time to change to the next sequence. No need
  //    to specify if there is only one frame (as there is no animation).
  //    You can also define a sprite method sequenceDelay() to programmatically
  //    return the delay. It will be passed the current animation.
  //
  // Extending:
  // To create your own sprite, extend this class and follow these rules:
  //   - New classes must be directly under the Backbone namespace so
  //     that the sprite sheet collection picks it up to set its spriteSheet
  //     pointer property.
  //   - Attribute name must be small-caps and dasherized. The class name
  //     must be the same but camel-case. You can use function _.classify()
  //     to perform the translation.
  //   - Attribute spriteSheet must be the id of a sprite sheet previously
  //     defined.
  //   - 
  // For example:
  // Backbone.MySprite = Backbone.Model.extend({
  //   name: "my-sprite",
  //   spriteSheet: "my-sprite-sheet"
  // });
  // 
  Backbone.Sprite = Backbone.Model.extend({
    defaults: {
      name: undefined,

      // Position and state
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      state: "idle",

      // Sprite sheet id
      spriteSheet: undefined,

      // Animations
      sequenceIndex: 0,

      static: false,
      collision: false
    },
    animations: {
      idle: {
        sequences: [0], // Array of frame indices for the animation
        delay: 0 // Delay per sequence in milliseconds.
      }
    },
    // Sprite sheet instance. Set automatically.
    spriteSheet: undefined,
    // Attributes to persist.
    saveAttributes: ["name", "state", "sequenceIndex", "x", "y"],
    initialize: function(attributes, options) {
      this.lastSequenceChangeTime = 0;
    },
    toSave: function() {
      return _.pick(this.toJSON(), this.saveAttributes);
    },
    update: function(dt) {
      // Fetch animation and change sequence if need be
      var animation = this.getAnimation(),
          sequenceIndex = this.get("sequenceIndex"),
          delay = this.sequenceDelay ? this.sequenceDelay(animation) : animation.delay || 200,
          now = _.now();

      if (!animation || sequenceIndex >= animation.sequences.length) {
        this.set("sequenceIndex", 0);
        this.lastSequenceChangeTime = now;
      } else if (animation && delay && now > this.lastSequenceChangeTime + delay) {
        this.set("sequenceIndex", sequenceIndex < animation.sequences.length-1 ? sequenceIndex + 1 : 0);
        this.lastSequenceChangeTime = now;
      }

      // Tell the engine to draw (only if we are in the viewport)
      return true;
    },
    draw: function(context, options) {
      options || (options = {});
      var animation = this.getAnimation(),
          sequenceIndex = this.get("sequenceIndex") || 0;
      if (!animation || animation.sequences.length == 0) return;
      if (sequenceIndex >= animation.sequences.length) sequenceIndex = 0;

      var sequence = animation.sequences[sequenceIndex]
          frameIndex = _.isNumber(sequence) ? sequence : sequence.frame,
          frame = this.spriteSheet.frames[frameIndex],
          scaleX = animation.scaleX && animation.scaleX != 1 ? animation.scaleX : null,
          scaleY = animation.scaleY && animation.scaleY != 1 ? animation.scaleY : null,
          x = this.get("x") + (options.offsetX || 0) + (sequence.x || 0),
          y = this.get("y") + (options.offsetY || 0) + (sequence.y || 0);

      if (sequence.scaleY && sequence.scaleX != 1) scaleX = sequence.scaleX;
      if (sequence.scaleY &&  sequence.scaleY != 1) scaleY = sequence.scaleY;

      // Handle transformations (only scaling for now)
      if (_.isNumber(scaleX) || _.isNumber(scaleY)) {
        context.save();
        var flipAxis = x + frame.width / 2;
        context.translate(flipAxis, 0);
        context.scale(scaleX || 1, scaleY || 1);
        context.translate(-flipAxis, 0);
      }

      context.drawImage(
        this.spriteSheet.img,
        frame.x, frame.y, frame.width, frame.height,
        Math.round(x), Math.round(y), frame.width, frame.height
      );

      if (_.isNumber(scaleX) || _.isNumber(scaleY)) context.restore();

      return this;
    },
    getAnimation: function(state) {
      return this.animations[state || this.attributes.state];
    },
    overlaps: function(x, y) {
      var sx = this.get("x"),
          sy = this.get("y"),
          sw = this.get("width"),
          sh = this.get("height");
      if (y === undefined) {
        var o = x;
        return !(
          sx > o.x + o.width ||
          sx + sw < o.x ||
          sy > o.y + o.height ||
          sy + sh < o.y
        );
      }
      return (x >= sx && y >= sy && x <= sx + sw && y <= sy + sh);
    },
    getStateInfo: function(state) {
      var state = state || this.get("state"),
      pieces = state.split("-");
      if (pieces.length < 2) return {
        state: state,
        mov: state
      };

      return {
        state: state,
        mov: pieces[0], // idle, walk, ...
        dir: pieces[1], // right or left
        opo: pieces[1] == "right" ? "left" : "right" // oposite direction
      };
    }
  });

  // Sprite Collection. Able to instantiate a Sprite with the proper
  // class by looking at the name attribute. A Sprite name is dasherized
  // and its class name is camel-case (i.e. class MySprite and name my-sprite).
  Backbone.SpriteCollection = Backbone.Collection.extend({
    model: function(attributes, options) {
      var cls = _.classify(attributes.name);
      if (!_.isFunction(Backbone[cls])) throw "Invalid cls " + cls + " for " + attributes.name;
      return new Backbone[cls](attributes, options);
    }
  });

  // SpriteSheet class; a Backbone model which breaks an image into
  // frames used for animation.
  //
  // Attributes:
  //   - img: The element id of the image to find in the DOM. A pointer to
  //     the Image object is then stored in property img.
  //   - tileWidth, tileHeight: Size of tiles in pixels.
  //   - tileColumns, tileRows: Number of tiles in the image.
  // 
  // When the sprite sheet is instantiated, an array of frames is built.
  // A frame object contains the coordinates of the frame. It consists of:
  //   - x, y, width, height: Pixel position and size of the frame.
  // 
  // A Sprite model will reference the img and frames properties to draw
  // on the canvas.
  Backbone.SpriteSheet = Backbone.Model.extend({
    defaults: {
      img: undefined, // Element id to find image in DOM
      tileWidth: undefined,
      tileHeight: undefined,
      tileColumns: undefined,
      tileRows: undefined
    },
    initialize: function(attributes, options) {
      this.frames = [];
      this.buildFrames();
      this.on("change:img", this.spawnImg);
      this.spawnImg();
    },
    // Constructs the frames array. A frame is an object with x, y width and height.
    // Determines the image position in the spritesheet. Used as sx, sy, sw, and sh
    // when drawing on the canvas.
    buildFrames: function() {
      var sheet = this.toJSON();
      for (var row = 0; row < sheet.tileRows; row++) {
        for (var col = 0; col < sheet.tileColumns; col++)
          this.frames.push({
            x: col * sheet.tileWidth,
            y: row * sheet.tileHeight,
            width: sheet.tileWidth,
            height: sheet.tileHeight
          });
        }
      return this;
    },
    // Fetches the Image object from the DOM element.
    spawnImg: function() {
      var id = this.get("img").replace("#", ""),
          img = document.getElementById(id);

      if (!img)
        throw "Invalid img #" + id + " for " + this.get("name") + ". Cannot find element by id.";

      this.img = img;
      return this;
    }
  });

  // SpriteSheetCollection class; a Backbone collection of SpriteSheet models.
  // 
  // Once the sprite sheet collection is instantiated, call method
  // attachToSpriteClasses() to automatically attach sprite sheets to sprites.
  // Will set the spriteSheet property on classes, avoiding you to have to do
  // it yourself.
  Backbone.SpriteSheetCollection = Backbone.Collection.extend({
    model: Backbone.SpriteSheet,
    // Attaches sprite sheets to sprite classes. Must be called before
    // calling draw on any sprite.
    attachToSpriteClasses: function() {
      var spriteSheets = this;
      _.each(Backbone, function(cls) {
        if (_.isFunction(cls) && cls.prototype instanceof Backbone.Sprite &&
            cls.prototype.defaults && cls.prototype.defaults.spriteSheet &&
            !cls.prototype.spriteSheet) {
          var spriteSheet = spriteSheets.get(cls.prototype.defaults.spriteSheet);
          if (spriteSheet) cls.prototype.spriteSheet = spriteSheet;
        }
      });
      return this;
    }
  });

  // Engine class; a Backbone Collection of models that have the required update
  // and draw methods. Will draw them on an HTML5 canvas.
  //
  // Options:
  //   - canvas: The canvas to draw upon.
  //   - input: Optional. The user control input instance.
  //   - debugPanel: Optional. If passed fps and cycleTime are output.
  // 
  // The engine can be started and stopped. When running, will perform an
  // update/draw sequence 60 times per second. Use methods start(), stop()
  // or toggle(). Use method isRunning() to determine if the engine is running.
  //
  // Uses requestAnimationFrame to do a render of all sprites in the collection.
  // When running, method onAnimationFrame() is called 60 times per second (or
  // slower depending on performance). Then a draw/update sequence happens
  // consisting of:
  //   - Looping through all sprites in the collection and calling their update()
  //     method. A trueish result indicates a redraw is requested.
  //   - Loops through all sprites who requested a redraw calling their draw()
  //     method.
  // To measure performance, two properties are set: fps and cycleTime. If you
  // passed a debugPanel, they will be drawn on screen.
  // Note: The engine does not clear the canvas before redraw. That is left up
  // to you. See class World for an example.
  //
  // Models added to the collection receive an 'attach' event and have an extra
  // property set 'engine' as backreference. When removed, they receive a 'detach'
  // event.
  // 
  Backbone.Engine = Backbone.Collection.extend({
    defaults: {
      canvas: undefined,
      debugPanel: null,
      input: null
    },
    initialize: function(sprites, options) {
      _.extend(this, this.defaults, _.pick(options || {}, _.keys(this.defaults)));

      _.bindAll(this, "start", "stop", "toggle", "onAnimationFrame");

      if (!this.canvas || typeof this.canvas.getContext !== "function")
        throw new Error("Missing or invalid canvas.");

      // Handle the pause button - stops the engine.
      var input = this.input,
          toggleFn = _.debounce(this.toggle, 50);
      if (input) this.listenTo(input, "change:pause", function(input) {
        if (input.get("pause")) toggleFn();
      });

      this.context = this.canvas.getContext("2d");
      this.context.imageSmoothingEnabled = false;
      this.lastTime = _.now();
      this.start();

      // Trigger attach and detach events on sprites
      // Also set the property engine
      var engine = this;
      this.on("reset", function() {
        this.each(function(sprite) {
          sprite.engine = engine;
          sprite._draw = false;
          sprite.trigger("attach", engine);
        });
      });
      this.on("add", function(sprite) {
        sprite.engine = engine;
        sprite._draw = false;
        sprite.trigger("attach", engine);
      });
      this.on("remove", function(sprite) {
        sprite.trigger("detach", engine);
        delete sprite._draw;
        sprite.engine = engine;
      });

      // For the trigger of reset event
      setTimeout(function() {
        engine.trigger("reset");
      }, 1);
    },
    isRunning: function() {
      return !!this.timerId;
    },
    start: function() {
      var now = _.now();
      this.lastTime = now;
      this.fpsStartTime = now;
      this.fpsCount = 0;
      this.cycleTime = 0;
      this.cycleTimes = [];
      this.timerId = requestAnimationFrame(this.onAnimationFrame);
      this.trigger("start");
      return this;
    },
    stop: function() {
      cancelAnimationFrame(this.timerId);
      this.timerId = null;
      this.trigger("stop");
      return this;
    },
    toggle: function() {
      if (this.timerId)
        this.stop();
      else
        this.start();
      return this;
    },
    onAnimationFrame: function() {
      var context = this.context,
          now = _.now(),
          dt = now - this.lastTime,
          sprite;

      for (var i = 0; i < this.models.length; i++) {
        sprite = this.models[i];
        if (sprite._draw) sprite.draw.call(sprite, context);
      }

      for (var i = 0; i < this.models.length; i++) {
        sprite = this.models[i];
        sprite._draw = sprite.update.call(sprite, dt);
      }

      // Call ourself again next time
      this.timerId = requestAnimationFrame(this.onAnimationFrame);

      // Save our timestamp
      this.lastTime = now;

      this.fpsCount += 1;
      if (now - this.fpsStartTime > 1000) {
        this.fps = this.fpsCount;
        this.fpsCount = 0;
        this.fpsStartTime = now;
      }

      this.cycleTimes.push( _.now() - now);
      if (this.cycleTimes.length == 5) {
        this.cycleTime = Math.round(_.average(this.cycleTimes));
        this.cycleTimes = [];
      }

      if (this.debugPanel) this.debugPanel.set({fps: this.fps, ct: this.cycleTime});
      return this;
    }
  });

  // Clock class; Ticks every given delay in milliseconds.
  // Bind an event on change:ticks to do something.
  // Can be added to the engine collection. Does not draw anything
  // on screen.
  Backbone.Clock = Backbone.Model.extend({
    defaults: {
      ticks: 0,
      delay: 200
    },
    update: function(dt) {
      var now = _.now();
      if (!this.lastTickTime || now > this.lastTickTime + this.get("delay")) {
        this.set("ticks", this.get("ticks") + 1);
        this.lastTickTime = now;
      }
      return false;
    },
    draw: function() {}
  });

  // Button class; a button with an optional image.
  // Triggers the tap event when pressed.
  Backbone.Button = Backbone.Model.extend({
    defaults: {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      borderRadius: 0,
      img: undefined,
      imgX: 0,
      imgY: 0,
      imgWidth: 0,
      imgHeight:0,
      imgMargin:0,
      backgroundColor: "rgba(160, 160, 160, {0})"
    },
    initialize: function() {
      _.bindAll(this, "onTap");
      this.on("attach", this.onAttach);
      this.on("detach", this.onDetach);
    },
    onAttach: function() {
      if (!this.hammertime) this.hammertime = Hammer(document);
      this.onDetach();
      this.hammertime.on("tap", this.onTap);
    },
    onDetach: function() {
      this.hammertime.off("tap", this.onTap);
    },
    update: function(dt) {
      return true;
    },
    draw: function(context) {
      var pressed = false,
          opacity = pressed ? 1 : 0.8,
          b = this.toJSON(),
          fillStyle = (b.backgroundColor).replace("{0}", opacity);

      drawRoundRect(context, b.x, b.y, b.width, b.height, b.borderRadius, fillStyle, false);
      if (b.img)
        context.drawImage(b.img,
          b.imgX, b.imgY, b.imgWidth, b.imgHeight,
          b.x + b.imgMargin, b.y + b.imgMargin, b.imgWidth, b.imgHeight
        );

      return this;
    },
    onTap: function(e) {
      var b = this.toJSON(),
          x = e.gesture.center.clientX + this.engine.canvas.scrollLeft,
          y = e.gesture.center.clientY + this.engine.canvas.scrollTop;
      if (x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height)
        this.trigger("tap");
    },
    overlaps: Backbone.Sprite.prototype.overlaps
  });

  // Displays a message top center
  Backbone.Message = Backbone.Model.extend({
    defaults: {
      x: 0,
      y: 0,
      text: null,
      delay: 5000,
      active: false,
      color: "#fff"
    },
    initialize: function() {
      _.bindAll(this, "show", "hide");
      this.on("attach", this.hide);
      this.on("detach", this.hide);
    },
    update: function(dt) {
      return !!this.get("active");
    },
    draw: function(context) {
      var m = this.toJSON();

      context.fillStyle = this.get("color");
      context.font = "16px arial";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(m.text || "", m.x, m.y);

      return this;
    },
    show: function(text) {
      var message = this;

      if (this.timerId) clearTimeout(this.timerId);

      this.set({text: text || this.get("text") || "no message", active: true}, {silent:true});
      this.timerId = setTimeout(this.hide, this.get("delay"));

      return this;
    },
    hide: function() {
      if (this.timerId) clearTimeout(this.timerId);
      this.set({active: false, text: null}, {silent: true});
      return this;
    }
  })

  // DebugPanel class; draws debug information on screen.
  //
  // A simple Backbone model. Set attributes will be drawn on screen
  // via a simple JSON.stringify() invocation. Feel free to subclass
  // and define your own draw function for something fancier.
  Backbone.DebugPanel = Backbone.Model.extend({
    defaults: {
      fps: 0
    },
    initialize: function(attributes, options) {
      options || (options = {});
      this.color = options.color || "#ff0";
    },
    update: function(dt) {
      return true;
    },
    draw: function(context) {
      var text = JSON.stringify(this.toJSON());
      context.fillStyle = this.get("color");
      context.font = "12px arial";
      context.textAlign = "left";
      context.textBaseline = "middle";
      context.fillText(text, 100, 10);
      return this;
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
      var currTime = _.now();
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


  // Underscore extensions - global helper functions
  _.mixin({
    minNotNull: function(values) {
      var min = null;
      _.each(values, function(value) {
        if (_.isNumber(value) && (min == null || value < min))
          min = value;
      });
      return min;
    },
    maxNotNull: function(values) {
      var max = null;
      _.each(values, function(value) {
        if (_.isNumber(value) && (max == null || value > max))
          max = value;
      });
      return max;
    },
    deepClone: function(object) {
      return JSON.parse(JSON.stringify(object));
    },
    sum: function(a) {
      return _.reduce(a, function(sum, num){ return sum + num; }, 0);
    },
    average: function(a) {
      return _.sum(a) / a.length;
    },
    // Taken from Underscore String
    // Source: https://github.com/epeli/underscore.string
    titleize: function(str){
      if (str == null) return '';
      str  = String(str).toLowerCase();
      return str.replace(/(?:^|\s|-)\S/g, function(c){ return c.toUpperCase(); });
    },
    classify: function(str){
      return _.titleize(String(str).replace(/[\W_]/g, ' ')).replace(/\s/g, '');
    }
  });

}).call(this);
