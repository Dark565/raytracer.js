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
