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

import { EntitySet, EntityOtree } from '@app/context';
import { Ray } from '@app/raytracer';
import { Point } from '@app/math/linalg';
import { CollisionInfo } from '@app/entity';
import { BasicEntity } from '@app/entities/entity_basic';
import { Material } from '@app/physics/material';
import * as linalg from '@app/math/linalg';

/* FIXME:
 * Entities can encompass multiple octree nodes (entity sets).
 * 1st approach (complex, would provide good culling for high tree heights, but requires a lot of computation while refreshing):
 *    take two AABB-s: the interior and the exterior.
 *    Produce the interior and exterior node sets, each one including the nodes intersected by the particular AABB.
 *    Subtract the exterior and interior node sets - the resulting one roughly includes the nodes of interest.
 *
 * 2nd approach (reasonably best, but will show the main con of octrees in non-voxel related scenarios: inefficiency when object alignment is odd):
 *    refactor the octree implementation to allow adding elements at nodes themselves, not just octants and
 *    put oddly aligned/sized entities in nodes completely encompassing them.
 *
 * 3nd approach (simplest and best for the scope of the project) Keep octree implementation as-is, but enforce a proper alignment and size (one per a node) for all entities.
 *
 * 4th approach (DO NOT!): implement BVH or KD-trees.
 */


export class SphereEntity extends BasicEntity {
	private radius: number;

	constructor(entity_otree: EntityOtree, material: Material, pos: Point, radius: number) {
		throw new Error("Currently unimplemented!");

		//super(entity_otree, material, pos);
		//this.radius = radius;
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

	protected refresh_introspection_data() {
		// to implement
	}
}
