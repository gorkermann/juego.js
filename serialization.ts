import * as tp from './lib/toastpoint.js'

export function toToast( this: any, toaster: tp.Toaster ): any {
	let fields = Object.keys( this );

	// never save these fields (which are lists of other fields)
	let exclude = ['editFields', 'saveFields', 'discardFields'];

	exclude = exclude.concat( this.discardFields );
	fields = fields.filter( x => !exclude.includes( x ) );		

	let flat: any = {};

	tp.setMultiJSON( flat, fields, this, toaster );

	return flat;
}