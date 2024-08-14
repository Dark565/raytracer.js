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
	private radius: number;

	constructor(entity_otree: EntityOtree, material: Material, pos: Point, radius: number) {
		super(entity_otree, material, pos);
		this.radius = radius;
	}

	get_radius(): number {
		return this.radius;
	}

	set_radius(r: number): number {
		const old_radius = this.radius;
		this.radius = r;
		return old_radius;
	}

	collision_info(ray: Ray): CollisionInfo|null {
		const raypos = ray.get_pos();
		const raydir = ray.get_dir();
		const la_sphere = new linalg.Sphere(this.pos, this.radius);
		const cross_point = la_sphere.line_intersection({start: raypos, dir: raydir});
		if (cross_point == null)
			return null;

		const normal = cross_point[0].sub(this.pos).scale(1/this.radius);
		const coll_info = { point: cross_point[0], material: this.material, normal: normal };
		return coll_info;
	}

	get_aabb(): [Point, number] {
		const radius = this.get_radius();
		return [
			this.get_pos().sub(point(radius, radius, radius)),
			radius * 2
		]
	}
}
