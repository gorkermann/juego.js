import { TestFuncs, Test } from '../lib/TestRun.js'

import { Dropdown } from '../Dropdown.js'
import { Range, Editable, rangeEdit, edit } from '../Editable.js'
import { Field, InputField, DropField } from '../panel/Field.js'
import { MockInputElement, MockSelectElement } from '../Mock.js'
import { Vec2 } from '../Vec2.js'

import { Dict } from '../util.js'

let tests: Array<Test> = [];

function test_edit( tf: TestFuncs ) {
	let obj = {
		x: 0,
		y: '',
		z: false,
		a: {}
	}

	tf.THROWS( () => edit( obj, 'x', undefined ) ); // unhandled value type


	tf.ASSERT_EQ( obj.x, 0 );
	tf.THROWS( () => edit( obj, 'x', '' ) );
	tf.THROWS( () => edit( obj, 'x', false ) );
	tf.THROWS( () => edit( obj, 'x', null ) );

	edit( obj, 'x', 1 );
	tf.ASSERT_EQ( obj.x, 1 );

	tf.ASSERT_EQ( obj.y, '' );
	tf.THROWS( () => edit( obj, 'y', 0 ) );
	tf.THROWS( () => edit( obj, 'y', false ) );
	tf.THROWS( () => edit( obj, 'y', null ) );	

	edit( obj, 'y', 'short' );
	tf.ASSERT_EQ( obj.y, 'short' );


	tf.ASSERT_EQ( obj.z, false );
	tf.THROWS( () => edit( obj, 'z', 0 ) );
	tf.THROWS( () => edit( obj, 'z', '' ) );
	tf.THROWS( () => edit( obj, 'z', null ) );
	
	edit( obj, 'z', true );
	tf.ASSERT_EQ( obj.z, true );

	// no equality check for object
	tf.THROWS( () => edit( obj, 'a', 0 ) );
	tf.THROWS( () => edit( obj, 'a', '' ) );
	tf.THROWS( () => edit( obj, 'a', false ) );

	edit( obj, 'a', null );
	tf.ASSERT_EQ( obj.a, null );
}

tests.push( new Test( 'Editable.function',
					  test_edit,
					  ['edit'] ) );

function test_rangeEdit( tf: TestFuncs ) {
	let obj = {
		x: 0,
		y: 0.0,
		z: 0.0,
		a: 0.0,
		str: '',
		str2: '',
		str3: '',
		str4: '',
		editFields: [ 'x', 'y', 'z', 'str', 'str2', 'str3'],
		ranges: { 'x': 'int', 'y': 'real', 'str': ['lake', 'stream'], 'str2': /^a.*z$/ } as Dict<Range>,
		edit: null as any
	}

	obj.edit = rangeEdit.bind( obj );

	// no change for unhandled values
	obj.edit( 'x', undefined );
	tf.ASSERT_EQ( obj.x, 0 );

	tf.THROWS( () => obj.edit( 'x', '' ) );

	tf.THROWS( () => obj.edit( 'x', NaN ) );
	tf.THROWS( () => obj.edit( 'x', Infinity ) );
	tf.THROWS( () => obj.edit( 'x', -Infinity ) );

	// int
	obj.edit( 'x', 1.1 );
	tf.ASSERT_EQ( obj.x, 1 );	
	obj.edit( 'x', -1.1 );
	tf.ASSERT_EQ( obj.x, -2 );

	// float
	obj.edit( 'y', 1.1 );
	tf.ASSERT_EQ( obj.y, 1.1 );	
	obj.edit( 'y', -1.1 );
	tf.ASSERT_EQ( obj.y, -1.1 );	

	// no range specified (positive int)
	obj.edit( 'z', 1.1 );
	tf.ASSERT_EQ( obj.z, 1 );	
	obj.edit( 'z', 0 );
	tf.ASSERT_EQ( obj.z, 0 );

	// not in editFields (don't care)
	obj.edit( 'a', 1.1 );
	tf.ASSERT_EQ( obj.a, 1 );	
	obj.edit( 'a', 0 );
	tf.ASSERT_EQ( obj.a, 0 );

	// not in obj
	tf.THROWS( () => obj.edit( 'str1', 0 ) );

	// list range
	obj.edit( 'str', 'a' );
	tf.ASSERT_EQ( obj.str, '' );	
	obj.edit( 'str', 'stream' );
	tf.ASSERT_EQ( obj.str, 'stream' );

	// regex range
	obj.edit( 'str2', 'adz' );
	tf.ASSERT_EQ( obj.str2, 'adz' );	
	obj.edit( 'str2', 'adze' );
	tf.ASSERT_EQ( obj.str2, 'adz' );

	// no range specified
	obj.edit( 'str3', 'mountain' );
	tf.ASSERT_EQ( obj.str3, 'mountain' );	
	obj.edit( 'str3', '' );
	tf.ASSERT_EQ( obj.str3, '' );

	// not in editFields (don't care)
	obj.edit( 'str4', 'canyon' );
	tf.ASSERT_EQ( obj.str4, 'canyon' );	
	obj.edit( 'str4', '' );
	tf.ASSERT_EQ( obj.str4, '' );
}

