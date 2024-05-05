/**
* A class abstracting a dynamic octree
*/

type Tuple8<T> = [T,T,T,T,T,T,T,T];
type Octand = Octree|any[];

export class Octree {
	id: number;
	#nodes: Tuple8<Octand>;

	constructor(...nodes: Tuple8<Octand>) {
		this.#nodes = <Tuple8<Octand>> nodes.slice(0);
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
}
