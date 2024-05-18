import * as drawer from "@app/drawer";
import * as qt from "@app/quadtree";
import { point, Line, vector } from "@app/linalg";

var tree_list: qt.Quadtree<any[]>[] = [];

function create_at_random_child<T>(tree: qt.Quadtree<T>): qt.Quadtree<T> {
	let node: qt.Quadtree<T>;
	let next_i: number;
	let next_node: qt.Quadrant<T> = tree;
	do {
		node = next_node;
		next_i = (Math.random()*4)>>0;
		next_node = node.get(next_i);
	} while (next_node instanceof qt.Quadtree);

	return node.new_subtree(next_i);
}

var custom_random_state = BigInt(0xd29894ef);
// const CUSTOM_RANDOM_MODULUS = 0xf5b68d5d;
const CUSTOM_RANDOM_COEF = BigInt(0xffeba0ab);
const CUSTOM_RANDOM_TERM = BigInt(0xdae4a45d);
function rotr(v: number|bigint,w: number, b: number): number {
	let w_mod = w % b;
	return Number(((BigInt(v) >> BigInt(w_mod)) | (BigInt(v) << BigInt(b-w_mod))) & ((BigInt(1)<<BigInt(b))-BigInt(1)));
}

function custom_random(): number {
	return Number(custom_random_state = BigInt(rotr((custom_random_state * CUSTOM_RANDOM_COEF + CUSTOM_RANDOM_TERM) & BigInt(0xffffffff), 17, 32)));
}

function custom_seed(val: number|bigint) {
	custom_random_state = BigInt(rotr((BigInt(val) * CUSTOM_RANDOM_TERM + CUSTOM_RANDOM_COEF), (Number(val)&0x1f), 32));
}

function main() {
	let recnum_div = document.getElementById("recnum") as HTMLDivElement;

	const tree_size = 1000;
	let tree_dim = { pos: point(0,0), size: tree_size };
	let tree = new qt.Quadtree<any[]>(tree_dim);
	let smallest_tree_size: number = tree_size;


	for (let i = 0; i < 3000000; i++)
		tree_list.push(create_at_random_child(tree));

	for (let tree of tree_list) {
		if (tree.dim.size < smallest_tree_size)
			smallest_tree_size = tree.dim.size;
	}

	//let max_tree_level = Math.log2(tree_size/smallest_tree_size)<<0;

	let draw = new drawer.Drawer("canvas");

	draw.draw_square([0,0], draw.ctx.canvas.width, 5, [0,0,0]);

	let start_color_seed = (Math.random() * 0x100000000)<<0;

	let redraw_squares = () => {
	draw.ctx.strokeStyle = "#000000"
		draw.ctx.fillRect(0,0,1000,1000);
		for (let tree of tree_list) {
			//let size_ratio = tree.dim.size / tree_size;
			let level = Math.log2(tree_size / tree.dim.size)<<0;
			custom_seed(start_color_seed + level);
			let col_rnd = [0,0,0].map(() => custom_random() & 0xff);
			draw.draw_square(tree.dim.pos.v.slice(0,2), tree.dim.size, 1, [col_rnd[0], col_rnd[1], col_rnd[2]]);
		}
	}

	let outline_cross = async (line: Line) => {

		for (let cross of qt.each_cross(tree,line)) {
			draw.draw_square(cross[0].dim.pos.v.slice(0,2), cross[0].dim.size, 1, [0,255,0]);
			await new Promise(resolve => setTimeout(resolve, 10));
		}

		draw.draw_line(line.start.v.slice(0,2),line.start.add(line.dir).v.slice(0,2),1,[0xff,0,0]);
	}

	redraw_squares();

	draw.ctx.canvas.addEventListener("wheel", async (_) => {
		let rnd_points = <number[][]> <unknown> [0,1000].map((def) => {
			let rnd_c = [(Math.random()*1000)>>0, def];
			let rnd_i = (Math.random()*2)>>0;
			return [rnd_c[rnd_i], rnd_c[rnd_i^1]];
		});

		let line_start = point(...rnd_points[0]);
		let line_dir = point(...rnd_points[1]).sub(line_start);
		let line = { start: line_start, dir: line_dir };

		console.log(line_start);
		console.log(line_dir);

		await outline_cross(line);

		let lvec_freq_table_body = qt.each_cross_logic_freq.map((x,i) => `
				<tr>
					<td>${i.toString(2).padStart(4,'0')}</td>
					<td>${x}</td>
				</tr>
		`).join("\n");

		recnum_div.innerHTML = `
			<b>each_cross()</b> recursion count: ${qt.each_cross_n_rec}<br>
			<b>each_cross()</b> max recursion count: ${qt.each_cross_n_rec_max}<br>
			<b>each_cross()</b> average recursion count: ${qt.each_cross_n_rec_total / qt.each_cross_n_invocate}
			<table>
				<thead>
					<tr>
						<th>Logic Vector</th>
						<th>Frequency</th>
					</tr>
				</thead>
				<tbody>
				${lvec_freq_table_body}
				</tbody>
			</table>
			`
	});

	draw.ctx.canvas.addEventListener("click", (_) => {
		redraw_squares();
	});


}

main();
