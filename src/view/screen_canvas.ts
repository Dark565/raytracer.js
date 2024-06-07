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

import { Screen, RGBPixel, ScreenFlags } from '@app/view/screen';

/** The HTML canvas screen output */
export class CanvasScreen extends Screen {
	private canvas_ctx: CanvasRenderingContext2D;
	private canvas: HTMLCanvasElement;
	private image: ImageData;
	private flags: ScreenFlags;

	constructor(canvas_ctx: CanvasRenderingContext2D, flags: ScreenFlags = {}) {
		super();
		this.canvas_ctx = canvas_ctx;
		this.canvas = canvas_ctx.canvas;
		this.flags = flags;
	}

	set_pixel(x: number, y: number, pixel: RGBPixel) {
		this.check_bounds(x,y);

		const w = this.canvas.width;
		const i = (y * w + x) << 2;

		this.image[i]   = pixel[0];
		this.image[i+1] = pixel[1];
		this.image[i+2] = pixel[2];
		if (!this.flags.buffer_pixels)
			this.flush();
	}

	flush() {
		this.canvas_ctx.putImageData(this.image, 0, 0);
	}

	fill(pixel: RGBPixel) {
		const pix_count = this.canvas.width * this.canvas.height;
		for (let i = 0; i < (pix_count << 2); i += 4) {
			this.image[i]   = pixel[0];
			this.image[i+1] = pixel[1];
			this.image[i+2] = pixel[2];
		}
		if (!this.flags.buffer_pixels)
			this.flush();
	}

	get_flags(): ScreenFlags {
		return this.flags;
	}

	set_flags(flags: ScreenFlags): ScreenFlags {
		const old_flags = this.flags;
		this.flags = flags;
		return old_flags;
	}

	private check_bounds(x: number, y: number) {
		const w = this.canvas.width;
		const h = this.canvas.height;
		if (x < 0 || x >= w || y < 0 || y >= h)
			throw Error("x or y out of bounds");
	}
}
