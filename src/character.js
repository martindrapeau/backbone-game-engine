(function() {

  /**
   *
   * Backbone Game Engine - An elementary HTML5 canvas game engine using Backbone.
   *
   * Copyright (c) 2014 Martin Drapeau
   * https://github.com/martindrapeau/backbone-game-engine
   *
   */

  var sequenceDelay = 300,
      walkVelocity = 50,
      fallAcceleration = 1200,
      fallVelocity = 600;

  Backbone.Character = Backbone.Sprite.extend({
    defaults: _.extend({}, Backbone.Sprite.prototype.defaults, {
      name: "character",
      type: "character",
      width: 32,
      height: 32,
      spriteSheet: undefined,
      state: "idle-right",
      velocity: 0,
      yVelocity: 0,
      collision: true
    }),
    animations: {
      "idle-left": {
        sequences: [0],
        velocity: 0,
        scaleX: 1,
        scaleY: 1
      },
      "idle-right": {
        sequences: [0],
        velocity: 0,
        scaleX: -1,
        scaleY: 1
      },
      "walk-left": {
        sequences: [1, 0],
        velocity: -walkVelocity,
        scaleX: 1,
        scaleY: 1,
        delay: sequenceDelay
      },
      "walk-right": {
        sequences: [1, 0],
        velocity: walkVelocity,
        scaleX: -1,
        scaleY: 1,
        delay: sequenceDelay
      },
      "fall-left": {
        sequences: [0],
        velocity: -walkVelocity,
        yVelocity: fallVelocity,
        yAcceleration: fallAcceleration,
        scaleX: 1,
        scaleY: 1
      },
      "fall-right": {
        sequences: [0],
        velocity: walkVelocity,
        yVelocity: fallVelocity,
        yAcceleration: fallAcceleration,
        scaleX: -1,
        scaleY: 1
      }
    },
    initialize: function(attributes, options) {
      Backbone.Sprite.prototype.initialize.apply(this, arguments);
      options || (options = {});
      this.world = options.world;
      _.bindAll(this, "isBlocking");

      this.on("attach", this.onAttach, this);
      this.on("detach", this.onDetach, this);

      this.on("hit", this.hit, this);
    },
    onAttach: function() {
      if (!this.engine) return;
      this.onDetach();

      if (this.world) this.set("state", "walk-left");
    },
    onDetach: function() {
    },
    isBlocking: function(sprite) {
      return true;
    },
    hit: function(sprite, dir, yDir) {
    },
    update: function(dt) {
      // Movements are only possible inside a world
      if (!this.world) return true;

      var velocity = this.get("velocity") || 0,
          yVelocity = this.get("yVelocity") || 0,
          x = this.get("x"),
          y = this.get("y"),
          state = this.get("state"),
          cur = this.getStateInfo(),
          animation = this.getAnimation(),
          sequenceIndex = this.get("sequenceIndex"),
          delay = animation.delay || 0,
          now = _.now(),
          attrs = {};

      if (!animation.sequences || sequenceIndex >= animation.sequences.length) {
        attrs.sequenceIndex = 0;
        this.lastSequenceChangeTime = now;
      } else if (delay && now > this.lastSequenceChangeTime + delay) {
        attrs.sequenceIndex = sequenceIndex < animation.sequences.length-1 ? sequenceIndex + 1 : 0;
        this.lastSequenceChangeTime = now;
      }
      if (velocity != animation.velocity) velocity = animation.velocity;

      // If falling, update vertical velocity
      if (cur.mov == "fall") {
        if (yVelocity < animation.yVelocity)
          yVelocity += animation.yAcceleration * (dt/1000);

        if (yVelocity >= animation.yVelocity)
          yVelocity = animation.yVelocity;
        attrs.yVelocity = yVelocity;
      }

      // Collisions
      var collision = this.get("collision"),
          charWidth = this.get("width"),
          charHeight = this.get("height"),
          charTopY = Math.round(y + yVelocity * (dt/1000)),
          charBottomY = charTopY + charHeight,
          charLeftX = Math.round(x + velocity * (dt/1000)),
          charRightX = charLeftX + charWidth,
          bottomTile = this.world.findCollidingAt(charLeftX + charWidth/2, charBottomY),
          bottomY = _.minNotNull([
            this.world.height(),
            bottomTile ? bottomTile.get("y") : null
          ]);

      // Gravity
      if (charBottomY >= bottomY) {
        // Stop falling if obstacle below
        attrs.yVelocity = yVelocity = 0;
        attrs.y = y = bottomY - charHeight;
        if (cur.mov == "fall")
          attrs.state = "walk-" + cur.dir;
      } else if (cur.mov != "fall" && charBottomY < bottomY) {
        // Start falling if no obstacle below
        attrs.state = "fall-" + cur.dir;
      }

      // Walls and other obstacles
      if (velocity <= 0 && collision) {
        // Turn around if obstacle left
        var leftTile = this.world.findCollidingAt(charLeftX, charTopY + charHeight*3/4),
            leftCharacter = this.world.findAt(charLeftX, charTopY + charHeight*3/4, "character", this, true),
            leftX = _.maxNotNull([
              0,
              leftTile ? (leftTile.get("x") + leftTile.get("width")) : null,
              leftCharacter ? (leftCharacter.get("x") + leftCharacter.get("width")) : null
            ]);

        if (charLeftX <= leftX) {
          attrs.state = cur.mov + "-right";
          attrs.velocity = velocity * -1;
          attrs.x = x = leftX;
        }
      }

      if (velocity >= 0 && collision) {
        // Turn around if obstacle to the right
        var rightTile = this.world.findCollidingAt(charRightX, charTopY + charHeight*3/4),
            rightCharacter = this.world.findAt(charRightX, charTopY + charHeight*3/4, "character", this, true),
            rightX = _.minNotNull([
              this.world.width(),
              rightTile ? rightTile.get("x") : null,
              rightCharacter ? rightCharacter.get("x") : null
            ]);

        if (charRightX >= rightX) {
          attrs.state = cur.mov + "-left";
          attrs.velocity = velocity * -1;
          attrs.x = x = rightX - charWidth;
          }
      }

      // In edit mode, do not allow horizontal displacements or animations
      if (this.world.get("state") == "edit") {
        velocity = 0;
        attrs.sequenceIndex = 0;
      }

      if (velocity) attrs.x = x = x + velocity * (dt/1000);
      if (yVelocity) attrs.y = y = y + yVelocity * (dt/1000);

      attrs.col = this.world.getWorldCol(x + charWidth/2);
      attrs.row = this.world.getWorldRow(y + charHeight/4);

      // Set modified attributes
      if (!_.isEmpty(attrs)) this.set(attrs);

      return true;
    },
    toggleDirection: function(dirIntent) {
      var cur = this.getStateInfo();
      this.set({state: cur.mov + "-" + dirIntent});
      return this;
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

}).call(this);