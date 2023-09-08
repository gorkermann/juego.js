export class Material {
	hue: number = 0.0; // 0-360
	sat: number = 0.0; // 0.0-1.0
	lum: number = 0.0; // 0.0-1.0

	skewH: number = 0.0;
	skewL: number = 0.0; // -1.0-1.0

	constructor( hue: number, sat: number, lum: number ) {
		this.hue = hue;
		this.sat = sat;
		this.lum = lum;
	}

	copy(): Material {
		let mat = new Material( this.hue, this.sat, this.lum );
		mat.skewH = this.skewH;
		mat.skewL = this.skewL;

		return mat;
	}

	getFillStyle(): string {
		let h = ( this.hue + this.skewH ) % 360;

		let l = this.lum + this.skewL;
		if ( l < 0.0 ) l = 0.0;
		if ( l > 1.0 ) l = 1.0

		return 'hsl(' + h + ',' + this.sat * 100 + '%,' + l * 100 + '%)';
	}
}