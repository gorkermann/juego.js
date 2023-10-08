import { Test, Result, TestReport, log_green, log_red,
		 runTestsAsync } from '../lib/TestRun.js'

import fs from 'fs'
import fsp from 'fs/promises'
import path from 'path'

type Dict<Type> = { [key: string]: Type };

/*
	addCoverageReq

	from a list of module members, add entries functions and class functions 
	to a coverage list (to be checked off later by tests)
*/
function addCoverageReq( filename: string, mod: Dict<any>, coverage: Dict<Dict<string>> ) {
	let ignoreProps = ['length', 'name', 'prototype'];

	for ( let [key, obj] of Object.entries( mod ) ) {
		if ( obj.prototype ) {
		
			// no way to distinguish between "classes" and "functions" among module members
			// assume members only constructor in prototype are functions

			let funcs: Array<string> = Object.getOwnPropertyNames( obj.prototype );

			let staticProps = Object.getOwnPropertyNames( obj )
									.filter( x => !ignoreProps.includes( x ) );

			// standalone function
			if ( funcs.length <= 1 && staticProps.length < 1 ) {
				let name = path.win32.basename( filename, '.js' ) + '.function';

				if ( !coverage[name] ) {
					coverage[name] = {};
				}

				coverage[name][key] = '';

			// class 
			} else {
				let members: Dict<string> = {};

				// regular functions
				for ( let name of funcs ) {
					members[name] = '';
				}

				// static functions
				for ( let propName of staticProps ) {
					if ( typeof( obj[propName] ) == 'function' ) {
						members[propName] = '';
					}
				}

				coverage[key] = members;
			}			
		}
	}
}

function reportCoverage( coverage: Dict<Dict<string>> ) {
	let count = 0;
	let covered = 0;
	let ignoredCount = 0;

	let items = [];
	let colWidth = 32;

	for ( let [key, obj] of Object.entries( coverage ) ) {
		let subCount = 0;
		let subCovered = 0;
		let notCovered = '';

		for ( let [funcName, val] of Object.entries( obj ) ) {
			subCount++;

			if ( val != '' ) {
				subCovered++;

				if ( val == 'ignored' ) {
					ignoredCount++;
				}
			} else {
				if ( notCovered != '' ) notCovered += ', ';
				notCovered += funcName;
			}
		}

		if ( subCovered < subCount ) {
			let str = key + ': ' + subCovered + '/' + subCount;
			let tabCount = Math.floor( ( colWidth - str.length ) / 8 ) + 1;

			for ( let i = 0; i < tabCount; i++ ) str += '\t';

			str += '(' + notCovered.slice( 0, colWidth );

			if ( notCovered.length > colWidth ) {
				str += '...)';
			} else {
				str += ')';
			}

			items.push( [key, str] );
		}

		count += subCount;
		covered += subCovered;
	}

	if ( items.length > 0 ) {
		log_red( '\nIncomplete coverage (per module):')

		// sort strings
		items.sort( ( a, b ) => a[0].localeCompare( b[0] ) );
		for ( let item of items ) {
			log_red( item[1] );
		}
	}

	// output overall result
	console.log('');

	let pct = ( covered / count * 100 ).toFixed( 1 ) + '%';
	let str = covered + '/' + count + ' (' + pct + ')';
	str += ', ' + ignoredCount + ' ignored';

	if ( covered < count ) {
		log_red( str );
	} else {
		log_green( str );
	}
}

let dirs = ['.'];

let defaultModules: Array<string> = [
	'./test_Vec2.js',
	'./test_Line.js',
	'./test_Shape.js',
	'./test_Anim.js',
	'./test_Entity.js',
	'./test_collision.js',
	'./test_Angle.js',
	'./test_Field.js',
	'./test_Inspector.js'
]

/*
	runTestsFromModuleAsync

	loads a module, looks inside for a default export consisting of an array of Tests	

	applies the test's reported coverage to the passed coverage object
	add a single result for the entire test (pass/fail) to the passed results array
*/
function runTestsFromModuleAsync( moduleName: string, report: TestReport ): Promise<any> {
	return import( moduleName )
	.then( async function( mod: Dict<any> ) {
		if ( !mod['default'] ) {
			console.log( mod );
			throw new Error( 'Module ' + moduleName + ' has no default export' );
		}

		let tests: Array<Test>;
		let sequential = false;

		if ( mod['default'] instanceof Array ) {
			tests = mod['default'];

		} else {
			tests = mod['default'].tests;
			sequential = mod['default'].sequential;
		}

		return runTestsAsync( tests, sequential, report )
	} );
}

async function run() {

	// build expected coverage dict
	let readdir_p: Array<Promise<void>> = [];
	let coverage: Dict<Dict<string>> = {};

	//await import( '../PrimitiveMgr.js' );

	for ( let dirname of dirs ) {
		let content = await fsp.readdir( './build/' + dirname );
		let importProms: Array<Promise<void>> = [];

		for ( let filename of content ) {
			if ( filename.indexOf( '.js' ) < 0 ) {
				continue;
				// TODO: actual directory check (no method in node fs??)
			}

			if ( filename == 'animatedKeys.js' ) {
				continue;
			}

			let path = '../' + dirname + '/' + filename;
			let mod: Dict<any> = await import( path );
		
			addCoverageReq( filename, mod, coverage );
		}
	}

	// get list of test modules
	// override default list via command line args
	let modules = defaultModules

	let args = process.argv.slice( 2 );
	let argModules = args.filter( a => a.indexOf( '--' ) < 0 );

	if ( argModules.length > 0 ) {
		modules = argModules;
	}

	let hideOutput = false;
	if ( args.includes( '--hide-test-output' ) ) {
		hideOutput = true;
	}

	// run tests sequentially
	let report = new TestReport();

	for ( let moduleName of modules ) {
		await runTestsFromModuleAsync( moduleName, report );
	}

	report.print();

	// if all tests pass, print test coverage
	let passcount = report.getPassCount();

	if ( passcount == report.getResultCount() ) {
		for ( let result of report.results ) {
			for ( let modName in result.coverage ) {

				// named module not seen when all modules were loaded
				if ( !coverage[modName] ) {
					log_red( 'Unexpected module ' + modName );
					continue;
				}

				for ( let funcName in result.coverage[modName] ) {
					let currentStatus = coverage[modName][funcName];

					if ( currentStatus === undefined ) {
						if ( result.coverage[modName][funcName] == 'ignored' ) {
							log_red( modName + ': Unexpected ignore: ' + funcName );
						} else {
							log_red( modName + ': Unexpected coverage: ' + funcName );
						}
						
						continue;
					
					} else if ( currentStatus != '' ) {
						if ( currentStatus == 'ignored' || 
							 result.coverage[modName][funcName] == 'ignored' ) {
							log_red( modName + '.' + funcName + ': double coverage: ' + 
									 currentStatus + ', ' +
									 result.coverage[modName][funcName] );
						}
					}

					coverage[modName][funcName] = result.coverage[modName][funcName];
				}
			}
		}

		reportCoverage( coverage );
	}

	console.log( report.getAssertCount() + ' assertions in ' + report.getResultCount() + ' tests' );
}

run();