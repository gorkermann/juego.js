import { TestFuncs, Test } from '../lib/TestRun.js'

import { Line } from '../Line.js'
import { RayHit } from '../RayHit.js'
import { Vec2 } from '../Vec2.js'

function testIntersect( tf: TestFuncs, l1: Line, l2: Line, point: Vec2 ) {
	let msg = l1.toString() + ' and ' + l2.toString();

	tf.ASSERT_EQ( l1.intersects( l2 ), point, {}, msg );
	tf.ASSERT_EQ( l2.intersects( l1 ), point, {}, msg );
}

function test_Line( tf: TestFuncs ) {
	// constructor
	// copy
	// fromPoints
	let l = new Line( 1, 2, 3, 4 );

	tf.ASSERT_EQ( l.p1, new Vec2( 1, 2 ) );
	tf.ASSERT_EQ( l.p2, new Vec2( 3, 4 ) );

	let l2 = l.copy();
	l2.p1.setValues( 0, 0 );
	l2.p2.setValues( 5, 5 );

	tf.ASSERT_EQ( l.p1, new Vec2( 1, 2 ) );
	tf.ASSERT_EQ( l.p2, new Vec2( 3, 4 ) );

	l2 = Line.fromPoints( l.p1, l.p2 );
	l2.p1.setValues( 0, 0 );
	l2.p2.setValues( 5, 5 );

	tf.ASSERT_EQ( l.p1, new Vec2( 0, 0 ) );
	tf.ASSERT_EQ( l.p2, new Vec2( 5, 5 ) );

	// getDirection
	l = new Line( 0, 1, 2, 4 );
	tf.ASSERT_EQ( l.getDirection(), new Vec2( 2, 3 ) );


	// intersects
	// not crossing, both vertical
	l = new Line( 0, 0, 0, 10 );
	l2 = new Line( 2, 0, 2, 10 );

	testIntersect( tf, l, l2,  null );

	// overlapping, both vertical
	l = new Line( 0, 0, 0, 10 );
	l2 = new Line( 0, 1, 0, 9 );

	testIntersect( tf, l, l2,  null );

	// not crossing, both almost vertical
	l = new Line( 0, 0, 0.001, 10 );
	l2 = new Line( 2, 0, 2, 10 );

	testIntersect( tf, l, l2,  null );

	// crossing, above verticality threshold
	l = new Line( -0.001, 0, 0.001, 10 );
	l2 = new Line( 0, 0, 0, 10 );

	testIntersect( tf, l, l2,  null );

	// under verticality threshold
	l = new Line( -0.1, 0, 0.1, 10 );
	l2 = new Line( 0, 0, 0, 10 );

	testIntersect( tf, l, l2,  new Vec2( 0, 5 ) );

	// one horizontal, one vertical
	l = new Line( 0, 1, 10, 1 );
	l2 = new Line( 5, -2, 5, 2 );

	testIntersect( tf, l, l2,  new Vec2( 5, 1 ) );


 	// not crossing, both horizontal
 	l = new Line( 0, 0, 10, 0 );
	l2 = new Line( 0, 2, 10, 2 );

	testIntersect( tf, l, l2,  null );

 	// overlapping, both horizontal
 	l = new Line( 0, 0, 10, 0 );
	l2 = new Line( 1, 0, 9, 0 );

	testIntersect( tf, l, l2,  null );

	// try to cause some floating point errors with a horizontal line (l) crossing a sloped line (l2)
	// the y-value of the crossing point will probably not be exactly f, but below the equality threshold
	for ( let i = 0; i < 10; i++ ) {
		let f = Math.random() - 0.5;
		let x = Math.random() * 1000 - 500;
		let y = Math.random() * 500 + 1; // above x-axis

		let v = new Vec2( 0, f ).minus( new Vec2( x, y ) );
		let m = new Vec2( 0, f ).plus( v ); // crossing point

		l = new Line( -10, f, 10, f );
		l2 = new Line( x, y, m.x, m.y );

		testIntersect( tf, l, l2,  new Vec2( 0, f ) );
	}


	// not crossing, same slope (bounding boxes overlap)
	l = new Line( 0, 0, 2, 2 );
	l2 = new Line( 0, 1, 2, 3 );

	testIntersect( tf, l, l2,  null );

	// overlapping, same slope
	l = new Line( 0, 0, 10, 10 );
	l2 = new Line( 1, 1, 9, 9 );

	testIntersect( tf, l, l2,  null );

	// shared point
	let a = new Vec2( 0, 0 );
	let b = new Vec2( 0, 1 );
	let c = new Vec2( 2, 0 );

	l = Line.fromPoints( a, b );
	l2 = Line.fromPoints( b, c );

	testIntersect( tf, l, l2,  new Vec2( 0, 1 ) );

	l = Line.fromPoints( b, a );
	l2 = Line.fromPoints( b, c );

	testIntersect( tf, l, l2,  new Vec2( 0, 1 ) );

	l = Line.fromPoints( a, b );
	l2 = Line.fromPoints( c, b );

	testIntersect( tf, l, l2,  new Vec2( 0, 1 ) );


	// different slopes
	l = new Line( 0, 0, 10, 10 );
	l2 = new Line( 2, 0, 8, 10 );

	testIntersect( tf, l, l2,  new Vec2( 5, 5 ) );

	// random lines
	for ( let i = 0; i < 10; i++ ) {
		l = new Line( Math.random() * 1000 - 500, 
					  Math.random() * 1000 - 500,
					  Math.random() * 1000 - 500,
					  Math.random() * 1000 - 500 );
		let p = new Vec2( Math.random() * 1000 - 500, Math.random() * 1000 - 500 );
		let m = l.p1.alongTo( l.p2, 0.5 );
		let v = m.minus( p );

		l2 = Line.fromPoints( p, p.plus( v ).plus( v ) );

		testIntersect( tf, l, l2,  m );
	}


	// surface
	l = new Line( 0, 0, 0, 10 );

	// rays
	l2 = new Line( 5, 5, -5, 5 );
	let l3 = new Line( -5, 5, 5, 5 );

	let hit2 = l2.rayIntersect( l );
	let hit3 = l3.rayIntersect( l );

	tf.ASSERT_EQ( hit2.point, new Vec2( 0, 5 ) );
	tf.ASSERT_EQ( hit2.normal, new Vec2( 1, 0 ) );
	tf.ASSERT_EQ( hit2.material, l.material );
	tf.ASSERT_EQ( hit3.point, new Vec2( 0, 5 ) );
	tf.ASSERT_EQ( hit3.normal, new Vec2( -1, 0 ) );

	// flip the surface, results should be the same
	l = new Line( 0, 10, 0, 0 );

	hit2 = l2.rayIntersect( l );
	hit3 = l3.rayIntersect( l );

	tf.ASSERT_EQ( hit2.point, new Vec2( 0, 5 ) );
	tf.ASSERT_EQ( hit2.normal, new Vec2( 1, 0 ) );
	tf.ASSERT_EQ( hit3.point, new Vec2( 0, 5 ) );
	tf.ASSERT_EQ( hit3.normal, new Vec2( -1, 0 ) );
}

