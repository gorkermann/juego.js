import { AnimatedImage, Animation } from "./image.js"

let IMGKeys = new AnimatedImage( "../juego.js/img/keys.png", 15, 15, 0, 0 );
let IMGSpacebar = new AnimatedImage( "../juego.js/img/spacebar.png", 75, 15, 0, 0 );

let KEYANIM = {
	A: new Animation( "A", IMGKeys, [ 0, 1 ], 3 ),
	B: new Animation( "B", IMGKeys, [ 2, 3 ], 3 ),
	C: new Animation( "C", IMGKeys, [ 4, 5 ], 3 ),
	D: new Animation( "D", IMGKeys, [ 6, 7 ], 3 ),
	E: new Animation( "E", IMGKeys, [ 8, 9 ], 3 ),
	F: new Animation( "F", IMGKeys, [ 10, 11 ], 3 ),
	G: new Animation( "G", IMGKeys, [ 12, 13 ], 3 ),
	H: new Animation( "H", IMGKeys, [ 14, 15 ], 3 ),
	I: new Animation( "I", IMGKeys, [ 16, 17 ], 3 ),
	J: new Animation( "J", IMGKeys, [ 18, 19 ], 3 ),
	K: new Animation( "K", IMGKeys, [ 20, 21 ], 3 ),
	L: new Animation( "L", IMGKeys, [ 22, 23 ], 3 ),
	M: new Animation( "N", IMGKeys, [ 24, 25 ], 3 ),
	N: new Animation( "M", IMGKeys, [ 26, 27 ], 3 ),
	O: new Animation( "O", IMGKeys, [ 28, 29 ], 3 ),
	P: new Animation( "P", IMGKeys, [ 30, 31 ], 3 ),
	Q: new Animation( "Q", IMGKeys, [ 32, 33 ], 3 ),
	R: new Animation( "R", IMGKeys, [ 34, 35 ], 3 ),
	S: new Animation( "S", IMGKeys, [ 36, 37 ], 3 ),
	T: new Animation( "T", IMGKeys, [ 38, 39 ], 3 ),
	U: new Animation( "U", IMGKeys, [ 40, 41 ], 3 ),
	V: new Animation( "V", IMGKeys, [ 42, 43 ], 3 ),
	W: new Animation( "W", IMGKeys, [ 44, 45 ], 3 ),
	X: new Animation( "X", IMGKeys, [ 46, 47 ], 3 ),
	Y: new Animation( "Y", IMGKeys, [ 48, 49 ], 3 ),	
	Z: new Animation( "Z", IMGKeys, [ 50, 51 ], 3 ),
	SPACE: new Animation( "Space", IMGSpacebar, [ 0, 1 ], 3 ),
}