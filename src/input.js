(function() {

  /**
   *
   * Backbone Game Engine - An elementary HTML5 canvas game engine using Backbone.
   *
   * Copyright (c) 2014 Martin Drapeau
   * https://github.com/martindrapeau/backbone-game-engine
   *
   */

  var left = 0,
      right = 900,
      top = 0,
      bottom = 660;

  // Input class; a Backbone Model which captures input events
  // and stores them as model attributes with true if pressed.
  // Supports keyboard, and a drawn touchpad activated by touch
  // or mouse events.
  Backbone.Input = Backbone.Model.extend({
    defaults: {
      // Supported buttons
      left: false, // Left button pressed?
      right: false, // Right button pressed?
      buttonA: false, // A button pressed? (X on keyboard)
      buttonB: false, // B button pressed? (Z on keyboard)
      pause: false, // Pause button pressed? (P on keyboard)

      // List of pressed buttons per input device
      pressed: [], // List of buttons pressed on the keyboard
      touched: [], // List of buttons touched on a touch screen
      clicked: false, // Button clicked by the mouse

      // Touch pad
      drawTouchpad: "auto", // Boolean to draw. Set to auto to draw only for touch devices.
      drawPause: false, // Boolean to draw the pause button.
      touchEnabled: false // Touch device? Automatically determined. Do not set.
    },
    // Touch pad buttons to draw on screen
    touchButtons: [{
      button: "left",
      x: left, y: bottom-100,
      width: 120,  height: 150,
      draw: function(context, pressed) {
        context.clearRect(35, context.canvas.height-40-90, 70, 80);
        var opacity = pressed ? 1 : 0.5;
        context.save();
        context.beginPath();
        context.moveTo(100, context.canvas.height-40-90);
        context.lineTo(40, context.canvas.height-40-50);
        context.lineTo(100, context.canvas.height-40-10);
        context.fillStyle = ("rgba(0, 255, 0, {0})").replace("{0}", opacity);
        context.fill();
        context.restore();
      }
    }, {
      button: "right",
      x: 120, y: bottom-100,
      width: 120,  height: 100,
      draw: function(context, pressed) {
        context.clearRect(135, context.canvas.height-40-90, 70, 80);
        var opacity = pressed ? 1 : 0.5;
        context.save();
        context.beginPath();
        context.moveTo(140, context.canvas.height-40-90);
        context.lineTo(200, context.canvas.height-40-50);
        context.lineTo(140, context.canvas.height-40-10);
        context.fillStyle = ("rgba(0, 255, 0, {0})").replace("{0}", opacity);
        context.fill();
        context.restore();
      }
    }, {
      button: "buttonB",
      x: right-240, y: bottom-100,
      width: 150,  height: 150,
      draw: function(context, pressed) {
        context.clearRect(context.canvas.width-60-185, context.canvas.height-40-92, 90, 84);
        var opacity = pressed ? 1 : 0.5;
        context.save();
        context.beginPath();
        context.arc(context.canvas.width-60-140, context.canvas.height-40-50, 40, 0, 2*Math.PI, false);
        context.fillStyle = ("rgba(255, 0, 0, {0})").replace("{0}", opacity);
        context.fill();
        drawButtonLabel(context, "B", context.canvas.width-60-140, context.canvas.height-40-50);
        context.restore();
      }
    }, {
      button: "buttonA",
      x: right-90, y: bottom-100,
      width: 150,  height: 150,
      draw: function(context, pressed) {
        context.clearRect(context.canvas.width-60-85, context.canvas.height-40-92, 90, 84);
        var opacity = pressed ? 1 : 0.5;
        context.save();
        context.beginPath();
        context.arc(context.canvas.width-60-40, context.canvas.height-40-50, 40, 0, 2*Math.PI, false);
        context.fillStyle = ("rgba(0, 0, 255, {0})").replace("{0}", opacity);
        context.fill();
        drawButtonLabel(context, "A", context.canvas.width-60-40, context.canvas.height-40-50);
        context.restore();
      }
    }, {
      button: "pause",
      x: (right-left)/2 - 90, y: bottom-80,
      width: 180, height: 80,
      draw: function(context, pressed) {
        context.clearRect((context.canvas.width-60)/2 - 90, context.canvas.height-40-80, 180, 60);
        var opacity = pressed ? 1 : 0.5,
            fillStyle = ("rgba(128, 128, 128, {0})").replace("{0}", opacity);
        drawRoundRect(context, (context.canvas.width-60)/2 - 90, context.canvas.height-40-80, 180, 60, 5, fillStyle);
        drawButtonLabel(context, "PAUSE", (context.canvas.width-60)/2, context.canvas.height-40-50);
      }
    }],
    initialize: function(attributes, options) {
      options || (options = {});
      var input = this;

      _.bindAll(this,
        "rightPressed", "leftPressed", "buttonBPressed", "buttonAPressed",
        "onKeydown", "onKeyup", "onMouseDown", "onMouseUp",
        "detectTouched", "onTouchStart", "onTouchMove", "onTouchEnd"
        );

      // Handle touch events
      var touchEnabled =
        "onorientationchange" in window ||
        window.navigator.msMaxTouchPoints ||
        window.navigator.isCocoonJS;
      this.set({touchEnabled: touchEnabled});

      // Debug panel
      var debugPanel = this.debugPanel = options.debugPanel;
      if (debugPanel) {
        this.on("change:pressed", function() {
          debugPanel.set({pressed: input.get("pressed")});
        });
        this.on("change:touched", function() {
          debugPanel.set({touched: input.get("touched")});
        });
        this.on("change:clicked", function() {
          debugPanel.set({clicked: input.get("clicked")});
        });
      }

      if (touchEnabled) {
        // Prevent touch scroll
        $(document).bind("touchmove.InputTouchScroll", function(e) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        });

        // Prevent links from opening popup after a while
        document.documentElement.style.webkitTouchCallout = "none";
      }

      this.on("change:drawTouchpad", this.toggleTouchpad);
      this.on("attach", this.onAttach);
      this.on("detach", this.onDetach);
    },
    onAttach: function() {
      this.onDetach();
      // Handle keyboard input
      $(document).on("keydown.Input", this.onKeydown);
      $(document).on("keyup.Input", this.onKeyup);

      var canvas = this.engine.canvas;
      _.each(this.touchButtons, function(button) {
        switch (button.button) {
          case "pause":
            button.x = (canvas.width - 60)/2 - 90;
            break;
          case "buttonA":
            button.x = canvas.width - 60 - 90;
            break;
          case "buttonB":
            button.x = canvas.width - 60 - 240;
            break;
        }
        switch (button.button) {
          case "pause":
            button.y = canvas.height - 40 - 80;
            break;
          default:
            button.y = canvas.height - 40 - 100;
        }
      });

      // Touch pad
      this.toggleTouchpad();
    },
    onDetach: function() {
      $(document).off(".Input");
      $(document).off(".InputTouchpad");
      this.set({
        left: false,
        right: false,
        buttonA: false,
        buttonB: false,
        pause: false,
        pressed: [],
        touched: [],
        clicked: false
      });
    },

    // Touch pad
    toggleTouchpad: function() {
      $(document).off(".InputTouchpad");
      console.log("toggleTouchpad");

      if (!this.hasTouchpad()) return;
      
      if (this.get("touchEnabled")) {
        if (window.navigator.msMaxTouchPoints) {
          console.log("Input: attaching MS touch events");
          $(document).on("pointerdown.InputTouchpad", this.onTouchStart);
          $(document).on("pointermove.InputTouchpad", this.onTouchMove);
          $(document).on("pointerup.InputTouchpad", this.onTouchEnd);
          $(document).on("pointercancel.InputTouchpad", this.onTouchEnd);
        } else {
          console.log("Input: attaching touch events");
          $(document).on("touchstart.InputTouchpad", this.onTouchStart);
          $(document).on("touchmove.InputTouchpad", this.onTouchMove);
          $(document).on("touchend.InputTouchpad", this.onTouchEnd);
          $(document).on("touchleave.InputTouchpad", this.onTouchEnd);
          $(document).on("touchcancel.InputTouchpad", this.onTouchEnd);
        }
      } else {
        // Fallback to handling mouse events
        console.log("Input: attaching mouse events");
        $(document).on("mousedown.InputTouchpad", this.onMouseDown);
        $(document).on("mousemove.InputTouchpad", this.onMouseDown);
        $(document).on("mouseup.InputTouchpad", this.onMouseUp);
      }

      return this;
    },
    hasTouchpad: function() {
      var  drawTouchpad = this.get("drawTouchpad");
      if (_.isBoolean(drawTouchpad)) return drawTouchpad;
      if (drawTouchpad == "auto" && this.get("touchEnabled")) return true;
      return false;
    },

    // Engine core functions
    update: function(dt) {
      return this.hasTouchpad();
    },
    draw: function(context) {
      var input = this,
          drawPause = this.get("drawPause");

      // Draw the touch pad
      _.each(this.touchButtons, function(button) {
        if (button.button != "pause" || drawPause)
          button.draw(context, !!input.get(button.button));
      });

      return this;
    },

    // Keyboard events
    onKeydown: function(e) {
      var button = this.keyCodeToButton(e.keyCode),
          attrs = {};
      attrs[e.keyCode] = true;
      if (button) {
        attrs.pressed = _.clone(this.get("pressed"));
        attrs[button] = true;
        if (_.indexOf(attrs.pressed, button) == -1) attrs.pressed.push(button);
      }
      this.set(attrs);
    },
    onKeyup: function(e) {
      var button = this.keyCodeToButton(e.keyCode),
          attrs = {};
      attrs[e.keyCode] = false;
      if (button) {
        attrs[button] = false;
        attrs.pressed = _.without(this.get("pressed"), button);
      }
      this.set(attrs);
    },

    // Touch events
    detectTouched: function() {
      var canvas = this.engine.canvas,
          touchButtons = this.touchButtons,
          touched = _.clone(this.get("touched")) || [],
          attrs = {touched: []};

      _.each(ongoingTouches, function(touch) {
        var x = touch.pageX - canvas.offsetLeft,
            y = touch.pageY - canvas.offsetTop;

        _.each(touchButtons, function(button) {
          if (x > button.x && x < button.x + button.width &&
            y > button.y && y < button.y + button.height) {
            attrs.touched.push(button.button);
            attrs[button.button] = true;
          }
        });
      });

      _.each(touched, function(button) {
        if (_.indexOf(attrs.touched, button) == -1)
          attrs[button] = false;
      });

      if (_.isEqual(attrs.touched, touched)) delete attrs.touched;
      if (!_.isEmpty(attrs)) this.set(attrs);

      return this;
    },
    onTouchStart: function(e) {
      e.preventDefault();
      var touches = e.changedTouches || [{
          identifier: e.pointerId,
          pageX: e.pageX,
          pageY: e.pageY
        }];

      for (var i = 0; i < touches.length; i++)
        ongoingTouches.push(copyTouch(touches[i]));
      this.detectTouched();
    },
    onTouchMove: function(e) {
      e.preventDefault();
      var touches = e.changedTouches || [{
          identifier: e.pointerId,
          pageX: e.pageX,
          pageY: e.pageY
        }];

      for (var i = 0; i < touches.length; i++) {
        var idx = ongoingTouchIndexById(touches[i].identifier);
        if (idx >= 0) ongoingTouches.splice(idx, 1, copyTouch(touches[i]));
      }

      this.detectTouched();
    },
    onTouchEnd: function(e) {
      e.preventDefault();
      var touches = e.changedTouches || [{
          identifier: e.pointerId,
          pageX: e.pageX,
          pageY: e.pageY
        }];

      for (var i=0; i < touches.length; i++) {
        var idx = ongoingTouchIndexById(touches[i].identifier);
        if (idx >= 0) ongoingTouches.splice(idx, 1);
      }

      this.detectTouched();
    },

    // Mouse events
    onMouseDown: function(e) {
      if (!e.which) return;

      var canvas = this.engine.canvas,
          x = e.pageX - canvas.offsetLeft,
          y = e.pageY - canvas.offsetTop,
          clicked = this.get("clicked"),
          attrs = {clicked: true};

      _.each(this.touchButtons, function(button) {
        if (x > button.x && x < button.x + button.width &&
          y > button.y && y < button.y + button.height &&
          clicked != button.button) {
          attrs.clicked = button.button;
          attrs[button.button] = true;
          return false;
        }
      });
      if (attrs.clicked === clicked) delete attrs.clicked;
      if (attrs.clicked === true) attrs[clicked] = false;

      if (!_.isEmpty(attrs)) this.set(attrs);
    },
    onMouseUp: function(e) {
      var clicked = this.get("clicked"),
          attrs = {clicked: false};
      if (_.isString(clicked)) attrs[clicked] = false;

      if (!_.isEmpty(attrs)) this.set(attrs);
    },

    // Button helpers
    rightPressed: function() {
      return !!this.get("right");
    },
    leftPressed: function() {
      return !!this.get("left");
    },
    buttonBPressed: function() {
      return !!this.get("buttonB");
    },
    buttonAPressed: function() {
      return !!this.get("buttonA");
    },
    pausePressed: function() {
      return !!this.get("pause");
    },
    keyCodeToButton: function(keyCode) {
      switch (keyCode) {
        case 39:
        return "right";
        case 37:
        return "left";
        case 90:
        return "buttonB";
        case 88:
        return "buttonA";
        case 80:
        return "pause";
      }
      return null;
    }
  });


  // Touch event helpers.
  // Source: https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Touch_events
  var ongoingTouches = [];
  function copyTouch(touch) {
    return { identifier: touch.identifier, pageX: touch.pageX, pageY: touch.pageY };
  }
  function ongoingTouchIndexById(idToFind) {
    for (var i=0; i < ongoingTouches.length; i++) {
      var id = ongoingTouches[i].identifier;
      if (id == idToFind) return i;
    }
    return -1;
  }
  
  function drawButtonLabel(context, text, x, y) {
    context.fillStyle = "#000";
    context.font = "40px arial bold";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, x, y);
  }

}).call(this);