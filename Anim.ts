import { Angle } from './Angle.js'
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

	update( elapsed: number ) {
		if ( this.active && this.count > 0 ) {
			this.count -= elapsed;
		}

		if ( this.count < 0 ) this.count = 0;
	}
}

type AnimValue = number | boolean | Vec2 | string;

type AnimFunc = {
	caller: any;
	funcName: string;
	args?: Array<any>
	
	_run?: boolean;
}

type AnimTarget = {
	value: AnimValue;

	_inProgress?: boolean

	// set one of these
	expireOnCount?: MilliCountdown
	expireOnReach?: boolean
	reachOnCount?: MilliCountdown

	readOnly?: boolean // Anim doesn't update the value, only checks for completeness

	setDefault?: boolean // update the default frame on completion

	overrideRate?: number; // override the rate from the AnimField
    derivNo?: number; // 0 for value, 1 for first derivative

    isSpin?: boolean; // overrides isAngle and allows an angle to go greater than [-pi, pi]
    spinDir?: SpinDir; // force rotation direction
}

export enum SpinDir {
	CLOSEST = 0,
	CW,
	CCW
}

export class AnimFrame {
	targets: Dict<AnimTarget>;
	funcs: Array<AnimFunc>;
	tag: string;
	delay: MilliCountdown;

	constructor( targets: Dict<AnimTarget>, funcs: Array<AnimFunc> = [] ) {
		this.targets = targets;
		this.funcs = funcs;
	}

	inProgress(): boolean {
		for ( let key in this.targets ) {
			if ( this.targets[key]._inProgress ) {
				return true;
			}
		}

		for ( let func of this.funcs ) {
			if ( !func._run ) {
				return true;
			}
		}

		return false;
	}
}

function getRate( step: number, elapsed: number, targetKey: string, field: AnimField, target: AnimTarget ): number {
	let rate = 0;

	rate = field.rate;
	if ( target.overrideRate !== undefined ) rate = target.overrideRate;

	if ( rate < 0 ) {
		throw new Error( 'Anim.getRate: negative rate for field ' + targetKey );
	}

	return rate * step;
}

type AnimFieldOptions = {
	isAngle?: boolean;
	downrate?: number;
	accel?: number;
}

export class AnimField {
	obj: any;
	varname: string; // obj[varname]: number | Vec2 | boolean

	isAngle: boolean;

	rate: number;
	downrate: number

	constructor( obj: any, varname: string, rate: number=0, options: AnimFieldOptions={} ) {
		if ( !obj ) return;

		if ( !( varname in obj ) ) {
			let str = obj;
			if ( typeof obj == 'object' ) str = obj.constructor.name

			throw new Error( 'AnimField.constructor: no field ' + varname + ' in ' + str ); 
		}

		if ( options.isAngle === undefined ) options.isAngle = false;

		this.obj = obj;
		this.varname = varname;
		this.rate = Math.abs( rate );

		this.isAngle = options.isAngle;
	}

	get(): AnimValue {
		return this.obj[this.varname];
	}

	set( value: AnimValue ) {
		this.obj[this.varname] = value;
	}
}

export class PhysField extends AnimField {
	derivname: string; // obj[derivname]: number | Vec2

	accel: number;

	constructor( obj: any, varname: string, derivname: string, rate: number=1, options: AnimFieldOptions={} ) {
		super( obj, varname, rate, options );

		if ( !obj ) return;

		if ( !( derivname in obj ) ) {
			throw new Error( 'PhysicalField.constructor: no field ' + varname + ' in ' + obj ); 
		}

		if ( options.accel === undefined ) options.accel = 0.1;

		let typesOk = false;
		if ( obj[varname] instanceof Vec2 && obj[derivname] instanceof Vec2 ) {
			typesOk = true;
		} else if ( typeof obj[varname] == 'number' && typeof obj[derivname] == 'number' ) {
			typesOk = true;
		}
   
		if ( !typesOk ) {
			throw new Error( 'PhysField.constructor: types must be both Vec2 or both number ( ' + 
							 typeof obj[varname] + ', ' + typeof obj[derivname] );
		}

		this.derivname = derivname;
		this.accel = Math.abs( options.accel );
	}

