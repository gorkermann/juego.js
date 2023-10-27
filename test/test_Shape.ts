import { TestFuncs, Test } from '../lib/TestRun.js'

import { Entity } from '../Entity.js'
import { Line } from '../Line.js'
import { Material } from '../Material.js'
import { RayHit } from '../RayHit.js'
import { Shape } from '../Shape.js'
import { Vec2 } from '../Vec2.js'

function testIntersect( tf: TestFuncs, l1: Line, l2: Line, point: Vec2 ) {
	let msg = l1.toString() + ' and ' + l2.toString();

	tf.ASSERT_EQ( l1.intersects( l2 ), point, {}, msg );
	tf.ASSERT_EQ( l2.intersects( l1 ), point, {}, msg );
}

function test_Shape( tf: TestFuncs ) {

	// fromPoints
	// copy
	let p: Array<Vec2> = [new Vec2( 0, 0 ),
						  new Vec2( 1, 0 ),
						  new Vec2( 1, 1 ),
						  new Vec2( 0, 1 )];

	// not enough points
	tf.THROWS( () => { Shape.fromPoints( [] ) } );
	tf.THROWS( () => { Shape.fromPoints( [p[0]] ) } );
	tf.THROWS( () => { Shape.fromPoints( [p[0], p[1]] ) } );

	// non-unique points
	tf.THROWS( () => { Shape.fromPoints( [p[0], p[1], p[2], p[0]] ) } );

	let s = Shape.fromPoints( p );

	for ( let i = 0; i < p.length; i++ ) {
		tf.ASSERT_EQ( s.points[i], p[i], { shallow: true } );
	}
	tf.ASSERT_EQ( s.edges[0].p1, p[0], { shallow: true } );
	tf.ASSERT_EQ( s.edges[0].p2, p[1], { shallow: true } );
	tf.ASSERT_EQ( s.edges[1].p1, p[1], { shallow: true } );
	tf.ASSERT_EQ( s.edges[1].p2, p[2], { shallow: true } );
	tf.ASSERT_EQ( s.edges[2].p1, p[2], { shallow: true } );
	tf.ASSERT_EQ( s.edges[2].p2, p[3], { shallow: true } );
	tf.ASSERT_EQ( s.edges[3].p1, p[3], { shallow: true } );
	tf.ASSERT_EQ( s.edges[3].p2, p[0], { shallow: true } );

	tf.ASSERT_EQ( s.normals[0], new Vec2( 0, -1 ) );
	tf.ASSERT_EQ( s.normals[1], new Vec2( 1, 0 ) );
	tf.ASSERT_EQ( s.normals[2], new Vec2( 0, 1 ) );
	tf.ASSERT_EQ( s.normals[3], new Vec2( -1, 0 ) );

	let e = new Entity( new Vec2(), 10, 10 );
	s.parent = e;
	s.hollow = true;

	let s2 = s.copy();
	for ( let i = 0; i < s2.edges.length; i++ ) {
		tf.ASSERT_EQ( s2.points[i], s.points[i] );
		tf.ASSERT_NEQ( s2.points[i], s.points[i], { shallow: true } );
		tf.ASSERT_NEQ( s2.edges[i], s.edges[i], { shallow: true } );
	}

	tf.ASSERT_EQ( s2.parent, e );
	tf.ASSERT_EQ( s2.hollow, s.hollow );

	// reverse point order and try again
	s = Shape.fromPoints( p.reverse() );

	tf.ASSERT_EQ( s.normals[0], new Vec2( 0, 1 ) );
	tf.ASSERT_EQ( s.normals[1], new Vec2( 1, 0 ) );
	tf.ASSERT_EQ( s.normals[2], new Vec2( 0, -1 ) );
	tf.ASSERT_EQ( s.normals[3], new Vec2( -1, 0 ) );


	// makeRectangle
	s = Shape.makeRectangle( new Vec2( 1, 2 ), 10, 5 );

	tf.ASSERT_EQ( s.points[0], new Vec2( 1, 2 ) );
	tf.ASSERT_EQ( s.points[1], new Vec2( 11, 2 ) );
	tf.ASSERT_EQ( s.points[2], new Vec2( 11, 7 ) );
	tf.ASSERT_EQ( s.points[3], new Vec2( 1, 7 ) );

	tf.ASSERT_EQ( s.normals[0], new Vec2( 0, -1 ) );
	tf.ASSERT_EQ( s.normals[1], new Vec2( 1, 0 ) );
	tf.ASSERT_EQ( s.normals[2], new Vec2( 0, 1 ) );
	tf.ASSERT_EQ( s.normals[3], new Vec2( -1, 0 ) );


	// makeCircle
	s = Shape.makeCircle( new Vec2( 1, 2 ), 100, 12 );

	// spot check points
	tf.ASSERT_EQ( s.points[0], new Vec2( 51, 2 ) );
	tf.ASSERT_EQ( s.points[3], new Vec2( 1, 52 ) );
	tf.ASSERT_EQ( s.points[6], new Vec2( -49, 2 ) );
	tf.ASSERT_EQ( s.points[9], new Vec2( 1, -48 ) );

	// spot check normals
	tf.ASSERT_EQ( s.normals[1], new Vec2( 0.7071, 0.7071 ) );
	tf.ASSERT_EQ( s.normals[4], new Vec2( -0.7071, 0.7071 ) );
	tf.ASSERT_EQ( s.normals[7], new Vec2( -0.7071, -0.7071 ) );
	tf.ASSERT_EQ( s.normals[10], new Vec2( 0.7071, -0.7071 ) );


	// offset
	s = Shape.makeRectangle( new Vec2( 0, 0 ), 10, 5 );
	s.offset( new Vec2( 1, 2 ) );

	tf.ASSERT_EQ( s.points[0], new Vec2( 1, 2 ) );
	tf.ASSERT_EQ( s.points[1], new Vec2( 11, 2 ) );
	tf.ASSERT_EQ( s.points[2], new Vec2( 11, 7 ) );
	tf.ASSERT_EQ( s.points[3], new Vec2( 1, 7 ) );


	// intersect
	// rayIntersect
	s = Shape.makeRectangle( new Vec2( 0, 0 ), 10, 10 );

	tf.ASSERT_EQ( s.intersect( new Line( -1, 11, 11, 11 ) ), [] ); // outside
	tf.ASSERT_EQ( s.intersect( new Line( 1, 1, 9, 1 ) ), [] ); // inside
	tf.ASSERT_EQ( s.intersect( new Line( -9, 2, 9, 0 ) ), [new Vec2( 0, 1 ), new Vec2( 9, 0 )] );
	tf.ASSERT_EQ( s.intersect( new Line( 2, -9, 0, 9 ) ), [new Vec2( 1, 0 ), new Vec2( 0, 9 )] );

	s.material.hue = 0;

	let m = new Material(30, 0, 0);
	s.edges[0].material = m;

	tf.ASSERT_EQ( s.rayIntersect( new Line( -1, 11, 11, 11 ) ), [] ); // outside
	tf.ASSERT_EQ( s.rayIntersect( new Line( 1, 1, 9, 1 ) ), [] ); // inside

	let hits = s.rayIntersect( new Line( -9, 2, 9, 0 ) );
	tf.ASSERT_EQ( hits.length, 2 );
	tf.ASSERT_EQ( hits[0].material.hue, 0 );
	tf.ASSERT_EQ( hits[1].material.hue, 30 );

	hits = s.rayIntersect( new Line( 2, -9, 0, 9 ) );
	tf.ASSERT_EQ( hits.length, 2 );
	tf.ASSERT_EQ( hits[0].material.hue, 30 );
	tf.ASSERT_EQ( hits[1].material.hue, 0 );


	// getVel
	s = Shape.makeRectangle( new Vec2( 0, 0 ), 100, 10 );

	tf.ASSERT_EQ( s.getVel( new Vec2( 0, 0 ) ), new Vec2( 0, 0 ) ); // parent is null, no velocity

	e = new Entity( new Vec2( 0, 0 ), 100, 10 );
	e.vel = new Vec2( 1, 2 );
	s.parent = e;

	tf.ASSERT_EQ( s.getVel( new Vec2( 0, 0 ) ), new Vec2( 1, 2 ) );
	tf.ASSERT_EQ( s.getVel( new Vec2( 100, 0 ) ), new Vec2( 1, 2 ) );

	e.angleVel = Math.PI / 2;

	tf.ASSERT_EQ( s.getVel( new Vec2( 0, 0 ) ), new Vec2( 1, 2 ) );
	tf.ASSERT_EQ( s.getVel( new Vec2( 100, 0 ) ), new Vec2( 1, 2 ).plus( new Vec2( -100, 100 ) ) );
	tf.ASSERT_EQ( s.getVel( new Vec2( 50, 0 ) ), new Vec2( 1, 2 ).plus( new Vec2( -50, 50 ) ) );

	// getArea
	p = [new Vec2( 0, 0 ),
		 new Vec2( 100, 0 ),
		 new Vec2( 100, 10 ),
		 new Vec2( 0, 10 )];

	s = Shape.fromPoints( p );

	tf.ASSERT_EQ( s.getArea(), 1000 );

	for ( let i = 0; i < 5; i++ ) {
		let angle = Math.random() * Math.PI / 2;

		for ( let point of p ) {
			point.rotate( angle );
		}

		tf.ASSERT_EQ( s.getArea(), 1000 );
	}

	p = [new Vec2( 10, 10 ),
		 new Vec2( 20, 10 ),
		 new Vec2( 17, 30 )];
	// base = 100, height = 200, area = 10000

	s = Shape.fromPoints( p );

	tf.ASSERT_EQ( s.getArea(), 100 );

	for ( let i = 0; i < 5; i++ ) {
		let angle = Math.random() * Math.PI / 2;

		for ( let point of p ) {
			point.rotate( angle );
		}

		tf.ASSERT_EQ( s.getArea(), 100 );
	}
}

