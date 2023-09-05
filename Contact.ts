import { Vec2 } from './Vec2.js'

export class Contact {
	point: Vec2;
	normal: Vec2;
	vel: Vec2 = new Vec2( 0, 0 );

	constructor( point: Vec2, normal: Vec2 ) {
		if ( !point ) {
			console.error( 'Contact.constructor: point is ' + point );
		}

		if ( !normal ) {
			console.error( 'Contact.constructor: normal is ' + normal );
		}

		if ( normal.lengthSq() > 1.0001 ) {
			console.warn( 'Contact.constructor: passing a non-unit normal' )
		} 

		this.point = point;
		this.normal = normal;
	}
}