import { Debug } from './Debug.js'
import { Dropdown } from './Dropdown.js'
import { Editable, Range } from './Editable.js'
import { Vec2 } from './Vec2.js'

import { create, clear } from './domutil.js'
import { unorderedArraysMatch, fancyType } from './util.js'

import { AnimPanel } from './panel/AnimPanel.js'
import { Field, InputField, Vec2Field, DropField, ObjectField, ArrayField,
		 getDisplayVarname } from './panel/Field.js'

import { Dict } from './util.js'

function getDefaultEditFields( obj: any ): Array<string> {
	return Object.keys( obj ).filter( x => x[0] != '_' );
}

class InspectorPanel {
	query: string;

	dom: HTMLDivElement;
	targets: Array<Editable>
	fields: Array<Field> = [];

	private static getTitle( targets: Array<Editable> ) {
		let output = '';

		for ( let obj of targets ) {
			if ( obj.constructor ) {
				output = obj.constructor.name;
			} else {
				output = 'Object';
			}

			output += ' ';
		}

		return output;
	}

	/**
	 * create a panel of Fields based for selected objects
	 * @param {string}          key   unique identifier for the panel. If a panel exists with this key, it will be replaced
	 * @param {Array<Editable>} list  list of objects to be queried from
	 * @param {string}          query description of some set of objects within the list
	 */
	constructor( query: string, targets: Array<Editable> ) {
		this.query = query;
		this.targets = targets;
		this.dom = create( 'div' ) as HTMLDivElement;
		
		//this.dom.setAttribute( 'query', query );
		this.dom.className = 'query-panel';	
		this.dom.setAttribute( 'id', query );

		this.dom.onmousemove = () => {
			document.dispatchEvent( new CustomEvent( 'dom-hover', { detail: null } ) );
		}

		// title
		let title = create( 'div', {}, this.dom ) as HTMLDivElement;
		title.className = 'query-panel-title';
		title.innerHTML = InspectorPanel.getTitle( this.targets ) + ' ' + query;

		// add a checkbox to pin this panel
		let pinBox = create( 'input', { type: 'checkbox' }, title ) as HTMLInputElement;
		pinBox.className = 'pin-box';

		pinBox.onchange = () => {
			if ( pinBox.checked ) {
				this.dom.classList.add( 'pinned' );
			} else {
				this.dom.classList.remove( 'pinned' );
			}
		}

		// find shared object fields, add them to inspector
		let commonFields = this.targets[0].editFields;
		if ( !commonFields ) commonFields = getDefaultEditFields( this.targets[0] );

		for ( let obj of this.targets ) {
			let fields = obj.editFields;
			if ( !fields ) fields = getDefaultEditFields( obj );

			commonFields = commonFields.filter( x => fields.includes( x ) );
		}

		for ( let varname of commonFields ) {
			this.addField( this.targets, varname, true );
		}

		// if showing a single object, add display-only fields
		if ( this.targets.length == 1 && this.targets[0].showFields ) {
			for ( let varname in this.targets[0].showFields ) {
				this.addField( this.targets, varname, false );
			}
		}

		this.updateFields();
	}

	updateFields() {
		let anyEdited = false;

		for ( let field of this.fields ) {
			if ( field.updateControl() ) {
				anyEdited = true;
			}
		}

		if ( this.dom ) {
			let subPanels = this.dom.getElementsByClassName( 'sub-panel' );

			for ( let elem of subPanels as HTMLCollectionOf<HTMLElement> ) {
				elem.dispatchEvent( new Event( 'update' ) );
			}
		}

		if ( anyEdited ) {
			document.dispatchEvent( new CustomEvent( 'editField' ) );
		}
	}

