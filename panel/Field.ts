import { Debug } from '../Debug.js'
import { Dropdown } from '../Dropdown.js'
import { Editable, Range, rangeEdit } from '../Editable.js'
import { Entity } from '../Entity.js'
import { Vec2 } from '../Vec2.js'

import { create } from '../domutil.js'
import { unorderedArraysMatch, fancyType } from '../util.js'

function getSharedRange( objs: Array<Editable>, varname: string ): Array<string> {
	let shared: Array<string> = [];

	for ( let i = 0; i < objs.length; i++ ) {
		let range = objs[i].ranges[varname];

		if ( range === undefined ) continue;

		//if ( !isValidRange( range ) ) console.warn( '...' );

		if ( range && range instanceof Array ) {
			let list = range as Array<string>;

			if ( i == 0 ) {
				shared = list.slice();
			} else {
				shared = shared.filter( x => list.includes( x ) );
			}
		}
	}

	return shared;
}

export function getDisplayVarname( s: string ): string {
	let words = s.split(/([A-Z][a-z]+|_)/).filter( ( e: string ) => e && e != '_' );

	for ( let [i, word] of words.entries() ) {
		words[i] = word[0].toUpperCase() + word.slice(1);
	} 

	return words.join( ' ' );
}

export function createObjectLink( obj: object, text?: string ): HTMLDivElement {
	let link = create( 'div' ) as HTMLDivElement;
	link.classList.add( 'object-link' );

	if ( obj === null ) {
		link.innerHTML = 'null';

		return link;

	} else if ( obj === undefined ) {
		link.innerHTML = 'undefined';

		return link;
	} 

	link.innerHTML = fancyType( obj );

	if ( ( obj as any ).id === undefined ) {
		return link;
	}

	if ( text != undefined ) {
		link.innerHTML = text;
	}

	link.classList.add( 'nonempty' );

	link.onmouseup = () => {
		document.dispatchEvent( new CustomEvent( 'runCommand', { detail: { 
			commandName: 'Select Only', 
			options: { target: obj }
		} } ) );
	}

	link.onmouseenter = () => {
		document.dispatchEvent( new CustomEvent( 'runCommand', { detail: {
			commandName: 'Hover Only', 
			options: { target: obj }
		} } ) );
	}

	link.onmousemove = ( e: any ) => {
		e.stopPropagation();
	}

	link.onmouseleave = () => {
		document.dispatchEvent( new CustomEvent( 'runCommand', { detail: {
			commandName: 'Unhover All', 
		} } ) );
	}
	// link.onmouseleave = () => {
	// 	document.dispatchEvent( new CustomEvent( 'dom-hover-unset', { detail: obj } ) );
	// }

	return link;
}

type EditFunc = ( obj: any, varname: string, value: any ) => void;

export class Field {
	linkedObjs: Array<Editable>;
	varname: string;
	input: HTMLElement; // shows display value
	type: string;

	firstUpdate: boolean = true;
	oldVal: any = null;

	helperEntities: Array<Entity> = [];

	private gotInput: boolean = false;
	protected multiple: boolean = false;
	protected overridden: boolean = false;
	private edited: boolean = false;

	editFunc: EditFunc = ( obj: any, varname: string, value: any ) => {
		console.warn( varname + ' field has empty edit function' );
	};

	constructor( objs: Array<Editable>, 
			 	 varname: string, 
			 	 type: string ) {
		for ( let i = 0; i < objs.length; i++ ) {
			if ( !( varname in objs[i] ) ) {
				throw new Error( 'Field.constructor: no field ' + varname + ' in object ' + i );
			}

			if ( fancyType( ( objs[i] as any )[varname] ) != type ) {
				throw new Error( 'Field.constructor: type mismatch for field ' + varname + ' in object ' + i + 
								 '(' + fancyType( ( objs[i] as any )[varname] ) + '!=' + type );
			}	
		}

		this.linkedObjs = objs.slice();
		this.varname = varname;
		this.type = type;
	}

	static fromObjects( objs: Array<Editable>, varname: string, edit: boolean=false ): Field {
		if ( objs.length < 1 ) {
			return;
		}

		if ( !edit && !Debug.SHOW_DISABLED_FIELDS ) return;

		// create input field
		let type: string = fancyType( ( objs[0] as any )[varname] );

		let range: Range;
		if ( 'ranges' in objs[0] ) range = objs[0].ranges[varname];

		let newField: Field;

		if ( range && range instanceof Array ) {
			let drop = new Dropdown();
			drop.dom.disabled = !edit;
			newField = new DropField( objs, varname, type, drop );

		} else if ( type == 'number' || type == 'string' || type == 'boolean' ) {
			let input = create( 'input', { disabled: !edit } ) as HTMLInputElement;

			// style input element
			if ( type == 'number' || type == 'string' ) {
				input.className = 'panel-input';

			} else if ( type == 'boolean' ) {
				input.className = 'check';
				input.type = 'checkbox';
			}
				
			newField = new InputField( objs, varname, type, input );

		} else if ( type == 'Vec2' ) {
			let input = create( 'input', { disabled: !edit } ) as HTMLInputElement;
			input.className = 'panel-input';
			newField = new Vec2Field( objs, varname, type, input );

		} else if ( type == 'Array' ) {
			let linkDiv = create( 'div' ) as HTMLDivElement;
			newField = new ArrayField( objs, varname, type, linkDiv );

		} else {
			let linkDiv = create( 'div' ) as HTMLDivElement;
			newField = new ObjectField( objs, varname, type, linkDiv );
		}

		return newField;
	}

