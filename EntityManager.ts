///////////////////
// ENTITYMANAGER //
///////////////////

/*
	Manages a group of entities
*/

import { Debug } from "./Debug.js"
import { Entity, cullList } from "./Entity.js"
import { GridArea } from "./GridArea.js"

import * as tp from './lib/toastpoint.js'

function parseJSON( jsonlist: Array<object>, toaster: tp.Toaster ): Array<Entity> {
	
	// expects a JSON object ( list of primitives )
	if ( !tp.checkSchema( jsonlist, 'Array_of_Primitive' ) ) {
		throw new Error( 'PrimitiveMgr.addFromJSON: bad object ' + jsonlist );
	}

	let ents: Array<Entity> = []

	// get skeleton objects
	for ( let obj of jsonlist ) {
		ents.push( tp.fromJSON( obj, toaster ) );
	}

	// reattach pointers
	tp.resolveList( ents, toaster );

	let output: Array<Entity> = [];

	for ( let ent of ents ) {
		if ( !ent ) continue;

		try {
			ent.init();
			output.push( ent );
			
		} catch ( ex ) {
			ent.destructor();
			console.error( ex );
		}
	}

	return output;
}

export class EntityManager {
	entities: Array<Entity> = [];
	entitiesById: Array<Entity> = [];

	constructor() {

	}

	// Do something for each entity
	// func should take a single argument, the entity
	doForAllEntities( func: ( entity: Entity ) => void ) {
		for ( let entity of this.entities ) {
			func( entity );
		}
	}

	clear() {
		this.entities = [];
		this.entitiesById = [];
	}

	/* Import/Export */

	// clear current primtives and load new ones
	addFromJSON( jsonlist: Array<object>, toaster: tp.Toaster ) {
		let newEntities = parseJSON( jsonlist, toaster );

		for ( let entity of newEntities ) {
			try {
				this.insert( entity );
				
			} catch( ex ) {
				console.log( entity );
				throw ex;
			}	
		}
	}

	getJSON( toaster: tp.Toaster ): Array<object> {
		this.insertSpawned();

		return tp.listToJSON( this.entities, toaster.constructors, toaster.nameMap );
	}

	/* Update */

	advance( step: number ) {
		for ( let entity of this.entities ) {
			entity.advance( step );
		}
	}

	animate( step: number, elapsed: number ) {
		for ( let entity of this.entities ) {
			entity._animateRecur( step, elapsed );
		}
	}	

	update() {
		for ( let entity of this.entities ) {
			entity._updateRecur();
		}
	}
		
	cull() {
		for ( let entity of this.entities ) {
			entity.cull();
		}

		for ( let i = this.entities.length - 1; i >= 0; i-- ) {

			if ( this.entities[i].removeThis ) {

				// free up ids
				this.entities[i].doForAllChildren( ( e: Entity ) => {
					this.entitiesById[e.id] = null;
					e.id = -1;
				} );

				// remove from lists
				this.entities.splice( i, 1 );
			}
		}
	}
		
	insertSpawned() {
		let list = this.entities;

		while ( list.length > 0 ) {
			let newEntities: Array<Entity> = [];

			for ( let prim of this.entities ) {
				while ( prim.spawned.length > 0 ) {
					let spawn = prim.spawned.shift();

					newEntities.push( spawn );
				}
			}

			for ( let spawn of newEntities ) {
				this.insert( spawn );
			}

			list = newEntities;
			newEntities = [];
		}
	}

	insert( entity: Entity ) {
		if ( this.entities.includes( entity ) ) return;

		if ( !entity.collisionGroup && !entity.isGhost ) {
			throw new Error( 'EntityManager.insert: Entity has no collision group set' );
		}

		this.entities.push( entity );

		entity.doForAllChildren( ( e: Entity ) => {
			if ( e.id < 0 || this.entitiesById[e.id] ) {

				// search for lowest unused id
				for ( let i = 0; i < this.entitiesById.length; i++ ) {
					if ( !this.entitiesById[i] ) {
						this.entitiesById[i] = e;
						e.id = i;

						break;
					}
				}

				if ( e.id < 0 ) {
					e.id = this.entitiesById.length;
					this.entitiesById.push( e );
				}

			} else {
				this.entitiesById[e.id] = e;
			}
		} );
	}

	insertList( entities: Array<Entity> ) {
		for ( let entity of entities ) {
			this.insert( entity );
		}
	}

	/* Drawing */

	shade() {
		for ( let entity of this.entities ) {
			entity.shade();
		}
	}

	draw( context: CanvasRenderingContext2D ) {
		for ( let entity of this.entities ) {
			entity.draw( context );
		}
	}
}