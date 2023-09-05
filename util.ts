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
	let fudge = 0.01;

	return ( ( val >= u1 - fudge && val <= u2 + fudge ) || 
			 ( val >= u2 - fudge && val <= u1 + fudge ) );
}