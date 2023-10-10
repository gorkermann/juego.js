////////////
// ENTITY //
////////////

/*
	One of the objects in the game world. Player, enemies, bosses, bullets, explosions, falling rocks, etc.
	
	
*/

import * as tp from './lib/toastpoint.js'

import { Anim } from './Anim.js'
import { rangeEdit, Range } from './Editable.js'
import { Vec2 } from './Vec2.js'
import { Line } from './Line.js'
import { Material } from './Material.js'
import { Contact } from './Contact.js'
import { Region } from './Region.js'
import { Debug } from './Debug.js'
import { Shape } from './Shape.js'
import { Dict } from './util.js'

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

type ApplyTransformOptions = {
	angleOnly?: boolean,
	local?: boolean
}

export enum TransformOrder {
	TRANSLATE_THEN_ROTATE = 0,
	ROTATE_THEN_TRANSLATE
}

export class Entity {
	parent: Entity = null;
	_subs: Array<Entity> = [];

	// relative to parent if parent set (position is applied before rotation)
	pos: Vec2 = new Vec2();
	vel: Vec2 = new Vec2();
	angle: number = 0.0;
	angleVel: number = 0.0;	

	noAdvance: boolean = false; // don't update position internally
	transformOrder: TransformOrder = TransformOrder.TRANSLATE_THEN_ROTATE;

	// Dimensions	
	width: number;
	height: number;

	isGhost: boolean = false; // don't generate shapes for ghosts (don't draw or collide)
	collisionGroup: number = 0; 

	// Entity accepts collisions from these groups
	// only set for "intelligent" entities that handle collisions
	collisionMask: number = 0x00; 
	isPliant: boolean = false;

	material: Material = new Material( 0, 0, 0 );
	
	// Collision flags. All entities have flags for collisions to the left, right, top, and bottom
	collideRight: boolean = false; 
	collideLeft: boolean = false;
	collideDown: boolean = false;
	collideUp: boolean = false;

	isPlayer: boolean = false;		// Entity is controlled by a player
	removeThis: boolean = false;	// Removal flag. Entities with this flag set will be removed from the game

	fieldOfView: Region = null;		// Sight region
	
	spawned: Array<Entity> = []; // Queue of entities created by this one that will be added to the game 
								 // Bullets are a common example

	/* fields from Selectable */

	hovered: boolean = false;
	preselected: boolean = false;
	selected: boolean = false;

	/* fields from Editable */

	edit: ( varname: string, value: any ) => void = rangeEdit;
	editFields: Array<string> = ['parent', 'pos', 'angle', '_subs'];
	ranges: Dict<Range> = {};

	savedVals: Dict<any> = {};

	drawWireframe: boolean = false;

	name: string = 'entity';
	flavorName: string = 'ENTITY';
	className: string = 'Entity';

	anim: Anim = null;

	discardFields: Array<string> = ['mouseHover', 'mouseSelected',
		'collideRight', 'collideLeft', 'collideDown', 'collideUp',
		'edit'];

	/*saveFields: Array<string> = ['pos', 'vel',
		'angle', 'angleVel', 'width', 'height', 'collisionGroup', 'collisionMask', 
		'material', 'isGhost'];*/

	constructor( pos: Vec2, width: number, height: number ) {
		this.pos = pos;
		
		this.angle = 0.0;

		// Dimensions	
		this.width = width;
		this.height = height;
	}

	init() {}

	toJSON( toaster: tp.Toaster ): any {
		let fields = Object.keys( this );

		// never save these fields (which are lists of other fields)
		let exclude = ['editFields', 'saveFields', 'discardFields'];

		exclude = exclude.concat( this.discardFields );
		fields = fields.filter( x => !exclude.includes( x ) );		

		let flat: any = {};

		tp.setMultiJSON( flat, fields, this, toaster );

		return flat;
	}

	// don't override! override subDestructor instead
	destructor() {
		if ( this.removeThis ) return;

		this.removeThis = true;
		this._subDestructor();
	}

	// don't call except as super._subDestructor() inside an override
	protected _subDestructor() {}

	// Resets collision flags
	clearCollisionData(): void {
		this.collideRight = false;
		this.collideLeft = false;
		this.collideDown = false;
		this.collideUp = false;	
	}

	addSub( entity: Entity ) {
		if ( entity.parent ) {
			throw new Error( 'Entity.addSub: ' + this.constructor.name + ' already has parent ' + entity.parent.constructor.name );
		}

		if ( !this._subs.includes( entity ) ) {
			this._subs.push( entity );
		}

		entity.parent = this;
	}

	getSubs(): Array<Entity> {
		return this._subs;
	}

	cull() {
		for ( let sub of this.getSubs() ) {
			sub.cull();
		}

		cullList( this._subs );
	}