tests.push( new Test( 'Editable.function',
					  test_rangeEdit,
					  ['rangeEdit'] ) );

function test_Field( tf: TestFuncs ) {
	let obj = {
		x: 0,
		editFields: ['x'],
		ranges: {},
		overrideFields: [] as Array<string>,
		edit: null as any,
	}

	let obj2 = {
		x: 0,
		editFields: ['x'],
		overrideFields: [] as Array<string>,
		ranges: {},
		edit: null as any,
	}

	let obj3 = {
		x: '',
		y: 0,
		editFields: ['x'],
		ranges: {},
		edit: null as any,
	}

	obj.edit = rangeEdit.bind( obj );
	obj2.edit = rangeEdit.bind( obj2 );
	obj3.edit = rangeEdit.bind( obj3 );

	// constructor()
	tf.THROWS( () => new Field( [obj], 'z', 'number' ) ); // no field z
	tf.THROWS( () => new Field( [obj, obj3], 'y', 'number' ) ); // field present on obj3 but not obj
	tf.THROWS( () => new Field( [obj, obj3], 'x', 'string' ) ); // type mismatch for obj.x
	tf.THROWS( () => new Field( [obj, obj3], 'x', 'boolean' ) ); // type mismatch for both
	tf.THROWS( () => new Field( [obj, obj3], 'x', '' ) ); // type mismatch for both	

	let field = new Field( [obj, obj2], 'x', 'number' );

	// takeInput()
	// do nothing
	tf.ASSERT_EQ( obj.x, 0 );
	tf.ASSERT_EQ( obj2.x, 0 );

	tf.THROWS( () => field['takeInput']( NaN ) );
	tf.THROWS( () => field['takeInput']( Infinity ) );
	tf.THROWS( () => field['takeInput']( -Infinity ) );
	tf.THROWS( () => field['takeInput']( 'ocean' ) );
	tf.THROWS( () => field['takeInput']( false ) );

	obj2.x = 5;

	tf.ASSERT_EQ( obj.x, 0 );
	tf.ASSERT_EQ( obj2.x, 5 );

	field['takeInput']( 1 );

	tf.ASSERT_EQ( obj.x, 1 );
	tf.ASSERT_EQ( obj2.x, 1 );

	field['takeInput']( -1 );

	tf.ASSERT_EQ( obj.x, 1 ); // default range is positive integer
	tf.ASSERT_EQ( obj2.x, 1 );

	// getObjectValues()
	// updateControl()
	tf.ASSERT_EQ( field['getObjectValues'](), 1 );

	tf.ASSERT_EQ( field['gotInput'], true ); // because takeInput was called above
	tf.ASSERT_EQ( field['firstUpdate'], true ); // because update has not been called yet
	tf.ASSERT_EQ( field['edited'], false ); // because update has not been called yet

	field.updateControl();

	tf.ASSERT_EQ( field['gotInput'], false );
	tf.ASSERT_EQ( field['firstUpdate'], false );
	tf.ASSERT_EQ( field['edited'], false ); // because firstUpdate was set when update was called

	field['takeInput']( 0 );
	field.updateControl();

	tf.ASSERT_EQ( field['edited'], true );

	obj.x = 0;
	obj2.x = 1;

	tf.ASSERT_EQ( field['getObjectValues'](), '[0,1]' );

	field.updateControl();

	tf.ASSERT_EQ( field['edited'], true );

	// allValuesOverridden() 
	tf.ASSERT_EQ( field['allValuesOverridden'](), false );

	obj.overrideFields = ['x'];

	tf.ASSERT_EQ( field['allValuesOverridden'](), false );

	obj2.overrideFields = ['x']

	tf.ASSERT_EQ( field['allValuesOverridden'](), true );
}

