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

/** @file The algorithms for operating on octrees in space */

import { Octree, Octant, OctreePos } from '@app/octree';
import { Vector, Point, Line } from '@app/math/geometry';
import * as intersection from '@app/math/intersection';
import * as vector from '@app/math/vector';
import * as space from '@app/space';

/** The geometric dimensions of the octree.
 *  The tree geometric interpretation is a big cube consisting of 8 smaller equal-sized cubes (nodes) adjacent to its vertices.
 *  @prop {pos} the position of the root cube's vertex adjacent to the first node.
 *  @prop {size} the size of the root cube's edges.
 */
export interface OctreeDim {
	pos: Point;
	size: number;
}

export type SpaceOctreePos<T> = OctreePos<T,OctreeDim>;

export type SpaceOctree<T> = Octree<T,OctreeDim>;
export type SpaceOctant<T> = Octant<T,OctreeDim>;

/** Get the octant adjacent to a given position */
export function octant_adj_pos<T>(octree: SpaceOctree<T>, pos: Point): number {
	const dim = octree.id;
	const h_size = dim.size / 2;

	const [p_x,p_y,p_z] = [Number(pos.v[0] >= dim.pos.v[0]+h_size),
		                     Number(pos.v[1] >= dim.pos.v[1]+h_size),
												 Number(pos.v[2] >= dim.pos.v[2]+h_size)];

	return (p_z <<2) | (p_y <<1) | (p_x);
}

export function octant_at_pos<T>(octree: SpaceOctree<T>, pos: Point, range_cover = space.RangeCoverage.CLOSE_OPEN): number|undefined {
	const dim = octree.id;

	if (!space.point_in_space(pos, {pos: dim.pos, size: vector.scale(vector.vector(1,1,1), dim.size)}, range_cover))
		return undefined;

	return octant_adj_pos(octree, pos);
}

export function node_at_pos<T>(octree: SpaceOctree<T>, pos: Point, flags: { start_from_current?: boolean } = {}, range_cover = space.RangeCoverage.CLOSE_OPEN): SpaceOctreePos<T>|null {
	const dim = octree.id;

	if (pos == undefined)
		return null;

	let cur_node = octree;
	if (!flags.start_from_current)
		cur_node = cur_node.get_root();

	if (!space.point_in_space(pos, {pos: dim.pos, size: vector.scale(vector.vector(1,1,1), dim.size)}, range_cover))
		return null;

	let cur_index = 0;
	let next_dim: OctreeDim = { pos: vector.clone(dim.pos), size: dim.size };
	let next_node: SpaceOctant<T> = cur_node;

	while (next_node instanceof Octree) {
		let rel_pos = vector.sub(pos, next_dim.pos);
		let ind_vec = vector.scale(rel_pos, 2/next_dim.size);
		cur_node = next_node;
		cur_index = (ind_vec.v[2] <<2) + (ind_vec.v[1] <<1) + (ind_vec.v[0] <<0);
		next_node = cur_node.get(cur_index);
		next_dim.size /= 2;
		for (let i = 0; i < 3; i++)
			next_dim.pos.v[i] += (ind_vec.v[i] <<0) * next_dim.size;
	}

	return {
		tree:   cur_node,
		octant: cur_index
	};
}

export function new_subtree<T>(tree: SpaceOctree<T>, n: number, flags: { allow_replace?: boolean } = {}): SpaceOctree<T> {
	if (!flags.allow_replace && tree.get(n) != undefined)
		throw Error("Child already defined");

	const half_size = tree.id.size/2;
	const subdim: OctreeDim = { 
		pos: vector.add(tree.id.pos, vector.scale(vector.vector((n&1), ((n>>1)&1), ((n>>2)&1)), half_size)),
		size: half_size
	};

	const subtree = new Octree<T,OctreeDim>(subdim, tree);
	tree.set(n, subtree);
	return subtree;
}


/* FIXME: Should return the index depending on the real placement in the parent's children nodes,
 * not merely by checking geometry. */
export function index_within_parent<T>(child: SpaceOctree<T>): number|null {
	if (child.index_within_parent != undefined)
		return child.index_within_parent;

	const parent = child.parent;
	if (parent == null)
		return null;

	const rel_pos = vector.sub(child.id.pos, parent.id.pos);
	const ind_vec = vector.scale(rel_pos, 2/parent.id.size);

	return (ind_vec.v[2] <<2) + (ind_vec.v[1] <<1) + (ind_vec.v[0] <<0);
}