function test_ShapeSlice( tf: TestFuncs ) {

	// slice
	let p = [new Vec2( 0, 0 ),
		 new Vec2( 100, 0 ),
		 new Vec2( 100, 100 ),
		 new Vec2( 0, 100 )];

	let s = Shape.fromPoints( p );

	let l = new Line( -50, 75, 150, 75 ); // through
	tf.ASSERT_EQ( s.slice( l ), 0.75 );

	l = new Line( 150, 75, -50, 75 ); // flipped
	tf.ASSERT_EQ( s.slice( l ), 0.25 );

	l = new Line( 25, 75, 75, 75 ); // inside
	tf.ASSERT_EQ( s.slice( l ), 0.75 );

	l = new Line( 50, 75, 100, 75 ); // line on shape edges
	tf.ASSERT_EQ( s.slice( l ), 0.75 );

	l = new Line( 25, 0, 25, 100 ); // vertical
	tf.ASSERT_EQ( s.slice( l ), 0.75 );

	l = new Line( 50, 50, 50, 150 ); // vertical, half in
	tf.ASSERT_EQ( s.slice( l ), 0.50 );

	l = new Line( 0, 10, 100, 90 ); // slanted
	tf.ASSERT_EQ( s.slice( l ), 0.5 );

	l = new Line( 0, 0, 100, 100 ); // diagonal across, on points
	tf.ASSERT_EQ( s.slice( l ), 0.5 );

	l = new Line( 0, 0, 100, 0 ); // on points
	tf.ASSERT_EQ( s.slice( l ), 0.0 );

	l = new Line( 100, 0, 0, 0 ); // on points
	tf.ASSERT_EQ( s.slice( l ), 1.0 );

	l = new Line( 0, -50, 100, -50 ); // above
	tf.ASSERT_EQ( s.slice( l ), 0.0 );

	l = new Line( 0, 150, 100, 150 ); // below
	tf.ASSERT_EQ( s.slice( l ), 1.0 );

	l = new Line( 150, 50, 50, -50 ); // one point on line, others left
	tf.ASSERT_EQ( s.slice( l ), 1.0 );

	l = new Line( 50, -50, 150, 50 ); // one point on line, others right
	tf.ASSERT_EQ( s.slice( l ), 0.0 );


	/*
		-[]--[]-
		 [][][]
	*/
	p = [new Vec2( 0, 0 ),
	     new Vec2( 10, 0 ),
	     new Vec2( 10, 10 ),
	     new Vec2( 20, 10 ),
	     new Vec2( 20, 0 ),
	     new Vec2( 30, 0 ),
	     new Vec2( 30, 20 ),
	     new Vec2( 0, 20 )];

	s = Shape.fromPoints( p );

	tf.ASSERT_EQ( s.getArea(), 500 );

	l = new Line( 0, 5, 30, 5 );
	tf.ASSERT_EQ( s.slice( l ), 0.2 ); // through

	l = new Line( 30, 5, 5, 5 );
	tf.ASSERT_EQ( s.slice( l ), 0.8 ); // flipped
}

