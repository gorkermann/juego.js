import { TestFuncs, Test } from '../lib/TestRun.js'

import { Vec2 } from '../Vec2.js'

let tests: Array<Test> = [];

tests.push( new Test( 'AnimatedImage',
					  ( tf: TestFuncs ) => tf.ASSERT( true ),
					  [], 
					  ['constructor',
					   'deriveConstants',
					   'draw'] ) );

tests.push( new Test( 'Animation',
					  ( tf: TestFuncs ) => tf.ASSERT( true ),
					  [], 
					  ['constructor',
					   'getFrameIndex',
					   'hasCompleted'] ) );

tests.push( new Test( 'AnimationRunner',
					  ( tf: TestFuncs ) => tf.ASSERT( true ),
					  [], 
					  ['constructor',
					   'setVisible',
					   'setLoopingAnim',
					   'setLimitedAnim',
					   'hasCompleted',
					   'update',
					   'advanceFrames',
					   'setRotation',
					   'setScale',
					   'draw'] ) );

tests.push( new Test( 'RegularImage',
					  ( tf: TestFuncs ) => tf.ASSERT( true ),
					  [], 
					  ['constructor',
					   'draw'] ) );

tests.push( new Test( 'TileArray',
					  ( tf: TestFuncs ) => tf.ASSERT( true ),
					  [], 
					  ['constructor',
					   'validIndices',
					   'getSub',
					   'map',
					   'get',
					   'set',
					   'clear',
					   'deepcopy'] ) );

export default tests;