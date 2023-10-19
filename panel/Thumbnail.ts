/*import md5 from 'md5'

import { Entity } from '../Entity.js'

let canvas: HTMLCanvasElement;
let context: CanvasRenderingContext2D;

if ( typeof document !== 'undefined' ) {
	canvas = document.createElement( 'canvas' ) as HTMLCanvasElement;
	canvas.width = 60;
	canvas.height = 60;

	context = canvas.getContext( '2d' );
}

class Thumbnail {
	lastUpdateTime: number = 0;
	hash: string = '';
	linkedObj: Entity;

	image: ImageData;

	constructor( linkedObj: Entity ) {
		this.linkedObj = linkedObj;
	}

	calcHash(): string {
		let shapes = this.linkedObj.getShapes();

		let sum = 0;
		let prehash = '';

		for ( let shape of shapes ) {
			prehash += ( shape.material.hue + 
						 shape.material.sat + 
						 shape.material.lum + 
						 shape.material.alpha );

			for ( let point of shape.points ) {
				sum += Math.floor( Math.abs( point.x ) )
				sum += Math.floor( Math.abs( point.y ) );
			}

			prehash += sum;

			for ( let edge of shape.edges ) {
				if ( edge.material ) {
					prehash += ( edge.material.hue + 
								 edge.material.sat + 
								 edge.material.lum + 
								 edge.material.alpha );
				}
			}
		}

		return md5( prehash );
	}

	update(): boolean {
		let hash = this.calcHash();

		let doUpdate = hash != this.hash;
		this.hash = hash;

		if ( !doUpdate ) return false;

		context.clearRect( 0, 0, canvas.width, canvas.height );

		let min, max = this.linkedObj.getMinMax();


		this.linkedObj.draw( context );

		var image = new Image();
		image.src = this.canvas.toDataURL();

		oldImages.push( new FadingImage( image ) );

		// update...

		this.lastUpdateTime = new Date().getTime();
	}
}	*/