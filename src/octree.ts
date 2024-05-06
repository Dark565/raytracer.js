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
export type Octand = Octree|any[];

/**
* A class abstracting a dynamic octree
*/
export class Octree {
	id: number;
	#nodes: Tuple8<Octand>;

	constructor(...nodes: Octand[]) {
		if (nodes.length == 0) {
			this.#nodes = Array(8).fill(null).map(()=>[]) as Tuple8<Octand>;
		} else if (nodes.length == 8) {
			this.#nodes = nodes.slice(0) as Tuple8<Octand>;
		} else {
			throw Error(`Invalid number of nodes passed (${nodes.length} != 8)`);
		}
	}

	#bounds_check(n: number) {
		if (n < 0 || n > 7)
			throw Error("Node index out of range (0..7)");
	}

	/** Get the `n`-th node. */
	get(n: number): Octand {
		this.#bounds_check(n);
		return this.#nodes[n];
	}

	/** Set the `n`-th node and get the old value */
	set(n: number, value: Octand): Octand {
		this.#bounds_check(n);

		let old_value = this.#nodes[n];
		this.#nodes[n] = value;
		return old_value;
	}

	recurse_get(n: number): any[] {
		let cur_node = this.get(n);
		while (cur_node instanceof Octree)
			cur_node = cur_node.get(n);

		return cur_node;
	}
}
