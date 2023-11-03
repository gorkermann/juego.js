import { TestFuncs, Test } from '../lib/TestRun.js'

let tests: Array<Test> = [];

tests.push( new Test( 'Mock.function',
					  ( tf: TestFuncs ) => tf.ASSERT( true ),
					  ['MockInputElement',
					   'MockOptionElement'] ) );

export default tests;