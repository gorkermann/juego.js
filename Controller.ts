import { CommandRef } from './CommandRef.js'
import { GenericMode } from './Mode.js'

export class Controller {
	commandList: Array<CommandRef>
	currentCommand: string = '';
	mode: GenericMode = null;
	modeStack: Array<GenericMode> = [];

	defaultMode: string | GenericMode = '';

	constructor( commands: Array<CommandRef> ) {
		this.commandList = commands;
	}

	runCommand( commandName: string, options?: { [key: string]: any } ) {
		let command: CommandRef = this.getCommand( commandName );

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
			this.currentCommand = this.mode.command;

		} else {
			this.changeMode( this.defaultMode );
		}
	}

	dispatchEvent( spec: any ) {
		// pass
	}
}