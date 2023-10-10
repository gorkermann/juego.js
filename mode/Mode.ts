import { Controller } from '../Controller.js'

export class GenericMode {
	complete: boolean = false;
	save: boolean = true;
	command: string;

	errText: string = '';

	constructor( command: string ) {
		this.command = command;
	}

	destructor( c: Controller ) {}

	toString(): string {
		return 'Mode-' + this.command;
	}

	begin( c: Controller ) {}

	resume( c: Controller ) {}

	mousemove( c: Controller ) {}

	mouseright( c: Controller ) {}

	mouserightup( c: Controller ) {}

	mousedown( c: Controller ) {}

	mouseup( c: Controller ) {}

	keyboard( c: Controller ) {}

	update( c: Controller ) {}

	/* ok() and cancel() should NEVER do the following:
		set Mode.complete (doesn't affect the result)
		run Controller.changeMode() or Controller.exitMode() (may cause an infinite loop)
	*/
	cancel( c: Controller ) {}

	ok( c: Controller ) {}

	draw( c: Controller, context: CanvasRenderingContext2D ) {}
}