	private addField( objs: Array<Editable>, varname: string, edit: boolean=false ) {
		if ( objs.length < 1 ) {
			return;
		}

		if ( !edit && !Debug.SHOW_DISABLED_FIELDS ) return;

		// create container and label
		let div = create( 'div', {} ) as HTMLDivElement;
		let span = create( 'span', { innerHTML: getDisplayVarname( varname ) + ': ' }, div ) as HTMLSpanElement;

		// create input field
		let type: string = fancyType( ( objs[0] as any )[varname] );

		let range: Range;
		if ( 'ranges' in objs[0] ) range = objs[0].ranges[varname];

		if ( range && range instanceof Array ) {
			let drop = new Dropdown();

			drop.dom.disabled = !edit;
				
			this.fields.push( new DropField( objs, varname, type, drop ) );
			
			div.appendChild( drop.dom );

		} else if ( type == 'number' || type == 'string' || type == 'boolean' ) {
			let input = create( 'input', { disabled: !edit } ) as HTMLInputElement;

			// style input element
			if ( type == 'number' || type == 'string' ) {
				input.className = 'panel-input';

			} else if ( type == 'boolean' ) {
				input.className = 'check';
				input.type = 'checkbox';
			}
				
			this.fields.push( new InputField( objs, varname, type, input ) );
		
			div.appendChild( input );

		} else if ( type == 'Vec2' ) {
			let input = create( 'input', { disabled: !edit } ) as HTMLInputElement;
			input.className = 'panel-input';

			this.fields.push( new Vec2Field( objs, varname, type, input ) );
		
			div.appendChild( input );

		} else if ( type == 'Array' ) {
			let linkDiv = create( 'div' ) as HTMLDivElement;

			this.fields.push( new ArrayField( objs, varname, type, linkDiv ) );

			div.appendChild( linkDiv );

		} else if ( type == 'Anim' && objs.length == 1 ) {
			let animDiv = create( 'div' ) as HTMLDivElement;

			this.fields.push( new AnimPanel( objs[0], varname, type, animDiv ) );

			div.appendChild( animDiv );

		} else {
			let linkDiv = create( 'div' ) as HTMLDivElement;

			this.fields.push( new ObjectField( objs, varname, type, linkDiv ) );

			div.appendChild( linkDiv );
		}

		this.dom.appendChild( div );
	}

	drawHelpers( context: CanvasRenderingContext2D ) {
		for ( let field of this.fields ) {
			for ( let helper of field.helperEntities ) {
				helper.draw( context );
			}
		}
	}
}

let _panels: Dict<InspectorPanel> = {};
let _objsById: Array<Editable> = [];

type ClearPanelsOptions = {
	force?: boolean;
}

export class Inspector {
	static updatePanels() {
		for ( let key in _panels ) {
			_panels[key].updateFields();
		}
	}

	static setObjectStore( list: Array<Editable> ) {
		_objsById = list;
	}

	private static resolveQuery( query: string ): Array<Editable> {
		let singleObjectQueries = query.split( ',' );
		let output = [];

		for ( let singleObjectQuery of singleObjectQueries ) {
			let varnames = singleObjectQuery.split( '.' ).map( x => x.trim() );

			if ( varnames.length < 1 ) continue;

			let obj: any = _objsById;
			let queryOk = true;

			for ( let i = 0; i < varnames.length; i++ ) {
				if ( varnames[i] == '' ) {
					console.warn( 'Inspector.resolveQuery: Empty varname in query ' + query );
					continue;
				}

				if ( !( varnames[i] in obj ) ) {
					console.error( 'Inspector.resolveQuery: Could not resolve query ' + singleObjectQuery +
								   ' due to missing field ' + varnames[i] + ' in ' + obj );
					queryOk = false;
					break;
				}

				obj = obj[varnames[i]];
			}

			if ( queryOk ) output.push( obj );
		}

		return output;
	}

	static inspectByQuery( query: string ) {
		let panel = Inspector.getPanel( query );
		Inspector.clearPanels();
		Inspector.addPanel( panel, 'inspect-' + query );
	}

	static getPanel( query: string ): InspectorPanel {
		let targets = Inspector.resolveQuery( query );
		let panel = new InspectorPanel( query, targets );

		return panel;
	}

	static clearPanels( options: ClearPanelsOptions={} ) {
		let inspector = document.getElementById( 'inspector' );

		if ( options.force ) {
			clear( inspector );
			_panels = {};

		} else {
			let children = inspector.children; // not sure if this has to be separated from the for loop
			for ( let child of children ) {
				if ( !child.classList.contains( 'pinned' ) ) {
					delete _panels['inspect-' + child.getAttribute( 'id' )];

					inspector.removeChild( child );
				}
			}
		}

		if ( inspector.children.length == 0 ) {
			inspector.style.display = 'none';	
		}
	}

	static addPanel( panel: InspectorPanel, key: string ) {
		let inspector = document.getElementById( 'inspector' );

		if ( _panels[key] ) {
			inspector.replaceChild( panel.dom, _panels[key].dom );
		} else {
			inspector.appendChild( panel.dom );
		}

		_panels[key] = panel;

		inspector.style.display = 'block';
	}

	static getPanelsDict(): Dict<InspectorPanel> {
		return _panels;
	}

	static drawPanelHelpers( context: CanvasRenderingContext2D ) {
		for ( let key in _panels ) {
			_panels[key].drawHelpers( context );
		}
	}
}