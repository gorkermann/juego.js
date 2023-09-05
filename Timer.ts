///////////
// TIMER //
///////////

/*
	Calls a function at intervals

	Three parameters:

		interval: how many cycles between function calls
		variance: how much the number of cycles between function can vary
		callback: the function to call

	EXAMPLE

*/

export class Timer {

	interval: number;
	variance: number;
	callback: () => any;
	clock: number;

	constructor(interval: number, variance: number, callback: () => any) {
		this.interval = interval;
		this.variance = variance;
		this.callback = callback;
		this.clock = this.getNextInterval();
	}

	update(): void {
		this.clock--;

		if ( this.clock <= 0 ) {
			this.clock = this.getNextInterval();

			this.callback();
		}
	}

	getNextInterval() {
		return this.interval + ( Math.random() * 0.5 - 1 ) * this.variance; 
	}
}