import { create } from './domutil.js'

export class Dropdown {
	dom: HTMLSelectElement;

	constructor( id: string=null, vals: Array<string>=[] ) {
		if ( typeof document !== 'undefined' ) {
			if ( id ) {
				this.dom = document.getElementById( id ) as HTMLSelectElement;
			} else  {
				this.dom = document.createElement( 'select' );
			}
		
			this.dom.setAttribute( 'autocomplete', 'off' );
		}

		for ( let val of vals ) {
			this.addOption( val );
		}
	}

	addOption( name: string, value: string='' ): HTMLOptionElement {
		if ( name == '' ) {
			throw new Error( 'Dropdown.addOption: cannot add blank option' );
		}

		if ( value == '' ) value = name;

		let foundChild: boolean = false;

		for ( let child of this.dom.options ) {
			if ( child.innerHTML == name ) {
				child.value = value;
				foundChild = true;
			}
		}

		if ( !foundChild ) {
			let option = create( 'option' ) as HTMLOptionElement;
			option.innerHTML = name;

			option.value = value;

			this.dom.appendChild( option );

			return option;
		}

		return null;
	}

	select( val: string | number, trigger: boolean=true ) {
		let oldIndex = this.dom.selectedIndex;

		if ( typeof( val ) == 'string' ) {
			for ( let i = 0; i < this.dom.options.length; i++ ) {
				if ( this.dom.options[i].innerHTML == val ) {
					this.dom.selectedIndex = i;
					break;
				}
				if ( this.dom.options[i].value == val ) {
					this.dom.selectedIndex = i;
					break;
				}
			}

		} else if ( typeof val == 'number' ) {
			val = Math.floor( val );

			if ( val >= 0 && val < this.dom.options.length ) {
				this.dom.selectedIndex = val;
			}
		}

		if ( this.dom.selectedIndex != oldIndex && trigger ) {
			this.dom.dispatchEvent( new Event( 'change' ) );
		}
	}

	selectNone() {
		this.dom.selectedIndex = -1;
	}

	selectFirstAvail() {
		for ( let i = 0; i < this.dom.options.length; i++ ) {
			if ( !this.dom.options[i].disabled ) {
				this.dom.selectedIndex = i;
				return;
			}
		}

		this.selectNone();
	}

	hasOption( val: string ): boolean {
		for ( let i = 0; i < this.dom.options.length; i++ ) {
			if ( this.dom.options[i].innerHTML == val ) {
				return true;
			}
			if ( this.dom.options[i].value == val ) {
				return true;
			}			
		}

		return false;
	} 

	getSelectedOption(): string {
		if ( this.dom.selectedIndex < 0 || 
			 this.dom.selectedIndex >= this.dom.options.length ) {
			return '';
		}

		return this.dom.options[this.dom.selectedIndex].value;
	}	

	clear() {
		while ( this.dom.firstChild ) {
			this.dom.removeChild( this.dom.firstChild );
		}
	}
}