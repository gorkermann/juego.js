export type Dict<Type> = { [key: string]: Type };

export function capIndex(val: number, lo: number, hi: number): number {
	if (val < lo) val = lo;
	if (val > hi - 1) val = hi - 1;
	
	return val;
}

export function toggle(val: boolean): boolean {
	if (val) return false;
	else return true;
}

export function discRand(min: number, max: number): number {
	return min + Math.floor(Math.random() * (max - min));
}

export function between( val: number, u1: number, u2: number ) {
	let fudge = 0.0001;

	return ( ( val >= u1 - fudge && val <= u2 + fudge ) || 
			 ( val >= u2 - fudge && val <= u1 + fudge ) );
}

export function discreteAccelDist( v1: number, a: number, v2: number ) {
	// position change after n steps = nv1 - n(n+1)a/2
	// n = (v1-v2)/a
	// n = (v1-0)/a = v1/a when stopping

	if ( a == 0 ) {
		throw new Error( 'Anim.discreteAccelDist: zero acceleration' );
	}

	if ( a < 0 ) a = -a;

	let n = Math.abs( ( v1 - v2 ) / a );
	return n*v1 - n*(n + 1)*a / 2;
}

export function unorderedArraysMatch( list1: Array<any>, list2: Array<any> ) {
	for ( let entry of list1 ) {
		if ( !list2.includes( entry ) ) return false;
	}

	for ( let entry of list2 ) {
		if ( !list1.includes( entry ) ) return false;
	}

	return true;
}

export function fancyType( obj: any ): string {
	let type = typeof obj;

	if ( type == 'object' && obj !== null ) {
		return obj.constructor.name;
	} else if ( obj === null ) {
		return 'null';
	} else {
		return type;
	}
}