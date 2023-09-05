///////////////////
// ENTITYMANAGER //
///////////////////

/*
	Manages a group of entities
*/

import { Debug } from "./Debug.js"
import { Entity } from "./Entity.js"
import { GridArea } from "./GridArea.js"

let overlapList = function( entity: Entity, list: Array<Entity> ) {
	for ( let otherEntity of list ) {
		
		/*if ( 	 !( entity.collisionGroup == GROUP.none ) &&
				( ( entity.collisionGroup == GROUP.all ) || ( otherEntity.collisionGroup == GROUP.all ) || 
					( entity.collisionGroup != otherEntity.collisionGroup ) ) && */
		if ( entity.overlaps( otherEntity ) ) {
			
			otherEntity.hitWith( entity );
			entity.hitWith( otherEntity );
		}
	}	
}

let cullList = function( list: Array<Entity> ) {
	for ( let e = list.length - 1; e > 0; e-- ) {
		if ( list[e].removeThis ) list.splice( e, 1 );
	}	
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

	collide( grid: GridArea ) {
		for ( let entity of this.entities ) {
			entity.clearCollisionData();
		}

		for ( let entity of this.entities ) {
			grid.collide( entity );
		}
	}

	update() {
		for ( let entity of this.entities ) {
			entity.update();
		}
	}
		
	cull() {
		for ( let i = this.entities.length - 1; i >= 0; i-- ) {
			if ( this.entities[i].removeThis ) this.entities.splice( i, 1 );
		}
	}
		
	grab() {
		let spawnedEntities: Array<Entity> = [];

		this.doForAllEntities( function( entity ) {
			while( entity.hasSpawnedEntities() ) {
				spawnedEntities.push( entity.getSpawnedEntity() );
			}
		});
			
		this.insert( spawnedEntities );
	}

	insert( entities: Array<Entity> ) {
		for ( let newEntity of entities ) {
			this.entities.push( newEntity ); 
		}
	}
/*
	addSpawn( index:, object ) {
		this.spawns[index] = object;
	}

	spawn( scrollBox, level ) {
		
	}*/

	draw( context: CanvasRenderingContext2D ) {
		for ( let entity of this.entities ) {
			entity.draw( context );
			if ( Debug.LOG_COLLISION ) entity.drawCollisionBox( context );
		}
	}
}