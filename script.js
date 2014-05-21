var rAF = window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.requestAnimationFrame;

// Programador en el aire:
var Canvas = {
	el: document.getElementById("canvas"),
	context: null,
	draws: null,
	draws_ctx: null,
	changes: false,
	init: function(w,h){
		if ( !h )
			this.el.width = this.el.height = 500;
		else {
			this.el.width = w;
			this.el.height = h;
		}
		this.context = this.el.getContext('2d');
		
		this.draws = document.createElement('canvas');
		this.draws.width = this.el.width; this.draws.height = this.el.height;
		this.draws_ctx = this.draws.getContext('2d');
	},
	reset: function(canv){
		this.el.width = this.el.width;
	},
	getDrawCtx: function(){
		return this.draws_ctx;
	},
	changed: function(){
		this.changes = true;
	},
	render: function(){
		if ( !this.changes ) return;
		this.reset();
		this.changes = false;
		this.context.drawImage(this.draws,0,0,this.el.width,this.el.height);
		this.draws.width = this.draws.width;
	}
};

function Player(){};
Player.prototype = {
	gp: null,
	pressed: false,
	coords:{x:0,y:0},
	target:null,
	color: null,
	nuevo: function(coords,joystick,color){
		this.coords = coords;
		this.gp = joystick;
		this.pressed = false;
		this.target = {h:0,v:0};
		this.color = color;
	},
	refresh: function(){
		var ctx = Canvas.draws_ctx;

		ctx.beginPath();
    	ctx.moveTo(this.coords.x,this.coords.y);
    	ctx.lineTo(this.coords.x + this.target.h,this.coords.y + this.target.v);
    	ctx.stroke();
    	if ( this.pressed ) {
    		ctx.beginPath();
			ctx.arc(this.coords.x, this.coords.y, 5, 0, 2 * Math.PI, true);
		    ctx.fillStyle = this.color;
		    ctx.fill();
    	}

    	Canvas.changed();
	},
	setTarget: function(h,v){
		this.target.h = h*50;
		this.target.v = v*50;

		//console.log(Math.round(h*100),Math.round(v*100));
	}
};
var colores = ['blue','red','green','cyan','magenta'];
var players = new Array();

Canvas.init(600,200);

function gameloop() {
	gamepadManager.refreshGamePads();

	//var timecheck = new Date().getTime();
    // Recursion
    rAF(gameloop);

	// Time Logic
    lastLoop = nuevoLoop;
    nuevoLoop = new Date().getTime();
    time = nuevoLoop - lastLoop;
    // Game Loop:

    Canvas.render();

    gamepadManager.update( time );
};

// Start Code:
gamepadManager.on("newGamepad",function(gamepad){
	console.log("Nuevo gamepad: " + gamepad.gamepad.id);

	var plyr = new Player();
	plyr.nuevo( { x: 100 * (players.length+1) , y:100 } , gamepad , colores[players.length]);
	players.push(new Player());
	
	gamepad.onButton("pressed","A",function(time){
		plyr.pressed = true;
		plyr.refresh();
	});

	gamepad.onButton("released","A",function(time){
		plyr.pressed = false;
		plyr.refresh();
	});

	gamepad.onAxis("movement","normal",0.2,function(e){
		plyr.setTarget(e[0],e[1]);
		plyr.refresh();
	});

	console.log(gamepad);
});

gamepadManager.on("outGamepad",function(gamepadid){
	console.log("Se desconectó el Gamepad: " + gamepadid);
});

gamepadManager.onNextStart(function(gamepad){
	console.log("When 'start' is pressed, this is triggered. If returns TRUE, it removes itself. Gamepad:"+gamepad.id);
	return true;
});

var lastLoop = new Date().getTime(),
	nuevoLoop = lastLoop,
	time = 0;

rAF(gameloop);