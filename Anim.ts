import { Vec2 } from './Vec2.js'
import { Dict } from './util.js'

import { Debug } from './Debug.js'

export type MilliCountdown = number;

export class Chrono {
	count: MilliCountdown;
	interval: number;
	active: boolean = true;

	constructor( count: MilliCountdown, interval: number ) {
		this.count = count;
		this.interval = interval;
	}

	reset() {
		this.count = this.interval;
	}
}

type AnimValue = number | boolean | Vec2;

type AnimTarget = {
	value: AnimValue;

	_inProgress?: boolean

	// set one of these three
	expireOnCount?: MilliCountdown
	expireOnReach?: boolean
	reachOnCount?: MilliCountdown

	setDefault?: boolean

	overrideRate?: number;
    derivNo?: number; // 0 for value, 1 for first derivative
}

export class AnimFrame {
	targets: Dict<AnimTarget>;

	constructor( targets: Dict<AnimTarget> ) {
		this.targets = targets;
	}

	inProgress(): boolean {
		for ( let key in this.targets ) {
			if ( this.targets[key]._inProgress ) {
				return true;
			}
		}

		return false;
	}
}

export class AnimField {
	obj: any;
	varname: string; // obj[varname]: number | Vec2

	rate: number; // ignored for booleans

	constructor( obj: any, varname: string, rate: number=0 ) {
		if ( !obj ) return;

		if ( !( varname in obj ) ) {
			throw new Error( 'AnimField.constructor: no field ' + varname + ' in ' + obj ); 
		}

		this.obj = obj;
		this.varname = varname;
		this.rate = Math.abs( rate );
	}
}

export class PhysField extends AnimField {
	derivname: string; // obj[derivname]: number | Vec2

	accel: number;

	constructor( obj: any, varname: string, derivname: string, rate: number=1, accel: number=0.1 ) {
		super( obj, varname, rate );

		if ( !obj ) return;

		if ( !( derivname in obj ) ) {
			throw new Error( 'PhysicalField.constructor: no field ' + varname + ' in ' + obj ); 
		}

		this.derivname = derivname;
		this.accel = Math.abs( accel );
	}
}

let animId = 0;

export class Anim {
	name: string = 'anim' + ( animId++ );
	fields: Dict<AnimField>;
	stack: Array<AnimFrame> = [];

	constructor( fields: Dict<AnimField>={}, frame: AnimFrame ) {
		this.fields = fields;
		if ( frame ) this.pushFrame( frame );
	}

	getRate( step: number, elapsed: number, field: AnimField, target: AnimTarget ): number {
		let rate = 0;

		// don't allow negative rates
		if ( field.rate < 0 ) field.rate = -field.rate;
		if ( field.rate > 0 ) rate = field.rate;

		if ( target.overrideRate ) rate = target.overrideRate;

		return rate * step;
	}

	pushFrame( frame: AnimFrame ) {
		for ( let key in frame.targets ) {
			if ( !( key in this.fields ) ) {
				throw new Error( 'Anim.pushFrame: no field ' + key + ' in fields' ); 
			}

			let field = this.fields[key];

			if ( typeof frame.targets[key].value != typeof field.obj[field.varname] ) {
				throw new Error( 'Anim.pushFrame: type mismatch for key ' + key );
			}

			if ( frame.targets[key].expireOnCount < 0 ) {
				console.warn( 'Anim.pushFrame: negative expireOnCount, ignoring frame' );
			}

			if ( frame.targets[key].reachOnCount < 0 ) {
				console.warn( 'Anim.pushFrame: negative reachOnCount, ignoring frame' );
			}

			if ( frame.targets[key].expireOnReach || 
				 frame.targets[key].expireOnCount > 0 ||
				 frame.targets[key].reachOnCount > 0 ) {
				frame.targets[key]._inProgress = true;
			}
		}

		if ( frame.inProgress() || this.stack.length == 0 ) {
			this.stack.push( frame );

			if ( Debug.LOG_ANIM ) {
				console.log( this.name + ': pushed frame ' + (this.stack.length - 1) + 
							 ' ' + JSON.stringify( frame.targets ) );
			}
		} else {
			console.warn( 'Anim.pushFrame: ignoring frame ' + JSON.stringify( frame.targets ) + ' (no expiry set)');
		}
	}

	setDefault( key: string, func: ( val: AnimValue ) => AnimValue ) {
		if ( !( key in this.fields ) ) {
			throw new Error( 'Anim.setDefault: no field ' + key + ' in fields' ); 
		}

		let val = this.stack[0].targets[key].value;
		let newVal = func( val );

		if ( typeof val != typeof newVal ) {
			throw new Error( 'Anim.setDefault: type mismatch for key ' + key );
		}

		this.stack[0].targets[key].value = func( val );
	}

	/*private getTarget( key: string ): AnimTarget {
		let target = null;

		if ( this.stack.length > 0 ) {
			let frame = this.stack[this.stack.length - 1];

			if ( key in frame.targets ) {
				target = frame.targets[key];
			}
		}

		return target;
	}*/

	updateNumber( step: number, elapsed: number, key: string, field: AnimField, target: AnimTarget ) {
		if ( typeof target.value != 'number' ) {
			throw new Error( 'Anim.update: expected number target for field ' + key );
		}

		/*if ( typeof field.rate != 'number' ) {
			throw new Error( 'Anim.update: expected number rate for field ' + key );
		}*/

		let value = field.obj[field.varname] as number;
		let rate = this.getRate( step, elapsed, field, target );

		let diff = Math.abs( value - target.value )

		if ( target.reachOnCount + elapsed > 0 ) {
			rate = diff * elapsed / ( target.reachOnCount + elapsed );
		}

		if ( diff <= rate || !rate ) {
			value = target.value;

			if ( target.expireOnReach ) target._inProgress = false;

		} else if ( value < target.value ) {
			value += rate;

		} else { // value > target.value
			value -= rate;
		}

		field.obj[field.varname] = value;
	}

