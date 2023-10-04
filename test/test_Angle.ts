import { TestFuncs, Test } from '../lib/TestRun.js'

import { Angle } from '../Angle.js'
import { Vec2 } from '../Vec2.js'
 
function test_Angle( tf: TestFuncs ) {

	// normalize()
	tf.ASSERT_EQ( Angle.normalize( 0 ), 0 );
	tf.ASSERT_EQ( Angle.normalize( 1 ), 1 );
	tf.ASSERT_EQ( Angle.normalize( -1 ), -1 );

	tf.ASSERT_EQ( Angle.normalize( Math.PI ), Math.PI );
	tf.ASSERT_EQ( Angle.normalize( -Math.PI ), -Math.PI );

	tf.ASSERT_EQ( Angle.normalize( Math.PI * 3 / 2 ), -Math.PI / 2 );
	tf.ASSERT_EQ( Angle.normalize( -Math.PI * 3 / 2 ), Math.PI / 2 );

	tf.ASSERT_EQ( Angle.normalize( 2 * Math.PI ), 0 );
	tf.ASSERT_EQ( Angle.normalize( -2 * Math.PI ), 0 );

	tf.ASSERT_EQ( Angle.normalize( 2 * Math.PI + 1 ), 1 );
	tf.ASSERT_EQ( Angle.normalize( -2 * Math.PI + 1 ), 1 );

	tf.ASSERT_EQ( Angle.normalize( 2 * Math.PI - 1 ), -1 );
	tf.ASSERT_EQ( Angle.normalize( -2 * Math.PI - 1 ), -1 );

	// between()
	tf.ASSERT( Angle.between( 0, 0, 0 ) );
	tf.ASSERT( !Angle.between( 1, 0, 0 ) );

	tf.ASSERT( Angle.between( 1, 0, 1 ) );
	tf.ASSERT( Angle.between( 0.5, 0, 1 ) );
	tf.ASSERT( !Angle.between( 1.5, 0, 1 ) );
	tf.ASSERT( !Angle.between( -0.5, 0, 1 ) );

	tf.ASSERT( Angle.between( 1, 1, 0 ) );
	tf.ASSERT( !Angle.between( 0.5, 1, 0 ) );
	tf.ASSERT( Angle.between( 1.5, 1, 0 ) );
	tf.ASSERT( Angle.between( -0.5, 1, 0 ) );

	tf.ASSERT(  Angle.between( Math.PI,	 Math.PI - 1, -Math.PI + 1 ) );
	tf.ASSERT( !Angle.between( 0, 	     Math.PI - 1, -Math.PI + 1 ) );

	tf.ASSERT( !Angle.between( Math.PI, -Math.PI + 1,  Math.PI - 1 ) );
	tf.ASSERT(  Angle.between( 0, 		-Math.PI + 1,  Math.PI - 1 ) );

	// getSweep()
	tf.THROWS( () => ( Angle.getSweep( [], new Vec2() ) ) );

	let min, max: number;

	// single point
	[min, max] = Angle.getSweep( [new Vec2()], new Vec2() );
	tf.ASSERT_EQ( min, 0 );
	tf.ASSERT_EQ( max, 0 );

	[min, max] = Angle.getSweep( [new Vec2( 1, 0 )], new Vec2() );
	tf.ASSERT_EQ( min, 0 );
	tf.ASSERT_EQ( max, 0 );

	[min, max] = Angle.getSweep( [new Vec2( 0, 1 )], new Vec2() );
	tf.ASSERT_EQ( min, Math.PI / 2 );
	tf.ASSERT_EQ( max, Math.PI / 2 );

	[min, max] = Angle.getSweep( [new Vec2( -1, 0 )], new Vec2() );
	tf.ASSERT_EQ( min, Math.PI ); // could technically also be -Math.PI, but I think Math.atan2 returns on the range (-Math.PI, Math.PI]
	tf.ASSERT_EQ( max, Math.PI );

	[min, max] = Angle.getSweep( [new Vec2( 0, -1 )], new Vec2() );
	tf.ASSERT_EQ( min, -Math.PI / 2 );
	tf.ASSERT_EQ( max, -Math.PI / 2 );

	// two points
	[min, max] = Angle.getSweep( [new Vec2( 0, 1 ), new Vec2( 1, 0 )], new Vec2() );
	tf.ASSERT_EQ( min, 0 );
	tf.ASSERT_EQ( max, Math.PI / 2 );

	[min, max] = Angle.getSweep( [new Vec2( 1, 0 ), new Vec2( 0, 1 )], new Vec2() ); // reverse point order gives same result
	tf.ASSERT_EQ( min, 0 );
	tf.ASSERT_EQ( max, Math.PI / 2 );

	[min, max] = Angle.getSweep( [new Vec2( -1, 1 ), new Vec2( -1, -1 )], new Vec2() ); // crosses border
	tf.ASSERT_EQ( min, Math.PI * 3 / 4 );
	tf.ASSERT_EQ( max, -Math.PI * 3 / 4 );

	[min, max] = Angle.getSweep( [new Vec2( -1, -1 ), new Vec2( -1, 1 )], new Vec2() ); // reverse point order gives same result
	tf.ASSERT_EQ( min, Math.PI * 3 / 4 );
	tf.ASSERT_EQ( max, -Math.PI * 3 / 4 );

	// four points
	let points = [new Vec2( 1, 1 ), new Vec2( 1, -1 ), new Vec2( 2, -1 ), new Vec2( 2, 1 )]; // a square, to the right

	[min, max] = Angle.getSweep( points, new Vec2() );
	tf.ASSERT_EQ( min, -Math.PI / 4 );
	tf.ASSERT_EQ( max, Math.PI / 4 );

	points = points.slice( 1 ).concat( points[0] ); // cycle the points around

	[min, max] = Angle.getSweep( points, new Vec2() );
	tf.ASSERT_EQ( min, -Math.PI / 4 );
	tf.ASSERT_EQ( max, Math.PI / 4 );

	points = points.slice( 1 ).concat( points[0] ); // cycle the points around

	[min, max] = Angle.getSweep( points, new Vec2() );
	tf.ASSERT_EQ( min, -Math.PI / 4 );
	tf.ASSERT_EQ( max, Math.PI / 4 );

	points = points.slice( 1 ).concat( points[0] ); // cycle the points around

	[min, max] = Angle.getSweep( points, new Vec2() );
	tf.ASSERT_EQ( min, -Math.PI / 4 );
	tf.ASSERT_EQ( max, Math.PI / 4 );

	points = [new Vec2( -1, 1 ), new Vec2( -1, -1 ), new Vec2( -2, -1 ), new Vec2( -2, 1 )]; // a square, to the left

	[min, max] = Angle.getSweep( points, new Vec2() );
	tf.ASSERT_EQ( min, Math.PI * 3 / 4 );
	tf.ASSERT_EQ( max, -Math.PI * 3 / 4 );

	[min, max] = Angle.getSweep( points, new Vec2( -1.5, 0 ) ); // origin inside square
	tf.ASSERT_EQ( min, -Math.PI );
	tf.ASSERT_EQ( max, Math.PI );

	[min, max] = Angle.getSweep( points, new Vec2( -1, 0 ) ); // origin on square border
	tf.ASSERT_EQ( min, -Math.PI );
	tf.ASSERT_EQ( max, Math.PI );

	// different from previous because 180deg sweep always goes clockwise
	[min, max] = Angle.getSweep( points, new Vec2( -2, 0 ) ); // origin on square border 
	tf.ASSERT_EQ( min, -Math.PI / 2 );
	tf.ASSERT_EQ( max, Math.PI / 2 );
}

let tests: Array<Test> = [];

tests.push( new Test( 'Angle',
					  test_Angle,
					  ['normalize',
					   'between',
					   'getSweep'],
					  ['constructor'] ) );

export default tests;