	advance( step: number ) {
		if ( !this.noAdvance ) {
			this.pos.add( this.vel.times( step ) );
			this.angle += this.angleVel * step;
		}

		for ( let sub of this.getSubs() ) {
			sub.advance( step );
		}
	}

	animate( step: number, elapsed: number ) {
		if ( this.anim ) {
			this.anim.update( step, elapsed );
		}
	}

	_animateRecur( step: number, elapsed: number ) {
		this.animate( step, elapsed );

		for ( let sub of this.getSubs() ) {
			sub._animateRecur( step, elapsed );
		}
	}

	update() {}

	_updateRecur() {
		this.update();

		for ( let sub of this.getSubs() ) {
			sub._updateRecur();
		}
	}

	getOwnShapes(): Array<Shape> {
		if ( this.isGhost ) return [];

		let shape = Shape.makeRectangle( 
				new Vec2( -this.width / 2, -this.height / 2), this.width, this.height );

		shape.material = this.material;
		shape.parent = this;

		return [shape];
	}

	// don't override! override getOwnShapes instead
	getShapes( step: number=0.0 ): Array<Shape> {
		let shapes: Array<Shape> = [];

		shapes = this.getOwnShapes();

		for ( let sub of this.getSubs() ) {
			shapes.push( ...sub.getShapes( step ) );
		}

		for ( let shape of shapes ) {
			for ( let p of shape.points ) {
				this.applyTransform( p, step, { local: true } );
			}

			for ( let n of shape.normals ) {
				this.applyTransform( n, step, { local: true, angleOnly: true } );
			}
		}

		return shapes;
	}

	// Add an entity to the spawn queue. It will later be added to the game
	spawnEntity( newEntity: Entity ): void {
		newEntity.collisionGroup = this.collisionGroup;
		newEntity.collisionMask = this.collisionMask;

		this.spawned.push( newEntity );
	}

	applyTransform( p: Vec2, step: number=0.0, options: ApplyTransformOptions={} ): Vec2 {
		if ( p == this.pos ) {
			throw new Error( 'Entity.applyTransform: Attempting to transform entity\'s own position' );
		}

		if ( p == this.vel ) {
			throw new Error( 'Entity.applyTransform: Attempting to transform entity\'s own velocity' );
		}

		if ( this.parent ) {
			if ( this.transformOrder == TransformOrder.ROTATE_THEN_TRANSLATE ) {
				p.rotate( this.angle + this.angleVel * step );
			}

			if ( !options.angleOnly ) {
				p.add( this.pos );
				p.add( this.vel.times( step ) );
			}

			if ( this.transformOrder == TransformOrder.TRANSLATE_THEN_ROTATE ) {
				p.rotate( this.angle + this.angleVel * step );
			}

			if ( !options.local && this.parent ) this.parent.applyTransform( p, step, options );

		} else {
			p.rotate( this.angle + this.angleVel * step );
			if ( !options.angleOnly ) {
				p.add( this.pos );
				p.add( this.vel.times( step ) );
			}
		}

		return p;
	}

	unapplyTransform( p: Vec2, step: number=0.0, options: ApplyTransformOptions={} ): Vec2 {
		if ( p == this.pos ) {
			throw new Error( 'Entity.unapplyTransform: Attempting to transform entity\'s own position' );
		}

		if ( p == this.vel ) {
			throw new Error( 'Entity.unapplyTransform: Attempting to transform entity\'s own velocity' );
		}

		if ( this.parent ) {
			this.parent.unapplyTransform( p, step, options );

			if ( this.transformOrder == TransformOrder.TRANSLATE_THEN_ROTATE ) {
				p.rotate( -this.angle - this.angleVel * step );
			}

			if ( !options.angleOnly ) {
				p.sub( this.pos );
				p.sub( this.vel.times( step ) );
			}

			if ( this.transformOrder == TransformOrder.ROTATE_THEN_TRANSLATE ) {
				p.rotate( -this.angle - this.angleVel * step );
			}

		} else {
			if ( !options.angleOnly ) {
				p.sub( this.pos );
				p.sub( this.vel.times( step ) );
			}
			p.rotate( -this.angle - this.angleVel * step );
		}

		return p;
	}

	hitWithMultiple( otherEntity: Entity, contacts: Array<Contact> ): void {
		let rootsHit = false;

		if ( contacts.length > 0 ) {
			for ( let contact of contacts ) {
				if ( contact.sub == this && contact.otherSub == otherEntity ) {
					if ( !rootsHit ) {
						rootsHit = true;
					} else {
						continue;
					}
				}
				
				this.hitWith( contact.otherSub, contact );
			}
		}
	}

	// Some other entity has overlapped this one, do something
	hitWith( otherEntity: Entity, contact: Contact ): void {}

	watch( pos: Vec2 ): void {}

	treeCollisionGroup(): number {
		let result = this.collisionGroup;

		for ( let sub of this.getSubs() ) {
			result |= sub.treeCollisionGroup();
		}

		return result;
	}

