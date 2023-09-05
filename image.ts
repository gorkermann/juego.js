//////////////
// IMAGE.JS //
//////////////

/*
	A set of Javascript image utility classes

		RegularImage - A simple, static image
		AnimatedImage - An image divided into multiple frames
		Animation - A list of frames ( an animation )
		AnimationRunner - An animation controller class
		
		Animation contains an AnimatedImage
		AnimationRunner contains one or two Animations
				
		HOW TO USE:
		
		1. Load each image you want to use as an AnimatedImage
		2. Make a FrameSeqence for each animation you want
		3. Give an AnimationRunner member to each class that will use an animation. Call update() for each instance each cycle.
		
		To draw the sprite, call the draw() method of the AnimationRunner
			
		EXAMPLE:
			
			let IMGbird = new AnimatedImage('bird.png', 16, 16, 2, 2); <--------------------------------- AnimatedImage
			
			let ANIMs = {
				birdSTAND : new Animation('Bird Stand', IMGbird, [0], 1), <-------------------------- Animation
				birdFLY : new Animation('Bird Fly', IMGbird, [4, 5, 4, 6, 7], 1),
				birdDEADFALL : new Animation('Bird Deadfall', IMGbird, [8, 9], 1),
				birdDEAD : new Animation('Bird Dead', IMGbird, [10], 1),
			};		
			
			let Bird( posX, posY ) {
				this.posX = posX;
				this.posY = posY;
				
				this.mainRunner = new AnimationRunner( this.posX, this.posY, false, false ); <------ AnimationRunner
				this.mainRunner.setLoopingAnim( ANIMS.birdFLY ); // This animation will repeat indefinitely
				this.mainRunner.setLimitedAnim( ANIMS.birdSTAND, 4 ); // This animation will repeat 4 times and cease, overriding the looping animation
 				
				this.update() {
					this.mainRunner.update( this.posX, this.posY ); // We only want to update the position of the sprite 
				}
				
				this.draw() {
					this.mainRunner.draw();
				}
			}
*/

import { TileArray } from "./TileArray.js"

let allimages = [];

//////////////////
// REGULARIMAGE //
//////////////////

export class RegularImage {

	image: HTMLImageElement;

	constructor( filename: string ) {
		this.image = new Image();
		this.image.src = filename; // The image only loads if src is set

		allimages.push( this.image );	
	}

	draw( context: CanvasRenderingContext2D, posX: number, posY: number, scale: number ): void {
		context.drawImage( this.image, posX, posY, this.image.width * scale, this.image.height * scale );
	}
}

///////////////////
// ANIMATEDIMAGE //
///////////////////

export class AnimatedImage { 

	frameArray: TileArray = null;

	image: HTMLImageElement;
	filename: string;
	ready: boolean = false;

	// Quantities measured in TILES
	hFrames: number = 0;
	vFrames: number = 0;
	numFrames: number = 0;

	// Quantities measured in PIXELS
	frameWidth: number = 0;
	frameHeight: number = 0;
	hGap: number = 0;
	vGap: number = 0;

	constructor( filename: string,
				 frameWidth: number, frameHeight: number,
				 hGap: number, vGap: number ) {

		this.filename = filename;

		this.image = new Image(); // Image is a built-in Javascript class
		this.image.src = filename; // The image only loads if src is set

		allimages.push( this.image );

		this.frameWidth = frameWidth; // The width of each frame
		this.frameHeight = frameHeight; // The height of each frame
		
		this.hGap = hGap; // Horizontal gap between frames
		this.vGap = vGap; // Vertical gap between frames
		
		console.log( "[AnimatedImage] Loading animated image " + this.filename );
	}

