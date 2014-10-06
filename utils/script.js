var rAF = window.mozRequestAnimationFrame || window.requestAnimationFrame;

// Programador en el aire:
var Canvas = {
	el: document.getElementById('canvas'),
	context: null,
	draws: null,
	draws_ctx: null,
	changes: null,
	init: function(w, h) {
		if (!h)
			this.el.width = this.el.height = 500;
		else {
			this.el.width = w;
			this.el.height = h;
		}
		this.context = this.el.getContext('2d');

		this.changes = [];

		this.draws = document.createElement('canvas');
		this.draws.width = this.el.width;
		this.draws.height = this.el.height;
		this.draws_ctx = this.draws.getContext('2d');
	},
	reset: function(canv) {
		this.el.width = this.el.width;
	},
	getDrawCtx: function() {
		return this.draws_ctx;
	},
	change: function(player) {
		this.changes[player.id] = player;
	},
	render: function() {
		if (this.changes.length === 0) return;
		for (var i in this.changes) {
			this.changes[i].render();
		}
		this.changes = [];

		this.reset();
		this.context.drawImage(this.draws, 0, 0, this.el.width, this.el.height);
		this.draws.width = this.draws.width;
	}
};

function Player() {}

Player.prototype = {
	id: null,
	gp: null,
	pressed: false,
	coords: {
		x: 0,
		y: 0
	},
	target: null,
	color: null,
	nuevo: function(id, coords, joystick, color) {
		this.id = id;
		this.coords = coords;
		this.gp = joystick;
		this.pressed = false;
		this.target = {
			h: 0,
			v: 0
		};
		this.color = color;
		this.changes = false;
	},
	render: function() {
		var ctx = Canvas.draws_ctx;

		ctx.beginPath();
		ctx.moveTo(this.coords.x, this.coords.y);
		ctx.lineTo(this.coords.x + this.target.h, this.coords.y + this.target.v);
		ctx.stroke();

		ctx.beginPath();
		ctx.arc(this.coords.x, this.coords.y, 5, 0, 2 * Math.PI, true);
		ctx.fillStyle = this.color;
		ctx.fill();

		if (this.pressed) {
			ctx.lineWidth = 3;
			ctx.strokeStyle = 'black';
			ctx.stroke();
		}
	},
	setTarget: function(h, v) {
		this.target.h = h * 50;
		this.target.v = v * 50;
	},
	moveCoords: function(time, x, y) {
		time = time / 2;
		this.coords.x += x * time;
		this.coords.y += y * time;
		if (this.coords.x > Canvas.el.width) this.coords.x = Canvas.el.width;
		else if (this.coords.x < 0) this.coords.x = 0;

		if (this.coords.y > Canvas.el.height) this.coords.y = Canvas.el.height;
		else if (this.coords.y < 0) this.coords.y = 0;
	}
};
var colores = ['blue', 'red', 'green', 'cyan', 'magenta'];
var players = [];

Canvas.init(600, 200);

function gameloop() {
	gamepadManager.scangamepads();

	//var timecheck = new Date().getTime();
	// Recursion
	rAF(gameloop);

	// Time Logic
	lastLoop = nuevoLoop;
	nuevoLoop = new Date().getTime();
	time = nuevoLoop - lastLoop;
	// Game Loop:

	Canvas.render();

	gamepadManager.update(time);
}

// Start Code:
gamepadManager.on('newGamepad', function(gamepad) {
	console.log('Nuevo gamepad: ' + gamepad.gamepad.id);

	var plyr = new Player();
	plyr.nuevo(players.length, {
		x: (100 * (players.length + 1)) % Canvas.el.width,
		y: 100
	}, gamepad, colores[players.length]);
	players.push(plyr);

	gamepad.onButton('pressed', 'A', function(time) {
		plyr.pressed = true;
		Canvas.change(plyr);
	});

	gamepad.onButton('released', 'A', function(time) {
		plyr.pressed = false;
		Canvas.change(plyr);
	});

	gamepad.onAxis('camera', 'normal', 0.2, function(e) {
		plyr.setTarget(e.pos[0], e.pos[1]);
		Canvas.change(plyr);
	});

	gamepad.onAxis('movement', 'normal', 0.1, function(e) {
		plyr.moveCoords(e.time, e.pos[0], e.pos[1]);
		Canvas.change(plyr);
	});

	//console.log(gamepad);
});

gamepadManager.on('undefinedGamepad', function(name) {
	alert('The gamepad ' + name + ' is not supported by this library');
});

gamepadManager.on('outGamepad', function(gamepadid) {
	console.log('Se desconectó el Gamepad: ' + gamepadid);
});

gamepadManager.onNextStart(function(gamepad) {
	console.log('When \' start \' is pressed, this is triggered. If returns TRUE, it removes itself. Gamepad:' + gamepad.id);
	return true;
});

var lastLoop = new Date().getTime(),
	nuevoLoop = lastLoop,
	time = 0;

rAF(gameloop);