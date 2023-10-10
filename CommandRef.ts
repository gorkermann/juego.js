import { Keyboard, KeyCode, Key } from './keyboard.js'

import { Controller } from './Controller.js'
import { GenericMode } from './mode/Mode.js'

type Dict<Type> = { [key: string]: Type };

export let MOD = {
	NONE: 		0b000,
	CTRL: 		0b001,
	SHIFT: 		0b010,
	CTRL_SHIFT: 0b011,
	ALT: 		0b100,
	CTRL_ALT: 	0b101,
	SHIFT_ALT: 	0b110,
	CTRL_SHIFT_ALT: 0b111
}

export class CommandRef {
	name: string;
	originMode: any;
	mode: typeof GenericMode;
	key: KeyCode;
	ctrl: boolean;
	shift: boolean;
	alt: boolean;
	enter: () => void;

	constructor( name: string, originMode: any=null, mode: any=null, 
				 key: KeyCode=null, mod: number=0 ) {
		this.name = name;
		this.originMode = null;//originMode;
		this.mode = mode;
		this.key = key;

		this.ctrl = ( mod & 0b001 ) > 0;
		this.shift = ( mod & 0b010 ) > 0;
		this.alt = ( mod & 0b100 ) > 0;

		this.enter = function( this: Controller, options?: Dict<any> ) {
			this.changeMode( name );			
		}
	}

	matchesEvent( e: KeyboardEvent ): boolean {
		return e.ctrlKey == this.ctrl && e.shiftKey == this.shift && e.altKey == this.alt;
	}

	tryEnter( c: Controller, e: KeyboardEvent, options?: Dict<any> ) {
		if ( this.canEnter( c.mode, e ) ) {
			this.enter.bind( c, options )();
			
			return true;
		}		

		return false;
	}

	private canEnter( fromMode: GenericMode, e: KeyboardEvent ): boolean {
		let modeCheck = !this.originMode || fromMode instanceof this.originMode;
		let keyCheck = !e || ( this.key && Keyboard.keyHit( this.key ) && this.matchesEvent( e ) );

		return modeCheck && keyCheck;		
	}

	getShortcut(): string {
		let shortcut = '';

		if ( this.ctrl ) shortcut += 'ctrl-';
		if ( this.alt ) shortcut += 'alt-';
		if ( this.shift ) shortcut += 'shift-';
		shortcut += Key[this.key];

		return shortcut;
	}
}

export let addCommand = ( list: Array<CommandRef>,
				   name: string, enter: () => void, 
				   originMode: any=null, mode: any=null, 
				   key: KeyCode=null, mod: number=0 ) => {
	let c = new CommandRef( name, originMode, mode, key, mod );
	c.enter = enter;
	list.push( c );
}