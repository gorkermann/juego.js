import { TestFuncs, Test } from '../lib/TestRun.js'

import { Entity, TopLeftEntity } from '../Entity.js'
import { Line } from '../Line.js'
import { RayHit } from '../RayHit.js'
import { Shape } from '../Shape.js'
import { Vec2 } from '../Vec2.js'

function test_Entity_shapes( tf: TestFuncs ) {
	// constructor
	// destructor
	let e = new Entity( new Vec2( 50, 100 ), 100, 200 );

	tf.ASSERT_EQ( e.pos, new Vec2( 50, 100 ) );
	tf.ASSERT_EQ( e.width, 100 );
	tf.ASSERT_EQ( e.height, 200 );

	e.destructor();

	tf.ASSERT( e.removeThis );


	// getShapes
	// applyTransform

	// position
	let e2 = new Entity( new Vec2( 50, 100 ), 10, 20 );
	e.addSub( e2 );

	let s = e.getShapes( 1.0 );

	tf.ASSERT_EQ( s.length, 2 );
	tf.ASSERT_EQ( s[0].points[0], new Vec2( 0, 0 ) );
	tf.ASSERT_EQ( s[0].points[1], new Vec2( 100, 0 ) );
	tf.ASSERT_EQ( s[0].points[2], new Vec2( 100, 200 ) );
	tf.ASSERT_EQ( s[0].points[3], new Vec2( 0, 200 ) );

	tf.ASSERT_EQ( s[1].points[0], new Vec2( 95, 190 ) );
	tf.ASSERT_EQ( s[1].points[1], new Vec2( 105, 190 ) );
	tf.ASSERT_EQ( s[1].points[2], new Vec2( 105, 210 ) );
	tf.ASSERT_EQ( s[1].points[3], new Vec2( 95, 210 ) );

	tf.ASSERT_EQ( s[1].normals[0], new Vec2( 0, -1 ) );
	tf.ASSERT_EQ( s[1].normals[1], new Vec2( 1, 0 ) );
	tf.ASSERT_EQ( s[1].normals[2], new Vec2( 0, 1 ) );
	tf.ASSERT_EQ( s[1].normals[3], new Vec2( -1, 0 ) );

	// position and velocity
	e.vel.setValues( 1, 0 );
	e2.vel.setValues( 0, 5 );

	s = e.getShapes( 1.0 );

	tf.ASSERT_EQ( s[0].points[0], new Vec2( 1, 0 ) );
	tf.ASSERT_EQ( s[1].points[0], new Vec2( 96, 195 ) );
	tf.ASSERT_EQ( s[1].normals[0], new Vec2( 0, -1 ) );

	s = e.getShapes( 2.0 );

	tf.ASSERT_EQ( s[0].points[0], new Vec2( 2, 0 ) );
	tf.ASSERT_EQ( s[1].points[0], new Vec2( 97, 200 ) );
	tf.ASSERT_EQ( s[1].normals[0], new Vec2( 0, -1 ) );


	// position and rotation
	e.vel.zero();
	
	let e3 = new Entity( new Vec2( 50, 0 ), 10, 20 );
	let e3s = e3.getOwnShapes()[0];

	e.addSub( e3 );

	e.angle = Math.PI / 2;
	e3.angle = Math.PI / 2;

	s = e.getShapes( 1.0 );

	tf.ASSERT_EQ( s[0].points[0], new Vec2( 150, 50 ) );
	tf.ASSERT_EQ( e.unapplyTransform( s[0].points[0].copy(), 1.0 ), new Vec2( -50, -100 ) ); // top left of original rect
	tf.ASSERT_EQ( s[0].points[1], new Vec2( 150, 150 ) );
	tf.ASSERT_EQ( s[0].points[2], new Vec2( -50, 150 ) );
	tf.ASSERT_EQ( s[0].points[3], new Vec2( -50, 50 ) );

	tf.ASSERT_EQ( s[2].points[0], new Vec2( 5, 110 ) );//e3s.points[0].plus( e3.pos ).turned( e3.angle ).turned( e.angle ).plus( e.pos ) );
	tf.ASSERT_EQ( e3.unapplyTransform( s[2].points[0].copy(), 1.0 ), new Vec2( -5, -10 ) );
	tf.ASSERT_EQ( s[2].normals[0], new Vec2( 0, 1 ) );

	// position, rotation, and velocity
	e.vel.setValues( 1, 0 );
	e3.angle = 0;
	e3.angleVel = Math.PI / 2;

	s = e.getShapes( 1.0 );

	tf.ASSERT_EQ( s[2].points[0], new Vec2( 6, 110 ) );
	tf.ASSERT_EQ( e3.unapplyTransform( s[2].points[0].copy(), 1.0 ), new Vec2( -5, -10 ) );
	tf.ASSERT_EQ( s[2].normals[0], new Vec2( 0, 1 ) );

	s = e.getShapes( 2.0 );
	
	tf.ASSERT_EQ( s[2].points[0], new Vec2( 42, 55 ) );
	tf.ASSERT_EQ( e3.unapplyTransform( s[2].points[0].copy(), 2.0 ), new Vec2( -5, -10 ) );
	tf.ASSERT_EQ( s[2].normals[0], new Vec2( -1, 0 ) );
}

