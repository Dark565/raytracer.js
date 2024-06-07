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

export interface RGBPixel {
	[0]: number;
	[1]: number;
	[2]: number;
}

export interface ScreenFlags {
	buffer_pixels?: boolean
}

/** A class abstracting a concept of screen output */
export abstract class Screen {
	/** Set a particular pixel to a specific color value */
	abstract set_pixel(x: number, y: number, color: RGBPixel): void;
	/** Ensures the set pixels are put on the screen */
	abstract flush(): void;
	/** Fill the screen with a specific color */
	abstract fill(color: RGBPixel): void;
	
	/** Set flags and return old flags */
	abstract set_flags(flags: ScreenFlags): ScreenFlags;
	abstract get_flags(flags: ScreenFlags): ScreenFlags;
}
