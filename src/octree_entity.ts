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

/** @file Integration of entity with octree */

import { Point, point } from '@app/math/geometry';
import * as vector from '@app/math/vector';
import { Octree } from '@app/octree';
import { SpaceOctree, OctreeWalker, OctreeDim, SpaceOctreePos, node_at_pos } from '@app/octree_space';
import { Entity } from '@app/entity';
import { Space, AABB, aabb_in_space } from '@app/space'
import { clamp } from '@app/math/mathutils';

export type EntityOtree       = SpaceOctree<EntitySet>;
export type EntityOtreeWalker = OctreeWalker<EntitySet>;
export type EntityOtreePos    = SpaceOctreePos<EntitySet>;

/** EntitySet is a set of entities */
export class EntitySet {
	/** The EntitySet's octree position */
	private _octree_pos?: EntityOtreePos;
	private _set: Set<Entity>;

	constructor(octree_pos?: EntityOtreePos) {
		this._octree_pos = octree_pos;
		this._set = new Set;
	}

	get set() {
		return this._set;
	}

	get octree_pos() {
		return this._octree_pos;
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

	if (deepest_node == undefined)
		return undefined;

	let cur_tree = deepest_node.tree;

	do {
		const space = {pos: cur_tree.id.pos, size: vector.scale(vector.vector(1,1,1), cur_tree.id.size)};
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
		const [x, y, z] = vector.scale(vector.sub(aabb.pos, cur_node.id.pos), 2.0/cur_node.id.size).v.map(x => x << 0);
		const space = {pos: vector.add(cur_node.id.pos, vector.scale(vector.vector(x,y,z), cur_node.id.size/2)),
			             size: vector.scale(vector.vector(1,1,1), cur_node.id.size/2)};

		if (!aabb_in_space(aabb, space))
			break;

		const new_tree = new_entity_octree({pos: space.pos, size: cur_node.id.size/2}, cur_node);
		const node_idx = (z << 2) | (y << 1) | (x << 0);
		cur_node.set(node_idx, new_tree);

		cur_node = new_tree;
		cur_depth++;
	}

	return cur_node;
}

export class TreeOutsideGrowError extends Error {
	public abs_root: EntityOtree;

	constructor(abs_root: EntityOtree, msg: string) {
		super(msg);
		this.abs_root = abs_root;
	}
}

function extend_tree_outside_to_fit_up_to_depth(root: EntityOtree, node: EntityOtree,
																								aabb: AABB, max_depth: number): EntityOtree {

		if (node.parent != undefined)
			throw Error("'node' must be the absolute root (i.e no parent)")

		let cur_depth = root.get_relative_level(node);
		let cur_node = node;

		let fit_found = false;

		while (cur_depth < max_depth) {
			const aligned_aabb_node_pos = vector.scale(vector.sub(aabb.pos, cur_node.id.pos), 1.0/cur_node.id.size);
			for (let dim = 0; dim < 3; ++dim)
				aligned_aabb_node_pos.v[dim] = clamp(Math.floor(aligned_aabb_node_pos.v[dim]), -1, 0); 

			const parent_pos = vector.add(cur_node.id.pos, vector.scale(aligned_aabb_node_pos, cur_node.id.size));
			const parent_size = cur_node.id.size*2;
			const cur_idx_within_parent = ((-aligned_aabb_node_pos.v[2]) << 2) |
																	  ((-aligned_aabb_node_pos.v[1]) << 1) |
																		((-aligned_aabb_node_pos.v[0]) << 0);

			console.log(`aabb pos: ${aabb.pos.v}`)
			console.log(`parent_pos: ${parent_pos.v}`);
			console.log(`node_pos: ${cur_node.id.pos.v}`);
			console.log(`cur_idx_within_parent: ${cur_idx_within_parent}`);

			const new_parent = new_entity_octree({pos: parent_pos, size: parent_size}, undefined);

			new_parent.set(cur_idx_within_parent, cur_node);
			cur_node.parent = new_parent;

			cur_node = new_parent;

			if (aabb_in_space(aabb, { pos: parent_pos, size: vector.scale(vector.vector(1,1,1), parent_size) })) {
				fit_found = true;
				break;
			}

			cur_depth++;
		}

		if (!fit_found)
			throw new TreeOutsideGrowError(cur_node, "The tree outside-depth limit exceeded");

		return cur_node;
}

/** Add a given entity to the fitting node in the octree, potentially altering the tree */
export function add_entity_to_octree(tree: EntityOtree, entity: Entity, config: AddEntityToOctreeFlags): EntityOtree {
	const ent_aabb = entity.get_aabb();
	const ent_aabb_iface: AABB = { pos: ent_aabb[0], size: ent_aabb[1] } ;
	let fitting_node = get_covering_node_for_entity(tree, entity);
	// entity can't fit the tree
	if (fitting_node == undefined) {
		const abs_root = tree.get_root();
		fitting_node = extend_tree_outside_to_fit_up_to_depth(tree, abs_root, ent_aabb_iface, config.max_out_depth);
	}

	fitting_node = extend_tree_inside_to_fit_up_to_depth(tree, fitting_node, ent_aabb_iface, config.max_in_depth);
	entity.set_octree(fitting_node);

	return fitting_node;
}

/** Depth-first entity search. */
export function entity_at_pos(tree: EntityOtree, point: Point): Entity {
	// TODO: Optimize it to start from a given node
	let cur_node = (node_at_pos(tree, point) ?? {}).tree;
	while (cur_node != undefined) {
		for (let entity of cur_node.value.set) {
			if (entity.is_within(point))
				return entity;
		}
		cur_node = cur_node.parent;
	}
	return undefined;
}
