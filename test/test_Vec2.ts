import { TestFuncs, Test } from '../lib/TestRun.js'

import { Vec2 } from '../Vec2.js'
 
function test_Vec2( tf: TestFuncs ) {
	// fromPolar
	let v = Vec2.fromPolar( 0, 10 );
	tf.ASSERT_EQ( v, new Vec2( 10, 0 ) );

	v = Vec2.fromPolar( Math.PI / 4, 10 );
	tf.ASSERT_EQ( v, new Vec2( 10, 0 ).rotate( Math.PI / 4 ) );

	v = Vec2.fromPolar( Math.PI / 2, 10 );
	tf.ASSERT_EQ( v, new Vec2( 0, 10 ) );

	v = Vec2.fromPolar( Math.PI, 10 );
	tf.ASSERT_EQ( v, new Vec2( -10, 0 ) );

	v = Vec2.fromPolar( Math.PI * 3 / 2, 10 );
	tf.ASSERT_EQ( v, new Vec2( 0, -10 ) );

	v = Vec2.fromPolar( Math.PI * 2, 10 );
	tf.ASSERT_EQ( v, new Vec2( 10, 0 ) );

	// zero
	v = new Vec2( 1, 2 );
	v.zero();
	tf.ASSERT_EQ( v, new Vec2() );

	// copy
	v = new Vec2( 3, 4 );
	let v2 = v.copy();
	v2.x = 1;
	tf.ASSERT_EQ( v, new Vec2( 3, 4 ) );
	tf.ASSERT_EQ( v2, new Vec2( 1, 4 ) );

	// dot
	// cross
	v = new Vec2( 2, 3 );
	v2 = new Vec2( 5, 7 );
	tf.ASSERT_EQ( v.dot( v2 ), 31 );
	tf.ASSERT_EQ( v2.dot( v ), 31 );
	tf.ASSERT_EQ( v.cross( v2 ), -1 );
	tf.ASSERT_EQ( v2.cross( v ), 1 );

	// set
	// setValues
	v = new Vec2( 1, 2 );
	v2 = new Vec2();
	v2.set( v );
	v.x = 0;
	tf.ASSERT_EQ( v2, new Vec2( 1, 2 ) );
	v2.setValues( 3, 4 );
	tf.ASSERT_EQ( v2, new Vec2( 3, 4 ) );

	// add
	// addX
	// addY
	// plus
	v = new Vec2( 1, 2 );
	v.add( new Vec2( 0.1, 0.2 ) );
	tf.ASSERT_EQ( v, new Vec2( 1.1, 2.2 ) );
	v.addX( 0.1 );
	tf.ASSERT_EQ( v, new Vec2( 1.2, 2.2 ) );
	v.addY( 0.1 );
	tf.ASSERT_EQ( v, new Vec2( 1.2, 2.3 ) );
	tf.ASSERT_EQ( v.plus( new Vec2( 0.1, 0.2 ) ), new Vec2( 1.3, 2.5 ) );
	tf.ASSERT_EQ( v, new Vec2( 1.2, 2.3 ) );

	// sub
	// minus
	v = new Vec2( 1, 2 );
	v.sub( new Vec2( 0.1, 0.2 ) );
	tf.ASSERT_EQ( v, new Vec2( 0.9, 1.8 ) );
	tf.ASSERT_EQ( v.minus( new Vec2( 0.1, 0.2 ) ), new Vec2( 0.8, 1.6 ) );
	tf.ASSERT_EQ( v, new Vec2( 0.9, 1.8 ) );

	// scale
	// times
	// flip
	v = new Vec2( 1, 2 );
	v.scale( 3 );
	tf.ASSERT_EQ( v, new Vec2( 3, 6 ) );
	tf.ASSERT_EQ( v.times( 3 ), new Vec2( 9, 18 ) );
	tf.ASSERT_EQ( v, new Vec2( 3, 6 ) );
	v.flip();
	tf.ASSERT_EQ( v, new Vec2( -3, -6 ) );

	// length
	// lengthSq
	// distTo
	// distToSq
	v = new Vec2( 3, 4 );
	tf.ASSERT_EQ( v.length(), 5 );
	tf.ASSERT_EQ( v.lengthSq(), 25 );

	v = new Vec2( 1, 1 );
	v2 = new Vec2( 4, 5 );
	tf.ASSERT_EQ( v.distTo( v2 ), 5 );
	tf.ASSERT_EQ( v2.distTo( v ), 5 );
	tf.ASSERT_EQ( v.distToSq( v2 ), 25 );
	tf.ASSERT_EQ( v2.distToSq( v ), 25 );

	// unit
	// normalize
	v = new Vec2( 6, 8 );
	tf.ASSERT_EQ( v.unit(), new Vec2( 0.6, 0.8 ) );
	tf.ASSERT_EQ( v, new Vec2( 6, 8 ) );
	v.normalize();
	tf.ASSERT_EQ( v, new Vec2( 0.6, 0.8 ) );

	// rotate
	// turned
	// angle
	v = new Vec2( 1, 0 );
	tf.ASSERT_EQ( v.angle(), 0 );
	tf.ASSERT_EQ( v.turned( Math.PI / 4 ), new Vec2( 0.7071, 0.7071 ) );
	tf.ASSERT_EQ( v, new Vec2( 1, 0 ) );
	v.rotate( Math.PI / 4 );
	tf.ASSERT_EQ( v, new Vec2( 0.7071, 0.7071 ) );
	tf.ASSERT_EQ( v.angle(), Math.PI / 4 );
	v.rotate( Math.PI * 3 / 4 );
	tf.ASSERT_EQ( v.angle(), Math.PI ); // could be -Math.PI?
	v.rotate( Math.PI / 2 );
	tf.ASSERT_EQ( v.angle(), -Math.PI / 2 );
	v.rotate( Math.PI / 2 );
	tf.ASSERT_EQ( v.angle(), 0 );
}

let tests: Array<Test> = [];

tests.push( new Test( 'Vec2',
					  test_Vec2,
					  ['constructor',
					   'fromPolar',
					   'zero',
					   'copy',
					   'dot',
					   'cross',
					   'set',
					   'setValues',
					   'add',
					   'addX',
					   'addY',
					   'plus',
					   'sub',
					   'minus',
					   'scale',
					   'times',
					   'flip',
					   'length',
					   'lengthSq',
					   'distTo',
					   'distToSq',
					   'unit',
					   'normalize',
					   'rotate',
					   'turned',
					   'angle'],
					  ['toString',
					   'equals'] ) );

export default tests;