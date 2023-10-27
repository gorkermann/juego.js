import { Entity } from './Entity.js'
import { Shape } from './Shape.js'
import { Vec2 } from './Vec2.js'

export class IsoTriangleEntity extends Entity {

	constructor( pos: Vec2, width: number, height: number ) {
		super( pos, width, height );
	}

	_getDefaultShapes(): Array<Shape> {
		let shape = Shape.fromPoints( [
			new Vec2( -this.width / 2, this.height / 2 ),
			new Vec2( 0, -this.height / 2 ),
			new Vec2( this.width / 2, this.height / 2 )
		] );

		shape.material = this.material;
		shape.parent = this;

		return [shape];
	}
}

export class RightTriangleEntity extends Entity {

	constructor( pos: Vec2, width: number, height: number ) {
		super( pos, width, height );
	}

	_getDefaultShapes(): Array<Shape> {
		let shape = Shape.fromPoints( [
			new Vec2( -this.width / 2, -this.height / 2 ),
			new Vec2( this.width / 2, this.height / 2 ),
			new Vec2( -this.width / 2, this.height / 2 )
		] );

		shape.material = this.material;
		shape.parent = this;

		return [shape];
	}
}

export class OvalEntity extends Entity {
	count: number;

	constructor( pos: Vec2, width: number, count: number=8, height: number=0 ) {
		if ( height == 0 ) height = width;

		super( pos, width, height );

		this.count = count;
	}

	_getDefaultShapes(): Array<Shape> {
		let shape = Shape.makeCircle( new Vec2(), this.width, this.count )

		shape.material = this.material;
		shape.parent = this;

		return [shape];
	}	
}