(function() {

  /**
   *
   * Backbone Game Engine - An elementary HTML5 canvas game engine using Backbone.
   *
   * Copyright (c) 2014 Martin Drapeau
   * https://github.com/martindrapeau/backbone-game-engine
   *
   */

  // Camera class
  // Ensures the hero is always in the viewport.
  // Properly pans the world.
  Backbone.Camera = Backbone.Model.extend({
    defaults: {
      left: 200,
      right: 400,
      top: 100,
      bottom: 100
    },
    initialize: function(attributes, options) {
      this.setOptions(options || {});
    },
    setOptions: function(options) {
      options || (options = {});
      _.extend(this, options || {});

      this.stopListening();
      if (this.subject && this.world) {
        this.listenTo(this.subject, "change:x change:y", this.maybePan);
        this.maybePan();
      }
    },
    maybePan: function() {
      var w = this.world.toShallowJSON(),
          worldX = w.x,
          worldY = w.y,
          worldWidth = w.width * w.tileWidth,
          worldHeight = w.height * w.tileHeight,
          subjectX = this.subject.get("x") + w.x,
          subjectY = this.subject.get("y") + w.y,
          subjectWidth = this.subject.get("tileWidth"),
          subjectHeight = this.subject.get("tileHeight"),
          canvas = this.world.backgroundCanvas,
          left = this.get("left"),
          right = canvas.width - this.get("right"),
          top = this.get("top"),
          bottom = canvas.height - this.get("bottom");

      if (subjectX < left && w.x < 0) {
        // Pan right (to see more left)
        worldX = w.x + (left - subjectX);
        if  (worldX > 0) worldX = 0;
      } else if (subjectX > right && w.x + worldWidth > canvas.width) {
        // Pan left (to see more right)
        worldX = w.x - (subjectX - right);
        if (worldX + worldWidth < canvas.width)
            worldX = -worldWidth + canvas.width;
      }

      if (subjectY < top && w.y < 0) {
        // Pan down (to see more up)
        worldY = w.y + (top - subjectY);
        if  (worldY > 0) worldY = 0;
      } else if (subjectY > bottom && w.y + worldHeight > canvas.height) {
        // Pan up (to see more down)
        worldY = w.y - (subjectY - bottom);
        if (worldY + worldHeight < canvas.height)
            worldY = -worldHeight + canvas.height;
      }

      if (worldX != w.x ||  worldY != w.y)
        this.world.set({x: worldX, y: worldY});
    },
    update: function(dt) {
      return false;
    },
    draw: function(context) {
      return this;
    }
  });

}).call(this);