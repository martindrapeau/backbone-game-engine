backbone-game-engine
====================

An elementary HTML5 Game Engine using Backbone. Demonstration with Mario is here:
http://martindrapeau.github.io/backbone-game-engine


Why Backbone?
-------------

Backbone implements Events, Models and Collections. Models and Collections have an `extend` function to easily do inheritance. Game engines implement OO and events in their own way. Backbone is now widely used and provides these features in a standard fashion. I hope this project can make game programming accessible to developers already familiar with Backbone.


Dependencies
------------

- [jQuery](http://jquery.com/)
- [Underscore](http://underscorejs.org/)
- [Backbone](http://backbonejs.org/)

Nothing else.


Philosophy
----------

`Backbone.Engine` is a collection of ordered Models (typically `Backbone.Sprite`).

Models you add to the `Backbone.Engine` collection must implement the `update` and `draw` functions. Those are the only two requirements.

`Backbone.Engine` uses HTML5's [requestAnimationFrame](https://developer.mozilla.org/en/docs/Web/API/window.requestAnimationFrame) to provide a 60 frames per second game loop. Every frame, the engine performs these things:
- Clear the canvas.
- Loop through Models (in order), and calls their `update` function. Passing `dt`, the time in milliseconds since the last call to update. The update function must return `true` to ask for a redraw, or `false` not to.
- Loop through all Models that requested a redraw, and call their `draw` function. Passing `context`, the canvas 2d context. Perform whatever magic you like in the draw function.
- Rince and repeat.

The `update` function is used to update the Model position, animation, detect collisions, or whatever you like. If it requests a redraw, the engine will then call its `draw` function. The Engine ensures that Models are updated and drawn in the order they are sorted in the Collection. Consult Backbone docs to find out how to change the sort order.

`Backbone.Sprite` is a sub-classed Model. Its attributes contain information on how to break an image spritesheet into tiles, and define the animation frames. In the [demonstration](http://martindrapeau.github.io/backbone-game-engine), `Mario` is a sub-classed Sprite which implements velocity and acceleration. Mario is controled by the user either by using the keyboard, or the touchpad (for touch devices). User input is captured with the `Backbone.Input` class.


Classes
-------

- **Backbone.Engine**: A Backbone Collection which implements an animation loop to update and draw its Models (typically Sprites).
- **Backbone.Sprite**: A Backbone Model representing a sprite on screen. Builds a tileset from an image and enables animation.
- **Backbone.Input**: A Backbone Model which captures user input via the keyboard, or via touch events (draws a touchpad on screen).
- **Backbone.DebugPanel**: Backbone View to display debug information on screen. Wraps a Backbone Model.

* * *

Inspired by looking at [MelonJS](https://github.com/melonjs/melonjs).

Copyright (c) 2014 Martin Drapeau<br/>
Licensed under the MIT @license