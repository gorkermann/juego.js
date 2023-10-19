import { create } from './domutil.js'
import { Entity } from './Entity.js'
import { Vec2 } from './Vec2.js'

export function createCommandButton( 
								name: string, 
								commandName: string, 
							  	selection?: Array<Entity>,
							  	optionsOrFunc?: Object | ( () => Object ) ): HTMLInputElement 
{
	let button = create( 'button', { innerHTML: name } ) as HTMLInputElement;

	button.onclick = function() {
		let options = {};
		if ( typeof optionsOrFunc == 'object' ) options = optionsOrFunc;
		else if ( typeof optionsOrFunc == 'function' ) options = optionsOrFunc();

		let detail = { commandName: commandName,
					   selection: selection,
					   options: options };

		document.dispatchEvent( new CustomEvent( 'runCommand', { detail: detail } ) );
	}

	return button;
}