tests.push( new Test( 'Field',
					  test_Field,
					  ['constructor',
					   'takeInput',
					   'getObjectValues',
					   'updateControl',
					   'allValuesOverridden'],
					  
					  // ignoring these because they are empty
					  ['getDisplayValue',
					   'setDisplayValue'] ) );

function test_InputField( tf: TestFuncs ) {
	let obj = {
		x: 0,
		str: '',
		flag: false,		
		editFields: ['x'],
		ranges: {} as Dict<Range>,
		overrideFields: [] as Array<string>,
		edit: null as any,
	}

	let obj2 = {
		x: 0,
		str: '',
		flag: false,
		editFields: ['x'],
		overrideFields: [] as Array<string>,
		ranges: {} as Dict<Range>,
		edit: null as any,
	}

	obj.edit = rangeEdit.bind( obj );
	obj2.edit = rangeEdit.bind( obj2 );

	let input = new MockInputElement();
	let field = new InputField( [obj, obj2], 'x', 'number', input as any as HTMLInputElement );

	tf.ASSERT_EQ( field['firstUpdate'], false );

	tf.ASSERT_EQ( field['getDisplayValue'](), 0 );

	field['setDisplayValue']( 1 ); // doesn't change object values
	tf.ASSERT_EQ( field['getDisplayValue'](), 1 );
	tf.ASSERT_EQ( obj.x, 0 );
	tf.ASSERT_EQ( obj2.x, 0 );

	field.updateControl();
	tf.ASSERT_EQ( field['getDisplayValue'](), 0 );
	tf.ASSERT_EQ( obj.x, 0 ); // same as before
	tf.ASSERT_EQ( obj2.x, 0 );	

	field['setDisplayValue']( 1 );
	field.input.onchange( null ); // this triggers the object value change
	field.updateControl();

	tf.ASSERT_EQ( field['getDisplayValue'](), 1 );
	tf.ASSERT_EQ( obj.x, 1 );
	tf.ASSERT_EQ( obj2.x, 1 );

	// change the range of one of the objects
	obj2.ranges['x'] = 'real';

	field['setDisplayValue']( 1.1 );
	field.input.onchange( null );
	field.updateControl();

	tf.ASSERT_EQ( field['getDisplayValue'](), '[1,1.1]' );
	tf.ASSERT_EQ( obj.x, 1 );
	tf.ASSERT_EQ( obj2.x, 1.1 );


	// string field
	let input_str = new MockInputElement();
	let field_str = new InputField( [obj, obj2], 'str', 'string', input_str as any as HTMLInputElement );

	tf.ASSERT_EQ( obj.str, '' );
	tf.ASSERT_EQ( obj2.str, '' );

	// not doing type checking here (e.g. trying to pass a number) since HTMLInputElement.value will be cast to a string 
	field_str['setDisplayValue']( 'ocean' ); // doesn't change object values
	field_str.input.onchange( null );
	field_str.updateControl();

	tf.ASSERT_EQ( obj.str, 'ocean' );
	tf.ASSERT_EQ( obj2.str, 'ocean' );


	// bool field
	let input_flag = new MockInputElement();
	let field_flag = new InputField( [obj, obj2], 'flag', 'boolean', input_flag as any as HTMLInputElement );

	tf.ASSERT_EQ( obj.flag, false );
	tf.ASSERT_EQ( obj2.flag, false );

	// not doing type checking here (e.g. trying to pass a number) since HTMLInputElement.checked will be cast to a bool
	field_flag['setDisplayValue']( true ); // doesn't change object values
	field_flag.input.onchange( null );
	field_flag.updateControl();

	tf.ASSERT_EQ( obj.flag, true );
	tf.ASSERT_EQ( obj2.flag, true );
}

tests.push( new Test( 'InputField',
					  test_InputField,
					  ['constructor',
					   'getDisplayValue',
					   'setDisplayValue'] ) );

