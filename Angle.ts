import { Vec2 } from './Vec2.js'

export type Angle_PosTurn = number; // 0 to 2*pi (inclusive?)
export type Angle_HalfTurn = number; // -pi to pi (inclusive)
export type Angle_Unbound = number;

export class Angle {
	static normalize( angle: number ): Angle_HalfTurn {
		angle %= ( Math.PI * 2 );

		if ( angle > Math.PI ) angle -= Math.PI * 2;
		if ( angle < -Math.PI) angle += Math.PI * 2;

		return angle;
	}

	static toPosTurn( angle: number ): Angle_PosTurn {
		angle %= ( Math.PI * 2 );

		if ( angle < 0 ) angle += Math.PI * 2;

		return angle;
	}

	static between( angle: number, min: Angle_HalfTurn, max: Angle_HalfTurn ) {
		if ( Math.abs( max - min ) > Math.PI * 2 - 0.01 ) return true; // sweep covers entire circle

		let sweep: Angle_PosTurn = ( max - min ) % ( Math.PI * 2 ); // modulus not necessary if min/max are actually half turns or less
		if ( sweep < 0 ) sweep += Math.PI * 2;

		let diff: Angle_PosTurn = ( angle - min ) % ( Math.PI * 2 );
		if ( diff < 0 ) diff += Math.PI * 2;

		return diff <= sweep;
	}

	static getSweep( points: Array<Vec2>, origin: Vec2 ): [Angle_HalfTurn, Angle_HalfTurn] {
		let min, max: Angle_Unbound;
		let startAngle, prevAngle: Angle_HalfTurn;
		let balance: Angle_Unbound;


		if ( points.length == 0 ) {
			throw new Error( 'Angle.getSweep: no points provided' );
		}

		for ( let i = 0; i < points.length + 1; i++ ) {
			let angle: Angle_HalfTurn = points[i % points.length].minus( origin ).angle();

			if ( i == 0 ) {
				startAngle = angle;
				min = 0;
				max = 0;
				balance = 0;

			} else {

				// a line from one point to another can take up at most half of the "sky" around the origin
				let diff: Angle_HalfTurn = Angle.normalize( angle - prevAngle );

				balance += diff;

				if ( balance > max ) {
					max = balance;
				} else if ( balance < min ) {
					min = balance;
				}
			}

			prevAngle = angle;
		}

		if ( max - min > Math.PI * 2 - 0.04 ) { // ~2 degrees
			min = -Math.PI;
			max = Math.PI;
		} else {
			min = Angle.normalize( startAngle + min );
			max = Angle.normalize( startAngle + max );
		}	

		return [min, max];
	}
}