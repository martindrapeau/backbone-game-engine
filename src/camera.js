(function() {

  // Camera class
  // Ensures the hero is always in the viewport.
  // Properly pans the world. For now, only horizontally.
  Backbone.Camera = Backbone.Model.extend({
    defaults: {
      left: 200,
      right: 400,
      top: null,
      bottom: null
    },
    initialize: function(attributes, options) {
      this.setOptions(options || {});
    },
    setOptions: function(options) {
      options || (options = {});
      _.extend(this, options || {});

      this.stopListening();
      if (this.subject && this.world) {
        this.listenTo(this.subject, "change:x", this.maybePanX);
        this.maybePanX();
      }
    },
    maybePanX: function() {
      var w = this.world.toShallowJSON(),
          worldWidth = w.width * w.tileWidth,
          subjectX = this.subject.get("x") + w.x,
          subjectWidth = this.subject.get("tileWidth"),
          canvas = this.world.backgroundCanvas,
          leftX = this.get("left"),
          rightX = canvas.width - this.get("right");

      if (subjectX < leftX && w.x < 0) {
        // Pan right (to see more left)
        var worldX = w.x + (leftX - subjectX);
        if  (worldX > 0) worldX = 0;
        this.world.set({x: worldX});
      } else if (subjectX > rightX && w.x + worldWidth > canvas.width) {
        // Pan left (to see more right)
        var worldX = w.x - (subjectX - rightX);
        if (worldX + worldWidth < canvas.width)
            worldX = -worldWidth + canvas.width;
        this.world.set({x: worldX});
      }
    },
    update: function(dt) {
      return false;
    },
    draw: function(context) {
      return this;
    }
  });

}).call(this);