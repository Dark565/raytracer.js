/*
 * Copyright 2024 Grzegorz Kociołek
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Texture, TextureError } from '@app/texture/texture';
import { Color } from '@app/physics/color';

export class ImageTexture extends Texture {
	private image_url: string;
	private width: number;
	private height: number;
	private image_data: number[];
	private fallback_color: Color;
	private loading_promise: Promise<void>;

	/** Load an image texture from an URL.
	 * @param image_url The URL;
	 * @param fallback_color Color to use for fallback before the texture is loaded or on failure.
	 */
	constructor(image_url: string, fallback_color: Color, horizontal_flip = false, vertical_flip = false) {
		super();
		this.image_url = image_url;
		this.image_data = undefined;
		this.fallback_color = fallback_color;
		this.loading_promise = this.load_image(horizontal_flip, vertical_flip);
	}

	get_color(u: number, v: number): Color {
		if (this.image_data == undefined) {
			//console.log("Image is not (yet) loaded! Returning the fallback color");
			return this.fallback_color;
		}

		const width = this.width;
		const height = this.height;

		if (u < 0 - Number.EPSILON || u >= 1 - Number.EPSILON || v < 0 - Number.EPSILON || v > 1 - Number.EPSILON)
			throw Error('Texture coordinates out of bounds');

		/* TODO: Other types of interpolation than nearest neighbor */
		const u_i = (u * width) << 0;
		const v_i = (v * height) << 0;

		const px_idx = (v_i * width + u_i) * 3;
		//console.log(`texture: u ${u_i}, v ${v_i}, r ${this.image_data[px_idx]} g ${this.image_data[px_idx+1]} b ${this.image_data[px_idx+2]}`);

		return {  r: this.image_data[px_idx], 
			        g: this.image_data[px_idx+1],
							b: this.image_data[px_idx+2],
							a: 1.0 };
	}

	get_size(): [number, number]|undefined {
		if (this.image_data == undefined) {
			//console.log("Image is not (yet) loaded! Size is undefined");
			return undefined;
		}
	}

	get_loading_promise(): Promise<void> {
		return this.loading_promise;
	}

	private load_image(hflip: boolean, vflip: boolean): Promise<void> {
		const image = new Image();
		return new Promise((resolve, reject) => {
			image.onload = () => {

				const image_canvas = document.createElement('canvas');
				image_canvas.width = image.width;
				image_canvas.height = image.height;

				const total_size = image_canvas.width * image_canvas.height;
				
				const ctx = image_canvas.getContext('2d');

				let start_i = 0, start_y = 0, add_i = 4, add_y = 4;
				let end_i = image.width * 4, end_y = image.height * 4;

				/* XXX: Need to flip this way because passing negative width or height to ctx.drawImage
				 *      strangely doesn't do the job even though it's advertised. */
				if (hflip) {
					start_i = image.width * 4 - 4;
					add_i = -4;
					end_i = -4;
				}

				if (vflip) {
					start_y = image.height * 4 - 4;
					add_y = -4;
					end_y = -4;
				}

				ctx.drawImage(image, 0, 0);

				const image_data = ctx.getImageData(0, 0, image.width, image.height).data;
				console.log(image_data[0], image_data[1], image_data[2]);
				this.image_data = Array(total_size * 3);
				this.width = image.width;
				this.height = image.height;

				let j = 0;
				for (let y = start_y; y != end_y; y += add_y) {
					for (let i = start_i; i != end_i; i += add_i) {
						const index = y * image.width + i;
						this.image_data[j] = image_data[index] / 255.0;
						this.image_data[j+1] = image_data[index+1] / 255.0;
						this.image_data[j+2] = image_data[index+2] / 255.0;
						j += 3;
					}
				}

				image.remove();
				image_canvas.remove();
				resolve();
			}

			image.onerror = (ev: ErrorEvent) => {
				reject(new TextureError(`Couldn't load the texture '${this.image_url}': ${ev.message}`));
			}

			image.src = this.image_url;
		});
	}
}
