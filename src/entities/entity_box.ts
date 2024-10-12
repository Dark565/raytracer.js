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
import { Point, Vector, point } from '@app/math/geometry';
import * as vector from '@app/math/vector';
import { CollisionInfo } from '@app/entity';
import { BasicEntity } from '@app/entities/entity_basic';
import { Material } from '@app/material';
import { Texture } from '@app/texture/texture';
import Substance from '@app/substance';
import { Space, point_in_space } from '@app/space';
import * as intersection from '@app/math/intersection';

export class BoxEntity extends BasicEntity {
	private size: number;

	constructor(entity_otree: EntityOtree, material: Material, texture: Texture, substance: Substance, pos: Point, size: number) {
		super(entity_otree, material, texture, substance, pos);
		this.size = size;
	}

	set_size(size: number): number {
		const old_size = this.size;
		this.size = size;
		return old_size;
	}

	get_size(): number {
		return this.size;
	}

	is_within(point: Point): boolean {
		const space: Space = { pos: this.get_pos(), 
			                     size: vector.scale_self(vector.vector3(1,1,1), this.get_size()) };

		return point_in_space(point, space);
	}
	
	collision_info(ray: Ray): CollisionInfo|null {
		const int_ent = new intersection.Box(this.get_pos(), vector.scale_self(vector.vector(1,1,1), this.get_size()));
		const line = {start: ray.get_pos(), dir: ray.get_dir()};

		let params = int_ent.line_intersection(line, {});

		params = <intersection.IntersectionInfoWithNormal[]> 
			intersection.select_parameters(params, intersection.IntersectionDirection.FORWARD);

		if (params.length == 0)
			return undefined;

		const cross_point = intersection.compute_intersection_point(line, params[0]);
		return {
			point: cross_point,
			material: this.get_material(),
			texture: this.get_texture(),
			normal: vector.scale(params[0].normal, -Math.sign(vector.dot(line.dir,params[0].normal)))
		}
	}

	get_aabb(): [Point, number] {
		const size = this.get_size();
		const hsize = size/2;
		return [
			vector.sub(this.get_pos(), point(hsize, hsize, hsize)),
			size
		]
	}

	/** Return (position, normal) pairs for all faces */
	get_faces(): [Point, Vector][] {
		const size = this.get_size();
		const hsize = size/2;
		const pos = this.get_pos();

		return [
			[vector.sub(pos, point(hsize, hsize, hsize)), vector.vector(0, 0, -1)],
			[vector.sub(pos, point(hsize, hsize, hsize)), vector.vector(0, -1, 0)],
			[vector.sub(pos, point(hsize, hsize, hsize)), vector.vector(-1, 0, 0)],
			[vector.sub(pos, point(hsize, hsize, -hsize)), vector.vector(0, 0, 1)],
			[vector.sub(pos, point(hsize, -hsize, hsize)), vector.vector(0, 1, 0)],
			[vector.sub(pos, point(-hsize, hsize, hsize)), vector.vector(1, 0, 0)]
		]
	}

	/** The mapping for the box assumes the texture image is of the 6:1 proportion.
	 *  Faces are mapped in the following order:
	 *  left, right, top, bottom, front, back.
	 */
	map_uv(p: Point): [number, number] {
		// TODO: Implement this function
		return [0,0];
	}
}
