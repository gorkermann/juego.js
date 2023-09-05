////////////
// ENTITY //
////////////

/*
	One of the objects in the game world. Player, enemies, bosses, bullets, explosions, falling rocks, etc.
	
	
*/

import { Vec2 } from './Vec2.js'
import { Line } from './Line.js'
import { Material } from './Material.js'

import { Contact } from './Contact.js'
import { Region } from './Region.js'
import { Debug } from './Debug.js'

import { Shape } from './Shape.js'

let LOG_COLLISION = false;

let DIR = {
	left: { X: -1, Y: 0 },
	right: { X: 1, Y: 0 },
	down: { X: 0, Y: 1 },
	up: { X: 0, Y: -1 },
};

/* Collision Groups
 * 
 * If two entities' collision groups are the same, and they are not None, they will not register collisions with each other.
 * Otherwise, they will. 
 * This is mainly used for bullets, bullets one ship shoots can't hurt that ship or its friends
 * 
 */
let GROUP = {
	none: 0,
	player: 1,
	enemy: 2
}

let SHAPE = {
	rect: 0,
	line: 1,
}

export class Entity {

	// position (top left corner of rectangle that defines entity bounds)
	pos: Vec2;
	center: Vec2;
	
	// velocity
	vel: Vec2 = new Vec2(0, 0);
	
	relPos: Vec2 = null;
	relAngle: number = 0;

	angle: number = 0.0;
	angleVel: number = 0.0;

	// Dimensions	
	width: number;
	height: number;

	collisionGroup: number = GROUP.none; // Entities with the same collision group can't hit each other

	faceDir = DIR.left; 	// Facing direction
	state: number = 0; 				// General-purpose state letiable. Not all entities will use it
	
	// Collision flags. All entities have flags for collisions to the left, right, top, and bottom
	collideRight: boolean = false; 
	collideLeft: boolean = false;
	collideDown: boolean = false;
	collideUp: boolean = false;

	isGhost: boolean = false;		// ghost entities do not participate in collision detection
	isPlayer: boolean = false;		// Entity is controlled by a player
	removeThis: boolean = false;	// Removal flag. Entities with this flag set will be removed from the game

	fieldOfView: Region = null;		// Sight region
	
	spawnQueue: Array<Entity> = []; // Queue of entities created by this one that will be added to the game. 
									// Bullets are a common example	
	spawnTarget = this.spawnQueue;	// Where to send spawned entities. Usually this is to the spawn queue
	
	// Mouse control flags
	mouseHover: boolean = false;
	mouseSelected: boolean = false;	

	// For overlap testing
	shape: number = SHAPE.rect;

	material: Material = new Material( 0, 0, 0 );
	drawWireframe: boolean = false;

	constructor( pos: Vec2, width: number, height: number ) {
		this.pos = pos;
		
		this.angle = 0.0;

		// Dimensions	
		this.width = width;
		this.height = height;
	}

	// Resets collision flags
	clearCollisionData(): void {
		this.collideRight = false;
		this.collideLeft = false;
		this.collideDown = false;
		this.collideUp = false;	
	}

	// Sets velocity to zero
	clearVel(): void {
		this.vel.setValues(0, 0);
	}

	getShapes(): Array<Shape> {
		let shape = Shape.makeRectangle( this.pos, this.width, this.height );
		let translate = this.pos.plus( new Vec2( this.width / 2, this.height / 2 ) );
		//shape.edges[0].material = 'red';
		//shape.edges[2].material = 'red';

		for ( let p of shape.points ) {
			p.sub( translate );
		}

		for ( let p of shape.points ) {
			p.rotate( this.angle );
		}

		for ( let p of shape.points ) {
			p.add( translate );
		}

		shape.material = this.material;
		shape.parent = this;

		return [shape];
	}

