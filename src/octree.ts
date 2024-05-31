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
export type Octand<T,ID=any> = Octree<T,ID>|T;

/**
* A class abstracting a dynamic octree
*/
export class Octree<T, ID> {
	parent?: Octree<T,ID>;
	id: ID;
	private flags: { invalidated: boolean };
	private nodes: Tuple8<Octand<T,ID>>;

	constructor(id: ID, parent?: Octree<T,ID>, ...nodes: Octand<T,ID>[]) {
		if (nodes.length == 0) {
			this.nodes = Array(8) as Tuple8<Octand<T,ID>>;
		} else if (nodes.length <= 8) {
			this.nodes = nodes.slice(0) as Tuple8<Octand<T,ID>>;
		} else {
			throw Error(`Invalid number of nodes passed (${nodes.length})`);
		}
		this.id = id;
		this.parent = parent;
		this.flags = { invalidated: false };
	}

	static is_at_bounds(n: number): boolean {
		return (n >= 0 && n <= 7);
	}

	static check_bounds(n: number) {
		if (!Octree.is_at_bounds(n))
			throw Error("Node index out of range (0..7)");
	}
	/** Get the `n`-th node. */
	get(n: number): Octand<T,ID> {
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
	set(n: number, value: Octand<T,ID>, flags: { keep_old_valid?: boolean, invalidate_recurse?: boolean } = {}): Octand<T,ID> {
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
}
