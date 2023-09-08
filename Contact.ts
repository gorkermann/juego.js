import { Entity } from './Entity.js'
import { Vec2 } from './Vec2.js'

export class Contact {
	entity: Entity = null; // primary entity
	point: Vec2;
	normal: Vec2; // to surface of other entity
	vel: Vec2 = new Vec2( 0, 0 ); // at point on other entity

	// portion of primary entity which is outside of the contacted edge of the other entity
	slice: number = 0.0; 

	constructor( entity: Entity, point: Vec2, normal: Vec2 ) {
		if ( !point ) {
			console.error( 'Contact.constructor: point is ' + point );
		}

		if ( !normal ) {
			console.error( 'Contact.constructor: normal is ' + normal );
		}

		if ( normal.lengthSq() > 1.0001 ) {
			console.warn( 'Contact.constructor: passing a non-unit normal' )
		} 

		this.entity = entity;
		this.point = point;
		this.normal = normal;
	}
}