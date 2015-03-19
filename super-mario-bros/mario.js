(function() {

  /**
   *
   * Backbone Game Engine - An elementary HTML5 canvas game engine using Backbone.
   *
   * Copyright (c) 2014 Martin Drapeau
   * https://github.com/martindrapeau/backbone-game-engine
   *
   */
  
  Backbone.Mario = Backbone.Hero.extend({
    defaults: _.extend({}, Backbone.Hero.prototype.defaults, {
      name: "mario",
      spriteSheet: "mario"
    }),
    bounce: function(sprite, dir, dir2) {
      var cur = this.getStateInfo(),
          state = this.buildState("jump", cur.dir);
      this.set({
        state: state,
        velocity: 0,
        yVelocity: this.animations[state].yStartVelocity*0.5,
        nextState: this.buildState("idle", cur.dir)
      });
      this.cancelUpdate = true;
      return this;
    },
    hit: function(sprite, dir, dir2) {
      if (sprite.get("type") == "character") {
        var name = sprite.get("name"),
            cur = this.getStateInfo();

        if (dir == "bottom" && name != "spike") return this.bounce.apply(this, arguments);

        if (!sprite.isAttacking()) return this;

        return this.knockout(sprite, "left");
      }
      return this;
    }
  });
  
  Backbone.Luigi = Backbone.Mario.extend({
    defaults: _.extend({}, Backbone.Hero.prototype.defaults, {
      name: "luigi",
      spriteSheet: "mario"
    }),
    animations: _.reduce(Backbone.Hero.prototype.animations, function(animations, anim, name) {
      var clone = _.clone(anim);
      clone.sequences = _.map(anim.sequences, function(index) {
        return index + 42;
      });
      animations[name] = clone;
      return animations;
    }, {})
  });


}).call(this);