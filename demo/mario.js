(function() {

  /**
   *
   * Backbone Game Engine - Mario Demo
   *
   * Copyright (c) 2014 Martin Drapeau
   * https://github.com/martindrapeau/backbone-game-engine
   *
   */

  // Velocity and acceleration values in absolute values
  var groundY = 150,
      walkVelocity = 160,
      walkMinVelocity = 60,
      walkAcceleration = 150,
      runVelocity = 220,
      runMinVelocity = 100,
      runAcceleration = 200,
      releaseDeceleration = 200,
      skidDeceleration = 400,
      jumpVelocity = 500,
      jumpDeceleration = 1400,
      jumpHoldDeceleration = 800,
      fallAcceleration = 1200,
      airTurnaroundDeceleration = 400,
      fallVelocity = 600,
      walkDelay = 100,
      runDelay = 50;

  // Mario player class definition
  // A Backbone Sprite adding velocity and input support
  Backbone.Mario = Backbone.Sprite.extend({
    defaults: _.extend({}, Backbone.Sprite.prototype.defaults, {
      state: "idle-right",
      velocity: 0,
      acceleration: 0,
      yVelocity: 0,
      yAcceleration: 0,
      animations: {
        "idle-left": {
          tiles: [0],
          velocity: 0,
          yVelocity: 0,
          scaleX: -2,
          scaleY: 2
        },
        "idle-right": {
          tiles: [0],
          velocity: 0,
          scaleX: 2,
          scaleY: 2
        },
        "walk-left": {
          tiles: [1, 2, 3, 2],
          delay: walkDelay,
          velocity: -walkVelocity,
          minVelocity: -walkMinVelocity,
          acceleration: walkAcceleration,
          scaleX: -2,
          scaleY: 2
        },
        "walk-right": {
          tiles: [1, 2, 3, 2],
          delay: walkDelay,
          velocity: walkVelocity,
          minVelocity: walkMinVelocity,
          acceleration: walkAcceleration,
          scaleX: 2,
          scaleY: 2
        },
        "run-left": {
          tiles: [1, 2, 3, 2],
          delay: runDelay,
          velocity: -runVelocity,
          minVelocity: -runMinVelocity,
          acceleration: runAcceleration,
          scaleX: -2,
          scaleY: 2
        },
        "run-right": {
          tiles: [1, 2, 3, 2],
          delay: runDelay,
          velocity: runVelocity,
          minVelocity: runMinVelocity,
          acceleration: runAcceleration,
          scaleX: 2,
          scaleY: 2
        },
        "release-left": {
          tiles: [1, 2, 3, 2],
          delay: walkDelay,
          velocity: 0,
          acceleration: releaseDeceleration,
          scaleX: -2,
          scaleY: 2
        },
        "release-right": {
          tiles: [1, 2, 3, 2],
          delay: walkDelay,
          velocity: 0,
          acceleration: releaseDeceleration,
          scaleX: 2,
          scaleY: 2
        },
        "skid-left": {
          tiles: [4],
          velocity: 0,
          acceleration: skidDeceleration,
          scaleX: 2,
          scaleY: 2
        },
        "skid-right": {
          tiles: [4],
          velocity: 0,
          acceleration: skidDeceleration,
          scaleX: -2,
          scaleY: 2
        },
        "jump-left": {
          tiles: [5],
          acceleration: airTurnaroundDeceleration,
          yStartVelocity: -jumpVelocity,
          yEndVelocity: fallVelocity,
          yAscentAcceleration: jumpDeceleration,
          yHoldAscentAcceleration: jumpHoldDeceleration,
          yDescentAcceleration: fallAcceleration,
          scaleX: -2,
          scaleY: 2
        },
        "jump-right": {
          tiles: [5],
          acceleration: airTurnaroundDeceleration,
          yStartVelocity: -jumpVelocity,
          yEndVelocity: fallVelocity,
          yAscentAcceleration: jumpDeceleration,
          yHoldAscentAcceleration: jumpHoldDeceleration,
          yDescentAcceleration: fallAcceleration,
          scaleX: 2,
          scaleY: 2
        }
      }
    }),
    initialize: function(attributes, options) {
      options || (options = {});
      Backbone.Sprite.prototype.initialize.apply(this, arguments);

      if (!options.input || !options.input.rightPressed) throw "Missing input option";
      this.input = options.input;
      this.debugPanel = options.debugPanel;

      this.listenTo(this.input, "change:right", _.partial(this.dirToggled, "right"));
      this.listenTo(this.input, "change:left", _.partial(this.dirToggled, "left"));
      this.listenTo(this.input, "change:buttonB", this.buttonBToggled);
      this.listenTo(this.input, "change:buttonA", this.buttonAToggled);
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
          buttonBPressed = this.input.buttonBPressed(),
          velocity = this.get("velocity"),
          attrs = {};

      if (dirPressed) {
        // Pressed. Intent to move in that direction
        if (cur.mov == "jump") {
            // Update next step
            if (dirIntent != cur.dir && velocity)
              attrs.nextState = "skid-" + opoIntent;
            else
              attrs.nextState = (buttonBPressed ? "run-" : "walk-") + dirIntent;
          } else if (cur.dir == dirIntent || cur.mov == "idle") {
            // Start walking or running
            attrs.state = (buttonBPressed ? "run-" : "walk-") + dirIntent;
            var animation = this.getAnimation(attrs.state);
            if (animation.minVelocity && Math.abs(velocity) < Math.abs(animation.minVelocity))
              attrs.velocity = animation.minVelocity;
          } else if (cur.dir == opoIntent) {
            // Skid trying to stop before turning
            attrs.state = "skid-" + opoIntent;
            attrs.nextState = (buttonBPressed ? "run-" : "walk-") + dirIntent;
          }
        } else if (opoPressed) {
        // Depressed but opposite direction still pressed. Intent = turnaround.
        // Handle by calling the opposite direction press event.
        this.dirToggled(opoIntent);
      } else {
        // Depressed. Intent = stop to idle
        if (cur.mov == "jump") {
          attrs.nextState = "release-" + dirIntent;
        } else {
          attrs.state = "release-" + dirIntent;
          attrs.nextState = "idle-" + dirIntent;
        }
      }

      if (!_.isEmpty(attrs)) this.set(attrs);

      return this;
    },
    // Run or walk
    buttonBToggled: function() {
      var state = this.get("state"),
          pressed = this.input.buttonBPressed(),
      attrs = {};

        // Speed up or slow down
        if (pressed && state == "walk-right") attrs.state = "run-right";
        else if (pressed && state == "walk-left") attrs.state = "run-left";
        else if (!pressed && state == "run-right") attrs.state = "walk-right";
        else if (!pressed && state == "run-left") attrs.state = "walk-left";
        if (!_.isEmpty(attrs)) this.set(attrs);

        return this;
      },
    // Jump
    buttonAToggled: function() {
      var state = this.get("state"),
          cur = this.getStateInfo(),
          attrs = {};

      if (this.input.buttonAPressed() && cur.mov != "jump") {
        // Set new state (keep old as next)
        attrs.state = "jump-" + cur.dir;
        attrs.nextState = state;

        // Determine vertical velocity as a factor of horizontal velocity
        var jumpAnimation = this.getAnimation(attrs.state),
            velocity = this.get("velocity"),
            walkVelocity = this.getAnimation("walk-right").velocity,
            runVelocity = this.getAnimation("run-right").velocity,
            ratio = Math.abs((Math.abs(velocity) > walkVelocity ? velocity : walkVelocity) / runVelocity);
        attrs.yVelocity = Math.round(jumpAnimation.yStartVelocity * ratio);

        // Keep the horizontal velocity
        var animation = this.getAnimation();
        jumpAnimation.minY = this.get("y") - groundY * ratio;
      }
      if (!_.isEmpty(attrs)) this.set(attrs);

      return this;
    },
    getStateInfo: function(state) {
      var state = state || this.get("state"),
      pieces = state.split("-");
      if (pieces.length != 2) return null;

      return {
        state: state,
        mov: pieces[0], // idle, walk or run
        dir: pieces[1], // right or left
        opo: pieces[1] == "right" ? "left" : "right" // oposite direction
      };
    },
    frameDelay: function(animation) {
      var velocity = this.get("velocity");
      return animation.velocity && velocity ?
        animation.delay * animation.velocity / velocity :
        animation.delay;
    },
    update: function(dt) {
    // Update velocity and possibly state
    var velocity = this.get("velocity") || 0,
        yVelocity = this.get("yVelocity") || 0,
        yAcceleration = null,
        x = this.get("x"),
        y = this.get("y"),
        state = this.get("state"),
        cur = this.getStateInfo(),
        animation = _.extend({velocity:0, acceleration:0}, this.getAnimation() || {}),
        nextState = this.get("nextState"),
        nex = this.getStateInfo(nextState),
        nextAnimation = nextState ? _.extend({velocity:0, acceleration:0}, this.getAnimation(nextState) || {}) : null,
        attrs = {};

      // Update velocity and position if need be
      switch (state) {
        case "walk-right":
        case "run-right":
        case "release-left":
        case "skid-left":
          if (velocity < animation.velocity)
            velocity += animation.acceleration * (dt/1000);
          if (velocity >= animation.velocity) {
            velocity = animation.velocity;
            if (nextState) {
              attrs.state = nextState;
              animation = nextAnimation;
              if (animation.minVelocity && Math.abs(velocity) < Math.abs(animation.minVelocity))
                velocity = animation.minVelocity;
              attrs.nextState = null;
            }
          }
          attrs.velocity = velocity;
          break;

        case "walk-left":
        case "run-left":
        case "release-right":
        case "skid-right":
          if (velocity > animation.velocity)
            velocity -= animation.acceleration * (dt/1000);
          if (velocity <= animation.velocity) {
            velocity = animation.velocity;
            if (nextState) {
              attrs.state = nextState;
              animation = nextAnimation;
              if (animation.minVelocity && Math.abs(velocity) < Math.abs(animation.minVelocity))
                velocity = animation.minVelocity;
              attrs.nextState = null;
            }
          }
          attrs.velocity = velocity;
          break;

        case "idle-right":
        case "idle-left":
          // TO DO: This should never happen - but seems to. Figure out why...
          if (velocity != 0) {
            if (this.input.rightPressed())
              this.dirToggled("right")
            else if (this.input.leftPressed())
              this.dirToggled("left");
            else
              throw "Idle with velocity != 0 and no dir pressed!";
          }
          break;

        case "jump-right":
        case "jump-left":
          // Update vertical velocity. Determine proper vertical acceleration.
          if (yVelocity < animation.yEndVelocity) {
            yAcceleration = yVelocity < 0 ? animation.yAscentAcceleration : animation.yDescentAcceleration;
            if (yVelocity < 0 && this.input.buttonAPressed() && y > animation.minY)
              yAcceleration = animation.yHoldAscentAcceleration;
            yVelocity += yAcceleration * (dt/1000);
          }
          if (yVelocity >= animation.yEndVelocity)
            yVelocity = animation.yEndVelocity;

          if (y > groundY) {
            yVelocity = 0;
            attrs.y = groundY;
            attrs.state = nextState;
            if (nex.mov == "skid")
              attrs.nextState = (this.input.buttonBPressed() ? "run-" : "walk-") + nex.opo;
            else if(nex.mov == "release")
              attrs.nextState = "idle-" + nex.dir;
          }
          attrs.yVelocity = yVelocity;

          // Update horizontal velocity if trying to turnaround
          if (cur.dir == "right" && this.input.leftPressed()) {
            velocity -= animation.acceleration * (dt/1000);
            attrs.velocity = velocity;
          } else if (cur.dir == "left" && this.input.rightPressed()) {
            velocity += animation.acceleration * (dt/1000);
            attrs.velocity = velocity;
          }
          break;

      }
      if (velocity) attrs.x = x = x + velocity * (dt/1000);
      if (yVelocity) attrs.y = y = y + yVelocity * (dt/1000);


      // Set modified attributes
      if (!_.isEmpty(attrs)) this.set(attrs);


      // Debug panel
      if (this.debugPanel) this.debugPanel.set({
        x: Math.round(x),
        y: Math.round(y),
        velocity: Math.round(velocity),
        acceleration: Math.round(animation.acceleration),
        yVelocity: Math.round(yVelocity),
        yAcceleration: Math.round(yAcceleration),
        state: this.get("state"),
        nextState: this.get("nextState")
      });

      // Call parent function
      return Backbone.Sprite.prototype.update.apply(this, arguments);
    }
  });

}).call(this);