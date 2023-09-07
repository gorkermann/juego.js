////////////
// ENTITY //
////////////

/*
	One of the objects in the game world. Player, enemies, bosses, bullets, explosions, falling rocks, etc.
	
	
*/

import * as tp from './lib/toastpoint.js'

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

let SHAPE = {
	rect: 0,
	line: 1,
}

export function cullList( list: Array<any>, func: ( arg0: any ) => boolean=null ): Array<any> {
	let result: Array<any> = [];

	for ( let i = list.length - 1; i >= 0; i-- ) {
		if ( !func ) {
			if ( list[i].removeThis ) {
				result.push( list.splice( i, 1 ) );
			}
			
		} else {
			if ( func( list[i] ) ) {
				result.push( list.splice( i, 1 ) );
			}
		}
	}

	return result;
}

export class Entity {

	// position (top left corner of rectangle that defines entity bounds)
	pos: Vec2;
	center: Vec2 = new Vec2(0, 0);
	
	// velocity
	vel: Vec2 = new Vec2(0, 0);
	
	relPos: Vec2 = null;
	relAngle: number = 0;

	angle: number = 0.0;
	angleVel: number = 0.0;

	// Dimensions	
	width: number;
	height: number;

	collisionGroup: number = 0;
	collisionMask: number = 0x00; // only set for "intelligent" objects that handle collisions

	material: Material = new Material( 0, 0, 0 );

	faceDir = DIR.left; 	// Facing direction
	state: number = 0; 				// General-purpose state. Not all entities will use it
	
	// Collision flags. All entities have flags for collisions to the left, right, top, and bottom
	collideRight: boolean = false; 
	collideLeft: boolean = false;
	collideDown: boolean = false;
	collideUp: boolean = false;

	isGhost: boolean = false;		// ghost entities do not participate in collision detection
	isPlayer: boolean = false;		// Entity is controlled by a player
	removeThis: boolean = false;	// Removal flag. Entities with this flag set will be removed from the game

	fieldOfView: Region = null;		// Sight region
	
	spawned: Array<Entity> = []; // Queue of entities created by this one that will be added to the game. 
									// Bullets are a common example	

	// Mouse control flags
	mouseHover: boolean = false;
	mouseSelected: boolean = false;	

	// For overlap testing
	shape: number = SHAPE.rect;

	drawWireframe: boolean = false;

	saveFields: Array<string> = ['pos', 'vel', 'relPos', 'relAngle',
		'angle', 'angleVel', 'width', 'height', 'collisionGroup', 'collisionMask', 
		'material', 'isGhost'];

	constructor( pos: Vec2, width: number, height: number ) {
		this.pos = pos;
		
		this.angle = 0.0;

		// Dimensions	
		this.width = width;
		this.height = height;
	}

	init() {}

	toJSON( toaster: tp.Toaster ): any {
		let fields = this.saveFields;
		if ( fields.length == 0 ) fields = Object.keys( this );

		// never save these fields (which are lists of other fields)
		for ( let banned of ['editFields', 'saveFields'] ) {
			let index = fields.indexOf( banned );
			if ( index >= 0 ) fields.splice( index, 1 );
		}

		let flat: any = {};

		tp.setMultiJSON( flat, fields, this, toaster );

		return flat;
	}

	// don't override! override subDestructor instead
	destructor() {
		if ( this.removeThis ) return;

		this.removeThis = true;
		this.subDestructor();
	}

	// don't call except as super.subDestructor() inside an override
	protected subDestructor() {}

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

	getShapes( step: number ): Array<Shape> {
		let shape = Shape.makeRectangle( this.pos, this.width, this.height );
		let translate = this.pos.plus( new Vec2( this.width / 2, this.height / 2 ) );
		//shape.edges[0].material = 'red';
		//shape.edges[2].material = 'red';

		for ( let p of shape.points ) {
			p.sub( translate );
		}

		for ( let p of shape.points ) {
			p.rotate( this.angle + this.angleVel * step );
		}

		for ( let p of shape.points ) {
			p.add( translate );
			p.add( this.vel.times( step ) );
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
	spawnEntity( newEntity: Entity ): void {
		newEntity.collisionGroup = this.collisionGroup;
		newEntity.collisionMask = this.collisionMask;

		this.spawned.push( newEntity );
	}

	// Some other entity has overlapped this one, do something
	hitWith( otherEntity: Entity, contact: Contact ): void {}

	// Move, change state, spawn stuff
	update( step: number ): void {
		this.pos.add( this.vel.times( step ) );

		this.center = this.pos.plus( new Vec2( this.width / 2, this.height / 2 ) );

		this.angle += this.angleVel * step;
	}

	// Check if this entity's bounding rectangle overlaps another entity's bounding rectangle
	canOverlap ( otherEntity: Entity ) {
		return this != otherEntity && ( this.collisionMask & otherEntity.collisionGroup );
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
	overlaps ( otherEntity: Entity, step: number ): Contact | null {
		let shapes = this.getShapes( step );
		let otherShapes = otherEntity.getShapes( step );

		/*
			IDEAS

			use fastest moving of the contacts
			contact with normal most counter to object position (dot closest to -1)
			average normals to deal with spikes

			output multiple contacts for entities with multiple shapes
		 */

		let contact: Contact = null;

		for ( let shape of shapes ) {
			for ( let otherShape of otherShapes ) {
				for ( let edge of shape.edges ) {
					for ( let i = 0; i < otherShape.edges.length; i++ ) {
						let point = edge.intersects( otherShape.edges[i] );

						// The two objects' collision boxes overlap
						if ( point ) {

							let slice = shape.slice( otherShape.edges[i] );

							// velocity of the contact point
							let vel = otherShape.getVel( point );
	
							// velocity of the contact point projected onto the contact normal
							let nvel = otherShape.normals[i].times( vel.dot( otherShape.normals[i] ) );

							if ( !contact ) {
								contact = new Contact( point, otherShape.normals[i].copy() );
								contact.vel = nvel;
								contact.slice = slice;

							} else { 

								// a rotating object may create two contacts with different velocities
								if ( slice > contact.slice || 
									 ( Math.abs( slice - contact.slice ) < 0.01 && vel.lengthSq() > contact.vel.lengthSq() ) ) {
									contact = new Contact( point, otherShape.normals[i].copy() );
									contact.vel = nvel;
									contact.slice = slice;					
								}
							}
						}
					}
				}
			}
		}
		
		return contact;
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
		