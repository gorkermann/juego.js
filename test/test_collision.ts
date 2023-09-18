import { TestFuncs, Test } from '../lib/TestRun.js'

import { solveCollisionsFor } from '../collisionSolver.js'
import { Entity } from '../Entity.js'
import { Line } from '../Line.js'
import { Material } from '../Material.js'
import { RayHit } from '../RayHit.js'
import { Shape } from '../Shape.js'
import { Vec2 } from '../Vec2.js'

let tests: Array<Test> = [];

function test_crush( tf: TestFuncs ) {
	let floor = new Entity( new Vec2( 50, 10 ), 100, 20 );
	floor.collisionGroup = 1;

	let player = new Entity( new Vec2( 50, -5 ), 10, 10 );
	player.collisionMask = 0x01;

	let ceiling = new Entity( new Vec2( 50, -21 ), 100, 20 ); // 1 unit above player's head 
	ceiling.collisionGroup = 1;

	let chamfer = new Entity( new Vec2(), 100, 20 );
	chamfer.collisionGroup = 1;

	let entities = [floor, ceiling, player];

	let resetPlayerPosition = () => {
		player.pos.set( new Vec2( 50, -5 ) );
	}


	/* neither moving */

	// floor touches, ceiling doesn't
	let result = solveCollisionsFor( player, entities, 0x01, 1.0 );
	tf.ASSERT_EQ( result.blockedDirs, [new Vec2( 0, -1 )], { unordered: true } );
	tf.ASSERT_EQ( result.crushed, false );

	// floor and ceiling touch
	ceiling.pos.set( new Vec2( 50, -20 ) );

	resetPlayerPosition();
	result = solveCollisionsFor( player, entities, 0x01, 1.0 );
	tf.ASSERT_EQ( result.blockedDirs, [new Vec2( 0, -1 ), new Vec2( 0, 1 )], { unordered: true } );
	tf.ASSERT_EQ( result.crushed, false );


	/* one moving */

	// floor and ceiling touch, ceiling moving away
	ceiling.vel.set( new Vec2( 0, -1 ) );

	resetPlayerPosition();
	result = solveCollisionsFor( player, entities, 0x01, 1.0 );
	tf.ASSERT_EQ( result.blockedDirs, [new Vec2( 0, -1 )], { unordered: true } );
	tf.ASSERT_EQ( result.crushed, false );

	// floor and ceiling touch, ceiling moving laterally
	ceiling.vel.set( new Vec2( 1, 0 ) );

	resetPlayerPosition();
	result = solveCollisionsFor( player, entities, 0x01, 1.0 );
	tf.ASSERT_EQ( result.blockedDirs, [new Vec2( 0, -1 ), new Vec2( 0, 1 )], { unordered: true } );
	tf.ASSERT_EQ( result.crushed, false );

	// floor and ceiling touch, ceiling moving toward
	ceiling.vel.set( new Vec2( 0, 1 ) );

	resetPlayerPosition();
	result = solveCollisionsFor( player, entities, 0x01, 1.0 );
	tf.ASSERT_EQ( result.blockedDirs, [new Vec2( 0, -1 ), new Vec2( 0, 1 )], { unordered: true } );
	tf.ASSERT_EQ( result.crushed, true );

	// ceiling above, ceiling moving toward
	ceiling.pos.set( new Vec2( 50, -21 ) );
	ceiling.vel.set( new Vec2( 0, 1 ) );

	resetPlayerPosition();
	result = solveCollisionsFor( player, entities, 0x01, 1.0 );
	tf.ASSERT_EQ( result.blockedDirs, [new Vec2( 0, -1 ), new Vec2( 0, 1 )], { unordered: true } );
	tf.ASSERT_EQ( result.crushed, true );

	ceiling.pos.set( new Vec2( 50, -20 ) );	

	// floor and ceiling touch, ceiling moving at 45deg
	ceiling.vel.set( new Vec2( 1, 1 ) );

	resetPlayerPosition();
	result = solveCollisionsFor( player, entities, 0x01, 1.0 );
	tf.ASSERT_EQ( result.blockedDirs, [new Vec2( 0, -1 ), new Vec2( 0, 1 )], { unordered: true } );
	tf.ASSERT_EQ( result.crushed, true );

	// floor and ceiling touch, ceiling moving slightly downangled
	ceiling.vel.set( new Vec2( 1, 0.1 ) );

	resetPlayerPosition();
	result = solveCollisionsFor( player, entities, 0x01, 1.0 );
	tf.ASSERT_EQ( result.blockedDirs, [new Vec2( 0, -1 ), new Vec2( 0, 1 )], { unordered: true } );
	tf.ASSERT_EQ( result.crushed, true );


	/* both moving */

	// floor and ceiling touch, both moving up, ceiling moving faster
	floor.vel.set( new Vec2( 0, -1 ) );
	ceiling.vel.set( new Vec2( 0, -2 ) );

	resetPlayerPosition();
	result = solveCollisionsFor( player, entities, 0x01, 1.0 );
	tf.ASSERT_EQ( result.blockedDirs, [new Vec2( 0, -1 )], { unordered: true } );
	tf.ASSERT_EQ( result.crushed, false );

	// floor and ceiling touch, both moving up
	floor.vel.set( new Vec2( 0, -1 ) );
	ceiling.vel.set( new Vec2( 0, -1 ) );

	resetPlayerPosition();
	result = solveCollisionsFor( player, entities, 0x01, 1.0 );
	tf.ASSERT_EQ( result.blockedDirs, [new Vec2( 0, -1 ), new Vec2( 0, 1 )], { unordered: true } );
	tf.ASSERT_EQ( result.crushed, true );

	// floor and ceiling touch, both moving toward
	floor.vel.set( new Vec2( 0, -1 ) );
	ceiling.vel.set( new Vec2( 0, 1 ) );

	resetPlayerPosition();
	result = solveCollisionsFor( player, entities, 0x01, 1.0 );
	tf.ASSERT_EQ( result.blockedDirs, [new Vec2( 0, -1 ), new Vec2( 0, 1 )], { unordered: true } );
	tf.ASSERT_EQ( result.crushed, true );

	// floor and ceiling touch, both moving up, floor moving faster
	floor.vel.set( new Vec2( 0, -2 ) );
	ceiling.vel.set( new Vec2( 0, -1 ) );

	resetPlayerPosition();
	result = solveCollisionsFor( player, entities, 0x01, 1.0 );
	tf.ASSERT_EQ( result.blockedDirs, [new Vec2( 0, -1 ), new Vec2( 0, 1 )], { unordered: true } );
	tf.ASSERT_EQ( result.crushed, true );


	/* chamfer ceiling */

	let entities2 = [floor, chamfer, player];
	let offset: Vec2;

	floor.vel.set( new Vec2( 0, 0 ) );

	let setChamfer = ( angle: number ) => {
		chamfer.angle = angle;
		offset = new Vec2( 0, -player.height / 2 - chamfer.height / 2 ).rotate( chamfer.angle );
		chamfer.pos.set( player.pos.plus( offset ) );
		chamfer.vel.set( Vec2.fromPolar( chamfer.angle + Math.PI / 2, 1 ) );
	}

	// 45deg
	setChamfer( Math.PI / 4 );

	resetPlayerPosition();
	result = solveCollisionsFor( player, entities2, 0x01, 1.0 );
	tf.ASSERT_EQ( result.blockedDirs, [new Vec2( 0, -1 ), new Vec2( -1, 1 ).unit()], { unordered: true } );
	tf.ASSERT_EQ( result.crushed, false );

	// 20deg (just shy of threshold) 
	setChamfer( Math.PI / 180 * 20 );

	resetPlayerPosition();
	result = solveCollisionsFor( player, entities2, 0x01, 1.0 );
	tf.ASSERT_EQ( result.blockedDirs, [new Vec2( 0, -1 ), Vec2.fromPolar( chamfer.angle + Math.PI / 2, 1 )], { unordered: true } );
	tf.ASSERT_EQ( result.crushed, false );

	// 15deg (under threshold) 
	setChamfer( Math.PI / 180 * 15 );

	resetPlayerPosition();
	result = solveCollisionsFor( player, entities2, 0x01, 1.0 );
	tf.ASSERT_EQ( result.blockedDirs, [new Vec2( 0, -1 ), Vec2.fromPolar( chamfer.angle + Math.PI / 2, 1 )], { unordered: true } );
	tf.ASSERT_EQ( result.crushed, true );
}

tests.push( new Test( 'Entity',
					  test_crush,
					  [], 
					  [] ) );

export default tests;