function test_ShapeContains( tf: TestFuncs ) {
	let s = Shape.makeRectangle( new Vec2( -5, 0 ), 10, 40 );

	let [min, max] = Shape.getMinMax( s.points );

	tf.ASSERT_EQ( min, new Vec2( -5, 0 ) );
	tf.ASSERT_EQ( max, new Vec2( 5, 40 ) );

	tf.ASSERT( s.contains( new Vec2( 0, 20 ) ) ); // middle

	tf.ASSERT( s.contains( new Vec2( 0, 0 ) ) ); // on edges
	tf.ASSERT( s.contains( new Vec2( 5, 20 ) ) );
	tf.ASSERT( s.contains( new Vec2( 0, 40 ) ) );
	tf.ASSERT( s.contains( new Vec2( -5, 20 ) ) );

	tf.ASSERT( s.contains( new Vec2( -5, 0 ) ) ); // on corners
	tf.ASSERT( s.contains( new Vec2( 5, 0 ) ) );
	tf.ASSERT( s.contains( new Vec2( 5, 40 ) ) );
	tf.ASSERT( s.contains( new Vec2( -5, 40 ) ) );
	
	tf.ASSERT( !s.contains( new Vec2( 10, 20 ) ) ); // outside
	tf.ASSERT( !s.contains( new Vec2( 0, 50 ) ) ); // below

	let e = new Entity( new Vec2( 0, 0 ), 10, 10 );
	s.parent = e;

	// adding parent has no effect yet, since these are in the Shape's local frame
	[min, max] = Shape.getMinMax( s.points );

	tf.ASSERT_EQ( min, new Vec2( -5, 0 ) );
	tf.ASSERT_EQ( max, new Vec2( 5, 40 ) );

	tf.ASSERT( s.contains( new Vec2( 0, 20 ) ) );
	tf.ASSERT( !s.contains( new Vec2( -20, 0 ) ) );
	tf.ASSERT( s.contains( new Vec2( -2, 2 ) ) );
	tf.ASSERT( s.contains( new Vec2( -5, 5 ) ) );
	tf.ASSERT( !s.contains( new Vec2( -40, 5 ) ) );

	// rotate the parent
	e.angle = Math.PI / 2;
	[min, max] = Shape.getMinMax( s.points );

	tf.ASSERT_EQ( min, new Vec2( -5, 0 ) );
	tf.ASSERT_EQ( max, new Vec2( 5, 40 ) );

	tf.ASSERT( !s.contains( new Vec2( 0, 20 ) ) );
	tf.ASSERT( s.contains( new Vec2( -20, 0 ) ) );
	tf.ASSERT( s.contains( new Vec2( -2, 2 ) ) );
	tf.ASSERT( s.contains( new Vec2( -5, 5 ) ) );
	tf.ASSERT( s.contains( new Vec2( -40, 5 ) ) );

	// random entity orientations
	for ( let i = 0; i < 10; i++ ) {
		e.angle = Math.random() * Math.PI * 2;
		e.pos.x += -5 + Math.random() * 5;
		e.pos.y += -20 + Math.random() * 20;

		let p = new Vec2( -5 + Math.random() * 10, 0 + Math.random() * 40 );
 
		e.applyTransform( p );

		tf.ASSERT( s.contains( p ) );
	}
}

