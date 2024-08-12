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

import { Octree, Octant } from '@app/octree';
import { NODE_ORDER_MAP, NODE_ORDERS } from '@app/octree_const';
import { vector, Vector, Point, Plane, Line, } from '@app/math/linalg';
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

export type SpaceOctree<T> = Octree<T,OctreeDim>;
export type SpaceOctant<T> = Octant<T,OctreeDim>;

export function node_at_pos<T>(octree: SpaceOctree<T>, dim: OctreeDim, pos: Point): [SpaceOctree<T>,number]|null {
	if (pos == undefined || !space.point_in_space(pos, {pos: dim.pos, size: vector(dim.size,dim.size,dim.size)}))
		return null;

	let cur_node = octree;
	let cur_index = 0;
	let next_dim: OctreeDim = { pos: new Vector(dim.pos), size: dim.size };
	let next_node: SpaceOctant<T> = cur_node;

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

export function new_subtree<T>(tree: SpaceOctree<T>, n: number, flags: { allow_replace?: boolean } = {}): SpaceOctree<T> {
	if (!flags.allow_replace && tree.get(n) != undefined)
		throw Error("Child already defined");

	const half_size = tree.id.size/2;
	const subdim: OctreeDim = { 
		pos: tree.id.pos.add(vector((n&1), ((n>>1)&1), ((n>>2)&1)).scale(half_size)),
		size: half_size
	};

	const subtree = new Octree<T,OctreeDim>(subdim);
	tree.set(n, subtree);
	return subtree;
}

export function index_within_parent<T>(child: SpaceOctree<T>): number {
	const parent = child.parent;
	if (parent == null)
		throw Error("the child is orphaned");

	const rel_pos = child.id.pos.sub(parent.id.pos);
	const ind_vec = rel_pos.scale(2/parent.id.size);

	return (ind_vec.z <<2) + (ind_vec.y <<1) + (ind_vec.x <<0);
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
}

/** A linear memory and logarithmic time complexity algorithm for Octree ray-casting */
export class OctreeWalker<T> {
	private tree: SpaceOctree<T>;
	private cursor: OctreeWalkerCursor<T>;

	constructor(tree: SpaceOctree<T>, start_point?: Point, direction?: Vector) {
		this.tree = tree;

		this.cursor = {
			order_prepare_fn: OctreeWalker.order_prepare_default
		};

		this.start_point = start_point;
		this.direction   = direction;
	}

	set start_point(point: Point) {
		this.go_to_point(point);
		this.cursor.start_point = point;
	}

	private static order_prepare_default(ord: number[]): number[] { /* console.log("setting default order"); */ return ord; }
	private static order_prepare_reverse(ord: number[]): number[] { /* console.log("setting reverse order"); */ return ord.reverse(); }

	set direction(dir: Vector) {
		this.deprecate_cursor_logic();
		this.cursor.direction = dir;
		if (dir != undefined) {
			const dir_prepare_fns = [OctreeWalker.order_prepare_default, OctreeWalker.order_prepare_reverse];
			this.cursor.order_prepare_fn = dir_prepare_fns[Number(dir.z < 0) | Number(dir.y < 0)];
		}
	}

	get start_point() {
		return this.cursor.start_point;
	}

	get direction() {
		return this.cursor.direction;
	}

	next(flags: { include_undefined?: boolean } = {}): [SpaceOctree<T>,number]|null {
		this.prepare_to_walk();

		let next_index: number;
		do {
			if (this.cursor.tree.is_invalid())
				continue;

			while ((next_index = this.order_shift_next()) != null) {
				const child = this.cursor.tree.get(next_index);
				if (this.is_crossed(next_index) && (flags.include_undefined || child != undefined)) {
					if (child instanceof Octree) {
						this.step_in(child);
					}
					else {
						this.cursor.node = next_index;
					}
					return [this.cursor.tree,next_index];
				}
			}
		} while (this.step_back());

		return null;
	}

	*each_cross(flags: { include_undefined?: boolean } = {}) {
		let next_node: [SpaceOctree<T>, number];
		while ((next_node = this.next(flags)) != null)
			yield next_node;
	}

	/** Sets the current walker position to the subtree and node covering the specified point.
	 *  If the point is out of the tree, the posision is set to the outermost tree and undefined node.
	 *  This function automatically deprecates the cursor logic. */
	go_to_point(point: Point): boolean {
		let pos_node: [SpaceOctree<T>, number] = undefined;
		/* Try the tree at the cursor first to optimize traversal out */
		for (let tree of [this.cursor.tree, this.tree]) {
			if (tree != undefined) {
				pos_node = node_at_pos(tree, tree.id, point);
				if (pos_node != undefined)
					break;
			}
		}

		this.deprecate_cursor_logic();
		if (pos_node == undefined) {
			this.cursor.tree = this.tree;
			this.cursor.node = undefined;
			return false;
		}

		this.cursor.tree = pos_node[0];
		this.cursor.node = pos_node[1];
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

	/* FIXME: Kinda working, but still have to implement a proper handling of the middle cross situation */
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
			const cross_point = plane.line_intersection(line, { allow_infinity: true });
			/* console.log(`line.dir.norm(): ${line.dir.normalize().v}`); */
			//console.log(`cross_point: ${cross_point[0].v}`);
			//console.log(`mid_point: ${mid_point.v}`);
			const a1_ae_middle = (cross_point[0].v[x[0]] >= mid_point.v[x[0]]);
			const a2_ae_middle = (cross_point[0].v[x[1]] >= mid_point.v[x[1]]);
			const a1_of = (Math.abs(cross_point[0].v[x[0]] - mid_point.v[x[0]]) > half_size);
			const a2_of = (Math.abs(cross_point[0].v[x[1]] - mid_point.v[x[1]]) > half_size);

			//console.log(`(Math.abs(cross_point[0].v[x[0]] - mid_point.v[x[0]])): ${(Math.abs(cross_point[0].v[x[0]] - mid_point.v[x[0]]))}`);
			//console.log(`(Math.abs(cross_point[0].v[x[1]] - mid_point.v[x[1]])): ${(Math.abs(cross_point[0].v[x[1]] - mid_point.v[x[1]]))}`);
			//console.log(`half_size: ${half_size}`);
			//console.log(`cross_point[0].v[x[0]]: ${cross_point[0].v[x[0]]}`);
			//console.log(`cross_point[0].v[x[1]]: ${cross_point[0].v[x[1]]}`);

			logic_vec |= (Number(a1_ae_middle) | (Number(a2_ae_middle) << 1)) << (i << 1);
			logic_vec |= Number(a1_of || a2_of) << (6 + i);
			/* console.log((Number(a1_ae_middle) | Number(a2_ae_middle)<<1).toString(2).padStart(2,'0')); */
			/* console.log(logic_vec.toString(2).padStart(9, '0')); */
		});

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

		if ((parent = this.cursor.tree.parent) != null) {
			const cur_tree_index = index_within_parent(this.cursor.tree);
			this.modify_cursor_logic(parent, cur_tree_index, { exclude_node: true });
			return parent;
		}
	}

	/* Step inside a subtree. */
	private step_in(subtree: SpaceOctree<T>) {
		this.modify_cursor_logic(subtree, undefined);
	}
}
