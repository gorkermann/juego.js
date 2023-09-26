export class Camera {
	viewportW: number = 400;
	viewportH: number = 400;

	constructor() {
		
	}

	moveContext( context: CanvasRenderingContext2D ) {
		context.translate( this.viewportW / 2, this.viewportH / 2 );
	}

	setViewport( w: number, h: number ) {
		this.viewportW = w;
		this.viewportH = h;
	}
}