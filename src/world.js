(function() {

  /**
   *
   * Backbone Game Engine - An elementary HTML5 canvas game engine using Backbone.
   *
   * Copyright (c) 2014 Martin Drapeau
   * https://github.com/martindrapeau/backbone-game-engine
   *
   */

  Backbone.IndexedCollection = Backbone.Collection.extend({comparator: "id"});

  // Backbone.World is Backbone model which contains a collection of sprites.
  Backbone.World = Backbone.Model.extend({
    defaults: {
      x: 0,
      y: 0,
      tileWidth: 32,
      tileHeight: 32,
      width: 100,
      height: 19,
      backgroundColor: "rgba(66, 66, 255, 1)",
      sprites: [], // Copy for persistence only. Use the direct member sprites which is a collection.
      state: "play", // edit or play
      hero: null
    },
    shallowAttributes: ["x", "y", "width", "height", "tileWidth", "tileHeight", "backgroundColor", "hero"],
    urlRoot: "/ludo/world",
    viewport: {x:0, y:0, width:0, height: 0},
    spriteOptions: {offsetX:0, offsetY:0},
    initialize: function(attributes, options) {
      options || (options = {});
      this.backgroundImage = options.backgroundImage;
      this.input = options.input;
      this.camera = options.camera;
      this.debugPanel = options.debugPanel;
      
      _.bindAll(this,
        "save", "getWorldIndex", "getWorldCol", "getWorldRow", "cloneAtPosition",
        "findAt", "filterAt", "reset", "height", "width", "add", "remove"
      );

      this.sprites = new Backbone.Collection();
      this.setupBackground();
      this.reset();

      this.on("attach", this.onAttach, this);
      this.on("detach", this.onDetach, this);
    },
    height: function() {
      return this.get("height") * this.get("tileHeight");
    },
    width: function() {
      return this.get("width") * this.get("tileWidth");
    },
    toShallowJSON: function() {
      return _.pick(this.attributes, this.shallowAttributes);
    },
    onAttach: function() {
      var engine = this.engine;
      this.sprites.each(function(sprite) {
        sprite.engine = engine;
        sprite.trigger("attach", engine);
      });
    },
    onDetach: function() {
      this.sprites.each(function(sprite) {
        sprite.engine = undefined;
        sprite.trigger("detach");
      });
    },

    // Split static sprites (background tiles) from dynamic ones (animated or moving).
    // Draw static on a background and seldomly redraw.
    // Dynamic ones are redrawn every animation frame.
    // Maintain shadow collections to quickly access the two types.
    setupBackground: function() {
      var world = this,
          staticSprites = this.staticSprites = new Backbone.IndexedCollection(),
          dynamicSprites = this.dynamicSprites = new Backbone.Collection();
      staticSprites.lookup = {};

      this.listenTo(this.sprites, "add", function(sprite) {
        if (sprite.get("static")) {
          staticSprites.add(sprite);
          world.updateStaticColumLookup();
        } else {
          dynamicSprites.add(sprite);
        }
      });

      this.listenTo(this.sprites, "reset", function(sprites) {
        staticSprites.reset();
        dynamicSprites.reset();
        sprites.each(function(sprite) {
          if (sprite.get("static"))
            staticSprites.add(sprite);
          else
            dynamicSprites.add(sprite);
        });
        world.updateStaticColumLookup();
      });

      this.listenTo(this.sprites, "remove", function(sprite) {
        if (sprite.get("static")) {
          staticSprites.remove(sprite);
          world.updateStaticColumLookup();
        } else {
          dynamicSprites.remove(sprite);
        }
      });

      this.backgroundCanvas = document.getElementById("background");
      this.backgroundContext = this.backgroundCanvas.getContext("2d");
      drawRect(this.backgroundContext, 0, 0, this.backgroundCanvas.width, this.backgroundCanvas.height, "#000");

      this.on("change", function() {
        this.requestBackgroundRedraw = true;
      });
      return this;
    },

    updateStaticColumLookup: function() {
      var lookup = this.staticSprites.lookup = {};

      // Map each column with the first top-most tile
      this.staticSprites.each(function(sprite, index) {
        var id = sprite.id,
            col = sprite.get("col"),
            row = sprite.get("row");
        if (!lookup[col] || row < lookup[col].row)
          lookup[col] = {
            id: id,
            row: row,
            index: index
          }
      });

      // Ensure each column that has no tiles, points to
      // the next tile in the chain
      var maxCol = this.get("width"),
          tile = null;
      for (var col = maxCol; col >= 0; col--)
        if (lookup[col]) {
          tile = lookup[col];
        } else {
          lookup[col] = tile;
        }

      this.requestBackgroundRedraw = true;

      return this;
    },

    reset: function(attributes) {
      if (attributes) this.set(attributes);

      var world = this,
          w = this.toShallowJSON(),
          _sprites = this.get("sprites");

      this.sprites.reset();

      var names = [];
      function buildId(name) {
        var count = 0;
        for (var i=0; i<names.length; i++)
          if (names[i].indexOf(name) == 0) count += 1;
        name += "." + (count + 1);
        names.push(name);
        return name;
      }

      var sprites = _.reduce(_sprites, function(sprites, sprite) {
        var s = sprite.attributes ? sprite.attributes : sprite,
            cls = _.classify(s.name),
            col = world.getWorldCol(s.x),
            row = world.getWorldRow(s.y),
            options = {world: world};

        if (s.name == w.hero) options.input = world.input;

        var id = Backbone[cls].prototype.defaults.type == "character" ? buildId(s.name) : col * w.height + row;
        var newSprite = new Backbone[cls](_.extend(s,
          {
            id: id,
            col: col,
            row: row
          }
        ), options);
        sprites.push(newSprite);
        
        if (s.name == w.hero)
          world.camera.setOptions({world: world, subject: newSprite});

        return sprites;
      }, []);

      this.requestBackgroundRedraw = true;
      this.sprites.reset(sprites);

      return this;
    },

    // When saving, persist the sprite collection in the model attribute sprites.
    save: function() {
      var sprites = this.sprites.map(function(sprite) {
        return sprite.toSave.apply(sprite);
      });

      this.set({
        sprites: sprites,
        savedOn: new Date().toJSON()
      }, {silent: true});

      return Backbone.Model.prototype.save.apply(this, arguments);
    },

    update: function(dt) {
      if (!this.engine) return false;

      var start =_.now(),
          x = this.get("x"),
          y = this.get("y"),
          hero = this.get("hero"),
          tileWidth = this.get("tileWidth"),
          worldWidth = this.get("width") * tileWidth,
          minX = -Math.floor(x) - tileWidth*3,
          maxX = minX + this.engine.canvas.width + tileWidth*6;
      if (minX < 0) minX = 0;
      if (maxX > worldWidth) maxX = worldWidth;
      this.viewport.x = minX;
      this.viewport.y = 0;
      this.viewport.width = maxX - minX;
      this.viewport.height= this.engine.canvas.height;

      // Background
      var minCol = this.getWorldCol(minX),
          maxCol = this.getWorldCol(maxX),
          first = this.staticSprites.lookup[minCol],
          last = this.staticSprites.lookup[maxCol];
      this.staticSprites._drawFrom = first ? first.index : 0;
      this.staticSprites._drawTo = last ? last.index : this.staticSprites.size() - 1;

      if (this.requestBackgroundRedraw) {
        this.requestBackgroundRedraw = false;
        this.drawBackground = true;
      }

      // Foreground
      var sprite;
      for (var i = 0; i < this.dynamicSprites.models.length; i++) {
        sprite = this.dynamicSprites.models[i];
        if (sprite.attributes.name == hero || sprite.overlaps.call(sprite, this.viewport))
          sprite._draw = sprite.update(dt);
      }

      if (this.debugPanel)
        this.debugPanel.set({
          updateTime: _.now()-start,
          ui: {minX:minX, maxX:maxX, from:from, to:to, first:first, last:last}
        });

      this.drawBackground = this.drawBackground || this.lastX != x || this.lastY || y;
      this.lastX = x; this.lastY = y;
      return true;
    },
    draw: function(context) {
      if (this.drawBackground) {
        this.drawStaticSprites(this.backgroundContext);
        this.drawBackground = false;
      }
      this.drawDynamicSprites(context);
      return this;
    },
    drawStaticSprites: function(context) {
      var start =_.now(),
          w = this.toShallowJSON(),
          worldWidth = w.width * w.tileWidth,
          worldHeight = w.height * w.tileHeight;
      this.viewport.x = Math.floor(-w.x);
      this.viewport.y = Math.floor(-w.y);
      this.viewport.width = context.canvas.width;
      this.viewport.height= context.canvas.height;
      this.spriteOptions.offsetX = w.x;
      this.spriteOptions.offsetY = w.y;

      drawRect(
        context,
        Math.floor(w.x > 0 ? w.x : 0),
        Math.floor(w.y > 0 ? w.y : 0),
        worldWidth < this.viewport.width ? worldWidth : this.viewport.width,
        worldHeight < this.viewport.height ? worldHeight : this.viewport.height,
        w.backgroundColor
      );

      if (this.backgroundImage) {
        var img = this.backgroundImage,
            ix = -w.x/2,
            iy = -w.y/2,
            width = this.viewport.width < img.width ? this.viewport.width : img.width,
            height = this.viewport.height < img.height ? this.viewport.height : img.height,
            flipAxis = 0;
        context.save();
        context.translate(flipAxis, 0);
        context.scale(2, 2);
        context.translate(-flipAxis, 0);
        context.drawImage(
          img,
          ix, iy, width, height,
          0, 40, width, height
        );
        context.restore();
      }

      var sprite,
          to = this.staticSprites._drawTo;
      if (to >= this.staticSprites.length) to = this.staticSprites.length-1;
      for (var i = this.staticSprites._drawFrom; i <= to; i++) {
        sprite = this.staticSprites.models[i];
        sprite.draw.call(sprite, context, this.spriteOptions);
      }

      if (this.debugPanel) this.debugPanel.set({
        tilesDrawn: this.staticSprites.toDraw.length,
        staticDrawTime: _.now()-start
      });

      return this;
    },
    drawDynamicSprites: function(context) {
      var start =_.now(),
          w = this.toShallowJSON(),
          worldWidth = w.width * w.tileWidth,
          worldHeight = w.height * w.tileHeight;
      this.spriteOptions.offsetX = w.x;
      this.spriteOptions.offsetY = w.y;

      context.drawImage(this.backgroundCanvas, 0, 0);

      var spritesDrawn = 0,
          sprite;
      for (var i = 0; i < this.dynamicSprites.models.length; i++) {
        sprite = this.dynamicSprites.models[i];
        if (sprite._draw) {
          sprite.draw.call(sprite, context, this.spriteOptions);
          spritesDrawn += 1;
        }
      }

      if (this.debugPanel) this.debugPanel.set({
        spritesDrawn: spritesDrawn,
        dynamicDrawTime: _.now()-start
      });

      return this;
    },

    // Sprites are ided (and ordered) by columns. This allows for
    // fast column drawing without lookup.
    getWorldIndex: function(object) {
      if (!_.isObject(object)) return null;
      var x = object.attributes ? object.get("x") : object.x || 0,
          y = object.attributes ? object.get("y") : object.y || 0,
          col = Math.floor(x / this.get("tileWidth")),
          row = Math.floor(y / this.get("tileHeight"));
      return col * this.get("height") + row;
    },
    getWorldCol: function(x) {
      return Math.floor(x / this.get("tileWidth"));
    },
    getWorldRow: function(y) {
      return Math.floor(y / this.get("tileHeight"));
    },
    findAt: function(x, y, type, exclude, collision) {
      return this._findOrFilter("find", x, y, type, exclude, collision);
    },
    filterAt: function(x, y, type, exclude, collision) {
      return this._findOrFilter("filter", x, y, type, exclude, collision);
    },
    _findOrFilter: function(fn, x, y, type, exclude, collision) {
      var collection = this.sprites,
          id = exclude && exclude.id ? exclude.id : null,
          result;

      function doIt(sprite) {
        return (sprite.id && sprite.id != id) &&
          (!type || sprite.get("type") == type) &&
          (!collision || sprite.get("collision")) &&
          sprite.overlaps.call(sprite, x, y);
      }

      // Look in dynamic sprites first
      result = this.dynamicSprites[fn](doIt);
      if ((fn == "find" && !_.isEmpty(result)) || type == "character") return result;

      // Finally in static ones
      return fn == "find" ? this.staticSprites[fn](doIt) : _.union(result, this.staticSprites[fn](doIt));
    },
    findCollidingAt:function(x, y) {
      var id = this.getWorldIndex({x: x, y: y}),
          sprite = id ? this.sprites.get(id) : null;
      return sprite && sprite.get("collision") ? sprite : null;
    },
    add: function(models, options) {
      options || (options = {});
      options.world = this;
      models = this.sprites.add.call(this.sprites, models, options);
      if (_.isArray(models))
        for (var i = 0; i < models.length; i++)
          models[i].world = this;
      else
        models.world = this;
      return models;
    },
    remove: function(models, options) {
      models = this.sprites.remove.apply(this.sprites, arguments);
      if (_.isArray(models))
        for (var i = 0; i < models.length; i++)
          if (models[i].world === this) delete models[i].world;
      else
        if (models.world === this) delete models.world;
      return models;
    },
    cloneAtPosition: function(sprite, x, y, options) {
      options || (options = {});
      options.world = this;

      var w = this.toShallowJSON(),
          existing = this.findAt(x, y),
          existingName = existing ? existing.get("name") : null,
          spriteName = sprite ? sprite.get("name") : "";
      if (!sprite && !existing) return null;

      if (!sprite && existing) {
        this.sprites.remove(existing);
        return null;
      }
      
      if (existing) {
        if (spriteName == existingName) {
          // Toggle if same sprite - either turn around or remove
          var cur = existing.getStateInfo(),
              removeOnDir = existingName == w.hero ? "left" : "right";
          if (!cur.dir || cur.dir == removeOnDir) {
            this.remove(existing);
            return null;
          }
          existing.toggleDirection(cur.opo);
          return existing;
        } else {
          // Replace existing
          this.remove(existing);
        }
      }

      // Mario is a singleton - remove if anywhere else
      if (spriteName == w.hero) {
        var hero = this.sprites.findWhere({name: w.hero});
        if (hero) this.remove(hero);
        options.input = this.input;
      }

      var spriteHeight = sprite.get("height"),
          col = this.getWorldCol(x),
          row = this.getWorldRow(y - spriteHeight + w.tileHeight),
          id = sprite.get("type") == "character" ? this.buildId(sprite) : col * w.height + row,
          cls = _.classify(spriteName);
      var newSprite = new Backbone[cls](_.extend({}, sprite.toJSON(), {
        id: id,
        x: col * w.tileWidth,
        y: row * w.tileHeight,
        col: col,
        row: row
      }), options);
      this.add(newSprite, options);

      if (spriteName == w.hero && this.camera)
        this.camera.setOptions({world: this, subject: newSprite});

      newSprite.engine = this.engine;
      newSprite.trigger("attach", this.engine);

      return newSprite;
    },
    buildId: function(sprite) {
      var name = sprite.get("name");
          re = new RegExp("^" + name + "\\." + "\\d+$"),
          numbers = this.dynamicSprites.reduce(function(numbers, sprite) {
            if (sprite.id.length && sprite.id.match(re))
              numbers.push(parseInt(sprite.id.replace(name + ".", "")));
            return numbers;
          }, [0]);
      return name + "." + (_.max(numbers) + 1);
    }
  });

}).call(this);