	// Calculate a bunch of constant-value terms that can only be derived once the image is loaded and its width and height are known
	deriveConstants() {
		this.hFrames = Math.floor( this.image.width / ( this.frameWidth + this.hGap ) ); // Number of frames in the horizontal direction
		this.vFrames = Math.floor( this.image.height / ( this.frameHeight + this.vGap ) ); // Number of frames in the vertical direction
		this.numFrames = this.hFrames * this.vFrames; // Total number of frames
		
		let frames: Array<number> = [];
		
		for ( let r = 0; r < this.vFrames; r++ ) {
			for ( let c = 0; c < this.hFrames; c++ ) {
				frames.push( r * this.hFrames + c );
			}
		}

		// List of frames - this is just an array where every element is its index, i.e. [0, 1, 2, 3, 4, ... ]
		this.frameArray = new TileArray	( this.hFrames, frames );	
		
		this.ready = true;

		// console.log( "Loaded image " + this.image.src + ", " + this.hFrames + " x " + this.vFrames + " tiles" ); 
	}

	draw( context: CanvasRenderingContext2D, 
		  posX: number, posY: number,
		  frame: number,
		  scale: number,
		  hFlip: boolean, vFlip: boolean ) {

		if ( !this.ready && this.image.complete ) this.deriveConstants(); // Assumes all loading takes place before drawing is attempted

		if ( frame >= this.numFrames ) return;
		
		// Which column and row of the sprite sheet
		let hFrame = frame % this.hFrames;
		let vFrame = Math.floor( ( frame % this.numFrames ) / this.hFrames );
		
		context.save();
		
		// Flip the image, if necessary, by flipping it across the axis and translating it back into place
		if ( hFlip ) {
			context.scale( -1, 1 );
			context.translate( -this.frameWidth * scale, 0 );	
		}
		if ( vFlip ) {
			context.scale( 1, -1 );			
			context.translate( 0, -this.frameHeight * scale );
		}
		
		// Draw the frame by drawing a rectangular sub-image of the sprite sheet
		context.drawImage( 	this.image, 
						    hFrame * ( this.frameWidth + this.hGap ), vFrame * ( this.frameHeight + this.vGap ), // Top left corner of the frame in the larger image
							this.frameWidth, this.frameHeight, // Width and height of the frame
							posX * ( hFlip ? -1 : 1 ), posY * ( vFlip ? -1 : 1 ), // Screen position to draw the frame
							this.frameWidth * scale, this.frameHeight * scale ); // Screen size of frame
							
		context.restore();
	}
}

///////////////
// ANIMATION //
/////////////// 

export class Animation {

	name: string = "";
	image: AnimatedImage;

	frameIndices: Array<number> = [];
	numFrames: number = 0;
	timePerFrame: number = 0;

	constructor( name: string, 
				 image: AnimatedImage,
				 whichFrames: Array<number>,
				 timePerFrame: number ) {

		this.name = name; // Name of the animation
		this.image = image; // Pointer to the image
		this.frameIndices = whichFrames; // Array of frames to cycle through
		this.numFrames = this.frameIndices.length; // How many frames
		this.timePerFrame = timePerFrame; // How many cycles to spend on each frame
	}

	// Return a frame based on an external counter
	getFrameIndex( frameCounter: number ): number {
		return this.frameIndices[Math.floor( frameCounter / this.timePerFrame ) % this.numFrames];
	}
		
	// Return whether or not each frame has been displayed
	hasCompleted( frameCounter: number ): boolean {
		return ( Math.floor( frameCounter / this.timePerFrame ) >= this.numFrames );
	}
}

/////////////////////
// ANIMATIONRUNNER //
///////////////////// 

export class AnimationRunner {

	hPos: number = 0; // Horizontal pixel position
	vPos: number = 0; // Vertical pixel position
	scale: number = 1.0; // How much to scale image dimensions
	hFlip: boolean = false; // Whether to mirror the image left-to-right
	vFlip: boolean = false; // Whether to mirror the image top-to-bottom 
	isVisible: boolean = true; // Whether to draw the image
	angle: number = 0.0; // Rotation angle, in radians
	
	frame: number = 0; // Current frame
	loopingAnim: Animation = null; // Animation to repeat over and over
	limitedAnim: Animation = null; // Animation to repeat a set number of times
	repetitions: number = 0; // Number of times to repeat limitedAnim
	
