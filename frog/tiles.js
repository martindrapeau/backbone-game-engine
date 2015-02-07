(function() {

  /**
   *
   * Backbone Game Engine - An elementary HTML5 canvas game engine using Backbone.
   *
   * Copyright (c) 2014 Martin Drapeau
   * https://github.com/martindrapeau/backbone-game-engine
   *
   */
  
  Backbone.Tile = Backbone.Sprite.extend({
    defaults: {
      type: "tile",
      width: 32,
      height: 32,
      spriteSheet: "tiles",
      state: "idle",
      static: true,
      persist: true
    },
    initialize: function(attributes, options) {
      options || (options = {});
      this.world = options.world;
      this.lastSequenceChangeTime = 0;
    }
  });


  function extendSprite(cls, name, attributes, animations) {
    var newCls = _.classify(name);
    Backbone[newCls] = Backbone[cls].extend({
      defaults: _.extend(
        _.deepClone(Backbone[cls].prototype.defaults),
        {name: name},
        attributes || {}
      ),
      animations: _.extend(
        _.deepClone(Backbone[cls].prototype.animations),
        animations || {}
      )
    });
    return Backbone[newCls];
  }

  extendSprite("Tile", "land1", {collision: true}, {idle: {sequences: [353]}});

  extendSprite("Tile", "land2", {collision: true}, {idle: {sequences: [354]}});

  extendSprite("Tile", "land3", {collision: true}, {idle: {sequences: [355]}});

  extendSprite("Tile", "land4", {collision: true}, {idle: {sequences: [237]}});

  extendSprite("Tile", "land5", {collision: true}, {idle: {sequences: [238]}});

  extendSprite("Tile", "land6", {collision: true}, {idle: {sequences: [239]}});

  extendSprite("Tile", "land7", {collision: true}, {idle: {sequences: [208]}});

  extendSprite("Tile", "land8", {collision: true}, {idle: {sequences: [34]}});

  extendSprite("Tile", "mush1", {collision: true}, {idle: {sequences: [382]}});

  extendSprite("Tile", "mush2", {collision: true}, {idle: {sequences: [383]}});

  extendSprite("Tile", "mush3", {collision: true}, {idle: {sequences: [384]}});

  extendSprite("Tile", "mush4", {collision: true}, {idle: {sequences: [266]}});

  extendSprite("Tile", "mush5", {collision: true}, {idle: {sequences: [267]}});

  extendSprite("Tile", "mush6", {collision: true}, {idle: {sequences: [268]}});

  extendSprite("Tile", "ground", {collision: true}, {idle: {sequences: [0]}});

  extendSprite("Tile", "ground2", {collision: true}, {idle: {sequences: [31]}});

  extendSprite("Tile", "block", {collision: true}, {idle: {sequences: [3]}});

  extendSprite("Tile", "block2", {collision: true}, {idle: {sequences: [29]}});

  extendSprite("Tile", "cloud-small", {collision: true}, {idle: {sequences: [613]}});

  extendSprite("Tile", "water1", {collision: false}, {idle: {sequences: [583]}});

  extendSprite("Tile", "water2", {collision: false}, {idle: {sequences: [612]}});

  extendSprite("Tile", "cloud1", {collision: false}, {idle: {sequences: [580]}});

  extendSprite("Tile", "cloud2", {collision: false}, {idle: {sequences: [581]}});

  extendSprite("Tile", "cloud3", {collision: false}, {idle: {sequences: [582]}});

  extendSprite("Tile", "cloud-happy1", {collision: false}, {idle: {sequences: [585]}});

  extendSprite("Tile", "cloud-happy2", {collision: false}, {idle: {sequences: [586]}});

  extendSprite("Tile", "cloud-happy3", {collision: false}, {idle: {sequences: [587]}});

  extendSprite("Tile", "cloud4", {collision: false}, {idle: {sequences: [609]}});

  extendSprite("Tile", "cloud5", {collision: false}, {idle: {sequences: [610]}});

  extendSprite("Tile", "cloud6", {collision: false}, {idle: {sequences: [611]}});

  extendSprite("Tile", "cloud-happy4", {collision: false}, {idle: {sequences: [614]}});

  extendSprite("Tile", "cloud-happy5", {collision: false}, {idle: {sequences: [615]}});

  extendSprite("Tile", "cloud-happy6", {collision: false}, {idle: {sequences: [616]}});

  extendSprite("Tile", "cloud-platform1", {collision: true}, {idle: {sequences: [588]}});

  extendSprite("Tile", "cloud-platform2", {collision: true}, {idle: {sequences: [589]}});

  extendSprite("Tile", "cloud-platform3", {collision: true}, {idle: {sequences: [590]}});

  extendSprite("Tile", "cloud-platform4", {collision: true}, {idle: {sequences: [704]}});

  extendSprite("Tile", "cloud-platform5", {collision: true}, {idle: {sequences: [705]}});

  extendSprite("Tile", "cloud-platform6", {collision: true}, {idle: {sequences: [706]}});

  Backbone.Platform = Backbone.Character.extend({
    defaults: {
      type: "character",
      name: "platform",
      width: 96,
      height: 32,
      spriteSheet: "tiles",
      tileX: 256,
      tileY: 640,
      state: "idle",
      static: false,
      collision: true
    },
    initialize: function(attributes, options) {
      options || (options = {});
      this.world = options.world;
    },
    update: function(dt) {
      return true;
    },
    draw: function(context, options) {
      options || (options = {});

      var x = this.get("x") + (options.offsetX || 0),
          y = this.get("y") + (options.offsetY || 0),
          tileX = this.get("tileX"),
          tileY = this.get("tileY"),
          tileWidth = this.get("width"),
          tileHeight = this.get("height");

      context.drawImage(
        this.spriteSheet.img,
        tileX, tileY, tileWidth, tileHeight,
        Math.round(x), Math.round(y), tileWidth, tileHeight
      );

      return this;
    }
  });

}).call(this);