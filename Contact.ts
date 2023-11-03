import { Entity } from './Entity.js'
import { Vec2 } from './Vec2.js'

export class Contact {
	sub: Entity = null; 		// primary entity
	otherSub: Entity = null; 	// other entity
	point: Vec2; 				// point of contact (usually the intersection of two shape edges)
	normal: Vec2; 				// normal to surface of other entity
	vel: Vec2 = new Vec2(); 	// at point on other entity
	ovel: Vec2 = new Vec2();
	slice: number = 0.0; 		// portion of primary entity which is outside of the contacted edge of the other entity
	
	/* debug only */

	inters: Array<Vec2> = [];

	constructor( sub: Entity, otherSub: Entity, point: Vec2, normal: Vec2 ) {
		if ( !point ) {
			console.error( 'Contact.constructor: point is ' + point );
		}

		if ( !normal ) {
			throw new Error( 'Contact.constructor: normal is ' + normal );
		}

		if ( normal.lengthSq() > 1.0001 ) {
			console.warn( 'Contact.constructor: passing a non-unit normal' );
			normal.normalize();
		}

		this.sub = sub;
		this.otherSub = otherSub;
		this.point = point;
		this.normal = normal;
	}
}