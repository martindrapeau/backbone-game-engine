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
      fallVelocity = 600,
      animations;

  // Mushroom is the base enemie class.
  Backbone.Mushroom = Backbone.Sprite.extend({
    defaults: _.extend({}, Backbone.Sprite.prototype.defaults, {
      name: "mushroom",
      type: "character",
      width: 32,
      height: 64,
      spriteSheet: "enemies",
      state: "idle-left",
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
      },
      "squished-left": {
        sequences: [2],
        velocity: 0,
        scaleX: 1,
        scaleY: 1
      },
      "squished-right": {
        sequences: [2],
        velocity: 0,
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

      // Squish
      this.on("squish", this.squish, this);
      this.on("hit", this.hit, this);
    },
    onAttach: function() {
      if (!this.engine) return;
      this.onDetach();

      if (this.world) this.set("state", "walk-left");
    },
    onDetach: function() {
    },
    isBlocking: function(sprite, position) {
      return true;
    },
    squish: function(sprite, position) {
      if (sprite.get("name") != "mario") return;
      var cur = this.getStateInfo();
      this.set({state: "squished-" + cur.dir, collision: false});
    },
    hit: function(sprite, position) {

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
          mushWidth = this.get("width"),
          mushHeight = this.get("height"),
          mushTopY = Math.round(y + yVelocity * (dt/1000)),
          mushBottomY = mushTopY + mushHeight,
          mushLeftX = Math.round(x + velocity * (dt/1000)),
          mushRightX = mushLeftX + mushWidth,
          bottomTile = this.world.findCollidingAt(mushLeftX + mushWidth/2, mushBottomY),
          bottomY = _.minNotNull([
            this.world.height(),
            bottomTile ? bottomTile.get("y") : null
          ]);

      // Gravity
      if (mushBottomY >= bottomY) {
        // Stop falling if obstacle below
        attrs.yVelocity = yVelocity = 0;
        attrs.y = y = bottomY - mushHeight;
        if (cur.mov == "fall")
          attrs.state = "walk-" + cur.dir;
      } else if (cur.mov != "fall" && mushBottomY < bottomY) {
        // Start falling if no obstacle below
        attrs.state = "fall-" + cur.dir;
      }

      // Walls and other obstacles
      if (velocity <= 0 && collision) {
        // Turn around if obstacle left
        var leftTile = this.world.findCollidingAt(mushLeftX, mushTopY + mushHeight*3/4),
            leftCharacter = this.world.findAt(mushLeftX, mushTopY + mushHeight*3/4, "character", this, true),
            leftX = _.maxNotNull([
              0,
              leftTile ? (leftTile.get("x") + leftTile.get("width")) : null,
              leftCharacter ? (leftCharacter.get("x") + leftCharacter.get("width")) : null
            ]);

        if (mushLeftX <= leftX) {
          attrs.state = cur.mov + "-right";
          attrs.velocity = velocity * -1;
          attrs.x = x = leftX;
        }
      }

      if (velocity >= 0 && collision) {
        // Turn around if obstacle to the right
        var rightTile = this.world.findCollidingAt(mushRightX, mushTopY + mushHeight*3/4),
            rightCharacter = this.world.findAt(mushRightX, mushTopY + mushHeight*3/4, "character", this, true),
            rightX = _.minNotNull([
              this.world.width(),
              rightTile ? rightTile.get("x") : null,
              rightCharacter ? rightCharacter.get("x") : null
            ]);

        if (mushRightX >= rightX) {
          attrs.state = cur.mov + "-left";
          attrs.velocity = velocity * -1;
          attrs.x = x = rightX - mushWidth;
          }
      }

      // In edit mode, do not allow horizontal displacements or animations
      if (this.world.get("state") == "edit") {
        velocity = 0;
        attrs.sequenceIndex = 0;
      }

      if (velocity) attrs.x = x = x + velocity * (dt/1000);
      if (yVelocity) attrs.y = y = y + yVelocity * (dt/1000);

      attrs.col = this.world.getWorldCol(x + mushWidth/2);
      attrs.row = this.world.getWorldRow(y + mushHeight/4);

      // Set modified attributes
      if (!_.isEmpty(attrs)) this.set(attrs);

      return true;
    },
    // Overlap only on bottom half. Top is empty space.
    overlaps: function(x, y) {
      var sw = this.get("width"),
          sh = this.get("height"),
          sx = this.get("x"),
          sy = this.get("y") + sh/2;
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
    toggleDirection: function(dirIntent) {
      var cur = this.getStateInfo();
      this.set({state: cur.mov + "-" + dirIntent});
      return this;
    }
  });

  Backbone.Turtle = Backbone.Mushroom.extend({
    defaults: _.extend(_.deepClone(Backbone.Mushroom.prototype.defaults), {
      name: "turtle"
    }),
    animations: _.deepClone(Backbone.Mushroom.prototype.animations),
    isBlocking: function(sprite, position) {
      return true;
    },
    squish: function(sprite, position) {
      if (!sprite || sprite.get("name") != "mario") return;
      var cur = this.getStateInfo();

      if (this.wakeTimerId) {
        clearTimeout(this.wakeTimerId);
        this.wakeTimerId = null;
      }

      if (cur.mov != "squished") {
        this.set("state", "squished-" + cur.dir);
        this.wakeTimerId = setTimeout(this.wake.bind(this), 5000);
      }
      else
        this.hit.apply(this, arguments);
    },
    hit: function(sprite, position) {
      if (!sprite || sprite.get("name") != "mario") return;
      var cur = this.getStateInfo();
      if (cur.mov != "squished" && cur.mov != "wake") return;

      if (this.wakeTimerId) {
        clearTimeout(this.wakeTimerId);
        this.wakeTimerId = null;
      }

      if (position == "left")
        this.set("state", "slide-right");
      else
        this.set("state","slide-left");
    },
    wake: function() {
      var cur = this.getStateInfo();
      this.wakeTimerId = null;

      if (cur.mov == "squished") {
        this.set("state", "wake-" + cur.dir);
        this.wakeTimerId = setTimeout(this.wake.bind(this), 5000);
      } else if (cur.mov == "wake") {
        this.set("state", "walk-" + cur.dir);
      }
    }
  });
  animations = Backbone.Turtle.prototype.animations;
  animations["idle-left"].sequences = animations["idle-right"].sequences =
    animations["fall-left"].sequences = animations["fall-right"].sequences = [6];
  animations["walk-left"].sequences = animations["walk-right"].sequences = [6, 7];
  animations["squished-left"].sequences = animations["squished-right"].sequences = [10];
  _.extend(animations, {
    "wake-left": {
      sequences: [10, 11],
      velocity: 0,
      scaleX: 1,
      scaleY: 1,
      delay: sequenceDelay
    },
    "wake-right": {
      sequences: [10, 11],
      velocity: 0,
      scaleX: -1,
      scaleY: 1,
      delay: sequenceDelay
    },
    "slide-left": {
      sequences: [10],
      velocity: -300,
      scaleX: 1,
      scaleY: 1
    },
    "slide-right": {
      sequences: [10],
      velocity: 300,
      scaleX: -1,
      scaleY: 1
    }
  });

  Backbone.FlyingTurtle = Backbone.Turtle.extend({
    defaults: _.extend(_.deepClone(Backbone.Turtle.prototype.defaults), {
      name: "flying-turtle"
    }),
    animations: _.deepClone(Backbone.Turtle.prototype.animations)
  });
  animations = Backbone.FlyingTurtle.prototype.animations;
  animations["idle-left"].sequences = animations["idle-right"].sequences =
    animations["fall-left"].sequences = animations["fall-right"].sequences = [8];
  animations["walk-left"].sequences = animations["walk-right"].sequences = [8, 9];

  Backbone.RedTurtle = Backbone.Turtle.extend({
    defaults: _.extend(_.deepClone(Backbone.Turtle.prototype.defaults), {
      name: "red-turtle"
    }),
    animations: _.deepClone(Backbone.Turtle.prototype.animations)
  });
  animations = Backbone.RedTurtle.prototype.animations;
  animations["idle-left"].sequences = animations["idle-right"].sequences =
    animations["fall-left"].sequences = animations["fall-right"].sequences = [108];
  animations["walk-left"].sequences = animations["walk-right"].sequences = [108, 109];
  animations["squished-left"].sequences = animations["squished-right"].sequences =
  animations["slide-left"].sequences = animations["slide-right"].sequences = [112];
  animations["wake-left"].sequences = animations["wake-right"].sequences = [112, 113];

  Backbone.RedFlyingTurtle = Backbone.Turtle.extend({
    defaults: _.extend(_.deepClone(Backbone.Turtle.prototype.defaults), {
      name: "red-flying-turtle"
    }),
    animations: _.deepClone(Backbone.Turtle.prototype.animations)
  });
  animations = Backbone.RedFlyingTurtle.prototype.animations;
  animations["idle-left"].sequences = animations["idle-right"].sequences =
    animations["fall-left"].sequences = animations["fall-right"].sequences = [110];
  animations["walk-left"].sequences = animations["walk-right"].sequences = [110, 111];
  animations["squished-left"].sequences = animations["squished-right"].sequences =
  animations["slide-left"].sequences = animations["slide-right"].sequences = [112];
  animations["wake-left"].sequences = animations["wake-right"].sequences = [112, 113];

  Backbone.Beetle = Backbone.Turtle.extend({
    defaults: _.extend(_.deepClone(Backbone.Turtle.prototype.defaults), {
      name: "beetle"
    }),
    animations: _.deepClone(Backbone.Turtle.prototype.animations)
  });
  animations = Backbone.Beetle.prototype.animations;
  animations["idle-left"].sequences = animations["idle-right"].sequences =
    animations["fall-left"].sequences = animations["fall-right"].sequences = [33];
  animations["walk-left"].sequences = animations["walk-right"].sequences = [33, 32];
  animations["squished-left"].sequences = animations["squished-right"].sequences =
  animations["slide-left"].sequences = animations["slide-right"].sequences = 
  animations["wake-left"].sequences = animations["wake-right"].sequences =[34];

  Backbone.Spike = Backbone.Mushroom.extend({
    defaults: _.extend(_.deepClone(Backbone.Mushroom.prototype.defaults), {
      name: "spike"
    }),
    animations: _.deepClone(Backbone.Mushroom.prototype.animations),
    squish: function() {}
  });
  animations = Backbone.Spike.prototype.animations;
  animations["idle-left"].sequences = animations["idle-right"].sequences =
    animations["fall-left"].sequences = animations["fall-right"].sequences = [133];
  animations["walk-left"].sequences = animations["walk-right"].sequences = [133, 132];

}).call(this);