import { Entity } from "./Entity.js"
import { Line } from "./Line.js"
import { AnimatedImage } from "./image.js"
import { Material } from './Material.js'
import { RayHit, closestTo } from "./RayHit.js"
import { Shape } from "./Shape.js"
import { TileArray } from "./TileArray.js"
import { Vec2 } from "./Vec2.js"

import { Debug } from "./Debug.js"

//////////////
// GRIDAREA //
//////////////

/*
	Class that holds and maintains all of the data used for a gridArea.
	This "data" amounts to:
		-the width (hTiles) and height (vTiles) of the level in tiles
		-several grids of tiles ("layers"):
			-drawing layers for visuals
			-a collision layer for interaction with the level
			-a spawn layer for specifying points where objects will be created
		-the tile size of the images used in the level
		-several scrolling backgrounds
		-an image to use for the draw layers
		
		loadFromTiledJSON() - Read level data from a JSON file written by the tile editor program Tiled
		getCollisionData() - Reads from the collision layer
		getSpawnData() - Reads from the spawn layer
		setSpawnData() - Writes to the spawn layer
		collide() - Tests an entity for collision against the collision layer and corrects overlap with solid regions
		draw() - Draws the background and visible layers of the level
		
		Usage:
			loadFromTiledJSON
				call once, before the level has started
			getCollisionData
				not necessary to call externally, but may be useful for predictive AI
			getSpawnData
			setSpawnData
				use when creating entities - call getSpawnData to find spawn points, and setSpawnData to clear them so they're only used once
			collide
				call once per entity per cycle
			draw
				call once per cycle 
*/

export class GridArea {
	hTiles: number = 0;
	vTiles: number = 0;
	
	drawLayers: Array<TileArray> = [];
	
	collisionLayer: TileArray = null;
	spawnLayer: TileArray = null;
	
	tileWidth: number = 0;
	tileHeight: number = 0;

	constructor() {}

	/*
		loadFromTiledJSON
		Load a tilemap made with the map editor program Tiled
	 	
	 	levelFileName: name of the level file
	 	callback: function to call when the level has finished loading
	*/	

	load( data: any ): Promise<any> {
		let gridArea: GridArea = this;

		gridArea.hTiles = data.width;
		gridArea.vTiles = data.height;
		gridArea.tileWidth = data.tilewidth;
		gridArea.tileHeight = data.tileheight;
		
		for ( let fileLayer of data.layers ) {
			
			let layer: TileArray = new TileArray( data.width, fileLayer.data );
			
			if ( fileLayer.name.toLowerCase() == "collision" ) {
				gridArea.collisionLayer = layer;

			} else if ( fileLayer.name.toLowerCase() == "spawn" ) {
				gridArea.spawnLayer = layer;
				
			} else {
				gridArea.drawLayers.push( layer );
			}
		}

		return new Promise( function(resolve, reject) {
			resolve(0);
		}); 
	}
		 
	/*
		getCollisionData
		Return data from the collision layer

		row, col: position in collision array
	 */
	getCollisionData( row: number, col: number ): number {
		if ( this.collisionLayer === null ) {
			return 0;
		} else {
			return this.collisionLayer.get( row, col );
		}
	}

	/*
		getSpawnData
		Return data from the spawn layer

		row, col: position in the spawn array
	 */	
	getSpawnData( row: number, col: number ) {
		if ( this.spawnLayer === null ) return 0;

		return this.spawnLayer.get( row, col );
	}
		
	/*
		setSpawnData()
		Set data from the spawn layer

		row, col: 
		val: value to write
	 */	
	setSpawnData( row: number, col: number, val: number ) {
		if ( this.spawnLayer === null ) return;

		this.spawnLayer.set( row, col, val );
	}
}