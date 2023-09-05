///////////
// SHAPE //
///////////

import { Entity } from "./Entity.js"
import { Vec2 } from "./Vec2.js"
import { Line } from "./Line.js"
import { Material } from './Material.js'
import { RayHit, closestTo } from "./RayHit.js"

export class Shape {
	parent: Entity = null;

	points: Array<Vec2> = [];
	edges: Array<Line> = [];
	normals: Array<Vec2> = [];

	material: Material = new Material( 0, 0, 0 );
	materialTop: Material = null;

	constructor() {

	}

	copy(): Shape {
		let s = new Shape();

		for ( let edge of this.edges ) {
			s.edges.push( edge.copy() );
		}	

		return s;
	}

	static fromLines( lines: Array<Line> ): Shape {
		let shape: Shape = new Shape()
		shape.edges = lines;

		return shape;
	}

	// Make a polygon from a list of points
	static fromPoints( points: Array<Vec2> ): Shape {
		let shape: Shape = new Shape();

		shape.points.push( points[0] );

		for ( let i = 1; i < points.length; i++ ) {
			shape.points.push( points[i] );
			shape.edges.push( Line.fromPoints( points[i-1], points[i] ) );
			shape.normals.push( points[i].minus( points[i-1] ).rotate( -Math.PI / 2 ).normalize() );
		}

		shape.edges.push( Line.fromPoints( points[points.length - 1], points[0] ) );
		shape.normals.push( points[0].minus( points[points.length - 1] ).rotate( -Math.PI / 2 ).normalize() );

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
				  new Vec2( pos.x, pos.y + h ) ] );

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

		return Shape.fromPoints( points );
	}

	offset( point: Vec2 ): Shape {
		for ( let edge of this.edges ) {
			edge.p1.add( point );
			edge.p2.add( point );
		}

		return this;
	}

	intersect( line: Line ): Array<Vec2> {
		let points = [];

		for ( let edge of this.edges ) {
			let inter = edge.intersects( line );
			
			if ( inter != null ) {
				points.push( inter );
			}
		}
		
		// Sort in order of closest to farthest
		points.sort( function( a, b ) { return Math.abs( a.x - line.p1.x ) - Math.abs( b.x - line.p1.x ) } );

		return points;
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

	getVel( point: Vec2 ): Vec2 {
		if ( !this.parent ) return new Vec2( 0, 0 );
		
		let p = point.minus( this.parent.pos );
		if ( this.parent.relPos ) {
			p.add( this.parent.relPos.turned( this.parent.angle ) );
		}

		let p2 = p.turned( this.parent.angleVel );

		return this.parent.vel.plus( p2.minus( p ) );
	}

	draw( context: CanvasRenderingContext2D ): void {
		context.strokeStyle = "black";
		context.lineWidth = 1;

		for ( let edge of this.edges ) {
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