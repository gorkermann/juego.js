import * as tp from './lib/toastpoint.js'

import { Angle } from './Angle.js'
import { Range, rangeEdit } from './Editable.js'
import { toToast } from './serialization.js'
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

type AnimValue = number | boolean | Vec2;

type AnimFunc = {
	caller: any;
	funcName: string;
	args?: Array<any>
	eachUpdate?: boolean;

	_hasBeenRun?: boolean;
}

export enum TurnDir {
	CLOSEST = 0,
	CW,
	CCW
}

type AnimTargetOptions = {
	expireOnCount?: MilliCountdown;
	expireOnReach?: boolean;
	reachOnCount?: MilliCountdown;

	setDefault?: boolean;

	overrideRate?: number;
	derivNo?: number;

	isSpin?: boolean;
	turnDir?: TurnDir;

	overrideDelta?: boolean;
}

type SimpleAnimTarget = { value: AnimValue } & AnimTargetOptions;

export enum Expiration { // test only export
	none = 0,
	expireOnReach,
	expireOnCount,
	reachOnCount,
}

export class AnimTarget {
	value: AnimValue;

	_inProgress: boolean = false;

	count: MilliCountdown = 0;
	expiration: Expiration = Expiration.expireOnReach;

	setDefault: boolean = false; // update the default frame on completion

	overrideRate: number = -1; // override the rate from the AnimField
	derivNo: number = 0; // 0 for value, 1 for first derivative

	isSpin: boolean = false; // overrides AnimField.isAngle and allows an angle to go greater than [-pi, pi]
	turnDir: TurnDir = TurnDir.CLOSEST; // force rotation direction

	overrideDelta: boolean = false;

	/* prototype fields */

	editFields: Array<string> = [
		'value', 'count', 'expiration', 'overrideRate', 'isSpin', 'turnDir', 'overrideDelta'
	];
	ranges: Dict<Range> = { 'overrideRate': 'real' };

	constructor( value: AnimValue, options: AnimTargetOptions={} ) {
		this.value = value;

		for ( let varname in options ) {
			this.edit( varname, ( options as any )[varname] );
		}
	}

	updateCount( elapsed: number ) {
		if ( this.count > 0 ) this.count -= elapsed;

		if ( this.expiration == Expiration.expireOnCount || 
			 this.expiration == Expiration.reachOnCount ) {

			if ( this.count <= 0 ) this._inProgress = false;
		}
	}

	getRate( step: number, elapsed: number, targetKey: string, field: AnimField, diff: Vec2 | number ): number {
		if ( this.expiration == Expiration.reachOnCount ) {
			if ( this.count + elapsed > 0 ) {	
				if ( diff instanceof Vec2 ) {
					return diff.length() * elapsed / ( this.count + elapsed );
				} else {
					return Math.abs( diff ) * elapsed / ( this.count + elapsed );
				}
			}
		}

		let rate = field.rate;
		if ( this.overrideRate >= 0 ) rate = this.overrideRate;

		if ( rate < 0 ) {
			throw new Error( 'Anim.getRate: negative rate for field ' + targetKey );
		}

		return rate * step;
	}

	copy(): AnimTarget {
		let copy = new AnimTarget( this.value );
		Object.assign( copy, this );

		return copy;
	}

	edit( varname: string, value: any ) {
		let range: Range;

		if ( varname == 'expireOnCount' ) {
			this.expiration = Expiration.expireOnCount;
			this.count = value;

		} else if ( varname == 'expireOnReach' ) {
			this.expiration = Expiration.expireOnReach;

		} else if ( varname == 'reachOnCount' ) {
			this.expiration = Expiration.reachOnCount;
			this.count = value;

		} else {
			rangeEdit.apply( this, [varname, value] );
		}		
	}

	toToast( toaster: tp.Toaster ): any {
		return toToast.apply( this, [toaster] );
	}
}

let frameId = 0;
let animConstructors = { 'AnimFrame': () => new AnimFrame(), 'Vec2': () => new Vec2() }

export class AnimFrame {
	id: number;

	targets: Dict<AnimTarget> = {};
	funcs: Array<AnimFunc>;

	tag: string = '';
	delay: MilliCountdown = 0;

	editFields = ['tag', 'delay'];
	ranges: Dict<Range> = {};

	discardFields: Array<string> = [];

	constructor( targets: Dict<AnimTarget | SimpleAnimTarget>={}, funcs: Array<AnimFunc>=[] ) {
		this.id = frameId++;

		for ( let key in targets ) {
			if ( targets[key] instanceof AnimTarget ) {
				this.targets[key] = targets[key] as AnimTarget;

			} else {
				let value = targets[key]['value'];
				delete targets[key]['value'];

				this.targets[key] = new AnimTarget( value, targets[key] );
			}
		}

		this.funcs = funcs;
	}

