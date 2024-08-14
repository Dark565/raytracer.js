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

import { Point, Vector, point, vector } from '@app/math/linalg';

export interface Space {
	pos: Point;
	size: Vector;
}

export interface AABB {
	pos: Point;
	size: number;
}

export function verify_space(s: Space): void {
	if (s.pos.size != s.size.size)
		throw Error("invalid space; pos and size vectors must be of the same size");
}

export function point_in_space(point: Point, space: Space): boolean {
	verify_space(space);
	if (point.size != space.pos.size)
		throw Error("pos and space got incompatible size parameters");

	for (let i = 0; i < point.size; i++) {
		if (!(point.v[i] >= space.pos.v[i] 
					&& point.v[i] < space.pos.v[i] + space.size.v[i]))
				return false;
	}

	return true;
}

/** Check whether an interior space is fully within an exterior space */
export function space_in_space(exterior: Space, interior: Space): boolean {
	const exterior_end = exterior.pos.add(exterior.size);
	const interior_end = interior.pos.add(interior.size);

	for (let dim = 0; dim < 3; dim++) {
		if (!(interior.pos.v[dim] >= exterior.pos.v[dim] && interior_end.v[dim] < exterior_end.v[dim]))
			return false;
	}

	return true;
}

export function aabb_in_space(aabb: AABB, space: Space): boolean {
	return space_in_space({pos: aabb.pos, size: vector(1,1,1).scale(aabb.size)}, space);
}

/** Get the overlap space of b into a */
export function get_overlap_space(a: Space, b: Space): Space {
	let overlap: Space = { pos: point(NaN,NaN,NaN), size: vector(NaN,NaN,NaN) };
	const a_end = a.pos.add(a.size);
	const b_end = b.pos.add(b.size);

	for (let dim = 0; dim < 3; dim++) {
		const max_point = Math.min(b_end.v[dim], a_end.v[dim]);
		const min_point = Math.max(b.pos.v[dim], a.pos.v[dim]);
		overlap.pos.v[dim] = min_point;
		overlap.size.v[dim] = Math.max(max_point - min_point, 0);
	}

	return overlap;
}

export function aabb_overlap_volume(a: AABB, b: AABB): number {
	const space_a = { pos: a.pos, size: vector(1,1,1).scale(a.size) };
	const space_b = { pos: b.pos, size: vector(1,1,1).scale(b.size) };
	const overlap_space = get_overlap_space(space_a, space_b);
	return overlap_space.size.v.reduce((x, y) => x * y, 1.0);
}
