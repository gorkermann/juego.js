import { TestFuncs, Test } from '../lib/TestRun.js'

import { Anim, AnimFrame, AnimField, PhysField } from '../Anim.js'
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
		'x': { value: 1 },
		'y': { value: 1 },
		'onFire': { value: true }
	} ) );

	// no var in object for field name
	tf.THROWS( () => new AnimField( obj, 'xx', 1 ) );

	// no field for frame key
	tf.THROWS( () => anim.pushFrame( new AnimFrame( {
		'a': { value: 0 }
	} ) ) );

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
	tf.ASSERT_EQ( anim.stack.length, 1 );

	anim.pushFrame( new AnimFrame( {
		'x': { value: 2, expireOnReach: true },
		'onFire': { value: false } // no expiration set
	} ) );

	tf.ASSERT_EQ( anim.stack.length, 2 ); // new frame is present

	anim.update( 1.0, 1 );

	tf.ASSERT_EQ( obj.x, 2 );
	tf.ASSERT_EQ( obj.y, 0.25 );
	tf.ASSERT_EQ( obj.onFire, false );

	tf.ASSERT_EQ( anim.stack.length, 1 ); // new frame is gone

	// return to old targets
	anim.update( 1.0, 1 );

	tf.ASSERT_EQ( obj.x, 1 );
	tf.ASSERT_EQ( obj.y, 0.35 );
	tf.ASSERT_EQ( obj.onFire, true );

	// push a frame for a certain duration
	anim.pushFrame( new AnimFrame( {
		'x': { value: 10, expireOnCount: 100 }
	} ) );

	anim.update( 1.0, 99 );

	tf.ASSERT_EQ( obj.x, 2 );
	tf.ASSERT_EQ( obj.y, 0.35 );

	// no change if elapsed=0
	anim.update( 1.0, 0 );

	tf.ASSERT_EQ( obj.x, 3 );
	tf.ASSERT_EQ( obj.y, 0.35 );

	// trip duration counter
	tf.ASSERT_EQ( anim.stack.length, 2 );

	anim.update( 1.0, 1 );

	tf.ASSERT_EQ( obj.x, 4 );
	tf.ASSERT_EQ( obj.y, 0.35 );
	tf.ASSERT_EQ( anim.stack.length, 1 );

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
		'y': { value: 0, expireOnReach: true, setDefault: true }
	} ) );

	anim.update( 1.0, 1 );

	tf.ASSERT_EQ( obj.x, 1 );
	tf.ASSERT_EQ( obj.y, 0.3 );
	tf.ASSERT_EQ( anim.stack.length, 2 );

	anim.update( 1.0, 1 );

	tf.ASSERT_EQ( obj.x, 1 );
	tf.ASSERT_EQ( obj.y, 0 );
	tf.ASSERT_EQ( anim.stack.length, 1 );

	tf.ASSERT_EQ( anim.stack[0].targets['y'].value, 0 )

	anim.update( 1.0, 1 );

	tf.ASSERT_EQ( obj.x, 1 );
	tf.ASSERT_EQ( obj.y, 0 );

	// with Vec2
	let obj2 = {
		a: new Vec2(),
		b: new Vec2()
	}

	anim = new Anim( {
		'a': new AnimField( obj2, 'a', Math.sqrt( 2 ) ),
		'b': new AnimField( obj2, 'b', 0.6 ),
	},
	new AnimFrame( {
		'a': { value: new Vec2( 3, 3 ) },
		'b': { value: new Vec2( 0, -1 ) },
	} ) );

	// type mismatch
	tf.THROWS( () => {
		anim.pushFrame( new AnimFrame( { 
			'a': { value: 1 } 
		} ) );
	} );

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

	// constructor
	// updateVec2
	// updateNumber
	// zero
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

	// zero (explicit)
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
		'y': { value: 4 }
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
}

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
		'y': new AnimField( obj, 'y', 1 ),
	},
	new AnimFrame( {
		'y': { value: -2 },
	} ) );

	// no field sub2 in anim
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
	tf.ASSERT_EQ( obj.y, -1 ); // no change

	anim.update( 1.0, 1 );

	tf.ASSERT_EQ( obj.sub.x, 0 );
	tf.ASSERT_EQ( obj.sub.y, 2 );
	tf.ASSERT_EQ( obj.y, -1 ); // no change

	anim.update( 1.0, 1 );

	tf.ASSERT_EQ( obj.sub.x, 0 );
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

	tf.THROWS( () => anim.addGroup( 'x', ['x', 'y'] ) );
	tf.THROWS( () => anim.addGroup( 'vars', [] ) );
	tf.THROWS( () => anim.addGroup( 'vars', ['x', 'z'] ) );

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
		'x': { value: 0 },
	} ) );

	tf.ASSERT_EQ( anim.stack.length, 1 );

	anim.clear();

	tf.ASSERT_EQ( anim.stack.length, 1 );

	anim.stack[0].tag = 'mark';
	anim.clear( { withTag: 'mark' } );

	tf.ASSERT_EQ( anim.stack.length, 1 ); // don't clear default frame


	anim.pushFrame( new AnimFrame( {
		'x': { value: -4, expireOnReach: true }
	} ), { tag: 'mark2' } );

	anim.pushFrame( new AnimFrame( {
		'x': { value: 4, expireOnReach: true }
	} ), { tag: 'mark' } );

	anim.clear( { withTag: 'mark' } );
	anim.update( 1.0, 1 );

	tf.ASSERT_EQ( anim.stack.length, 2 );
	tf.ASSERT_EQ( obj.x, -1 );


	anim.pushFrame( new AnimFrame( {
		'x': { value: 4, expireOnReach: true }
	} ), { tag: 'mark' } );

	anim.clear( { withoutTag: 'mark2' } );
	anim.update( 1.0, 1 );

	tf.ASSERT_EQ( anim.stack.length, 2 );
	tf.ASSERT_EQ( obj.x, -2 );
}

