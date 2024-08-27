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
