import * as tp from '../lib/toastpoint.js'
import { constructors, nameMap } from '../constructors.js'

import { TestFuncs, Test } from '../lib/TestRun.js'

import { Anim, AnimFrame, AnimField, AnimTarget, PhysField, Expiration } from '../Anim.js'
import { Vec2 } from '../Vec2.js'

function test_Anim( tf: TestFuncs ) {
	let obj = {
		x: 0,
		y: 0,
		onFire: false
	}

	let anim = new Anim( {
		'x': new AnimField( obj, 'x', 1 ),
		'y': new AnimField( obj, 'y', 0.1 ),
		'onFire': new AnimField( obj, 'onFire' )
	},
	new AnimFrame( {
		'x': new AnimTarget( 1 ),
		'y': { value: 1 },
		'onFire': new AnimTarget( true )
	} ) );

	// no var in object named 'xx'
	tf.THROWS( () => new AnimField( obj, 'xx', 1 ) );

	// no field with key 'a'
	tf.ASSERT_EQ( anim.threads.length, 0 );
	tf.ASSERT_EQ( anim.pushFrame( new AnimFrame( { 'a': new AnimTarget( 0 ) } ) ), false );
	tf.ASSERT_EQ( anim.threads.length, 0 );

	// ok
	tf.ASSERT_EQ( obj.x, 0 );
	tf.ASSERT_EQ( obj.y, 0 );
	tf.ASSERT_EQ( obj.onFire, false );

	anim.update( 1.0, 1 );

	tf.ASSERT_EQ( obj.x, 1 );
	tf.ASSERT_EQ( obj.y, 0.1 );
	tf.ASSERT_EQ( obj.onFire, true );

	anim.update( 1.0, 1 );

	tf.ASSERT_EQ( obj.x, 1 );
	tf.ASSERT_EQ( obj.y, 0.2 );
	tf.ASSERT_EQ( obj.onFire, true );

	// half a step
	anim.update( 0.5, 1 );

	tf.ASSERT_EQ( obj.x, 1 );
	tf.ASSERT_EQ( obj.y, 0.25 );
	tf.ASSERT_EQ( obj.onFire, true );

	// push a new frame
	tf.ASSERT_EQ( anim.threads.length, 0 );

	anim.pushFrame( new AnimFrame( {
		'x': new AnimTarget( 2 ),
		'onFire': new AnimTarget( false )
	} ) );

	tf.ASSERT_EQ( anim.threads.length, 1 );
	tf.ASSERT_EQ( anim.threads[0].length, 1 ); // new frame is present

	anim.update( 1.0, 1 );

	tf.ASSERT_EQ( obj.x, 2 );
	tf.ASSERT_EQ( obj.y, 0.25 );
	tf.ASSERT_EQ( obj.onFire, false );

	tf.ASSERT_EQ( anim.threads[0].length, 0 ); // new frame is gone

	// return to old targets
	anim.update( 1.0, 1 );

	tf.ASSERT_EQ( obj.x, 1 );
	tf.ASSERT_EQ( obj.y, 0.35 );
	tf.ASSERT_EQ( obj.onFire, true );

	// push a frame for a certain duration
	anim.pushFrame( new AnimFrame( {
		'x': new AnimTarget( 10, { expireOnCount: 100 } )
	} ) );

	anim.update( 1.0, 99 );

	tf.ASSERT_EQ( obj.x, 2 );
	tf.ASSERT_EQ( obj.y, 0.35 );

	// no duration change if elapsed=0 (frame keeps updating)
	anim.update( 1.0, 0 );

	tf.ASSERT_EQ( obj.x, 3 );
	tf.ASSERT_EQ( obj.y, 0.35 );

	// trip duration counter
	tf.ASSERT_EQ( anim.threads[0].length, 1 );

	anim.update( 1.0, 1 );

	tf.ASSERT_EQ( obj.x, 4 );
	tf.ASSERT_EQ( obj.y, 0.35 );
	tf.ASSERT_EQ( anim.threads[0].length, 0 );

	// return to old targets
	anim.update( 1.0, 1 );

	tf.ASSERT_EQ( obj.x, 3 );
	tf.ASSERT_EQ( obj.y, 0.45 );

	// many steps pass...
	anim.update( 6.0, 1 );

	tf.ASSERT_EQ( obj.x, 1 );
	tf.ASSERT_EQ( obj.y, 1 );

	// negative rate
	anim.fields['y'].rate = -0.7; 

	tf.THROWS( () => { anim.update( 1.0, 1 ) } );

	tf.ASSERT_EQ( obj.x, 1 );
	tf.ASSERT_EQ( obj.y, 1 );

	// overshoot
	anim.fields['y'].rate = 0.7; 

	anim.pushFrame( new AnimFrame( {
		'y': new AnimTarget( 0, { setDefault: true } )
	} ) );

	anim.update( 1.0, 1 );

	tf.ASSERT_EQ( obj.x, 1 );
	tf.ASSERT_EQ( obj.y, 0.3 );
	tf.ASSERT_EQ( anim.threads[0].length, 1 );
	tf.ASSERT_EQ( anim.default.targets['y'].value, 1 );

	anim.update( 1.0, 1 );

	tf.ASSERT_EQ( obj.x, 1 );
	tf.ASSERT_EQ( obj.y, 0 );
	tf.ASSERT_EQ( anim.threads[0].length, 0 );
	tf.ASSERT_EQ( anim.default.targets['y'].value, 0 );

	anim.update( 1.0, 1 );

	tf.ASSERT_EQ( obj.x, 1 );
	tf.ASSERT_EQ( obj.y, 0 );

	// with Vec2
	// initTargetObj() type checking
	let obj2 = {
		a: new Vec2(),
		b: new Vec2()
	}

	anim = new Anim( {
		'a': new AnimField( obj2, 'a', Math.sqrt( 2 ) ),
		'b': new AnimField( obj2, 'b', 0.6 ),
	},
	new AnimFrame( {
		'a': new AnimTarget( new Vec2( 3, 3 ) ),
		'b': new AnimTarget( new Vec2( 0, -1 ) ),
	} ) );

	// type mismatch, no push
	tf.ASSERT_EQ( anim.threads.length, 0 );
	tf.ASSERT_EQ( anim.pushFrame( new AnimFrame( { 'a': new AnimTarget( 1 ) } ) ), false );
	tf.ASSERT_EQ( anim.threads.length, 0 );

	anim.update( 1.0, 1 );

	tf.ASSERT_EQ( obj2.a, new Vec2( 1, 1 ) );
	tf.ASSERT_EQ( obj2.b, new Vec2( 0, -0.6 ) );

	anim.update( 1.0, 1 );

	tf.ASSERT_EQ( obj2.a, new Vec2( 2, 2 ) );
	tf.ASSERT_EQ( obj2.b, new Vec2( 0, -1 ) );

	anim.pushFrame( new AnimFrame( {
		'b': { value: new Vec2( 0, 0 ), expireOnReach: true }
	} ) );

	anim.update( 1.0, 1 );

	tf.ASSERT_EQ( obj2.a, new Vec2( 2, 2 ) );
	tf.ASSERT_EQ( obj2.b, new Vec2( 0, -0.4 ) );

	anim.update( 1.0, 1 );

	tf.ASSERT_EQ( obj2.a, new Vec2( 2, 2 ) );
	tf.ASSERT_EQ( obj2.b, new Vec2( 0, 0 ) );

	anim.update( 1.0, 1 );

	tf.ASSERT_EQ( obj2.a, new Vec2( 3, 3 ) );
	tf.ASSERT_EQ( obj2.b, new Vec2( 0, -0.6 ) );

	anim.update( 1.0, 1 );

	tf.ASSERT_EQ( obj2.a, new Vec2( 3, 3 ) );
	tf.ASSERT_EQ( obj2.b, new Vec2( 0, -1 ) );
}

