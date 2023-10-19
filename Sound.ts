///////////
// SOUND //
///////////

import * as tp from './lib/toastpoint.js'

import { Vec2 } from './Vec2.js'

type SoundOptions = {
	loop?: boolean
	count?: number
	distScale?: number
}

export class Sound {
	filename: string;

	audio: HTMLAudioElement;

	pos: Vec2;
	count: number;
	distScale: number;

	constructor( filename: string, pos: Vec2=null, options: SoundOptions={} ) {
		if ( options.loop === undefined ) options.loop = false;
		if ( options.count === undefined ) options.count = 1;
		if ( options.distScale === undefined ) options.distScale = 10000;

		this.filename = filename;
		this.audio = new Audio( filename );
		this.audio.loop = options.loop;

		this.pos = pos;
		this.count = options.count;
		this.distScale = options.distScale;
	}

	toToast( toaster: tp.Toaster ): any {
		let fields = Object.keys( this );

		let exclude = ['audio'];
		fields = fields.filter( x => !exclude.includes( x ) );

		let flat: any = {};

		tp.setMultiJSON( flat, fields, this, toaster );

		return flat;
	}

	play(): void {
		this.audio.currentTime = 0;
		this.audio.play();
		this.audio.loop = false;
	}

	pause(): void {
		this.audio.pause();
	}

	loop(): void {
		this.audio.play();
		this.audio.loop = true;
	}
}