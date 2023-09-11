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
	}

	takeInput() {

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

	collide( grid: GridArea ) {
		for ( let entity of this.entities ) {
			entity.clearCollisionData();
		}

		for ( let entity of this.entities ) {
			grid.collide( entity );
		}
	}

	update( step: number, elapsed: number ) {
		for ( let entity of this.entities ) {
			entity.update( step, elapsed );
		}
	}
		
	cull() {
		cullList( this.entities );
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
		
		this.entities.push( entity );
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
			if ( Debug.LOG_COLLISION ) entity.drawCollisionBox( context );
		}
	}
}