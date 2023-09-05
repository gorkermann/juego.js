export class Material {
	hue: number = 0; // 0-360
	sat: number = 0; // 0.0-1.0
	lum: number = 0; // 0.0-1.0

	constructor( hue: number, sat: number, lum: number ) {
		this.hue = hue;
		this.sat = sat;
		this.lum = lum;
	}

	copy(): Material {
		return new Material( this.hue, this.sat, this.lum );
	}

	getFillStyle(): string {
		return 'hsl(' + this.hue + ',' + this.sat * 100 + '%,' + this.lum * 100 + '%)';
	}
}