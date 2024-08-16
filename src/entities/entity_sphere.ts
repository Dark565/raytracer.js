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

import { EntitySet, EntityOtree } from '@app/octree_entity';
import { Ray } from '@app/raytracer';
import { Point, point } from '@app/math/linalg';
import { CollisionInfo } from '@app/entity';
import { BasicEntity } from '@app/entities/entity_basic';
import { Material } from '@app/material';
import * as linalg from '@app/math/linalg';

export class SphereEntity extends BasicEntity {
	private diameter: number;

	constructor(entity_otree: EntityOtree, material: Material, pos: Point, diameter: number) {
		super(entity_otree, material, pos);
		this.diameter = diameter;
	}

	get_diameter(): number {
		return this.diameter;
	}

	set_diameter(r: number): number {
		const old_diameter = this.diameter;
		this.diameter = r;
		return old_diameter;
	}

	collision_info(ray: Ray): CollisionInfo|null {
		const raypos = ray.get_pos();
		const raydir = ray.get_dir();
		const la_sphere = new linalg.Sphere(this.pos, this.diameter/2);
		const cross_point = la_sphere.line_intersection({start: raypos, dir: raydir});
		if (cross_point.length == 0)
			return null;

		const normal = cross_point[0].sub(this.pos).scale(2/this.diameter);
		const coll_info = { point: cross_point[0], material: this.material, normal: normal };
		return coll_info;
	}

	get_aabb(): [Point, number] {
		const diameter = this.get_diameter();
		return [
			this.get_pos().sub(point(diameter, diameter, diameter).scale(0.5)),
			diameter
		]
	}
}
