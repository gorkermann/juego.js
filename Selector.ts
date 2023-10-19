import { Vec2 } from './Vec2.js'

import { Selectable } from './Selectable.js'
import { Hoverlist } from './Hoverlist.js'

type SelectOptions = {
	sticky?: boolean;
	all?: boolean;
}

export type Filter<Type> = {
	types: Array<typeof Object>;
	func?: ( prim: Type ) => boolean
}

type filterOptions = {
	doFilter?: boolean;
}

export class Selector<Type extends Selectable<Type>> {
	availablePrims: Array<Type>; // link to another array

	selection: Array<Type> = []; // internal array

	selectionFilter: Array<typeof Object> = []; // types to select
	rejectionFilter: Array<typeof Object> = [];
	filterFunc: ( prim: Type ) => boolean;

	hoverlist: Hoverlist<Type>;
	//hoverFont: Font = new Font( 14 );

	constructor( prims: Array<Type> ) {
		this.availablePrims = prims;

		this.hoverlist = new Hoverlist();
	}

	/* Hoverlist */

	// does NOT empty the hover list! (so that it doesn't get reordered)
	clearHovered() {
		for ( let obj of this.availablePrims ) {
			obj.hovered = false;
			obj.preselected = false;
		}

		for ( let obj of this.hoverlist.list ) {
			obj.hovered = false;
			obj.preselected = false;
		}
	}

	updateHovered( p?: Vec2 ) {
		let anyAdded: boolean = false;

		// find hovered objects
		for ( let obj of this.availablePrims ) {

			// filter out unwanted Selectables
			if ( !this.passesFilters( obj ) ) {
				obj.hovered = false;
				obj.preselected = false;

				continue;
			}

			// check Selectable
			if ( p ) {
				anyAdded = this.hoverlist.add( obj.hover( p ) );
			}
		}

		this.hoverlist.cull();		
	}

	anyHovered(): boolean {
		return this.hoverlist.list.length > 0;
	}

	/* Selection */

	add( obj: Type ) {
		obj.selected = true;

		if ( this.selection.indexOf( obj ) < 0 ) {
			this.selection.push( obj );
		}
	}

	remove( obj: Type ) {
		obj.selected = false;
		obj.unselect();

		let i = this.selection.indexOf( obj );
		if ( i >= 0 ) {
			this.selection.splice( i, 1 );
		}
	}

	anySelected(): boolean {
		return this.selection.length > 0;
	}

	selectFirst(): Type {
		let newPrims = this.doSelect();

		if ( newPrims.length > 0 ) {
			return newPrims[0];
		} else {
			return null;
		}
	}

	doSelect( options: SelectOptions={}, target: Type=null ): Array<Type> {
		if ( options.sticky === undefined ) options.sticky = false;
		if ( options.all === undefined ) options.all = false;

		let newPrims: Array<Type> = [];

		if ( !options.sticky ) {
			this.unselectAll();
		}

		if ( !target && this.anyHovered() ) {
			target = this.hoverlist.getTarget();
		}

		if ( target ) {
			if ( options.sticky && target.selected ) {
				this.remove( target );

			} else {
				if ( options.all ) {
					for ( let obj of this.availablePrims ) {
						if ( obj.className == target.className ) {
							this.add( obj );
							newPrims.push( obj );
						}
					}
				} else {
					this.add( target );
					newPrims.push( target );
				}
			}
		}

		return newPrims;
	}

	unselectAll() {
		for ( let obj of this.availablePrims ) {
			obj.selected = false;
			obj.unselect();
		}

		this.selection = [];
	}

	/* Filter */

	passesFilters( prim: Type): boolean {
		if ( !prim ) { 
			return false;
		}

		let correctType = false;

		if ( this.selectionFilter.length == 0 ) { 
			correctType = true;

			for ( let type of this.rejectionFilter ) {
				if ( prim instanceof type ) {
					correctType = false;
				}
			}
		}

		for ( let type of this.selectionFilter ) {
			if ( prim instanceof type ) {
				correctType = true;
			}
		}		

		if ( correctType ) {
			if ( this.filterFunc ) {
				return this.filterFunc( prim );
			} else {
				return true;
			}
		}

		return false;
	}

	private filterSelection() {
		for ( let i = this.selection.length - 1; i >= 0; i-- ) {
			if ( !this.passesFilters( this.selection[i] ) ) {
				this.selection[i].selected = false;
				this.selection.splice( i, 1 );
			}
		}
	}

	applySelectionFilter( types: Array<typeof Object> | Filter<Type>, 
						  func: ( prim: Type ) => boolean=null,
						  options: filterOptions={} ) 
	{
		if ( options.doFilter === undefined ) options.doFilter = true;

		if ( types instanceof Array ) {
			this.selectionFilter = types;
			this.filterFunc = func;
		
		} else {
			this.selectionFilter = types.types;
			this.filterFunc = types.func;
		}

		if ( options.doFilter ) {
			this.filterSelection();
		}

		this.updateHovered( null );
	}

	applyRejectionFilter( types: Array<typeof Object> ) {
		if ( types.length == 0 && this.rejectionFilter.length == 0 ) {
			return;
		}

		this.rejectionFilter = types;

		this.filterSelection();
		this.updateHovered( null );
	}

	/* Drawing */

	/*draw( context: CanvasRenderingContext2D, p: Vec2 ) {
		// hover list
		let posX = p.x + 15; // offset to right of cursor
		let posY = p.y;
		let height = this.hoverFont.size + 2;

		for ( let obj of this.hoverlist.list ) {
			let text = obj.idString() + obj.debugString();

			context.fillStyle = obj.getColor( 'white' );
			
			if ( obj.selected ) {
				text = '[' + text + ']';
			} else {
				text = ' ' + text + ' ';
			}

			if ( prim == this.hoverlist.getTarget() ) {
				text += ' <--';
			}

			drawText( context, text, posX, posY, this.hoverFont, context.fillStyle );

			posY += height;
		}	
	}*/
}