import { Debug } from './Debug.js'
import { Dropdown } from './Dropdown.js'
import { Editable } from './Editable.js'
import { Vec2 } from './Vec2.js'

import { create } from './domutil.js'
import { unorderedArraysMatch } from './util.js'

function fancyType( obj: any ): string {
	let type = typeof obj;

	if ( type == 'object' && obj !== null ) {
		return obj.constructor.name;
	} else {
		return type;
	}
}

function getDisplayVarname( s: string  ): string {
	let words = s.split(/([A-Z][a-z]+|_)/).filter( ( e: string ) => e && e != '_' );

	for ( let [i, word] of words.entries() ) {
		words[i] = word[0].toUpperCase() + word.slice(1);
	} 

	return words.join( ' ' );
}

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

// test-only export
export class Field {
	linkedObjs: Array<Editable>;
	varname: string;
	input: HTMLElement; // shows display value
	type: string;

	firstUpdate: boolean = true;
	oldVal: any = null;

	private gotInput: boolean = false;
	protected multiple: boolean = false;
	protected overridden: boolean = false;
	private edited: boolean = false;

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

	protected getDisplayValue(): any {}

	protected setDisplayValue( value: any ) {}

	protected takeInput( value: any ) {
		for ( let obj of this.linkedObjs ) {
			obj.edit( this.varname, value );
		}
		
		this.gotInput = true;

		//request_update( 'onmove' );
		//request_update( 'updateTables' );
	}

