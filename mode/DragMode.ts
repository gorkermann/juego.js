import { Keyboard, KeyCode } from '../keyboard.js'
import { Vec2 } from '../Vec2.js'
import { GenericMode } from './Mode.js'
import { Controller } from '../Controller.js'

//import { placeOnGrid } from '../util.js'

export class DragMode extends GenericMode {
	oldPos: Vec2 = null;
	prevTopIndex: number = -1; 
	downmark: Vec2;

	cameraPos: Vec2;

	cameraDrag: boolean = false;

	//relation: PosRelation = xxx;

	constructor( command: string ) {
		super( command );

		this.save = false;
	}

	// took out destructor

	begin( c: Controller ) {
		// took out super call to create instructions

		this.downmark = c.cursor.copy();
		this.cameraPos = c.camera.pos.copy();

		let doDrag = false;

		for ( let prim of c.sel.hoverlist.list ) {
			if ( c.sel.selection.includes( prim ) ) {
				doDrag = true;
			}
		}

		if ( doDrag ) {
			let drag = c.sel.selection[0];  

			// took out special case for Linear

			// took out special case for Vertex

			for ( let prim of c.sel.selection ) {
				prim.startDrag();
			}

		} else {
			this.cameraDrag = true;
		}

		// took out Primitive.DISABLE_HIGHLIGHT = true
	}

	mousemove( c: Controller ) {
		if ( this.downmark ) {
			let defaultOffset = c.cursor.minus( this.downmark );

			if ( Keyboard.keyHeld( KeyCode.CTRL ) ) {
				if ( Math.abs( defaultOffset.x ) > Math.abs( defaultOffset.y ) ) {
					defaultOffset.y = 0;
				} else {
					defaultOffset.x = 0;
				}
			}

			if ( this.cameraDrag ) {
				let offset = c.mouse.pos
							 .minus( c.mouse.downmark )
							 .scale( -1 / c.camera.scale );

				c.camera.pos.set( this.cameraPos.plus( offset ) );
                
			} else {
				this.save = true;

				for ( let select of c.sel.selection ) {

					// drag
					select.drag( defaultOffset );

					// took out snapping
				}
          	}

          	// took out special drag function for linears
		}
	}

	mousedown( c: Controller ) {
		if ( this.downmark === null ) {
			this.downmark = new Vec2();
		}
		this.downmark.set( c.cursor );

		if ( this.oldPos === null ) {
			this.oldPos = new Vec2(0, 0);
		}
		this.oldPos.set( this.downmark );
	}

	mouseup( c: Controller ) {
		// accept drag positions
		for ( let prim of c.sel.selection ) {
			prim.endDrag( true );
		}

		// took out updateTables request

		this.complete = true;	
		c.exitMode();
	}

	// took out drawing function
}