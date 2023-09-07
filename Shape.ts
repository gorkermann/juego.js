///////////
// SHAPE //
///////////

/*
	A polygon (a single, non-self-intersecting closed loop of line segments)
 */

import { Entity } from "./Entity.js"
import { Vec2 } from "./Vec2.js"
import { Line } from "./Line.js"
import { Material } from './Material.js'
import { RayHit, closestTo } from "./RayHit.js"

/*
	getTurnAngle

	Traveling in the direction l1 (from p1 to p2), find the angle required
	to change direction to l2
 */
function getTurnAngle( l1: Line, l2: Line ) {
	let v1 = l1.p2.minus( l1.p1 ).normalize();
	let v2 = l2.p2.minus( l2.p1 ).normalize();

	return Math.asin( v1.cross( v2 ) );
}

export enum LoopDir {
	CW = 1,
	CCW,
	UNSPECIFIED
}

export class Shape {
	parent: Entity = null;

	points: Array<Vec2> = [];
	edges: Array<Line> = [];
	normals: Array<Vec2> = [];

	material: Material = new Material( 0, 0, 0 );
	materialTop: Material = null;

	constructor() {}

	copy(): Shape {
		let s = new Shape();

		s.parent = this.parent;

		// copy edges and points
		for ( let i = 0; i < this.edges.length; i++ ) {
			s.edges.push( this.edges[i].copy() );
			s.points.push( s.edges[i].p1 );
		}

		// connect edges, copy normals
		for ( let i = 0; i < this.edges.length; i++ ) {
			if ( i < s.edges.length - 1 ) {
				s.edges[i].p2 = s.edges[i+1].p1;
			}

			s.normals[i] = this.normals[i].copy();
		}
		s.edges[s.edges.length - 1].p2 = s.edges[0].p2;

		// copy materials
		if ( !this.material ) s.material = null;
		else s.material = this.material.copy(); 

		if ( !this.materialTop ) s.materialTop = null;
		else s.materialTop = this.materialTop.copy(); 

		return s;
	}

	// Make a polygon from a list of points
	// can specify LoopDir to avoid calculation of turnAngle
	static fromPoints( points: Array<Vec2>, loopDir: LoopDir=LoopDir.UNSPECIFIED): Shape {
		let shape: Shape = new Shape();

		// points and edges
		if ( points.length < 3 ) {
			throw new Error( 'Shape.fromPoints: ' + points.length + ' points given, at least 3 required' );
		}

		let turnAngle = 0;

		shape.points.push( points[0] );

		for ( let i = 1; i < points.length; i++ ) {
			let firstIndex = points.indexOf( points[i] );
			if ( firstIndex >= 0 && firstIndex != i ) {
				throw new Error( 'Shape.fromPoints: Points must be unique (indices ' + 
								 firstIndex + ' and ' + i + ' are the same object)' );
			}

			shape.points.push( points[i] );
			shape.edges.push( Line.fromPoints( points[i-1], points[i] ) );

			if ( loopDir == LoopDir.UNSPECIFIED && i > 1 ) {
				turnAngle += getTurnAngle( shape.edges[i-2], shape.edges[i-1] );
			}
		}

		shape.edges.push( Line.fromPoints( points[points.length - 1], points[0] ) );

		if ( loopDir == LoopDir.UNSPECIFIED ) {
			turnAngle += getTurnAngle( shape.edges[points.length-1], shape.edges[0] );
		}

		// normals
		let normalAngle = -Math.PI / 2; // CW
		
		if ( loopDir == LoopDir.CCW || turnAngle < 0 ) { // CCW
			normalAngle = Math.PI / 2;
		}

		for ( let i = 1; i < shape.edges.length; i++ ) {
			shape.normals.push( points[i].minus( points[i-1] ).rotate( normalAngle ).normalize() );
		}
		shape.normals.push( points[0].minus( points[points.length - 1] ).rotate( normalAngle ).normalize() );

		// materials
		for ( let edge of shape.edges ) {
			edge.material = null;
		}

		return shape;
	}

	// Make a rectangle
	static makeRectangle( pos: Vec2, w: number, h: number ): Shape {
		let shape: Shape = Shape.fromPoints( 
				[ pos.copy(),
			 	  new Vec2( pos.x + w, pos.y ),
				  new Vec2( pos.x + w, pos.y + h ),
				  new Vec2( pos.x, pos.y + h ) ], LoopDir.CW );

		return shape;
	}

	static makeCircle( pos: Vec2, d: number, count: number, offset: number=0.0 ): Shape {
		let points = [];
		let slice = Math.PI * 2 / count;

		for ( let i = 0; i < count; i++ ) {
			let point = Vec2.fromPolar( i * slice + offset * slice, d / 2 );
			point.add( pos );
			points.push( point );
		}

		return Shape.fromPoints( points, LoopDir.CW );
	}

	offset( offset: Vec2 ): Shape {
		for ( let point of this.points ) {
			point.add( offset );
		}

		return this;
	}

	intersect( line: Line ): Array<Vec2> {
		let inters = [];

		for ( let edge of this.edges ) {
			let inter = edge.intersects( line );
			
			if ( inter != null ) {
				inters.push( inter );
			}
		}
		
		// Sort in order of closest to farthest
		inters.sort( function( a, b ) { return a.distToSq( line.p1 ) - b.distToSq( line.p1 ) } );

		return inters;
	}

