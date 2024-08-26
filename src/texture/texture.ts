import * as color from '@app/physics/color';

export class TextureError extends Error {
	constructor(msg: string) {
		super(msg);
	}
}

/** The base class for all textures */
export abstract class Texture {
	/** Get the color of the texture at particular UV coordinates */
	abstract get_color(u: number, v: number): color.Color;

	/** Get the texture dimensions */
	abstract get_size(): [number, number];

	/** Get the promise for texture loading */
	abstract get_loading_promise(): Promise<void>;
}
