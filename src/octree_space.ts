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
import { NODE_ORDER_MAP, NODE_ORDERS } from '@app/octree_const';
import { Vector, Point, Line } from '@app/math/geometry';
import { Plane, IntersectionDirection } from '@app/math/intersection';
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

export function node_at_pos<T>(octree: SpaceOctree<T>, pos: Point, flags: { start_from_current?: boolean } = {}): SpaceOctreePos<T>|null {
	const dim = octree.id;

	if (pos == undefined)
		return null;

	let cur_node = octree;
	if (!flags.start_from_current)
		cur_node = cur_node.get_root();

	if (!space.point_in_space(pos, {pos: dim.pos, size: vector.scale(vector.vector(1,1,1), dim.size)}))
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

	const subtree = new Octree<T,OctreeDim>(subdim);
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

/** The output of the OctreeWalker's next() method */
export interface OctreeWalkerNextOutput<T> {
	/** The next node; may be undefined if include_undefined was passed in the flags parameter */
	node?: SpaceOctree<T>;
	/** The position of the next node within the parent tree; undefined if the next node is the tree root. */
	pos?: SpaceOctreePos<T>;
}

/** OctreeWalker cursor state */
interface OctreeWalkerCursor<T> {
	/** The current tree at the cursor's position */
	tree?: SpaceOctree<T>;
	/** The current node at the cursor's position */
	node?: number;
	/** The start point of the ray */
	start_point?: Point;
	/** The direction of the ray */
	direction?: Vector;
	/** A function which alters the order array */
	order_prepare_fn: (ord: number[]) => number[];
	/** Information about intersections at the current tree */
	cross_logic?: { logic: number, order: number[] };
	/** Marks whether the current tree has been already returned */
	was_returned: boolean;
}

/** The entry of the Walker's NodeInfo stack; the stack whose head stores information about the most recently entered node */
interface OctreeWalkerNodeInfo<T> {
	/** The node */
	tree: SpaceOctree<T>;
	/** Information about intersections at the node */
	cross_logic: { logic: number, order: number[] };
	/** Marks whether the node has been already returned by next() */
	was_returned: boolean;
}

/* TODO: Implement cross logic stack for the walker

/** A linear memory and logarithmic time complexity algorithm for Octree ray-casting */
export class OctreeWalker<T> {
	private tree: SpaceOctree<T>;
	private cursor: OctreeWalkerCursor<T>;
	private info_stack: OctreeWalkerNodeInfo<T>[];

	constructor(tree: SpaceOctree<T>, start_point?: Point, direction?: Vector) {
		this.tree = tree;
		this.info_stack = [];

		this.cursor = {
			order_prepare_fn: OctreeWalker.order_prepare_default,
			was_returned: false
		};

		this.start_point = start_point;
		this.direction   = direction;
	}

	set start_point(point: Point) {
		this.go_to_point(point);
		this.cursor.start_point = point;
	}

	set_start_point(point: Point, node: SpaceOctreePos<T>) {
		this.go_to_point(point, node);
		this.cursor.start_point = point;
	}

	private static order_prepare_default(ord: number[]): number[] { /* console.log("setting default order"); */ return ord; }
	private static order_prepare_reverse(ord: number[]): number[] { /* console.log("setting reverse order"); */ return ord.reverse(); }

	set direction(dir: Vector) {
		this.deprecate_cursor_logic();
		this.cursor.direction = dir;
		if (dir != undefined) {
			const dir_prepare_fns = [OctreeWalker.order_prepare_default, OctreeWalker.order_prepare_reverse];
			this.cursor.order_prepare_fn = dir_prepare_fns[Number(dir.v[2] < 0) | Number(dir.v[1] < 0)];
		}
	}

	get start_point() {
		return this.cursor.start_point;
	}

	get direction() {
		return this.cursor.direction;
	}

	next(flags: { include_undefined?: boolean } = {}): OctreeWalkerNextOutput<T>|undefined {
		this.prepare_to_walk();

		let next_index: number;
		do {
			if (this.cursor.tree.is_invalid())
				continue;

			while ((next_index = this.order_shift_next()) != null) {
				const tree = this.cursor.tree;
				const child = tree.get(next_index);
				if (this.is_crossed(next_index) && (flags.include_undefined || child != undefined)) {
					if (child instanceof Octree) {
						this.step_in(child);
					} else {
						this.cursor.node = next_index;
					}

					return {
						node:   child,
						pos: { tree: tree, octant: next_index }
					};
				}
			}

			if (!this.cursor.was_returned) {
				const tree_pos_idx = index_within_parent(this.cursor.tree);
				const res_pos = tree_pos_idx != undefined 
					? { tree: this.cursor.tree.parent, octant: tree_pos_idx } : undefined;

				this.cursor.was_returned = true;
				return {
					node: this.cursor.tree,
					pos: res_pos
				}
			}

		} while (this.step_back());

		return null;
	}

	*each_cross(flags: { include_undefined?: boolean } = {}) {
		let next_node: OctreeWalkerNextOutput<T>;
		while ((next_node = this.next(flags)) != null)
			yield next_node;
	}

	/** Sets the current walker position to the subtree and node covering the specified point.
	 *  If the point is out of the tree, the posision is set to the outermost tree and undefined node.
	 *  This function automatically deprecates the cursor logic and the stack.
	 *  @arg point The point to go.
	 *  @arg node Optional. If it is used as an optimization to avoid node finding at the specified point.
	 *             The node is **expected** to match the specified point! */
	go_to_point(point: Point, node?: SpaceOctreePos<T>): boolean {
		let pos_node: SpaceOctreePos<T> = undefined;
		/* Try the tree at the cursor first to optimize traversal out */
		if (node != undefined) {
			pos_node = node;
		} else {
			for (let start_from_current of [true, false]) {
				pos_node = node_at_pos(this.tree, point, { start_from_current: start_from_current });
				if (pos_node != undefined)
					break;
			}
		}

		this.deprecate_cursor_logic();

		this.cursor.was_returned = false;
		this.deprecate_stack();

		if (pos_node == undefined) {
			this.cursor.tree = this.tree;
			this.cursor.node = undefined;
			return false;
		}

		this.cursor.tree = pos_node.tree;
		this.cursor.node = pos_node.octant;
		return true;
	}

	private validate_cursor_state() {
		if (this.cursor.tree != undefined && this.cursor.cross_logic != undefined)
			return;

		this.modify_cursor_logic(this.cursor.tree || this.tree, this.cursor.node);
	}

	/** Set the cursor position to the specified tree and node and refresh the cursor logic (logic_vec and order).
	 *  The order will start at a node `node` or after that node if `flags.exclude_node` is true. */
	private modify_cursor_logic(tree: SpaceOctree<T>, node: number, flags: { exclude_node?: boolean } = {} ) {
		this.cursor.tree = tree;
		this.cursor.node = node;
		this.cursor.cross_logic = undefined;
		this.setup_order();
		if (flags.exclude_node && this.cursor.cross_logic.order[0] == node) {
			this.cursor.cross_logic.order.shift();
			this.cursor.node = this.cursor.cross_logic.order[0];
		}
	}

	private pop_info_stack(flags: { exclude_node?: boolean } = {}): boolean {
		const info = this.info_stack.pop();
		if (info == undefined)
			return false;

		this.cursor.tree = info.tree;
		this.cursor.node = info.cross_logic.order[0];
		this.cursor.cross_logic = info.cross_logic;
		if (flags.exclude_node) {
			this.cursor.cross_logic.order.shift();
			this.cursor.node = this.cursor.cross_logic.order[0];
		}
	}

	/** Pack and push current cross_logic on the NodeInfo stack */
	private push_info_stack() {
		const entry: OctreeWalkerNodeInfo<T> = {
			tree: this.cursor.tree,
			cross_logic: this.cursor.cross_logic,
			was_returned: this.cursor.was_returned
		};

		this.info_stack.push(entry);
	}

	private deprecate_stack() {
		this.info_stack = []
	}

	private deprecate_cursor_logic() {
		this.cursor.cross_logic = undefined;
	}

	private prepare_to_walk() {
		if (this.cursor.start_point == undefined)
			throw Error("start_point undefined; please set start_point");

		if (this.cursor.direction == undefined)
			throw Error("direction undefined; please set direction");

		this.validate_cursor_state();
	}

	private static PLANE_PAIRS = [[1,2],[0,2],[0,1]];

	public static profile_times = [0,0,0];

	/* FIXME: Kinda working, but still have to implement a proper handling of the middle cross situation */
	private setup_order() {
		const tree = this.cursor.tree;
		const half_size = tree.id.size/2;
		const half_size_negative = -half_size;
		const mid_point = vector.add(tree.id.pos, vector.vector(half_size, half_size, half_size));
		const line: Line = { start: this.cursor.start_point, dir: this.cursor.direction };

		let logic_vec = 0;

		const fill_logic_vec_for_planes = (axis1: number, axis2: number, plane_i: number) => {
			const axis_bit = 1<<plane_i;
			const plane = new Plane(vector.vector(axis_bit&1, axis_bit&2, axis_bit&4), mid_point, { assume_normalized: true });
			const cross_point = plane.line_intersection(line, { allow_infinity: true, intersection_direction: IntersectionDirection.BOTH });

			const probe_point = cross_point[0];
			const axis1_mid_dist = probe_point.point.v[axis1] - mid_point.v[axis1];
			const axis2_mid_dist = probe_point.point.v[axis2] - mid_point.v[axis2];

			const a1_ae_middle = axis1_mid_dist >= 0;
			const a2_ae_middle = axis2_mid_dist >= 0;
			const a1_of = (axis1_mid_dist > half_size || axis1_mid_dist < half_size_negative);
			const a2_of = (axis2_mid_dist > half_size || axis2_mid_dist < half_size_negative);

			logic_vec |= (Number(a1_ae_middle) | (Number(a2_ae_middle) << 1)) << (plane_i << 1);
			logic_vec |= Number(a1_of || a2_of) << (6 + plane_i);
		}

		fill_logic_vec_for_planes(1, 2, 0);
		fill_logic_vec_for_planes(0, 2, 1);
		fill_logic_vec_for_planes(0, 1, 2);

		const order_index = Number((NODE_ORDER_MAP >> BigInt(logic_vec << 1)) & BigInt(0x3));
		let order_sequence = this.cursor.order_prepare_fn(NODE_ORDERS[order_index].slice());
		this.cursor.cross_logic = { logic: logic_vec, order: order_sequence };
		this.order_shift_until(this.cursor.node);
	}

	private is_crossed(n: number): boolean {
		if (!Octree.is_at_bounds(n))
			throw Error(`child index (${n} out of bounds`);

		const logic = this.cursor.cross_logic.logic;

		//console.log(`cross logic for ${n}: ${logic.toString(2).padStart(9,'0')}`)

    const p_yz  = logic & 0x3;
    const p_xz  = logic>>2 & 0x3;
    const p_xy  = logic>>4 & 0x3;
    const of_yz = Boolean(logic & 0x40);
    const of_xz = Boolean(logic & 0x80);
    const of_xy = Boolean(logic & 0x100);

		//console.log(`p_yz: ${p_yz}`)
		//console.log(`p_xz: ${p_xz}`)
		//console.log(`p_xy: ${p_xy}`)
		//console.log(`of_yz: ${of_yz}`)
		//console.log(`of_xz: ${of_xz}`)
		//console.log(`of_xy: ${of_xy}`)

		const s_yz = n>>1 & 3;
		const s_xz = (n>>1 & 2) | (n&1);
		const s_xy = n&3;

		return (p_xz == s_xz && (!of_xz || p_yz == s_yz)) 
			  || (p_yz == s_yz && (!of_yz || p_xy == s_xy))
				|| (p_xy == s_xy && (!of_xy || p_xz == s_xz));
	}

	private order_shift_next(): number|null {
		return this.cursor.cross_logic.order.shift();
	}

	private order_shift_n_elem(n: number) {
		if (!Octree.is_at_bounds(n))
			return;

		let ord_arr = this.cursor.cross_logic.order;
		for (let i = 0; i < n; i++)
			ord_arr.shift();
	}

	private order_shift_until(n: number) {
		const n_index = this.cursor.cross_logic.order.indexOf(n);
		this.order_shift_n_elem(n_index);
	}

	/** Step back to the previous tree. */
	private step_back(): SpaceOctree<T>|null {
		let parent: SpaceOctree<T>;

		if (this.pop_info_stack({ exclude_node: true }))
			return this.cursor.tree;

		if ((parent = this.cursor.tree.parent) != null) {
			const cur_tree_index = index_within_parent(this.cursor.tree);
			this.modify_cursor_logic(parent, cur_tree_index, { exclude_node: true });
			return parent;
		}
	}

	/* Step inside a subtree. */
	private step_in(subtree: SpaceOctree<T>) {
		this.push_info_stack();
		this.modify_cursor_logic(subtree, undefined);
		this.cursor.was_returned = true;
	}
}
