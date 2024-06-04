////////////
// ENTITY //
////////////

/*
	One of the objects in the game world. Player, enemies, bosses, bullets, explosions, falling rocks, etc.
	
	
*/

import * as tp from './lib/toastpoint.js'
import { constructors, nameMap } from './constructors.js'

import { Anim } from './Anim.js'
import { Contact } from './Contact.js'
import { Debug } from './Debug.js'
import { rangeEdit, Range } from './Editable.js'
import { Line } from './Line.js'
import { Material } from './Material.js'
import { Vec2 } from './Vec2.js'
import { toToast } from './serialization.js'
import { Shape, LocalPoint, WorldPoint } from './Shape.js'
import { Dict } from './util.js'
import { SolverResult } from './collisionSolver.js'

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

export type GetShapesOptions = {
	useCached?: boolean,
	local?: boolean
}

type ApplyTransformOptions = {
	angleOnly?: boolean,
	local?: boolean
}

type UnapplyTransformOptions = {
	angleOnly?: boolean,
}

export enum TransformOrder {
	TRANSLATE_THEN_ROTATE = 0,
	ROTATE_THEN_TRANSLATE
}

export class Entity {
	id: number = -1;

	parent: Entity = null;
	_subs: Array<Entity> = [];

	messages: Array<string> = [];

	pos: Vec2 = new Vec2(); // position relative to parent
	vel: Vec2 = new Vec2(); // added to pos in advance()
	angle: number = 0.0;	// if transformOrder=TRANSLATE_THEN_ROTATE, angle relative to parent
							// if transformOrder=ROTATE_THEN_TRANSLATE, own angle 
	angleVel: number = 0.0;	// added to angle in advance()

	noAdvance: boolean = false; // if true, pos and angle will not be update in advance()
	transformOrder: TransformOrder = TransformOrder.TRANSLATE_THEN_ROTATE; // see "angle" above

	// Appearance	
	width: number;	// default width (diameter for a circular entity)
	height: number;	// default height

	alpha: number = 1.0;
	material: Material = new Material( 0, 0, 0.5 ); // default color

	presetShapes: Array<Shape> = []; // overrides return value of this._getDefaultShapes(). Only updated when basic shapes are changed
	cachedShapes: Array<Array<Shape>> = []; // overrides the return value of this.getShapes(). Updated every frame
	inMotion: boolean = false;

	// Collision
	isGhost: boolean = false;		// if true, this entity doesn't generate shapes (no draw or collide, subs still can)
	collisionGroup: number = 0;		// arbitrary power of 2
	collisionMask: number = 0x00; 	// Entity handles collisions from these groups
	isPliant: boolean = false;		// Entity can be pushed

	removeThis: boolean = false;	// if true, tells the entity manager to remove this entity. Set by calling destructor()

	spawned: Array<Entity> = []; // Queue of entities created by this one that will be added to the game

	drawWireframe: boolean = false;

	name: string = 'entity';
	flavorName: string = 'ENTITY';
	className: string = 'Entity';

	anim: Anim = null;

	frozen: boolean = false;

	/* fields from Selectable */

	hovered: boolean = false;
	preselected: boolean = false;
	selected: boolean = false;

	/* fields from Editable */

	edit: ( varname: string, value: any ) => void = rangeEdit;
	editFields: Array<string> = ['name', 'parent', 'pos', 'angle', 'width', 'height', '_subs', 'anim', 'collisionGroup', 'collisionMask'];
	ranges: Dict<Range> = {
		angle: 'real',
	};

	savedVals: Dict<any> = {};

	discardFields: Array<string> = [
		'hovered', 'selected', 'preselected',
		'edit', 'ranges', 'savedVals', 'hitWith'
	];

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

	toToast( toaster: tp.Toaster ): any {
		return toToast.apply( this, [toaster] );
	}

	/**
	 * Returns a deep copy the entity
	 *
	 * This has the potential to get very silly, if for instance an entity happens to have a pointer
	 * to the level it's in, since it will make a deep copy of the level, and then *every other* entity in the level
	 * 
	 * @return {Entity} the copy
	 */
	copy(): Entity {
		let toaster = new tp.Toaster( constructors );
		let json = tp.toJSON( this, toaster );
		toaster.cleanAddrIndex();

		toaster = new tp.Toaster( constructors );
		let copy = tp.fromJSON( json, toaster ) as Entity;

		copy.parent = null;

		return copy;
	}

	// don't override! override subDestructor instead
	destructor() {
		if ( this.removeThis ) return;

		this.removeThis = true;
		this._subDestructor();
	}

	// don't call except as super._subDestructor() inside an override
	protected _subDestructor() {}

