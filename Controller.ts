import { Vec2 } from './Vec2.js'

import { Camera } from './Camera.js'
import { CommandRef } from './CommandRef.js'
import { Editable } from './Editable.js'
import { Entity } from './Entity.js'
import { Keyboard, KeyCode } from './keyboard.js'
import { GenericMode } from './mode/Mode.js'
import { Mouse } from './Mouse.js'
import { Selector } from './Selector.js'
import { Inspector } from './Inspector.js'

export class Controller {
	commandList: Array<CommandRef>
	currentCommand: string = '';
	mode: GenericMode = null;
	modeStack: Array<GenericMode> = [];

	defaultMode: string | GenericMode = '';

	// drawing
	camera: Camera = new Camera();
	canvas: HTMLCanvasElement = null;

	// cursor (single area)
	mouse = new Mouse();
	mouseIn: boolean = true;
	clickIn: boolean = false;
	downmark: Vec2 = null;

	cursor = new Vec2();

	sel = new Selector<Entity>( [] );

	constructor( commands: Array<CommandRef> ) {
		this.commandList = commands;
	}

	runCommand( commandName: string, options?: { [key: string]: any } ) {
		let command = this.getCommand( commandName );

		if ( command ) {
			command.tryEnter( this, null, options );
		}
	}

	getCommand( commandName: string | CommandRef ): CommandRef {
		if ( typeof( commandName ) == 'string' ) {
			let command = this.commandList.find( function(x) { return x.name == commandName } )
		
			if ( !command ) {
				throw new Error( 'Unable to find command ' + commandName );
			}

			return command;

		} else if ( commandName instanceof CommandRef ) {
			return commandName;
		}

		return null;
	}

	onModeSave() {}

	onModeCancel() {}

	onModeChange() {}

	changeMode( target: string | GenericMode, stack: boolean=false ) {

		// finish out current mode
		if ( this.mode ) {
			if ( stack ) {
				this.modeStack.push( this.mode );

			} else {
				if ( this.mode.complete ) {
					this.mode.ok( this );

					if ( this.mode.save ) {
						this.onModeSave();
					}
					
				} else {
					this.mode.cancel( this );

					// reload current state
					this.onModeCancel();
				}

				this.mode.destructor( this );
			}
		}

		// begin new mode
		if ( target instanceof GenericMode ) {
			this.mode = target;
			this.currentCommand = this.mode.command;
			
		} else if ( typeof target == 'string' ) {
			let command = this.getCommand( target );

			if ( command ) {
				this.mode = new command.mode( target );
				this.currentCommand = command.name;
			}
		}

		this.mode.begin( this );
		this.onModeChange();
	}

	exitMode() {
		if ( this.modeStack.length > 0 ) {
			// end current mode
			if ( this.mode.complete )  {
				this.mode.ok( this );
			} else {
				this.mode.cancel( this );
			}

			this.mode.destructor( this );
			
			// return to previous mode
			this.mode = this.modeStack.pop();
			this.mode.resume( this );

			this.currentCommand = this.mode.command;

		} else {
			this.changeMode( this.defaultMode );
		}
	}

	dispatchEvent( spec: any ) {
		// pass
	}

	initMouse( areaId='canvas' ) {
		if ( typeof document === 'undefined' ) return;

		let area = document.getElementById( areaId );

		if ( !area ) {
			throw new Error( 'Controller.initMouse: no element with id ' + areaId );
		}

		//drawarea.addEventListener( 'contextmenu', event => event.preventDefault() );

		area.onmousemove = ( e ) => {
			this.mouse.moveHandler( e );

			this.updateCursor();
		}

		area.onmousedown = ( e ) => {
			e.stopPropagation();

			this.clickIn = true;
			this.mouse.downHandler( e );

			if ( e.button == 2 ) {
				this.mode.mouseright( this );
			} else {
				this.mode.mousedown( this );
			}
		}

		area.onmouseup = ( e ) => {
			this.mouse.upHandler( e );

			// only do action if mousedown event was also in area
			if ( this.clickIn ) {
				if ( e.button == 2 ) {
					this.mode.mouserightup( this );
				} else {
					this.mode.mouseup( this );
				}
			}
			this.clickIn = false;
		}

		area.onmouseenter = ( e ) => {
			this.mouseIn = true;
		}
		
		area.onmouseleave = ( e ) => {
			this.mouseIn = false;

			this.sel.clearHovered();
			this.sel.updateHovered();
		}

		//stopMouse( document.getElementById( 'inspector' ) );

		area.onwheel = ( e ) => {
			e.preventDefault();

			//this.camera.wheelHandler( e, this.mouse.pos );
		}
	}

	initKeyboard( areaId='drawarea' ) {
		if ( typeof document === 'undefined' ) return;

		let area = document.getElementById( areaId );

		if ( !area ) {
			throw new Error( 'Controller.initMouse: no element with id ' + areaId );
		}

		area.onkeydown = ( e: KeyboardEvent ) => {
			Keyboard.downHandler( e );

			if ( Keyboard.keyHit( KeyCode.BSLASH ) ) {
				//request_update( 'breakpoint' );
			}

			if ( this.mouseIn && !( document.activeElement instanceof HTMLInputElement ) ) {

				// Select input mode
				let foundCommand = false;

				for ( let command of this.commandList ) {
					if ( command.tryEnter( this, e ) ) {
						if ( foundCommand ) {
							throw new Error( 'Multiple commands triggered by keyboard event' );
						}

						foundCommand = true;
					}
				}

				if ( !foundCommand ) {
					this.mode.keyboard( this );
				}

				//request_update( 'redraw' );
			}			
		} 

		area.onkeyup = ( e ) => {
			Keyboard.upHandler( e );

			this.mode.keyboard( this );

			//request_update( 'redraw' );
		}		
	}

	updateCursor( p?: Vec2 ) {
		let oldPos = this.cursor.copy();

		if ( p ) {
			this.cursor.set( p );
		} else {
			this.cursor.set( this.camera.screenToWorld( this.mouse.pos ) );
		}

		if ( !oldPos.equals( this.cursor ) ) {
			this.mode.mousemove( this );
		}
	}

	inspect( prims: Array<Editable> ) {
		let panel = Inspector.inspectByQuery( prims.map( x => x.id ).join( ',' ) );
	}
}