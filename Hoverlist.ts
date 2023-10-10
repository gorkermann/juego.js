import { Selectable } from './Selectable.js'

export class Hoverlist<Type extends Selectable<Type>> {
	list: Array<Type> = [];
	hoverIndex: number = 0;

	constructor() {}

	/* Accessors */ 

	getTarget(): Type {
		if ( this.list.length < 1 ) { 
			return null;
		} else {
			return this.list[this.hoverIndex];
		}
	}

	setTarget( obj: Type ) {
		let index = this.list.indexOf( obj );

		if ( index >= 0 ) {
			this.hoverIndex = index;
		} else {
			this.add( [obj] );
			this.hoverIndex = 0;
		}
	}

	get( type: typeof Object ) {
		for ( let obj of this.list ) {
			if ( obj instanceof type ) {
				return obj;
			}
		}

		return null;
	}

	private preselect() {
		for ( let obj of this.list ) {
			obj.preselected = false;
		}

		if ( this.getTarget() ) {
			this.getTarget().preselected = true;
		}
	}

	advanceHoverIndex() {
		this.hoverIndex++;

		if ( this.hoverIndex >= this.list.length ) {
			this.hoverIndex = 0;
		}

		this.preselect();
	}

	add( objs: Array<Type> ): boolean {
		let anyAdded = false;

		for ( let obj of objs ) {
			if ( !obj ) continue;

			obj.hovered = true;

			if ( !this.list.includes( obj ) ) {
				this.list.unshift( obj );

				anyAdded = true;;
			}
		}

		this.preselect();

		return anyAdded;
	}

	remove( arg0: Type | number ) {
		let index = -1;

		if ( arg0 instanceof Object ) {
			index = this.list.indexOf( arg0 );

		} else {
			index = arg0;
		}

		if ( index >= 0 ) {
			this.list[index].hovered = false;
			this.list[index].preselected = false;

			this.list.splice( index, 1 ); 

			if ( this.hoverIndex > index ) {
				this.hoverIndex--;
			}

			this.boundIndex();
			this.preselect();
		}
	}

	// remove unhovered list
	cull() {
		for ( let i = this.list.length - 1; i >= 0; i-- ) {
			if ( !this.list[i].hovered || this.list[i].removeThis ) {
				this.remove( i );
			}
		}
	}

	boundIndex() {
		if ( this.list.length == 0 || this.hoverIndex < 0 ) {
			this.hoverIndex = 0;
		} else if ( this.hoverIndex >= this.list.length ) {
			this.hoverIndex = this.list.length - 1;
		}
	}
}