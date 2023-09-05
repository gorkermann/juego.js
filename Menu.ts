import { Entity } from './Entity.js'
import { Vec2 } from './Vec2.js'

export class Text extends Entity {
	text: string = ""

	constructor( pos: Vec2, text: string ) {
		super( pos, 0, 0 );

		this.text = text;
	}

	draw( context: CanvasRenderingContext2D ) {
		context.fillStyle = this.material.getFillStyle();
		
		context.save();
			context.fillText( this.text, this.pos.x, this.pos.y );	
		context.restore();
	}
} 