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
      collision: true,
      floor: null
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
      },
      "ko-left": {
        sequences: [0],
        velocity: -walkVelocity,
        yVelocity: fallVelocity,
        yAcceleration: fallAcceleration,
        scaleX: 1,
        scaleY: -1
      },
      "ko-right": {
        sequences: [0],
        velocity: walkVelocity,
        yVelocity: fallVelocity,
        yAcceleration: fallAcceleration,
        scaleX: -1,
        scaleY: -1
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
    knockout: function(sprite, dir) {
      this.set({
        state: "ko-" + dir,
        velocity: this.animations["ko-left"].velocity,
        yVelocity: -this.animations["ko-left"].yVelocity/2,
        collision: false
      });
      return this;
    },
    hit: function(sprite, dir, dir2) {
      return this;
    },
    updateSequenceIndex: function(dt) {
      var sequenceIndex = this.get("sequenceIndex"),
          animation = this.getAnimation(),
          delay = animation.delay || 0,
          now = _.now();

      if (!animation.sequences || sequenceIndex >= animation.sequences.length) {
        sequenceIndex = 0;
        this.lastSequenceChangeTime = now;
      } else if (delay && now > this.lastSequenceChangeTime + delay) {
        sequenceIndex = sequenceIndex < animation.sequences.length-1 ? sequenceIndex + 1 : 0;
        this.lastSequenceChangeTime = now;
      }

      return sequenceIndex;
    },
    update: function(dt) {
      // Movements are only possible inside a world
      if (!this.world) return true;

      // Velocity and state
      var self = this,
          velocity = this.get("velocity") || 0,
          yVelocity = this.get("yVelocity") || 0,
          x = this.get("x"),
          y = this.get("y"),
          state = this.get("state"),
          cur = this.getStateInfo(),
          animation = this.getAnimation(),
          attrs = {};

      attrs.sequenceIndex = this.updateSequenceIndex();

      if (velocity != animation.velocity) velocity = animation.velocity;

      if (cur.mov == "fall" || cur.mov == "ko") {
        if (yVelocity < animation.yVelocity)
          yVelocity += animation.yAcceleration * (dt/1000);

        if (yVelocity >= animation.yVelocity)
          yVelocity = animation.yVelocity;
        attrs.yVelocity = yVelocity;
      }

      // Collision detection
      var collision = this.get("collision"),
          charWidth = this.get("width"),
          tileHeight = this.get("height"),
          charHeight = tileHeight / 2,
          charBottomY = Math.round(y + yVelocity * (dt/1000)) + tileHeight,
          charTopY = charBottomY - charHeight,
          charLeftX = Math.round(x + velocity * (dt/1000)),
          charRightX = charLeftX + charWidth,
          bottomTile = cur.mov != "ko" ? this.world.findAt(charLeftX + charWidth/2, charBottomY, "tile", this, true) : null,
          bottomWorld = this.world.height() + tileHeight,
          bottomY = _.minNotNull([
            this.get("floor"),
            bottomWorld,
            bottomTile ? bottomTile.get("y") : null
          ]);

      if (yVelocity >= 0) {
        // Walking or Falling...
        if (charBottomY >= bottomY) {
          if (charBottomY >= bottomWorld) {
            this.world.remove(this);
            return false;
          }

          // Knock-out if bouncing tile below
          var reaction = this.getHitReaction(bottomTile, "bottom");
          if (reaction == "ko") return this.knockout(bottomTile, cur.dir);

          // Stop falling because obstacle below
          attrs.yVelocity = yVelocity = 0;
          attrs.y = y = bottomY - tileHeight;
          if (cur.mov == "fall")
            attrs.state = "walk-" + cur.dir;
        } else if (cur.mov != "fall" && cur.mov != "ko" && charBottomY < bottomY) {
          // Start falling if no obstacle below
          attrs.state = "fall-" + cur.dir;
        }

      } else if (cur.mov == "fall" && yVelocity < 0) {
        // Jumping
        var topTile = cur.mov != "ko" ? this.world.findAt(charLeftX + charWidth/2, charTopY, "tile", this, true) : null,
            topY = _.maxNotNull([
              -400,
              topTile ? (topTile.get("y") + topTile.get("height")) : null
            ]);
        if (charTopY < topY) {
          attrs.yVelocity = yVelocity = 0;
          charTopY = topY;
          charBottomY = topY + charHeight;
          attrs.y = y = charBottomY - tileHeight;
        }

      }

      // When not in play mode, do not allow horizontal displacements or animations
      if (this.world.get("state") != "play") {
        velocity = 0;
        attrs.sequenceIndex = 0;

      } else {
        
        // Walls and other obstacles
        if (velocity <= 0 && collision) {
          // Turn around if obstacle left
          var leftTile = cur.mov != "ko" ? this.world.findAt(charLeftX, charTopY, "tile", this, true) : null,
              leftCharacter = cur.mov != "ko" ? this.world.findAt(charLeftX + charWidth/4, charTopY, "character", this, true) : null,
              worldLeft = -charWidth,
              leftX = _.maxNotNull([
                worldLeft,
                leftTile ? (leftTile.get("x") + leftTile.get("width")) : null
              ]);

          if (charLeftX <= leftX) {
            if (charLeftX <= worldLeft) {
              this.world.remove(this);
              return false;
            }
            velocity = velocity * -1;
            attrs.state = cur.mov + "-" + cur.opo;
            attrs.x = x = leftX;
          } else if (leftCharacter) {
            leftX = leftCharacter.get("x") + leftCharacter.get("width");
            if (charLeftX <= leftX) {
              var reaction = this.getHitReaction(leftCharacter, "left");
              if (reaction == "reverse") {
                velocity = velocity * -1;
                attrs.state = cur.mov + "-" + cur.opo;
                attrs.x = x = leftX;
              }
              leftCharacter.trigger("hit", this, "right");
            }
          }
        }

        if (velocity >= 0 && collision) {
          // Turn around if obstacle to the right
          var rightTile = cur.mov != "ko" ? this.world.findAt(charRightX, charTopY, "tile", this, true) : null,
              rightCharacter = cur.mov != "ko" ? this.world.findAt(charRightX - charWidth/4, charTopY, "character", this, true) : null,
              worldRight = this.world.width(),
              rightX = _.minNotNull([
                worldRight,
                rightTile ? rightTile.get("x") : null
              ]);

          if (charRightX >= rightX) {
            if (charRightX >= worldRight) {
              this.world.remove(this);
              return false;
            }
            velocity = velocity * -1;
            attrs.state = cur.mov + "-" + cur.opo;
            attrs.x = x = rightX - charWidth;
          } else if (rightCharacter) {
            rightX = rightCharacter.get("x");
            if (charRightX + charWidth >= rightX) {
              var reaction = this.getHitReaction(rightCharacter, "right");
              if (reaction == "reverse") {
                velocity = velocity * -1;
                attrs.state = cur.mov + "-" + cur.opo;
                attrs.x = x = rightX - charWidth;
              }
              rightCharacter.trigger("hit", this, "left");
            }
          }
        }
      }

      if (velocity) attrs.x = x = x + velocity * (dt/1000);
      if (yVelocity) attrs.y = y = y + yVelocity * (dt/1000);

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
    },
    // Returns a reaction when the character hits another sprite.
    // Return value may be:
    //   - null: No reaction
    //   - reverse: Change direction
    //   - ko: Knock-out and die
    getHitReaction: function(sprite, dir, dir2) {
      if (sprite.get("name").indexOf("pennie") != -1) return null;
      if (dir == "left" || dir =="right") return "reverse";
      return null;
    }
  });

}).call(this);