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
    getHitReaction: function(character, dir, dir2) {
      if (!character.isBlocking(this)) return null;
      var name = character.get("name");
      if ((dir == "left" || dir == "right") && character.get("state").indexOf("squished") == -1) return "ko";
      if (dir == "bottom" && name == "spike") return "ko";
      if (dir == "bottom") return "bounce";
      return "block";
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