///////////
// SOUND //
///////////

class Sound {

	audio: HTMLAudioElement;

	constructor( filename: string ) {
		this.audio = new Audio( filename );
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