	/* update */

	advance( step: number ) {
		if ( this.frozen ) return;

		if ( !this.noAdvance ) {
			this.pos.add( this.vel.times( step ) );
		}
		
		this.angle += this.angleVel * step;

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
		if ( this.frozen ) return;

		this.animate( step, elapsed );

		for ( let sub of this.getSubs() ) {
			sub._animateRecur( step, elapsed );
		}
	}

	updateGrav( grav: Vec2 ) {}

	update() {}

	_updateRecur() {
		if ( this.frozen ) return;

		this.update();

		for ( let sub of this.getSubs() ) {
			sub._updateRecur();
		}
	}

	/* body */

	protected _getDefaultShapes(): Array<Shape> {
		let shape = Shape.makeRectangle( 
				new Vec2( -this.width / 2, -this.height / 2), this.width, this.height );

		shape.material = this.material;

		return [shape];
	}

	getOwnShapes(): Array<Shape> {
		if ( this.isGhost ) return [];

		let shapes = [];

		if ( this.presetShapes.length > 0 ) {
			shapes = this.presetShapes.map( x => x.copy() );

		} else {
			shapes = this._getDefaultShapes();
		}

		// do for either defaults or presets
		for ( let shape of shapes ) {
			shape.parent = this;
		}

		return shapes;
	}

	// don't override! override getOwnShapes instead
	getShapes( step: number=0.0, options: GetShapesOptions={} ): Array<Shape> {
		if ( options.local === undefined ) options.local = true;

		if ( !this.parent && options.useCached ) {
			if ( this.cachedShapes[0] ) {
				if ( step == 0.0 || !this.inMotion ) return this.cachedShapes[0];
			}
			if ( step == 1.0 && this.cachedShapes[1] ) return this.cachedShapes[1];
		}

		let shapes: Array<Shape> = this.getOwnShapes();

		for ( let sub of this.getSubs() ) {
			for ( let sshape of sub.getShapes( step ) ) { // don't pass options	
				shapes.push( sshape ); 
			}
		}

		for ( let shape of shapes ) {
			for ( let p of shape.points ) {
				this.applyTransform( p, step, { local: options.local } );
			}

			for ( let n of shape.normals ) {
				this.applyTransform( n, step, { local: options.local, angleOnly: true } );
			}
		}

		// for ( let shape of shapes ) {
		// 	shape.calcMinMax();
		// }

		return shapes;
	}

	replacePresetShapes( shapes: Array<Shape> ) {
		for ( let shape of shapes ) {
			this.unapplyTransformToShape( shape );
		}

		this.presetShapes = shapes;
	}

	getMinMax(): [Vec2, Vec2] {
		let shapes = this.getShapes();
		let corners: Array<Vec2> = [];

		for ( let shape of shapes ) {
			let [min, max] = Shape.getMinMax( shape.points );

			corners.push( min );
			corners.push( max );
		}

		return Shape.getMinMax( corners );
	}

