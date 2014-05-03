var gamepadManager = {};

/*
** 	Gamepad Manager
** 	Author: Juampi92
** 	
**	Use: ...
*/

function _isNumeric(n){ return !isNaN(parseFloat(n)) && isFinite(n); }

(function(gpm){
	var hasEvents = 'GamepadEvent' in window;

	gpm.gamepads = {};
	gpm.gamepads_size = 0;
	gpm.events = {};

	gpm.nextStartCallback = null;

	//-----------------------------------
	//				Gamepad
	//-----------------------------------
	gpm.GamePad = function(){};

	gpm.GamePad.prototype = {
		constructor: function(gp){
			this.id = gp.index;
			this.gamepad = gp;

			this.eventKeys = {};
			this.keys = {};

			this.eventAxis = {};
			this.axis = {};
		},
		bind: function(bind){
			this.bind = bind;
		},
		isStartPressed: function(){
			if ( !this.bind) return false;
			return this._isPressed(this.gamepad.buttons[this.bind.startKey]).pressed;
		},
		isPressed: function(key){
			if ( !_isNumeric(key) ) key = this.bind.getId(key);
			
			return this._isPressed(this.gamepad.buttons[key]).pressed;
		},
		_isPressed: function(button){ return false; },
		on: function( event , key , callback ){
			if ( !_isNumeric(key) ) key = this.bind.getId(key);
			if ( !event in ["pressed","released","holded"] ) throw "invalid Event: "+event;
			
			if ( this.eventKeys[key] == undefined) this.eventKeys[key] = {pressed:-1,eventos:{}};
			this.eventKeys[key].eventos[event] = callback;
		},
		trigger: function(key,event,paramm){
			var pos = this.eventKeys[key];
			this._trigger(pos,event,paramm);
		},
		_trigger: function(pos,event,paramm){
			if ( pos != undefined && pos.eventos[event] != undefined ) 
				pos.eventos[event](paramm);
		},
		cancelEvent: function(key,event){
			var pos = this.eventKeys[key];
			if ( pos != undefined && pos.eventos[event] != undefined ) 
				delete pos.eventos[event];
		},
		update: function(time){
			// -- Buttons			
			for ( var k in this.eventKeys ) {
				var table = this.eventKeys[k],
					source = this._isPressed(this.gamepad.buttons[k]).pressed;
				if ( !source && table.pressed >= 0 ) {
					this._trigger(table,"released",( table.pressed + time ));
					table.pressed = -1;
				} else if ( source && table.pressed < 0 ) {
					this._trigger(table,"pressed");
					table.pressed = 0;
				} else if ( source && table.pressed >= 0 ){
					table.pressed += time;
					this._trigger(table,"holded",table.pressed);
				}
			}
		}
			// -- Axis
	};

	// 
	gpm.GamePadXboxController = function(){};

	gpm.GamePadXboxController.prototype = new gpm.GamePad();
	gpm.GamePadXboxController.prototype._isPressed = function(button){
		return {pressed:button.pressed,value:button.value};
	};

	gpm.GamePadXboxInput = function(){};

	gpm.GamePadXboxInput.prototype = new gpm.GamePad();
	gpm.GamePadXboxInput.prototype._isPressed = function(button){
		return {pressed:(button == 1.0),value:button};
	};

	//-----------------------------------
	//				Management
	//-----------------------------------
	gpm.on = function(event, callback){
		if ( ['newGamepad','outGamepad'].indexOf(event) >= 0 ) {
			gpm.events[event] = callback;
		};
	};

	gpm.trigger = function(event,paramm){
		if ( gpm.events[event] != undefined ) gpm.events[event](paramm);
	};

	gpm.onNextStart = function(callback){
		gpm.nextStartCallback = callback;
	};

	gpm.triggerNextStart = function(gamepad){
		if ( gpm.nextStartCallback == null ) return;
		if ( gpm.nextStartCallback(gamepad) )
			gpm.nextStartCallback = null;
	};
	//

	gpm.newGamepad = function(gamepad_id){
		var _GamePad = null;
		if ( gamepad_id.indexOf("XBOX 360 For Windows (Controller)") >= 0 ){
			_GamePad = new gpm.GamePadXboxController();
			_GamePad.bind(new gpm.Bind(_premade_binds["XboxController"]));
		}
		else if ( gamepad_id.indexOf("Xbox 360 Controller (XInput STANDARD GAMEPAD)") >= 0 ) {
			_GamePad = new gpm.GamePadXboxInput();
			_GamePad.bind(new gpm.Bind(_premade_binds["XboxInput"]));
		}

		return _GamePad;
	};

	gpm.addGamepad = function( gamepad ){
		var gp = new gpm.newGamepad(gamepad.id);
		gp.constructor(gamepad);
		gpm.gamepads[gamepad.index] = gp;
		gpm.gamepads_size++;
		// Start bind

		gpm.trigger("newGamepad",gp);
	};

	gpm.removeGamepad = function( id ){
		delete gpm.gamepads[id];
		gpm.gamepads_size--;
		gpm.trigger("outGamepad",id);
	};

	gpm.update = function(time){
		var gamepad;
		for ( var i in gpm.gamepads){
			gamepad = gpm.gamepads[i];
			gamepad.update(time);
			if ( gamepad.isStartPressed() ) gpm.triggerNextStart(gamepad);
		};
	};

	gpm.getController = function(id){
		return gpm.gamepads[id];
	};

	gpm.refreshGamePads = function(){
		return navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads() : []);
	};

	gpm.scangamepads = function() {
		var nav_gamepads = gpm.refreshGamePads(),
			cant = [];

		for ( var k in gpm.gamepads) cant[k] = true;

		for (var i = 0; i < nav_gamepads.length; i++)
			if (nav_gamepads[i]) {
				cant.splice(nav_gamepads[i].index,1);
				if ( ! gpm.getController(nav_gamepads[i].index) )
					gpm.addGamepad(nav_gamepads[i]);
			}

		if ( cant.length > 0 )
			for (var i = 0; i < cant.length; i++)
				gpm.removeGamepad(i);
	}

	//-----------------------------------
	//				Binds
	//-----------------------------------

	gpm.Bind = function(binds){
		this.startKey = null;
		this.buttonsMap = {};
		this.axisMap = {};
		if ( binds != null ) {
			this.buttonsMap = binds.buttons;
			this.axisMap = binds.axis;
			this.startKey = binds.startKey;
		}
	};

	gpm.Bind.prototype = {
		getId: function(keycode){
			return this.buttonsMap[keycode];
		},
		axis: function(keycode){
			return this.axisMap[keycode];
		}
	};

	// -------- Binds List:
	// Button notation:	x >= 0 		-> x is button number
	// 					x < 0 		-> it's not available
	//					x == null	-> it's an axis
	var _premade_binds = {
		"XboxController": {
			startKey: 7,
			buttons: {
				"A":0,
				"B":1,
				"X":2,
				"Y":3,
				"LB":4,
				"RB":5,
				"Back":6,
				"Start":7,
				"LS":8,
				"RS":9,
				"LT":null,
				"RT":null,
				"Up":null,
				"Down":null,
				"Left":null,
				"Right":null,
				"LA":null,
				"RA":null
			},
			axis: {
				analogs: {
					left:{type:'a',h:0,v:1},
					right:{type:'a',h:2,v:3},
				},
				triggers: {
					left:{type:'as',id:2},
					right:{type:'as',id:2}
				},
				Dpad: { type:'a',h:5,v:6}
			}
		},
		"XboxInput":{
			startKey: 9,
			buttons: {
				"A":0,
				"B":1,
				"X":2,
				"Y":3,
				"LB":4,
				"RB":5,
				"LT":6,
				"RT":7,
				"Back":8,
				"Start":9,
				"LS":10,
				"RS":11,
				"Up":12,
				"Down":13,
				"Left":14,
				"Right":15,
				"LA":null,
				"RA":null
			},
			axis: {
				analogs: {
					left:{type:'a',h:0,v:1},
					right:{type:'a',h:2,v:3},
				},
				triggers: {
					left:{type:'b',id:6},
					right:{type:'b',id:7}
				},
				Dpad: {
					type:'b',
					U:12,D:13,L:14,R:15
				}
			}
		}
	};

	//---------- Gamepads events

	window.addEventListener("gamepadconnected", function(event){ gpm.addGamepad(event.gamepad); });
	window.addEventListener("gamepaddisconnected", function(event){	gpm.removeGamepad(event.gamepad.index); });
	
	// ESTO HACE ALGO RARO!!!!
	if (! hasEvents ) setInterval( gpm.scangamepads , 500);

})(gamepadManager);