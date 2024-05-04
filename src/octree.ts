class Octree {
	id: number;
	#nodes: Octree[]|any[][];
	
	constructor(...nodes: Octree[]|any[][]) {
		this.#nodes = nodes.map((x)=>x);
	}

	get_node(n: number): Octree|any[] {
		if (n < 0 || n > 7)
			throw Error("Node index out of range (0..7)");

		return this.#nodes[n];
	}

	set_node(n: number, value: Octree|any[]): Octree|any[] {
		if (n < 0 || n > 7)
			throw Error("Node index out of range (0..7)");

		let old_value = this.#nodes[n];
		this.#nodes[n] = value;
		return old_value;
	}
}

export { Octree };
