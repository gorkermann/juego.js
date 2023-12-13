type HSLA = {h: number, s: number, l: number, a: number}
type RGBA = {r: number, g: number, b: number, a: number}

let shaders: Array<( mat: Material ) => HSLA> = [];

shaders.push( 
	function( mat: Material ): HSLA {
		let h = ( mat.hue + mat.skewH ) % 360;

		let s = mat.sat + mat.skewS;
		if ( s < 0.0 ) s = 0.0;
		if ( s > 1.0 ) s = 1.0;

		let l = mat.lum + mat.skewL;
		if ( l < 0.0 ) l = 0.0;
		if ( l > 1.0 ) l = 1.0;

		return {
			h: h,
			s: s,
			l: l,
			a: mat.alpha
		}

		//'hsla(' + h + ',' + s * 100 + '%,' + l * 100 + '%,' + mat.alpha * 100 + '%)';
	} );

shaders.push( 
	function( mat: Material ): HSLA {
		return { 
			h: mat.hue,
			s: mat.sat - Math.random() * 0.0,
			l: mat.lum + Math.random() * 0.3,
			a: mat.alpha,
		} 
	} );

let cornerShaders: Array<( mat: Material, score: number ) => void> = [];

cornerShaders.push( 
	function( mat: Material, score: number ): void {
		let greenness = Math.abs( mat.hue - 120 );
		if ( greenness > 180 ) greenness = 360 - greenness;
		greenness = Math.max( 60 - greenness, 0 );

		mat.hue += score * ( 10 + greenness ) * mat.alpha;
	}
)

cornerShaders.push( 
	function( mat: Material, score: number ): void {
		if ( score > 0 ) mat.lum = score * 0.9;
	}
)

// same as 0, but ignores score
cornerShaders.push( 
	function( mat: Material, score: number ): void {
		let greenness = Math.abs( mat.hue - 120 );
		if ( greenness > 180 ) greenness = 360 - greenness;
		greenness = Math.max( 60 - greenness, 0 );

		mat.hue += score * ( 10 + greenness ) * mat.alpha;
	}
)

export function HSLAtoFillStyle( color: HSLA ): string {
	return 'hsla(' + color.h + ',' + color.s * 100 + '%,' + color.l * 100 + '%,' + color.a * 100 + '%)';
}

export function RGBAtoFillStyle( color: RGBA ): string {
	return 'rgba(' + color.r * 255 + ',' + color.g * 255 + ',' + color.b * 255 + ',' + color.a + ')';
}

export class Material {
	hue: number = 0.0; // 0-360
	sat: number = 0.0; // 0.0-1.0
	lum: number = 0.0; // 0.0-1.0
	alpha: number = 1.0; // 0.0-1.0

	emit: number = 0.0;

	shaderIndex: number = 0;
	cornerShaderIndex: number = 0;

	skewH: number = 0.0;
	skewS: number = 0.0; // -1.0-1.0
	skewL: number = 0.0; // -1.0-1.0

	constructor( hue: number, sat: number, lum: number, shaderIndex: number=0) {
		this.hue = hue;
		this.sat = sat;
		this.lum = lum;

		if ( !shaders[shaderIndex] ) shaderIndex = 0;
		this.shaderIndex = shaderIndex;
	}

	copy(): Material {
		let mat = new Material( this.hue, this.sat, this.lum, this.shaderIndex );
		mat.cornerShaderIndex = this.cornerShaderIndex;

		mat.alpha = this.alpha;

		mat.skewH = this.skewH;
		mat.skewS = this.skewS;
		mat.skewL = this.skewL;

		mat.emit = this.emit;

		return mat;
	}

	getHSLA(): HSLA {
		return shaders[this.shaderIndex]( this );
	}

	blendWith( other: HSLA ): HSLA {
		let color = this.getHSLA();

		// mix hue differently because it depends on saturation and alpha
		let satTotal = color.s * color.a + other.s * ( 1 - color.a );

		if ( satTotal > 0 ) {
			let h = other.h * ( other.s * ( 1 - color.a ) ) +
				 	color.h * ( color.s * color.a );
			
			other.h = h / satTotal;
		}

		other.s *= 1 - color.a;
		other.l *= 1 - color.a;

		other.s += color.s * color.a;
		other.l += color.l * color.a;

		return other;
	}

	getFillStyle(): string {
		return HSLAtoFillStyle( this.getHSLA() );
	}

	highlightCorners( score: number ) {
		cornerShaders[this.cornerShaderIndex]( this, score );
	}

	/**
	 * from here https://stackoverflow.com/questions/2353211/hsl-to-rgb-color-conversion
	 * @return {RGBA} [description]
	 */
	getRGBA(): RGBA {
		let color = this.getHSLA();

		let r, g, b: number;

		if ( color.s === 0) {
			r = g = b = color.l; // achromatic

		} else {
			const q = color.l < 0.5 ? color.l * (1 + color.s) : color.l + color.s - color.l * color.s;
			const p = 2 * color.l - q;
			r = this.hueToRgb(p, q, color.h + 120);
			g = this.hueToRgb(p, q, color.h );
			b = this.hueToRgb(p, q, color.h - 120);
		}

		return { r: r, g: g, b: b, a: color.a };
	}

	hueToRgb( p: number, q: number, t: number ) {
		if (t < 0) t += 360;
		if (t > 360) t -= 360;
		if (t < 60) return p + (q - p) * 6 * t / 360;
		if (t < 180) return q;
		if (t < 240) return p + (q - p) * 6 * (240 - t) / 360;
		return p;
	}
}