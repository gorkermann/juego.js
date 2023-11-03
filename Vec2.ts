//////////
// VEC2 //
//////////

/*
	a 2-dimensional vector

	a distinction is made between algebraic operations that modify the calling Vec2 
	and those that do not. These are

	add() / plus()
	sub() / minus()
	scale() / times()
*/

export class Vec2 {
	x: number;
	y: number;

	constructor( x: number=0, y: number=0 ) {
		if ( isNaN( x ) || isNaN( y ) ) {
			throw new Error( 'Vec2.constructor: invalid arguments x=' + x + ' y=' + y );
		}

		this.x = x;
		this.y = y;
	}

	toString(): string {
		return '(' + this.x + ', ' + this.y + ')';
	}

	static sortXY( a: Vec2, b: Vec2, epsilon: number=0.0001 ): number {
		if ( Math.abs( a.x - b.x ) < epsilon ) {
			return a.y - b.y;
		} else {
			return a.x - b.x;
		}
	}

	static fromPolar( a: number, r: number ): Vec2 {
		let v: Vec2 = new Vec2( 0, 0 );

		v.x = Math.cos( a ) * r;
		v.y = Math.sin( a ) * r;

		return v;
	}

	zero(): void {
		this.x = 0;
		this.y = 0;
	}

	copy(): Vec2 {
		return new Vec2( this.x, this.y );
	}

	equals( v: Vec2, epsilon: number=0.0001 ) {
		return Math.abs( this.x - v.x ) < epsilon &&
			   Math.abs( this.y - v.y ) < epsilon;
	}

	equalsX( v: Vec2, epsilon: number=0.0001 ) {
		return Math.abs( this.x - v.x ) < epsilon;
	}

	equalsY( v: Vec2, epsilon: number=0.0001 ) {
		return Math.abs( this.y - v.y ) < epsilon;
	}	

	dot( v: Vec2 ): number {
		return this.x * v.x + this.y * v.y;
	}

	cross( v: Vec2 ): number {
		return this.x * v.y - v.x * this.y;
	}

	set( v: Vec2 ): Vec2 {
		this.x = v.x;
		this.y = v.y;

		return this;
	}

	setValues( x: number, y: number ): Vec2 {
		this.x = x;
		this.y = y;

		return this;
	}

	add( v: Vec2 ) {
		this.x += v.x;
		this.y += v.y;

		return this;
	}

	addX( x: number ): void {
		this.x += x;
	}

	addY( y: number ): void {
		this.y += y;
	}

	plus( v: Vec2 ): Vec2 {
		return new Vec2(this.x + v.x, this.y + v.y);
	}

	sub( v: Vec2 ): Vec2 {
		this.x -= v.x;
		this.y -= v.y;

		return this;
	}

	minus( v: Vec2 ): Vec2 {
		return new Vec2(this.x - v.x, this.y - v.y);
	}

	scale( s: number ): Vec2 {
		this.x *= s;
		this.y *= s;

		return this;
	}

	times( s: number ): Vec2 {
		return new Vec2( this.x * s, this.y * s );
	}

	flip(): Vec2 {
		return this.scale( -1 );
	}

	length(): number {
		return Math.sqrt( this.x * this.x + this.y * this.y );
	}

	lengthSq(): number {
		return this.x * this.x + this.y * this.y;
	}

	alongTo( v: Vec2, t: number=1.0 ) {
		return this.plus( v.minus( this ).scale( t ) );
	}

	distTo( v: Vec2 ): number {
		return v.minus( this ).length();
	}

	distToSq( v: Vec2 ): number {
		return v.minus( this ).lengthSq();	
	}

	unit(): Vec2 {
		let len: number = this.length();

		if ( len == 0.0 ) return this;

		return new Vec2( this.x / len, this.y / len );
	}	

	normalize(): Vec2 {
		let len: number = this.length();

		if ( len == 0.0 ) return this;

		return this.scale( 1.0 / len );
	}

	rotate( a: number ): Vec2 {
		let x = this.x;
		let y = this.y;

		this.x = x * Math.cos(a) - y * Math.sin(a);
		this.y = x * Math.sin(a) + y * Math.cos(a);

		return this;
	}

	turned( a: number ): Vec2 {
		let x = this.x;
		let y = this.y;

		return new Vec2( x * Math.cos(a) - y * Math.sin(a),
						 x * Math.sin(a) + y * Math.cos(a) );
	}

	angle(): number { 
		return Math.atan2( this.y, this.x );
	}

	grid( g: number ): Vec2 {
		this.x = Math.floor( this.x / g ) * g;
		this.y = Math.floor( this.y / g ) * g;

		return this;
	}

/*	angleTo( v: Vec2 ): number {
		return ( v.turned( -this.angle ).angle)
		let len1 = this.length();
		let len2 = v.length();

		if ( len1 == 0 || len2 == 0 ) return 0;

		return this.dot( v ) / ( len1 * len2 ); 
	}	*/
}