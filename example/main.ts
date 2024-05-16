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

function main() {
	let recnum_div = document.getElementById("recnum") as HTMLDivElement;

	let tree_dim = { pos: point(0,0), size: 1000 };
	let tree = new qt.Quadtree<any[]>(tree_dim);

	for (let i = 0; i < 30000; i++)
		tree_list.push(create_at_random_child(tree));

	let draw = new drawer.Drawer("canvas");

	draw.draw_square([0,0], draw.ctx.canvas.width, 5, [0,0,0]);

	let redraw_squares = () => {
	draw.ctx.strokeStyle = "#000000"
		draw.ctx.fillRect(0,0,1000,1000);
		for (let tree of tree_list) {
			draw.draw_square(tree.dim.pos.v.slice(0,2), tree.dim.size, 1, [0xff,0xff,0xff]);
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
		recnum_div.innerHTML = `
			<b>each_cross()</b> recursion count: ${qt.each_cross_n_rec}<br>
			<b>each_cross()</b> max recursion count: ${qt.each_cross_n_rec_max}<br>
			<b>each_cross()</b> average recursion count: ${qt.each_cross_n_rec_total / qt.each_cross_n_invocate}
		`
	});

	draw.ctx.canvas.addEventListener("click", (_) => {
		redraw_squares();
	});


}

main();
