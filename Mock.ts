import { Dict } from './util.js'

class MockClassList {
	constructor() {}
	add() {}
	remove() {}
}

export class MockInputElement {
	classList = new MockClassList();

	value: string = '';
	checked: boolean = false;

	onchange: () => void = null;

	constructor() {}
}

export class MockOptionElement {
	classList = new MockClassList();

	innerHTML: string = '';
	value: string = '';
	disabled: boolean = false;

	constructor() {}
}

export class MockSelectElement {
	classList = new MockClassList();

	options: Array<MockOptionElement> = [];
	selectedIndex: number = 0;

	firstChild: MockOptionElement = null;

	onchange: () => void = null;

	constructor() {}

	dispatchEvent( e: Event ) {
		if ( e.type == 'change' ) {
			if ( this.onchange ) this.onchange();
		}
	}

	appendChild( child: MockOptionElement ) {
		if ( this.options.includes( child ) ) return;

		this.options.push( child );

		if ( this.selectedIndex < 0 ) this.selectedIndex = 0;
		if ( !this.firstChild ) this.firstChild = child;
	}

	removeChild( child: MockOptionElement ) {
		for ( let i = this.options.length; i >= 0; i-- ) {
			if ( this.options[i] == child ) {
				this.options.splice( i, 1 );
				
				if ( this.selectedIndex == i ) {
					this.selectedIndex -= 1;
				}
			}
		}

		if ( this.options.length > 0 ) {
			this.firstChild = this.options[0];
		} else {
			this.firstChild = null;
		}
	}
}