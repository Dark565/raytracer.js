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
import { Point, point } from '@app/math/geometry';
import * as vector from '@app/math/vector';
import { uv_map_sphere } from '@app/math/uv_mapping';
import { CollisionInfo } from '@app/entity';
import { BasicEntity } from '@app/entities/entity_basic';
import { Material } from '@app/material';
import { Texture } from '@app/texture/texture';
import { Sphere, select_parameters, compute_intersection_point, IntersectionDirection } from '@app/math/intersection';

export class SphereEntity extends BasicEntity {
	private diameter: number;
	private sphere_math: Sphere;

	constructor(entity_otree: EntityOtree, material: Material, texture: Texture, pos: Point, diameter: number) {
		super(entity_otree, material, texture, pos);
		this.diameter = diameter;
		this.sphere_math = new Sphere(this.pos, this.diameter/2);
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
		const line = {start: raypos, dir: raydir};

		let cross_param = this.sphere_math.line_intersection(line);
		cross_param = select_parameters(cross_param, IntersectionDirection.FORWARD);

		if (cross_param.length == 0)
			return null;

		const cross_point = compute_intersection_point(line, cross_param[0]);

		const normal = vector.scale(vector.sub(cross_point, this.pos), 2/this.diameter);
		const coll_info = { point: cross_point, material: this.material, texture: this.texture, normal: normal };
		return coll_info;
	}

	get_aabb(): [Point, number] {
		const diameter = this.get_diameter();
		return [
			vector.sub(this.get_pos(), vector.scale(point(diameter,diameter,diameter),0.5)),
			diameter
		]
	}

	map_uv(p: Point): [number, number] {
		const dist = vector.sub(p, this.pos);
		return uv_map_sphere(<vector.Vector3> dist);
	}
}
