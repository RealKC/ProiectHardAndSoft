#!/usr/bin/env node
var b = require('bonescript');

// Motor is attached here
var controller = ["P8_27", "P8_28", "P8_29", "P8_30"];
var states = [[1,1,0,0], [0,1,1,0], [0,0,1,1], [1,0,0,1]];
var curState = 0;

var ms = 3,       // Time between steps, in ms
    max = 2000,       // Number of steps to turn before turning around
    min = 0;        // Minimum step to turn back around on

var CW  =  1,       // Clockwise
    CCW = -1,
    pos = 0,        // current position and direction
    direction = CW;

// Initialize motor control pins to be OUTPUTs
var i;
for(i=0; i<controller.length; i++) {
    b.pinMode(controller[i], b.OUTPUT);
}

// Put the motor into a known state
updateState(states[0]);
rotate(direction);

var timer = setInterval(move, ms);

// Rotate back and forth once
function move() {
    pos += direction;
    // console.log("pos: " + pos);
    // Switch directions if at end.
    if (pos >= max || pos <= min) {
        direction *= -1;
    }

    rotate(direction);
}

// This is the general rotate
function rotate(direction) {
	// console.log("rotate(%d)", direction);
    // Rotate the state acording to the direction of rotation
	curState +=  direction;
	if(curState >= states.length) {
	    curState = 0;
	} else if(curState<0) {
		    curState = states.length-1;
	}
	updateState(states[curState]);
}

// Write the current input state to the controller
function updateState(state) {
    // console.log("state: " + state);
	for (i=0; i<controller.length; i++) {
		b.digitalWrite(controller[i], state[i]);
	}
}

function main() {
  while (true) {
    move();
  }
}

// main()

process.on('exit', function() {
    updateState([0,0,0,0]);    // Turn motor off
});

