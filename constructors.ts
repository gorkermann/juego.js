export type Newable = { new ( ...args: any[] ): any }

export function factory( newable: Newable ): ( () => Object ) {
	return () => {
		let obj = new newable();
		return obj;
	}
}

// map from class names to constructors
// used to make highlightable text in instructions
export let classMap: { [ key: string ]: Newable } = {};

// list of constructor functions
// (need to access static props, not sure how to define this as a type in TS, so type is vague)

// if a class is not in this list, it is instantiated as new Class()
export let constructors : { [key: string]: () => Object } = {};

export function addClass( className: string, constr: Newable ) {
	classMap[className] = constr;

	if ( !( className in constructors ) ) {
		constructors[className] = factory( classMap[className] );
	}

	if ( !( className in nameMap ) ) {
		nameMap[constr.name] = className;
	}
}

// create a map so constructor names can be retrieved post-obfuscation
export let nameMap: { [ key: string ]: string } = {};