	newAnim: boolean = false; // Whether a new animation has been set

	frameWidth: number = 0; // Width of the animation frame
	frameHeight: number = 0; // Height of the animation frame

	constructor( hPos: number, vPos: number, hFlip: boolean, vFlip: boolean ) {
		this.hPos = hPos;
		this.vPos = vPos;
		this.hFlip = hFlip;
		this.vFlip = vFlip;
	}

	setVisible( val: boolean ): void {
		this.isVisible = val;
	}
		
	setLoopingAnim( anim: Animation ): void {
		this.loopingAnim = anim;
		this.frame = 0;
		this.newAnim = true;
		this.frameWidth = anim.image.frameWidth;
		this.frameHeight = anim.image.frameHeight;
	}
		
	setLimitedAnim( anim: Animation, repetitions: number ): void {
		this.limitedAnim = anim;
		this.repetitions = repetitions;
		this.frame = 0;
		this.newAnim = true;
		this.frameWidth = anim.image.frameWidth;
		this.frameHeight = anim.image.frameHeight;	
	}
		
	hasCompleted(): boolean {
		return ( this.repetitions <= 0 );
	}
		
	/* Update the image and frame counter:
		Where to draw it
		Whether it is scaled or flipped

		These values don't need to be updated each time, they will stay the same if the argument is not given
	*/
	update( hPos: number, vPos: number, hFlip: boolean, vFlip: boolean ): void {
		this.hPos = hPos;
		this.vPos = vPos;		
		this.hFlip = hFlip;
		this.vFlip = vFlip;
		
		// If we're on a new animation, we haven't seen the first frame yet, so don't update the frame counter
		if ( !this.newAnim ) this.advanceFrames( 1 );
		this.newAnim = false;
	}

	advanceFrames( byCount: number ) {
		for ( let i = 0; i < byCount; i++ ) {
			this.frame += 1;

			// Limited-repetition animation
			if ( this.repetitions > 0 ) {
				if ( this.limitedAnim === null ) {
					// console.log( 'Limited-repetition animation is null but repetitions > 0, defaulting to looping anim' );
					this.frame = 0;
					this.repetitions = 0;
				} else {
					if ( this.limitedAnim.hasCompleted( this.frame ) ) {
						this.frame = 0;
						this.repetitions--;
					}
				}
				
			// Looping animation
			} else {
				if ( this.loopingAnim === null ) {
					// console.log( 'Looping animation is null' );
				} else {
				
				}
			}
		}
	}

	// Set sprite rotation, in radians
	setRotation( angle: number ) {
		this.angle = angle;
	}

	setScale( scale: number ) {
		this.scale = scale;
	}

	// Draw the sprite
	draw( context: CanvasRenderingContext2D ) {
		context.save();
			context.translate( this.hPos + this.frameWidth / 2, this.vPos + this.frameWidth / 2);
			context.rotate( this.angle );
			context.translate( -this.frameWidth / 2, -this.frameHeight / 2 );

			if ( this.isVisible ) {
				if ( this.repetitions > 0 ) {
					// Draw the limited-repetition animation
					
					if ( this.limitedAnim === null ) {
						// console.log( 'Limited animation is null but repetitions > 0, cannot draw' );
					} else {
						if ( this.limitedAnim.image === null ) {
						// // console.log( 'Image is null for image ' + this.limitedAnim.name );
						} else this.limitedAnim.image.draw( context, 0, 0, this.limitedAnim.getFrameIndex( this.frame ), this.scale, this.hFlip, this.vFlip );
					}
					
				} else {
					// Draw the looping animation
					if ( this.loopingAnim === null ) {
					
					} else {
						if ( this.loopingAnim.image === null ) {
							// console.log( 'Image is null for image ' + this.loopingAnim.name );
						} else this.loopingAnim.image.draw( context, 0, 0, this.loopingAnim.getFrameIndex( this.frame ), this.scale, this.hFlip, this.vFlip );
					}
				}
			}
		context.restore();
	}
}