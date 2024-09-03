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
import { point_in_space } from '@app/space'; 
import { CollisionInfo } from '@app/entity';
import { BasicEntity } from '@app/entities/entity_basic';
import { Material } from '@app/material';
import { Texture } from '@app/texture/texture';
import { Plane } from '@app/math/intersection';

export class BoxEntity extends BasicEntity {
	private size: number;
	private face_cache: [Point, Plane][];

	constructor(entity_otree: EntityOtree, material: Material, texture: Texture, pos: Point, size: number) {
		super(entity_otree, material, texture, pos);
		this.size = size;
		this.cache_faces();
	}

	set_pos(pos: Point): Point {
		const old_pos = this.get_pos();
		this.pos = pos;
		this.cache_faces();
		return old_pos;
	}

	set_size(size: number): number {
		const old_size = this.size;
		this.size = size;
		this.cache_faces();
		return old_size;
	}

	get_size(): number {
		return this.size;
	}

	/** TODO: Optimize this function to avoid checking all (in the worst case) faces for intersection */
	collision_info(ray: Ray): CollisionInfo|null {
		const raypos = ray.get_pos();
		const raydir = ray.get_dir();

		const size = this.get_size();

		const size_vec = vector.vector(size, size, size);
		let closest_point_face: [Point, number] = [point(-Infinity,-Infinity,-Infinity), undefined];
		let n_potential_faces = 0;

		for (let [i, face] of this.face_cache.entries()) {
			const cross_point = face[1].line_intersection({start: raypos, dir: raydir}, { allow_infinity: true });
			//console.log(`SquareEntity.collision_info(): cross_point ${cross_point[0].v}`);
			//console.log(`SquareEntity.collision_info(): cross_point_face_rel ${cross_point[0].sub(face[0]).v}`);
			//console.log(`SquareEntity.collision_info(): face ${face[0].v} ${size_vec.v}`);
			if (point_in_space(vector.sub(cross_point[0], face[0]), { pos: face[0], size: size_vec })) {
				if (vector.length_sq(vector.sub(closest_point_face[0], raypos)) < vector.length_sq(vector.sub(closest_point_face[0], raypos))) {
					closest_point_face[0] = cross_point[0];
					closest_point_face[1] = i;
				}
				n_potential_faces += 1;

				// It is impossible for a line to intersect more than 2 faces
				if (n_potential_faces >= 2)
					break;
			}
		}
		
		if (closest_point_face[1] == undefined) {
			//console.log("SquareEntity.collision_info(): no collision");
			return null;
		}

		const normal = this.face_cache[closest_point_face[1]][1].normal;
		const coll_info = { point: closest_point_face[0], material: this.material, texture: this.texture, normal: normal };
		return coll_info;
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
		throw Error("tbi");
	}

	private cache_faces() {
		const faces = this.get_faces();
		this.face_cache = faces.map((fc) => [fc[0], new Plane(fc[1], fc[0], { assume_normalized: true })]);
	}
}