export function dim_relative_to_parent<T>(parent: SpaceOctree<T>, n: number): OctreeDim {
	const pdim = parent.id;
	const phsize = pdim.size / 2;
	const [x,y,z] = [ (n>>0) & 1, (n>>1) & 1, (n>>2) & 1 ];

	return {
		pos: vector.add(pdim.pos, vector.scale(vector.vector(x,y,z), phsize)),
		size: phsize
	}
}

/** The output of the OctreeWalker's next() method */
export interface OctreeWalkerNextOutput<T> {
	/** The next node; may be undefined if include_undefined was passed in the flags parameter */
	node?: SpaceOctree<T>;
	/** The position of the next node within the parent tree; undefined if the next node is the tree root. */
	pos?: SpaceOctreePos<T>;
}

/** The entry of the Walker's NodeInfo stack; the stack whose head stores information about the most recently entered node */
interface OctreeWalkerStackElem<T> {
	/** The node */
	tree: SpaceOctree<T>;
	/** Marks whether the node has been already returned by next() */
	was_returned: boolean;
}

export interface OctreeWalkerFlags {
	include_undefined?: boolean
}

/** Octree traversal algorithm */
export class OctreeWalker<T> {
	private tree: SpaceOctree<T>;
	private flags: OctreeWalkerFlags;
	private pos?: Point;
	private direction?: Vector;

	private cur_node?: SpaceOctreePos<T>;
	private next_pos?: [Point, Vector]; // Point and normal
	private cur_returned: boolean;
	private stepped_in: boolean;
	private depth: number;
	/** for optimization; next_pos doesn't need to be recalculated
	if we are already outside (ahead) the subtree. */ 
	private next_pos_is_ahead: boolean;

	constructor(tree: SpaceOctree<T>, start?: Point, start_node?: SpaceOctreePos<T>, direction?: Vector, flags: OctreeWalkerFlags = {}) {
		this.tree = tree;
		this.set_flags(flags);
		this.set_position(start,start_node);
		this.set_direction(direction);

		this.reset_state();
	}

	/** Set current position of the Walker.
	 * 'node' is optional and is used for optimization purposes to avoid scanning for the deepest node at a give position.
	 * If provided, it **SHOULD** be set to the compatible node. 
	 * If 'pos` is out of the tree, the current node is set to the first node (if any) intersected with the 
	 * traversal line. In this scenario, the 'node' parameter is ignored. */
	set_position(pos?: Point, node?: SpaceOctreePos<T>): boolean {
		if (pos == undefined) {
			this.pos = undefined;
			this.cur_node = undefined;
			this.reset_state();
			return true;
		}

		if (node != undefined) {
			this.cur_node = node;
		} else {
			const pos_node = node_at_pos(this.tree, pos);
			this.cur_node = pos_node;
		}

		this.pos = pos;
		return this.setup_cur_node();
	}

	get octree() {
		return this.tree;
	}

	get_position() {
		return this.pos;
	}

	set_direction(dir: Vector) {
		this.direction = dir;
	}

	get_direction() {
		return this.direction;
	}

	set_pos_and_dir(pos: Point, dir: Vector, node?: SpaceOctreePos<T>): boolean {
		this.set_direction(dir);
		return this.set_position(pos, node);
	}

	set_flags(flags: OctreeWalkerFlags) {
		this.flags = Object.assign({}, flags);
	}

	check_sanity() {
		if (this.pos == undefined)
			throw Error(".pos cannot be undefined; call set_position");
	
		if (this.direction == undefined)
			throw Error(".direction cannot be undefined; call set_direction");
	}

	reset_state() {
		this.next_pos = [this.pos, undefined];
		this.cur_returned = false;
		this.stepped_in = false;
		this.next_pos_is_ahead = false;
		this.depth = 0;
	}

  /** Reset the walker's state.
	 *  If cur_node is undefined:
	 *   - set it to the first node (possibly) intersected by the traversal line. */
	setup_cur_node(): boolean {
		this.reset_state();

		if (this.cur_node != undefined)
			return true;

		const dim = this.tree.id;

		const bbox = new intersection.Box(vector.add(dim.pos, vector.scale(vector.vector(0.5,0.5,0.5), dim.size)),
																			vector.scale(vector.vector(1,1,1), dim.size));

		const line = {start: this.pos, dir: this.direction};
		let inter_param = bbox.line_intersection(line, {});
		inter_param = <intersection.IntersectionInfoWithNormal[]> 
			intersection.select_parameters(inter_param, intersection.IntersectionDirection.FORWARD);

		if (inter_param.length == 0)
			return false;

		//inter_param[0].parameter += Number.EPSILON;
		const ipoint = intersection.compute_intersection_point(line, inter_param[0]);
		//const n_octant = octant_adj_pos(this.tree, ipoint);

		//this.cur_node = {tree: this.tree, octant: n_octant};
		this.cur_node = {tree: this.tree, octant: undefined};
		this.next_pos = [ipoint, vector.negate(inter_param[0].normal)];
		return true;
	}

