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

import { Vector, Point } from '@app/linalg';
import { OctreeWalker } from '@app/octree_space';
import { EntityArray } from '@app/context';
import { Color, clone_color } from '@app/physics/color';

export class Ray {
	/** Current count of reflections */
	private refcount: number;
	/** Maximum count of reflections */
	private refmax: number;
	/** The last point of reflection */
	private refpoint: Point;
	/** Current direction of the ray */
	private dir: Vector;
	/** Current color of the ray; can be altered by materials */
	private color: Color;
	/** The OctreeWalker assigned to the ray */
	private walker: OctreeWalker<EntityArray>;

	constructor(refmax: number, start_point: Point, dir: Vector,
							color: Color, walker: OctreeWalker<EntityArray>,
							flags: { keep_dir_unnormalized?: boolean } = {}) 
	{
		this.refcount = 0;
		this.refmax = refmax;
		this.refpoint = start_point.clone();
		this.color = clone_color(color);
		this.walker = walker;
		if (!flags.keep_dir_unnormalized)
			this.dir = dir.normalize();
		else
			this.dir = dir.clone();
	}

	set_color(color: Color) {
		this.color = color;
	}

	get_color() {
		return this.color;
	}

}