function test_getBodyContact( tf: TestFuncs ) {
    let e = new Entity( new Vec2( 50, 50 ), 100, 100 );
    let s = e.getOwnShapes()[0];
    
    let s2 = Shape.makeRectangle( new Vec2( 50, 25 ), 100, 50 ); // partially inside s, contains no points of s
    let s3 = Shape.makeRectangle( new Vec2( 50, 50 ), 100, 100 ); // mutually contains points with s
    let s4 = Shape.makeRectangle( new Vec2( 0, 0 ), 100, 100 ); // same as s

    tf.ASSERT_EQ( s.getBodyContact( s2 ), null );
    tf.ASSERT_EQ( s2.getBodyContact( s ), null );
    tf.ASSERT_EQ( s.getBodyContact( s3 ), null );
    tf.ASSERT_EQ( s3.getBodyContact( s ), null );
    tf.ASSERT_EQ( s.getBodyContact( s4 ), null );
    tf.ASSERT_EQ( s4.getBodyContact( s ), null );

    let e5 = new Entity( new Vec2( 50, 50 ), 10, 10 );
    let s5 = e5.getOwnShapes()[0];

    let contact = s.getBodyContact( s5 );
    tf.ASSERT( contact !== null );
    tf.ASSERT_EQ( contact.vel, new Vec2( 0, 0 ) );
    tf.ASSERT_EQ( contact.normal, new Vec2( 1, 0 ) ); // default normal

    contact = s5.getBodyContact( s );
    tf.ASSERT( contact !== null );
    tf.ASSERT_EQ( contact.vel, new Vec2( 0, 0 ) );
    tf.ASSERT_EQ( contact.normal, new Vec2( 1, 0 ) ); // default normal

    e5.vel = new Vec2( 0, 1 );
    contact = s.getBodyContact( s5 );
    tf.ASSERT( contact !== null );
    tf.ASSERT_EQ( contact.vel, new Vec2( 0, 1 ) );
    tf.ASSERT_EQ( contact.normal, new Vec2( 0, 1 ) ); // e hit by e5, which is moving down

    contact = s5.getBodyContact( s );
    tf.ASSERT( contact !== null );
    tf.ASSERT_EQ( contact.vel, new Vec2( 0, 0 ) );
    tf.ASSERT_EQ( contact.normal, new Vec2( 0, -1 )); // e5, which is moving down, hits e
}