	private step_back() {
		this.stepped_in = true;

		if (this.cur_node.octant == undefined) {
			this.cur_node = undefined;
			this.cur_returned = false;
			return;
		}

		if (this.depth > 0) {
			this.depth--;
			this.cur_returned = true;
		} else {
			this.cur_returned = false;
		}

		const grandparent_rel_i = index_within_parent(this.cur_node.tree);
		if (grandparent_rel_i != undefined) {
			this.cur_node = {
				tree: this.cur_node.tree.parent,
				octant: grandparent_rel_i
			};
		} else {
			this.cur_node = { // this layout means that we are in the root
				tree: this.cur_node.tree,
				octant: undefined
			};
		}
}

	private step_in(node: SpaceOctreePos<T>) {
		this.depth++;
		this.cur_node = node;
		this.cur_returned = false;
	}

	next(): OctreeWalkerNextOutput<T>|undefined {
		this.check_sanity();

		while (this.cur_node != undefined) {
			const last = this.cur_node;
			const last_value = OctreeWalker.space_octree_pos_to_next_output(last);

			if (!this.cur_returned) {
				if (this.flags.include_undefined || last_value.node != undefined) {
					this.cur_returned = true;
					return last_value;
				}
			}

			if (last.octant != undefined) {
				let n_octant: number;

				// We can step in only if next_pos is not ahead a subtree
				if (!this.next_pos_is_ahead) {
					if (!this.stepped_in && last_value.node != undefined) {
						n_octant = octant_adj_pos(last_value.node, this.next_pos[0]);
						this.step_in({tree: last_value.node, octant: n_octant});
						continue;
					}

					this.update_next_pos();
				}

				const cur_octant  = OctreeWalker.octant_number_to_vector(last.octant);
				const next_octant = vector.add(cur_octant, this.next_pos[1]);
				if (!next_octant.v.some(x => x < 0 || x > 1)) {
					n_octant = OctreeWalker.octant_vector_to_number(next_octant);
					this.cur_node = { tree: last.tree, octant: n_octant };
					this.cur_returned = false;
					this.stepped_in = false;
					this.next_pos_is_ahead = false;
					continue;
				} else {
					this.next_pos_is_ahead = true;
				}
			}
			this.step_back();
		}

		return undefined;
	}

	*each_stop(): Generator<OctreeWalkerNextOutput<T>> {
		let node_pos: OctreeWalkerNextOutput<T>;
		while ((node_pos = this.next()) != undefined)
			yield node_pos;
	}

	private update_next_pos() {
		const dim = dim_relative_to_parent(this.cur_node.tree, this.cur_node.octant);
		const bbox = new intersection.Box(vector.add(dim.pos, vector.scale(vector.vector(0.5,0.5,0.5), dim.size)),
																			vector.scale(vector.vector(1,1,1), dim.size));
	
		const line = {start: this.pos, dir: this.direction};

		let inter_param = bbox.line_intersection(line, {}, true);

		// assumption: at least one param MUST be valid!
		const param = inter_param.pop();
		//param.parameter += Number.EPSILON; // EPS is added to the parameter in order to fix node matching

		const ipoint = intersection.compute_intersection_point(line, param);
		this.next_pos = [ipoint, param.normal];
	}

	static space_octree_pos_to_next_output<T>(pos: SpaceOctreePos<T>): OctreeWalkerNextOutput<T> {
		if (pos.octant != undefined) {
			return {
				node: pos.tree.get(pos.octant),
				pos: pos
			};
		} else {
			return {
				node: pos.tree,
				pos: undefined
			};
		}
	}

	private static octant_number_to_vector(octant: number): Vector {
		return vector.vector3(octant & 0x1, (octant >> 1) & 0x1, (octant >> 2) & 0x1);
	}

	private static octant_vector_to_number(octant: Vector): number {
		return octant.v[0] | (octant.v[1] << 1) | (octant.v[2] << 2);
	}

}
