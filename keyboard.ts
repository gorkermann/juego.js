import { Debug } from "./Debug.js"

export enum KeyCode {
	ENTER = 13,
	SHIFT = 16,
	CTRL = 17,
	ALT = 18,
	ESC = 27,
	SPACE = 32,
	LEFT = 37,
	UP = 38,
	RIGHT = 39,
	DOWN = 40,
	DIGIT_0 = 48,
	DIGIT_1 = 49,
	DIGIT_2 = 50,
	DIGIT_3 = 51,
	DIGIT_4 = 52,
	DIGIT_5 = 53,
	DIGIT_6 = 54,
	DIGIT_7 = 55,
	DIGIT_8 = 56,
	DIGIT_9 = 57,
	A = 65,
	B = 66,
	C = 67,
	D = 68,
	E = 69,
	F = 70,
	G = 71,
	H = 72,
	I = 73,
	J = 74,
	K = 75,
	L = 76,
	M = 77,
	N = 78,
	O = 79,
	P = 80,
	Q = 81,
	R = 82,
	S = 83,
	T = 84,
	U = 85,
	V = 86,
	W = 87,
	X = 88,
	Y = 89,
	Z = 90,
	BSLASH = 220,
}

export let Key: Array<string> = [];
for ( let keyName in KeyCode ) {
	let index = parseInt( KeyCode[keyName] );

	Key[index] = keyName;
}

enum KeyState {
	UP,
	HIT,
	HELD,
	LETGO,
	DOUBLETAPPED,
}

let hitCounter: Array<KeyState> = [];
let state: Array<KeyState> = [];

let keyLastHit: Array<KeyState> = [];
let updateCounter = 0;
let doubleTapInterval = 5;

export class Keyboard {
	constructor() {

	}

	static getHits( key: KeyCode ): number { 
		return hitCounter[key];
	}

	static downHandler( e: any ) {
		if ( Debug.LOG_KEYBOARD ) console.log( "Key " + e.keyCode + " down" );
		
		if ( Keyboard.keyUp ( e.keyCode ) ) {
			state[e.keyCode] = KeyState.HIT;

			if ( !( e.keyCode in hitCounter ) ) {
				hitCounter[e.keyCode] = 0;	
			}
			hitCounter[e.keyCode] += 1;
		}
	}

	static upHandler( e: any ) {
		if ( Debug.LOG_KEYBOARD ) console.log( "Key " + e.keyCode + " up" );

		state[e.keyCode] = KeyState.LETGO;
		/*if ( updateCounter - keyLastHit[e.keyCode] < doubleTapInterval )  {
			state[e.keyCode] = KeyState.DOUBLETAPPED;
		}*/

		keyLastHit[e.keyCode] = updateCounter;
	}

	static keyDoubleTapped( key: KeyCode ) {
		return ( state[key] == KeyState.DOUBLETAPPED );
	}

	static keyHit( key: KeyCode ) {
		return ( state[key] == KeyState.HIT );
	}

	static keyHeld( key: KeyCode ) {
		return ( state[key] == KeyState.HIT || state[key] == KeyState.HELD );
	}

	static keyLetGo( key: KeyCode ) {
		return ( state[key] == KeyState.LETGO );
	}

	static keyUp( key: KeyCode ) {
		return ( state[key] == KeyState.LETGO || state[key] == KeyState.UP );
	}

	static anyKeyHit() {
		for ( let key in KeyCode ) {
			let code: number = Number(KeyCode[key]);

			if ( state[code] == KeyState.HIT || state[code] == KeyState.HELD ) {
				return true;
			}
		}
		
		return false;
	}

	static updateState() {
		for ( let key in KeyCode ) {
			let code: number = Number(KeyCode[key]);

			if ( state[code] == KeyState.HIT ) {
				state[code] = KeyState.HELD;
			}
			if ( state[code] == KeyState.LETGO || state[code] == KeyState.DOUBLETAPPED ) {
				state[code] = KeyState.UP;
			}

			hitCounter[code] = 0;
		}

		updateCounter++;
	}

	static resetKeys() {
		for ( let key in KeyCode ) {
			let code: number = Number(KeyCode[key]);

			state[code] = KeyState.UP;
			keyLastHit[code] = -Infinity;

			hitCounter[code] = 0;
		}
	}

}

Keyboard.resetKeys();