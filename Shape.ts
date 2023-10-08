///////////
// SHAPE //
///////////

/*
	A polygon (a single, non-self-intersecting closed loop of line segments)
 */

import { Contact } from './Contact.js'
import { Entity } from "./Entity.js"
import { Vec2 } from "./Vec2.js"
import { Line } from "./Line.js"
import { Material } from './Material.js'
import { RayHit, closestTo } from "./RayHit.js"
import { between } from './util.js'

import { Debug } from "./Debug.js"

let zeroVector = new Vec2( 0, 0 );

type WorldPoint = Vec2
type LocalPoint = Vec2
type Dir = Vec2

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

let VEL_EPSILON = 0.0001

export class ShapeHit extends RayHit {
	shape: Shape;
	dist: number;
	incidentDot: number;
	normalDist: number;

	constructor( point: Vec2, normal: Vec2, material: Material ) {
		super( point, normal, material );
	}
}

export enum LoopDir {
	CW = 1,
	CCW,
	UNSPECIFIED
}

type EdgeContact = {
	point: Vec2;
	index: number;
}

export class Shape {
	parent: Entity = null;

	points: Array<LocalPoint> = [];
	edges: Array<Line> = [];
	normals: Array<Dir> = [];

	material: Material = new Material( 0, 0, 0 );

