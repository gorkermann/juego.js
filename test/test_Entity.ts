import { TestFuncs, Test } from '../lib/TestRun.js'

import { Entity } from '../Entity.js'
import { Line } from '../Line.js'
import { RayHit } from '../RayHit.js'
import { Shape } from '../Shape.js'
import { Vec2 } from '../Vec2.js'

function test_Entity( tf: TestFuncs ) {

}

let tests: Array<Test> = [];

tests.push( new Test( 'Entity',
					  test_Entity,
					  [],
					  [] ) );

export default tests;