function test_PhysField( tf: TestFuncs ) {

	// constructor()
	// updateVec2()
	// updateNumber()
	// zero()
	let obj3 = {
		p: new Vec2(),
		dp: new Vec2(),

		x: 0,
		dx: 0
	}

	let anim = new Anim( {
		'p': new PhysField( obj3, 'p', 'dp', 5 ),
		'x': new PhysField( obj3, 'x', 'dx', 1 )
	},
	new AnimFrame( {
		'p': { value: new Vec2( 8, 6 ) },
		'x': { value: 2 }
	} ) );

	anim.update( 1.0, 1 );
	obj3.p.add( obj3.dp );
	obj3.x += obj3.dx;

	tf.ASSERT_EQ( obj3.dp, new Vec2( 4, 3 ) );
	tf.ASSERT_EQ( obj3.p, new Vec2( 4, 3 ) );
	tf.ASSERT_EQ( obj3.dx, 1 );
	tf.ASSERT_EQ( obj3.x, 1 );

	anim.update( 1.0, 1 );
	obj3.p.add( obj3.dp );
	obj3.x += obj3.dx;

	tf.ASSERT_EQ( obj3.dp, new Vec2( 4, 3 ) );
	tf.ASSERT_EQ( obj3.p, new Vec2( 8, 6 ) );
	tf.ASSERT_EQ( obj3.dx, 1 );
	tf.ASSERT_EQ( obj3.x, 2 );

	anim.update( 1.0, 1 );
	obj3.p.add( obj3.dp );
	obj3.x += obj3.dx;	

	tf.ASSERT_EQ( obj3.dp, new Vec2( 0, 0 ) );
	tf.ASSERT_EQ( obj3.p, new Vec2( 8, 6 ) );
	tf.ASSERT_EQ( obj3.dx, 0 );
	tf.ASSERT_EQ( obj3.x, 2 );

	// zero() (explicit)
	obj3.dp.set( new Vec2( 1, 1 ) );
	( anim.fields['p'] as PhysField ).zero();

	tf.ASSERT_EQ( obj3.dp, new Vec2( 0, 0 ) );

	obj3.dx = 1;
	( anim.fields['x'] as PhysField ).zero();

	tf.ASSERT_EQ( obj3.dx, 0 );
}

