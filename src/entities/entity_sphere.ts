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
import { Point, point, IntersectionDirection } from '@app/math/linalg';
import { CollisionInfo } from '@app/entity';
import { BasicEntity } from '@app/entities/entity_basic';
import { Material } from '@app/material';
import { Texture } from '@app/texture/texture';
import * as linalg from '@app/math/linalg';

export class SphereEntity extends BasicEntity {
	private diameter: number;
	private sphere_math: linalg.Sphere;

	constructor(entity_otree: EntityOtree, material: Material, texture: Texture, pos: Point, diameter: number) {
		super(entity_otree, material, texture, pos);
		this.diameter = diameter;
		this.sphere_math = new linalg.Sphere(this.pos, this.diameter/2);
	}

	get_diameter(): number {
		return this.diameter;
	}

	set_diameter(d: number): number {
		const old_diameter = this.diameter;
		this.diameter = d;
		this.sphere_math.radius = d/2;
		return old_diameter;
	}

	set_position(p: Point): Point {
		const old_pos = this.pos;
		this.pos = p;
		this.sphere_math.pos = p;
		return old_pos;
	}

	collision_info(ray: Ray): CollisionInfo|null {
		const raypos = ray.get_pos();
		const raydir = ray.get_dir();
		const cross_point = this.sphere_math.line_intersection({start: raypos, dir: raydir},
                                                    { intersection_direction: IntersectionDirection.FORWARD });

		if (cross_point.length == 0)
			return null;

		const normal = cross_point[0].sub(this.pos).scale(2/this.diameter);
		const coll_info = { point: cross_point[0], material: this.material, texture: this.texture, normal: normal };
		return coll_info;
	}

	get_aabb(): [Point, number] {
		const diameter = this.get_diameter();
		return [
			this.get_pos().sub(point(diameter, diameter, diameter).scale(0.5)),
			diameter
		]
	}

	map_uv(p: Point): [number, number] {
		const dist = p.sub(this.pos);
		/* EPSILON is subtracted to ensure the resulting u,v are in range <-eps, 1) */
		const u = Math.atan2(dist.v[1], dist.v[0])/Math.PI/2.0 + 0.5 - Number.EPSILON;
		const v = Math.atan2(dist.v[2], dist.reduce(2).length())/Math.PI + 0.5 - Number.EPSILON;

		return [u,v];
	}
}
