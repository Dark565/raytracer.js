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

/** @file The rendering context of the raytracer */

import { vector } from '@app/math/linalg';
import { Octree } from '@app/octree';
import { SpaceOctree, OctreeWalker, OctreeDim, SpaceOctreePos, node_at_pos } from '@app/octree_space';
import { Entity } from '@app/entity';
import { Space, AABB, aabb_in_space } from '@app/space'

export type EntityOtree       = SpaceOctree<EntitySet>;
export type EntityOtreeWalker = OctreeWalker<EntitySet>;
export type EntityOtreePos    = SpaceOctreePos<EntitySet>;

/** EntitySet is a set of entities */
export class EntitySet {
	/** The EntitySet's octree position */
	private octree_pos?: EntityOtreePos;
	private set: Set<Entity>;

	constructor(octree_pos?: EntityOtreePos) {
		this.octree_pos = octree_pos;
	}

	get_set() {
		return this.set;
	}

	get_octree_pos(): EntityOtreePos {
		return this.octree_pos;
	}
}

export function new_entity_octree(dim: OctreeDim, parent: EntityOtree, entity_set?: EntitySet): EntityOtree {
	return new Octree<EntitySet, OctreeDim>(dim, parent, entity_set ?? new EntitySet);
}

export function new_entity_octree_walker(tree: EntityOtree): EntityOtreeWalker {
	return new OctreeWalker(tree);
}

/** Get the deepest node which can cover an entity (its AABB) in whole */
export function get_covering_node_for_entity(tree: EntityOtree, entity: Entity): EntityOtree|undefined {
	const aabb = entity.get_aabb();
	const aabb_iface: AABB = {pos: aabb[0], size: aabb[1]};
	const deepest_node = node_at_pos(tree, aabb[0]);

	let cur_tree = deepest_node[0];

	do {
		const space = {pos: cur_tree.id.pos, size: cur_tree.id.size};
		if (aabb_in_space(aabb_iface, space))
			break;

		cur_tree = cur_tree.parent;
	} while (cur_tree != undefined);

	return cur_tree;
}

export interface AddEntityToOctreeFlags {
	/** The maximum inside depth of the tree */
	max_in_depth: number,
	/** The maximum outside depth of the tree.
	 * Outside depth is the nodes above the root.
	 * The tree is extended outside if an entity in question 
	 * can't fit the tree.
	 * Set this to 0 to disable this behavior. */
	max_out_depth: number
}

function extend_tree_inside_to_fit_up_to_depth(root: EntityOtree, node: EntityOtree,
																							 aabb: AABB, max_depth: number): EntityOtree {

	let cur_depth = node.get_relative_level(root);
	let cur_node = node;
	while (cur_depth < max_depth) {
		const [x, y, z] = aabb.pos.sub(cur_node.id.pos).scale(cur_node.id.size/2).v.map(x => x << 0);
		const space = {pos: cur_node.id.pos.add(vector(x,y,z).scale(cur_node.id.size/2)), size: vector(1,1,1).scale(cur_node.id.size/2)};

		if (!aabb_in_space(aabb, space))
			break;

		const new_tree = new_entity_octree({pos: space.pos, size: cur_node.id.size/2}, node);
		const node_idx = (z << 2) | (y << 1) | (x << 0);
		cur_node.set(node_idx, new_tree);

		cur_node = new_tree;
		cur_depth++;
	}

	return cur_node;
}

function extend_tree_outside_to_fit_up_to_depth(root: EntityOtree, node: EntityOtree,
																								aabb: AABB, max_depth: number): EntityOtree|undefined {

	// TODO: this

}

/** Add a given entity to the fitting node in the octree, potentially growing the tree */
export function add_entity_to_octree(tree: EntityOtree, entity: Entity, max_levels: number, flags: AddEntityToOctreeFlags): EntityOtree {

	// TODO: this
}
