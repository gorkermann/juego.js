let shaders: Array<( mat: Material ) => string> = [];

shaders.push( 
	function( mat: Material ) {
		let h = ( mat.hue + mat.skewH ) % 360;

		let l = mat.lum + mat.skewL;
		if ( l < 0.0 ) l = 0.0;
		if ( l > 1.0 ) l = 1.0

		return 'hsl(' + h + ',' + mat.sat * 100 + '%,' + l * 100 + '%)';
	} );

shaders.push( 
	function( mat: Material ) {
		return 'hsl(' + mat.hue + ',' + 
			   ( mat.sat - Math.random() * 0.0 ) * 100 + '%,' + 
			   ( mat.lum + Math.random() * 0.3 ) * 100 + '%)';
	} );

export class Material {
	hue: number = 0.0; // 0-360
	sat: number = 0.0; // 0.0-1.0
	lum: number = 0.0; // 0.0-1.0

	shaderIndex: number = 0;

	skewH: number = 0.0;
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
		mat.skewH = this.skewH;
		mat.skewL = this.skewL;

		return mat;
	}

	getFillStyle(): string {
		return shaders[this.shaderIndex]( this );
	}
}