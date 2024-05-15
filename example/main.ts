import * as drawer from "@app/drawer";
import * as qt from "@app/quadtree";
import { point, vector } from "@app/linalg";

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

async function main() {
	let tree_dim = { pos: point(0,0), size: 1000 };
	let tree = new qt.Quadtree<any[]>(tree_dim);

	for (let i = 0; i < 30000; i++)
		tree_list.push(create_at_random_child(tree));

	let draw = new drawer.Drawer("canvas");
	draw.ctx.strokeStyle = "#000000"

	draw.draw_square([0,0], draw.ctx.canvas.width, 5, [0,0,0]);

	for (let tree of tree_list) {
		draw.draw_square(tree.dim.pos.v.slice(0,2), tree.dim.size, 1, [0,0,0]);
	}

	const line = { start: point(800,1000), dir: vector(-200,-1000) };

	for (let cross of qt.each_cross(tree,line)) {
		draw.draw_square(cross[0].dim.pos.v.slice(0,2), cross[0].dim.size, 1, [0,255,0]);
		//await new Promise(resolve => setTimeout(resolve, 100));
	}

	draw.draw_line(line.start.v.slice(0,2),line.start.add(line.dir).v.slice(0,2),1,[0xff,0,0]);


}

main();