	zero() {
		if ( this.obj[this.derivname] instanceof Vec2 ) {
			this.obj[this.derivname].zero();

		} else if ( typeof this.obj[this.derivname]  == 'number' ) {
			this.obj[this.derivname] = 0;

		} else {
			if ( Debug.LOG_ANIM ) {
				console.warn( 'PhysField.zero: no method to zero type ' + ( typeof this.obj[this.derivname] ) );
			}
		}
	}

	updateVec2( step: number, elapsed: number, targetKey: string, target: AnimTarget ) {
		if ( !( target.value instanceof Vec2 ) ) {
			throw new Error( 'Anim.update: expected Vec2 or number target for field ' + targetKey );
		}

		let rate = getRate( step, elapsed, targetKey, this, target );

		let d0 = this.obj[this.varname] as Vec2;
		let d1 = this.obj[this.derivname] as Vec2;

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

			// discrete physics stopDist = ( nv - n(n+1)a/2 = d )
			// 

		}
	}

	updateNumber( step: number, elapsed: number, targetKey: string, target: AnimTarget ) {
		if ( !( typeof target.value == 'number' ) ) {
			throw new Error( 'Anim.update: expected Vec2 or number target for field ' + targetKey );
		}

		let rate = getRate( step, elapsed, targetKey, this, target );

		let d0 = this.obj[this.varname] as number;

		let diff = d0 - target.value;

		if ( this.isAngle && !target.isSpin ) {
			this.obj[this.varname] = Angle.normalize( this.obj[this.varname] );
			
			d0 = this.obj[this.varname];
			target.value = Angle.normalize( target.value );
			diff = Angle.normalize( diff );

			if ( ( diff > 0 && target.spinDir == SpinDir.CW ) ||
				 ( diff < 0 && target.spinDir == SpinDir.CCW ) ) {
				diff = Angle.normalize( Math.PI * 2 - diff );	
			}
		}

		if ( target.reachOnCount + elapsed > 0 ) {
			rate = Math.abs( diff ) * elapsed / ( target.reachOnCount + elapsed );
		}		

		// instantaneous acceleration
		if ( !target.derivNo ) {
			if ( Math.abs( diff ) <= rate || !rate ) {
				this.obj[this.derivname] = target.value - d0; // phys.value will hit target when deriv is added

				if ( target.expireOnReach ) target._inProgress = false;

			} else if ( diff < 0 ) {
				this.obj[this.derivname] = rate;

			} else { // diff > 0
				this.obj[this.derivname] = -rate;
			}

		// real-number acceleration
		} else if ( target.derivNo == 1 ) {
			// continuous physics ( tv - t^2 / 2 * a = d )
			// let stopDist = d1.length() ** 2 / ( 2 * field.accel );

			// discrete physics stopDist = ( nv - n(n+1)a/2 = d )
			// 

		}
	}
}

let animId = 0;

type PushFrameOptions = {
	tag?: string;
	delay?: MilliCountdown;
	threadIndex?: number;
}

type ClearOptions = {
	withTag?: string;
	withoutTag?: string;
}

export class Anim {
	name: string = 'anim' + ( animId++ );
	fields: Dict<AnimField>;
	fieldGroups: Dict<Array<string>> = {};
	default: AnimFrame = new AnimFrame( {} );
	threads: Array<Array<AnimFrame>> = [];
	touched: Dict<boolean> = {};

	constructor( fields: Dict<AnimField>={}, frame: AnimFrame=new AnimFrame( {} ) ) {
		this.fields = fields;

		try {
			this.initFrame( frame );
		} catch {
			// do nothing
		}

		for ( let key in frame.targets ) {
			this.setDefault( key, frame.targets[key] );
		}
	}

