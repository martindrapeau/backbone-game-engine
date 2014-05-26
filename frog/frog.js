(function() {

  /**
   *
   * Backbone Game Engine - An elementary HTML5 canvas game engine using Backbone.
   *
   * Copyright (c) 2014 Martin Drapeau
   * https://github.com/martindrapeau/backbone-game-engine
   *
   */

  var velocity = 200,
      acceleration = 400,
      jumpVelocity = 550,
      jumpDeceleration = 1400,
      jumpHoldDeceleration = 900,
      fallVelocity = 600,
      fallAcceleration = 1200;

  Backbone.Frog = Backbone.Sprite.extend({
    defaults: _.extend({}, Backbone.Sprite.prototype.defaults, {
      name: "frog",
      type: "character",
      width: 50,
      height: 60,
      spriteSheet: "frog",
      state: "idle-right",
      velocity: 0,
      acceleration: 0,
      yVelocity: 0,
      yAcceleration: 0,
      collision: true
    }),
    animations: {
      "idle-right": {
        sequences: [1],
        velocity: 0,
        acceleration: 0,
        yVelocity: 0,
        yAcceleration: 0,
        scaleX: 1,
        scaleY: 1
      },
      "idle-left": {
        sequences: [1],
        velocity: 0,
        acceleration: 0,
        yVelocity: 0,
        yAcceleration: 0,
        scaleX: -1,
        scaleY: 1
      },
      "jump-right": {
        sequences: [2],
        velocity: velocity,
        acceleration: acceleration,
        yStartVelocity: -jumpVelocity,
        yEndVelocity: fallVelocity,
        yAscentAcceleration: jumpDeceleration,
        yHoldAscentAcceleration: jumpHoldDeceleration,
        yDescentAcceleration: fallAcceleration,
        scaleX: 1,
        scaleY: 1
      },
      "jump-left": {
        sequences: [2],
        velocity: -velocity,
        acceleration: acceleration,
        yStartVelocity: -jumpVelocity,
        yEndVelocity: fallVelocity,
        yAscentAcceleration: jumpDeceleration,
        yHoldAscentAcceleration: jumpHoldDeceleration,
        yDescentAcceleration: fallAcceleration,
        scaleX: -1,
        scaleY: 1
      }
    },
    saveAttributes: _.union(
      Backbone.Sprite.prototype.saveAttributes,
      ["velocity", "acceleration", "yVelocity", "yAcceleration"]
    ),
    initialize: function(attributes, options) {
      options || (options = {});
      Backbone.Sprite.prototype.initialize.apply(this, arguments);

      this.input = options.input;
      this.world = options.world;

      this.on("attach", this.onAttach, this);
      this.on("detach", this.onDetach, this);
    },
    onAttach: function() {
      if (this.input) {
        this.stopListening(this.input);
        this.listenTo(this.input, "change:right", _.partial(this.dirToggled, "right"));
        this.listenTo(this.input, "change:left", _.partial(this.dirToggled, "left"));
        this.listenTo(this.input, "change:buttonA", this.buttonAToggled);
      }
      this.debugPanel = this.engine && this.engine.debugPanel ? this.engine.debugPanel : undefined;
    },
    onDetach: function() {
      if (this.input) this.stopListening(this.input);
      this.debugPanel = undefined;
    },
    toggleDirection: function(dirIntent) {
      return this.dirToggled(dirIntent);
    },
    // User input toggled in right or left direction.
    // Can be pressed or depressed
    dirToggled: function(dirIntent) {
      if (dirIntent != "left" && dirIntent != "right")
        throw "Invalid or missing dirIntent. Must be left or right."

      var cur = this.getStateInfo(),
          opoIntent = dirIntent == "right" ? "left" : "right",
          dirPressed = this.input[dirIntent+"Pressed"](),
          opoPressed = this.input[opoIntent+"Pressed"](),
          attrs = {};

      if (dirPressed && cur.mov != "jump") {
        attrs.state = cur.mov + "-" + dirIntent;
      } else {
        if (opoPressed) this.dirToggled(opoIntent);
      }

      if (!_.isEmpty(attrs)) this.set(attrs);

      return this;
    },
    // Jump
    buttonAToggled: function() {
      var state = this.get("state"),
          cur = this.getStateInfo(),
          attrs = {};

      if (this.input.buttonAPressed() && cur.mov != "jump") {
        attrs.state = "jump-" + cur.dir;
        attrs.nextState = "idle-" + cur.dir;
        var jumpAnimation = this.getAnimation(attrs.state);
        attrs.velocity = jumpAnimation.velocity;
        attrs.yVelocity = jumpAnimation.yStartVelocity;
        jumpAnimation.minY = this.get("y") - 200;
      }
      if (!_.isEmpty(attrs)) this.set(attrs);
    },
    update: function(dt) {
      // Reuse Hero's update
      var result = Backbone.Hero.prototype.update.apply(this, arguments);
      if (!result) return result;

      var cur = this.getStateInfo(),
          velocity = this.get("velocity"),
          attrs = {};

      // Upon landing...
      if (cur.mov == "idle" && velocity != 0) {
        // No momentum
        attrs.velocity = 0;
        // Turn around
        if (cur.dir == "left" && this.input.rightPressed() ||
            cur.dir == "right" && this.input.leftPressed())
          attrs.state = cur.mov + "-" + cur.opo;
      }
      if (!_.isEmpty(attrs)) this.set(attrs);

      return result;
    }
  });

}).call(this);