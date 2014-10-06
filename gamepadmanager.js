var gamepadManager = {};

/*
 **  Gamepad Manager
 **  Author: Juampi92
 **
 **  Use: ...
 */

function _isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

// String Contains Plyfill
if (!String.prototype.contains) {
  String.prototype.contains = function() {
    return String.prototype.indexOf.apply(this, arguments) !== -1;
  };
}


(function(gpm) {
  'use strict';

  var hasEvents = 'GamepadEvent' in window;

  gpm.gamepads = {};
  gpm.gamepads_size = 0;
  gpm.events = {};

  gpm.nextStartCallback = null;

  //-----------------------------------
  //        Gamepad
  //-----------------------------------
  gpm.GamePad = function() {};

  gpm.GamePad.prototype = {
    constructor: function(gp) {
      this.id = gp.index;
      this.name = gp.id;
      this.gamepad = gp;

      this.eventKeys = {};
      this.keys = {};

      this.eventAxis = {};
      this.axis = {};
    },
    bind: function(bind) {
      this.bind = bind;
    },
    isStartPressed: function() {
      if (!this.bind) return false;
      return this._isPressed(this.gamepad.buttons[this.bind.startKey]).pressed;
    },
    isPressed: function(key) { // Se recomienda usar listeners
      if (!_isNumeric(key)) key = this.bind.getId(key);
      if (key === null || key < 0) return; // No es una key para ese input.

      return this._isPressed(this.gamepad.buttons[key]).pressed;
    },
    _isPressed: function(button) {
      return false;
    },
    _getButtonValue: function(button) {
      return false;
    },
    onButton: function(event, key, callback) {
      if (!_isNumeric(key)) key = this.bind.getId(key);
      if (!event in ['pressed', 'released', 'holded']) throw 'invalid Event: ' + event;

      if (this.eventKeys[key] === undefined) this.eventKeys[key] = {
        pressed: -1,
        eventos: {}
      };
      this.eventKeys[key].eventos[event] = callback;
    },
    onAxis: function(axis, mode, sensit, callback) {
      if (!axis in ['movement', 'camera', 'Ltrigger', 'Rtrigger', 'arrows']) throw 'invalid Axis: ' + axis;
      if (!mode in ['polar', 'normal', 'discrete']) throw 'invalid Mode: ' + mode;
      if (typeof sensit === 'function') {
        callback = sensit;
        sensit = 0;
      }

      if (this.eventAxis[axis] === undefined)
        this.eventAxis[axis] = {
          modes: {},
          axis: AxisContruct(this.bind, axis, this)
        };
      this.eventAxis[axis].modes[mode] = {
        s: sensit,
        c: callback
      };
    },
    triggerButton: function(key, event, paramm) {
      var pos = this.eventKeys[key];
      this._triggerButton(pos, event, paramm);
    },
    triggerAxis: function(axis, mode, paramm) {
      var pos = this.eventAxis[axis][mode];
      this._triggerAxis(pos, param);
    },
    _triggerButton: function(pos, event, paramm) {
      if (pos !== undefined && pos.eventos[event] !== undefined)
        pos.eventos[event](paramm);
    },
    _triggerAxis: function(pos, paramm) {
      if (pos !== undefined)
        pos.c(paramm);
    },
    cancelButtonEvent: function(key, event) {
      var pos = this.eventKeys[key];
      if (pos !== undefined && pos.eventos[event] !== undefined)
        delete pos.eventos[event];
    },
    cancelAxisEvent: function(axis, mode) {
      var pos = this.eventKeys[key];
      if (pos !== undefined && pos.eventos[event] !== undefined)
        delete pos.eventos[event];
    },
    update: function(time) {
      this._updateButtons(time);
      this._updateAxis(time);
    },
    _updateButtons: function(time) {
      // -- Buttons     
      for (var k in this.eventKeys) {
        var table = this.eventKeys[k],
          source = this._isPressed(this.gamepad.buttons[k]).pressed;
        if (!source && table.pressed >= 0) {
          this._triggerButton(table, 'released', (table.pressed + time));
          table.pressed = -1;
        } else if (source && table.pressed < 0) {
          this._triggerButton(table, 'pressed');
          table.pressed = 0;
        } else if (source && table.pressed >= 0) {
          table.pressed += time;
          this._triggerButton(table, 'holded', table.pressed);
        }
      }
    },
    _updateAxis: function(time) {
      for (var k in this.eventAxis) {
        var eje = this.eventAxis[k];
        for (var i in eje.modes) {
          var modo = eje.modes[i];
          if (eje.axis.isActive(modo.s))
            this._triggerAxis(modo, {
              pos: eje.axis[i](),
              time: time
            });
        }
      }
    }
  };

  // Types of Gamepad behaviour: (VER si se puede hacer con typeof (menos efectivo igual))
  gpm.GamePadXboxController = function() {};

  gpm.GamePadXboxController.prototype = new gpm.GamePad();
  gpm.GamePadXboxController.prototype._isPressed = function(button) {
    return {
      pressed: button.pressed,
      value: button.value
    };
  };
  gpm.GamePadXboxController.prototype._getButtonValue = function(button) {
    return button.value;
  };


  gpm.GamePadXboxInput = function() {};

  gpm.GamePadXboxInput.prototype = new gpm.GamePad();
  gpm.GamePadXboxInput.prototype._isPressed = function(button) {
    return {
      pressed: button.pressed,
      value: button.value
    };
  };
  gpm.GamePadXboxInput.prototype._getButtonValue = function(button) {
    return button;
  };

  // ----------------------------------
  //        Axis!
  // ----------------------------------

  function AxisContruct(bind, name, gamepad) {
    var axis = bind.axis(name),
      type = axis.type,
      ret = null;
    switch (type) {
      case 'b':
        ret = new AxisButton();
        break;
      case 'bv':
        ret = new AxisButtonValue();
        break;
      case 'a':
        ret = new AxisReal();
        break;
      case 'as':
        ret = new AxisShared();
        break;
    }
    ret.construct(bind, name, gamepad);
    return ret;
  }

  // ---------- Base class
  function Axis() {}
  Axis.prototype._construct = function(bind, name, gp) {
    this.gp = gp;
    this.bind = bind;
    this.name = name;
  };

  // ---------- Axis Button
  var AxisButton = function() {};
  AxisButton.prototype = new Axis();

  AxisButton.prototype.construct = function(bind, name, gp) {
    this._construct(bind, name, gp);
    this.btns = {
      U: bind.axisMap[name].U,
      D: bind.axisMap[name].D,
      L: bind.axisMap[name].L,
      R: bind.axisMap[name].R
    };
  };
  AxisButton.prototype.isActive = function(sensitivity) {
    return (this.btns.U || this.btns.D || this.btns.L || this.btns.R);
  };
  AxisButton.prototype.normal = function() {
    var r = {
      v: 0,
      h: 0
    };
    if (this.btns.U) v = -1;
    else if (this.btns.D) v = 1;
    if (this.btns.R) v = 1;
    else if (this.btns.L) h = -1;
    return r;
  };
  AxisButton.prototype.discrete = function(precision) { // 4 * presicion.
    return this.btns;
  };
  AxisButton.prototype.polar = function() {
    var axis = this.normal(),
      r, ang;
    r = Math.sqrt(Math.pow(axis.v, 2) + Math.pow(axis.h, 2));
    ang = Math.arctan(axis.v / axis.h);
    return [r, ang];
  };
  // ---------- Axis Button Value
  var AxisButtonValue = function() {};
  AxisButtonValue.prototype = new Axis();

  AxisButtonValue.prototype.isActive = function(sensitivity) {
    return (Math.abs(axis.v) > sensitivity || Math.abs(axis.h) > sensitivity);
  };
  AxisButtonValue.prototype.discretize = function(precision) { // 4 * presicion.

  };

  // ---------- Axis Real

  var AxisReal = function() {};
  AxisReal.prototype = new Axis();

  AxisReal.prototype.construct = function(bind, name, gp) {
    this._construct(bind, name, gp);
    this.v = bind.axisMap[name].v;
    this.h = bind.axisMap[name].h;
  };
  AxisReal.prototype.isActive = function(sensitivity) {
    return (Math.abs(this.gp.gamepad.axes[this.v]) > sensitivity || Math.abs(this.gp.gamepad.axes[this.h]) > sensitivity);
  };
  AxisReal.prototype.normal = function() {
    return [this.gp.gamepad.axes[this.h], this.gp.gamepad.axes[this.v]];
  };
  AxisReal.prototype.discrete = function() {
    var r = {
      U: true,
      D: true,
      L: true,
      R: true
    };
    r.U = (this.gp.gamepad.axes[this.v] > 0);
    r.D = !r.U;
    r.R = (this.gp.gamepad.axes[this.h] > 0);
    r.L = !r.L;
    return r;
  };
  AxisReal.prototype.polar = function() {
    var r, ang,
      v = this.gp.gamepad.axes[this.v],
      h = this.gp.gamepad.axes[this.h];
    r = Math.sqrt(Math.pow(v, 2) + Math.pow(h, 2));
    ang = Math.atan(v / h);
    return [r, ang];
  };


  //-----------------------------------
  //        Management
  //-----------------------------------
  gpm.on = function(event, callback) {
    if (['newGamepad', 'outGamepad'].indexOf(event) >= 0) {
      gpm.events[event] = callback;
    }
  };

  gpm.trigger = function(event, paramm) {
    if (gpm.events[event] !== undefined) gpm.events[event](paramm);
  };

  gpm.onNextStart = function(callback) {
    gpm.nextStartCallback = callback;
  };

  gpm.triggerNextStart = function(gamepad) {
    if (gpm.nextStartCallback === null) return;
    if (gpm.nextStartCallback(gamepad))
      gpm.nextStartCallback = null;
  };
  //

  gpm.newGamepad = function(gamepad_id) {
    var _GamePad = null;
    gamepad_id = String(gamepad_id);
    switch (gamepad_id) {
      case 'xinput':
      case 'Xbox 360 Controller (XInput STANDARD GAMEPAD)':
        _GamePad = new gpm.GamePadXboxInput();
        _GamePad.bind(new gpm.Bind(_premade_binds.XboxInput));
        break;
      default:
        gpm.trigger('undefinedGamepad', gamepad_id);
        break;
    }
    return _GamePad;
  };

  gpm.addGamepad = function(gamepad) {
    var gp = new gpm.newGamepad(gamepad.id);
    gp.constructor(gamepad);
    gpm.gamepads[gamepad.index] = gp;
    gpm.gamepads_size++;
    // Start bind

    gpm.trigger('newGamepad', gp);
  };

  gpm.removeGamepad = function(id) {
    delete gpm.gamepads[id];
    gpm.gamepads_size--;
    gpm.trigger('outGamepad', id);
  };

  gpm.update = function(time) {
    var gamepad;
    for (var i in gpm.gamepads) {
      gamepad = gpm.gamepads[i];
      gamepad.update(time);
      if (gamepad.isStartPressed()) gpm.triggerNextStart(gamepad);
    }
  };

  gpm.getController = function(id) {
    return gpm.gamepads[id];
  };

  gpm.getControllers = function() {
    return gpm.gamepads;
  };

  gpm.refreshGamePads = function() {
    return navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads() : []);
  };

  gpm.scangamepads = function() {
    var nav_gamepads = gpm.refreshGamePads(),
      cant = [],
      i;

    for (var k in gpm.gamepads) cant[k] = true;

    for (i = 0; i < nav_gamepads.length; i++)
      if (nav_gamepads[i]) {
        cant.splice(nav_gamepads[i].index, 1);
        if (!gpm.getController(nav_gamepads[i].index))
          gpm.addGamepad(nav_gamepads[i]);
      }

    if (cant.length > 0)
      for (i = 0; i < cant.length; i++)
        gpm.removeGamepad(i);
  };

  //-----------------------------------
  //        Binds
  //-----------------------------------

  gpm.Bind = function(binds) {
    this.startKey = null;
    this.buttonsMap = {};
    this.axisMap = {};
    if (binds !== null) {
      this.buttonsMap = binds.buttons;
      this.axisMap = binds.axis;
      this.startKey = binds.startKey;
    }
  };

  gpm.Bind.prototype = {
    getId: function(keycode) {
      return this.buttonsMap[keycode];
    },
    axis: function(keycode) {
      return this.axisMap[keycode];
    }
  };

  // -------- Binds List:
  // Button notation: x >= 0    -> x is button number
  //          x < 0     -> it's not available
  //          x == null -> it's an axis
  var _premade_binds = {
    'XboxInput': {
      startKey: 9,
      buttons: {
        'A': 0,
        'B': 1,
        'X': 2,
        'Y': 3,
        'LB': 4,
        'RB': 5,
        'LT': 6,
        'RT': 7,
        'Back': 8,
        'Start': 9,
        'LS': 10,
        'RS': 11,
        'Up': 12,
        'Down': 13,
        'Left': 14,
        'Right': 15,
        'LA': null,
        'RA': null
      },
      axis: {
        movement: {
          type: 'a',
          h: 0,
          v: 1
        },
        camera: {
          type: 'a',
          h: 2,
          v: 3
        },
        Ltrigger: {
          type: 'bv',
          id: 6
        },
        Rtrigger: {
          type: 'bv',
          id: 7
        },
        arrows: {
          type: 'b',
          U: 12,
          D: 13,
          L: 14,
          R: 15
        }
      }
    }
  };

  //---------- Gamepads events

  window.addEventListener('gamepadconnected', function(event) {
    gpm.addGamepad(event.gamepad);
  });
  window.addEventListener('gamepaddisconnected', function(event) {
    gpm.removeGamepad(event.gamepad.index);
  });

  if (!hasEvents) setInterval(gpm.scangamepads, 500);

})(gamepadManager);

if (typeof(exports) !== 'undefined') {
  exports = gamepadManager;
}