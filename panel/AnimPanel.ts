import md5 from 'md5'

import { Anim, AnimFrame, AnimField, AnimTarget } from '../Anim.js'
import { Dropdown } from '../Dropdown.js'
import { Entity } from '../Entity.js'
import { create, createTooltip, clear } from '../domutil.js'
import { Editable, extRangeEdit, Range } from '../Editable.js'
import { fancyType } from '../util.js'

import { Field, createObjectLink, getDisplayVarname } from './Field.js'
import { Dict } from '../util.js'

class HashSection {
	hash: string = '';
	lastUpdateTime: number = 0;

	dom: HTMLDivElement;

	constructor() {
		this.dom = create( 'div' ) as HTMLDivElement;
	}

	updateDom() {

	}
}

class FieldSection extends HashSection {
	fields: Array<Field> = [];

	constructor() {
		super();
	}

	clear() {
		clear( this.dom );
		this.fields = [];
	}

	hashFunc(): string {
		let prehash = '';

		for ( let field of this.fields ) {
			prehash += field.getObjectValues();
		}

		return md5( prehash );
	}

	updateDom() {
		clear( this.dom );

		for ( let field of this.fields ) {
			let div = create( 'div', {}, this.dom ) as HTMLDivElement;
			let span = create( 'span', { innerHTML: getDisplayVarname( field.varname ) + ': ' }, div ) as HTMLSpanElement;

			div.appendChild( field.input );
		}
	}
}

function targetCellClick( this: AnimPanel, fieldKey: string, frame: AnimFrame, e: any ) {
	if ( e.ctrlKey ) {
		delete frame.targets[fieldKey];

	} else {
		if ( !( fieldKey in frame.targets ) ) {
			frame.targets[fieldKey] = new AnimTarget( this.anim.getFieldValue( fieldKey ) );
			frame.targets[fieldKey]._inProgress = true;
		}

		let target = frame.targets[fieldKey];

		this.fieldSection.fields = [];

		for ( let name of target.editFields ) {
			this.fieldSection.fields.push( Field.fromObjects( [target], name, true ) );
		}
		
		this.fieldSection.updateDom();
	}
}

export class AnimPanel extends Field {
	lastUpdateTime: number = 0;
	animHash: string = '';
	controlHash: string = '';

	selectedThreadIndex: number = 0;
	selectedFrameIndex: number = -1;
	selectedFieldKey: string = '';
	selectedSequenceKey: string = '';
	drawFrameIndex: number = -1;

	editingTarget: boolean = false;
	editingField: boolean = false;
	editingFrame: boolean = false;

	fieldSection = new FieldSection();

	anim: Anim;
	frameDom: HTMLDivElement;
	controlDom: HTMLDivElement;

	/* property overrides */

	input: HTMLDivElement;

	constructor( obj: Editable, 
			 	 varname: string, 
			 	 type: string,
			 	 div: HTMLDivElement ) {
		super( [obj], varname, type );

		this.anim = ( this.linkedObjs[0] as any )[this.varname];

		this.input = div;
		this.input.classList.add( 'anim-table-container' );

		this.frameDom = create( 'div', {}, this.input ) as HTMLDivElement;
		this.controlDom = create( 'div', {}, this.input ) as HTMLDivElement;

		this.input.appendChild( this.fieldSection.dom );

		if ( !( ( this.linkedObjs[0] as any )[this.varname] instanceof Anim ) ) {
			throw new Error( 'Field.constructor: type mismatch for field ' + varname + ' in object ' + 0 + 
							 '(' + fancyType( ( this.linkedObjs[0] as any )[varname] ) + '!=' + type );
		}

		this.updateControl();
	}

	calcHash(): string {
		let prehash = '';

		let threads = this.getAnimThreads();

		for ( let thread of threads ) {
			for ( let frame of thread ) {
				prehash += frame.id; 

				for ( let key in frame.targets ) {
					prehash += key;
					prehash += frame.targets[key].value;
				}
			}
		}

		prehash += this.selectedFrameIndex;
		prehash += this.selectedFieldKey;
		prehash += this.selectedSequenceKey;

		return md5( prehash );
	}

	calcControlHash(): string {
		let prehash = '';

		for ( let sequenceKey in this.anim.sequences ) {
			prehash += sequenceKey;
		}

		prehash += this.selectedFrameIndex;
		prehash += this.selectedFieldKey;
		prehash += this.selectedSequenceKey;

		return md5( prehash );
	}