function test_reachOnCount( tf: TestFuncs ) {
	let obj = {
		x: 0,
		y: 0,
	}

	let anim = new Anim( {
		'x': new AnimField( obj, 'x', 1 ),
		'y': new AnimField( obj, 'y', 0.1 ),
	},
	new AnimFrame( {
		'x': { value: 1 },
		'y': { value: 1 },
	} ) );

	anim.pushFrame( new AnimFrame( { 'x': { value: 6, reachOnCount: 10 } } ) );

	anim.update( 1.0, 1 );
	tf.ASSERT_EQ( obj.x, 0.6 );

	anim.update( 0.5, 1 );
	tf.ASSERT_EQ( obj.x, 1.2 ); // step shouldn't matter as long as it's not zero

	anim.update( 1.1, 1 );
	tf.ASSERT_EQ( obj.x, 1.8 );

	anim.update( 1.7, 2 );
	tf.ASSERT_EQ( obj.x, 3 );

	anim.update( 0.1, 3 );
	tf.ASSERT_EQ( obj.x, 4.8 );

	anim.update( 1.0, 2 );
	tf.ASSERT_EQ( obj.x, 6 );

	anim.update( 1.0, 1 );
	tf.ASSERT_EQ( obj.x, 5 ); // falling back to default

	let obj2 = {
		a: new Vec2(),
	}

	anim = new Anim( {
		'a': new AnimField( obj2, 'a', 5 ),
	},
	new AnimFrame( {
		'a': { value: new Vec2() },
	} ) );

	anim.pushFrame( new AnimFrame( { 'a': { value: new Vec2( 6, 8 ), reachOnCount: 5 } } ) );

	anim.update( 1.0, 1 );
	tf.ASSERT_EQ( obj2.a, new Vec2( 1.2, 1.6 ) );

	anim.update( 0.5, 1 );
	tf.ASSERT_EQ( obj2.a, new Vec2( 2.4, 3.2 ) ); // step shouldn't matter as long as it's not zero

	anim.update( 1.1, 2 );
	tf.ASSERT_EQ( obj2.a, new Vec2( 4.8, 6.4 ) );

	anim.update( 1.0, 1 );
	tf.ASSERT_EQ( obj2.a, new Vec2( 6, 8 ) ); 

	anim.update( 1.0, 1 );
	tf.ASSERT_EQ( obj2.a, new Vec2( 3, 4 ) ); // falling back to default
}

