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

export class FuncCall<Func extends ( this: any, ...args: any ) => any> { // TS doesn't check that Func has the correct this value, so leaving it as any
	caller: any;
	funcName: string;
	args: Parameters<Func>;

	constructor( caller: any, funcName: string, args: Parameters<Func> ) {
		this.caller = caller;
		this.funcName = funcName;
		this.args = args;
	}
}