	createFieldCell( key: string, field: AnimField, inRow: HTMLTableRowElement ) {
		let nameCell = create( 'td', {}, inRow ) as HTMLTableColElement;
		nameCell.innerHTML = key;
		nameCell.classList.add( 'anim-field-cell' );

		nameCell.onmouseenter = ( e: any ) => {
			createTooltip( key, e.pageX + 2, e.pageY + 2, nameCell );
		}

		nameCell.onmouseup = () => {

			// edit AnimField fields
			this.fieldSection.fields = [];

			for ( let name of field.editFields ) {
				this.fieldSection.fields.push( Field.fromObjects( [field], name, true ) );
			}

			this.fieldSection.updateDom();
		}
	}

	setFromThread( anim: Anim, thread: Array<AnimFrame>, frameIndex: number=-1 ) {
		let touched: Dict<boolean> = {};

		if ( frameIndex < 0 ) frameIndex = thread.length - 1;

		for ( let i = frameIndex; i < thread.length; i++ ) {
			for ( let key in thread[i].targets ) {
				if ( touched[key] ) continue;

				anim.fields[key].set( thread[i].targets[key].value );

				touched[key] = true;
			}
		}
	}

	createFrameCell( frame: AnimFrame, inRow: HTMLTableRowElement, frameIndex: number ): HTMLTableColElement {
		let cell = create( 'td', {}, inRow ) as HTMLTableColElement;

		cell.onmouseup = () => {
			this.selectedFrameIndex = frameIndex;

			// set object values (only when viewing a sequence)
			if ( this.selectedSequenceKey ) {
				this.setFromThread( this.anim, this.anim.getThread( this.selectedSequenceKey ), frameIndex );
			}

			// edit frame fields
			this.fieldSection.fields = [];

			for ( let name of frame.editFields ) {
				this.fieldSection.fields.push( Field.fromObjects( [frame], name, true ) );
			}
			
			this.fieldSection.updateDom();
		}

		cell.onmouseenter = () => {

			// copy object
			this.helperEntities = [];

			if ( this.linkedObjs[0] instanceof Entity ) {
				let copy = this.linkedObjs[0].copy();

				this.setFromThread( copy.anim, this.anim.getThread( this.selectedSequenceKey ), frameIndex );
				copy.drawWireframe = true;

				this.helperEntities.push( copy );
			}
		}

		return cell;
	}

	createTargetCell( fieldKey: string, layeredFrames: Array<AnimFrame>, inRow: HTMLTableRowElement ): HTMLTableColElement {
		let cell = create( 'td', {}, inRow ) as HTMLTableColElement;

		for ( let i = 0; i < layeredFrames.length; i++ ) {
			if ( !layeredFrames[i] ) continue;

			let frame = layeredFrames[i];

			cell.onmouseup = targetCellClick.bind( this, fieldKey, frame );

			if ( !( fieldKey in frame.targets ) ) continue;

			let target = frame.targets[fieldKey];

			cell.classList.add( 'anim-targeted' );
			cell.classList.add( 'anim-frame-cell');
			if ( frame.delay > 0 ) cell.classList.add( 'anim-delayed' );

			if ( i == this.selectedThreadIndex ) {
				// offset slightly so new box doesn't trigger onmouseleave event
				cell.onmouseenter = ( e: any ) => {
					if ( fieldKey in frame.targets ) {
						createTooltip( JSON.stringify( target ).replaceAll( ',', ',\n' ),
									   e.pageX + 2,
									   e.pageY + 2,
									   cell );
					}
				}

			} else {
				cell.classList.add( 'disabled' );
			}
		}

		return cell;
	}

	getAnimThreads() {
		if ( this.selectedSequenceKey ) {
			return [this.anim.getThread( this.selectedSequenceKey )];
		} else {
			return this.anim.threads;
		}
	}