/*
function test_freeFields( tf: TestFuncs ) {
	let obj = {
		x: 0,
		y: 0,
	}

	let anim = new Anim( {
		'x': new AnimField( obj, 'x', 1 ),
		'y': new AnimField( obj, 'y', 0.1, { isFree: true } ),
	},
	new AnimFrame( {
		'x': { value: 1 },
		'y': { value: 1 },
	} ) );

	anim.pushFrame( new AnimFrame( {
		'x': { value: 4, expireOnReach: true }
	} ) ); // default pass=Pass.FREE_FIELDS
	anim.update( 1.0, 1 );

	tf.ASSERT_EQ( obj.x, 1 );
	tf.ASSERT_EQ( obj.y, 0.1 );

	anim.pushFrame( new AnimFrame( {
		'x': { value: 2, expireOnReach: true }
	}, [], Pass.NONE ) );
	anim.update( 1.0, 1 );

	tf.ASSERT_EQ( obj.x, 2 );
	tf.ASSERT_EQ( obj.y, 0.1 ); // doesn't update due to Pass.NONE being set

	anim.pushFrame( new AnimFrame( {
		'x': { value: 0, expireOnReach: true }
	}, [], Pass.ALL_OTHER_FIELDS ) );
	anim.update( 1.0, 1 );

	tf.ASSERT_EQ( obj.x, 1 );
	tf.ASSERT_EQ( obj.y, 0.2 ); // updates now that Pass.NONE is not set

	anim.update( 1.0, 1 );

	tf.ASSERT_EQ( obj.x, 0 ); // old frame expires but value doesn't start rising yet
	tf.ASSERT_EQ( obj.y, 0.3 ); 

	let frame = new AnimFrame( {
		'y': { value: 4, expireOnReach: true, overrideRate: 1 }
	} );
	anim.pushFrame( frame );
	anim.update( 1.0, 1 );

	tf.ASSERT_EQ( obj.x, 0 ); // doesn't update because x is not a free field
	tf.ASSERT_EQ( obj.y, 1.3 ); // only updates once (rate 1)

	frame.pass = Pass.ALL_OTHER_FIELDS;

	anim.update( 1.0, 1 );

	tf.ASSERT_EQ( obj.x, 1 ); // updates due to Pass.ALL_OTHER_FIELDS
	tf.ASSERT_EQ( obj.y, 2.3 ); // only updates once (rate 1)
}
*/

/* removed feature, not running */
/*
function test_readOnlyTargets( tf: TestFuncs ) {
	let obj = {
		x: 0,
		y: 0,
	}

	let anim = new Anim( {
		'x': new AnimField( obj, 'x', 1 ),
		'y': new AnimField( obj, 'y', 1 ),
	},
	new AnimFrame( {
		'x': { value: 0 },
		'y': { value: 0 },
	} ) );

	anim.pushFrame( new AnimFrame( {
		'x': { value: 4, expireOnReach: true, readOnly: true },
		'y': { value: 2 }
	} ) );

	anim.update( 1.0, 1 );

	tf.ASSERT_EQ( obj.x, 0 ); // x does not update
	tf.ASSERT_EQ( obj.y, 1 );

	obj.x = 4;

	anim.update( 1.0, 1 );

	tf.ASSERT_EQ( obj.x, 4 ); // x reaches target due to external change of variable
	tf.ASSERT_EQ( obj.y, 2 );

	anim.update( 1.0, 1 );

	tf.ASSERT_EQ( obj.x, 3 ); // both values begin to fall 
	tf.ASSERT_EQ( obj.y, 1 ); // 
}*/

/* removed feature, not running */
function test_targetObjs( tf: TestFuncs ) {
	let obj2 = {
		x: 0,
		y: 0
	}	

	let obj = {
		sub: obj2,
		sub2: obj2,
		y: 0
	}

	let anim = new Anim( {
		'sub': new AnimField( obj, 'sub', 1 ),
		'sub-obj': new AnimField( obj, 'sub', 1 ),
		'y': new AnimField( obj, 'y', 1 ),
	},
	new AnimFrame( {
		'y': { value: -2 },
	} ) );

	// no field sub2 in anim, though field exists on obj
	tf.THROWS( () => {
		anim.pushFrame( new AnimFrame( {
			'sub2.y': { value: 2, expireOnReach: true },
		} ) );
	} );

	// no field z in obj2
	tf.THROWS( () => {
		anim.pushFrame( new AnimFrame( {
			'sub.z': { value: 2, expireOnReach: true },
		} ) );
	} );

	// ok
	anim.update( 1.0, 1 );

	tf.ASSERT_EQ( obj.sub.x, 0 );
	tf.ASSERT_EQ( obj.sub.y, 0 );
	tf.ASSERT_EQ( obj.y, -1 );

	anim.pushFrame( new AnimFrame( {
		'sub.y': { value: 2, expireOnReach: true },
	} ) );

	anim.update( 1.0, 1 );

	tf.ASSERT_EQ( obj.sub.x, 0 );
	tf.ASSERT_EQ( obj.sub.y, 1 );
	tf.ASSERT_EQ( obj.y, -1 ); // no change, frame references a different y

	anim.update( 1.0, 1 );

	tf.ASSERT_EQ( obj.sub.x, 0 );
	tf.ASSERT_EQ( obj.sub.y, 2 );
	tf.ASSERT_EQ( obj.y, -1 ); // no change again

	anim.update( 1.0, 1 );

	tf.ASSERT_EQ( obj.sub.x, 0 );
	tf.ASSERT_EQ( obj.sub.y, 2 );
	tf.ASSERT_EQ( obj.y, -2 ); // other frame is gone, changing again

	anim.pushFrame( new AnimFrame( {
		'sub-obj.x': { value: 2, expireOnReach: true }, // field key is not a variable names
	} ) );	

	anim.update( 1.0, 1 );

	tf.ASSERT_EQ( obj.sub.x, 1 );
	tf.ASSERT_EQ( obj.sub.y, 2 );
	tf.ASSERT_EQ( obj.y, -2 ); // other frame is gone, changing again
}