	protected getObjectValues(): any {
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

function createObjectLink( obj: Array<Editable> ): HTMLDivElement {
	let link = create( 'div' ) as HTMLDivElement;
	link.innerHTML = fancyType( obj );
	link.classList.add( 'object-link' );

	link.onmouseup = () => {
		document.dispatchEvent( new CustomEvent( 'dom-select', { detail: obj } ) );
	}

	link.onmouseenter = () => {
		document.dispatchEvent( new CustomEvent( 'dom-hover', { detail: obj } ) );
	}

	link.onmousemove = ( e: any ) => {
		e.stopPropagation();
	}

	// link.onmouseleave = () => {
	// 	document.dispatchEvent( new CustomEvent( 'dom-hover-unset', { detail: obj } ) );
	// }

	return link;
}

export class ObjectField extends Field {
	constructor( objs: Array<Editable>, 
			 	 varname: string, 
			 	 type: string,
			 	 input: HTMLDivElement ) {
		super( objs, varname, type );

		this.input = input;
	}
}

// test-only export
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

// test-only export
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

	protected getObjectValues(): any {
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

// test-only export
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

export class ArrayField extends Field {
	entries: Array<Editable> = [];

	/* property overrides */

	input: HTMLDivElement;

	constructor( objs: Array<Editable>, 
			 	 varname: string, 
			 	 type: string,
			 	 div: HTMLDivElement ) {
		super( objs, varname, type );

		this.input = div;

		if ( !( ( this.linkedObjs[0] as any )[this.varname] instanceof Array ) ) {
			throw new Error( 'Field.constructor: type mismatch for field ' + varname + ' in object ' + 0 + 
							 '(' + fancyType( ( this.linkedObjs[0] as any )[varname] ) + '!=' + type );
		}

		this.updateControl();
	}

	updateControl(): boolean {
		let list = ( this.linkedObjs[0] as any )[this.varname];
		let updateDom = !unorderedArraysMatch( this.entries, list );

		if ( updateDom ) {
			while ( this.input.firstChild ) {
				this.input.removeChild( this.input.firstChild );
			}

			for ( let entry of list ) {
				let link = createObjectLink( entry );
				this.input.appendChild( link );
			}
		}

		return false;
	}
}

let fields: Array<Field> = [];
let panel: HTMLDivElement = null;

export class Inspector {
	constructor() {}

	static updateFields() {
		let anyEdited = false;

		for ( let field of fields ) {
			if ( field.updateControl() ) {
				anyEdited = true;
			}
		}

		if ( panel ) {
			let subPanels = panel.getElementsByClassName( 'sub-panel' );

			for ( let elem of subPanels as HTMLCollectionOf<HTMLElement> ) {
				elem.dispatchEvent( new Event( 'update' ) );
			}
		}

		if ( anyEdited ) {
			document.dispatchEvent( new CustomEvent( 'editField' ) );
		}
	}

	static getPanel( list: Array<Editable> ): HTMLDivElement {
		if ( list.length < 1 ) {
			return null;
		}

		fields = [];

		// title
		panel = create( 'div' ) as HTMLDivElement;
		panel.className = 'query-panel';

		panel.onmousemove = () => {
			document.dispatchEvent( new CustomEvent( 'dom-hover', { detail: null } ) );
		}

		let title = create( 'div', {}, panel ) as HTMLDivElement;
		title.className = 'query-panel-title';

		if ( list.length == 1 ) {
			let obj = list[0];

			/*if ( obj instanceof Primitive ) {
				title.innerHTML = obj.idString();
			} else if ( 'name' in obj ) {
				title.innerHTML = ( obj as any ).name;
			} else */if ( obj.constructor ) {
				title.innerHTML = obj.constructor.name;
			} else {
				title.innerHTML = 'Object';
			}
			
		} else {
			title.innerHTML = list.length + ' Objects';
		}

		let pinBox = create( 'input', { type: 'checkbox' }, title ) as HTMLInputElement;
		pinBox.className = 'pin-box';

		pinBox.onchange = () => {
			if ( pinBox.checked ) {
				panel.classList.add( 'pinned' );
			} else {
				panel.classList.remove( 'pinned' );
			}
		}

		// find shared object fields, add them to inspector
		let commonFields = list[0].editFields;

		for ( let prim of list ) {
			for ( let i = commonFields.length - 1; i >= 0; i-- ) {
				if ( !prim.editFields.includes( commonFields[i] ) ) {
					commonFields.splice( i, 1 );
				}
			}
		}

		for ( let fieldName of commonFields ) {
			Inspector.addField( panel, list, fieldName, true );
		}

		// if showing a single object, add display-only fields
		if ( list.length == 1 ) {
			for ( let varname in list[0] ) {

				// editFields are already shown
				if ( list[0].editFields.includes( varname ) ) continue;

				if ( list[0].showFields && list[0].showFields.includes( varname ) ) {
					Inspector.addField( panel, [list[0]], varname, false );
				}
			}

			/*let childPanels = getPanel( list[0] );
			for ( let childPanel of childPanels ) {				
				if ( childPanel ) {
					panel.appendChild( create( 'hr' ) );
					panel.appendChild( childPanel );
				}
			}*/
		}

		// populate fields
		Inspector.updateFields();

		return panel;
	}

	private static addField( panel: HTMLDivElement, objs: Array<Editable>, varname: string, edit: boolean=false ) {
		if ( objs.length < 1 ) {
			return;
		}

		// create label
		let div = create( 'div', {} ) as HTMLDivElement;
		let span = create( 'span', { innerHTML: getDisplayVarname( varname ) + ': ' }, div ) as HTMLSpanElement;

		// create input field
		let type: string = fancyType( ( objs[0] as any )[varname] );
		let range = objs[0].ranges[varname];

		if ( range && range instanceof Array ) {
			let drop = new Dropdown();

			drop.dom.disabled = !edit;

			if ( !drop.dom.disabled || 
				 ( drop.dom.disabled && Debug.SHOW_DISABLED_FIELDS ) ) {
				
				fields.push( new DropField( objs, varname, type, drop ) );
			
				div.appendChild( drop.dom );
				panel.appendChild( div );
			}

		} else if ( type == 'number' || type == 'string' || type == 'boolean' ) {
			let input = create( 'input', { disabled: !edit } ) as HTMLInputElement;

			// style input element
			if ( type == 'number' || type == 'string' ) {
				input.className = 'panel-input';

			} else if ( type == 'boolean' ) {
				input.className = 'check';
				input.type = 'checkbox';
			}

			// insert into DOM
			if ( !input.disabled || 
				 ( input.disabled && Debug.SHOW_DISABLED_FIELDS ) ) {
				
				fields.push( new InputField( objs, varname, type, input ) );
			
				div.appendChild( input );
				panel.appendChild( div );
			}

		} else if ( type == 'Vec2' ) {
			let input = create( 'input', { disabled: !edit } ) as HTMLInputElement;

			input.className = 'panel-input';

			// insert into DOM
			if ( !input.disabled || 
				 ( input.disabled && Debug.SHOW_DISABLED_FIELDS ) ) {
				
				fields.push( new Vec2Field( objs, varname, type, input ) );
			
				div.appendChild( input );
				panel.appendChild( div );
			}

		} else if ( type == 'Array' ) {
			let linkDiv = create( 'div' ) as HTMLDivElement;

			fields.push( new ArrayField( objs, varname, type, linkDiv ) );

			div.appendChild( linkDiv );
			panel.appendChild( div );

		} else {
			let link = createObjectLink( ( objs[0] as any )[varname]);
			fields.push( new ObjectField( objs, varname, type, link ) );

			div.appendChild( link );
			panel.appendChild( div );
		}
	}
}