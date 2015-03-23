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

  Backbone.Frog = Backbone.Hero.extend({
    defaults: _.extend({}, Backbone.Hero.prototype.defaults, {
      name: "frog",
      type: "character",
      width: 50,
      height: 60,
      spriteSheet: "frog",
      state: "idle-right",
      velocity: 0,
      acceleration: 0,
      yVelocity: 0,
      yAcceleration: 0
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
      },
      "dead-left": _.extend({}, Backbone.Hero.prototype.animations["dead-left"], {sequences: [0]}),
      "dead-right": _.extend({}, Backbone.Hero.prototype.animations["dead-right"], {sequences: [0]})
    },
    dirToggled: function(dirIntent) {
      if (this.ignoreInput()) return this;

      if (dirIntent != "left" && dirIntent != "right")
        throw "Invalid or missing dirIntent. Must be left or right."

      var cur = this.getStateInfo(),
          opoIntent = dirIntent == "right" ? "left" : "right",
          dirPressed = this.input ? this.input[dirIntent+"Pressed"]() : false,
          opoPressed = this.input ? this.input[opoIntent+"Pressed"]() : false,
          attrs = {};

      if (dirPressed && cur.mov != "jump") {
        attrs.state = this.buildState(cur.mov, dirIntent);
      } else {
        if (opoPressed) this.dirToggled(opoIntent);
      }

      if (!_.isEmpty(attrs)) this.set(attrs);

      return this;
    },
    // Jump
    buttonAToggled: function() {
      if (this.ignoreInput()) return this;

      var state = this.get("state"),
          cur = this.getStateInfo(),
          attrs = {};

      if (this.input && this.input.buttonAPressed() && cur.mov != "jump") {
        attrs.state = this.buildState("jump", cur.dir);
        attrs.nextState = this.buildState("idle", cur.dir);
        var jumpAnimation = this.getAnimation(attrs.state);
        attrs.velocity = jumpAnimation.velocity;
        attrs.yVelocity = jumpAnimation.yStartVelocity;
        jumpAnimation.minY = this.get("y") - 200;
      }
      if (!_.isEmpty(attrs)) this.set(attrs);

      return this;
    },
    // No action
    buttonBToggled: function() {
      return this;
    },
    onUpdate: function(dt) {
      var cur = this.getStateInfo(),
          velocity = this.get("velocity"),
          attrs = {};

      // Upon landing...
      if (cur.mov == "idle" && velocity != 0) {
        // No momentum
        attrs.velocity = 0;
        // Turn around
        if (cur.dir == "left" && this.input && this.input.rightPressed() ||
            cur.dir == "right" && this.input && this.input.leftPressed())
          attrs.state = this.buildState(cur.mov, cur.opo);
      }
      if (!_.isEmpty(attrs)) this.set(attrs);

      return true;
    }
  });

}).call(this);