	inProgress(): boolean {
		for ( let key in this.targets ) {
			if ( this.targets[key]._inProgress ) {
				return true;
			}
		}

		for ( let func of this.funcs ) {
			if ( !func._hasBeenRun ) {
				return true;
			}
		}

		return false;
	}

	edit( varname: string, value: any ): void {
		rangeEdit.apply( this, [varname, value] );
	}

	toToast( toaster: tp.Toaster ) {
		return toToast.apply( this, [toaster] );
	}
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
	downrate: number;

	editFields = ['isAngle', 'rate'];
	ranges: Dict<Range> = { rate: 'real' };

	discardFields: Array<string> = [];

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
		if ( this.obj[this.varname] instanceof Vec2 ) {
			return this.obj[this.varname].copy();	
		} else {
			return this.obj[this.varname];	
		}
	}

	set( value: AnimValue ) {
		if ( this.obj[this.varname] instanceof Vec2 ) {
			this.obj[this.varname].set( value );
		} else {
			this.obj[this.varname] = value;
		}
	}

	edit( varname: string, value: any ): void {
		rangeEdit.apply( this, [varname, value] );
	}

	toToast( toaster: tp.Toaster ) {
		return toToast.apply( this, [toaster] );
	}
}

function adjustAngleDiff( diff: number, turnDir: TurnDir ): number {
	if ( Math.abs( diff ) < 0.0001 ) {
		return 0;

	// CW turns should have a negative difference, positive rate
	} else if ( diff > 0 && turnDir == TurnDir.CW ) {
		return diff - Math.PI * 2;

	// CCW turns should have a positive difference, negative rate
	} else if ( diff < 0 && turnDir == TurnDir.CCW ) {
		return Math.PI * 2 - diff;
	
	} else {
		return diff;
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
		if ( options.isAngle === undefined ) options.isAngle = false;

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
		this.isAngle = options.isAngle;
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

		let d0 = this.obj[this.varname] as Vec2;
		let d1 = this.obj[this.derivname] as Vec2;

		if ( target.overrideDelta ) {
			d1.set( target.value.times( step ) );

			return;
		}

		let diff = target.value.minus( d0 );

		let rate = target.getRate( step, elapsed, targetKey, this, diff );

		/*if ( target.expiration == Expiration.reachOnCount && target.count + elapsed > 0 ) {
			rate = diff.length() * elapsed / ( target.count + elapsed );
		}*/		

		// instantaneous acceleration
		if ( !target.derivNo ) {
			if ( diff.length() <= rate || !rate ) {
				d1.set( diff ); // phys.value will hit target when deriv is added

				if ( target.expiration == Expiration.expireOnReach ) target._inProgress = false;

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

		if ( target.overrideDelta ) {
			this.obj[this.derivname] = target.value * step;

			return;
		}

		let d0 = this.obj[this.varname] as number;

		let diff = d0 - target.value;

		if ( this.isAngle && !target.isSpin ) {
			this.obj[this.varname] = Angle.normalize( this.obj[this.varname] );
			
			d0 = this.obj[this.varname];
			target.value = Angle.normalize( target.value );
			diff = Angle.normalize( diff );
			diff = adjustAngleDiff( diff, target.turnDir );
		}

		let rate = target.getRate( step, elapsed, targetKey, this, diff );

		/*if ( target.expiration == Expiration.reachOnCount && target.count + elapsed > 0 ) {
			rate = Math.abs( diff ) * elapsed / ( target.count + elapsed );
		}*/		

		// instantaneous acceleration
		if ( !target.derivNo ) {
			if ( Math.abs( diff ) <= rate || !rate ) {
				this.obj[this.derivname] = target.value - d0; // phys.value will hit target when deriv is added

				if ( target.expiration == Expiration.expireOnReach ) target._inProgress = false;

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

type FrameSequence = Array<AnimFrame>;

let animId = 0;

type PushFrameOptions = {
	tag?: string;
	delay?: MilliCountdown;
	threadIndex?: number;
	sequenceKey?: string;
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
	sequences: Dict<FrameSequence> = {};

	constructor( fields: Dict<AnimField>={}, frame: AnimFrame=new AnimFrame( {} ) ) {
		this.fields = fields;

		try {
			this.initFrame( frame );
		} catch {
			// do nothing
		}

		for ( let key in frame.targets ) {
			this.setDefault( key, frame.targets[key] ); // TODO: change type of constructor so it is clear that target ops are ignored
		}
	}

	/**
	 * default frame ignores most of the fields in AnimTarget and only takes a value 
	 * could potentially also take: derivNo, isSpin, turnDir
	 * 
	 * @param {string}	 key	[description]
	 * @param {AnimTarget} target [description]
	 */
	setDefault( key: string, target: AnimTarget ) {
		if ( key in this.default.targets ) {
			this.default.targets[key].value = target.value;	
		} else {
			this.default.targets[key] = new AnimTarget( target.value );	
		}
	}

	isDone( threadIndices: Array<number>=[] ): boolean {
		if ( threadIndices.length > 0 ) {
			for ( let index of threadIndices ) {
				if ( index < 0 ) {
					throw new Error( this.name + ' + isDone: Index out of range (' + index + ', len=' + this.threads.length + ')' );
				}

				if ( index in this.threads && this.threads[index].length > 0 ) return false;

				// return true for nonexistent threads
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
				addTargets[fieldKey] = frame.targets[key].copy();
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

			if ( target.count < 0 ) {
				console.warn( this.name + '.initFrame: negative count in frame ' + 
							  JSON.stringify( frame.targets ) );
			}

			if ( target.expiration == Expiration.expireOnReach && !target.overrideDelta ||
				 ( target.expiration == Expiration.expireOnCount && target.count > 0 ) ||
				 ( target.expiration == Expiration.reachOnCount && target.count > 0 ) ) {
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
			throw new Error( this.name + '.initFrame: no expiry set in frame ' + frame.targets );
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

	pushFrame( frame: AnimFrame, options: PushFrameOptions={} ): boolean {
		if ( options.delay === undefined || options.delay < 0 ) options.delay = 0;
		if ( options.threadIndex === undefined || options.threadIndex < 0 ) options.threadIndex = 0;

		let success = true;
		let threadIndex = Math.floor( options.threadIndex );

		try {
			if ( this.initFrame( frame ) && 
				 !this.matchesOtherThread( frame, this.threads[threadIndex] ) ) {

				if ( options.tag ) frame.tag = options.tag; 
				frame.delay = options.delay;

				for ( let i = 0; i <= threadIndex; i++ ) {
					if ( !( i in this.threads ) ) {
						this.threads[i] = [];
					}
				}

				this.threads[threadIndex].push( frame );

				if ( Debug.LOG_ANIM ) {
					console.log( this.name + ': pushed frame ' + 
								 (this.threads[threadIndex].length - 1) + 
								 ' to thread ' + threadIndex + 
								 ' ' + JSON.stringify( frame.targets ) );
				}
			}
		} catch ( ex: any ) {
			console.error( ex.message );

			success = false;
		}

		return success;
	}

	pushEmptyFrame( sequenceKey: string, threadIndex: number=0 ) {
		let thread = this.getThread( sequenceKey, threadIndex );

		thread.push( new AnimFrame( {} ) );
	}

	removeFrame( sequenceKey: string, threadIndex: number, frameIndex: number ) {
		let thread = this.getThread( sequenceKey, threadIndex );

		thread.splice( frameIndex, 1 );
	}

	/* Sequences */

	addSequence( sequenceKey: string ) {
		if ( !sequenceKey ) {
			throw new Error( this.name + ' addSequence: Invalid sequence key ' + sequenceKey );
		}

		if ( this.sequences[sequenceKey] ) {
			console.warn( this.name + ' addSequence: Sequence ' + sequenceKey + ' already exists' );
		}

		this.sequences[sequenceKey] = [];
	}

	playSequence( sequenceKey: string ) {
		if ( !( sequenceKey in this.sequences ) ) {
			throw new Error( this.name + ' enterSequence: Invalid sequence key ' + sequenceKey );
		}

		// copy sequence
		// TODO: move this elsewhere
		let toaster = new tp.Toaster( animConstructors );
		let json = tp.toJSON( this.sequences[sequenceKey], toaster );
		toaster.cleanAddrIndex();

		toaster = new tp.Toaster( animConstructors );
		let frames = tp.fromJSON( json, toaster ) as Array<AnimFrame>;

		frames.map( x => this.initFrame( x ) );

		this.threads = [frames];
	}

	removeSequence( sequenceKey: string ) {
		if ( !( sequenceKey in this.sequences ) ) {
			throw new Error( this.name + ' removeSequence: Invalid sequence key ' + sequenceKey );
		}

		delete this.sequences[sequenceKey];
	}

	/* Accessors */

	getThread( sequenceKey: string, threadIndex: number=0 ): Array<AnimFrame> {
		let thread: Array<AnimFrame> = [];

		if ( sequenceKey ) {
			if ( !( sequenceKey in this.sequences ) ) {
				console.error( this.name + ' getSequence: No sequence ' + sequenceKey ); 
			} else {
				thread = this.sequences[sequenceKey]; // ignore threadIndex
			}

		} else {
			if ( threadIndex < 0 || !( threadIndex in this.threads ) ) {
				console.error( this.name + ' getThread: Index out of range (' + threadIndex + ', len=' + this.threads.length );

			} else {
				thread = this.threads[threadIndex];
			}
		}

		return thread;
	}

	getFieldValue( key: string ): AnimValue {
		if ( !( key in this.fields ) ) {
			throw new Error( this.name + ' getFieldValue: No key ' + key ); 
		}

		return this.fields[key].get();
	}

	/* update functions for each AnimValue type */

	updateNumber( step: number, elapsed: number, targetKey: string, field: AnimField, target: AnimTarget ) {
		if ( typeof target.value != 'number' ) {
			throw new Error( 'Anim.update: expected number target for field ' + targetKey );
		}

		/*if ( typeof field.rate != 'number' ) {
			throw new Error( 'Anim.update: expected number rate for field ' + key );
		}*/

		let value = field.get() as number;

		if ( target.overrideDelta ) {
			value += target.value * step;
			console.log( 'value: ' + value + ' step ' + step );

		} else {
			let diff = value - target.value;

			if ( field.isAngle && !target.isSpin ) {
				value = Angle.normalize( value );
				target.value = Angle.normalize( target.value );
				diff = Angle.normalize( diff );
				diff = adjustAngleDiff( diff, target.turnDir );
			}

			let rate = target.getRate( step, elapsed, targetKey, field, diff );
			/*if ( target.expiration == Expiration.reachOnCount && target.count + elapsed > 0 ) {
				rate = Math.abs( diff ) * elapsed / ( target.count + elapsed );
			}*/

			if ( Math.abs( diff ) <= rate || !rate ) {
				value = target.value;

			} else if ( diff < 0 ) {
				value += rate;

			} else { // diff > 0
				value -= rate;
			}
		}

		field.set( value );

		if ( field.get() == target.value && target.expiration == Expiration.expireOnReach ) {
			target._inProgress = false;
		}
	}

	updateVec2( step: number, elapsed: number, targetKey: string, field: AnimField, target: AnimTarget ) {
		if ( !( target.value instanceof Vec2 ) ) {
			throw new Error( 'Anim.update: expected Vec2 target for field ' + targetKey );
		}

		/*if ( !( field.rate instanceof Vec2 ) ) {
			throw new Error( 'Anim.update: expected number rate for field ' + key );
		}*/

		let value = field.obj[field.varname] as Vec2;

		if ( target.overrideDelta ) {
			value.add( target.value.times( step ) );

		} else {
			let diff = target.value.minus( value );

			let rate = target.getRate( step, elapsed, targetKey, field, diff );
			/*if ( target.expiration == Expiration.reachOnCount && target.count + elapsed > 0 ) {
				rate = diff.length() * elapsed / ( target.count + elapsed );
			}*/

			if ( diff.length() <= rate || !rate ) {
				value.set( target.value );

			} else {
				value.add( diff.unit().times( rate ) );
			}
		}

		if ( ( field.get() as Vec2 ).equals( target.value ) && 
			 target.expiration == Expiration.expireOnReach ) {

			target._inProgress = false;
		}
	}

	/**
	 * Mostly the same as updateVec2, except that obj.derivname is modified based on obj.varname
	 * 
	 * @param {number}	 step	[description]
	 * @param {number}	 elapsed [description]
	 * @param {string}	 key	 [description]
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

	/* Thread Management */

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
		let topIndex = -1;
		for ( let i = thread.length - 1; i >= 0; i-- ) {
			if ( thread[i].delay > 0 ) continue;

			topIndex = i;
			break;
		}

		for ( let frame of thread ) {
			if ( frame.delay > 0 ) frame.delay -= elapsed;
		}

		if ( topIndex < 0 ) return false;

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

			target.updateCount( elapsed );

			let value = field.get();

			if ( typeof value == 'boolean' ) {
				if ( typeof target.value != 'boolean' ) {
					throw new Error( 'Anim.update: expected boolean target for field ' + key );
				}
				
				field.set( target.value );

				if ( target.expiration == Expiration.expireOnReach ) {
					target._inProgress = false;
				}

			} else if ( field instanceof PhysField ) {
				this.updatePhysical( step, elapsed, key, field, target );

			} else if ( typeof value == 'number' ) {
				this.updateNumber( step, elapsed, key, field, target );

			} else if ( value instanceof Vec2 ) {
				this.updateVec2( step, elapsed, key, field, target );
			}
		}

		for ( let func of frame.funcs ) {
			if ( !func._hasBeenRun || func.eachUpdate ) {
				func.caller[func.funcName].apply( func.caller, func.args );

				func._hasBeenRun = true;
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