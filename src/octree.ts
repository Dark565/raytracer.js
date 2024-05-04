
/**
* A class abstracting a dynamic octree
*/
export class Octree {
	id: number;
	#nodes: Octree[]|any[][];
	
	constructor(...nodes: Octree[]|any[][]) {
		this.#nodes = nodes.slice(0);
	}

	#bounds_check(n: number) {
		if (n < 0 || n > 7)
			throw Error("Node index out of range (0..7)");
	}

	/** Get the `n`-th node. */
	get(n: number): Octree|any[] {
		this.#bounds_check(n);
		return this.#nodes[n];
	}

	/** Set the `n`-th node. */
	set(n: number, value: Octree|any[]): Octree|any[] {
		this.#bounds_check(n);

		let old_value = this.#nodes[n];
		this.#nodes[n] = value;
		return old_value;
	}
}
