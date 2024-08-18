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

type Tuple8<T> = [T,T,T,T,T,T,T,T];
export type Octant<T,ID> = Octree<T,ID>|undefined;

export class OctreeRootError extends Error {}

/**
* A class abstracting a dynamic octree
*/
export class Octree<T, ID> {
	parent?: Octree<T,ID>;
	index_within_parent?: number; // used for optimization
	value?: T;
	id: ID;
	debug_id: number;
	private flags: { invalidated: boolean };
	private nodes: Tuple8<Octant<T,ID>>;

	constructor(id: ID, parent?: Octree<T,ID>, value?: T) {
		this.id = id;
		this.parent = parent;
		this.flags = { invalidated: false };
		this.value = value
		this.nodes = Array(8).fill(undefined) as Tuple8<Octant<T,ID>>;
	}

	static is_at_bounds(n: number): boolean {
		return (n >= 0 && n <= 7);
	}

	static check_bounds(n: number) {
		if (!Octree.is_at_bounds(n))
			throw Error("Node index out of range (0..7)");
	}

	/** Get the `n`-th node. */
	get(n: number): Octant<T,ID> {
		Octree.check_bounds(n);
		return this.nodes[n];
	}

	subtree(n: number): Octree<T,ID> {
		let node = this.get(n);
		if (!(node instanceof Octree))
			throw Error("Node is not Octree");

		return node;
	}

	/** Set the `n`-th node and get the old value */
	set(n: number, value: Octant<T,ID>, flags: { keep_old_valid?: boolean, invalidate_recurse?: boolean } = {}): Octant<T,ID> {
		Octree.check_bounds(n);

		let old_value = this.nodes[n];
		if (old_value === value)
			return old_value;

		this.nodes[n] = value;

		if (!flags.keep_old_valid && old_value instanceof Octree)
			old_value.invalidate(!!flags.invalidate_recurse);

		return old_value;
	}

	recurse_get(n: number): T {
		let cur_node = this.get(n);
		while (cur_node instanceof Octree)
			cur_node = cur_node.get(n);

		return cur_node;
	}

	invalidate(recurse = false) {
		this.flags.invalidated = true;
		if (recurse) {
			for (let child of this.nodes)
				if (child instanceof Octree)
					child.invalidate(recurse);
		}
	}

	is_invalid(): boolean {
		return this.flags.invalidated;
	}

	get_root(): Octree<T, ID> {
		let next_node: Octree<T, ID> = this;
		let cur_node: Octree<T, ID>;
		do {
			cur_node = next_node;
			next_node = cur_node.parent;
		} while (next_node != undefined);

		return cur_node;
	}

	/** Get the tree level of this node relative to the absolute root */
	get_level(): number {
		let level = 0;
		let cur_node: Octree<T, ID> = this;
		while ((cur_node = cur_node.parent) != undefined)
			level++;

		return level;
	}

	/** Get the tree level of this node relative to the level of a specified root */
	get_relative_level(root: Octree<T, ID>): number {
		return this.get_level() - root.get_level();
	}
}

/** Specific position within the octree */
export interface OctreePos<T, ID> {
	tree: Octree<T, ID>;
	octant: number;
}
