import { Mouse } from './Mouse.js'
import { Scene } from './Scene.js'

export class SessionManager {
	currentScene: Scene = null;
	sceneList: Array<Scene> = [];

	mouse = new Mouse();

	constructor() {
		let _this: SessionManager = this;

		/*document.addEventListener( "transition", function( e: any ) {
			if ( e.detail === null ) {
				_this.sceneList.pop();
				_this.loadScene( _this.sceneList[ _this.sceneList.length - 1 ] );
			} else {
				_this.loadScene( e.detail );	
			}
		} );*/
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

		//if ( !this.currentScene.isLoaded ) {
			this.currentScene.load();
			this.beginScene();
		//} else {
		//	this.beginScene();
		//}
	}

	beginScene() {
		console.log( "beginning scene " + this.currentScene.name );

		this.currentScene.wake();
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