	treeCollisionMask(): number {
		let result = this.collisionMask;

		for ( let sub of this.getSubs() ) {
			result |= sub.treeCollisionMask();
		}

		return result;
	}

	// Check if this entity's bounding rectangle overlaps another entity's bounding rectangle
	canBeHitBy ( otherEntity: Entity ): boolean {
		return this != otherEntity && ( this.collisionMask & otherEntity.collisionGroup ) > 0;
	}

	overlaps ( otherEntity: Entity, step: number ): Array<Contact> {
		let shapes = this.getShapes( step );
		let otherShapes = otherEntity.getShapes( step );

		/*
			IDEAS

			use fastest moving of the contacts
			contact with normal most counter to object position (dot closest to -1)
			average normals to deal with spikes

			output multiple contacts for entities with multiple shapes
		 */

		let contacts: Array<Contact> = [];

		for ( let shape of shapes ) {
			for ( let otherShape of otherShapes ) {
				let contact = null;
				let maxScore = 0;

				let sub = shape.parent;
				if ( !sub.collisionGroup ) sub = this;

				let otherSub = otherShape.parent;
				if ( !otherSub.collisionGroup ) otherSub = otherEntity;

				if ( !sub.canBeHitBy( otherSub ) ) continue;

				contact = shape.getEdgeContact( otherShape );

				if ( contact ) {
					contact.sub = sub;
					contact.otherSub = otherSub;
					contacts.push( contact );
				}
			}
		}
		
		return contacts;
	}

	/* editor */

	hover( p: Vec2 ): Array<Entity> { 
		let output = [];

		for ( let shape of this.getShapes() ) {
			if ( shape.contains( p, 0.0, false ) ) {
				output.push( shape.parent );
			}
		}

		return output;
	}

	select() {}

	unselect() {
		this.selected = false;

		for ( let sub of this.getSubs() ) {
			sub.unselect();
		}
	}

	startDrag() {
		this.savedVals['pos'] = this.pos.copy();
	}

	drag( offset: Vec2 ) {
		let localOffset = offset.copy();

		if ( this.parent ) {
			this.parent.unapplyTransform( localOffset, 0.0, { angleOnly: true } );
		}

		this.pos.set( this.savedVals['pos'].plus( localOffset ) );
	}

	endDrag( accept: boolean ) {
		if ( accept ) {
			// this.p is already set in drag()
		} else {
			this.pos.set( this.savedVals['pos'] );
		}

		delete this.savedVals['pos'];
	}

	/* drawing */ 

	shade() {
		for ( let sub of this.getSubs() ) {
			sub.shade();
		}
	}

	/*
		draw()
		draw the caller
	
		context - an HTML5 2D drawing context
	*/
	draw( context: CanvasRenderingContext2D ) {
		let shapes = this.getShapes( 0.0 );

		for ( let shape of shapes ) {
			context.lineWidth = 1;

			if ( this.drawWireframe ) {
				shape.stroke( context );
			} else {
				shape.fill( context );
			}
		}

		context.strokeStyle = 'white';
		
		for ( let shape of shapes ) {
			if ( shape.parent.selected ) {
				context.lineWidth = 4;
				context.globalAlpha = 0.3;
				shape.basicStroke( context );

			} else if ( shape.parent.hovered ) {
				context.lineWidth = 2;
				context.globalAlpha = 0.3;
				shape.basicStroke( context );	
			}
		}
		
		context.globalAlpha = 1.0;
	}
}

/*
	TopLeftEntity

	Entity, but drawn from the top left corner with no rotation
 */
export class TopLeftEntity extends Entity {
	constructor( pos: Vec2, width: number, height: number ) {
		super( pos, width, height );
	}

	getOwnShapes(): Array<Shape> {
		let shape = Shape.makeRectangle( new Vec2(), this.width, this.height );

		shape.material = this.material;
		shape.parent = this;

		return [shape];
	}

	applyTransform( p: Vec2, step: number=0.0, options: ApplyTransformOptions={} ): Vec2 {
		if ( !options.angleOnly ) {
			p.add( this.pos );
			p.add( this.vel.times( step ) );
		}

		if ( this.parent && !options.local ) {
			this.parent.applyTransform( p, step, options );
		}

		return p;
	}

	unapplyTransform( p: Vec2, step: number=0.0, options: ApplyTransformOptions={} ): Vec2 {
		if ( this.parent ) {
			this.parent.unapplyTransform( p, step, options );
		}

		if ( !options.angleOnly ) {
			p.sub( this.pos );
			p.sub( this.vel.times( step ) );
		}

		return p;
	}

	draw( context: CanvasRenderingContext2D ) {
		context.fillStyle = this.material.getFillStyle();

		context.save();
			context.fillRect( this.pos.x, this.pos.y, this.width, this.height );
		context.restore();
	}
}