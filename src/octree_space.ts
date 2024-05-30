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

import { Octree, Octand } from '@app/octree';
import { NODE_ORDER_MAP, NODE_ORDERS } from '@app/octree_const';
import { vector, Vector, Point, Plane, Line, } from '@app/linalg';
import * as space from '@app/space';

/** The geometric dimensions of the octree.
 *  The tree node should be interpreted as a big cube consisting of 8 smaller equal-sized cubes (nodes) adjacent to its vertices.
 *  @prop {pos} the position of the root cube's vertex adjacent to the first node.
 *  @prop {size} the size of the root cube's edges.
 */
export interface OctreeDim {
	pos: Point;
	size: number;
}

export type SpaceOctree<T> = Octree<T,OctreeDim>;
export type SpaceOctand<T> = Octand<T,OctreeDim>;

export function node_at_pos<T>(octree: SpaceOctree<T>, dim: OctreeDim, pos: Point): [SpaceOctree<T>,number]|null {
	if (!space.point_in_space(pos, {pos: dim.pos, size: vector(dim.size,dim.size,dim.size)}))
		return null;

	let cur_node = octree;
	let cur_index = 0;
	let next_dim: OctreeDim = { pos: new Vector(dim.pos), size: dim.size };
	let next_node: SpaceOctand<T> = cur_node;

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

export function index_within_parent<T>(child: SpaceOctree<T>): number {
	const parent = child.parent;
	if (parent == null)
		throw Error("the child is orphaned");

	const rel_pos = child.id.pos.sub(parent.id.pos);
	const ind_vec = rel_pos.scale(2/parent.id.size);

	return (ind_vec.z <<2) + (ind_vec.y <<1) + (ind_vec.x <<0);
}

export interface OctreeWalkerCursor<T> {
	tree: SpaceOctree<T>;
	//node: number;
	start_point?: Point;
	direction?: Vector;
	cross_logic?: { logic: number, order: number[] }, 
}

export class OctreeWalker<T> {
	private tree: SpaceOctree<T>;
	private cursor: OctreeWalkerCursor<T>;
	private dim: OctreeDim;

	constructor(tree: SpaceOctree<T>, dim: OctreeDim, start_point?: Point, direction?: Vector) {
		this.tree = tree;
		this.dim = dim;
		let point_node = node_at_pos(tree, dim, start_point);

		this.cursor = { 
			tree: point_node[0],
			//node: point_node[1],
			start_point: start_point,
			direction: direction
		};
	}

	set start_point(point: Point) {
		this.cursor.start_point = point;
	}

	set direction(dir: Vector) {
		this.cursor.direction = dir;
	}

	get start_point() {
		return this.cursor.start_point;
	}

	get direction() {
		return this.cursor.direction;
	}

	next(flags?: { include_undefined?: boolean }): [SpaceOctree<T>,number]|null {
		this.prepare_to_walk();

		let next_index: number;

		do {
			while ((next_index = this.order_shift_next()) != null) {
				const child = this.cursor.tree.get(next_index);
				if (this.is_crossed(next_index) && (flags.include_undefined || child != undefined)) {
					if (child instanceof Octree)
						this.step_in(child);
					else
						return [this.cursor.tree,next_index];
				}
			}
		} while (this.step_back());

		return null;
	}

	*each_cross(flags?: { include_undefined?: boolean }) {
		let next_node: [SpaceOctree<T>, number];
		while ((next_node = this.next(flags)) != null)
			yield next_node;
	}

	*[Symbol.iterator]() {
		yield* this.each_cross();
	}

	private set_cursor_tree(tree: SpaceOctree<T>) {
		this.cursor.tree = tree;
		this.cursor.cross_logic = undefined;
		this.setup_order();
	}

	private prepare_to_walk() {
		if (this.cursor.start_point == undefined)
			throw Error("start_point undefined; please set start_point");

		if (this.cursor.direction == undefined)
			throw Error("direction undefined; please set direction");

		this.reset_cursor_tree_if_invalid();
		this.prepare_order();
	}

	/* TODO: Handle node searching if this.cursor.node is undefined */
	private reset_cursor_tree_if_invalid() {
		if (!this.cursor.tree.is_invalid())
			return;

		let tree: SpaceOctree<T>;
		let prev_tree = this.cursor.tree;
		do {
			tree = prev_tree;
			prev_tree = tree.parent;
		} while (prev_tree != null && prev_tree.is_invalid());

		if (prev_tree == null)
			throw Error("there is no valid ancestor to return to");

		let new_cur_node = node_at_pos(tree, this.dim, this.cursor.start_point);
		if (new_cur_node != null) {
			this.cursor.tree = new_cur_node[0];
		} else {
			this.cursor.tree = prev_tree;
		}

		this.cursor.cross_logic = undefined;
	}

	private prepare_order() {
		if (this.cursor.cross_logic != undefined)
			return;

		this.setup_order();
	}

	/* TODO: Handle order turn */
	private setup_order() {
		console.assert(this.cursor.tree != undefined);
		console.assert(this.cursor.start_point != undefined);
		console.assert(this.cursor.direction != undefined);

		const tree = this.cursor.tree;
		const half_size = tree.id.size/2;
		const mid_point = tree.id.pos.add(vector(half_size, half_size, half_size));
		const line: Line = { start: this.cursor.start_point, dir: this.cursor.direction };

		let logic_vec = 0;
		[[1,2],[0,2],[0,1]].forEach((x,i) => {
			const axis_bit = 1<<i;
			const plane = new Plane(vector(axis_bit&1, axis_bit&2, axis_bit&4), mid_point);
			const cross_point = plane.line_cross_point(line);
			const a1_ae_middle = (cross_point[0].v[x[0]] >= mid_point.v[x[0]]);
			const a2_ae_middle = (cross_point[0].v[x[1]] >= mid_point.v[x[1]]);
			const a1_of = (Math.abs(cross_point[0].v[x[0]] - mid_point.v[x[0]]) >= half_size);
			const a2_of = (Math.abs(cross_point[0].v[x[1]] - mid_point.v[x[1]]) >= half_size);
			logic_vec |= (Number(a1_ae_middle) | (Number(a2_ae_middle) << 1)) << (i << 1);
			logic_vec |= Number(a1_of || a2_of) << (6 + i);
		});

		const order_index = Number((NODE_ORDER_MAP >> BigInt(logic_vec << 1)) & BigInt(0x3));
		const order_sequence = NODE_ORDERS[order_index];
		this.cursor.cross_logic = { logic: logic_vec, order: order_sequence.slice() };
	}

	private is_crossed(n: number): boolean {
		if (!Octree.is_at_bounds(n))
			throw Error("child index out of bounds");

		const logic = this.cursor.cross_logic.logic;

    const p_yz  = logic & 0x3;
    const p_xz  = logic>>2 & 0x3;
    const p_xy  = logic>>4 & 0x3;
    const of_yz = Boolean(logic & 0x40);
    const of_xz = Boolean(logic & 0x80);
    const of_xy = Boolean(logic & 0x100);

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
			throw Error("child index out of bounds");

		let ord_arr = this.cursor.cross_logic.order;
		for (let i = 0; i < n; i++)
			ord_arr.shift();
	}

	/** Step back to the first tree of interest. */
	private step_back(): SpaceOctree<T>|null {
		let parent: SpaceOctree<T>;

		while ((parent = this.cursor.tree.parent) != null) {
			const cur_tree_index = index_within_parent(this.cursor.tree);
			this.set_cursor_tree(parent);
			this.order_shift_n_elem(cur_tree_index + 1);
			if (this.cursor.cross_logic.order.length > 0)
				return parent;
		}
		return null;
	}

	/* Step inside a subtree. */
	private step_in(subtree: SpaceOctree<T>) {
		this.set_cursor_tree(subtree);
	}
}
