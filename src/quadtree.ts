import {point, vector, Point, Line, Plane} from '@app/linalg';

type Quadrant<T> = Quadtree<T>|T|undefined;

/** The dimensions of the quad tree.
 *  @param{pos} The position of the tree relative to the vertex adjacent to the first node.
 *  @param{size} The size of an edge.
 */
interface QuadTreeDim {
	pos:  Point;
	size: number;
}

class Quadtree<T> {
	#nodes: Quadrant<T>[];
	dim: QuadTreeDim;

	constructor(dim: QuadTreeDim, nodes?: Array<Quadrant<T>>) {
		this.#nodes = nodes === undefined ? Array(4).fill(undefined) : nodes.slice(0);
		this.dim = dim;
	}

	#bounds_check(n: number) {
		if (n < 0 || n > 3)
			throw Error("Index out of bounds");
	}

	get(n: number): Quadrant<T> {
		this.#bounds_check(n);
		return this.#nodes[n];
	}

	set(n: number, x: Quadrant<T>): Quadrant<T> {
		this.#bounds_check(n);
		let old = this.#nodes[n];
		this.#nodes[n] = x;
		return old;
	}

	new_subtree(n: number): Quadtree<T> {
		if (this.get(n) !== undefined)
			throw Error("Node already defined");

		let half_size = this.dim.size/2;
		let subdim = { pos: this.dim.pos.add(vector( (n&1) * half_size, (n>>1) * half_size )), size: half_size };

		let subtree = this.#nodes[n] = new Quadtree<T>(subdim);
		return subtree;
	}
}

function* each_cross<T>(tree: Quadtree<T>, line: Line): Generator<[Quadtree<T>,number]> {
	let rec_fn = function*(lvl: number, subtree: Quadtree<T>) {
		let half_size = subtree.dim.size/2;
		let mid_point = point(subtree.dim.pos.x+half_size, subtree.dim.pos.y+half_size);
		let axis_y = new Plane(mid_point, vector(1,0)); // y axis
		let axis_x = new Plane(mid_point, vector(0,1)); // x axis
		let cross_y = axis_y.line_cross_point(line);
		let cross_x = axis_x.line_cross_point(line);
		let y_mid_dist = cross_y[0].sub(mid_point);
		let x_mid_dist = cross_x[0].sub(mid_point);
		let crossed_nodes = get_crossed_indices(subtree.dim, x_mid_dist.x, y_mid_dist.y);
		for (let i of crossed_nodes) {
			let node = subtree.get(i);
			// let subdim = { pos: subtree.dim.pos.add(vector( (i&1) * half_size, (i>>1) * half_size )), size: half_size };
			if (node instanceof Quadtree) {
				yield* rec_fn(lvl+1, node);
			} else {
				yield [subtree,i];
			}
		}
	}
	yield* rec_fn(0,tree);
}

/** This LUT maps 4-element axis-cross logic vector to the 4-element vector of crossed quadtree nodes.
 *  The logic vector is defined as (from least significant bit to the most):
 *  x_above_middle, y_above_middle, x_exceeds_dim, y_exceeds_dim.
 */
const NODE_CROSS_LUT = BigInt("0x8421a5a5cc33edb7");

function get_crossed_indices(dim: QuadTreeDim, cross_x: number, cross_y: number): number[] {

	let half_size = dim.size/2;
	let cross_logic = (Number(cross_x >= 0)) | (Number(cross_y >= 0) << 1) 
			| (Number(Math.abs(cross_x) > half_size) << 2) | (Number(Math.abs(cross_y) > half_size) << 3);

	let node_vec = Number((NODE_CROSS_LUT >> BigInt(cross_logic << 2)) & BigInt(0xf));
	let res_list = [];
	for (let i = 0; i < 4; i++, node_vec >> 1) {
		if (node_vec & 1) res_list.push(i);
	}

	return res_list;

}
