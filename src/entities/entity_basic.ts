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

import { Entity } from '@app/entity';
import { Point } from '@app/math/linalg';
import { Material } from '@app/physics/material'

export abstract class BasicEntity extends Entity {
	protected pos: Point;
	protected material: Material;

	get_pos() { return this.pos; }
	set_pos(p: Point): Point { 
		const old_pos = this.pos;
		this.pos = p;
		return old_pos;
	}
}
