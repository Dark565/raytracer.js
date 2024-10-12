export default class Substance {
	refractive_index: number;

	constructor(index: number) {
		this.refractive_index = index;
	}
}

export const SUBSTANCE_AIR   = new Substance(1.0);
export const SUBSTANCE_WATER = new Substance(1.333);
export const SUBSTANCE_GLASS = new Substance(1.5);
