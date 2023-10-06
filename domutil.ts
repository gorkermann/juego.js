import path from 'path'
import { MockOptionElement } from './test/Mock.js'

type Dict<Type> = { [key: string]: Type };
type HTMLAttrVal = string | boolean;

export let RE_DATA_URI_TYPE = /^data:(.+);.*/

export function create( tag: string, 
						options: Dict<HTMLAttrVal>={}, 
						parent?: HTMLElement ): HTMLElement
{
	let elem: HTMLElement;

	if ( typeof document !== 'undefined' ) {
		elem = document.createElement( tag );
		
	} else {
		if ( tag == 'option' ) {
			elem = new MockOptionElement() as any as HTMLElement;
		} else {
			throw new Error( 'create: unsupported mock tag ' + tag ); 
		}
	}

	for ( let key in options ) {
		( elem as any )[key] = options[key];
	}

	if ( parent ) {
		parent.appendChild( elem );
	}

	return elem;
}

export function clear( elem: HTMLElement ) {
	while ( elem.firstChild ) {
		elem.removeChild( elem.firstChild );
	}
}

export function appendButton( parent: HTMLElement, innerHTML: string, onclick: ( e: Event ) => void ): HTMLButtonElement {
	let button = document.createElement( 'button' );
	button.innerHTML = innerHTML;
	button.onclick = onclick;
	parent.appendChild( button );

	return button;			
}

export function formatGetParams( params: { [key: string]: string } ): string {
	let strs = [];
	
    for ( let key in params ) {
        strs.push( key + '=' + params[key] )
    }
    
    return strs.join( '&' );
}

export function updateLocation( str: string ) {
	str = str.trim();

	if ( window.location.search != str ) {
		history.pushState( null, '', str );	
	}
}

export function findGetParam( paramName: string ): string {
	let result: string = null;
	let tmp = [];

	location.search
		.substr(1)
		.split("&")
		.forEach(function (item) {
		  tmp = item.split("=");
		  if (tmp[0] === paramName) result = decodeURIComponent(tmp[1]);
		});
		
	return result;
}

type WkLocation = {
	workspace: string;
	dirname: string;
	basename: string;
}

export function getTreeLocation(): WkLocation {
	let name = 'tool';
	//let index = location.href.search( name );
	let result: WkLocation = { workspace: null, dirname: null, basename: null };

	result.workspace = findGetParam( 'ws' );
	result.dirname = findGetParam( 'dirname' ) || '/';
	result.basename = findGetParam( 'basename' ) || '';

	/*
	if ( index >= 0 ) {
		let str = location.href.slice( index + name.length );
		if ( str == '' || str[0] != '/' ) str = '/' + str;

		result.workspace = str.split( '/' )[1]; // [0] is empty, [1] is workspace name
		
		let subpath = '/' + str.split( '/' ).slice(2).join( '/' ); // [2] and on is file path
		result.dirname = path.posix.dirname( subpath );
		result.basename = path.posix.basename( subpath );
	}*/

	return result;
}

export function createTooltip( text: string ): HTMLElement {
	let div = document.createElement( 'div' );
	div.classList.add( 'tooltip-container' );
	
	let child = document.createElement( 'span' );
	child.classList.add( 'tooltip' );
	child.style.display = 'none';
	child.innerHTML = text;		   

	let timeoutId = setTimeout( function() { 
		child.style.display = 'inline-block';
	}, 500 );

	div.appendChild( child );

	return div;
}

export function download( obj: any, filename: string ) {
	let url = URL.createObjectURL( obj );

	let link = document.createElement( 'a' );
	link.setAttribute( 'download', filename );
	link.href = url;

	document.body.appendChild( link );
	link.click();
	document.body.removeChild( link );
}