type TestObj = {
	x: number;
	A: () => void;
	B: ( arg0: number ) => void;
}

function test_AnimFunc( tf: TestFuncs ) {
	let obj: TestObj = {
		x: 0,
		A: () => obj.x += 1,
		B: ( arg0: number ) => obj.x += arg0,
	};

	let anim = new Anim( {
		'x': new AnimField( obj, 'x', 1 ),
	},
	new AnimFrame( {
		'x': { value: -2 },
	} ) );

	tf.ASSERT_EQ( anim.threads.length, 0 );
	tf.ASSERT_EQ( 
		anim.pushFrame( new AnimFrame( {}, [{ caller: null, funcName: 'A' }] ) ), // no caller object
		false );

	tf.ASSERT_EQ( 
		anim.pushFrame( new AnimFrame( {}, [{ caller: obj, funcName: 'y' }] ) ), // not a function
		false );

	tf.ASSERT_EQ( 
		anim.pushFrame( new AnimFrame( {}, [{ caller: obj, funcName: 'x' }] ) ), // not a function
		false );
	tf.ASSERT_EQ( anim.threads.length, 0 );

	anim.pushFrame( new AnimFrame( {}, [
		{ caller: obj, funcName: 'A' }
	] ) );

	anim.update( 1.0, 1 );

	tf.ASSERT_EQ( obj.x, 1 );

	anim.update( 1.0, 1 );

	tf.ASSERT_EQ( obj.x, 0 );

	anim.pushFrame( new AnimFrame( {}, [
		{ caller: obj, funcName: 'B', args: [2] }
	] ) );

	anim.update( 1.0, 1 );

	tf.ASSERT_EQ( obj.x, 2 );

	anim.update( 1.0, 1 );

	tf.ASSERT_EQ( obj.x, 1 );	
}

function test_angleField( tf: TestFuncs ) {
	let obj = {
		x: 0,
		xVel: 0,
		y: 0
	}	

	let anim = new Anim( {
		'x': new PhysField( obj, 'x', 'xVel', 0.1, { isAngle: true } ),
		'y': new AnimField( obj, 'y', 0.1, { isAngle: true } ),
	},
	new AnimFrame( {
		'x': { value: -1 },
		'y': { value: -1 },
	} ) );

	// ok
	anim.update( 1.0, 1 );
	obj.x += obj.xVel;

	tf.ASSERT_EQ( obj.x, -0.1 );
	tf.ASSERT_EQ( obj.y, -0.1 );

	anim.pushFrame( new AnimFrame( {
		'x': { value: Math.PI * 2 + 0.1, expireOnReach: true },
		'y': { value: Math.PI * 2 + 0.1, expireOnReach: true }
	} ) );

	anim.update( 1.0, 1 );
	obj.x += obj.xVel;

	tf.ASSERT_EQ( obj.x, 0.0 );
	tf.ASSERT_EQ( obj.y, 0.0 );

	anim.update( 1.0, 1 );
	obj.x += obj.xVel;

	tf.ASSERT_EQ( obj.x, 0.1 );
	tf.ASSERT_EQ( obj.y, 0.1 );

	anim.update( 1.0, 1 );
	obj.x += obj.xVel;

	tf.ASSERT_EQ( obj.x, 0.0 ); // falling back toward -1
	tf.ASSERT_EQ( obj.y, 0.0 ); //

	anim.pushFrame( new AnimFrame( {
		'x': { value: -Math.PI * 2 + 0.1, expireOnReach: true },
		'y': { value: -Math.PI * 2 + 0.1, expireOnReach: true }
	} ) );

	anim.update( 1.0, 1 );
	obj.x += obj.xVel;

	tf.ASSERT_EQ( obj.x, 0.1 );
	tf.ASSERT_EQ( obj.y, 0.1 );

	anim.update( 1.0, 1 );
	obj.x += obj.xVel;

	tf.ASSERT_EQ( obj.x, 0.0 ); // falling back toward -1
	tf.ASSERT_EQ( obj.y, 0.0 ); //
}

