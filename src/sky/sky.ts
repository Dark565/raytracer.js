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

import * as vector from '@app/math/vector';
import { Color } from '@app/physics/color';
import { Texture } from '@app/texture/texture';

/** Sky is the class representing skybox/skysphere.
 *  The difference between the sky and a simple box/sphere entity
 *  positioned at the middle of the scene is that
 *  sky position is always relative to the camera (or other point) and retrieving a
 *  pixel from the sky's texture doesn't need complex intersection calculations. */
export abstract class Sky {
	texture: Texture;

	constructor(texture: Texture) {
		this.texture = texture;
	}

	abstract get_color(direction: vector.Vector): Color;
};
