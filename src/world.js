(function() {

  /**
   *
   * Backbone Game Engine - An elementary HTML5 canvas game engine using Backbone.
   *
   * Copyright (c) 2014 Martin Drapeau
   * https://github.com/martindrapeau/backbone-game-engine
   *
   */

  // Backbone.World is Backbone model which contains a collection of sprites.
  Backbone.World = Backbone.Model.extend({
    defaults: {
      x: 0,
      y: 0,
      tileWidth: 32,
      tileHeight: 32,
      width: 30,
      height: 17,
      viewportTop: 0, viewportRight: 0, viewportBottom: 0, viewportLeft: 0,
      backgroundColor: "rgba(66, 66, 255, 1)",
      sprites: [], // Copy for persistence only. Use the direct member sprites which is a collection.
      state: "play" // play or pause
    },
    shallowAttributes: [
      "x", "y", "width", "height", "tileWidth", "tileHeight", "backgroundColor",
      "viewportLeft", "viewportRight", "viewportTop", "viewportBottom"
    ],
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
        "findAt", "filterAt", "spawnSprites", "height", "width", "add", "remove",
        "setTimeout", "clearTimeout"
      );

      this.sprites = new Backbone.Collection();
      this.setupSpriteLayers();
      this.spawnSprites();

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
      this.on("change:viewportLeft change:viewportRight change:viewportTop change:viewportBottom", this.updateViewport);
      this.updateViewport();
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
      this.off("change:viewportLeft change:viewportRight change:viewportTop change:viewportBottom", this.updateViewport);
    },
    updateViewport: function() {
      this.viewport.width = this.engine.canvas.width - this.attributes.viewportLeft - this.attributes.viewportRight;
      this.viewport.height = this.engine.canvas.height - this.attributes.viewportTop - this.attributes.viewportBottom;
      this.spriteOptions.viewportLeft = this.attributes.viewportLeft;
      this.spriteOptions.viewportRight = this.attributes.viewportRight;
      this.spriteOptions.viewportTop = this.attributes.viewportTop;
      this.spriteOptions.viewportBottom = this.attributes.viewportBottom;
      this.backgroundCanvas.width = this.engine.canvas.width;
      this.backgroundCanvas.height = this.engine.canvas.height;
    },

    // Split static sprites (background tiles) from dynamic ones (animated or moving).
    // Draw static on a background and seldomly redraw.
    // Dynamic ones are redrawn every animation frame.
    // Maintain shadow collections to quickly access the two types.
    setupSpriteLayers: function() {
      var world = this,
          staticSprites = this.staticSprites = new Backbone.Collection(),
          dynamicSprites = this.dynamicSprites = new Backbone.Collection();
      staticSprites.lookup = {};
      dynamicSprites.lookup = {};

      function add(sprite, collection) {
        collection.add(sprite);
        index = world.getWorldIndex(sprite);
        collection.lookup[index] || (collection.lookup[index] = []);
        collection.lookup[index].push(sprite);
        sprite.set("lookupIndex", index);
      }

      function update(sprite, collection) {
        var oldIndex = sprite.attributes.lookupIndex,
            newIndex = world.getWorldIndex(sprite);
        if (oldIndex == newIndex) return;
        if (oldIndex !== undefined && collection.lookup[oldIndex]) {
          var pos = _.indexOf(collection.lookup[oldIndex], sprite);
          if (pos >= 0) collection.lookup[oldIndex].splice(pos, 1);
        }
        collection.lookup[newIndex] || (collection.lookup[newIndex] = []);
        collection.lookup[newIndex].push(sprite);
        sprite.set("lookupIndex", newIndex);
      }

      function remove(sprite, collection) {
        var oldIndex = sprite.attributes.lookupIndex;
        if (oldIndex !== undefined && collection.lookup[oldIndex]) {
          var pos = _.indexOf(collection.lookup[oldIndex], sprite);
          if (pos >= 0) collection.lookup[oldIndex].splice(pos, 1);
        }
        sprite.unset("lookupIndex");
        collection.remove(sprite);
      }

      this.listenTo(this.dynamicSprites, "change:x change:y", function(sprite) {
        update(sprite, dynamicSprites);
      });

      this.listenTo(this.sprites, "add", function(sprite) {
        if (sprite.get("static"))
          add(sprite, staticSprites);
        else
          add(sprite, dynamicSprites);
        world.requestBackgroundRedraw = true;
      });

      this.listenTo(this.sprites, "reset", function(sprites) {
        staticSprites.reset();
        dynamicSprites.reset();
        staticSprites.lookup = {};
        dynamicSprites.lookup = {};

        sprites.each(function(sprite) {
        if (sprite.get("static"))
          add(sprite, staticSprites);
        else
          add(sprite, dynamicSprites);
        });
        world.requestBackgroundRedraw = true;
      });

      this.listenTo(this.sprites, "remove", function(sprite) {
        if (sprite.get("static"))
          remove(sprite, staticSprites);
        else
          remove(sprite, dynamicSprites);
        world.requestBackgroundRedraw = true;
      });

      this.backgroundCanvas = document.createElement("canvas");
      this.backgroundCanvas.style.display = "none";
      document.body.appendChild(this.backgroundCanvas);
      this.backgroundContext = this.backgroundCanvas.getContext("2d");

      this.previewCanvas = document.createElement("canvas");
      this.previewCanvas.style.display = "none";
      this.previewCanvas.width = 300;
      this.previewCanvas.height = 180;
      document.body.appendChild(this.previewCanvas);
      this.previewContext = this.previewCanvas.getContext("2d");
      drawRect(this.previewContext,
        0, 0, this.previewCanvas.width, this.previewCanvas.height,
        this.attributes.backgroundColor
      );

      this.on("change", function() {
        this.requestBackgroundRedraw = true;
      });
      return this;
    },

    spawnSprites: function() {
      var world = this,
          w = this.toShallowJSON(),
          _sprites = this.get("sprites"),
          options = {
            world: this,
            input: this.input
          };

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
            row = world.getWorldRow(s.y);

        var id = Backbone[cls].prototype.defaults.type != "tile" ? buildId(s.name) : col * w.height + row;
        var newSprite = new Backbone[cls](_.extend(s,
          {
            id: id,
            col: col,
            row: row
          }
        ), options);
        sprites.push(newSprite);
        
        if (newSprite.get("hero"))
          world.camera.setOptions({world: world, subject: newSprite});

        return sprites;
      }, []);

      this.requestBackgroundRedraw = true;
      this.sprites.reset(sprites);
      if (this.engine) this.onAttach();

      return this;
    },

    // When saving, persist the sprite collection in the model attribute sprites.
    save: function() {
      var sprites = this.sprites.map(function(sprite) {
        return sprite.toSave.apply(sprite);
      });

      // Save a screenshot of 30x15 tiles, skipping the two top first rows
      if (this.engine && this.viewport && this.viewport.width) {
        var x = this.attributes.viewportLeft + this.attributes.tileWidth*2,
            y = this.attributes.viewportTop + this.attributes.tileHeight*2,
            width = this.viewport.width - this.attributes.tileWidth*5,
            height = this.viewport.height - this.attributes.tileHeight*2;

        this.previewContext.drawImage(
          this.engine.canvas,
          x, y, width, height,
          0, 0, this.previewCanvas.width, this.previewCanvas.height
        );

      }

      this.set({sprites: sprites, preview: this.previewCanvas.toDataURL()}, {silent: true});

      return Backbone.Model.prototype.save.apply(this, arguments);
    },

    // Resize the world
    resize: function(width, height) {
      var deltaY = (height - this.attributes.height) * this.attributes.tileHeight;

      if (deltaY == 0) {
        this.set({width: width});
        return;
      }

      // When resizing height, add/remove tiles above requiring translation.
      var sprites = this.sprites.map(function(sprite) {
        var s = sprite.toSave.apply(sprite);
        s.y += deltaY;
        return s;
      });

      this.set({
        y: this.attributes.y - deltaY,
        width: width,
        height: height,
        sprites: sprites
      }, {silent: true});

      this.spawnSprites();

      return this;
    },

    timeouts: {},
    setTimeout: function(callback, delay) {
      var timerId = _.uniqueId();
      this.timeouts[timerId] = {
        expires: Date.now() + delay,
        callback: callback
      };
      return timerId;
    },
    clearTimeout: function(timerId) {
      if (this.timeouts[timerId] != undefined)
        delete this.timeouts[timerId];
    },
    handleTimeouts: function() {
      var now = Date.now(),
          timerIds = _.keys(this.timeouts),
          timerId, timeout;
      for (var i=0; i<timerIds.length; i++) {
        timerId = timerIds[i];
        timeout = this.timeouts[timerId];
        if (now > timeout.expires) {
          timeout.callback();
          delete this.timeouts[timerId];
        }
      }
    },

    update: function(dt) {
      if (!this.engine) return false;

      var start =_.now(),
          sprite, count = 0,
          minX = -this.attributes.x + this.attributes.viewportLeft - this.attributes.tileWidth*3,
          maxX = -this.attributes.x + this.engine.canvas.width - this.attributes.viewportRight + this.attributes.tileWidth*3,
          minY = -this.attributes.y + this.attributes.viewportTop - this.attributes.tileHeight*3,
          maxY = -this.attributes.y + this.engine.canvas.height - this.attributes.viewportBottom + this.attributes.tileHeight*3;

      // Background
      if (this.requestBackgroundRedraw) {
        this.requestBackgroundRedraw = false;
        this.drawBackground = true;
      }

      // Foreground
      for (var i = 0; i < this.dynamicSprites.models.length; i++) {
        var  sprite = this.dynamicSprites.models[i];
        if (sprite.attributes.x + sprite.attributes.width >= minX && sprite.attributes.x <= maxX &&
            sprite.attributes.y + sprite.attributes.height >= minY && sprite.attributes.y <= maxY) {
          sprite._draw = sprite.update(dt);
          count++;
        }
      }

      if (this.debugPanel)
        this.debugPanel.set({
          drawBackground: this.drawBackground,
          updateCount: count,
          updateTime: _.now()-start
        });

      this.drawBackground = this.drawBackground || this.lastX != this.attributes.x || this.lastY || this.attributes.y;
      this.lastX = this.attributes.x; this.lastY = this.attributes.y;

      if (this.attributes.state == "play") this.handleTimeouts();

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
          sprite, index, count = 0,
          tileX1 = this.getWorldCol(-this.attributes.x + this.attributes.viewportLeft),
          tileX2 = this.getWorldCol(-this.attributes.x + context.canvas.width - this.attributes.viewportRight),
          tileY1 = this.getWorldRow(-this.attributes.y + this.attributes.viewportTop),
          tileY2 = this.getWorldRow(-this.attributes.y + context.canvas.height - this.attributes.viewportBottom);
      this.spriteOptions.offsetX = this.attributes.x;
      this.spriteOptions.offsetY = this.attributes.y;

      drawRect(
        context,
        0, 0, context.canvas.width, context.canvas.height,
        this.attributes.backgroundColor
      );

      if (this.backgroundImage) {
        var img = this.backgroundImage,
            ix = -this.attributes.x/2,
            iy = -this.attributes.y/2,
            width = context.canvas.width < img.width ? context.canvas.width : img.width,
            height = context.canvas.height < img.height ? context.canvas.height : img.height,
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

      for (var col = tileX1; col <= tileX2; col++)
        for (var row = tileY1; row <= tileY2; row++) {
          index = col * this.attributes.height + row;
          if (this.staticSprites.lookup[index])
            for (var s = 0; s < this.staticSprites.lookup[index].length; s++) {
              sprite = this.staticSprites.lookup[index][s];
              sprite.draw.call(sprite, context, this.spriteOptions);
              count++;
            }
        }

      if (this.debugPanel) this.debugPanel.set({
        staticDrwan: count,
        staticDrawTime: _.now()-start
      });

      return this;
    },
    drawDynamicSprites: function(context) {
      var start =_.now(),
          sprite, index, count = 0,
          tileX1 = this.getWorldCol(-this.attributes.x + this.attributes.viewportLeft - this.attributes.tileWidth),
          tileX2 = this.getWorldCol(-this.attributes.x + context.canvas.width - this.attributes.viewportRight + this.attributes.tileWidth),
          tileY1 = this.getWorldRow(-this.attributes.y + this.attributes.viewportTop - this.attributes.tileHeight),
          tileY2 = this.getWorldRow(-this.attributes.y + context.canvas.height - this.attributes.viewportBottom + this.attributes.tileHeight);
      this.spriteOptions.offsetX = this.attributes.x;
      this.spriteOptions.offsetY = this.attributes.y;

      context.save();
      context.rect(
        this.attributes.viewportLeft,
        this.attributes.viewportTop,
        context.canvas.width - this.attributes.viewportRight,
        context.canvas.height - this.attributes.viewportBottom);
      context.clip();

      context.drawImage(this.backgroundCanvas,
        this.attributes.viewportLeft, this.attributes.viewportTop, this.viewport.width, this.viewport.height,
        this.attributes.viewportLeft, this.attributes.viewportTop, this.viewport.width, this.viewport.height);

      for (var col = tileX1; col <= tileX2; col++)
        for (var row = tileY1; row <= tileY2; row++) {
          index = col * this.attributes.height + row;
          if (this.dynamicSprites.lookup[index])
            for (var s = 0; s < this.dynamicSprites.lookup[index].length; s++) {
              sprite = this.dynamicSprites.lookup[index][s];
              if (sprite._draw) {
                sprite.draw.call(sprite, context, this.spriteOptions);
                count++;
              }
            }
        }

      context.restore();

      if (this.debugPanel) this.debugPanel.set({
        dynamicDrawn: count,
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
    isWorldIndexInBoundingBox: function(index, topLeft, bottomRight) {
      if (index < topLeft || index > bottomRight) return false;
      if (index % this.attributes.height < topLeft % this.attributes.height) return false;
      if (index % this.attributes.height > bottomRight % this.attributes.height) return false;
      return true;
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
      var id = exclude && exclude.id ? exclude.id : null,
          col = this.getWorldCol(x),
          row = this.getWorldRow(y),
          index, c, r, s,
          result = [];

      function test(sprite) {
        return (sprite.id && sprite.id != id) &&
          (!type || sprite.get("type") == type) &&
          (!collision || sprite.get("collision")) &&
          sprite.overlaps.call(sprite, x, y);
      }

      if (type == "tile") {
        index = this.getWorldIndex({x: x, y: y});
        var sprite = index ? this.sprites.get(index) : null;
        if (sprite && test(sprite))
          return fn == "find" ? sprite : [sprite];
        return fn == "find" ? null : result;
      }

      // Look in dynamic sprites first (lookup by index)
      for (c = col-1; c <= col+1; c++)
        for (r = row-1; r <= row+1; r++) {
          index = c * this.attributes.height + r;
          if (this.dynamicSprites.lookup[index])
            for (s = 0; s < this.dynamicSprites.lookup[index].length; s++)
              if (test(this.dynamicSprites.lookup[index][s]))
                if (fn == "find")
                  return this.dynamicSprites.lookup[index][s];
                else
                  result.push(this.dynamicSprites.lookup[index][s]);
        }
      if (type == "character") return fn == "find" ? null: result;

      // Finally in static ones
      index = col * this.attributes.height + row;
      if (this.staticSprites.lookup[index])
        for (s = 0; s < this.staticSprites.lookup[index].length; s++)
          if (test(this.staticSprites.lookup[index][s]))
            if (fn == "find")
              return this.staticSprites.lookup[index][s];
            else
              result.push(this.staticSprites.lookup[index][s]);

      return fn == "find" ? null : result;
    },
    // Detects collisions on sprites for a set of named coordinates. Works on moving
    // and static sprites.
    // Map is a map of objects describing the locations to look at, and the result.
    // Each map item is an object with:
    //  - x, y: The lookup coordinate.
    //  - sprites: array of detected colliding sprites. Reset/initialized to [] every call.
    //  - sprite: the first detected sprite or null if none.
    // Returns the number of found collisions.
    findCollisions: function(map, type, exclude, collision) {
      if (_.size(map) == 0) return 0;

      var id = exclude && exclude.id ? exclude.id : null,
          minX, minY, maxX,maxY,
          m, c, r, index, s,
          count = 0;

      for (m in map)
        if (map.hasOwnProperty(m)) {
          if (minX == undefined || map[m].x < minX) minX = map[m].x;
          else if (maxX == undefined || map[m].x > maxX) maxX = map[m].x;
          if (minY == undefined || map[m].y < minY) minY = map[m].y;
          else if (maxY == undefined || map[m].y > maxY) maxY = map[m].y;
          map[m].sprites = [];
          map[m].sprite = null;
        }

      var minCol = this.getWorldCol(minX) - 1,
          minRow = this.getWorldRow(minY) - 1,
          maxCol = this.getWorldCol(maxX),
          maxRow = this.getWorldRow(maxY);

      function doIt(sprite) {
        if (sprite.id && sprite.id != id &&
            (!type || sprite.attributes.type == type) &&
            (!collision || sprite.attributes.collision))
          for (m in map)
            if (map.hasOwnProperty(m) &&
                sprite.overlaps.call(sprite, map[m].x, map[m].y)) {
              map[m].sprites.push(sprite);
              if (!map[m].sprite) map[m].sprite = sprite;
              count++;
            }
      }

      // Look in dynamic sprites first (lookup by index)
      for (c = minCol; c <= maxCol; c++)
        for (r = minRow; r <= maxRow; r++) {
          index = c * this.attributes.height + r;
          if (this.dynamicSprites.lookup[index])
            for (s = 0; s < this.dynamicSprites.lookup[index].length; s++)
              doIt(this.dynamicSprites.lookup[index][s]);
        }
      if (type == "character") return count;

      // Finally in static ones
      for (c = minCol; c <= maxCol; c++)
        for (r = minRow; r <= maxRow; r++) {
          index = c * this.attributes.height + r;
          if (this.staticSprites.lookup[index])
            for (s = 0; s < this.staticSprites.lookup[index].length; s++)
              doIt(this.staticSprites.lookup[index][s]);
        }

      return count;
    },
    // Static tiles lookup.
    // Note: Will not detect moving sprites!
    // DEPRECATED: Use findAt instead
    findCollidingAt:function(x, y) {
      return this.findAt(x, y, "tile", null, true);
    },
    add: function(models, options) {
      options || (options = {});
      options.world = this;
      
      if (_.isArray(models))
        for (var i = 0; i < models.length; i++) {
          if (models[i].attributes)
            models[i].set("id", this.buildId(models[i]));
          else
            models[i].id = this.buildId(models[i]);
        }
      else {
        if (models.attributes)
          models.set("id", this.buildId(models));
        else
          models.id = this.buildId(models);
      }

      models = this.sprites.add.call(this.sprites, models, options);

      if (_.isArray(models))
        for (var i = 0; i < models.length; i++) {
          models[i].world = this;
        }
      else {
        models.world = this;
      }

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
      options.input = this.input;

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
          if (!existing.getStateInfo) {
            this.sprites.remove(existing);
            return null;
          }
          // Toggle if same sprite - either turn around or remove
          var cur = existing.getStateInfo(),
              removeOnDir = sprite.get("hero") ? "left" : "right";
          if (!cur.dir || cur.dir == removeOnDir) {
            this.remove(existing);
            return null;
          }
          if (cur.opo && _.isFunction(existing.toggleDirection))
            existing.toggleDirection(cur.opo);
          return existing;
        } else {
          // Replace existing
          this.remove(existing);
        }
      }

      var col = this.getWorldCol(x),
          row = this.getWorldRow(y - sprite.get("height") + w.tileHeight),
          cls = _.classify(spriteName);

      var newSprite = new Backbone[cls](_.extend({}, sprite.toJSON(), {
        x: col * w.tileWidth,
        y: row * w.tileHeight
      }), options);

      // A hero is a singleton
      var isHero = newSprite.get("hero");
      if (isHero) {
        var oldHeros = this.sprites.where({hero: true});
        if (oldHeros.length) this.sprites.remove(oldHeros);
      }

      this.add(newSprite, options);

      if (isHero && this.camera)
        this.camera.setOptions({world: this, subject: newSprite});

      newSprite.engine = this.engine;
      newSprite.trigger("attach", this.engine);

      return newSprite;
    },
    buildIdFromName: function(name) {
      var re = new RegExp("^" + name + "\\." + "\\d+$"),
          numbers = this.dynamicSprites.reduce(function(numbers, sprite) {
            if (sprite.id && sprite.id.length && sprite.id.match(re))
              numbers.push(parseInt(sprite.id.replace(name + ".", "")));
            return numbers;
          }, [0]);
      return name + "." + (_.max(numbers) + 1);
    },
    buildId: function(sprite) {
      var attributes = sprite.attributes || sprite;
      if (attributes.type != "tile")
        return this.buildIdFromName(attributes.name);

      return this.getWorldCol(attributes.x) * this.attributes.height +
        this.getWorldRow(attributes.y - attributes.height + this.attributes.tileHeight);
    },
    clearBeyondWorldBoundaries: function() {
      var minX = 0,
          minY = 0,
          maxX = this.attributes.width * this.attributes.tileWidth,
          maxY = this.attributes.height * this.attributes.tileHeight,
          toRemove = this.sprites.reduce(function(result, sprite) {
            if (sprite.attributes.x + sprite.attributes.width < minX ||
                sprite.attributes.y + sprite.attributes.height < minY ||
                sprite.attributes.x > maxX ||
                sprite.attributes.y > maxY)
              result.push(sprite);
            return result;
          });

      console.log(toRemove.length);
      this.sprites.remove(toRemove);

      return this;
    }
  });

}).call(this);
