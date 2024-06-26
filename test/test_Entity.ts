import * as tp from '../lib/toastpoint.js'

import { TestFuncs, Test } from '../lib/TestRun.js'

import { constructors, nameMap } from '../constructors.js'
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
	e.cachedShapes = [];

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
	e.cachedShapes = [];

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
	e.cachedShapes = [];

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

	e1 = new Entity( new Vec2( 0, 0 ), 20, 20 );
	e1.collisionMask = 0x01;

	e2 = new Entity( new Vec2( 10, 0 ), 10, 10 );
	e2.vel = new Vec2( 10, 0 ); // next position would be (20, 0), outside of e1
	e2.collisionGroup = 1;

	tf.ASSERT_EQ( e1.overlaps( e2, 1.0 ).length, 0 );

	contacts = e1.overlaps( e2, 0.0 ); 
	tf.ASSERT_EQ( contacts.length, 1 );
	tf.ASSERT_EQ( contacts[0].sub, e1 );
	tf.ASSERT_EQ( contacts[0].otherSub, e2 );

	// don't check slice? that might not belong in Contact
	tf.ASSERT_EQ( contacts[0].vel, new Vec2( 10, 0 ) ); // velocity comes from second object
	tf.ASSERT_EQ( contacts[0].normal, new Vec2( -1, 0 ) ); // both points of left edge of e2 are inside e1


	/* e1+e1ito overlaps e2 */

	e1 = new Entity( new Vec2( 0, 0 ), 20, 20 );
	e1.collisionMask = 0x01;
	let e1ito = new Entity( new Vec2( 15, 0 ), 10, 20 );
	e1.addSub( e1ito );

	e2 = new Entity( new Vec2( 10, 0 ), 10, 10 );
	e2.vel = new Vec2( 10, 0 ); // next position would be (20, 0), outside of e1 but inside e1ito
	e2.collisionGroup = 1;

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

function test_EntityCopy( tf: TestFuncs ) {

	// single entity, no relations
	let e = new Entity( new Vec2( 1, 1 ), 10, 10 );

	let copy = e.copy();

	tf.ASSERT( e.pos != copy.pos );
	tf.ASSERT_EQ( e.pos, copy.pos );

	// with subs
	e = new Entity( new Vec2( 1, 1 ), 10, 10 );
	let e2 = new Entity( new Vec2( 2, 2 ), 20, 20 );

	e.addSub( e2 );

	copy = e.copy();

	tf.ASSERT_EQ( copy.getSubs().length, 1 );
	tf.ASSERT( copy.getSubs()[0] != e2 );
	tf.ASSERT( copy.getSubs()[0].pos != e2.pos );
	tf.ASSERT_EQ( copy.getSubs()[0].pos, e2.pos );
}

function test_replacePresetShapes( tf: TestFuncs ) {
	let e = new Entity( new Vec2( 100, 100 ), 100, 10 );

	let shapes = e.getOwnShapes();

	tf.ASSERT_EQ( shapes.length, 1 );
	tf.ASSERT_EQ( shapes[0].points.length, 4 );

	let s = Shape.fromPoints( [new Vec2( 0, 0 ),
						 	   new Vec2( 20, 0 ),
						 	   new Vec2( 0, 20 )] );
	let s2 = Shape.fromPoints( [new Vec2( 0, 0 ),
						 	    new Vec2( -20, 0 ),
						 	    new Vec2( -20, -20 ),
						 	    new Vec2( 0, -20 )] );

	e.presetShapes = [s, s2];

	shapes = e.getOwnShapes();

	tf.ASSERT_EQ( shapes.length, 2 );
	tf.ASSERT( shapes[0] != s );
	tf.ASSERT( shapes[1] != s2 );
	tf.ASSERT_EQ( shapes[0].points.length, 3 );
	tf.ASSERT_EQ( shapes[1].points.length, 4 );

	shapes = e.getShapes();

	tf.ASSERT_EQ( shapes[0].points, [new Vec2( 100, 100 ),
						 	   		 new Vec2( 120, 100 ),
						 	  		 new Vec2( 100, 120 )] );

	shapes[0].points[0].add( new Vec2( 5, 5 ) );

	// replacePresetShapes()
	e.replacePresetShapes( shapes ); // calls unapplyTransformToShape()

	tf.ASSERT_EQ( e.presetShapes.length, 2 );
	tf.ASSERT( e.presetShapes[0] == shapes[0] );
	tf.ASSERT( e.presetShapes[1] == shapes[1] );
	tf.ASSERT_EQ( e.presetShapes[0].points.length, 3 );
	tf.ASSERT_EQ( e.presetShapes[1].points.length, 4 );

	// one of these points is shifted
	tf.ASSERT_EQ( e.presetShapes[0].points, 
					[new Vec2( 5, 5 ), // different
					 new Vec2( 20, 0 ),
					 new Vec2( 0, 20 )] );

	tf.ASSERT_EQ( e.presetShapes[1].points, 
					[new Vec2( 0, 0 ),
					 new Vec2( -20, 0 ),
					 new Vec2( -20, -20 ),
					 new Vec2( 0, -20 )] );
}

function shake_copy( tf: TestFuncs ) {

	// copy()
	let e = new Entity( new Vec2(), 0, 0 );
	let e2 = new Entity( new Vec2(), 0, 0 );

	e.parent = e2;
	let copy = e.copy();

	tf.ASSERT( copy !== null );
	tf.ASSERT( copy.parent === null );

	// toToast()
	let toaster = new tp.Toaster( constructors, nameMap );

	tf.ASSERT( e.toToast( toaster ) !== null );
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
					   '_subDestructor',
					   'shade',
					   'draw'] ) );

tests.push( new Test( 'TopLeftEntity',
					  test_TopLeftEntity,
					  ['constructor',
					   'getOwnShapes',
					   'applyTransform',
					   'unapplyTransform'],
					  ['draw'] ) );

tests.push( new Test( 'Entity',
					  test_EntityOverlap,
					  ['canBeHitBy'],
					  ) ); 

tests.push( new Test( 'Entity',
					  test_EntityCopy,
					  [],
					  ) ); 

tests.push( new Test( 'Entity',
					  test_replacePresetShapes,
					  ['replacePresetShapes',
					   'unapplyTransformToShape'],
					  ) );

tests.push( new Test( 'Entity',
					  shake_copy,
					  ['copy',
					   'toToast'],
					  ) );


tests.push( new Test( 'IsoTriangleEntity',
					  ( tf: TestFuncs ) => tf.ASSERT( true ),
					  [], ['constructor',
					   '_getDefaultShapes'] ) );

tests.push( new Test( 'RightTriangleEntity',
					  ( tf: TestFuncs ) => tf.ASSERT( true ),
					  [], ['constructor',
					   '_getDefaultShapes'] ) );

tests.push( new Test( 'OvalEntity',
					  ( tf: TestFuncs ) => tf.ASSERT( true ),
					  [], ['constructor',
					   '_getDefaultShapes'] ) );

export default tests;