	// Turn to face left if facing right, turn to face right if facing left
	turnAround(): void {
		if (this.faceDir == DIR.left) this.faceDir = DIR.right;
		else if (this.faceDir == DIR.right) this.faceDir = DIR.left;

		if ( this.faceDir == DIR.up ) this.faceDir = DIR.down;
		else if ( this.faceDir == DIR.down ) this.faceDir = DIR.up;
	}		

	faceTowards( otherEntity: Entity ): void {
		if ( otherEntity.pos.x < this.pos.x ) this.faceDir = DIR.left;
		else this.faceDir = DIR.right;
	}

	// Add an entity to the spawn queue. It will later be added to the game
	spawnEntity( otherEntity: Entity ): void {
		otherEntity.collisionGroup = this.collisionGroup;
		this.spawnTarget.push( otherEntity );
	}

	// Check if this has spawned any entities
	hasSpawnedEntities(): boolean {
		return (this.spawnQueue.length > 0);
	}

	// Extract a spawned entity from the queue
	getSpawnedEntity(): Entity {
		return this.spawnQueue.pop();
	}

	// Send spawned entities somewhere else
	redirectSpawnedEntities( whereTo: Array<Entity> ): void  {
		this.spawnTarget = whereTo;
	}

	// Some other entity has overlapped this one, do something
	hitWith( otherEntity: Entity ): void { }

	// Move, change state, spawn stuff
	update(): void {
		this.pos.add( this.vel );

		this.center = this.pos.plus( new Vec2( this.width / 2, this.height / 2 ) );

		this.angle += this.angleVel;
	}

	// Check if this entity's bounding rectangle overlaps another entity's bounding rectangle
	canOverlap ( otherEntity: Entity ) {
		return ( this != otherEntity &&
				 !this.isGhost && 
				 !otherEntity.isGhost &&
			 	 ( ( this.collisionGroup == GROUP.none ) || 
			 	   ( otherEntity.collisionGroup == GROUP.none ) || 
			 	   ( this.collisionGroup != otherEntity.collisionGroup ) ) );
	}

	/*overlaps ( otherEntity: Entity ) {
		// Two upright rectangles
		if ( this.shape == SHAPE.rect && otherEntity.shape == SHAPE.rect ) {
			let left1 = this.pos.x + this.vel.x;
			let left2 = otherEntity.pos.x + ( otherEntity.vel.x < 0 ? otherEntity.vel.x : 0 );
			let right1 = left1 + this.width + this.vel.x;
			let right2 = left2 + otherEntity.width + ( otherEntity.vel.x > 0 ? otherEntity.vel.x : 0 );
			let top1 = this.pos.y + this.vel.y;
			let top2 = otherEntity.pos.y + ( otherEntity.vel.y < 0 ? otherEntity.vel.y : 0 );
			let bottom1 = top1 + this.height + this.vel.y;
			let bottom2 = top2 + otherEntity.height + ( otherEntity.vel.y > 0 ? otherEntity.vel.y : 0 );
			
			if ((bottom1 > top2) &&
				(top1 < bottom2) &&
				(right1 > left2) &&
				(left1 < right2)) { 
			
				// The two objects' collision boxes overlap
				return true;
			}
		// Rectangle and a line	
		} else if ( this.shape == SHAPE.rect && otherEntity.shape == SHAPE.line ) {
			return false;//this.rectOverlapsLine( otherEntity );
		} else if ( this.shape == SHAPE.line && otherEntity.shape == SHAPE.rect ) { 
			return false;//otherEntity.rectOverlapsLine( this );
		}
		
		// The two objects' collision boxes do not overlap
		return false;
	}*/
	overlaps ( otherEntity: Entity ): Contact | null {
		let shapes = this.getShapes();
		let otherShapes = otherEntity.getShapes();

		let result = null;

		for ( let shape of shapes ) {
			for ( let otherShape of otherShapes ) {
				for ( let edge of shape.edges ) {
					for ( let i = 0; i < otherShape.edges.length; i++ ) {
						let point = edge.intersects( otherShape.edges[i] );

						// The two objects' collision boxes overlap
						if ( point ) {
							let contact = new Contact( point, otherShape.normals[i] );
							contact.vel = otherShape.getVel( point );

							if ( !result || contact.vel.lengthSq() > result.vel.lengthSq() ) {
								result = contact;
							} 
						}
					}
				}
			}
		}

		// The two objects' collision boxes do not overlap
		return result;
	}

