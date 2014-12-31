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
    })
  });
  
  Backbone.Luigi = Backbone.Hero.extend({
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