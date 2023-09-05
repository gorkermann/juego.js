import { Entity } from "./Entity.js"
import { ScrollBox } from "./ScrollBox.js"
import { Vec2 } from './Vec2.js'

///////////
// SCENE //
///////////

/*
	Parent class for cutscenes and levels
*/

export class Scene {
	name: string = "";
	isLoaded: boolean = false;

	constructor( name: string ) {
		this.name = name;
	}

	load(): Promise<any> {
		// dummy load function

		let _this: Scene = this;

		return new Promise( function(resolve, reject) {
			_this.isLoaded = true;

			resolve(0);
		});
	}

	wake(): void {}

	sleep(): void {}

	reset() {}

	update() {}

	updateCursor( pos: Vec2 ) {}

	draw( context: CanvasRenderingContext2D ) {}
}