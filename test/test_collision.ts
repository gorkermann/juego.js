import { TestFuncs, Test } from '../lib/TestRun.js'

import { solveCollisionsFor, SolverResult } from '../collisionSolver.js'
import { Contact } from '../Contact.js'
import { Entity } from '../Entity.js'
import { Line } from '../Line.js'
import { Material } from '../Material.js'
import { RayHit } from '../RayHit.js'
import { Shape } from '../Shape.js'
import { Vec2 } from '../Vec2.js'

function shake_Contact( tf: TestFuncs ) {
	let e = new Entity( new Vec2( 0, 0 ), 0, 0 );
	let e2 = new Entity( new Vec2( 0, 0 ), 0, 0 );

	new Contact( e, e2, null, null, new Vec2( 1, 0 ) );
	tf.THROWS( () => new Contact( e, e2, null, new Vec2( 0, 0 ), null ) );
	new Contact( e, e2, null, new Vec2( 0, 0 ), new Vec2( 2, 0 ) ); // normal too long
}

function test_crush( tf: TestFuncs ) {
	let COL_WALL = 1;

	let floor = new Entity( new Vec2( 50, 10 ), 100, 20 );
	floor.collisionGroup = COL_WALL;

	let player = new Entity( new Vec2( 50, -5 ), 10, 10 );
	player.collisionMask = COL_WALL;

	let ceiling = new Entity( new Vec2( 50, -21 ), 100, 20 ); // 1 unit above player's head 
	ceiling.collisionGroup = COL_WALL;

	let chamfer = new Entity( new Vec2(), 100, 20 );
	chamfer.collisionGroup = COL_WALL;

	let entities = [floor, ceiling, player];

	let resetPlayer = () => {
		player.pos.set( new Vec2( 50, -5 ) );
		player.vel.set( new Vec2( 0, 0 ) );
	}

	let normals = function( result: SolverResult ) {
		return result.blockedContacts.map( x => x.normal );
	}

	/* neither moving */

	// floor touches, ceiling doesn't
	let result = solveCollisionsFor( player, entities, COL_WALL, COL_WALL, 1.0 );
	tf.ASSERT_EQ( normals( result ), [new Vec2( 0, -1 )], { unordered: true } );
	tf.ASSERT_EQ( result.crushed, false );

	// floor and ceiling touch
	ceiling.pos.set( new Vec2( 50, -20 ) );

	resetPlayer();
	result = solveCollisionsFor( player, entities, COL_WALL, COL_WALL, 1.0 );
	tf.ASSERT_EQ( normals( result ), [new Vec2( 0, -1 ), new Vec2( 0, 1 )], { unordered: true } );
	tf.ASSERT_EQ( result.crushed, false );

	/* one moving */

	// floor and ceiling touch, ceiling moving away
	ceiling.vel.set( new Vec2( 0, -1 ) );

	resetPlayer();
	result = solveCollisionsFor( player, entities, COL_WALL, COL_WALL, 1.0 );
	tf.ASSERT_EQ( normals( result ), [new Vec2( 0, -1 )], { unordered: true } );
	tf.ASSERT_EQ( result.crushed, false );

	// floor and ceiling touch, ceiling moving laterally
	ceiling.vel.set( new Vec2( 1, 0 ) );

	resetPlayer();
	result = solveCollisionsFor( player, entities, COL_WALL, COL_WALL, 1.0 );
	tf.ASSERT_EQ( normals( result ), [new Vec2( 0, -1 ), new Vec2( 0, 1 )], { unordered: true } );
	tf.ASSERT_EQ( result.crushed, false );

	// floor and ceiling touch, ceiling moving toward
	ceiling.vel.set( new Vec2( 0, 1 ) );

	resetPlayer();
	result = solveCollisionsFor( player, entities, COL_WALL, COL_WALL, 1.0 );
	tf.ASSERT_EQ( normals( result ), [new Vec2( 0, -1 ), new Vec2( 0, 1 )], { unordered: true } );
	tf.ASSERT_EQ( result.crushed, true );

	// ceiling above, ceiling moving toward
	ceiling.pos.set( new Vec2( 50, -21 ) );
	ceiling.vel.set( new Vec2( 0, 1 ) );

	resetPlayer();
	result = solveCollisionsFor( player, entities, COL_WALL, COL_WALL, 1.0 );
	tf.ASSERT_EQ( normals( result ), [new Vec2( 0, -1 ), new Vec2( 0, 1 )], { unordered: true } ); // fails single-pass (missing ceiling)
	tf.ASSERT_EQ( result.crushed, true );

	// floor and ceiling touch, ceiling moving 45deg downangled
	ceiling.pos.set( new Vec2( 50, -20 ) );
	ceiling.vel.set( new Vec2( 1, 1 ) );

	resetPlayer();
	result = solveCollisionsFor( player, entities, COL_WALL, COL_WALL, 1.0 );
	tf.ASSERT_EQ( normals( result ), [new Vec2( 0, -1 ), new Vec2( 0, 1 )], { unordered: true } );
	tf.ASSERT_EQ( result.crushed, true );

	// floor and ceiling touch, ceiling moving slightly downangled
	ceiling.vel.set( new Vec2( 1, 0.1 ) );

	resetPlayer();
	result = solveCollisionsFor( player, entities, COL_WALL, COL_WALL, 1.0 );
	tf.ASSERT_EQ( normals( result ), [new Vec2( 0, -1 ), new Vec2( 0, 1 )], { unordered: true } );
	tf.ASSERT_EQ( result.crushed, true );


	/* both moving */

	// floor and ceiling touch, both moving up, ceiling moving faster
	floor.vel.set( new Vec2( 0, -1 ) );
	ceiling.vel.set( new Vec2( 0, -2 ) );

	resetPlayer();
	result = solveCollisionsFor( player, entities, COL_WALL, COL_WALL, 1.0 );
	tf.ASSERT_EQ( normals( result ), [new Vec2( 0, -1 )], { unordered: true } );
	tf.ASSERT_EQ( result.crushed, false );

	// floor and ceiling touch, both moving up
	floor.vel.set( new Vec2( 0, -1 ) );
	ceiling.vel.set( new Vec2( 0, -1 ) );

	resetPlayer();
	result = solveCollisionsFor( player, entities, COL_WALL, COL_WALL, 1.0 );
	tf.ASSERT_EQ( normals( result ), [new Vec2( 0, -1 ), new Vec2( 0, 1 )], { unordered: true } ); // fails single pass (missing ceiling)
	tf.ASSERT_EQ( result.crushed, true );

	// floor and ceiling touch, both moving toward
	floor.vel.set( new Vec2( 0, -1 ) );
	ceiling.vel.set( new Vec2( 0, 1 ) );

	resetPlayer();
	result = solveCollisionsFor( player, entities, COL_WALL, COL_WALL, 1.0 );
	tf.ASSERT_EQ( normals( result ), [new Vec2( 0, -1 ), new Vec2( 0, 1 )], { unordered: true } );
	tf.ASSERT_EQ( result.crushed, true );

	// floor and ceiling touch, both moving up, floor moving faster
	floor.vel.set( new Vec2( 0, -2 ) );
	ceiling.vel.set( new Vec2( 0, -1 ) );

	resetPlayer();
	result = solveCollisionsFor( player, entities, COL_WALL, COL_WALL, 1.0 );
	tf.ASSERT_EQ( normals( result ), [new Vec2( 0, -1 ), new Vec2( 0, 1 )], { unordered: true } ); // fails single pass (missing ceiling)
	tf.ASSERT_EQ( result.crushed, true );


	/* angled ceiling */

	// TODO: player doesn't get crushed if they travel into a V
	let entities2 = [floor, chamfer, player];
	let offset: Vec2;

	floor.vel.set( new Vec2( 0, 0 ) );

	let setChamfer = ( angle: number ) => {
		chamfer.angle = angle;
		offset = new Vec2( 0, -player.height / 2 - chamfer.height / 2 ).rotate( chamfer.angle ); // overlaps player
		chamfer.pos.set( player.pos.plus( offset ) );
		chamfer.vel.set( Vec2.fromPolar( chamfer.angle + Math.PI / 2, 1 ) );
	}

	// 45deg
	setChamfer( Math.PI / 4 );

	resetPlayer();
	result = solveCollisionsFor( player, entities2, COL_WALL, COL_WALL, 1.0 );
	tf.ASSERT_EQ( normals( result ), [new Vec2( 0, -1 ), new Vec2( -1, 1 ).unit()], { unordered: true } );
	tf.ASSERT_EQ( result.crushed, false );

	// 20deg (just shy of threshold) 
	setChamfer( Math.PI / 180 * 20 );

	resetPlayer();
	result = solveCollisionsFor( player, entities2, COL_WALL, COL_WALL, 1.0 );
	tf.ASSERT_EQ( normals( result ), [new Vec2( 0, -1 ), Vec2.fromPolar( chamfer.angle + Math.PI / 2, 1 )], { unordered: true } );
	tf.ASSERT_EQ( result.crushed, false );

	// 15deg (under threshold) 
	setChamfer( Math.PI / 180 * 15 );

	resetPlayer();
	result = solveCollisionsFor( player, entities2, COL_WALL, COL_WALL, 1.0 );
	tf.ASSERT_EQ( normals( result ), [new Vec2( 0, -1 ), Vec2.fromPolar( chamfer.angle + Math.PI / 2, 1 )], { unordered: true } );
	tf.ASSERT_EQ( result.crushed, true );

	// TODO: test where angled ceiling is moving horizontally
}

let tests: Array<Test> = [];

tests.push( new Test( 'Contact.function',
					  shake_Contact,
					  ['Contact'] ) );

tests.push( new Test( 'Entity',
					  test_crush,
					  [] ) );

export default tests;