	/*
		rectOverlapsLine()
		Does this rect overlap a line?
	*/
	rectOverlapsLine( line: Line ) {
		var leftLine = new Line( this.pos.x, this.pos.y, this.pos.x, this.pos.y + this.height);
		var rightLine = new Line( this.pos.x + this.width, this.pos.y, this.pos.x + this.width, this.pos.y + this.height);
		var topLine = new Line( this.pos.x, this.pos.y, this.pos.x + this.width, this.pos.y); 
		var bottomLine = new Line( this.pos.x, this.pos.y + this.height, this.pos.x + this.width, this.pos.y + this.height);

		if ( leftLine.intersects( line ) != null || 
			 rightLine.intersects( line ) != null ||
			 topLine.intersects( line ) != null ||
			 bottomLine.intersects( line ) != null ) {
			return true;
		}

		return false;
	}

	/*
		angleOverlaps()
		Does the caller overlap another angled Entity?
	
		otherEntity: another Entity
	*/	
	angleOverlaps( otherEntity: Entity ): boolean {
		if ( this.containedBy( otherEntity ) || otherEntity.containedBy( this ) ) {
			return true;
		}

		return false;
	}

	/*
		containedBy()
		Does one Entity contain any of the corners of the caller?

		otherEntity: another Entity
	*/
	containedBy( otherEntity: Entity ): boolean {
		let topLeft = ( new Vec2( 0, 0 ) ).rotate( this.angle ).add( this.pos );
		let topRight = ( new Vec2( this.width, 0 ) ).rotate( this.angle ).add( this.pos );
		let bottomLeft = ( new Vec2( 0, this.height ) ).rotate( this.angle ).add( this.pos );
		let bottomRight = ( new Vec2( this.width, this.height ) ).rotate( this.angle ).add( this.pos );

		if ( otherEntity.containsPoint( topLeft ) ||
			 otherEntity.containsPoint( topRight ) ||
			 otherEntity.containsPoint( bottomLeft ) ||
			 otherEntity.containsPoint( bottomRight ) ) {
			return true;
		}

		return false;
	}

	/*
		containsPoint()
		Does the caller contain a particular point?

		point: the point to check
	*/
	containsPoint( point: Vec2 ): boolean {
		let p = point.minus( this.pos );
		p.rotate( -this.angle ); // Why
		p.add( this.pos );

		if ( p.x >= this.pos.x && p.x <= this.pos.x + this.width &&
			 p.y >= this.pos.y && p.y <= this.pos.y + this.height ) {
			return true;
		}

		return false;
	}

	/*
		collide*()

		handlers for wall hits
	*/
	onCollideLeft() {
		this.vel.x = 0;
		this.collideLeft = true;
	}

	onCollideRight() {
		this.vel.x = 0;
		this.collideRight = true;
	}

	onCollideUp() {
		this.vel.y = 0;
		this.collideUp = true;
	}

	onCollideDown() {
		this.vel.y = 0;
		this.collideDown = true;
	}


