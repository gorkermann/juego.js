import { Dict } from './util.js'

export type Range = 'int' | 'real' | Array<string> | RegExp;

export type Editable = {
	edit: ( varname: string, value: any ) => void; // usually rangeEdit, but can be another function
	editFields: Array<string>; // show editable value in panel
	showFields?: Array<string>; // show value in panel but don't edit 
	ranges: { [key: string]: Range };

	// these are related to specs and not used very much
	overrideFields?: Array<string>; // list of fields that have been overridden
	onUserEdit?: ( varname: string ) => void;
	userReq?: Dict<any>;
}

export function rangeEdit( this: Editable, varname: string, value: any ) {
	if ( value === undefined ) return;

	let ok = true;
	let oldVal = ( this as any )[varname];
	let range = this.ranges[varname];

	// number
	if ( typeof oldVal == 'number' ) {
		let raw = value;
		value = parseFloat( value );

		if ( isNaN( value ) || value == Infinity || value == -Infinity ) {
			throw new Error( 'rangeEdit: invalid value for field ' + varname + ' (' + raw + ')' );
		}

		if ( range !== undefined ) {
			if ( range == 'real' ) {
				// pass

			} else if ( range == 'int' ) {
				value = Math.floor( value );
			}

		// default number range is nonnegative integer
		} else {
			value = Math.floor( value );

			if ( value < 0 ) {
				ok = false;
			}	
		}

	// string
	} else if ( typeof oldVal == 'string' ) {
		if ( range !== undefined ) {
			if ( range instanceof Array ) {
				if ( !range.includes( value ) ) {
					ok = false;
				}

			} else if ( range instanceof RegExp ) {
				let match = value.match( range );

				if ( !match ) {
					ok = false;
				}
			}
		} else {
			// no default string range
		}
	}

	if ( ok ) {
		edit( this, varname, () => ( this as any )[varname] = value );
	}
}

export function edit( obj: any, varname: string, func: ( () => void ) | string | number | boolean | object ): boolean {
	let oldVal = obj[varname];

	if ( typeof func == 'string' || 
		 typeof func == 'number' ||
		 typeof func == 'boolean' ||
		 typeof func == 'object' ) {
	
		if ( typeof oldVal != typeof func ) {
			throw new Error( 'edit: type mismatch for field ' + varname + ' (' + typeof oldVal + '!=' + typeof func + ')' );
		}

		obj[varname] = func;
	
	} else if ( typeof func == 'function' ) {
		func();

	} else {
		throw new Error( 'Unhandled value type ' + ( typeof func ) );
	}

	if ( obj[varname] != oldVal ) {
		if ( typeof document !== 'undefined' ) {
			document.dispatchEvent( new CustomEvent( 'editObject', { detail: obj } ) );
		}

		return true;
	}

	return false;
}