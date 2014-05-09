var rAF = window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.requestAnimationFrame;

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

    gamepadManager.update( time );
    //console.log(time);
};

// Start Code:
gamepadManager.on("newGamepad",function(gamepad){
	console.log("Nuevo gamepad: " + gamepad.gamepad.id);
	
	gamepad.onButton("pressed","A",function(time){
		console.log("APRETASTE");
	});

	gamepad.onButton("released","A",function(time){
		console.log("Soltaste la A. La mantuviste: " + time);
	});

	gamepad.onAxis("movement","polar",0.2,function(e){
		console.log(e);
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