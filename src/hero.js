(function() {

  /**
   *
   * Backbone Game Engine - An elementary HTML5 canvas game engine using Backbone.
   *
   * Copyright (c) 2014 Martin Drapeau
   * https://github.com/martindrapeau/backbone-game-engine
   *
   */

  // Velocity and acceleration values in absolute values
  var walkVelocity = 160,
      walkMinVelocity = 60,
      walkAcceleration = 150,
      runVelocity = 220,
      runMinVelocity = 100,
      runAcceleration = 400,
      releaseDeceleration = 200,
      skidDeceleration = 400,
      jumpVelocity = 650,
      jumpDeceleration = 1400,
      jumpHoldDeceleration = 900,
      fallAcceleration = 1200,
      airTurnaroundDeceleration = 400,
      fallVelocity = 600,
      walkDelay = 100,
      runDelay = 50;

  // Backbone.Hero implements the Mario character in Super Mario Bros.
  Backbone.Hero = Backbone.Character.extend({
    defaults: _.extend({}, Backbone.Character.prototype.defaults, {
      name: "hero",
      type: "character",
      hero: true,
      width: 32,
      height: 64,
      zIndex: 1,
      spriteSheet: undefined,
      state: "idle-right",
      powerUp: "small", // small or big
      velocity: 0,
      acceleration: 0,
      yVelocity: 0,
      yAcceleration: 0,
      collision: true
    }),
    animations: {
      "idle-left": {
        sequences: [21],
        velocity: 0,
        acceleration: 0,
        scaleX: -1,
        scaleY: 1
      },
      "idle-right": {
        sequences: [21],
        velocity: 0,
        acceleration: 0,
        scaleX: 1,
        scaleY: 1
      },
      "walk-left": {
        sequences: [22, 23, 24, 23],
        delay: walkDelay,
        velocity: -walkVelocity,
        minVelocity: -walkMinVelocity,
        acceleration: walkAcceleration,
        scaleX: -1,
        scaleY: 1
      },
      "walk-right": {
        sequences: [22, 23, 24, 23],
        delay: walkDelay,
        velocity: walkVelocity,
        minVelocity: walkMinVelocity,
        acceleration: walkAcceleration,
        scaleX: 1,
        scaleY: 1
      },
      "run-left": {
        sequences: [22, 23, 24, 23],
        delay: runDelay,
        velocity: -runVelocity,
        minVelocity: -runMinVelocity,
        acceleration: runAcceleration,
        scaleX: -1,
        scaleY: 1
      },
      "run-right": {
        sequences: [22, 23, 24, 23],
        delay: runDelay,
        velocity: runVelocity,
        minVelocity: runMinVelocity,
        acceleration: runAcceleration,
        scaleX: 1,
        scaleY: 1
      },
      "release-left": {
        sequences: [22, 23, 24, 23],
        delay: walkDelay,
        velocity: 0,
        acceleration: releaseDeceleration,
        scaleX: -1,
        scaleY: 1
      },
      "release-right": {
        sequences: [22, 23, 24, 23],
        delay: walkDelay,
        velocity: 0,
        acceleration: releaseDeceleration,
        scaleX: 1,
        scaleY: 1
      },
      "skid-left": {
        sequences: [25],
        velocity: 0,
        acceleration: skidDeceleration,
        scaleX: 1,
        scaleY: 1
      },
      "skid-right": {
        sequences: [25],
        velocity: 0,
        acceleration: skidDeceleration,
        scaleX: -1,
        scaleY: 1
      },
      "jump-left": {
        sequences: [26],
        velocity: -walkVelocity,
        acceleration: airTurnaroundDeceleration,
        yStartVelocity: -jumpVelocity,
        yEndVelocity: fallVelocity,
        yAscentAcceleration: jumpDeceleration,
        yHoldAscentAcceleration: jumpHoldDeceleration,
        yDescentAcceleration: fallAcceleration,
        scaleX: -1,
        scaleY: 1
      },
      "jump-right": {
        sequences: [26],
        velocity: walkVelocity,
        acceleration: airTurnaroundDeceleration,
        yStartVelocity: -jumpVelocity,
        yEndVelocity: fallVelocity,
        yAscentAcceleration: jumpDeceleration,
        yHoldAscentAcceleration: jumpHoldDeceleration,
        yDescentAcceleration: fallAcceleration,
        scaleX: 1,
        scaleY: 1
      },
      "ko-left": {
        sequences: [27],
        velocity: 0,
        yVelocity: 2*fallVelocity,
        yAcceleration: fallAcceleration,
        scaleX: 1,
        scaleY: 1
      },
      "ko-right": {
        sequences: [27],
        velocity: 0,
        yVelocity: 2*fallVelocity,
        yAcceleration: fallAcceleration,
        scaleX: -1,
        scaleY: 1
      }
    },
    saveAttributes: _.union(
      Backbone.Character.prototype.saveAttributes,
      ["nextState", "velocity", "acceleration", "yVelocity", "yAcceleration"]
    ),
    initialize: function(attributes, options) {
      options || (options = {});
      Backbone.Character.prototype.initialize.apply(this, arguments);

      this.input = options.input;

      this.on("attach", this.onAttach, this);
      this.on("detach", this.onDetach, this);
    },
    onAttach: function() {
      if (this.input) {
        this.stopListening(this.input);
        this.listenTo(this.input, "change:right", _.partial(this.dirToggled, "right"));
        this.listenTo(this.input, "change:left", _.partial(this.dirToggled, "left"));
        this.listenTo(this.input, "change:buttonB", this.buttonBToggled);
        this.listenTo(this.input, "change:buttonA", this.buttonAToggled);
      }
      this.debugPanel = this.engine && this.engine.debugPanel ? this.engine.debugPanel : undefined;
    },
    onDetach: function() {
      if (this.input) this.stopListening(this.input);
      this.debugPanel = undefined;
    },
    hit: function(sprite, dir, dir2) {
      if (sprite.get("type") == "character") {
        var name = sprite.get("name"),
            cur = sprite.getStateInfo ? sprite.getStateInfo() : null;

        if (cur == null) return this;
        if (cur.mov == "squished" || cur.mov == "wake") return this;
        if (dir == "top" && name != "spike") return this;

        return this.knockout(sprite, "left");
      }
      return this;
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
          dirPressed = this.input ? this.input[dirIntent+"Pressed"]() : false,
          opoPressed = this.input ? this.input[opoIntent+"Pressed"]() : false,
          buttonBPressed = this.input ? this.input.buttonBPressed() : false,
          velocity = this.get("velocity"),
          attrs = {};

      if (cur.mov == "ko") return this;

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
          pressed = this.input ? this.input.buttonBPressed() : false,
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

      if (cur.mov == "ko") return this;

      if (this.input && this.input.buttonAPressed() && cur.mov != "jump") {
        // Set new state (keep old as next)
        attrs.state = "jump-" + cur.dir;
        attrs.nextState = state;

        // Determine vertical velocity as a factor of horizontal velocity
        var jumpAnimation = this.getAnimation(attrs.state),
            velocity = this.get("velocity"),
            walkVelocity = this.getAnimation("walk-right").velocity,
            runVelocity = this.getAnimation("run-right").velocity,
            ratio = Math.abs((Math.abs(velocity) > walkVelocity ? velocity : walkVelocity) / runVelocity);
        attrs.yVelocity = Math.round(jumpAnimation.yStartVelocity * (ratio + (1-ratio)/2));

        var heroSmall = this.get("powerUp") == "small",
          heroWidth = this.get("width"),
          tileHeight = this.get("height"),
          heroHeight = heroSmall ? tileHeight/2 : tileHeight,
          heroBottomY = Math.round(this.get("y") - 4) + tileHeight,
          heroTopY = heroBottomY - heroHeight,
          heroLeftX = this.get("x"),
          topLeftTile = heroTopY > 0 ? this.world.findAt(heroLeftX + heroWidth/4, heroTopY, "tile", this, true) : null,
          topRightTile = heroTopY > 0 ? this.world.findAt(heroLeftX + heroWidth*3/4, heroTopY, "tile", this, true) : null;
        if (topLeftTile || topRightTile) attrs.yVelocity = -2*60;

        // Keep the horizontal velocity
        jumpAnimation.minY = (this.get("y") - this.world.height()) * ratio;
      }
      if (!_.isEmpty(attrs)) this.set(attrs);

      return this;
    },
    sequenceDelay: function(animation) {
      var velocity = this.get("velocity");
      return animation.velocity && velocity ?
        animation.delay * animation.velocity / velocity :
        animation.delay;
    },
    update: function(dt) {
      // Movements are only possible inside a world
      if (!this.world) return true;

      // Velocity and state
      var input = this.input,
          velocity = this.get("velocity") || 0,
          yVelocity = this.get("yVelocity") || 0,
          yAcceleration = null,
          x = this.get("x"),
          y = this.get("y"),
          state = this.get("state"),
          cur = this.getStateInfo(),
          animation = this.getAnimation(),
          nextState = this.get("nextState"),
          nex = this.getStateInfo(nextState),
          nextAnimation = nextState ? (this.getAnimation(nextState) || {}) : null,
          attrs = {};

      attrs.sequenceIndex = this.updateSequenceIndex();

      switch (state) {
        case "walk-right":
        case "run-right":
        case "release-left":
        case "skid-left":
          if (velocity < animation.velocity)
            velocity += Math.round(animation.acceleration * (dt/1000));
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
            velocity -= Math.round(animation.acceleration * (dt/1000));
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
            if (input && input.rightPressed())
              this.toggleDirection("right");
            else if (input && input.leftPressed())
              this.toggleDirection("left");
            else
              throw "Idle with velocity != 0 and no dir pressed!";
          }
          break;

        case "jump-right":
        case "jump-left":
          // Update vertical velocity. Determine proper vertical acceleration.
          if (yVelocity < animation.yEndVelocity) {
            yAcceleration = yVelocity < 0 ? animation.yAscentAcceleration : animation.yDescentAcceleration;
            if (yVelocity < 0 && input && input.buttonAPressed() && y > animation.minY)
              yAcceleration = animation.yHoldAscentAcceleration;
            yVelocity += yAcceleration * (dt/1000);
          }
          if (yVelocity >= animation.yEndVelocity)
            yVelocity = animation.yEndVelocity;
          attrs.yVelocity = yVelocity;

          // Update horizontal velocity if trying to turnaround
          if (input && input.leftPressed() && velocity > -Math.abs(animation.velocity)) {
            velocity -= Math.abs(animation.acceleration) * (dt/1000);
            attrs.velocity = velocity;
          } else if (input && input.rightPressed() && velocity < Math.abs(animation.velocity)) {
            velocity += Math.abs(animation.acceleration) * (dt/1000);
            attrs.velocity = velocity;
          }
          break;

        case "ko-left":
        case "ko-right":
          if (yVelocity < animation.yVelocity)
            yVelocity += animation.yAcceleration * (dt/1000);

          if (yVelocity >= animation.yVelocity)
            yVelocity = animation.yVelocity;
          attrs.yVelocity = yVelocity;
          break;
      }

      // Collision detection
      var heroSmall = this.get("powerUp") == "small",
          heroWidth = this.get("width"),
          tileHeight = this.get("height"),
          heroHeight = heroSmall ? tileHeight/2 : tileHeight,
          heroLeftX = Math.round(x + velocity * (dt/1000));

      var heroBottomY, heroTopY, obstacleCheckTopY, obstacleCheckBottomY;
      function updateHeroTopBottom() {
        heroBottomY = Math.round(y + yVelocity * (dt/1000)) + tileHeight;
        heroTopY = heroBottomY - heroHeight;
        obstacleCheckTopY = heroTopY + heroHeight/4;
        obstacleCheckBottomY = heroTopY + heroHeight*3/4;
      }
      updateHeroTopBottom();

      var bottomLeftTile = cur.mov != "ko" ? this.world.findAt(heroLeftX + heroWidth/4, heroBottomY, "tile", this, true) : null,
          bottomRightTile = cur.mov != "ko" ? this.world.findAt(heroLeftX + heroWidth*3/4, heroBottomY, "tile", this, true) : null,
          bottomWorld = this.world.height() + heroHeight,
          bottomY = _.minNotNull([
            this.get("floor"),
            bottomWorld,
            bottomLeftTile ? bottomLeftTile.get("y") : null,
            bottomRightTile ? bottomRightTile.get("y") : null
          ]);

      if (cur.mov == "ko") {
        if (heroBottomY >= bottomWorld) {
          this.world.remove(this);
          return false;
        }
      } else {

        if (cur.mov == "jump" && yVelocity > 0) {
          // Falling...

          function land(bottomY) {
            attrs.yVelocity = yVelocity = 0;
            attrs.y = y = bottomY - tileHeight;
            updateHeroTopBottom();
            attrs.state = nextState;
            if (nex.move == "walk" || nex.move == "run")
              attrs.nextState = (input && input.buttonBPressed() ? "run-" : "walk-") + nex.dir;
            if (nex.mov == "skid")
              attrs.nextState = (input && input.buttonBPressed() ? "run-" : "walk-") + nex.opo;
            else if(nex.mov == "release")
              attrs.nextState = "idle-" + nex.dir;
          }

          if (heroBottomY >= bottomY) {
            // Stop falling if obstacle below
            if (heroBottomY >= bottomWorld) {
              this.world.remove(this);
              return false;
            }
            land(bottomY);
          } else {
            // Enemie below?
            var bottomLeftCharacter = heroBottomY > 0 ? this.world.findAt(heroLeftX + heroWidth/4, heroBottomY, "character", this, true) : null,
                bottomRightCharacter = heroBottomY > 0 ? this.world.findAt(heroLeftX + heroWidth*3/4, heroBottomY, "character", this, true) : null,
                characterBottomY = _.minNotNull([
                    bottomY,
                    bottomLeftCharacter ? bottomLeftCharacter.get("y") : null,
                    bottomRightCharacter ? bottomRightCharacter.get("y") : null
                ]);
            if (characterBottomY != bottomY) {
              var reaction = this.getHitReaction(bottomLeftCharacter || bottomRightCharacter, "bottom", bottomLeftCharacter ? "left": "right");
              if (reaction == "block") {
                land(characterBottomY);
              } else if (reaction == "bounce") {
                attrs.yVelocity = yVelocity = animation.yStartVelocity*1/4;
                attrs.y = y = characterBottomY - tileHeight;
                updateHeroTopBottom();
              } else if (reaction == "ko") {
                return this.knockout(bottomLeftCharacter || bottomRightCharacter, bottomLeftCharacter ? "left": "right");
              }

              if (bottomLeftCharacter)
                bottomLeftCharacter.trigger("hit", this, "top", "right");
              if (bottomRightCharacter && bottomLeftCharacter != bottomRightCharacter)
                bottomRightCharacter.trigger("hit", this, "top", "left");
            }
          }

        } else if (cur.mov == "jump" && yVelocity < 0) {
          // Stop jumping if obstacle above
          var topLeftTile = heroTopY > 0 ? this.world.findAt(heroLeftX + heroWidth/4, heroTopY, "tile", this, true) : null,
              topRightTile = heroTopY > 0 ? this.world.findAt(heroLeftX + heroWidth*3/4, heroTopY, "tile", this, true) : null,
              topY = _.maxNotNull([
                -400,
                topLeftTile ? (topLeftTile.get("y") + topLeftTile.get("height")) : null,
                topRightTile ? (topRightTile.get("y") + topRightTile.get("height")) : null,
              ]);
          if (heroTopY < topY) {
            attrs.yVelocity = yVelocity = 0;
            attrs.y = y = topY + heroHeight - tileHeight;
            updateHeroTopBottom();
            if (cur.dir == "left") {
              if (topLeftTile) topLeftTile.trigger("hit", this);
              else if (topRightTile) topRightTile.trigger("hit", this);
            } else {
              if (topRightTile) topRightTile.trigger("hit", this);
              else if (topLeftTile) topLeftTile.trigger("hit", this);
            }
          } else {
            // Enemie above?
            var topLeftCharacter = this.world.findAt(heroLeftX + heroWidth/4, heroTopY, "character", this, true),
                topRightCharacter = this.world.findAt(heroLeftX + heroWidth*3/4, heroTopY, "character", this, true),
                characterTopY = _.maxNotNull([
                    topY,
                    topLeftCharacter ? (topLeftCharacter.get("y") + topLeftCharacter.get("height")) : null,
                    topRightCharacter ? (topRightCharacter.get("y") + topRightCharacter.get("height")) : null
                ]);
            if (characterTopY != topY) {
              var reaction = this.getHitReaction(topLeftCharacter || topRightCharacter, "top", topLeftCharacter ? "left": "right");
              if (reaction == "block") {
                attrs.yVelocity = yVelocity = 0;
                attrs.y = y = characterTopY + heroHeight - tileHeight;
                updateHeroTopBottom();
              }

              if (topLeftCharacter) topLeftCharacter.trigger("hit", this, "bottom", "left");
              if (topRightCharacter) topRightCharacter.trigger("hit", this, "bottom", "right");
            }
          }
        } else if (cur.mov != "jump" && heroBottomY < bottomY) {
          // Start falling if no obstacle below
          attrs.nextState = state;
          attrs.state = "jump-" + cur.dir;
        }

        if (velocity <= 0) {
          // Stop if obstacle left
          var leftTopTile = obstacleCheckTopY > 0 ? this.world.findAt(heroLeftX, obstacleCheckTopY, "tile", this, true) : null,
              leftBottomTile = obstacleCheckBottomY > 0 ? this.world.findAt(heroLeftX, obstacleCheckBottomY, "tile", this, true) : null,
              leftBottomCharacter = this.world.findAt(heroLeftX + heroWidth/4, obstacleCheckBottomY, "character", this, true),
              leftX = _.maxNotNull([
                0,
                leftTopTile ? (leftTopTile.get("x") + leftTopTile.get("width")) : null,
                leftBottomTile ? (leftBottomTile.get("x") + leftBottomTile.get("width")) : null
              ]);

          if (heroLeftX <= leftX) {
            // Hit a tile or end of the world
            attrs.velocity = velocity = 0;
            attrs.x = x = leftX;

          } else if (leftBottomCharacter) {
            // Check for character hit
            leftX = leftBottomCharacter.get("x") + leftBottomCharacter.get("width");
            if (heroLeftX <= leftX) {
              var reaction = this.getHitReaction(leftBottomCharacter, "left");
              if (reaction == "block") {
                attrs.velocity = velocity = 0;
                attrs.x = x = leftX;
              } else if (reaction == "ko") {
                return this.knockout(rightBottomCharacter, "right");
              }
              this.hit(leftBottomCharacter, "left");
              leftBottomCharacter.trigger("hit", this, "right");
            }
          }

        }

        if (velocity >= 0) {
          // Stop if obstacle to the right
          var rightTopTile = obstacleCheckTopY > 0 ? this.world.findAt(heroLeftX + heroWidth, obstacleCheckTopY, "tile", this, true) : null,
              rightBottomTile = obstacleCheckBottomY > 0 ? this.world.findAt(heroLeftX + heroWidth, obstacleCheckBottomY, "tile", this, true) : null,
              rightBottomCharacter = this.world.findAt(heroLeftX + heroWidth*3/4, obstacleCheckBottomY, "character", this, true),
              rightX = _.minNotNull([
                this.world.width(),
                rightTopTile ? rightTopTile.get("x") : null,
                rightBottomTile ? rightBottomTile.get("x") : null
              ]);

          if (heroLeftX + heroWidth >= rightX) {
            // Hit a tile or end of the world
            attrs.velocity = velocity = 0;
            attrs.x = x = rightX - heroWidth;

          } else if (rightBottomCharacter) {
            // Check for character hit
            rightX = rightBottomCharacter.get("x");
            if (heroLeftX + heroWidth >= rightX) {
              var reaction = this.getHitReaction(rightBottomCharacter, "right");
              if (reaction == "block") {
                attrs.velocity = velocity = 0;
                attrs.x = x = rightX - heroWidth;
              } else if (reaction == "ko") {
                return this.knockout(rightBottomCharacter, "left");
              }
              this.hit(rightBottomCharacter, "right");
              rightBottomCharacter.trigger("hit", this, "left");
            }
          }

        }
      }

      if (velocity) attrs.x = x = x + Math.round(velocity * (dt/1000));
      if (yVelocity) attrs.y = y = y + Math.round(yVelocity * (dt/1000));

      // Set modified attributes
      if (!_.isEmpty(attrs)) this.set(attrs);

      return true;
    },
    // Returns a reaction when hero hits a character.
    // Return value may be:
    //   - null: No reaction
    //   - block: Stop moving in that direction
    //   - bounce: Bounce back in the opposite direction
    //   - ko: Knock-out and die
    getHitReaction: function(character, dir, dir2) {
      if (!character.isBlocking(this)) return null;
      var name = character.get("name");
      if ((dir == "left" || dir == "right") && name.indexOf("turtle") == -1) return "ko";
      if (dir == "bottom" && name == "spike") return "ko";
      if (dir == "bottom") return "bounce";
      return "block";
    }
  });

}).call(this);