import {point, vector, Point, Line, Plane} from '@app/linalg';

export type Quadrant<T> = Quadtree<T>|T|undefined;

/** The dimensions of the quad tree.
 *  @param{pos} The position of the tree relative to the vertex adjacent to the first node.
 *  @param{size} The size of an edge.
 */
export interface QuadTreeDim {
	pos:  Point;
	size: number;
}

export class Quadtree<T> {
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

export var each_cross_n_rec = 0;
export var each_cross_n_rec_max = 0;
export var each_cross_n_rec_total = 0;
export var each_cross_n_invocate = 0;
export var each_cross_logic_freq: number[] = Array(8).fill(0);

export function* each_cross<T>(tree: Quadtree<T>, line: Line): Generator<[Quadtree<T>,number]> {

	let n_rec = 0;
	each_cross_n_invocate++;
	let cross_logic_distrib = Array(16).fill(0);

	let rec_fn = function*(lvl: number, subtree: Quadtree<T>) {
		n_rec++;
		each_cross_n_rec_total++;

		let half_size = subtree.dim.size/2;
		let mid_point = point(subtree.dim.pos.x+half_size, subtree.dim.pos.y+half_size);
		let axis_y = new Plane(vector(1,0), mid_point); // y axis
		let axis_x = new Plane(vector(0,1), mid_point); // x axis
		let cross_y = axis_y.line_cross_point(line);
		let cross_x = axis_x.line_cross_point(line);
		let y_mid_dist = cross_y[0].sub(mid_point);
		let x_mid_dist = cross_x[0].sub(mid_point);

	  let cross_logic = (Number(x_mid_dist.x >= 0)) | (Number(y_mid_dist.y >= 0) << 1) 
				| (Number(Math.abs(x_mid_dist.x) >= half_size) << 2) | (Number(Math.abs(y_mid_dist.y) >= half_size) << 3);

		cross_logic_distrib[cross_logic] += 1;

		let crossed_nodes = get_crossed_indices(subtree.dim, cross_logic);
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

	each_cross_n_rec = n_rec;
	if (n_rec > each_cross_n_rec_max)
		each_cross_n_rec_max = n_rec;

	each_cross_logic_freq = cross_logic_distrib;
}

/** This LUT maps 4-element axis-cross logic vector to the 9-bit ordered sequence of crossed nodes.
 *  The logic vector is defined as (from least significant bit to the most):
 *  x_above_middle, y_above_middle, x_exceeds_dim, y_exceeds_dim.
 */
//const NODE_CROSS_LUT = BigInt("0x8421a5a5cc33edb7");
const NODE_CROSS_LUT = BigInt("0x200c040111064441911870220a7146622ca");

function get_crossed_indices(dim: QuadTreeDim, cross_logic: number): number[] {

	//let half_size = dim.size/2;
	//let cross_logic = (Number(cross_x >= 0)) | (Number(cross_y >= 0) << 1) 
	//		| (Number(Math.abs(cross_x) >= half_size) << 2) | (Number(Math.abs(cross_y) >= half_size) << 3);

	let res = [];
	//console.log(`cross_logic: ${cross_logic.toString(2)}`);
	let node_vec = Number((NODE_CROSS_LUT >> BigInt(cross_logic*9)) & BigInt(0x1ff));
	for (; node_vec > 0; node_vec >>= 3) {
		let node_i = node_vec & 0x7;
		if (node_i > 0) res.push(node_i - 1);
	}

	return res;
}