	/*
		collideWith()
		Check if two Entities collide and correct any overlap
		Caller is Entity 1

		staticEntity: some Entity without velocity, aka Entity 2
	*/
	collideWith( staticEntity: Entity ): void {
		let left1: number = this.pos.x;
		let left2: number = staticEntity.pos.x;
		let right1: number = this.pos.x + this.width;
		let right2: number = staticEntity.pos.x + staticEntity.width;
		let top1: number = this.pos.y;
		let top2: number = staticEntity.pos.y;
		let bottom1: number = this.pos.y + this.height;
		let bottom2: number = staticEntity.pos.y + staticEntity.height;
		
		let collisionOccurred: boolean = false;

		let bottom: boolean = bottom1 + this.vel.y > top2;
		let top: boolean = top1 + this.vel.y < bottom2;
		let right: boolean = right1 + this.vel.x > left2;
		let left: boolean = left1 + this.vel.x < right2;

		if ( bottom && top && left && right ) {
			if ( bottom1 <= top2 ) {
				this.onCollideDown();
				this.pos.y = top2 - this.height;
				collisionOccurred = true;
		
			} else if ( top1 >= bottom2 ) {
				this.onCollideUp();
				this.pos.y = bottom2;
				collisionOccurred = true;

			} else if ( right1 <= left2 ) {
				this.onCollideRight();
				this.pos.x = left2 - this.width;
				collisionOccurred = true;

			} else if ( left1 >= right2 ) {
				this.onCollideLeft();
				this.pos.x = right2;
				collisionOccurred = true;
			} else {
				// if none of the above are true, then the Entities overlap
			}
		}

		if ( !collisionOccurred ) {

			// probe vertically
			if ( this.vel.y == 0 ) {
				if ( top && left && right && bottom1 + 1 > top2 ) {
					this.onCollideDown();
					this.pos.y = top2 - this.height;
				}

				if ( bottom && left && right && top1 - 1 < bottom2 ) {
					this.onCollideUp();
					this.pos.y = bottom2;
				}
			}

			// probe horizontally
			if ( this.vel.x == 0 ) {
				if ( bottom && top && left && right1 + 1 > left2 ) {
					this.onCollideRight();
					this.pos.x = left2 - this.width;
				}

				if ( bottom && top && right && left1 - 1 < right2 ) {
					this.onCollideLeft();
					this.pos.x = right2;
				}
			}
		}
	}

	/*
		draw()
		draw the caller
	
		context - an HTML5 2D drawing context
	*/
	draw( context: CanvasRenderingContext2D ) {
		context.fillStyle = this.material.getFillStyle();

		context.save();
			
			//context.fillStyle = "black";
			//context.font = "bold 20px arial";
			//context.fillText( this.state, this.pos.x, this.pos.y );

			context.translate( this.pos.x + this.width / 2, this.pos.y + this.height / 2 );
			context.rotate( this.angle );
			context.fillRect( -this.width / 2, -this.height / 2, this.width, this.height );
			//context.fillRect( this.pos.x, this.pos.y, this.width, this.height );
			//this.drawCollisionBox( context );
		context.restore();
	}

	/*
		drawCollisionBox()
		Draw this entity's bounding rectangle
	
		context: an HTML5 2D drawing context to draw with
	*/
	drawCollisionBox( context: CanvasRenderingContext2D ) {
		if ( Debug.LOG_COLLISION ) {
		
			// Collision Box
			context.fillStyle = "gray";
			if ( this.mouseHover ) context.fillStyle = "red";
			if ( this.mouseSelected ) context.fillStyle = "green";
			context.globalAlpha = 0.6;
			context.fillRect( this.pos.x, this.pos.y, this.width, this.height );

			//  Rectangles to indicate collision
			context.fillStyle = "black";

			if ( this.collideDown ) { 
				context.fillRect(this.pos.x + this.width / 4, this.pos.y + this.height * 3 / 4,
								 this.width / 2, this.height / 4);
			}
			if ( this.collideUp ) { 
				context.fillRect(this.pos.x + this.width / 4, this.pos.y, 
								 this.width / 2, this.height / 4);
			}
			if ( this.collideLeft ) { 
				context.fillRect(this.pos.x, this.pos.y + this.height / 4,
								 this.width / 4, this.height / 2);
			}
			if ( this.collideRight ) { 
				context.fillRect(this.pos.x + this.width * 3 / 4,
								 this.pos.y + this.height / 4, this.width / 4, this.height / 2);
			}

			context.globalAlpha = 1.0;
		}
	}

	onClick() {
		// empty	
	}
}
		