function test_frameDelay( tf: TestFuncs ) {
	let obj = {
		x: 0,
	}	

	let anim = new Anim( {
		'x': new AnimField( obj, 'x', 1 ),
	},
	new AnimFrame( {
		'x': { value: 0 },
	} ) );

	anim.pushFrame( new AnimFrame( {
		'x': { value: 4, expireOnReach: true }
	} ) );

	anim.pushFrame( new AnimFrame( {
		'x': { value: -4, expireOnReach: true }
	} ), { delay: 2 } );

	anim.update( 1.0, 1 );
	tf.ASSERT_EQ( obj.x, 1 );

	anim.update( 1.0, 0.9 );
	tf.ASSERT_EQ( obj.x, 2 );

	anim.update( 1.0, 0.1 );
	tf.ASSERT_EQ( obj.x, 3 ); // delayed frame doesn't start until update AFTER delay goes to 0 

	anim.update( 4.0, 1 );
	tf.ASSERT_EQ( obj.x, -1 );
}


let tests: Array<Test> = [];

tests.push( new Test( 'Anim',
					  test_Anim,
					  ['constructor',
					   'pushFrame',
					   'updateNumber',
					   'updateVec2',
					   'update',
					   'completeFrame',
					   'Anim.function.AnimField',
					   'AnimFrame.constructor',
					   'AnimFrame.inProgress'],
					  [] ) );

tests.push( new Test( 'PhysField',
					  test_PhysField,
					  ['constructor',
					   'updateVec2',
					   'updateNumber',
					   'zero'],
					  [] ) );

tests.push( new Test( 'Anim',
					  test_reachOnCount,
					  [],
					  [] ) );

/*tests.push( new Test( 'Anim',
					  test_freeFields,
					  ['blockFields'],
					  [] ) );*/

tests.push( new Test( 'Anim',
					  test_readOnlyTargets,
					  [],
					  [] ) );

tests.push( new Test( 'Anim',
					  test_targetObjs,
					  [],
					  [] ) );

tests.push( new Test( 'Anim',
					  test_AnimFunc,
					  [],
					  [] ) );

tests.push( new Test( 'PhysField',
					  test_angleField,
					  [],
					  [] ) );

tests.push( new Test( 'Anim',
					  test_fieldGroup,
					  ['addGroup'],
					  [] ) );

tests.push( new Test( 'Anim',
					  test_clear,
					  ['clear'],
					  [] ) );

tests.push( new Test( 'Anim',
					  test_frameDelay,
					  [],
					  [] ) );

export default tests;