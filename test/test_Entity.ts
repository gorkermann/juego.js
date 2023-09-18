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

function test_EntityOverlap( tf: TestFuncs ) {
	let e1 = new Entity( new Vec2( 0, 0 ), 20, 20 );
	let e2 = new Entity( new Vec2( 10, 0 ), 10, 10 ); // sitting on right edge of e1

	tf.ASSERT( !e1.canBeHitBy( e1 ) ); // same entity

	tf.ASSERT( !e1.canBeHitBy( e2 ) ); // both collision masks are 0x00
	tf.ASSERT( !e2.canBeHitBy( e1 ) ); 
	tf.ASSERT_EQ( e1.overlaps( e2, 0.0 ).length, 0 );

	e1.collisionMask = 0x01;
	e2.collisionGroup = 1;
	let contacts = e1.overlaps( e2, 0.0 ); 
	tf.ASSERT( e1.canBeHitBy( e2 ) ); // e1.mask & e2.group > 0
	tf.ASSERT( !e2.canBeHitBy( e1 ) ); // e2 has no collision mask set, so accepts no collisions
	tf.ASSERT_EQ( contacts.length, 1 ); // edges cross


	/* e2 is moving */

	e2.vel = new Vec2( 10, 0 ); // next position would be (20, 0), outside of e1
	tf.ASSERT_EQ( e1.overlaps( e2, 1.0 ).length, 0 );

	contacts = e1.overlaps( e2, 0.0 ); 
	tf.ASSERT_EQ( contacts.length, 1 );
	tf.ASSERT_EQ( contacts[0].sub, e1 );
	tf.ASSERT_EQ( contacts[0].otherSub, e2 );

	// don't check slice? that might not belong in Contact
	tf.ASSERT_EQ( contacts[0].vel, new Vec2( 10, 0 ) ); // velocity comes from second object
	tf.ASSERT_EQ( contacts[0].normal, new Vec2( -1, 0 ) ); // both points of left edge of e2 are inside e1


	/* e1+e1ito overlaps e2 */

	// add a subentity
	let e1ito = new Entity( new Vec2( 15, 0 ), 10, 20 );
	e1.addSub( e1ito );

 	// e2 fully inside e1ito, e1ito has no collision group set
 	// (parent is used be default)
	contacts = e1.overlaps( e2, 1.0 );
	tf.ASSERT_EQ( contacts.length, 1 );
	tf.ASSERT_EQ( contacts[0].sub, e1 );

	// mask of child is set, but no group
	// (mask is ignored, parent is used be default)
	e1ito.collisionMask = 0x01;
	e1ito.collisionGroup = 0;
	contacts = e1.overlaps( e2, 1.0 );
	tf.ASSERT_EQ( contacts.length, 1 );
	tf.ASSERT_EQ( contacts[0].sub, e1 );

	// group of child is set, but e1ito's mask rejects e2
	// (no collision)
	e1ito.collisionMask = 0x02;
	e1ito.collisionGroup = 1;
	contacts = e1.overlaps( e2, 1.0 );
	tf.ASSERT_EQ( contacts.length, 0 );

	// mask and group are set
	// (child is used)
	e1ito.collisionMask = 0x01;
	e1ito.collisionGroup = 2;
	contacts = e1.overlaps( e2, 1.0 );
	tf.ASSERT_EQ( contacts.length, 1 );
	tf.ASSERT_EQ( contacts[0].sub, e1ito );


	/* e2 overlaps e1+e1ito */

	e1.collisionGroup = 2; // wasn't set before
	e1.collisionMask = 0x01; // same
	e1ito.collisionGroup = 0; // cleared
	e1ito.collisionMask = 0x00; // cleared
	e2.collisionGroup = 1; // same
	e2.collisionMask = 0x02; // wasn't set before

	contacts = e2.overlaps( e1, 1.0 );
	tf.ASSERT_EQ( contacts.length, 1 );
	tf.ASSERT_EQ( contacts[0].sub, e2 );
	tf.ASSERT_EQ( contacts[0].otherSub, e1 );

	// mask of child is set, but no group
	// (mask is ignored, parent is used be default)
	e1ito.collisionMask = 0x01;
	e1ito.collisionGroup = 0;
	contacts = e2.overlaps( e1, 1.0 );
	tf.ASSERT_EQ( contacts.length, 1 );
	tf.ASSERT_EQ( contacts[0].otherSub, e1 );

	// group of child is set, but e2's mask rejects e1ito
	// (no collision)
	e1ito.collisionMask = 0x02;
	e1ito.collisionGroup = 1;
	contacts = e2.overlaps( e1, 1.0 );
	tf.ASSERT_EQ( contacts.length, 0 );

	// mask and group are set
	// (child is used)
	e1ito.collisionMask = 0x01;
	e1ito.collisionGroup = 2;
	contacts = e2.overlaps( e1, 1.0 );
	tf.ASSERT_EQ( contacts.length, 1 );
	tf.ASSERT_EQ( contacts[0].otherSub, e1ito );
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
					   '_subDestructor',
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

tests.push( new Test( 'Entity',
					  test_EntityOverlap,
					  ['canBeHitBy'],[] 
					  ) ); 

export default tests;