//////////
// LINE //
//////////

/*
	A line in two dimensions, from one point to another
*/

import { Material } from './Material.js'
import { RayHit } from './RayHit.js'
import { Vec2 } from './Vec2.js'

import { between } from './util.js'

export class Line {

	p1: Vec2 = new Vec2(0, 0);	// first point
	p2: Vec2 = new Vec2(0, 0);	// second point

	material: Material = new Material( 0, 0, 0 );	

	constructor( x1: number, y1: number, 
				 x2: number, y2: number ) {

		this.p1.setValues( x1, y1 );
		this.p2.setValues( x2, y2 );
	}

	copy(): Line {
		let line = new Line( this.p1.x, this.p1.y, this.p2.x, this.p2.y );

		if ( !this.material ) line.material = null;
		else line.material = this.material.copy();

		return line;
	}

	static fromPoints ( p1: Vec2, p2: Vec2 ) {
		let line = new Line( 0, 0, 0, 0 );

		line.p1 = p1;
		line.p2 = p2;

		return line;		
	}

	toString(): string {
		 return '<(' + this.p1.x + ',' + this.p1.y + '),(' + this.p2.x + ',' + this.p2.y + ')>';
	}

	getDirection(): Vec2 {
		return this.p2.minus( this.p1 );
	}

	/*
		intersects()
		find the point of intersection with another line

		line: the other line
		infinite: whether the other line is unbounded

		returns: the intersection point, or null
	*/ 
	intersects( line: Line, infinite: boolean=false ): Vec2 | null {
		let result = null;	

		let dx_this = Math.abs( this.p2.x - this.p1.x );
		let dx_line = Math.abs( line.p2.x - line.p1.x );

		if ( dx_this < 0.01 && dx_line < 0.01 ) {
			// both vertical, do nothing, return null

	 	} else if ( dx_this < 0.01 ) {
			let slope2 = ( line.p2.y - line.p1.y ) / ( line.p2.x - line.p1.x );
			let yInt2 = line.p1.y - ( line.p1.x - this.p1.x ) * slope2;

			if ( between( yInt2, this.p1.y, this.p2.y ) && 
				 ( between( this.p1.x, line.p1.x, line.p2.x ) || infinite ) ) {
				//( between( yInt2, line.p1.y, line.p2.y ) || infinite ) ) { // not necessary?
				
				result = new Vec2( this.p1.x, yInt2 );
			}

		} else if ( dx_line < 0.01 ) {
			let slope1 = ( this.p2.y - this.p1.y ) / ( this.p2.x - this.p1.x );
			let yInt1 = this.p1.y - ( this.p1.x - line.p1.x ) * slope1;

			if ( ( between( yInt1, line.p1.y, line.p2.y ) || infinite ) && 
				 between( line.p1.x, this.p1.x, this.p2.x ) ) {

				result = new Vec2( line.p1.x, yInt1 );
			}

		} else {
			let slope1 = ( this.p2.y - this.p1.y ) / ( this.p2.x - this.p1.x );
			let slope2 = ( line.p2.y - line.p1.y ) / ( line.p2.x - line.p1.x );

			if ( slope1 != slope2 ) {
				let yInt2 = line.p1.y - this.p1.y - (line.p1.x - this.p1.x) * slope2; // use this.p1 as origin

				let intX = yInt2 / ( slope1 - slope2 ) + this.p1.x; // yInt1 is 0 with this.p1 as origin
				let intY = ( intX - this.p1.x ) * slope2 + yInt2 + this.p1.y; // y = mx + b

				if ( between( intX, this.p1.x, this.p2.x ) && 
					 ( between( intX, line.p1.x, line.p2.x ) || infinite ) &&
					 between( intY, this.p1.y, this.p2.y ) && 
					 ( between( intY, line.p1.y, line.p2.y ) || infinite ) ) {

					result = new Vec2( intX, intY );
				}
			}
		}

		return result;
	}

	/* 
		rayIntersect()
	 
	 	this: a ray from p1 to p2
		otherLine: a flat surface to reflect off of
	
		returns: a RayHit object with the hit location and surface normal
	*/

	rayIntersect( otherLine: Line ): RayHit | null {
		let intersection = this.intersects( otherLine );

		if ( intersection === null ) {
			return null;	
		}

		// Rotate the line 90 degrees to get a normal vector
		let normal = new Vec2( otherLine.p1.y - otherLine.p2.y, 
							   otherLine.p2.x - otherLine.p1.x ).normalize();

		// Flip the normal if it's pointing in the same general direction as our ray
		if ( this.p1.minus( intersection ).dot( normal ) < 0 ) {
			normal.flip();
		}

		return new RayHit( intersection, normal, otherLine.material );
	}

	// check whether any of the points are on different sides of the line
	/*
		if the "line" is the infinite line drawn from the unit segment b:

		|b| = 1
		sin(theta) = opp / hyp = distance_to_line / |a|
		a cross b = |a| * |b| * sin(theta)
				  = |a| * 1 * distance_to_line / |a|
				  = distance_to_line
	*/
	whichSide( points: Array<Vec2> ): Array<number> {
		let sides: Array<number> = [];

		let v1 = this.p2.minus( this.p1 ).normalize();

		for ( let i = 0; i < points.length; i++ ) {
			let distFromLine = v1.cross( points[i].minus( this.p1 ) );

			if ( distFromLine < -0.01 ) {
				sides.push( -1 );
			} else if ( distFromLine > 0.01 ) {
				sides.push ( 1 );
			} else {
				sides.push( 0 );
			}
		}

		return sides;
	}

	sortAlong( points: Array<Vec2> ): void {
		if ( Math.abs( this.p2.x - this.p1.x ) < 0.01 ) {
			points.sort( ( a, b ) => ( a.y - b.y ) / ( this.p2.y - this.p1.y ) );
		} else {
			points.sort( ( a, b ) => ( a.x - b.x ) / ( this.p2.x - this.p1.x ) );
		}
	}

	draw( context: CanvasRenderingContext2D ): void {
		context.beginPath();
		context.moveTo( this.p1.x, this.p1.y );	
		context.lineTo( this.p2.x, this.p2.y );
		context.stroke();
	}
}