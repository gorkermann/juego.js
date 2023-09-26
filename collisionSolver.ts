import { Contact } from './Contact.js'
import { Entity } from './Entity.js'
import { Vec2 } from './Vec2.js'

import { Debug } from './Debug.js'

let canvas: HTMLCanvasElement;
let context: CanvasRenderingContext2D;

if ( typeof window != 'undefined' ) {
	canvas = ( window as any ).canvas;
	context = ( window as any ).context;
}

function pushUnique<Type>( newObj: Type, list: Array<Type>, compare: ( a: Type, b: Type ) => boolean ) {
	for ( let obj of list ) {
		if ( compare( newObj, obj ) ) return;
	}

	list.push( newObj );
}

function solverDirCompare( dir1: SolverDir, dir2: SolverDir ) {
	return dir1.dir.equals( dir2.dir );
}

export type SolverDir = {
	dir: Vec2,
	contact: Contact
}

export type SolverResult = {
	blockedDirs: Array<Vec2>,
	crushed: boolean,
	crusher: Entity
}

export function solveCollisionsFor( entity: Entity, otherEntities: Array<Entity>, solidMask: number, step: number ): SolverResult {
	let stepTotal = 0.0;
	let lastTotal = 0.0;
	let contacted: Entity = null;
	let shapes = [];
	let blockedDirs: Array<SolverDir> = [];
	let pushDirs: Array<SolverDir> = [];

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
			
			//pushUnique( { dir: contact.normal.copy(), contact: contact }, blockedDirs, solverDirCompare );

			/* player hits something, cancel player velocity in object direction */
			let ndot = entity.vel.dot( contact.normal );
			
			if ( ndot <= 0 ) {
				pushUnique( { dir: contact.normal.copy(), contact: contact }, blockedDirs, solverDirCompare );

				let advance = stepTotal;// - lastTotal;
				if ( advance < minPartialStep ) advance = 0; // at wall, running into wall, don't move at all

				entity.pos.add( entity.vel.times( advance ) );
				entity.vel.sub( contact.normal.times( ndot ) ).scale( 1 - advance );

				lastTotal = stepTotal; // not sure if this is necessary
			}

			/* object pushes player */
			let push = contact.vel.copy();

			// cancel part of contact velocity parallel to player velocity (i.e. don't double-add this)
			let dir = contact.vel.unit();
			let vdot = dir.dot( entity.vel );

			if ( vdot > 0 ) {
				push.sub( dir.times( vdot ) );
			}
			
			// add push to player velocity
			let ahead = entity.pos.minus( contact.point ).dot( push ) > 0;
			if ( ahead ) {
				entity.vel.add( push.times( step - stepTotal ) );

				// potential crush directions
				pushUnique( { dir: dir, contact: contact }, pushDirs, solverDirCompare );
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
	for ( let dir of pushDirs ) {
		for ( let otherDir of blockedDirs ) {
			if ( otherDir == dir ) continue;

			if ( otherDir.dir.dot( dir.dir ) < -0.95 ) {
				crushed = true;
				crusher = dir.contact.otherSub;
			}
		}
	}

	return { blockedDirs: blockedDirs.map( x => x.dir ), crushed: crushed, crusher: crusher };
}