function test_TopLeftEntity( tf: TestFuncs ) {
	let tl = new TopLeftEntity( new Vec2(), 100, 200 );

	let s = tl.getShapes();

	tf.ASSERT_EQ( s[0].points[0], new Vec2( 0, 0 ) );
	tf.ASSERT_EQ( s[0].points[1], new Vec2( 100, 0 ) );
	tf.ASSERT_EQ( s[0].points[2], new Vec2( 100, 200 ) );
	tf.ASSERT_EQ( s[0].points[3], new Vec2( 0, 200 ) );

	tl.angle = 1;

	// no change
	s = tl.getShapes();

	tf.ASSERT_EQ( s[0].points[0], new Vec2( 0, 0 ) );
	tf.ASSERT_EQ( s[0].points[1], new Vec2( 100, 0 ) );
	tf.ASSERT_EQ( s[0].points[2], new Vec2( 100, 200 ) );
	tf.ASSERT_EQ( s[0].points[3], new Vec2( 0, 200 ) );

	let e = new Entity( new Vec2( 100, 0 ), 10, 10 );
	tl.addSub( e );

	e.angle = Math.PI / 2;

	s = tl.getShapes();

	tf.ASSERT_EQ( s[0].points[0], new Vec2( 0, 0 ) );

	tf.ASSERT_EQ( s[1].points[0], new Vec2( 5, 95 ) );
	tf.ASSERT_EQ( e.unapplyTransform( s[1].points[0].copy() ), new Vec2( -5, -5 ) );
	tf.ASSERT_EQ( s[1].points[1], new Vec2( 5, 105 ) );
	tf.ASSERT_EQ( s[1].points[2], new Vec2( -5, 105 ) );
	tf.ASSERT_EQ( s[1].points[3], new Vec2( -5, 95 ) );
}

let tests: Array<Test> = [];

tests.push( new Test( 'Entity',
					  test_Entity_shapes,
					  ['constructor',
					   'destructor',
					   'addSub',
					   'getSubs',
					   'getOwnShapes',
					   'getShapes',
					   'applyTransform',
					   'unapplyTransform'],
					  ['init',
					   'toJSON',
					   'subDestructor',
					   'clearCollisionData',
					   'onCollideLeft',
					   'onCollideRight',
					   'onCollideUp',
					   'onCollideDown',
					   'shade',
					   'draw',
					   'drawCollisionBox'] ) );

tests.push( new Test( 'TopLeftEntity',
					  test_TopLeftEntity,
					  ['constructor',
					   'getOwnShapes',
					   'applyTransform',
					   'unapplyTransform'],
					  ['draw'] ) );

export default tests;