	/**
	 * default frame ignores most of the fields in AnimTarget and only takes a value 
	 * could potentially also take: derivNo, isSpin, spinDir
	 * 
	 * @param {string}     key    [description]
	 * @param {AnimTarget} target [description]
	 */
	setDefault( key: string, target: AnimTarget ) {
		if ( key in this.default.targets ) {
			this.default.targets[key].value = target.value;	
		} else {
			this.default.targets[key] = { value: target.value };	
		}
	}

	isDone( threadIndices: Array<number>=[] ): boolean {
		if ( threadIndices.length > 0 ) {
			for ( let index of threadIndices ) {
				if ( index >= this.threads.length ) {
					throw new Error( this.name + ': index out of range (' + index + '>' + this.threads.length + ')' );
				}

				if ( this.threads[index].length > 0 ) return false;
			}
		} else {
			for ( let thread of this.threads ) {
				if ( thread.length > 0 ) return false;
			}
		}

		return true;
	}

	addGroup( groupKey: string, fieldKeys: Array<string> ) {
		if ( groupKey in this.fields ) {
			throw new Error( 'Anim.addGroup: failed to add group, same key as field (' + groupKey + ')' );
		}

		if ( fieldKeys.length == 0 ) {
			throw new Error( 'Anim.addGroup: no keys in group ' + groupKey );
		}

		for ( let key of fieldKeys ) {
			if ( !( key in this.fields ) ) {
				throw new Error( 'Anim.addGroup: failed to add group ' + groupKey + ', no field ' + key );
			}
		}

		this.fieldGroups[groupKey] = fieldKeys;
	}

	initTargetObj( targetKey: string, target: AnimTarget ) {
		let value: any;

		if ( !( targetKey in this.fields ) ) {
			throw new Error( 'Anim.initTargetObj: no field ' + targetKey );			
		}

		let field = this.fields[targetKey];
		value = field.obj[field.varname];

		// type check
		// TODO: clearer output for objects
		if ( typeof target.value != typeof value ) {
			let msg = '(' + typeof target.value + ' != '  + typeof value + ')';

			throw new Error( 'Anim.initTargetObj: type mismatch for key ' + targetKey + ' ' + msg );
		}

		/*let canUse = false;
		if ( typeof target.value == 'boolean' ) canUse = true;
		if ( typeof target.value == 'number' ) canUse = true;
		if ( typeof target.value == 'string' ) canUse = true;
		if ( target.value instanceof Vec2 ) canUse = true;
		
		if ( !canUse ) {
			throw new Error( 'Anim.initTargetObj: Unhandled target value type ' + typeof target.value );
		}*/
	}

	initFrame( frame: AnimFrame ): boolean {
		let removeKeys: Array<string> = [];
		let addTargets: Dict<AnimTarget> = {};

		// unroll groups
		for ( let key in frame.targets ) {
			if ( !( key in this.fieldGroups ) ) continue; 

			for ( let fieldKey of this.fieldGroups[key] ) {
				let copy = Object.assign( {}, frame.targets[key] );
				addTargets[fieldKey] = copy;
			}

			removeKeys.push( key );
		}

		for ( let key of removeKeys ) delete frame.targets[key];
		for ( let key in addTargets ) {
			if ( key in frame.targets ) {
				throw new Error ( this.name + '.initFrame: (duplicate target ' + key + ') in frame ' + 
								  JSON.stringify( frame.targets ) );
			}

			frame.targets[key] = addTargets[key];
		}

		// init targets
		for ( let key in frame.targets ) {
			let target = frame.targets[key];

			this.initTargetObj( key, target );

			if ( target.expireOnCount < 0 ) {
				console.warn( this.name + '.initFrame: negative expireOnCount in frame ' + 
							  JSON.stringify( frame.targets ) );
			}

			if ( target.reachOnCount < 0 ) {
				console.warn( this.name + '.initFrame: negative reachOnCount in frame ' + 
							  JSON.stringify( frame.targets ) );
			}

			if ( target.expireOnReach || 
				 target.expireOnCount > 0 ||
				 target.reachOnCount > 0 ) {
				target._inProgress = true;
			}
		}

		for ( let func of frame.funcs ) {
			if ( !func.caller ) {
				throw new Error( this.name + '.initFrame: no caller object for function ' + func.funcName );
			}

			let type = typeof func.caller[func.funcName];
			if ( type != 'function' ) {
				throw new Error( this.name + '.initFrame: ' + func.funcName + ' is a not a function (' + type + ')' );
			}
		}

		if ( !frame.inProgress() ) {
			throw new Error( this.name + '.initFrame: no expiry set in frame ' + JSON.stringify( frame.targets ) );
		}

		return true;
	}

