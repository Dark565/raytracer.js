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

import Screen from './screen';
import { RGBPixel } from './screen';
import { clamp } from '@app/math/mathutils';
import * as vector from '@app/math/vector';

// TODO: Define a uniform color class
type RGB = [number,number,number];
//type YUV = [number,number,number];

class ExposureBuffer {
	protected pixels: Float32Array;
	protected width: number;
	protected height: number;
	/** The number of exposure frames */
	protected frame_count: number;
	/** The weight of new pixels added to the mean */
	protected col_weight: number;
	/** THe maximum number of exposure frames */
	protected max_exposure_frames: number;

	get current_frame() { return this.frame_count; }

	/* -- cache -- */
	private _mean: number;
	private _variance: number;
	private _absdev: number;

	constructor(width: number, height: number, max_exposure_frames: number) {
		this.pixels = new Float32Array(width * height * 3).fill(0);
		this.width = width;
		this.height = height;
		this.max_exposure_frames = max_exposure_frames;
		this.reset_exposure();
	}

	/** Start a new exposure frame */
	next_frame(): boolean {
		if (this.max_exposure_frames > -1 && this.frame_count >= this.max_exposure_frames)
			return false;

		++this.frame_count;
		this.col_weight = 1 / (1 + this.frame_count);
		return true;
	}

	/** Reset the light exposure */
	reset_exposure() {
		this.frame_count = 0;
		this.col_weight = 1;
	}

	set_color(x: number, y: number, pixel: RGB) {
		this.check_bounds(x,y);

		const w = this.width;
		const i = (y * w + x) * 3;

		this.set_color_i(i, pixel);
	}

	set_color_i(i: number, pixel: RGB) {
		const old_col_vec = vector.vector3(this.pixels[i], 
																			 this.pixels[i+1],
																			 this.pixels[i+2]);

		let col_vec = vector.vector3(...pixel);
		vector.scale_self(col_vec, this.col_weight);
		vector.add_self(col_vec, vector.scale(old_col_vec, 1 - this.col_weight));
			
		this.pixels[i]   = col_vec.v[0];
		this.pixels[i+1] = col_vec.v[1];
		this.pixels[i+2] = col_vec.v[2];

		this.clean_cache();
	}

	get_mean(): number {
		if (this._mean)
			return this._mean;

		const n_pixels = this.width * this.height;
		let mean = 0;

		for (let i = 0; i < n_pixels*3; i += 3) {
			const rgb = <RGB> [this.pixels[i], this.pixels[i+1], this.pixels[i+2]];
			const y = ExposureBuffer.rgb_to_y(rgb);
			mean += y;
		}

		mean /= n_pixels;
		return mean;
	}

	get_variance(mean: number): number {
		if (this._variance)
			return this._variance;

		const n_pixels = this.width * this.height;
		let variance = 0;
		for (let i = 0; i < n_pixels*3; i += 3) {
			const rgb = <RGB> [this.pixels[i], this.pixels[i+1], this.pixels[i+2]];
			const y = ExposureBuffer.rgb_to_y(rgb);
			const delta = (y - mean);
			variance += delta*delta;
		}

		variance /= n_pixels;
		return variance;
	}

	get_absolute_dev(mean: number): number {
		if (this._absdev)
			return this._absdev;

		const n_pixels = this.width * this.height;
		let dev = 0;
		for (let i = 0; i < n_pixels*3; i += 3) {
			const rgb = <RGB> [this.pixels[i], this.pixels[i+1], this.pixels[i+2]];
			const y = ExposureBuffer.rgb_to_y(rgb);
			const delta = Math.abs(y - mean);
			dev += delta;
		}

		dev /= n_pixels;
		return dev;
	}

	/** Draw the dynamic-range-compressed buffer on a screen */
	discretize_to_screen(screen: Screen, drange_low: number, drange_high: number) {
		const n_pixels = this.width * this.height;
		const drange = drange_high - drange_low;
		for (let px_i = 0, i = 0; px_i < n_pixels; ++px_i, i += 3) {
			const px_brightness = ExposureBuffer.rgb_to_y([this.pixels[i], this.pixels[i+1], this.pixels[i+2]]);
			const cmpr_brightness = (px_brightness - drange_low) / drange;
			const scale_coef = cmpr_brightness / (px_brightness + Number.EPSILON); // EPS is added to avoid div by 0

			const compressed_c = <RGBPixel> <unknown> this.pixels.slice(i,i+2).map((c) => {
				return clamp(c * scale_coef, 0.0, 1.0);
			});
			screen.set_pixel_i(px_i, compressed_c);
		}
	}

	// https://en.wikipedia.org/wiki/Y%E2%80%B2UV
	private static rgb_to_y(rgb: RGB): number {
		const W_R = 0.299;
		const W_G = 0.587;
		const W_B = 0.114;
		//const U_MAX = 0.436;
		//const V_MAX = 0.615;

		const y = W_R * rgb[0] + W_G * rgb[1] + W_B * rgb[2];
		//const u = U_MAX * (rgb[2] - y)/(1 - W_G);
		//const v = V_MAX * (rgb[0] - y)/(1 - W_R);

		return y;
	}

	private clean_cache() {
		this._mean = undefined;
		this._variance = undefined;
		this._absdev = undefined;
	}

	private check_bounds(x: number, y: number) {
		const w = this.width;;
		const h = this.height;
		if (x < 0 || x >= w || y < 0 || y >= h)
			throw Error("x or y out of bounds");
	}
}

export default ExposureBuffer;
