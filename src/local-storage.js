(function() {

  // Load this file to persist in local storage.
  // It will replace Backbone.World's save and fetch methods.

  Backbone.World.prototype.fetch = function(options) {
      var data = localStorage.getItem(this.id);
      if (data) {
        console.log("===== LOADING LOCAL STORAGE ====");
        this.set(JSON.parse(data));
      }
      return this;
  };
  
  Backbone.World.prototype.save = function(attributes, options) {
      console.log("===== SAVING LOCAL STORAGE ====");
      localStorage.setItem(this.id, JSON.stringify(this.toJSON()));
      return this;
  };

}).call(this);