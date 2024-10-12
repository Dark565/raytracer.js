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

/** Color of a pixel. Individual channel are in <0.0, 1.0> range */
export type RGBPixel = [number,number,number];

export interface ScreenFlags {
	buffer_pixels?: boolean
}

/** A class abstracting a concept of screen output */
export abstract class Screen {
	/** The number of exposure frames */
	protected frame_count: number;

	/** The weight of new pixels added to the mean */
	protected col_weight: number;

	constructor() {
		this.reset_exposure();
	}

	/** Start a new exposure frame */
	next_frame() {
		++this.frame_count;
		this.col_weight = 1 / (1 + this.frame_count);
	}

	/** Reset the light exposure */
	reset_exposure() {
		this.frame_count = 0;
		this.col_weight = 1;
	}

	/** Set a particular pixel to a specific color value */
	abstract set_pixel(x: number, y: number, color: RGBPixel): void;
	/** Ensures the set pixels are put on the screen and increases the number of exposure frames */
	abstract flush(): void;

	/** Fill the screen with a specific color */
	abstract fill(color: RGBPixel): void;
	
	/** Set flags and return old flags */
	abstract set_flags(flags: ScreenFlags): ScreenFlags;
	abstract get_flags(flags: ScreenFlags): ScreenFlags;
}
