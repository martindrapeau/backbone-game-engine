$(window).on("load", function() {

  /**
   *
   * Backbone Game Engine - An elementary HTML5 canvas game engine using Backbone.
   *
   * Copyright (c) 2014 Martin Drapeau
   * https://github.com/martindrapeau/backbone-game-engine
   *
   */
  
  // Bouncing ball.

  Backbone.Ball = Backbone.Sprite.extend({
    defaults: _.extend(Backbone.Sprite.prototype.defaults, {
      x: 400,
      y: 400,
      radius: 20,
      color: "red",
      velocity: 400,
      yVelocity: 400
    }),
    update: function(dt) {
      if (!this.engine) return false;

      var x = this.get("x"),
          y = this.get("y"),
          radius = this.get("radius"),
          velocity = this.get("velocity") - radius,
          yVelocity = this.get("yVelocity") - radius,
          maxX = this.engine.canvas.width - radius,
          maxY = this.engine.canvas.height - radius,
          attrs = {oldX: x, oldY: y};

      x += velocity * (dt/1000);
      y += yVelocity * (dt/1000);

      if (x <= 0) {
        x = 0;
        attrs.velocity = velocity * -1;
      }
      if (x >= maxX) {
        x = maxX;
        attrs.velocity = velocity * -1;
      }

      if (y <= 0) {
        y = 0;
        attrs.yVelocity = yVelocity * -1;
      }
      if (y >= maxY) {
        y = maxY;
        attrs.yVelocity = yVelocity * -1;
      }
      attrs.x = x;
      attrs.y = y;

      this.set(attrs);
      return true;
    },
    draw: function(context) {
      var x = this.get("x"),
          y = this.get("y"),
          oldX = this.get("oldX"),
          oldY = this.get("oldY"),
          radius = this.get("radius"),
          color = this.get("color");

      if (oldX || oldY)
        context.clearRect(oldX, oldY, radius, radius);

      drawCircle(context, x+radius/2, y+radius/2, radius, color);

      return this;
    }
  });

  var canvas = document.getElementById("foreground");

  var debugPanel = new Backbone.DebugPanel();

  var ball = new Backbone.Ball({
    x: 100,
    y: 100,
    color: "blue"
  });

  var engine = new Backbone.Engine({
    clearOnDraw: true
  }, {
    canvas: canvas,
    debugPanel: debugPanel
  });
  engine.add([
    ball,
    debugPanel
  ]);

  // Expose things as globals - easier to debug
  _.extend(window, {
    canvas: canvas,
    engine: engine
  });

  adjustViewport(canvas);

});