	matchesOtherThread( frame: AnimFrame, thread: Array<AnimFrame> ): boolean {
		let match = false;

		for ( let otherThread of this.threads ) {
			if ( otherThread == thread ) continue;

			for ( let targetKey in frame.targets ) {
				for ( let otherFrame of otherThread ) {
					if ( targetKey in otherFrame.targets ) {
						throw new Error( this.name + ': target collison for ' + targetKey );
					}
				}
			}	
		}

		return match;
	}

	pushFrame( frame: AnimFrame, options: PushFrameOptions={} ) {
		if ( options.delay === undefined || options.delay < 0 ) options.delay = 0;
		if ( options.threadIndex === undefined || options.threadIndex < 0 ) options.threadIndex = 0;

		let threadIndex = Math.floor( options.threadIndex );

		if ( this.initFrame( frame ) && 
			 !this.matchesOtherThread( frame, this.threads[threadIndex] ) ) {

			if ( options.tag ) frame.tag = options.tag; 
			frame.delay = options.delay;

			if ( !( threadIndex in this.threads ) ) {
				this.threads[threadIndex] = [];
			}

			this.threads[threadIndex].push( frame );

			if ( Debug.LOG_ANIM ) {
				console.log( this.name + ': pushed frame ' + 
							 (this.threads[threadIndex].length - 1) + 
							 ' to thread ' + threadIndex + 
							 ' ' + JSON.stringify( frame.targets ) );
			}
		}
	}

	updateNumber( step: number, elapsed: number, targetKey: string, field: AnimField, target: AnimTarget ) {
		if ( typeof target.value != 'number' ) {
			throw new Error( 'Anim.update: expected number target for field ' + targetKey );
		}

		/*if ( typeof field.rate != 'number' ) {
			throw new Error( 'Anim.update: expected number rate for field ' + key );
		}*/

		if ( !target.readOnly ) {
			let value = field.get() as number;
			let rate = getRate( step, elapsed, targetKey, field, target );

			let diff = value - target.value;

			if ( field.isAngle && !target.isSpin ) {
				value = Angle.normalize( value );
				target.value = Angle.normalize( target.value );
				diff = Angle.normalize( diff );

				if ( ( diff > 0 && target.spinDir == SpinDir.CW ) ||
					 ( diff < 0 && target.spinDir == SpinDir.CCW ) ) {
					diff = Angle.normalize( Math.PI * 2 - diff );	
				}
			}

			if ( target.reachOnCount + elapsed > 0 ) {
				rate = Math.abs( diff ) * elapsed / ( target.reachOnCount + elapsed );
			}

			if ( Math.abs( diff ) <= rate || !rate ) {
				value = target.value;

			} else if ( diff < 0 ) {
				value += rate;

			} else { // diff > 0
				value -= rate;
			}

			field.set( value );
		}

		if ( field.get() == target.value && target.expireOnReach ) {
			target._inProgress = false;
		}
	}

