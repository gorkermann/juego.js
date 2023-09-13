type HSLA = {h: number, s: number, l: number, a: number}

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
			l: mat.lum + Math.random() * 0.2,
			a: mat.alpha,
		} 
	} );

export function toFillStyle( color: HSLA ): string {
	return 'hsla(' + color.h + ',' + color.s * 100 + '%,' + color.l * 100 + '%,' + color.a * 100 + '%)';
}

export class Material {
	hue: number = 0.0; // 0-360
	sat: number = 0.0; // 0.0-1.0
	lum: number = 0.0; // 0.0-1.0
	alpha: number = 1.0; // 0.0-1.0

	shaderIndex: number = 0;

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
		mat.alpha = this.alpha;

		mat.skewH = this.skewH;
		mat.skewS = this.skewS;
		mat.skewL = this.skewL;

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
		return toFillStyle( this.getHSLA() );
	}
}