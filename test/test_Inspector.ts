import { TestFuncs, Test } from '../lib/TestRun.js'

let tests: Array<Test> = [];

function test_Inspector( tf: TestFuncs ) {
	tf.ASSERT( true );
}

tests.push( new Test( 'Inspector',
					  test_Inspector,
					  [],
					  ['constructor',
					   'updateFields',
					   'getPanel',
					   'addField']));

export default tests;