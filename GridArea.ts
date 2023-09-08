import { Entity } from "./Entity.js"
import { Line } from "./Line.js"
import { AnimatedImage } from "./image.js"
import { Material } from './Material.js'
import { RayHit, closestTo } from "./RayHit.js"
import { Region } from "./Region.js"
import { ScrollBox } from "./ScrollBox.js"
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
	probeLayer: TileArray = null;

	spawnLayer: TileArray = null;
	
	tileWidth: number = 0;
	tileHeight: number = 0;

	image: AnimatedImage = null;

	shapes: Array<Shape> = [];

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

				gridArea.probeLayer = TileArray.deepcopy( gridArea.collisionLayer );
				gridArea.probeLayer.clear();

			} else if ( fileLayer.name.toLowerCase() == "spawn" ) {
				gridArea.spawnLayer = layer;
				
			} else {
				gridArea.drawLayers.push( layer );
			}
		}

		this.shapes = [];
		let pos: Vec2 = new Vec2();

		for (let c = 0; c <= this.hTiles; c++ ) {
			for (let r = 0; r <= this.vTiles; r++ ) {
				let index = this.collisionLayer.get( r, c );
			
				pos.setValues( c * this.tileWidth, r * this.tileHeight );

				if ( index > 0 ) {
					let shape = Shape.makeRectangle( pos.copy(), 
													 this.tileWidth,
													 this.tileHeight );

					shape.material = new Material( data.hue, 1.0, 0.3 );
					shape.materialTop = new Material( data.hue, 1.0, 0.5 );

					this.shapes.push( shape );
				}
			}
		}

		return new Promise( function(resolve, reject) {
			resolve(0);
		}); 
/*
		for ( let tileset of levelData.tilesets ) {
			
			if ( tileset.name.toLowerCase() == "collision" ) {
				if ( gridArea.collisionLayer != null ) {

					gridArea.collisionLayer.map( function( r, c, val ) {
						let newVal = val - tileset.firstgid;
						if ( newVal < 0 ) newVal = 0;
					
						gridArea.collisionLayer.set( r, c, newVal );
					} ); 
				}
			} else if ( tileset.name.toLowerCase() == "spawn" ) {
				if ( gridArea.spawnLayer != null ) {

					gridArea.spawnLayer.map( function( r, c, val ) {
						let newVal = val - tileset.firstgid;
						if ( newVal < 0 ) newVal = 0;
					
						gridArea.spawnLayer.set( r, c, newVal );
					} ); 
				}			
			} else {
				gridArea.image = new AnimatedImage( tileset.image, tileset.tilewidth, tileset.tileheight, 0, 0, []);
			}										
		}	
		*/
	
	}

	bouncecast( line: Line, maxBounces: number ): Array<Vec2> {
		let points: Array<Vec2> = [];	
		points.push( line.p1 );

		let line2: Line = line.copy();

		do {
			let rayHit = this.shapecast( line2 );
			if ( rayHit ) {
				points.push( rayHit.point );

				if ( !rayHit.material ) break;

				let dir = rayHit.reflect( line2.getDirection() );

				line2.p1.set( rayHit.point.plus( dir.times( 3 ) ) );
				line2.p2.set( line2.p1.plus( dir.times( 300 ) ) );
			} else {
				points.push( line2.p2 );

				break;
			}
		} while( points.length < maxBounces );

		return points;
	}

	shapecast( line: Line, shapes: Array<Shape>=this.shapes ): RayHit | null {
		let closestRayHits: Array<RayHit> = [];

		for ( let shape of shapes ) {
			let rayHits: Array<RayHit> = shape.rayIntersect( line );

			if ( rayHits.length > 0 ) closestRayHits.push( rayHits[0] );
		}

		if ( closestRayHits.length > 0 ) {
			closestRayHits.sort( closestTo( line.p1 ) );

			return closestRayHits[0]; 
		} else {
			return null;
		}	
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

	/*
		collide()
		Test an entity against the solid parts of the level, prevent it from going through walls
	 
	 	entity - the Entity that will be tested for collision
	*/			
	collide( entity: Entity ): void {
		if ( null === this.collisionLayer ) return;

		let block: Region = new Region( new Vec2( 0, 0 ), this.tileWidth, this.tileHeight );

		let cmin: number = Math.floor( entity.pos.x / this.tileWidth ) - 1;
		let cmax: number = Math.ceil( ( entity.pos.x + entity.width ) / this.tileWidth  );
		let rmin: number = Math.floor( entity.pos.y / this.tileHeight ) - 1;
		let rmax: number = Math.ceil( ( entity.pos.y + entity.height ) / this.tileHeight );

		for (let c = cmin; c <= cmax; c++ ) {
			for (let r = rmin; r <= rmax; r++ ) {
				if ( c >= 0 && c < this.hTiles && r >= 0 && r < this.vTiles ) {
					let index = this.collisionLayer.get( r, c );
				
					if ( index > 0 ) {
						block.pos.x = c * this.tileWidth;
						block.pos.y = r * this.tileHeight;
						
						this.probeLayer.set( r, c, 1 );
					}

					switch ( index ) {
						case 1: // Solid
							entity.collideWith( block );
							break;
					} 
				}
			}
		}		
	}	

	overlaps( entity: Entity ): boolean {
		if ( null === this.collisionLayer ) return;

		let block: Region = new Region( new Vec2( 0, 0 ), this.tileWidth, this.tileHeight );

		let cmin: number = Math.floor( entity.pos.x / this.tileWidth ) - 1;
		let cmax: number = Math.ceil( ( entity.pos.x + entity.width ) / this.tileWidth  );
		let rmin: number = Math.floor( entity.pos.y / this.tileHeight ) - 1;
		let rmax: number = Math.ceil( ( entity.pos.y + entity.height ) / this.tileHeight );

		for (let c = cmin; c <= cmax; c++ ) {
			for (let r = rmin; r <= rmax; r++ ) {
				if ( c >= 0 && c < this.hTiles && r >= 0 && r < this.vTiles ) {
					let index = this.collisionLayer.get( r, c );
				
					if ( index > 0 ) {
						block.pos.x = c * this.tileWidth;
						block.pos.y = r * this.tileHeight;
						
						this.probeLayer.set( r, c, 1 );
					}

					switch ( index ) {
						case 1: // Solid
							if ( entity.overlaps( block, 1.0 ).length > 0 ) {
								return true;
							}
							break;
					} 
				}
			}
		}

		return false;
	}	

	draw( context: CanvasRenderingContext2D ) {
		
		let _this: GridArea = this;

		for ( let shape of this.shapes ) {
			shape.fill( context );
		}

		if ( Debug.LOG_COLLISION ) {

			// Draw the collision layer
			if ( this.collisionLayer != null ) {
				this.collisionLayer.map( function( r, c, val ) {
					if ( val > 0 ) {

						context.fillStyle = 'red';

						if ( _this.probeLayer.get( r, c ) > 0 ) {
							context.fillStyle = "blue";
						}

						context.fillRect( c * _this.tileWidth, r * _this.tileHeight, 28, 28 );
					}
				} );
			}

			this.probeLayer.clear();
		}
	}
}