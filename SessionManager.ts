import { Mouse } from './Mouse.js'
import { Scene } from './Scene.js'

export class SessionManager {
	currentScene: Scene = null;
	sceneList: Array<Scene> = [];

	mouse = new Mouse();

	constructor() {
		let _this: SessionManager = this;
	}

	useCanvas( canvas: HTMLCanvasElement ) {
		canvas.onmousemove = ( e ) => {
			this.mouse.moveHandler( e );

			this.updateCursor();
		}
	}

	loadScene( newScene: Scene ) {
		if ( this.currentScene !== null ) {
			this.currentScene.sleep();
		}

		this.sceneList.push( newScene );
		this.currentScene = newScene;

		console.log( 'loading scene ' + this.currentScene.name );
		this.currentScene.load();
	}

	update() {
		this.currentScene.update();
	}

	updateCursor() {
		this.currentScene.updateCursor( this.mouse.pos );
	}

	draw( context: CanvasRenderingContext2D ) {
		this.currentScene.draw( context );
	}
}