function test_fieldGroup( tf: TestFuncs ) {
	let obj = {
		x: 0,
		y: -1
	}	

	let anim = new Anim( {
		'x': new AnimField( obj, 'x', 1 ),
		'y': new AnimField( obj, 'y', 1 ),
	},
	new AnimFrame( {
		'x': { value: 0 },
		'y': { value: 0 },
	} ) );

	tf.THROWS( () => anim.addGroup( 'x', ['x', 'y'] ) ); // group has same key as field x
	tf.THROWS( () => anim.addGroup( 'vars', [] ) ); // no keys in group
	tf.THROWS( () => anim.addGroup( 'vars', ['x', 'z'] ) ); // no field for key z

	// ok
	anim.addGroup( 'vars', ['x', 'y'] );
	anim.pushFrame( new AnimFrame( {
		'vars': { value: 1, expireOnReach: true }
	} ) );

	anim.update( 1.0, 1 );

	tf.ASSERT_EQ( obj.x, 1 ); // x at target
	tf.ASSERT_EQ( obj.y, 0 ); // y still rising

	anim.update( 1.0, 1 );

	tf.ASSERT_EQ( obj.x, 1 );
	tf.ASSERT_EQ( obj.y, 1 );

	anim.update( 1.0, 1 );

	tf.ASSERT_EQ( obj.x, 0 );
	tf.ASSERT_EQ( obj.y, 0 );
}

function test_clear( tf: TestFuncs ) {
	let obj = {
		x: 0,
	}	

	let anim = new Anim( {
		'x': new AnimField( obj, 'x', 1 ),
	},
	new AnimFrame( {
		'x': { value: 1 },
	} ) );

	tf.ASSERT_EQ( anim.default.targets['x'].value, 1 );

	anim.clear();

	tf.ASSERT_EQ( anim.default.targets['x'].value, 1 );

	anim.default.tag = 'mark';
	anim.clear( { withTag: 'mark' } );

	tf.ASSERT_EQ( anim.default.targets['x'].value, 1 ); // don't clear default frame


	anim.pushFrame( new AnimFrame( {
		'x': { value: -4, expireOnReach: true } // this frame will stay
	} ), { tag: 'mark2' } );

	anim.pushFrame( new AnimFrame( {
		'x': { value: 4, expireOnReach: true } // this frame will be cleared
	} ), { tag: 'mark' } );

	tf.ASSERT_EQ( anim.threads[0].length, 2 );

	anim.clear( { withTag: 'mark' } );
	anim.update( 1.0, 1 );

	tf.ASSERT_EQ( anim.threads[0].length, 1 );
	tf.ASSERT_EQ( obj.x, -1 );


	anim.pushFrame( new AnimFrame( {
		'x': { value: 4, expireOnReach: true } // this frame will be cleared
	} ), { tag: 'mark' } );

	tf.ASSERT_EQ( anim.threads[0].length, 2 );

	anim.clear( { withoutTag: 'mark2' } );
	anim.update( 1.0, 1 );

	tf.ASSERT_EQ( anim.threads[0].length, 1 );
	tf.ASSERT_EQ( obj.x, -2 );
}

function test_frameDelay( tf: TestFuncs ) {
	let obj = {
		x: -2,
	}	

	let anim = new Anim( {
		'x': new AnimField( obj, 'x', 1 ),
	},
	new AnimFrame( {
		'x': { value: 0 },
	} ) );

	anim.pushFrame( new AnimFrame( {
		'x': { value: -4, expireOnReach: true }
	} ), { delay: 2 } );

	anim.update( 1.0, 1 );
	tf.ASSERT_EQ( obj.x, -2 ); // if all frames have delays, do nothing (not even default frame)

	anim.update( 1.0, 1 );
	tf.ASSERT_EQ( obj.x, -2 ); // delay goes to 0

	anim.update( 1.0, 1 );
	tf.ASSERT_EQ( obj.x, -3 ); // delayed frame doesn't start until update AFTER delay goes to 0 

	anim.clear();

	anim.update( 3.0, 1 );
	tf.ASSERT_EQ( obj.x, 0 );


	anim.pushFrame( new AnimFrame( {
		'x': { value: 4, expireOnReach: true }
	} ) );

	anim.pushFrame( new AnimFrame( {
		'x': { value: -4, expireOnReach: true }
	} ), { delay: 2 } );

	anim.update( 1.0, 1 );
	tf.ASSERT_EQ( obj.x, 1 );

	anim.update( 1.0, 0.9 ); // delay goes to 0
	tf.ASSERT_EQ( obj.x, 2 );

	anim.update( 1.0, 0.1 );
	tf.ASSERT_EQ( obj.x, 3 ); // delayed frame doesn't start until update AFTER delay goes to 0 

	anim.update( 4.0, 1 );
	tf.ASSERT_EQ( obj.x, -1 );
}

