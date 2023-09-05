////////////
// REGION //
////////////

/*
	An empty area that smart entities can use to check for collisions (like line-of-sight)
*/

import { Debug } from "./Debug.js"
import { Entity } from "./Entity.js"
import { Vec2 } from './Vec2.js'

export class Region extends Entity {
	containsPlayer: boolean = false;
	playerPos: Vec2 = new Vec2( 0, 0 );

	inAir: boolean = false;

	constructor( pos: Vec2, width: number, height: number ) {
		super( pos, width, height);

		this.material = null;
	}

	clearCollisionData(): void {
		this.inAir = true;
		this.containsPlayer = false;
	}

	hitWith( otherEntity: Entity ): void {
		if ( otherEntity.isPlayer ) {
			this.containsPlayer = true;
			this.playerPos = otherEntity.pos.copy();
		}
	}

	draw( context: CanvasRenderingContext2D ) {
		if ( Debug.LOG_COLLISION ) {
			context.fillStyle = "yellow";
			if ( this.containsPlayer ) context.fillStyle = "red";
			if ( this.inAir ) context.fillStyle = "green";
			context.globalAlpha = 0.3;
			context.fillRect( this.pos.x, this.pos.y, this.width, this.height );
			context.globalAlpha = 1.0;
		}
	}
}