	updateControl(): boolean {
		let animHash = this.calcHash();
		let id = this.linkedObjs[0].id;

		let updateDom = animHash != this.animHash || this.lastUpdateTime == 0;
		this.animHash = animHash;

		if ( updateDom ) {
			let threads: Array<Array<AnimFrame>> = this.getAnimThreads();

			let maxThreadLength = 0;
			threads.map( x => {
				if ( x.length > maxThreadLength ) maxThreadLength = x.length;
			} );

			// copy object
			this.helperEntities = [];

			if ( this.linkedObjs[0] instanceof Entity ) {
				let copy = this.linkedObjs[0].copy();

				this.setFromThread( copy.anim, this.anim.getThread( this.selectedSequenceKey ) );
				copy.drawWireframe = true;

				this.helperEntities.push( copy );
			}

			// container
			clear( this.frameDom );

			let table = create( 'table', { className: 'anim-table' } ) as HTMLTableElement;
			if ( this.selectedSequenceKey ) table.classList.add( 'sequence' );

			// column styling
			let colgroup = create( 'colgroup', {}, table );

			create( 'col', { className: 'anim-field-col' }, colgroup );
			for ( let i = 0; i < maxThreadLength; i++ ) {
				create( 'col', { className: 'anim-frame-col' }, colgroup ); 
			}

			let tbody = create( 'tbody', {}, table );


			// top row
			let firstRow = create( 'tr' ) as HTMLTableRowElement;
			create( 'td', { style: 'height: 20px' }, firstRow );

			for ( let i = 0; i < threads[this.selectedThreadIndex].length; i++ ) {
				let cell = this.createFrameCell( threads[this.selectedThreadIndex][i], firstRow, i );

				if ( i == this.selectedFrameIndex ) cell.classList.add( 'selected' );
			}
			tbody.appendChild( firstRow );

			// target rows
			for ( let key in this.anim.fields ) {
				let row = create( 'tr' ) as HTMLTableRowElement;

				this.createFieldCell( key, this.anim.fields[key], row );

				for ( let i = 0; i < maxThreadLength; i++ ) {
					let layeredFrames = []; 

					for ( let thread of threads ) {
						if ( i < thread.length ) {
							layeredFrames.push( thread[i] );
						} else {
							layeredFrames.push( null );
						}
					}

					let cell = this.createTargetCell( key, layeredFrames, row );
				}

				tbody.appendChild( row );
			}

			this.frameDom.appendChild( table );

			this.lastUpdateTime = new Date().getTime();
		}

		let controlHash = this.calcControlHash();
		let updateControls = controlHash != this.controlHash || this.lastUpdateTime == 0;
		this.controlHash = controlHash;

		if ( updateControls ) {

			clear( this.controlDom );

			// Add Frame
			let button = create( 'button', { innerHTML: 'Add Frame' }, this.controlDom );
			button.onclick = () => {
				this.anim.pushEmptyFrame( this.selectedSequenceKey, this.selectedThreadIndex );
			}

			// Remove Frame
			button = create( 'button', { innerHTML: 'Remove Frame'}, this.controlDom );
			button.onclick = () => {
				this.anim.removeFrame( this.selectedSequenceKey, this.selectedThreadIndex, this.selectedFrameIndex );
				this.selectedFrameIndex = -1;
			}

			// Select Sequence
			let sequenceDiv = create( 'div', {}, this.controlDom );
			let sequenceSelect = new Dropdown();
			sequenceSelect.addOption( '' );
			for ( let key in this.anim.sequences ) {
				sequenceSelect.addOption( key );
			}
			sequenceSelect.select( this.selectedSequenceKey );
			sequenceSelect.dom.onchange = () => {
				this.selectedSequenceKey = sequenceSelect.getSelectedOption();

				if ( this.selectedSequenceKey ) {
					this.selectedThreadIndex = 0;
				}
			}
			sequenceDiv.appendChild( sequenceSelect.dom );

			// Add Sequence
			let input = create( 'input', {}, sequenceDiv ) as HTMLInputElement;
			button = create( 'button', { innerHTML: 'Add Sequence' }, sequenceDiv );
			button.onclick = () => {
				this.anim.addSequence( input.value );
			}

			// Remove Sequence
			button = create( 'button', { innerHTML: 'Remove Sequence' }, sequenceDiv );
			button.onclick = () => {
				if ( this.selectedSequenceKey ) {
					this.anim.removeSequence( this.selectedSequenceKey );
					//sequenceSelect.remove()
				}
			}

			// Play Sequence
			button = create( 'button', { innerHTML: 'Play Sequence' }, sequenceDiv );
			button.onclick = () => {
				if ( this.selectedSequenceKey ) {
					this.anim.playSequence( this.selectedSequenceKey )
				}
			}

			this.lastUpdateTime = new Date().getTime();
		}

		// Field View
		for ( let field of this.fieldSection.fields ) {
			if ( field.updateControl() ) {
				// do something?
			}
		}

		return true;
	}
}