function test_whichSide( tf: TestFuncs ) {
	let l = new Line( 0, 0, 0, 1 );

	tf.ASSERT_EQ( l.whichSide( [new Vec2( 0, 1 )] ), [0] );
	tf.ASSERT_EQ( l.whichSide( [new Vec2( 0.01, 1 )] ), [0] );
	tf.ASSERT_EQ( l.whichSide( [new Vec2( -0.01, 1 )] ), [0] );
	tf.ASSERT_EQ( l.whichSide( [new Vec2( 0.02, 1 )] ), [-1] );
	tf.ASSERT_EQ( l.whichSide( [new Vec2( -0.02, 1 )] ), [1] );

	l = new Line( 1, 1, 1, 5 );

	tf.ASSERT_EQ( l.whichSide( [new Vec2( 1.009, 100 )] ), [0] ); // slightly alter these due to floating point errors
	tf.ASSERT_EQ( l.whichSide( [new Vec2( 0.999, 100 )] ), [0] );
	tf.ASSERT_EQ( l.whichSide( [new Vec2( 1.011, 100 )] ), [-1] );
	tf.ASSERT_EQ( l.whichSide( [new Vec2( 0.98, 100 )] ), [1] );

	tf.ASSERT_EQ( l.whichSide( [new Vec2( 1.009, -100 )] ), [0] );
	tf.ASSERT_EQ( l.whichSide( [new Vec2( 0.999, -100 )] ), [0] );
	tf.ASSERT_EQ( l.whichSide( [new Vec2( 1.011, -100 )] ), [-1] );
	tf.ASSERT_EQ( l.whichSide( [new Vec2( 0.98, -100 )] ), [1] );
}

function test_sortAlong( tf: TestFuncs ) {
	let l = new Line( 1, 1, 4, 9 );
	let points = [];
	let t = 10;

	for ( let i = 0; i < 10; i++ ) {
		points.push( l.p1.alongTo( l.p2, t ) );

		t -= Math.random() * 2 + 0.1;
	}

	let sorted = points.concat();
	l.sortAlong( sorted );

	// should be exactly reversed
	for ( let i = 0; i < 10; i++ ) {
		tf.ASSERT_EQ( sorted.indexOf( points[i] ), 9 - i );
	}
}

let tests: Array<Test> = [];

tests.push( new Test( 'Line',
					  test_Line,
					  ['constructor',
					   'copy',
					   'fromPoints',
					   'getDirection',
					   'intersects',
					   'rayIntersect',
					   ],
					  ['toString',
					   'draw'] ) );

tests.push( new Test( 'Line',
					  test_whichSide,
					  ['whichSide'],
					  [] ) );

tests.push( new Test( 'Line',
					  test_sortAlong,
					  ['sortAlong'],
					  [] ) );

export default tests;