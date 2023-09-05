///////////
// MOUSE //
///////////

/*
	Utilities for mouse tracking
	
	Keeps track of mouse position and the left mouse button. You can get the mouse position in window coordinates
	and whether the left button is not pressed, pressed, or was just pressed (being "just pressed" counts as being pressed)

	HOW TO USE
	
	1. mouse.x and mouse.y are the coordinates of the mouse position
	2. Mouse.is() returns whether the left mouse button was just pressed
	3. mouseHeld() returns whether the left mouse button is being held down. MouseHeld() is always true if MouseHit() is true
	4. Call mouseStateUpdater() at the end of each cycle	
*/

import { Vec2 } from "./Vec2.js"

// What the left mouse button can do
let STATE = {
	UP: 0, // Not pressed
	HIT: 1, // Just pressed, a single click
	HELD: 2, // Has been pressed for a while
	LETGO: 3, // Just released
}

// Whether to output debugging data to the console
let LOG_MOUSE = false;

// Horizontal and vertical position of the mouse pointer
export class Mouse {
	pos: Vec2 = new Vec2( 0, 0 );

	downmark: Vec2 = new Vec2( 0, 0 );
	off: Vec2 = new Vec2( 0, 0 );

	origin: Vec2 = new Vec2( 0, 0 );

	leftButtonState: number = STATE.UP;
	rightButtonState: number = STATE.UP;

	constructor() {
	
	}

	registerHandlers() {
		document.onmousemove = this.moveHandler.bind( this );
		document.onmousedown = this.downHandler.bind( this );
		document.onmouseup = this.upHandler.bind( this );
	}

	moveHandler( this: Mouse, e: any ) {
		this.pos.x = e.pageX - window.scrollX - this.origin.x;
		this.pos.y = e.pageY - window.scrollY - this.origin.y;

		this.off = this.pos.minus( this.downmark )

		if ( LOG_MOUSE ) console.log( "Mouse moved to " + this.pos.x + "," + this.pos.y );		
	}

	downHandler( this: Mouse, e: any ) {
		if ( e.button == 0 ) {
			if (LOG_MOUSE) console.log("Mouse button down");

			this.downmark.set( this.pos );

			this.leftButtonState = STATE.HIT;
		}
	}

	upHandler( this: Mouse, e: any ) {
		if ( e.button == 0 ) {
			if (LOG_MOUSE) console.log("Mouse button up");

			this.downmark.set( this.pos );

			this.leftButtonState = STATE.LETGO;
		}
	}

	// Change the left button state from "just pressed" to "pressed" if necessary
	update( canvas: HTMLCanvasElement ) {
		let rect = canvas.getBoundingClientRect();

		this.origin.setValues( rect.left, rect.top );

		if (this.leftButtonState == STATE.HIT) this.leftButtonState = STATE.HELD;
		if (this.leftButtonState == STATE.LETGO) this.leftButtonState = STATE.UP;
	}

	// Whether the left button was just pressed
	isHit(): boolean {
		return (this.leftButtonState == STATE.HIT);
	}

	// Whether the left button is pressed
	isHeld(): boolean {
		return (this.leftButtonState == STATE.HIT || this.leftButtonState == STATE.HELD);
	}

	// Whether the left button is pressed
	isLetGo(): boolean {
		return (this.leftButtonState == STATE.LETGO);
	}

	// Whether the left button is pressed
	isUp(): boolean {
		return (this.leftButtonState == STATE.UP || this.leftButtonState == STATE.LETGO);
	}

	reset() {
		this.leftButtonState = STATE.UP;
		this.rightButtonState = STATE.UP;
	}
}