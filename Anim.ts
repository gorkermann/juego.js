import { Vec2 } from './Vec2.js'
import { Dict } from './util.js'

export type MilliCountdown = number;

/*type Target = {
	value: number
	expired?: boolean
	expireOnCount?: MilliCountdown
	expireOnReach?: boolean
	expireOnOther?: Target
}*/

type AnimValue = number | boolean | Vec2 | Physical;
type AnimTargetValue = number | boolean | Vec2;

type AnimTarget = {
	value: AnimTargetValue;
	derivative?: number; // 0 for value, 1 for first derivative
	expired?: boolean
	expireOnCount?: MilliCountdown
	expireOnReach?: boolean
}

export class AnimFrame {
	targets: Dict<AnimTarget>;

	constructor( targets: Dict<AnimTarget> ) {
		this.targets = targets;
	}
}

export class Physical {
	value: Vec2;
	d1: Vec2;

	constructor( value: Vec2, d1: Vec2 ) {
		this.value = value;
		this.d1 = d1;
	}
}

export class AnimField {
	obj: any;
	varname: string; // should point to an AnimValue
	rate: number; // ignored for booleans
	accel: number; // only used for Physicals

	constructor( obj: any, varname: string, rate: number=1, accel: number=0 ) {
		if ( !( varname in obj ) ) {
			throw new Error( 'AnimValue.constructor: no field ' + varname + ' in ' + obj ); 
		}

		this.obj = obj;
		this.varname = varname;
		this.rate = Math.abs( rate );
		this.accel = Math.abs( accel );
	}
}

export class Anim {
	fields: Dict<AnimField>;
	stack: Array<AnimFrame> = [];

	constructor( fields: Dict<AnimField>, frame: AnimFrame ) {
		this.fields = fields;
		this.pushFrame( frame );
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

			if ( frame.targets[key].expireOnReach || frame.targets[key].expireOnCount ) {
				frame.targets[key].expired = false;
			}
		}

		this.stack.push( frame );
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

	updateNumber( step: number, key: string, field: AnimField, target: AnimTarget ) {
		if ( typeof target.value != 'number' ) {
			throw new Error( 'Anim.update: expected number target for field ' + key );
		}

		/*if ( typeof field.rate != 'number' ) {
			throw new Error( 'Anim.update: expected number rate for field ' + key );
		}*/

		let value = field.obj[field.varname] as number;

		if ( Math.abs( value - target.value ) <= field.rate * step ) {
			value = target.value;

			if ( target.expireOnReach ) target.expired = true;

		} else if ( value < target.value ) {
			value += field.rate * step;

		} else { // value > target.value
			value -= field.rate * step;
		}

		field.obj[field.varname] = value;
	}

	updateVec2( step: number, key: string, field: AnimField, target: AnimTarget ) {
		if ( !( target.value instanceof Vec2 ) ) {
			throw new Error( 'Anim.update: expected number target for field ' + key );
		}

		/*if ( !( field.rate instanceof Vec2 ) ) {
			throw new Error( 'Anim.update: expected number rate for field ' + key );
		}*/

		let value = field.obj[field.varname] as Vec2;

		let diff = target.value.minus( value );

		if ( diff.length() <= field.rate * step ) {
			value.set( target.value );

			if ( target.expireOnReach ) target.expired = true;

		} else {
			value.add( diff.unit().times( field.rate ) );
		}
	}

	updatePhysical( step: number, key: string, field: AnimField, target: AnimTarget ) {
		if ( !( target.value instanceof Vec2 ) ) {
			throw new Error( 'Anim.update: expected number target for field ' + key );
		}

		let phys = field.obj[field.varname] as Physical;
		let diff, rate;

		// position change
		if ( target.derivative == 0 ) {
			diff = target.value.minus( phys.value );
			rate = field.rate;

		// velocity change
		} else if ( target.derivative == 1 ) {
			diff = target.value.minus( phys.d1 );
			rate = field.accel;
		}

		if ( diff.length() <= rate * step ) {
			if ( target.derivative == 0 ) {
				phys.d1.set( diff ); // phys.value will hit target when d1 is added
			} else if ( target.derivative == 1 ) {
				phys.d1.set( target.value );
			}

			if ( target.expireOnReach ) target.expired = true;

		} else {
			phys.d1.set( diff.unit().times( rate ) );
		}
	}

	update( step: number, elapsed: number ): boolean {
		if ( this.stack.length == 0 ) return;
		
		let prevLength = this.stack.length;

		let frame = this.stack[this.stack.length - 1];

		// update
		for ( let key in frame.targets ) {
			let target = frame.targets[key];

			if ( !( key in this.fields ) ) {
				target.expired = true;
				continue;
			}

			if ( target.expireOnCount && target.expireOnCount > 0 ) {
				target.expireOnCount -= elapsed;
				if ( target.expireOnCount <= 0 ) target.expired = true;
			}

			let field = this.fields[key];
			let value = field.obj[field.varname];

			// don't allow negative rates
			if ( field.rate < 0 ) field.rate = -field.rate;
			if ( field.accel < 0 ) field.accel = -field.accel;

			if ( typeof value == 'boolean' ) {
				if ( typeof target.value != 'boolean' ) {
					throw new Error( 'Anim.update: expected boolean target for field ' + key );
				}
				
				field.obj[field.varname] = target.value;
				if ( target.expireOnReach ) target.expired = true;

			} else if ( typeof value == 'number' ) {
				this.updateNumber( step, key, field, target );

			} else if ( value instanceof Vec2 ) {
				this.updateVec2( step, key, field, target );
			
			} else if ( value instanceof Physical ) {
				this.updatePhysical( step, key, field, target );
			} 
		}
		
		// clean stack
		let allExpired = true;

		for ( let key in frame.targets ) {
			if ( frame.targets[key].expired === false ) {
				allExpired = false;
			}
		}

		if ( allExpired && this.stack.length > 1 ) {
			this.stack.pop();
		}

		return this.stack.length != prevLength;
	}

	clear() {
		this.stack = this.stack.slice( 0, 1 );
	}
}