	applyTransform( p: LocalPoint, step: number=0.0, options: ApplyTransformOptions={} ): WorldPoint {
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

	unapplyTransformToShape( shape: Shape ) {
		for ( let p of shape.points ) {
			this.unapplyTransform( p, 0.0 );
		}

		for ( let n of shape.normals ) {
			this.unapplyTransform( n, 0.0, { angleOnly: true } );
		}
	} 

	unapplyTransform( p: WorldPoint, step: number=0.0, options: UnapplyTransformOptions={} ): LocalPoint {
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

	getAlpha(): number {
		if ( this.alpha == 0.0 ) return 0.0;
		else if ( !this.parent ) return this.alpha;
		else return this.alpha * this.parent.getAlpha();
	}

 	/* children */

	cull() {
		for ( let sub of this.getSubs() ) {
			sub.cull();
		}

		cullList( this._subs );
	}

	addSub( entity: Entity ) {
		if ( entity.parent ) {
			throw new Error( 'Entity.addSub: ' + this.constructor.name + ' already has parent ' + entity.parent.constructor.name );
		}

		if ( !this._subs.includes( entity ) ) {
			this._subs.push( entity );

			this.cachedShapes = [];
		}

		entity.parent = this;
	}

	getSubs(): Array<Entity> {
		return this._subs;
	}

	doForAllChildren( func: ( entity: Entity ) => void ) {
		func( this );

		for ( let sub of this.getSubs() ) {
			sub.doForAllChildren( func );
		}
	}

	getFlatList(): Array<Entity> {
		let result: Array<Entity> = [this];

		for ( let sub of this.getSubs() ) {
			result = result.concat( sub.getFlatList() );
		}

		return result;
	}

	spawnEntity( newEntity: Entity ): void {
		newEntity.collisionGroup = this.collisionGroup;
		newEntity.collisionMask = this.collisionMask;

		this.spawned.push( newEntity );
	}

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

	/* interaction */

	watch( pos: Vec2 ): void {}

	canBeHitBy ( otherEntity: Entity ): boolean {
		return this != otherEntity && ( this.collisionMask & otherEntity.collisionGroup ) > 0;
	}

	overlaps ( otherEntity: Entity, step: number, useCached: boolean=false ): Array<Contact> {
		let shapes = this.getShapes( step, { useCached: useCached } );
		let otherShapes = otherEntity.getShapes( step, { useCached: useCached } );

		/*
			IDEAS

			use fastest moving of the contacts
			contact with normal most counter to object position (dot closest to -1)
			average normals to deal with spikes

			output multiple contacts for entities with multiple shapes
		 */

		let contacts: Array<Contact>;
		let sub, otherSub: Entity;

		for ( let shape of shapes ) {
			for ( let otherShape of otherShapes ) {

				// collision group
				sub = shape.parent;
				if ( !sub.collisionGroup ) sub = this;

				otherSub = otherShape.parent;
				if ( !otherSub.collisionGroup ) otherSub = otherEntity;

				if ( !sub.canBeHitBy( otherSub ) ) continue;

				// boundary box
				if ( shape.minmax.length == 0 ) shape.calcMinMax();
				if ( otherShape.minmax.length == 0 ) otherShape.calcMinMax();

				if ( shape.minmax[1].x < otherShape.minmax[0].x - 1 ) continue;
				if ( shape.minmax[0].x > otherShape.minmax[1].x + 1 ) continue;
				if ( shape.minmax[1].y < otherShape.minmax[0].y - 1 ) continue;
				if ( shape.minmax[0].y > otherShape.minmax[1].y + 1 ) continue;

				// contact
				let contact = null;
				let maxScore = 0;

				contact = shape.getEdgeContact( otherShape );

				if ( contact ) {
					if ( !contacts ) contacts = [];

					contact.sub = sub;
					contact.otherSub = otherSub;
					contacts.push( contact );
				}
			}
		}
		
		return contacts ? contacts : [];
	}

	hitWithMultiple( otherEntity: Entity, contacts: Array<Contact> ): void {
		// If an entity has multiple shapes, multiple contacts can be generated
		// TODO: sort incoming contacts per sub, use one with lowest slice?

		// HMMM: does it make sense to limit to a single contact between two entity trees?
		// (counterexample: explosion hits multiple weak points?)
		let subsHitById: Array<boolean> = []; // indexed by id

		if ( contacts.length > 0 ) {
			for ( let contact of contacts ) {
				if ( subsHitById[contact.sub.id] ) continue;
				
				this.hitWith( contact.otherSub, contact );

				subsHitById[contact.sub.id] = true;
			}
		}
	}

	hitWith( otherEntity: Entity, contact: Contact ): void {}

	/* editor */

	hover( p: Vec2 ): Array<Entity> { 
		let output = [];

		for ( let shape of this.getShapes() ) {
			if ( shape.contains( p, 0.0 ) ) {
				output.push( shape.parent );
			}
		}

		return output;
	}

	anyParentHovered(): boolean {
		if ( !this.parent ) return false;

		if ( this.parent.hovered ) return true;
		else return this.parent.anyParentHovered();
	}

	getRoot(): Entity {
		if ( !this.parent ) return this;

		return this.parent.getRoot();
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

	/* Drawing */ 

	shade() {
		for ( let sub of this.getSubs() ) {
			sub.shade();
		}
	}

	basicStroke( context: CanvasRenderingContext2D ) {
		let shapes = this.getShapes( 0.0 );

		for ( let shape of shapes ) {
			shape.stroke( context, { setStyle: false } );
		}
	}

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
		
		for ( let shape of shapes ) {
			if ( shape.parent.selected ) {
				context.strokeStyle = 'fuchsia';
				context.lineWidth = 6;
				context.globalAlpha = 0.3;
				shape.stroke( context, { setStyle: false } );

			} else if ( shape.parent.hovered ) {
				context.strokeStyle = 'yellow';
				context.lineWidth = 6;
				context.globalAlpha = 0.3;
				shape.stroke( context, { setStyle: false } );

			} else if ( shape.parent.anyParentHovered() ) {
				context.strokeStyle = 'white';
				context.lineWidth = 2;
				context.globalAlpha = 0.3;
				shape.stroke( context, { setStyle: false } );
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