import { Contact } from './Contact.js'
import { Entity } from './Entity.js'
import { Vec2 } from './Vec2.js'

import { Debug } from './Debug.js'

function pushUnique<Type>( newObj: Type, list: Array<Type>, compare: ( a: Type, b: Type ) => boolean ) {
	for ( let obj of list ) {
		if ( compare( newObj, obj ) ) return;
	}

	list.push( newObj );
}

function solverDirCompare( dir1: Contact, dir2: Contact ) {
	return dir1.normal.equals( dir2.normal );
}

export type SolverResult = {
	blockedDirs: Array<Vec2>,
	crushed: boolean,
	crusher: Entity
}

let VEL_EPSILON = 0.001;

export function solveCollisionsFor( entity: Entity, otherEntities: Array<Entity>, solidMask: number, pushMask: number, step: number ): SolverResult {
	let stepTotal = 0.0;
	let lastTotal = 0.0;
	let contacted: Entity = null;
	let shapes = [];
	let blockedContacts: Array<Contact> = [];
	let pushContacts: Array<Contact> = [];

	let minPartialStep = 0.05;

	let babyStep = true;
	let iterations = 0;

	while ( stepTotal < step ) {
		let partialStep = step - stepTotal;

		if ( babyStep ) partialStep = minPartialStep + 0.01; // slightly more than threshold so collision runs once
		babyStep = false;

		let solidContacts = [];

		while ( partialStep > minPartialStep ) {
			solidContacts = [];
			contacted = null;

			// debug draw
			/*if ( ( window as any ).context ) {
				for ( let entity of otherEntities ) {
					let shapes = entity.getShapes( stepTotal + partialStep );

					for ( let shape of shapes ) {
						shape.stroke( ( window as any ).context );
					}
				}

				let shapes = entity.getShapes( stepTotal + partialStep );

				for ( let shape of shapes ) {
					shape.stroke( ( window as any ).context );
				}
			}*/ // debug draw

			// TODO: rank contacts
			for ( let otherEntity of otherEntities ) {
				if ( !entity.canBeHitBy( otherEntity ) ) continue; // TODO: this breaks sub-entity collisions? (parent is ETHEREAL, child is LEVEL?)

				// TODO: invalidate cache[1] once velocity is changed?
				let contacts = entity.overlaps( otherEntity, stepTotal + partialStep, true );
				
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
				babyStep = true; // if there is contact on this partial step, there will likely be on the next, so start small
			} else {
				break;
			}
		}

		 // debug draw
		/*if ( ( window as any ).context ) {
			//context.clearRect( 0, 0, canvas.width, canvas.height );

			shapes.push( ...entity.getShapes( stepTotal + partialStep ) );
			if ( contacted ) shapes.push( ...contacted.getShapes( stepTotal + partialStep ) );
			
			for ( let shape of shapes ) {
				shape.stroke( ( window as any ).context );
			}
		}*/ // debug draw

		for ( let contact of solidContacts ) {
			
			/* player hits something, cancel player velocity in object direction */
			let ndot = entity.vel.dot( contact.normal );
			
			if ( ndot <= 0.0001 ) {
				pushUnique( contact, blockedContacts, solverDirCompare );

				let advance = stepTotal - lastTotal; // uncommented, fixes closing-V error
				if ( advance < minPartialStep ) advance = 0; // at wall, running into wall, don't move at all

				entity.pos.add( entity.vel.times( advance ) );
				entity.vel.sub( contact.normal.times( ndot ) ).scale( 1 - advance );

				lastTotal = stepTotal; // not sure if this is necessary
			}

			/* object pushes player */ 
			if ( contact.otherSub.collisionGroup & pushMask ) {
				let len = contact.vel.length();

				if ( len > VEL_EPSILON ) {
					let push = contact.vel.copy();

					// cancel part of contact velocity parallel to player velocity (i.e. don't double-add this)
					let dir = contact.vel.times( 1 / len ); // reuse len instead of calling unit() here
					let vdot = dir.dot( entity.vel );

					if ( vdot > 0 ) {
						push.sub( dir.times( vdot ) );
					}

					// check if push is in the same direction as the contact
					let ahead = entity.pos.minus( contact.point ).dot( push ) > 0;
					if ( ahead ) {

						// add push to player velocity
						entity.vel.add( push.times( step - stepTotal ) );

						// potential crush directions
						pushUnique( contact, pushContacts, solverDirCompare );
					}
				}
			}
		}

		// cancel pushes in blocked directions
		for ( let blockedContact of blockedContacts ) {
			if ( pushContacts.includes( blockedContact ) ) continue;

			let pdot = entity.vel.dot( blockedContact.normal );
			if ( pdot < 0 ) {
				entity.vel.sub( blockedContact.normal.times( pdot ) );
			}
		}

		stepTotal += partialStep;
		iterations += 1;
	}

	if ( Debug.LOG_COLLISION ) {
		console.log( 'collisionSolver: ' + iterations + ' iterations' );
	}

	let crushed = false;
	let crusher = null;
	for ( let pushContact of pushContacts ) {
		for ( let blockedContact of blockedContacts ) {
			if ( blockedContact == pushContact ) continue;
			if ( blockedContact.otherSub == pushContact.otherSub ) continue;

			if ( blockedContact.normal.dot( pushContact.normal ) < -0.95 ) {
				crushed = true;
				crusher = pushContact.otherSub;
			}
		}
	}

	return { blockedDirs: blockedContacts.map( x => x.normal ), crushed: crushed, crusher: crusher };
}