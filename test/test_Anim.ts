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

	anim.update( 1.0, 1 );

	tf.ASSERT_EQ( obj.x, 1 );
	tf.ASSERT_EQ( obj.y, 1 );

	anim.pushFrame( new AnimFrame( {
		'y': { value: 0, expireOnReach: true, setDefaultOnFinish: true }
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


	// with derivatives
	let obj3 = {
		p: new Vec2(),
		dp: new Vec2()
	}

	anim = new Anim( {
		'p': new PhysField( obj3, 'p', 'dp', 5, 0.1 ),
	},
	new AnimFrame( {
		'p': { value: new Vec2( 8, 6 ) },
	} ) );

	anim.update( 1.0, 1 );
	obj3.p.add( obj3.dp );

	tf.ASSERT_EQ( obj3.dp, new Vec2( 4, 3 ) );
	tf.ASSERT_EQ( obj3.p, new Vec2( 4, 3 ) );

	anim.update( 1.0, 1 );
	obj3.p.add( obj3.dp );

	tf.ASSERT_EQ( obj3.dp, new Vec2( 4, 3 ) );
	tf.ASSERT_EQ( obj3.p, new Vec2( 8, 6 ) );

	anim.update( 1.0, 1 );
	obj3.p.add( obj3.dp );

	tf.ASSERT_EQ( obj3.dp, new Vec2( 0, 0 ) );
	tf.ASSERT_EQ( obj3.p, new Vec2( 8, 6 ) );
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

let tests: Array<Test> = [];

tests.push( new Test( 'Anim',
					  test_Anim,
					  ['constructor',
					   'pushFrame',
					   'updateNumber',
					   'updateVec2',
					   'update',
					   'Anim.function.AnimField',
					   'Anim.function.AnimFrame'],
					  [] ) );

tests.push( new Test( 'Anim',
					  test_reachOnCount,
					  [],
					  [] ) );

export default tests;