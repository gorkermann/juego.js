import { Contact } from './Contact.js'
import { Entity } from './Entity.js'
import { Vec2 } from './Vec2.js'

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
			
			//pushUnique( { dir: contact.normal.copy(), contact: contact }, blockedDirs, solverDirCompare );

			// player hits something, cancel player velocity in object direction
			let ndot = entity.vel.dot( contact.normal );
			let before = entity.vel.copy();

			if ( ndot <= 0 ) {
				pushUnique( { dir: contact.normal.copy(), contact: contact }, blockedDirs, solverDirCompare );

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
				push.sub( contact.vel.times( v1.dot( v2 ) ) );
			}
			
			let ahead = entity.pos.minus( contact.point ).dot( push ) > 0;
			if ( ahead ) {
				entity.vel.add( push.times( step - stepTotal ) );

				// potential crush directions
				pushUnique( { dir: contact.vel.unit(), contact: contact }, pushDirs, solverDirCompare );
			}
		}

		stepTotal += partialStep;
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