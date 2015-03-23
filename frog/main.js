$(window).on("load", function() {

  /**
   *
   * Backbone Game Engine - An elementary HTML5 canvas game engine using Backbone.
   *
   * Copyright (c) 2014 Martin Drapeau
   * https://github.com/martindrapeau/backbone-game-engine
   *
   */
  
  var canvas = document.getElementById("foreground"),
      context = canvas.getContext("2d");
  adjustViewport(canvas);

  var spriteNames = [
    "land1", "land2", "land3", "land4", "land5", "land6",
    "mush1", "mush2", "mush3", "mush4", "mush5", "mush6",
    "water1", "cloud1", "cloud2", "cloud3", "cloud-happy1", "cloud-happy2", "cloud-happy3", 
    "cloud-small", "ground", "land8", "ground2", "block", "land7", "block2",
    "cloud-platform1", "cloud-platform2", "cloud-platform3", "cloud-platform4", "cloud-platform5", "cloud-platform6",
    "water2", "cloud4", "cloud5", "cloud6", "cloud-happy4", "cloud-happy5", "cloud-happy6",
    "frog", "platform"
  ];

  Backbone.Controller = Backbone.Model.extend({
    initialize: function(attributes, options) {
      options || (options = {});
      var controller = this;

      _.bindAll(this, "onChangeState", "toggleState", "saveWorld", "loadWorld");

      // Create our sprite sheets and attach them to existing sprite classes
      this.spriteSheets = new Backbone.SpriteSheetCollection([{
        id: "frog",
        img: "#frog",
        tileWidth: 50,
        tileHeight: 65,
        tileColumns: 3,
        tileRows: 1
      }, {
        id: "tiles",
        img: "#tiles",
        tileWidth: 32,
        tileHeight: 32,
        tileColumns: 29,
        tileRows: 28
      }]).attachToSpriteClasses();

      // Create the debug panel
      this.debugPanel = new Backbone.DebugPanel();

      // User input (turn off touchpad to start)
      this.input = new Backbone.Input({
        drawTouchpad: true
      });

      // Camera
      this.camera = new Backbone.Camera();

      // Our world
      this.world = new Backbone.World(
        _.extend({viewportBottom: 156}, window._world), {
        input: this.input,
        camera: this.camera
      });

      // Message
      this.message = new Backbone.Message({
        x: 480, y: 20
      });

      // Buttons
      this.toggleButton = new Backbone.Button({
        x: 4, y: 4, width: 52, height: 52, borderRadius: 5,
        img: "#icons", imgX: 0, imgY: 0, imgWidth: 32, imgHeight: 32, imgMargin: 10
      });
      this.toggleButton.on("tap", this.toggleState, this);

      this.saveButton = new Backbone.Button({
        x: 904, y: 548, width: 52, height: 52, borderRadius: 5,
        img: "#icons", imgX: 96, imgY: 0, imgWidth: 32, imgHeight: 32, imgMargin: 10
      });
      this.saveButton.on("tap", this.saveWorld, this);

      this.restartButton = new Backbone.Button({
        x: 904, y: 608, width: 52, height: 52, borderRadius: 5,
        img: "#icons", imgX: 128, imgY: 0, imgWidth: 32, imgHeight: 32, imgMargin: 10
      });
      this.restartButton.on("tap", this.restartWorld, this);

      this.downloadButton = new Backbone.Button({
        x: 888, y: 10, width: 52, height: 52, borderRadius: 5,
        img: "#icons", imgX: 64, imgY: 0, imgWidth: 32, imgHeight: 32, imgMargin: 10
      });
      this.downloadButton.on("tap", this.downloadNewVersion, this);

      // The game engine
      this.engine = new Backbone.Engine({}, {
        canvas: canvas,
        debugPanel: this.debugPanel
      });
      this.engine.add(_.compact([
        this.world,
        this.camera,
        this.toggleButton,
        this.message,
        this.debugPanel
      ]));

      // The sprite picker and editor
      this.editor = new Backbone.WorldEditor({
        spriteNames: spriteNames,
        width: 34*20+4
      }, {
        world: this.world
      });

      // Controls
      $(document).on("keypress.Controller", function(e) {
        if (e.keyCode == 66 || e.keyCode == 98)
          controller.engine.toggle(); // b to break the animation
        else if (e.keyCode == 80 || e.keyCode == 112)
          controller.toggleState(); // p to pause and pause
      });

      this.listenTo(this.world, "change:state", this.onChangeState);
      this.onChangeState();

      // If we have Application Cache active, load the latest world
      this.loadWorld();
    },
    toggleState: function(e) {
      var state = this.world.get("state");
      this.world.set("state", state == "edit" ? "play" : "edit");
      if (!this.engine.isRunning()) this.engine.start();
    },
    onChangeState: function() {
      var state = this.world.get("state");
      if (state == "edit") {
        // Edit
        context.clearRect(0, 0, canvas.width, canvas.height);
        this.engine.remove(this.input);
        this.engine.add(this.editor);
        this.engine.add([this.saveButton, this.restartButton]);
        this.toggleButton.set({imgX: 32});
      } else {
        // Play
        context.clearRect(0, 0, canvas.width, canvas.height);
        this.engine.remove(this.editor);
        this.engine.remove([this.saveButton, this.restartButton]);
        this.engine.add(this.input);
        this.toggleButton.set({imgX: 0});
      }
    },
    // Save our world to the server when changed. Debounce by 5 seconds
    // and push back saving upon activity
    saveWorld: function() {
      var controller = this,
          world = this.world
          message = this.message;

      message.show("Saving...");
      world.save(null, {
        success: function() {
          setTimeout(function() {
            message.hide();
          }, 1000);
        },
        error: function(xhr, textStatus, errorThrown ) {
          message.show("Error: " + errorThrown);
        }
      });
      return this;
    },
    // Load our world from the server.
    loadWorld: function() {
      var controller = this,
          world = this.world,
          message = this.message;

      message.show("Loading...");
      world.fetch({
        success: function() {
          world.spawnSprites();
          message.hide();
        },
        error: function(xhr, textStatus, errorThrown ) {
          message.show('Error: ' + errorThrown);
          setTimeout(function() {
            message.hide();
          }, 2000);
        }
      });
      return this;
    },
    restartWorld: function() {
      var controller = this,
          world = this.world,
          message = this.message;

      message.show("Restarting...");

      localStorage.removeItem(world.id);

      world.set(window._world).spawnSprites();

      setTimeout(function() {
        message.hide();
      }, 2000);

      return this;
    },
    downloadNewVersion: function() {
      window.applicationCache.swapCache();
      this.message.show("Please wait...");
      window.location.reload();
    }
  });
  
  var controller = new Backbone.Controller();

  // When a newer version is available, load it and inform
  // the user it can be downloaded.
  if (window.applicationCache !== undefined)
    window.applicationCache.addEventListener('updateready', function() {
      controller.engine.add(controller.downloadButton);
    });

  // Expose things as globals - easier to debug
  _.extend(window, {
    canvas: canvas,
    context: context,
    controller: controller
  });

});