	updateVec2( step: number, elapsed: number, key: string, field: AnimField, target: AnimTarget ) {
		if ( !( target.value instanceof Vec2 ) ) {
			throw new Error( 'Anim.update: expected number target for field ' + key );
		}

		/*if ( !( field.rate instanceof Vec2 ) ) {
			throw new Error( 'Anim.update: expected number rate for field ' + key );
		}*/

		let value = field.obj[field.varname] as Vec2;
		let rate = this.getRate( step, elapsed, field, target );
		let diff = target.value.minus( value );

		if ( target.reachOnCount + elapsed > 0 ) {
			rate = diff.length() * elapsed / ( target.reachOnCount + elapsed );
		}

		if ( diff.length() <= rate || !rate ) {
			value.set( target.value );

			if ( target.expireOnReach ) target._inProgress = false;

		} else {
			value.add( diff.unit().times( rate ) );
		}
	}

	/**
	 * Mostly the same as updateVec2, except that obj.derivname is modified based on obj.varname
	 * 
	 * @param {number}     step    [description]
	 * @param {number}     elapsed [description]
	 * @param {string}     key     [description]
	 * @param {PhysField}  field   [description]
	 * @param {AnimTarget} target  [description]
	 */
	updatePhysical( step: number, elapsed: number, key: string, field: PhysField, target: AnimTarget ) {
		if ( !( target.value instanceof Vec2 ) ) {
			throw new Error( 'Anim.update: expected number target for field ' + key );
		}

		let d0 = field.obj[field.varname] as Vec2;
		let d1 = field.obj[field.derivname] as Vec2;

		// don't allow negative accelerations
		if ( field.accel < 0 ) field.accel = -field.accel;

		let rate = this.getRate( step, elapsed, field, target );
		let diff = target.value.minus( d0 );

		if ( target.reachOnCount + elapsed > 0 ) {
			rate = diff.length() * elapsed / ( target.reachOnCount + elapsed );
		}		

		// instantaneous acceleration
		if ( !target.derivNo ) {
			if ( diff.length() <= rate || !rate ) {
				d1.set( diff ); // phys.value will hit target when deriv is added

				if ( target.expireOnReach ) target._inProgress = false;

			} else {
				d1.set( diff.unit().times( rate ) );
			}

		// real-number acceleration
		} else if ( target.derivNo == 1 ) {
			// continuous physics ( tv - t^2 / 2 * a = d )
			// let stopDist = d1.length() ** 2 / ( 2 * field.accel );

			// discrete physics ( nv - n(n+1)a/2 = d )

		}
	}

	update( step: number, elapsed: number ): boolean {
		if ( this.stack.length == 0 ) return;
		
		let prevLength = this.stack.length;

		let frame = this.stack[this.stack.length - 1];

		// update
		for ( let key in frame.targets ) {
			let target = frame.targets[key];

			// no field to modify, ignore this target
			if ( !( key in this.fields ) ) {
				target._inProgress = false;
				continue;
			}

			if ( target.expireOnCount && target.expireOnCount > 0 ) {
				target.expireOnCount -= elapsed;
				if ( target.expireOnCount <= 0 ) target._inProgress = false;
			}

			if ( target.reachOnCount && target.reachOnCount > 0 ) {
				target.reachOnCount -= elapsed;
				if ( target.reachOnCount <= 0 ) target._inProgress = false;	
			}

			let field = this.fields[key];
			let value = field.obj[field.varname];

			if ( typeof value == 'boolean' ) {
				if ( typeof target.value != 'boolean' ) {
					throw new Error( 'Anim.update: expected boolean target for field ' + key );
				}
				
				field.obj[field.varname] = target.value;
				if ( target.expireOnReach ) target._inProgress = false;

			} else if ( typeof value == 'number' ) {
				this.updateNumber( step, elapsed, key, field, target );

			} else if ( field instanceof PhysField ) {
				this.updatePhysical( step, elapsed, key, field, target );

			} else if ( value instanceof Vec2 ) {
				this.updateVec2( step, elapsed, key, field, target );
			}
		}

		// cancel velocities for physical fields we are currently ignoring
		for ( let key in this.fields ) {
			let field = this.fields[key];

			if ( !( key in frame.targets ) && field instanceof PhysField ) {
				field.obj[field.derivname].zero()
			}
		}
		
		// clean stack
		if ( !frame.inProgress() && this.stack.length > 1 ) {
			let frame = this.stack.pop();

			// optionally set new defaults
			for ( let key in frame.targets ) {
				if ( !( key in this.fields ) ) continue;

				if ( !( key in this.stack[0].targets ) ) {
					console.warn( 'Anim.update: no default for ' + key );
				}

				if ( frame.targets[key].setDefault ) {
					this.stack[0].targets[key].value = frame.targets[key].value;
				}
			}

			if ( Debug.LOG_ANIM ) {
				console.log( this.name + ': completed frame ' + this.stack.length + 
							 ' ' + JSON.stringify( frame.targets ) );
			}
		}

		return this.stack.length != prevLength;
	}

	clear() {
		this.stack = this.stack.slice( 0, 1 );

		if ( Debug.LOG_ANIM ) {
			console.log( this.name + ': cleared stack' );
		}
	}
}