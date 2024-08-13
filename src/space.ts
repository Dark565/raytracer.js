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

import { Point, Vector, vector } from '@app/math/linalg';

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

export function aabb_in_space(aabb: AABB, space: Space): boolean {
	for (let vtx = 0; vtx < 8; vtx++) {
		const [x, y, z] = [vtx & 0x1, (vtx & 0x2) >> 1, (vtx & 0x3) >> 2];
		const vtx_pos = aabb.pos.add(vector(x,y,z).scale(aabb.size));
		if (!point_in_space(vtx_pos, space))
			return false;
	}
	return true;
}