	updateString( step: number, elapsed: number, targetKey: string, field: AnimField, target: AnimTarget ) {
		if ( typeof target.value != 'string' ) {
			throw new Error( 'Anim.update: expected string target for field ' + targetKey );
		}

		let value = field.get() as string;
		let rate = getRate( step, elapsed, targetKey, field, target );

		if ( target.value.indexOf( value ) < 0 ) {
			value = '';
		}

		let diff = Math.abs( target.value.length - value.length );

		if ( target.reachOnCount + elapsed > 0 ) {
			rate = diff * elapsed / ( target.reachOnCount + elapsed );
		}

		rate = Math.floor( rate );

		if ( diff <= rate || !rate ) {
			value = target.value;

			if ( target.expireOnReach ) target._inProgress = false;
		
		} else {
			value = target.value.slice( 0, value.length + rate );
		}

		field.obj[field.varname] = value;
	}

	updateVec2( step: number, elapsed: number, targetKey: string, field: AnimField, target: AnimTarget ) {
		if ( !( target.value instanceof Vec2 ) ) {
			throw new Error( 'Anim.update: expected Vec2 target for field ' + targetKey );
		}

		/*if ( !( field.rate instanceof Vec2 ) ) {
			throw new Error( 'Anim.update: expected number rate for field ' + key );
		}*/

		if ( !target.readOnly ) {
			let value = field.get() as Vec2;
			let rate = getRate( step, elapsed, targetKey, field, target );
			let diff = target.value.minus( value );

			if ( target.reachOnCount + elapsed > 0 ) {
				rate = diff.length() * elapsed / ( target.reachOnCount + elapsed );
			}

			if ( diff.length() <= rate || !rate ) {
				value.set( target.value );

			} else {
				value.add( diff.unit().times( rate ) );
			}
		}

		if ( ( field.get() as Vec2 ).equals( target.value ) && target.expireOnReach ) {
			target._inProgress = false;
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
	updatePhysical( step: number, elapsed: number, targetKey: string, field: PhysField, target: AnimTarget ) {
		if ( field.obj[field.varname] instanceof Vec2 ) {
			field.updateVec2( step, elapsed, targetKey, target );

		} else if ( typeof field.obj[field.varname] == 'number' ) {
			field.updateNumber( step, elapsed, targetKey, target );
		
		} else {
			if ( Debug.LOG_ANIM ) {
				console.warn( this.name + ': ' + ' no method to update PhysField' );
			}
		}
	}

	update( step: number, elapsed: number ) {
		/*
			different ways of using the default frame:

			- update only fields that weren't touched by current frames
			- update only fields that aren't touched by any frame
			- update if all threads are empty after updateThread()
			- update if all threads are empty before updateThread() <- USING THIS ONE  
			- update if thread 0 is empty after updateThread()
			- update if thread 0 is empty before updateThread()
		 */

		this.touched = {};

		if ( this.isDone() ) {
			this.updateFrame( step, elapsed, this.default );

		} else {
			for ( let thread of this.threads ) {
				this.updateThread( step, elapsed, thread );
			}
		}

		// cancel velocities for physical fields we are currently ignoring
        for ( let key in this.fields ) {
            let field = this.fields[key];

            if ( field instanceof PhysField && !( key in this.touched ) ) {
            	field.zero();
            }
        }
	}	

	private updateThread( step: number, elapsed: number, thread: Array<AnimFrame> ): boolean {
		if ( thread.length == 0 ) return;

		let prevLength = thread.length;

		// update delays
		let topIndex = thread.length - 1;
		for ( let i = thread.length - 1; i >= 0; i-- ) {
			if ( thread[i].delay > 0 ) continue;

			topIndex = i;
			break;
		}

		for ( let frame of thread ) {
			if ( frame.delay > 0 ) frame.delay -= elapsed;
		}

		// update top frame
		let frame = thread[topIndex];

		this.updateFrame( step, elapsed, frame );

		// clean thread
		if ( !frame.inProgress() ) {
			let index = thread.indexOf( frame );

			if ( index >= 0 ) {
				thread.splice( index, 1 );

			// frame was deleted by its own function?
			} else {
				throw new Error( this.name + '.updateThread: cannot find frame after updating ' + JSON.stringify( frame.targets ) );
			}

			this.completeFrame( frame, thread );
		}

		return thread.length != prevLength;
	}

	private updateFrame( step: number, elapsed: number, frame: AnimFrame ) {
		for ( let key in frame.targets ) {
			if ( key in this.touched ) {
				if ( frame != this.default ) {
					console.warn( this.name + '.updateFrame: ignoring multiple update of key ' + key );
				}
				continue;
			}

			let target = frame.targets[key];
			let field = this.fields[key];

			this.touched[key] = true;

			if ( target.expireOnCount && target.expireOnCount > 0 ) {
				target.expireOnCount -= elapsed;
				if ( target.expireOnCount <= 0 ) target._inProgress = false;
			}

			if ( target.reachOnCount && target.reachOnCount > 0 ) {
				target.reachOnCount -= elapsed;
				if ( target.reachOnCount <= 0 ) target._inProgress = false;	
			}

			let value = field.get();

			if ( typeof value == 'boolean' ) {
				if ( typeof target.value != 'boolean' ) {
					throw new Error( 'Anim.update: expected boolean target for field ' + key );
				}
				
				if ( !target.readOnly ) {
					field.set( target.value );
				}

				if ( field.get() == target.value && target.expireOnReach ) {
					target._inProgress = false;
				}

			} else if ( field instanceof PhysField ) {
				this.updatePhysical( step, elapsed, key, field, target );

			} else if ( typeof value == 'number' ) {
				this.updateNumber( step, elapsed, key, field, target );

			} else if ( typeof value == 'string' ) {
				this.updateString( step, elapsed, key, field, target );

			} else if ( value instanceof Vec2 ) {
				this.updateVec2( step, elapsed, key, field, target );
			}
		}

		for ( let func of frame.funcs ) {
			if ( !func._run ) {
				func.caller[func.funcName].apply( func.caller, func.args );

				func._run = true;
			}
		}
	}

	private completeFrame( frame: AnimFrame, thread: Array<AnimFrame> ) {

		// optionally set new defaults
		for ( let key in frame.targets ) {
			if ( frame.targets[key].setDefault ) {
				this.setDefault( key, frame.targets[key] );
			}
		}

		if ( Debug.LOG_ANIM ) {
			console.log( this.name + ': completed frame ' + 
						 thread.length + 
						 ' of thread ' + this.threads.indexOf( thread ) + 
						 ' ' + JSON.stringify( frame.targets ) );
		}
	}

	private clearAllThreads() {
		for ( let thread of this.threads ) {
			while ( thread.length > 0 ) {
				thread.pop();
			}
		}

		if ( Debug.LOG_ANIM ) {
			console.log( this.name + ': cleared threads' );
		}
	}

	private clearByTag( withTag: string, withoutTag: string ) {
		let removed = [];

		for ( let thread of this.threads ) {
			for ( let i = thread.length - 1; i >= 0; i-- ) {
				if ( withTag && thread[i].tag == withTag ) {
					removed.push( thread.splice( i, 1 ) );
				
				} else if ( withoutTag && thread[i].tag != withoutTag ) {
					removed.push( thread.splice( i, 1 ) );
				}
			}

			if ( Debug.LOG_ANIM ) {
				let tags = [];
				if ( withTag ) tags.push( withTag );
				if ( withoutTag ) tags.push( '^' + withoutTag );

				console.log( this.name + ': removed ' + removed.length + 'frames (' + tags.join(',') + ')' );
			}
		}
	}

	clear( options: ClearOptions={} ) {
		if ( !options.withTag && !options.withoutTag ) {
			this.clearAllThreads();

		} else {
			this.clearByTag( options.withTag, options.withoutTag );
		}
	}
}