	getBoundingHeight(): number {
		let min = null;
		let max = null;

		for ( let point of this.points ) {
			if ( min === null || point.y < min ) min = point.y;
			if ( max === null || point.y > max ) max = point.y;
		}

		return max - min; 
	}

	rayIntersect( ray: Line ): Array<RayHit> {
		let rayHits = [];

		for ( let edge of this.edges ) {
			let hit = ray.rayIntersect( edge );
			
			if ( hit !== null ) {
				hit.material = this.material.copy();

				let min = null;
				let max = null;

				for ( let point of this.points ) {
					if ( min === null || point.y < min ) min = point.y;
					if ( max === null || point.y > max ) max = point.y;
				}

				if ( this.materialTop !== null && hit.point.y < min + ( max - min ) / 10 ) {
					hit.material = this.materialTop.copy();
				}

				if ( edge.material ) {
					hit.material = edge.material.copy();
				}

				rayHits.push( hit );
			}
		}
		
		// Sort in order of closest to farthest
		rayHits.sort( closestTo( ray.p1 ) );

		for ( let point of this.points ) {
			for ( let hit of rayHits ) {
				if ( point.distTo( hit.point ) < 2 ) {
					//hit.material.hue += 10;
				}
			}
		}

		return rayHits;	
	}

	// TODO: account for changing relAngle and relPos. Probably move this to Entity
	getVel( point: Vec2 ): Vec2 {
		if ( !this.parent ) return new Vec2( 0, 0 );
		
		let p = point.minus( this.parent.pos );
		if ( this.parent.relPos ) {
			p.add( this.parent.relPos.turned( this.parent.angle ) );
		}

		let p2 = p.turned( this.parent.angleVel );

		return this.parent.vel.plus( p2.minus( p ) );
	}

	getArea(): number {
		let sum = 0;

		for ( let i = 0; i < this.points.length - 1; i++ ) {
			sum += this.points[i].x * this.points[i+1].y;
			sum -= this.points[i+1].x * this.points[i].y;
		}

		sum += this.points[this.points.length - 1].x * this.points[0].y;
		sum -= this.points[0].x * this.points[this.points.length - 1].y;

		return sum / 2;
	}

	slice( line: Line ): number {
		let inters = [];
		inters[this.edges.length - 1] = null;
		inters.fill( null );

		let count = 0;

		// find edges which intersect the line
		for ( let i = 0; i < this.edges.length; i++ ) {
			let inter = this.edges[i].intersects( line, true )

			if ( inter != null ) {
				inters[i] = inter;
				count += 1;
			}
		}

		// remove intersections that are at point 1 of an edge
		// (leaving the intersection at point 2 of the next edge)
		for ( let i = 0; i < this.edges.length; i++ ) {
			let index = ( i + this.edges.length ) % this.edges.length;

			if ( inters[index] && inters[index+1] && 
				 this.edges[index].p2.equals( inters[index] ) ) {

				inters[index+1] = null;
			}
		}

		// sort intersections in by farthest along in the direction of the line
		let sortedInters = inters.filter( x => x )

		if ( Math.abs( line.p2.x - line.p1.x ) < 0.01 ) {
			sortedInters.sort( ( a, b ) => ( a.y - b.y ) / ( line.p2.y - line.p1.y ) );
		} else {
			sortedInters.sort( ( a, b ) => ( a.x - b.x ) / ( line.p2.x - line.p1.x ) );
		}

		let startIndex = inters.indexOf( sortedInters[0] );

		// travel clockwise
		let side = 1;
		let v1 = line.p2.minus( line.p1 );
		let v2 = this.edges[startIndex].p2.minus( inters[startIndex] );
		if ( v1.cross( v2 ) > 0 ) side = -1;

		// add area of strands to the left of the line, subtract area of strands to the right
		let strand = [inters[startIndex]];
		strand.push( this.edges[startIndex].p2 );

		let leftArea = 0;

		for ( let i = 1; i < this.edges.length + 1; i++ ) {
			let index = ( startIndex + i + this.edges.length ) % this.edges.length;

			if ( inters[index] ) {
				strand.push( inters[index] );

				let partial = Shape.fromPoints( strand );
				if ( side > 0 ) leftArea += partial.getArea();
				//else rightArea += partial.getArea();

				side *= -1;
				strand = [inters[index]];
			}

			strand.push( this.edges[index].p2 );
		}

		return leftArea / this.getArea();
	}

	stroke( context: CanvasRenderingContext2D ): void {
		context.lineWidth = 1;

		for ( let edge of this.edges ) {
			context.strokeStyle = this.material.getFillStyle();
			if ( edge.material ) context.strokeStyle = edge.material.getFillStyle();

			edge.draw( context );
		}
	}

	fill( context: CanvasRenderingContext2D ): void {
		context.fillStyle = this.materialTop.getFillStyle();

		context.beginPath();
		context.moveTo( this.points[0].x, this.points[0].y );

		for ( let i = 1; i < this.points.length; i++ ) {
			context.lineTo( this.points[i].x, this.points[i].y );
		}

		context.closePath();
		context.fill();
	}

	materialDraw( context: CanvasRenderingContext2D ): void {
		for ( let edge of this.edges ) {
			if ( edge.material ) {
				context.strokeStyle = "blue";
			} else context.strokeStyle = "red";

			edge.draw( context );
		}
	}
}