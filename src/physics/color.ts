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

import { clamp } from '@app/math/mathutils';

/* NOTE: Should've probably been implemented as based on Vector */

export interface Color {
	r: number;
	g: number;
	b: number;
	a: number;
}

export type ColorTuple = [number,number,number,number];

export function color(r: number, g: number, b: number, a = 1.0): Color {
	return { r: r, g: g, b: b, a: a };
}

export function clone_color(c: Color): Color {
	return color(c.r,c.g,c.b,c.a);
}

export function scale_color(c: Color, coef: number, flags: { clamp?: boolean } = {}): Color {
	let channels = ['r','g','b'];
	const map_fn = flags.clamp 
		? (ch:string) => clamp(coef * c[ch], 0, 1) 
		: (ch:string) => coef * c[ch];

	const channel_values = channels.map(map_fn);
	channel_values[3] = c.a;
	return color(...channel_values as ColorTuple);
}

/** Calculate the hadamard product of two colors (result alpha = c1.a). */
export function mul_color(c1: Color, c2: Color): Color {
	return { r: c1.r * c2.r, g: c1.g * c2.g, b: c1.b * c2.b, a: c1.a };
}

export function clamp_color(c: Color): Color {
	return { r: clamp(c.r,0,1), g: clamp(c.g,0,1), b: clamp(c.b,0,1), a: clamp(c.a,0,1) };
}

/** Blends overlay color on top of base color with respect to the alpha value. */
export function overlay_color(base: Color, overlay: Color): Color {
	const coef_base = 1 - overlay.a;
	let color_channels = ['r','g','b'].map((ch) => clamp(coef_base * base[ch] + overlay.a * overlay[ch], 0.0, 1.0));

	color_channels[3] = clamp(base.a + overlay.a, 0.0, 1.0);
	return color(...color_channels as ColorTuple);
}