	hollow: boolean = false;

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
	static makeRectangle( topLeft: Vec2, w: number, h: number ): Shape {
		let shape: Shape = Shape.fromPoints( 
				[ topLeft.copy(),
			 	  new Vec2( topLeft.x + w, topLeft.y ),
				  new Vec2( topLeft.x + w, topLeft.y + h ),
				  new Vec2( topLeft.x, topLeft.y + h ) ], LoopDir.CW );

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

	static getMinMax( points: Array<Vec2> ): [Vec2, Vec2] {
		if ( points.length == 0 ) {
			throw new Error( 'Shape.getMinMax: no points provided' );
		}

		let min = points[0].copy();
		let max = points[0].copy();

		for ( let point of points ) {
			if ( point.x < min.x ) min.x = point.x;
			if ( point.y < min.y ) min.y = point.y;
			if ( point.x > max.x ) max.x = point.x;
			if ( point.y > max.y ) max.y = point.y;
		}

		return [min, max];
	}

	static getBoundingWidth( points: Array<Vec2> ): number {
		let [min, max] = Shape.getMinMax( points );

		return max.x - min.x;
	}

	static getBoundingHeight( points: Array<Vec2> ): number {
		let [min, max] = Shape.getMinMax( points );

		return max.y - min.y;
	}

	static getBoundingBox( points: Array<Vec2> ): Shape {
		let [min, max] = Shape.getMinMax( points );

		return Shape.fromPoints( [min, new Vec2( max.x, min.y ),
								  max, new Vec2( min.x, max.y ) ] );
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

	rayIntersect( ray: Line ): Array<ShapeHit> {
		let result: Array<ShapeHit> = [];
		let minDistSq = 0;

		for ( let i = 0; i < this.edges.length; i++ ) {
			let edge = this.edges[i];

			let point = ray.intersects( edge );
			
			if ( point !== null ) {
				let hit = new ShapeHit( point, this.normals[i].copy(), null );

				if ( edge.material ) {
					hit.material = edge.material.copy();
				} else {
					hit.material = this.material.copy();
				}

				hit.dist = hit.point.distTo( ray.p1 );

				/*if ( !result || hit.dist < minDistSq ) {
					result = hit;
					minDistSq = hit.dist;
				}*/
				result.push( hit );
			}
		}
		
		// Sort in order of closest to farthest
		//rayHits.sort( closestTo( ray.p1 ) );

		result.sort( ( a: ShapeHit, b: ShapeHit ) => a.dist - b.dist );

		return result;
	}

	getTransformedBBox( step: number ): Shape {
		let bbox = Shape.getBoundingBox( this.points );

		if ( !this.parent ) return bbox;

		for ( let point of bbox.points ) {
			this.parent.applyTransform( point, step ); 
		}

		for ( let normal of this.normals ) { 
			this.parent.applyTransform( normal, step, { angleOnly: true } );
		}

		return bbox;
	}

	vertIntersectCount( point: LocalPoint, y: number ) {
		let testLine = Line.fromPoints( point, new Vec2( point.x, y ) );
		let count = 0;

		for ( let edge of this.edges ) {
			if ( !between( point.x, edge.p1.x, edge.p2.x ) ) continue;

			if ( testLine.intersects( edge ) ) {
				count += 1;
			}
		}

		return count;
	}

	contains( point: WorldPoint, step: number=0.0, doTransform: boolean=true ): boolean {
		let p: LocalPoint = point.copy();

		if ( this.parent && doTransform ) {
			this.parent.unapplyTransform( p, step );
		}

		let [min, max] = Shape.getMinMax( this.points );

		if ( p.x < min.x ||
			 p.y < min.y || 
			 p.x > max.x || 
			 p.y > max.y ) {
			return false;
		}

		// vertical line pointing up, second point outside shape
		if ( this.vertIntersectCount( p, min.y - 5 ) % 2 == 1 ) { 
			return true;
		}

		// if the point is on an edge the above check may fail
		// ex: point is on bottom edge of rectangle. 
		// 	   1 intersection for point, 1 for crossing top edge, 2 % 2 = 0

		// vertical line pointing down, second point outside shape
		if ( this.vertIntersectCount( p, max.y + 5 ) % 2 == 1 ) { 
			return true;
		}

		return false;
	}

	/**
	 * only to be used if getEdgeContact fails (harder to determine normals from this sort of contact)
	 * 
	 * @param  {Shape}   otherShape [description]
	 * @return {Contact}            [description]
	 */
	getBodyContact( otherShape: Shape ): Contact | null {
		let contained = [];
		let insideThis = false;
		let insideOther = false;

		if ( !this.hollow ) {
			for ( let point of otherShape.points ) {
				if ( this.contains( point, 0.0, false ) ) {
					contained.push( point );
					insideThis = true;
				}
			}
		}

		if ( !otherShape.hollow ) {
			for ( let point of this.points ) {
				if ( otherShape.contains( point, 0.0, false ) ) {
					contained.push( point );
					insideOther = true;
				}
			}
		}

		/* OK: no overlap */

		if ( contained.length == 0 ) return null;		

		/* ERROR: these cases should have been found by getEdgeContact */
		
		// shapes have points inside one another (e.g. overlapping corners)
		if ( insideOther && insideThis ) return null;

		// not all points contained (point on edge, getEdgeContact rejected due to similar slopes)
		if ( insideThis && contained.length < otherShape.points.length ) return null;
		if ( insideOther && contained.length < this.points.length ) return null;

		/* OK: one shape is completely inside the other */

		let point = contained[0];
		let vel = otherShape.getVel( point ); // TODO: find fastest velocity of contained points
		let normal = vel.unit();
		if ( normal.equals( zeroVector ) ) {
			normal = this.getVel( point ).unit().flip();
		}
		if ( normal.equals( zeroVector ) ) { // neither shape is moving
			normal = new Vec2( 1, 0 );
		}

		let contact = new Contact( null, null, point, normal );

		contact.vel = vel;
		contact.slice = 1.0; // insideThis: a shape is always to the right of its own normals
							 // insideOther: something inside a shape to the right of the normals of that shape
		return contact;
	}

	getEdgeContact( otherShape: Shape ): Contact | null {
		let contact: Contact = null;
		let inters: Array<EdgeContact> = [];

		for ( let edge of this.edges ) {
			for ( let i = 0; i < otherShape.edges.length; i++ ) {
				let point = edge.intersects( otherShape.edges[i] );
				if ( !point ) continue;

				/* 
					adding this filter seems to obviate the crush glitch with LockRing 
				
					if two points are very close together, the line between them can cause
					weird results from slice(), and flipped normals
				*/
				let anyEqual = false;

				// throw out similar points (reducing epsilon a bit here)
				for ( let inter of inters ) {
					if ( point.equals( inter.point, 0.001 ) ) anyEqual = true;
				}

				if ( !anyEqual ) {
					inters.push( { point: point, index: i } );
				}
			}
		}

		/*
			inters.length == 0 means one shape is either completely inside or outside of the other

				implying that an earlier collision was missed

			inters.length == 1 means either:

				one corner of either shape is right on an edge of the other,
				and one of the intersections has been rejected

				or the shape has an unconnected edge (edge.p2 != nextEdge.p1)
		*/
		if ( inters.length < 1 ) {
			return this.getBodyContact( otherShape );
		}

		// TODO: linear regression to find normal?
		let point: Vec2;
		let vel: Vec2; // should use step for this?
		let normal: Vec2;
		let slice: number;

		if ( inters.length == 1 ) {
			point = inters[0].point;
			vel = otherShape.getVel( point );
			normal = otherShape.normals[ inters[0].index ];
			slice = this.slice( otherShape.edges[ inters[0].index ] );

		} else if ( inters.length > 1 ) {
			let inter0, inter1: EdgeContact;
			let len, maxLenSq = 0;

			for ( let i = 0; i < inters.length; i++ ) {
				for ( let j = i + 1; j < inters.length; j++ ) {
					len = inters[i].point.distToSq( inters[j].point );

					if ( len > maxLenSq ) {
						inter0 = inters[i];
						inter1 = inters[j];
						maxLenSq = len;
					}
				}
			}

			point = inter0.point;
			slice = this.slice( Line.fromPoints( inter0.point, inter1.point ) );

			if ( inter0.index == inter1.index ) {
				normal = otherShape.normals[ inter0.index ].copy();

			} else {
				normal = inter1.point.minus( inter0.point ).normalize();
				if ( slice > 0.5 ) {
					normal.rotate( -Math.PI / 2 )	
				} else {
					normal.rotate( Math.PI / 2 );
				}
			}

			//if ( inters.length > 2 ) console.log( 'oh boy' );

			// compare velocities at intersections to find the fastest
			// (a rotating object will create multiple contacts with different velocities)
			vel = otherShape.getVel( inter0.point );
			let vel1 = otherShape.getVel( inter1.point );

			if ( vel1.lengthSq() > vel.lengthSq() ) {
				point = inter1.point;
				vel = vel1;
			}
		}

		// velocity of the contact point projected onto the contact normal
		let nvel = normal.times( vel.dot( normal ) );

		// create contact
		contact = new Contact( null, null,
							   point,
							   normal );
		contact.vel = nvel;
		contact.slice = slice;
		
		if ( Debug.CONTACT_INTERS ) {
			contact.inters = inters.map( x => x.point );
		}

		return contact;		
	}

	getVel( point: Vec2, step: number=1.0 ): Vec2 {
		if ( !this.parent ) return new Vec2( 0, 0 );

		let p: LocalPoint = this.parent.unapplyTransform( point.copy(), 0.0 );
		let p2 = this.parent.applyTransform( p.copy(), 1.0 );

		let v = p2.minus( point );

		if ( Math.abs( v.x ) < VEL_EPSILON ) v.x = 0;
		if ( Math.abs( v.y ) < VEL_EPSILON ) v.y = 0;

		return v;

		// old calculation
		/*let p = point.minus( this.parent.pos );
		if ( this.parent.relPos ) {
			p.add( this.parent.relPos.turned( this.parent.angle ) );
		}

		let p2 = p.turned( this.parent.angleVel * step );*/

		//return this.parent.vel.plus( p2.minus( p ) );
	}

	getArea(): number {
		let sum = 0;

		for ( let i = 0; i < this.points.length - 1; i++ ) {
			sum += this.points[i].x * this.points[i+1].y;
			sum -= this.points[i+1].x * this.points[i].y;
		}

		sum += this.points.slice( -1 )[0].x * this.points[0].y;
		sum -= this.points[0].x * this.points.slice( -1 )[0].y;

		return sum / 2;
	}

	forEachIndex( func: ( i: number, iNext: number ) => void, start: number=0 ) {
		let i, iNext;

		for ( let j = 0; j < this.points.length; j++ ) {
			i = ( j + start ) % this.points.length
			iNext = ( i + 1 ) % this.points.length;

			func( i, iNext );
		}
	}

	slice( line: Line ): number {
		// check whether any of the points are on different sides of the line
		let sides = line.whichSide( this.points );

		let leftCount = sides.filter( x => x < 0 ).length;
		let rightCount = sides.filter( x => x > 0 ).length;

		if ( leftCount == 0 ) return 0.0; // all points are on the right
		if ( rightCount == 0 ) return 1.0; // all points are on the left

		let inters: Array<Vec2> = [];
		inters[this.edges.length - 1] = null;
		inters.fill( null );

		// find edges which intersect the line
		this.forEachIndex( ( i, iNext ) => {
			if ( sides[i] != 0 && sides[iNext] != 0 && sides[i] == sides[iNext] ) return;
			
			let inter = this.edges[i].intersects( line, true )

			if ( inter != null ) {
				inters[i] = inter;
			}
		} );

		// remove intersections that are at point 1 of an edge
		// (leaving the intersection at point 2 of the next edge)
		this.forEachIndex( ( i, iNext ) => {
			if ( inters[i] && inters[iNext] && 
				 this.edges[i].p2.equals( inters[i] ) ) {

				inters[iNext] = null;
			}
		} );

		// sort intersections in by farthest along in the direction of the line
		let sortedInters = inters.filter( x => x !== null );

		if ( sortedInters.length == 0 ) {
			throw new Error( 'Shape.slice: no intersections' );
		}

		line.sortAlong( sortedInters );
		let startIndex = inters.indexOf( sortedInters[0] );

		// add area of strands to the left of the line, subtract area of strands to the right
		let side = 0;//line.whichSide( [this.edges[startIndex].p2] )[0];
		//if ( side == 0 ) side = -1;

		let strand: Array<Vec2> = []
		let leftArea = 0;

		this.forEachIndex( ( i, iNext ) => {
			if ( inters[i] ) {
				strand.push( inters[i] );

				if ( strand.length >= 3 ) {
					let partial = Shape.fromPoints( strand );
					if ( side < 0 ) leftArea += partial.getArea();
					//else rightArea += partial.getArea();

					//side *= -1;
					strand = [inters[i]];
				}
			}

			let s = sides[iNext];//line.whichSide( [this.edges[i].p2] )[0];
			if ( s != 0 ) side = s;

			strand.push( this.edges[i].p2 );
		}, startIndex );

		return leftArea / this.getArea();
	}

	getEdgeMaterial( index: number ): Material {
		if ( index > this.edges.length ) {
			throw new Error( 'Shape.getEdgeMaterial: Index out of range ( ' + index + '>' + this.edges.length + ')' );
		}

		let material = this.edges[index].material;
		if ( !material ) material = this.material;

		return material;
	}

	startPathAt( context: CanvasRenderingContext2D, index: number ): Material {
		if ( index > this.points.length ) {
			throw new Error( 'Shape.startPathAt: Index out of range ( ' + index + '>' + this.points.length + ')' );
		}

		let material = this.getEdgeMaterial( index );
		context.strokeStyle = material.getFillStyle();

		context.beginPath();
		context.moveTo( this.points[index].x, this.points[index].y );

		return material;
	}

	sphericalStroke( context: CanvasRenderingContext2D, origin: Vec2, ir: number, lens: number ): void {
		context.lineWidth = 1;

		//let material = this.startPathAt( context, 0 );
		context.strokeStyle = this.material.getFillStyle();
		let startIndex = -1;
		let iNext: number;

		context.beginPath();

		let v: Array<Vec2> = this.points.map( x => x.minus( origin ) );
		let v1, v2: Vec2;

		for ( let i = 0; i < this.points.length; i++ ) {
			iNext = ( i + 1 ) % this.points.length;

			v1 = v[i];
			let r1 = ir - ir * lens / ( v1.length() ** 0.5 + 1 );
			v2 = v[iNext];

			let diff = v2.minus( v1 );
			let dist = diff.length();
			if ( diff.length() == 0 ) continue;

			let uDiff = diff.unit();

			let l = 0;
			let maxAngle = 4 / 180 * Math.PI;

			let p, d: Vec2;

			do {
				p = v1.alongTo( v2, l / dist );
				let pLen = p.length();
				let r = ir - ir * lens / ( pLen ** 0.5 + 1 );
				d = p.times( r / pLen ).plus( origin );

				if ( startIndex < 0 ) {
					context.moveTo( d.x, d.y );
					startIndex = i;

				} else {
					context.lineTo( d.x, d.y );
				}

				let dot = p.dot( uDiff ) / pLen;
				let angle = Math.acos( dot );
				if ( dot < 0 ) angle = Math.PI - angle;
				let phi = Math.PI - angle - maxAngle;

				if ( phi < 0 ) break;

				l += pLen * Math.sin( maxAngle ) / Math.sin( phi );
				//last = p;

			} while ( l < dist );

			/*if ( i == 0 ) {
				context.beginPath();
				context.moveTo( v.x, v.y );
			} else {
				context.lineTo( v.x, v.y );//this.points[i].x, this.points[i].y );
			}*/

			//if ( material != this.getEdgeMaterial( i ) ) {
				//context.stroke();

				//material = this.startPathAt( context, i );
				//startIndex = i;
			//}
		}

		/*if ( startIndex == 0 ) {
			context.closePath();
		} else {
			//context.lineTo( this.points[0].x, this.points[0].y );
		}*/
		context.closePath();
		context.stroke();
	}

	stroke( context: CanvasRenderingContext2D ): void {
		context.lineWidth = 1;

		let material = this.startPathAt( context, 0 );
		context.strokeStyle = this.material.getFillStyle();
		let startIndex = -1;

		context.beginPath();

		for ( let i = 0; i < this.points.length; i++ ) {
			if ( i == 0 ) {
				context.beginPath();
				context.moveTo( this.points[i].x, this.points[i].y );
			} else {
				context.lineTo( this.points[i].x, this.points[i].y );
			}

			if ( material != this.getEdgeMaterial( i ) ) {
				context.stroke();

				material = this.startPathAt( context, i );
				startIndex = i;
			}
		}

		if ( startIndex == 0 ) {
			context.closePath();
		} else {
			context.lineTo( this.points[0].x, this.points[0].y );
		}

		context.stroke();
	}

	/*
		ellipse thing

			let v1 = this.points[i].minus( origin );
			let r1 = 190.5 - 190.5 / ( Math.sqrt( v1.length() ) + 1 );
			let v2 = this.points[iNext].minus( origin );
			let r2 = 190.5 - 190.5 / ( Math.sqrt( v2.length() ) + 1 );

			let cos = v1.dot( v2 ) / v1.length() / v2.length();
			let theta = Math.acos( cos );
			let r2cos = ( r2 * cos ) ** 2;
			let b = Math.sqrt( Math.abs( (r2*r2 - r2cos ) / ( 1 - r2cos / ( r1*r1 ) ) ) );
			let cross = v1.cross( v2 );

			context.ellipse( origin.x, origin.y, r1, b, v1.angle(), 0, theta * ( cross < 0 ? -1 : 1 ), cross < 0 );

	 */

	fill( context: CanvasRenderingContext2D ): void {
		context.fillStyle = this.material.getFillStyle();

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