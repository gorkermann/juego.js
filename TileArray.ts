///////////////
// TILEARRAY //
///////////////

/*
	Expanded array class with lots of useful operations

	getSub:
		Return a sub-array. Pads with zeros if an out-of-range subarray is specified
	
		col, row: row and column of top-left element of subarray
		width, height: dimensions of subarray in columns and rows
		
	map:	
		Perform an operation using each element of the array
	
*/
export class TileArray {

	rowlength: number;	// int
	collength: number;	// int
	tiles: Array<any>;

	constructor( rowlength: number, tiles: Array<any> ) {
		this.rowlength = rowlength;
		this.tiles = tiles;
		this.collength = this.tiles.length / this.rowlength;
	}

	static deepcopy( data: TileArray ): TileArray {
		return new TileArray( data.rowlength, data.tiles.slice(0) );
	}
	
	validIndices( r: number, c: number ): boolean {
		return ( c >= 0 && c < this.rowlength && r >= 0 && r < this.collength );
	}
	
	getSub( row: number, col: number, width: number, height: number ): TileArray {
		let sub = [];
		
		for ( let r: number = row; r < row + height; r++ ) {
			for ( let c: number = col; c < col + width; c++ ) {
				if ( !this.validIndices( r, c ) ) sub.push( 0 );
				else {
					sub.push( this.get( r, c ) );
				}
			}
		}
		
		return new TileArray( width, sub );
	}
	
	map( func: ( arg0: number, arg1: number, arg2: number ) => any ): void {
		for ( let r: number = 0; r < this.collength; r++ ) {
			for ( let c: number = 0; c < this.rowlength; c++ ) {
				func( r, c, this.get( r, c ) );
			}
		}
	}
	
	get( r: number, c: number ): any {
		if ( this.validIndices( r, c ) ) return this.tiles[r * this.rowlength + c];
		else return 0;
	}
	
	set( r: number, c: number, val: any ): void {
		if ( this.validIndices( r, c ) ) this.tiles[r * this.rowlength + c] = val;
	}

	clear() {
		for ( let r: number = 0; r < this.collength; r++ ) {
			for ( let c: number = 0; c < this.rowlength; c++ ) {
				this.set( r, c, 0 );
			}
		}		
	}
}