	protected getDisplayValue(): any {}

	protected setDisplayValue( value: any ) {}

	protected takeInput( value: any ) {
		for ( let obj of this.linkedObjs ) {
			if ( 'edit' in obj ) {
				obj.edit( this.varname, value );
			} else {
				this.editFunc( obj, this.varname, value );
			}
		}
		
		this.gotInput = true;

		//request_update( 'onmove' );
		//request_update( 'updateTables' );
	}

	getObjectValues(): any {
		let val = ( this.linkedObjs[0] as any )[this.varname];

		// show multiple values, if conflicting
		this.multiple = false;
		let multiVals = [val];

		for ( let obj of this.linkedObjs ) {
			if ( !multiVals.includes( ( obj as any )[this.varname] ) ) {
				this.multiple = true;

				multiVals.push( ( obj as any )[this.varname] );
			}
		}

		if ( this.multiple ) {
			val = '[' + multiVals.join( ',' ) + ']'; // TODO: make this make sense for booleans
		}

		return val;
	}

	private allValuesOverridden(): boolean {
		let allOverridden = true;

		for ( let obj of this.linkedObjs ) {
			if ( !obj.overrideFields || !obj.overrideFields.includes( this.varname ) ) {
				allOverridden = false;

				break;
			}
		}

		return allOverridden;
	}

	updateControl(): boolean {
		if ( this.linkedObjs.length < 1 ) return;

		/* 
			input.onchange is not called while the user is typing
			input.value likewise does not change
			this function may be called, however
	
			the activeElement check prevents the field from being reset by (for example)
			a mouse movement that triggers (by some circuituous means) this function

			the gotInput flag allows the user to override this and press Enter to set the value
		*/
		if ( !this.gotInput && 
			 typeof document !== 'undefined' && 
			 this.input == document.activeElement ) return;

		let val = this.getObjectValues();

		if ( this.input ) {
			this.input.classList.remove( 'multiple-values' );
			this.input.classList.remove( 'overridden' );
		}

		if ( this.multiple ) {
			if ( this.input ) this.input.classList.add( 'multiple-values' );

		// if all same value AND all overridden, display value in italics
		} else {
			this.overridden = this.allValuesOverridden();

			if ( this.overridden && this.input ) {
				this.input.classList.add( 'overridden' );
			}
		}
		
		this.edited = false;
		
		if ( val != this.oldVal ) this.edited = true;
		this.oldVal = val;

		this.setDisplayValue( val );

		if ( this.edited && this.gotInput ) {
			for ( let obj of this.linkedObjs ) {
				if ( !obj.onUserEdit ) continue;

				obj.onUserEdit( this.varname );
			}
		}

		// the first time the field is filled (i.e. when it is created) doesn't count as an edit
		if ( this.firstUpdate ) this.edited = false;
		this.firstUpdate = false;

		this.gotInput = false;
	
		return this.edited;
	}
}

export class InputField extends Field {

	/* property overrides */

	input: HTMLInputElement;

	constructor( objs: Array<Editable>, 
			 	 varname: string, 
			 	 type: string, 
			 	 input: HTMLInputElement ) {
		super( objs, varname, type );
		
		this.input = input;

		this.updateControl();

		this.input.onfocus = () => {
			if ( this.multiple ) this.input.value = '';
			if ( this.overridden ) {
				this.input.classList.remove( 'overridden' );
			}
		}

		this.input.onblur = () => {
			this.updateControl();
		}

		this.input.onchange = () => {
			this.takeInput( this.getDisplayValue() );
		}
	}

	protected getDisplayValue(): any {
		if ( this.type == 'number' || this.type == 'string' ) {
			return this.input.value;
		} else if ( this.type == 'boolean' ) {
			return this.input.checked;
		} else {
			console.warn( 'InputField.getDisplayValue ' + this.varname + ': unhandled var type' );
		}
	}

	protected setDisplayValue( value: any ) {
		if ( this.type == 'number' || this.type == 'string' ) {
			this.input.value = value;
		} else if ( this.type == 'boolean' ) {
			this.input.checked = value;
		} else {
			console.warn( 'InputField.getDisplayValue ' + this.varname + ': unhandled var type' );
		}
	}
}

export class Vec2Field extends Field {