function test_DropField( tf: TestFuncs ) {
	let obj = {
		x: 0,
		str: '',		
		editFields: [] as Array<string>,
		ranges: {} as Dict<Range>,
		overrideFields: [] as Array<string>,
		edit: null as any,
	}

	let obj2 = {
		x: 0,
		str: '',
		editFields: [] as Array<string>,
		ranges: {} as Dict<Range>,
		overrideFields: [] as Array<string>,
		edit: null as any,
	}

	obj.edit = rangeEdit.bind( obj );
	obj2.edit = rangeEdit.bind( obj2 );

	let drop = new Dropdown();
	drop.dom = new MockSelectElement as any as HTMLSelectElement;

	drop.addOption( 'lake' );
	drop.addOption( 'river' );

	tf.ASSERT_EQ( drop.dom.options.length, 2 );
	tf.ASSERT_EQ( drop.dom.selectedIndex, 0 );

	let field = new DropField( [obj, obj2], 'str', 'string', drop );

	// cleared because there are no values in the ranges
	// and a dropdown is not the right input element to use to for a value with an infinite range
	tf.ASSERT_EQ( drop.dom.options.length, 0 );
	tf.ASSERT_EQ( drop.dom.selectedIndex, -1 );
	tf.ASSERT_EQ( field['getDisplayValue'](), '' );

	// one object has a range
	obj.ranges['str'] = ['lake', 'river'];

	field.updateControl();

	tf.ASSERT_EQ( drop.dom.options.length, 2 );
	tf.ASSERT_EQ( drop.dom.selectedIndex, 0 );
	tf.ASSERT_EQ( field['getDisplayValue'](), 'lake' );
	tf.ASSERT_EQ( drop.dom.options[0].value, 'lake' );
	tf.ASSERT_EQ( drop.dom.options[1].value, 'river' );
	tf.ASSERT_EQ( obj.str, '' ); // field does not edit object values, even though they are out of range
	tf.ASSERT_EQ( obj2.str, '' );

	field['setDisplayValue']( 'lake' );
	drop.dom.onchange( null );
	field.updateControl();

	tf.ASSERT_EQ( obj.str, 'lake' );
	tf.ASSERT_EQ( obj2.str, 'lake' );

	// two objects have the same range
	obj.ranges['str'] = ['lake', 'river'];
	obj2.ranges['str'] = ['lake', 'river'];	

	field.updateControl();

	tf.ASSERT_EQ( drop.dom.options.length, 2 );
	tf.ASSERT_EQ( drop.dom.selectedIndex, 0 );		
	tf.ASSERT_EQ( field['getDisplayValue'](), 'lake' );
	tf.ASSERT_EQ( drop.dom.options[0].value, 'lake' );
	tf.ASSERT_EQ( drop.dom.options[1].value, 'river' );
	tf.ASSERT_EQ( obj.str, 'lake' );
	tf.ASSERT_EQ( obj2.str, 'lake' );

	// two objects have different values
	obj.str = 'lake';
	obj2.str = 'river';

	field.updateControl();

	tf.ASSERT_EQ( drop.dom.options.length, 2 );
	tf.ASSERT_EQ( drop.dom.selectedIndex, -1 );
	tf.ASSERT_EQ( field['getDisplayValue'](), '' );
	tf.ASSERT_EQ( drop.dom.options[0].value, 'lake' );
	tf.ASSERT_EQ( drop.dom.options[1].value, 'river' );
	tf.ASSERT_EQ( obj.str, 'lake' );
	tf.ASSERT_EQ( obj2.str, 'river' );

	// two objects have different range
	obj.str = 'lake';
	obj2.str = 'lake';

	obj.ranges['str'] = ['lake', 'river'];
	obj2.ranges['str'] = ['river'];

	field.updateControl();

	tf.ASSERT_EQ( drop.dom.options.length, 1 );
	tf.ASSERT_EQ( drop.dom.selectedIndex, -1 );
	tf.ASSERT_EQ( field['getDisplayValue'](), '' );
	tf.ASSERT_EQ( drop.dom.options[0].value, 'river' );
	tf.ASSERT_EQ( obj.str, 'lake' );
	tf.ASSERT_EQ( obj2.str, 'lake' );
}

tests.push( new Test( 'DropField',
					  test_DropField,
					  ['constructor',
					   'getDisplayValue',
					   'setDisplayValue',
					   'updateControl',
					   'Dropdown.constructor',
					   'Dropdown.addOption',
					   'Dropdown.select',
					   'Dropdown.selectNone',
					   'Dropdown.getSelectedOption',
					   'Dropdown.clear'] ) );

export default tests;