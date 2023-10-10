import { Vec2 } from './Vec2.js'

export class Camera {
	scale: number = 1.0;

	angle: number = 0.0;

	mirrorX: boolean = false;
	mirrorY: boolean = false;

	// WORLD COORDINATES
	pos: Vec2 = new Vec2();	// position of camera in world space	

	speed: number; // speed of camera when translating

	// SCREEN COORDINATES
	// scale of screen dimensions relative to world dimensions
	// if scale is 2, things appear 2x larger on the screen 

	viewportW: number;
	viewportH: number;

	constructor( w: number=400, h: number=400 ) {
		this.setViewport( w, h );
	}

	// starting from a fresh context, move the camera 
	moveContext( context: CanvasRenderingContext2D ) {
		context.save();
		context.translate( this.viewportW / 2, this.viewportH / 2 );
		context.scale( this.scale, this.scale );
		context.save();
		context.translate( -this.pos.x, -this.pos.y );	

		if ( this.mirrorX ) {
			context.translate( this.viewportW / this.scale, 0 ); // ??
			context.scale( -1, 1 );
		}

		if ( this.mirrorY ) {
			context.translate( this.viewportW / this.scale, 0 ); // ??
			context.scale( 1, -1 );
		}
	}

	unMoveContext( context: CanvasRenderingContext2D ) {
		context.restore();
		context.restore();
	}

	setViewport( w: number | Camera, h?: number ) {
		if ( w instanceof Camera ) {
			this.viewportW = w.viewportW;
			this.viewportH = w.viewportH;
			
		} else {
			this.viewportW = w;
			this.viewportH = h;
		}
	}

	/* 
		screenToWorld, worldToScreen

		Translate points from the world to the screen and vice versa
		Screen coordinates are as measured from (0, 0) in top left and
		increasing down and to the right
	*/
	screenToWorld( screenPoint: Vec2 ): Vec2 {

		let result: Vec2 = screenPoint.copy();

		result.addX( -this.viewportW / 2 );
		result.addY( -this.viewportH / 2 );

		if ( this.mirrorX ) {
			result.x *= -1;
		}

		if ( this.mirrorY ) {
			result.y *= -1;
		}

		result.scale( 1 / this.scale );

		result.add( this.pos );

		return result;
	}

	worldToScreen( worldPoint: Vec2 ): Vec2 {
		let result: Vec2 = worldPoint.copy();

		result.sub( this.pos );

		result.scale( this.scale );

		if ( this.mirrorX ) {
			result.x *= -1;
		}

		if ( this.mirrorY ) {
			result.y *= -1;
		}

		result.addX( this.viewportW / 2 );
		result.addY( this.viewportH / 2 );

		return result;
	}
}