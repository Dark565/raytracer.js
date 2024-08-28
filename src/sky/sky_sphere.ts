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
import { uv_map_sphere } from '@app/math/uv_mapping';
import { Color } from '@app/physics/color';
import { Sky } from '@app/sky/sky';

export class SkySphere extends Sky {
	get_color(dir: vector.Vector): Color {
		const [u,v] = uv_map_sphere(<vector.Vector3> dir);
		return this.texture.get_color(u,v);
	}
}
