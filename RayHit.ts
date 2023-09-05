////////////
// RAYHIT //
////////////

/*
	Contains info about a ray hitting a surface and bouncing off
*/

import { Material } from './Material.js'
import { Vec2 } from './Vec2.js'

export function closestTo( point: Vec2 ) {
	return function( a: RayHit, b: RayHit ) { 
			return ( a.point.minus( point ).lengthSq() - b.point.minus( point ).lengthSq() )
	}
}

export class RayHit {

	point: Vec2;
	normal: Vec2;
	material: Material;
	vel: Vec2; // velocity of contact point

	constructor( point: Vec2, normal: Vec2, material: Material ) {
		this.point = point;
		this.normal = normal;
		this.material = material;
	}

	reflect( incidentVector: Vec2 ): Vec2 {
		let incident = incidentVector.copy(); // Copy the incident vector so we don't overwrite the input

		// if you don't do this, you get the same vector as output
		incident.normalize().flip();

		// part parallel to normal
		let cosine: Vec2 = this.normal.times( incident.dot( this.normal ) );
		
		// part perpendicular to normal
		let sine: Vec2 = cosine.minus( incident );

		return cosine.add( sine );
	}
}