import { Entity } from './Entity.js'
import { Vec2 } from './Vec2.js'

let canvas: HTMLCanvasElement;
let context: CanvasRenderingContext2D;

if ( typeof window != 'undefined' ) {
	canvas = ( window as any ).canvas;
	context = ( window as any ).context;
}

export type SolverResult = {
	blockedDirs: Array<Vec2>,
	crushed: boolean
}

export function solveCollisionsFor( entity: Entity, otherEntities: Array<Entity>, solidMask: number, step: number ): SolverResult {
	let stepTotal = 0.0;
	let lastTotal = 0.0;
	let contacted: Entity = null;
	let shapes = [];
	let blockedDirs: Array<Vec2> = [];
	let pushDirs: Array<Vec2> = [];

	while ( stepTotal < step ) {
		let partialStep = step - stepTotal;
		let solidContacts = [];

		while ( partialStep > 0.05 ) {
			solidContacts = [];
			contacted = null;

			// TODO: rank contacts
			for ( let otherEntity of otherEntities ) {
				if ( !entity.canBeHitBy( otherEntity ) ) continue;

				let contacts = entity.overlaps( otherEntity, stepTotal + partialStep );
				
				if ( contacts.length > 0 ) {
					contacted = otherEntity;
				}

				for ( let contact of contacts ) {
					if ( contact.otherSub.collisionGroup & solidMask ) {
						 solidContacts.push( contact );
					}
				}
			}

			if ( solidContacts.length > 0) {
				partialStep /= 2;
			} else {
				break;
			}
		}

		 // debug draw
		if ( context ) {
			//context.clearRect( 0, 0, canvas.width, canvas.height );

			shapes.push( ...entity.getShapes( stepTotal + partialStep ) );
			if ( contacted ) shapes.push( ...contacted.getShapes( stepTotal + partialStep ) );
			
			for ( let shape of shapes ) {
				shape.stroke( context );
			}
		} // debug draw

		for ( let contact of solidContacts ) {

			// blocked directions
			let anyEqual = false;

			for ( let dir of blockedDirs ) {
				if ( dir.equals( contact.normal ) ) {
					anyEqual = true;
					break;
				}
			}

			if ( !anyEqual ) {
				blockedDirs.push( contact.normal.copy() );
			}
			
			// player hits something, cancel player velocity in object direction
			let ndot = entity.vel.dot( contact.normal );
			let before = entity.vel.copy();

			if ( ndot < 0 ) {
				let advance = stepTotal;// - lastTotal;
				if ( advance < 0.05 ) advance = 0; // at wall, running into wall, don't move at all

				entity.pos.add( entity.vel.times( advance ) );
				entity.vel.sub( contact.normal.times( ndot )).scale( 1 - advance );

				lastTotal = stepTotal; // not sure if this is necessary
			}

			// object pushes player
			let push = contact.vel.copy();

			let v1 = entity.vel.unit();
			let v2 = contact.vel.unit();

			if ( v1.dot( v2 ) > 0 ) {
				push.sub( v2.times( v1.dot( v2 ) ) );	
			}
			
			let ahead = entity.pos.minus( contact.point ).dot( push ) > 0;
			if ( ahead ) {
				entity.vel.add( push.times( step - stepTotal ) );

				// potential crush directions
				anyEqual = false;
				let pushDir = contact.vel.unit();

				for ( let dir of pushDirs ) {
					if ( dir.equals( pushDir ) ) {
						anyEqual = true;
					}
				}

				if ( !anyEqual ) {
					pushDirs.push( pushDir );
				}
			}
		}

		stepTotal += partialStep;
	}

	let crushed = false;
	for ( let dir of pushDirs ) {
		for ( let otherDir of blockedDirs ) {
			if ( otherDir == dir ) continue;

			if ( otherDir.dot( dir ) < -0.95 ) crushed = true;
		}
	}

	return { blockedDirs: blockedDirs, crushed: crushed };
}