///////////////
// SCROLLBOX //
///////////////

import { capIndex } from "../util.js"

/*
	Handles the scrolling window of tiles the player sees as the level progresses. 
	Doesn't actually contain any data about the level, just the size of the screen.	
*/

export class ScrollBox {
	
	canScrollV: boolean = true; // Vertical scrolling allowed
	canScrollH: boolean = true; // Horizontal scrolling allowed

	scale: number = 1.0;		// Drawing scale

	
	/* Quantities measured in TILES */

	// Constant with scrolling 
	hTiles: number = 0; 		// Horizontal Tiles, width of the map in tiles
	vTiles: number = 0; 		// Vertical Tiles, height of the map in tiles
	numTiles: number = 0; 		// Total number of tiles in map
	 
	// Change with scrolling 
	hLoTileIndex: number = 0; 	// Horizontal Low Tile Index, the leftmost tile that can be seen in the viewport
	hHiTileIndex: number = 0; 	// Horizontal High Tile Index, the rightmost tile that can be seen in the viewport
	vLoTileIndex: number = 0; 	// Vertical Low Tile Index, the topmost tile that can be seen in the viewport
	vHiTileIndex: number = 0; 	// Vertical High Tile Index, the bottommost tile that can be seen in the viewport
	
	/* Quantities measured in PIXELS */
	
	// Constant with scrolling 
	tileW: number = 0; 			// Tile Width, in pixels
	tileH: number = 0; 			// Tile Height, in pixels
	viewportW: number = 0; 		// Viewport Width, width of the visible area in pixels
	viewportH: number = 0; 		// Viewport Height, height of the visible area in pixels
	hPixels: number = 0; 		// Horizontal Pixels, width of the map in pixels
	vPixels: number = 0; 		// Vertical Pixels, height of the map in pixels
	
	// Change with scrolling
	hScrollSpeed: number = 0;  	// Horizontal scrolling speed
	vScrollSpeed: number = 0;  	// Vertical scrolling speed
	hScroll: number = 0; 		// Horizontal Scroll, horizontal offset (x-axis) from the origin in pixels
	vScroll: number = 0; 		// Vertical Scroll, vertical offset (y-axis) from the origin in pixels
	hOffset: number = 0; 		// Horizontal Offset, horizontal distance (x-axis) from the upper-left corner of the viewport going left to the nearest gridline
	vOffset: number = 0; 		// Vertical Offset, vertical distance (y-axis) from the upper-left corner of the viewport going up to the nearest gridline

	hShake: number = 0; 		// Horizontal Shake, measured in pixels
	vShake: number = 0;			// Vertical Shake, measured in pixels

	constructor( hTiles: number, vTiles: number, tileW: number, tileH: number ) {
		this.hTiles = hTiles;
		this.vTiles = vTiles;
		this.tileW = tileW;
		this.tileH = tileH;

		this.numTiles = this.hTiles * this.vTiles;
		this.hPixels = this.hTiles * this.tileW;
		this.vPixels = this.vTiles * this.tileH;
	
		this.updateScroll();
	}

	/*
		screen*ToTile
		Take screen coordinates and transfer them to the grid
	*/
	screenXToTile( posX: number ): number {
		return capIndex( Math.floor( ( posX / this.scale + this.hScroll ) / this.tileW ), 0, this.hTiles );
	}

	screenYToTile( posY: number ): number {
		return capIndex( Math.floor( ( posY / this.scale + this.vScroll ) / this.tileH ), 0, this.vTiles );
	}

	/*
		screen*ToPixel
		Convert screen coordinates to world pixel coordinates
	*/
	screenXToPixel ( posX: number ): number {
		return posX / this.scale + this.hScroll;
	}

	screenYToPixel ( posY: number ): number {
		return posY / this.scale + this.vScroll;
	}

	/*
		snap*ToGrid()
		Get the grid index of the tile a point is inside
	*/
	snapXToGrid ( posX: number ): number {
		return this.screenXToTile( posX ) * this.tileW;
	}

	snapYToGrid ( posY: number ): number {
		return this.screenYToTile( posY ) * this.tileH;
	}

	/*
		setScroll()
	*/
	setScroll( hScroll: number, vScroll: number ) {
		if ( this.canScrollH ) this.hScroll = hScroll;
		if ( this.canScrollV ) this.vScroll = vScroll;
		
		this.updateScroll();
	}

	/* 
		shake()
	*/
	shake( hShake: number, vShake: number ) {
		this.hShake = hShake;
		this.vShake = vShake;
	}

	/*
		updateScroll()
		Update the horizontal and vertical scroll values
	*/
	updateScroll() {

		let hScroll = this.hScroll;
		let vScroll = this.vScroll;

		if ( this.canScrollH ) hScroll += this.hScrollSpeed;
		if ( this.canScrollV ) vScroll += this.vScrollSpeed;

		if ( this.hPixels > this.viewportW ) { // If the whole map does not fit in the viewport horizontally, we can scroll
			
			this.hScroll = capIndex(hScroll, 0, this.hPixels - this.viewportW );
			this.hLoTileIndex = Math.floor( this.hScroll / this.tileW );
			this.hHiTileIndex = Math.ceil( ( this.hScroll + this.viewportW ) / this.tileW );
			this.hOffset = this.hLoTileIndex * this.tileW - this.hScroll;
			
		} else { // If the whole map fits in the viewport horizontally, center the map
		
			this.hScroll = ( this.hPixels - this.viewportW ) / 2;
			this.hLoTileIndex = 0;
			this.hHiTileIndex = this.hTiles;
			this.hOffset = 0;
		}
		
		if ( this.vPixels > this.viewportH ) { // If the whole map does not fit in the viewport vertically, we can scroll
		
			this.vScroll = capIndex( vScroll, 0, this.vPixels - this.viewportH );
			this.vLoTileIndex = Math.floor( this.vScroll / this.tileH);
			this.vHiTileIndex = Math.ceil( ( this.vScroll + this.viewportH ) / this.tileH );
			this.vOffset = this.vLoTileIndex * this.tileH - this.vScroll;
			
		} else { // If the whole map fits in the viewport vertically, center the map
		
			this.vScroll = ( this.vPixels - this.viewportH ) / 2;
			this.vLoTileIndex = 0;
			this.vHiTileIndex = this.vTiles;
			this.vOffset = 0;
		}

		this.hShake = -this.hShake * 0.75;
		this.vShake = -this.vShake * 0.75;
	}

	/* 
		translateContext
		Move a drawing context to the location indicated by this object
	*/
	translateContext( context: CanvasRenderingContext2D ): void {
		context.translate( -this.hScroll + this.hShake, -this.vScroll + this.vShake );
	}
}