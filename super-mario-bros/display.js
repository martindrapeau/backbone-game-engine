(function() {

  Backbone.Display = Backbone.Model.extend({
    defaults: {
      pennies: 0
    },
    initialize: function(attributes, options) {
      options || (options = {});
      this.world = options.world;

      this.pennieSprite = new Backbone.AnimatedTile({
        name: "pennie",
        type: "character",
        x: 300,
        y: 4,
        width: 32,
        height: 32,
        spriteSheet: "tiles",
        state: "idle"
      });
      this.pennieSprite.animations = {
        idle: {
          sequences: [52, 52, 53, 54, 53, 52],
          delay: 50,
          scaleX: 0.75,
          scaleY: 0.75
        }
      };
        
      this.on("attach", this.onAttach, this);
      this.on("detach", this.onDetach, this);
    },
    onAttach: function() {
      this.pennieSprite.engine = this.engine;
      this.pennieSprite.trigger("attach");
      this.listenTo(this.world.dynamicSprites, "remove", this.onPennieRemoved);
    },
    onDetach: function() {
      this.pennieSprite.trigger("detach");
      this.pennieSprite.engine = undefined;
      this.stopListening();
    },
    update: function(dt) {
      return true;
    },
    draw: function(context) {

      var pennies = this.get("pennies"),
          text = " × " + (pennies < 10 ? "0" : "") + pennies;
      context.fillStyle = "#fff";
      context.font = "24px courier-new bold";
      context.textAlign = "left";
      context.textBaseline = "top";
      context.fillText(text, 324, 4);

      this.pennieSprite.draw.call(this.pennieSprite, context);

      return this;
    },
    onPennieRemoved: function(sprite) {
      if (this.world.get("state") != "play") return;

      var name = sprite.get("name"),
          pennies = this.get("pennies");

      if (name.indexOf("pennie") != -1) {
        pennies += 1;
        if (pennies > 99) pennies = 0;
        this.set("pennies", pennies);
      }
    }
  });

}).call(this);