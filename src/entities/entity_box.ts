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
import { Point, Vector, point, vector } from '@app/math/linalg';
import { point_in_space } from '@app/space'; 
import { CollisionInfo } from '@app/entity';
import { BasicEntity } from '@app/entities/entity_basic';
import { Material } from '@app/physics/material';
import * as linalg from '@app/math/linalg';

export class BoxEntity extends BasicEntity {
	private size: number;
	private face_cache: [Point, linalg.Plane][];

	constructor(entity_otree: EntityOtree, material: Material, pos: Point, size: number) {
		super(entity_otree, material, pos);
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

		const size_vec = vector(size, size, size);
		let closest_point_face: [Point, number] = [point(-Infinity,-Infinity,-Infinity), undefined];
		let n_potential_faces = 0;

		for (let [i, face] of this.face_cache.entries()) {
			const cross_point = face[1].line_intersection({start: raypos, dir: raydir}, { allow_infinity: true });
			if (point_in_space(cross_point[0].sub(face[0]), { pos: face[0], size: size_vec })) {
				if (closest_point_face[0].sub(raypos).length_sq() < closest_point_face[0].sub(raypos).length_sq()) {
					closest_point_face[0] = cross_point[0];
					closest_point_face[1] = i;
				}
				n_potential_faces += 1;

				// It is impossible for a line to intersect more than 2 faces
				if (n_potential_faces >= 2)
					break;
			}
		}
		
		const normal = this.face_cache[closest_point_face[1]][1].normal;
		const coll_info = { point: closest_point_face[0], material: this.material, normal: normal };
		return coll_info;
	}

	get_aabb(): [Point, number] {
		const size = this.get_size();
		const hsize = size/2;
		return [
			this.get_pos().sub(point(hsize, hsize, hsize)),
			size
		]
	}

	/** Return (position, normal) pairs for all faces */
	get_faces(): [Point, Vector][] {
		const size = this.get_size();
		const hsize = size/2;
		const pos = this.get_pos();

		return [
			[pos.sub(point(hsize, hsize, hsize)), vector(0, 0, -1)],
			[pos.sub(point(hsize, hsize, hsize)), vector(0, -1, 0)],
			[pos.sub(point(hsize, hsize, hsize)), vector(-1, 0, 0)],
			[pos.sub(point(hsize, hsize, -hsize)), vector(0, 0, 1)],
			[pos.sub(point(hsize, -hsize, hsize)), vector(0, 1, 0)],
			[pos.sub(point(-hsize, hsize, hsize)), vector(1, 0, 0)]
		]
	}

	private cache_faces() {
		const faces = this.get_faces();
		this.face_cache = faces.map((fc) => [fc[0], new linalg.Plane(fc[1], fc[0], { assume_normalized: true })]);
	}
}