function test_booleanOps( tf: TestFuncs ) {
	// single shapes 
	let s = Shape.makeRectangle( new Vec2( 0, 0 ), 100, 50 );
	let s2 = Shape.makeRectangle( new Vec2( 10, 10 ), 100, 50 );

	// union()
	let union = Shape.union( [s], [s2] );

	tf.ASSERT_EQ( union.length, 1 );
	tf.ASSERT_EQ( union[0].points, [new Vec2( 0, 0 ), 
							 new Vec2( 100, 0 ),
							 new Vec2( 100, 10 ),
							 new Vec2( 110, 10 ),
							 new Vec2( 110, 60 ),
							 new Vec2( 10, 60 ),
							 new Vec2( 10, 50 ),
							 new Vec2( 0, 50 ) ] );

	s = Shape.makeRectangle( new Vec2( 0, 0 ), 100, 50 );
	s2 = Shape.makeRectangle( new Vec2( 10, 10 ), 100, 50 );

	// intersection()
	let inter = Shape.intersection( [s], [s2] );

	tf.ASSERT_EQ( inter.length, 1 );
	tf.ASSERT_EQ( inter[0].points, [new Vec2( 10, 10 ), 
							 new Vec2( 100, 10 ),
							 new Vec2( 100, 50 ),
							 new Vec2( 10, 50 ) ] );

	s = Shape.makeRectangle( new Vec2( 0, 0 ), 100, 50 );
	s2 = Shape.makeRectangle( new Vec2( 10, 10 ), 100, 50 );


	// difference()
	let diff = Shape.difference( [s], [s2] );

	tf.ASSERT_EQ( diff.length, 1 );
	tf.ASSERT_EQ( diff[0].points, [new Vec2( 0, 0 ), 
							 new Vec2( 100, 0 ),
							 new Vec2( 100, 10 ),
							 new Vec2( 10, 10 ),
							 new Vec2( 10, 50 ),
							 new Vec2( 0, 50 ) ] );

	// multiple shapes
	s = Shape.makeRectangle( new Vec2( 0, 0 ), 10, 10 );
	s2 = Shape.makeRectangle( new Vec2( 5, 5 ), 10, 10 );
	let s3 = Shape.makeRectangle( new Vec2( 0, 100 ), 10, 10 );
	let s4 = Shape.makeRectangle( new Vec2( 5, 105 ), 10, 10 );

	inter = Shape.intersection( [s, s2], [s3] ); // shapes in first multipoly overlap
	tf.ASSERT_EQ( inter.length, 0 );		

	inter = Shape.intersection( [s, s3], [s2, s4] );

	tf.ASSERT_EQ( inter.length, 2 );
	tf.ASSERT_EQ( inter[0].points, [new Vec2( 5, 5 ), 
							 new Vec2( 10, 5 ),
							 new Vec2( 10, 10 ),
							 new Vec2( 5, 10 ) ] );
	tf.ASSERT_EQ( inter[1].points, [new Vec2( 5, 105 ), 
							 new Vec2( 10, 105 ),
							 new Vec2( 10, 110 ),
							 new Vec2( 5, 110 ) ] );

	// materials
	s = Shape.makeRectangle( new Vec2( 0, 0 ), 10, 10 );
	s2 = Shape.makeRectangle( new Vec2( 5, 5 ), 10, 10 );
	s.material = new Material( 45, 0, 0.5 );
	s2.material = new Material( 90, 0, 0.5 );

	union = Shape.union( [s], [s2] );

	tf.ASSERT( union[0].material != s.material );
	tf.ASSERT_EQ( union[0].material.hue, 45 );

	s2 = Shape.makeRectangle( new Vec2( -5, -5 ), 20, 20 );
	s2.material = new Material( 90, 0, 0.5 );

	union = Shape.union( [s], [s2] );

	tf.ASSERT( union[0].material != s.material );
	tf.ASSERT_EQ( union[0].material.hue, 45 );
}

let tests: Array<Test> = [];

tests.push( new Test( 'Shape',
					  test_Shape,
					  ['constructor',
					   'copy',
					   'fromPoints',
					   'makeRectangle',
					   'makeCircle',
					   'offset',
					   'intersect',
					   'rayIntersect',
					   'getVel',
					   'getArea'],
					  ['stroke',
					   'fill',
					   'materialDraw'] ) );

tests.push( new Test( 'Shape',
					  test_ShapeSlice,
					  ['slice'], 
					  [] ) );

tests.push( new Test( 'Shape',
					  test_ShapeContains,
					  ['getMinMax',
					   'contains',
					   'vertIntersectCount'], 
					  [] ) );

tests.push(new Test('Shape', test_getBodyContact, ['getBodyContact'], []));

tests.push(new Test('Shape', test_booleanOps,
							['fromMultiPoly',
							 'union',
							 'intersection',
							 'difference'], []));

export default tests;