import { Texture } from '@app/texture/texture';
import { Color } from '@app/physics/color';

/** The simplest texture type with just one solid color */
export class SolidTexture extends Texture {
	private color: Color;

	/** Load an image texture from an URL.
	 * @param image_url The URL;
	 * @param fallback_color Color to use for fallback before the texture is loaded or on failure.
	 */
	constructor(color: Color) {
		super();
		this.color = color;
	}

	get_color(_u: number, _v: number): Color {
		return this.color;
	}

	get_size(): [number, number]|undefined {
		return undefined;
	}

	get_loading_promise(): Promise<void> {
		return new Promise<void>((resolve)=>resolve());
	}
}