	/* property overrides */

	input: HTMLInputElement;

	constructor( objs: Array<Editable>, 
			 	 varname: string, 
			 	 type: string, 
			 	 input: HTMLInputElement ) {
		super( objs, varname, type );
		
		this.input = input;

		this.updateControl();

		this.input.onfocus = () => {
			if ( this.multiple ) this.input.value = '';
			if ( this.overridden ) {
				this.input.classList.remove( 'overridden' );
			}
		}

		this.input.onblur = () => {
			this.updateControl();
		}

		this.input.onchange = () => {
			let words = this.getDisplayValue()
							.replace( '(', '' )
							.replace( ')', '' )
							.split( ',' )
							.map( x => parseFloat( x ) )
							.filter( x => !isNaN( x ) );

			if ( words.length != 2 ) {
				console.warn( 'Vec2Field ' + this.varname + ': rejected input ' + words );

				return;
			}

			this.takeInput( new Vec2( words[0], words[1] ) );
		}
	}

	getObjectValues(): Vec2 | string {
		let val = ( this.linkedObjs[0] as any )[this.varname];

		// show multiple values, if conflicting
		this.multiple = false;
		let multiVals = [val];

		for ( let obj of this.linkedObjs ) {
			for ( let multi of multiVals ) {
				if ( !( obj as any )[this.varname].equals( multi ) ) {
					this.multiple = true;

					multiVals.push( ( obj as any )[this.varname] );
				}
			}
		}

		if ( this.multiple ) {
			val = '[' + multiVals.join( ',' ) + ']';
		}

		return val;
	}

	protected getDisplayValue(): string {
		return this.input.value;
	}

	protected setDisplayValue( value: any ) {
		this.input.value = value;
	}
}

export class DropField extends Field {
	drop: Dropdown;

	/* property overrides */
	input: HTMLSelectElement;

	constructor( objs: Array<Editable>, 
			 	 varname: string, 
			 	 type: string, 
			 	 drop: Dropdown ) {
		super( objs, varname, type );

		this.drop = drop;
		this.input = drop.dom;

		this.updateControl();

		this.input.onchange = () => {
			this.takeInput( this.getDisplayValue() );
		}
	}

	protected getDisplayValue(): any {
		return this.drop.getSelectedOption();
	}

	// TODO: add option to show error if value is not in range (range and item value are out of sync)
	protected setDisplayValue( value: any ) {
		this.drop.select( value );
	}

	updateControl(): boolean {
		let val = this.getDisplayValue();

		this.drop.clear();

		let range = getSharedRange( this.linkedObjs, this.varname );
		let disabled = getSharedRange( this.linkedObjs, this.varname + '.disabled' );

		for ( let entry of range ) {
			let option = this.drop.addOption( entry );
			if ( disabled.includes( entry ) ) option.disabled = true;
		}

		if ( val == this.getObjectValues() ) {
			this.drop.select( val, false );
		} else {
			this.drop.selectNone();
		}

		return super.updateControl();
	}
}

export class ObjectField extends Field {
	constructor( objs: Array<Editable>, 
			 	 varname: string, 
			 	 type: string,
			 	 input: HTMLDivElement ) {
		super( objs, varname, type );

		this.input = input;
		input.style.display = 'inline-block';

		let link = createObjectLink( ( objs[0] as any )[varname] );
		link.classList.add( 'single' );

		this.input.appendChild( link );
	}
}

export class ArrayField extends Field {
	lastUpdateTime: number = 0;
	entries: Array<Editable> = [];

	/* property overrides */

	input: HTMLDivElement;

	constructor( objs: Array<Editable>, 
			 	 varname: string, 
			 	 type: string,
			 	 div: HTMLDivElement ) {
		super( objs, varname, type );

		this.input = div;

		let value = ( this.linkedObjs[0] as any )[this.varname];

		if ( !( value instanceof Array ) ) {
			throw new Error( 'Field.constructor: type mismatch for field ' + varname + ' in object ' + 0 + 
							 '(' + fancyType( value ) + '!=' + type );
		}

		this.updateControl();
	}

	updateControl(): boolean {
		let list = ( this.linkedObjs[0] as any )[this.varname];
		let updateDom = !unorderedArraysMatch( this.entries, list ) || this.lastUpdateTime == 0;

		this.entries = list;

		if ( updateDom ) {
			while ( this.input.firstChild ) {
				this.input.removeChild( this.input.firstChild );
			}

			if ( list.length == 0 ) {
				this.input.innerHTML = '[]';
				this.input.classList.add( 'object-link' );
				this.input.classList.add( 'single' );

			} else {
				this.input.classList.remove( 'object-link' );
				this.input.classList.remove( 'single' );

				for ( let entry of this.entries ) {
					let link = createObjectLink( entry );
					this.input.appendChild( link );
				}	
			}

			this.lastUpdateTime = new Date().getTime();

			return true;
		}

		return false;
	}
}