function test_threads( tf: TestFuncs ) {
	let obj = {
		x: 0,
		y: 0,
		z: 0
	}	

	let anim = new Anim( {
		'x': new AnimField( obj, 'x', 1 ),
		'y': new AnimField( obj, 'y', 1 ),
	},
	new AnimFrame( {
		'x': { value: -2 },
		'y': { value: -2 },
	} ) );

	tf.ASSERT( anim.isDone() );
	tf.THROWS( () => anim.isDone( [-1] ) ); // out of range
	tf.ASSERT( anim.isDone( [1] ) ); // nonexistent threads are done 

	anim.pushFrame( new AnimFrame( {
		'x': { value: 2, expireOnReach: true }, // no throw, since collisions with default frame are ignored
	} ) ); // thread 0 by default

	tf.ASSERT_EQ( anim.threads.length, 1 );
	tf.ASSERT_EQ(
		 // x is already present in thread 0 (duplicate target ALLOWED)
		anim.pushFrame( new AnimFrame( { 'x': { value: 2, expireOnReach: true } } ), { threadIndex: 1 } ),
		true );
	tf.ASSERT_EQ( anim.threads.length, 2 );

	anim.pushFrame( new AnimFrame( {
		'y': { value: 2, expireOnReach: true }, // no throw, since collisions with default frame are ignored
	} ), { threadIndex: 1 } );

	tf.ASSERT_EQ( anim.isDone(), false );
	tf.ASSERT_EQ( anim.threads.length, 2 );
	tf.ASSERT_EQ( anim.threads[0].length, 1 );
	tf.ASSERT_EQ( anim.threads[1].length, 2 );

	anim.update( 1.0, 1 );

	tf.ASSERT_EQ( obj.x, 1 ); // both threads get run
	tf.ASSERT_EQ( obj.y, 1 );

	anim.clear();

	tf.ASSERT_EQ( anim.isDone(), true );
	tf.ASSERT_EQ( anim.threads.length, 2 ); // same number of threads
	tf.ASSERT_EQ( anim.threads[0].length, 0 ); // threads cleared completely
	tf.ASSERT_EQ( anim.threads[1].length, 0 );

	tf.ASSERT_EQ( obj.x, 1 ); // same values
	tf.ASSERT_EQ( obj.y, 1 );

	anim.pushFrame( new AnimFrame( {
		'y': { value: 2, expireOnReach: true, setDefault: true }, // no throw, since collisions with default frame are ignored
	} ), { threadIndex: 1 } );

	tf.ASSERT_EQ( anim.isDone(), false );

	anim.update( 1.0, 1 );

	tf.ASSERT_EQ( anim.isDone(), true );
	tf.ASSERT_EQ( obj.y, 2 );

	anim.update( 1.0, 1 );

	tf.ASSERT_EQ( obj.y, 2 ); // new default is 2
}

function test_overrideDelta( tf: TestFuncs ) {

	// no rates
	let obj: any = {
		x: 0,
		y: new Vec2( 0, 0 )
	}	

	let anim = new Anim( {
		'x': new AnimField( obj, 'x', 2 ),
		'y': new AnimField( obj, 'y', 2 )
	} );

	anim.pushFrame( new AnimFrame( {
		'x': { value: 1, overrideDelta: true, expireOnCount: 10 },
		'y': { value: new Vec2( 1, 1 ), overrideDelta: true },
	} ) );

	anim.update( 4.0, 1 );

	tf.ASSERT_EQ( obj.x, 4 ); // if overrideDelta were not set this would be 1
	tf.ASSERT_EQ( obj.y, new Vec2( 4, 4 ) ); // if overrideDelta were not set this would be (1, 1)

	// PhysFields
	obj = {
		x: 0,
		dx: 0,
		y: new Vec2( 0, 0 ),
		dy: new Vec2( 0, 0 )
	}	

	anim = new Anim( {
		'x': new PhysField( obj, 'x', 'dx', 2 ),
		'y': new PhysField( obj, 'y', 'dy', 2 )
	} );
	
	anim.pushFrame( new AnimFrame( {
		'x': { value: 1, overrideDelta: true, expireOnCount: 10 },
		'y': { value: new Vec2( 1, 1 ), overrideDelta: true },
	} ) );

	anim.update( 4.0, 1 );

	tf.ASSERT_EQ( obj.x, 0 ); // advance() was never called
	tf.ASSERT_EQ( obj.dx, 4 ); // if overrideDelta were not set this would be 1
	tf.ASSERT_EQ( obj.y, new Vec2( 0, 0 ) ); // advance() was never called
	tf.ASSERT_EQ( obj.dy, new Vec2( 4, 4 ) ); // if overrideDelta were not set this would be (1, 1)
}

