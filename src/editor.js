(function() {

  /**
   *
   * Backbone Game Engine - An elementary HTML5 canvas game engine using Backbone.
   *
   * Copyright (c) 2014 Martin Drapeau
   * https://github.com/martindrapeau/backbone-game-engine
   *
   */

  // World Editor
  // Allows the user to place tiles and characters in the World.
  Backbone.WorldEditor = Backbone.Model.extend({
    defaults: {
      x: 136,
      y: 690-(34*4+4),
      width: 34*24+4,
      height: 34*4+4,
      tileWidth: 32,
      tileHeight: 32,
      padding: 1,
      backgroundColor: "#333",
      selectColor: "#f00",
      selected: undefined,
      spriteNames: []
    },
    initialize: function(attributes, options) {
      options || (options = {});

      if (!attributes || !attributes.spriteNames) throw "Missing attribute spriteNames";
      this.sprites = new Backbone.SpriteCollection(_.map(attributes.spriteNames, function(name) {
        return {name: name};
      }));

      this.world = options.world;
      if (!this.world && !_.isFunction(this.world.add))
        throw "Missing or invalid world option.";

      this.debugPanel = options.debugPanel;

      _.bindAll(this,
        "onTap", "onDragStart", "onDrag", "onDragEnd",
        "getSelectedSprite", "onMouseMove"
      );

      this.on("attach", this.onAttach);
      this.on("detach", this.onDetach);
    },
    onAttach: function() {
      var world = this.world,
          engine = this.engine;
      if (!this.hammertime) this.hammertime = Hammer(document);
      this.onDetach();

      this.set({
        width: engine.canvas.width - 140,
        y: engine.canvas.height - 10 - (34*4+4)
      });

      // Handle tap on touch device, or click with mouse
      this.hammertime.on("tap", this.onTap);

      // Allow panning of the world
      this.hammertime
        .on("dragstart", this.onDragStart)
        .on("drag", this.onDrag)
        .on("dragend", this.onDragEnd);

      $(document).on("mousemove.Edit", this.onMouseMove);

      this.sprites.each(function(sprite) {
        if (sprite.attributes.type == "tile" || sprite.attributes.type == "character") {
          sprite.engine = engine;
          sprite.trigger("attach", engine);
        }
      });
    },
    onDetach: function() {
      this.hammertime
        .off("tap", this.onTap)
        .off("dragstart", this.onDragStart)
        .off("drag", this.onDrag)
        .off("dragend", this.onDragEnd);

      $(document).off(".Edit");

      this.sprites.each(function(sprite) {
        if (sprite.attributes.type == "tile" || sprite.attributes.type == "character") {
          sprite.engine = undefined;
          sprite.trigger("detach");
        }
      });
    },

    update: function(dt) {
      var sp = this.toJSON();
          x = sp.x + sp.tileWidth + 4*sp.padding;
          y = sp.y + 2*sp.padding;

      this.sprites.each(function(sprite) {
        if (sprite.attributes.type == "tile" || sprite.attributes.type == "character") {
          sprite.set({x: x, y: y});
          sprite.update(dt);
          x += sprite.attributes.width + 2*sp.padding;
          if (x >= sp.x + sp.width - 2) {
            y += sp.tileHeight + 2*sp.padding;
            x = sp.x + 2*sp.padding;
          }
        }
      });
      return true;
    },
    draw: function(context) {
      var sp = this.toJSON();

      // Fill background
      drawRect(context, sp.x, sp.y, sp.width, sp.height, sp.backgroundColor);

      // Draw selected sprite
      var st = this.sprites.findWhere({name: sp.selected}),
          sx = st ? st.get("x") - 2 : sp.x,
          sy = st ? st.get("y") - 2 : sp.y,
          sw = st ? st.get("width") + 4 : sp.tileWidth + 4,
          sh = st ? st.get("height") + 4 : sp.tileHeight + 4;
      drawRect(context, sx, sy, sw, sh, sp.selectColor);

      // Draw sprites
      this.sprites.each(function(sprite) {
        if (sprite.attributes.type == "tile" || sprite.attributes.type == "character")
          sprite.draw(context);
      });

    },

    getSelectedSprite: function() {
      var selected = this.get("selected");
      if (!selected) return null
      return this.sprites.findWhere({name: selected});
    },
    onTap: function(e) {
      if (e.target != this.engine.canvas) return;

      var editor = this,
          sp = this.toJSON(),
          x = e.gesture.center.clientX - this.engine.canvas.offsetLeft + this.engine.canvas.scrollLeft,
          y = e.gesture.center.clientY - this.engine.canvas.offsetTop + this.engine.canvas.scrollTop;

      // Sprite selection?
      if (x >= sp.x && y >= sp.y && x <= sp.x + sp.width && y <= sp.y + sp.height) {
        editor.set({selected: null});
        this.sprites.each(function(sprite) {
          var s = sprite.toJSON();
          if (x >= s.x && y >= s.y && x <= s.x + s.width && y <= s.y + s.height) {
            editor.set({selected: s.name});
            return false;
          }
        });
        return;
      }

      // Sprite placement
      if (y < sp.y) {
        var sprite = this.getSelectedSprite();
        x -= this.world.get("x");
        y -= this.world.get("y");
        this.world.cloneAtPosition(sprite, x, y);
      }
    },

    // Pan the world
    onDragStart: function(e) {
      var world = this.world;
      if (e.target != world.engine.canvas) {
        e.stopPropagation();
        return false;
      }
      world.startDragWorldX = world.get("x");
      world.startDragWorldY = world.get("y");
    },
    onDrag: function (e) {
      var world = this.world;
      if (!_.isNumber(world.startDragWorldX) || !_.isNumber(world.startDragWorldX) ||
          !e.gesture || !_.isNumber(e.gesture.deltaX) || !_.isNumber(e.gesture.deltaY)) return false;
      var x = world.startDragWorldX + e.gesture.deltaX,
          y = world.startDragWorldY + e.gesture.deltaY;
      if (x > 0) {
        x = 0;
      } else {
        var min = -(world.get("width") * world.get("tileWidth") - world.engine.canvas.width);
        if (x < min) x = min;
      }
      if (y > 0) {
        y = 0;
      } else {
        var min = -(world.get("height") * world.get("tileHeight") - world.engine.canvas.height + this.get("height"));
        if (min > 0) min = 0;
        if (y < min) y = min;
      }
      world.set({x: x, y: y});
    },
    onDragEnd: function(e) {
      var world = this.world;
      world.startDragWorldX = undefined;
      world.startDragWorldY = undefined;
    },

    onMouseMove: function(e) {
      var mx = e.pageX,
          my = e.pageY,
          id = this.world.getWorldIndex({x: mx, y: my});

      if (this.debugPanel)
        this.debugPanel.set({mouseX: mx - this.world.get("x"), mouseY: my - this.world.get("y"), id: id});
    }

  });

}).call(this);