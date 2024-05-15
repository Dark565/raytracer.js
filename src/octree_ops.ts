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

import { Octree, Octand } from '@app/octree';
import { vector, Vector, Point, Plane, Line, } from '@app/linalg';
import * as space from '@app/space';

/** The geometric parameters of the octree.
 *  The tree node should be interpreted as a big cube consisting of 8 smaller equal-sized cubes (nodes) adjacent to its vertices.
 *  @prop {pos} the position of the root cube's vertex adjacent to the first node.
 *  @prop {size} the size of the root cube's edges.
 */
export interface OctreeDim {
	pos: Point;
	size: number;
}

/** A generator iterating over all (non subtree) octree nodes which are crossed by a line starting at line.start. */
export function* each_cross(octree: Octree, dim: OctreeDim, line: Line): Generator<[Octree,number]> {
}

export function node_at_pos(octree: Octree, dim: OctreeDim, pos: Point): [Octree,number]|undefined {
	if (!space.point_in_space(pos, {pos: dim.pos, size: vector(dim.size,dim.size,dim.size)}))
		return undefined;

	let cur_node = octree;
	let cur_index = 0;
	let next_dim: OctreeDim = { pos: new Vector(dim.pos), size: dim.size };
	let next_node: Octand = cur_node;

	while (next_node instanceof Octree) {
		let rel_pos = pos.sub(next_dim.pos);
		let ind_vec = rel_pos.scale(2/next_dim.size);
		cur_node = next_node;
		cur_index = (ind_vec.z <<2) + (ind_vec.y <<1) + (ind_vec.x <<0);
		next_node = cur_node.get(cur_index);
		next_dim.size /= 2;
		for (let i = 0; i < 3; i++)
			next_dim.pos.v[i] += (ind_vec.v[i] <<0) * next_dim.size;
	}

	return [cur_node,cur_index];
}