function test_AnimTarget( tf: TestFuncs ) {
	// constructor()
	let target = new AnimTarget( 0, { expireOnCount: 10 } );

	tf.ASSERT_EQ( target.expiration, Expiration.expireOnCount );
	tf.ASSERT_EQ( target.count, 10 );

	// updateCount()
	target.updateCount( 1 );

	tf.ASSERT_EQ( target.count, 9 );
}

function shake_AnimTarget( tf: TestFuncs ) {
	let target = new AnimTarget( 0 );

	tf.ASSERT( target.copy() !== null );

	let toaster = new tp.Toaster( constructors, nameMap );
	tf.ASSERT( target.toToast( toaster ) !== null );	
}

function shake_AnimField( tf: TestFuncs ) {
	let field = new AnimField( { a: 0 }, 'a' );

	field.edit( 'rate', 1 );
	tf.ASSERT_EQ( field.rate, 1 );

	let toaster = new tp.Toaster( constructors, nameMap );
	tf.ASSERT( field.toToast( toaster ) !== null );
}

function shake_AnimFrame( tf: TestFuncs ) {
	let frame = new AnimFrame( {} );

	frame.edit( 'delay', 1 );

	let toaster = new tp.Toaster( constructors, nameMap );
	tf.ASSERT( frame.toToast( toaster ) !== null );
}

let tests: Array<Test> = [];

tests.push( new Test( 'Anim',
					  test_Anim,
					  ['constructor',
					   'pushFrame',
					   'updateNumber',
					   'updateVec2',
					   'initTargetObj',
					   'update',
					   'updateThread',
					   'updateFrame',
					   'completeFrame',
					   'setDefault',
					   'AnimField.constructor',
					   'AnimField.get',
					   'AnimField.set',
					   'AnimFrame.constructor',
					   'AnimFrame.inProgress'],
					  [] ) );

tests.push( new Test( 'PhysField',
					  test_PhysField,
					  ['constructor',
					   'updateVec2',
					   'updateNumber',
					   'Anim.updatePhysical',
					   'zero'],
					  [] ) );

tests.push( new Test( 'Anim',
					  test_reachOnCount,
					  [] ) );

/*tests.push( new Test( 'Anim',
					  test_freeFields,
					  ['blockFields'],
					  [] ) );*/

/*tests.push( new Test( 'Anim',
					  test_readOnlyTargets,
					  [] ) );*/

tests.push( new Test( 'Anim',
					  test_AnimFunc,
					  ['initFrame'],
					  [] ) );

tests.push( new Test( 'PhysField',
					  test_angleField,
					  [] ) );

tests.push( new Test( 'Anim',
					  test_fieldGroup,
					  ['addGroup'] ) );

tests.push( new Test( 'Anim',
					  test_clear,
					  ['clear',
					   'clearAllThreads',
					   'clearByTag'] ) );

tests.push( new Test( 'Anim',
					  test_frameDelay,
					  [] ) );

tests.push( new Test( 'Anim',
					  test_threads,
					  ['matchesOtherThread',
					   'update',
					   'updateThread',
					   'completeFrame', // defaults set correctly
					   'isDone'] ) );

tests.push( new Test( 'Anim',
					  test_overrideDelta,
					  [] ) );

tests.push( new Test( 'AnimTarget',
					  shake_AnimTarget,
					  ['copy', 'toToast'] ) );

tests.push( new Test( 'AnimField',
					  shake_AnimField,
					  ['edit', 'toToast'] ) );

tests.push( new Test( 'AnimFrame',
					  shake_AnimFrame,
					  ['edit', 'toToast'] ) );

export default tests;