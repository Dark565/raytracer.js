import { Octree } from '@app/octree';
import * as space from '@app/octree_space';
import { point } from '@app/math/linalg';
import * as vector from '@app/math/vector';

test('point_at_pos() fuzzy test', ()=>{
		const otree_dim: space.OctreeDim = { pos: point(0,0,0), size: 1 };
		const otree = new Octree(otree_dim);

		const inner_tree = space.new_subtree(otree, 0);

		const p = point(0,0,0);

		const rnd_between = (low: number, high: number) => {
			const delta = high - low;
			return Math.random() * delta + low;
		}

		for (let i = 0; i < 100; i++) {
			let expected_node = otree;
			let rnd = (Math.random()*8)<<0;
			for (let j = 0; j < 3; j++)
				p.v[j] = rnd & (1<<j) ? rnd_between(0.5,1.0) : rnd_between(0.0,0.5);

			if (rnd == 0) {
				let sp = vector.scale(p, 1/0.250);
				rnd = (sp.v[0] <<0) + (sp.v[1] <<1) + (sp.v[2] <<2);
				expected_node = inner_tree;
			}

			const node_desc = space.node_at_pos(otree, p);
			expect(node_desc).toEqual({tree: expected_node, octant: rnd});
		}
});

test('point_at_pos() discrete tests', ()=>{
	const otree_dim: space.OctreeDim = { pos: point(0,0,0), size: 1 };
	const otree = new Octree(otree_dim);

	let inner = space.new_subtree(otree, 3);
	let inner_inner = space.new_subtree(inner, 5);

	let node_desc = space.node_at_pos(otree, point(0.75,0.5,0.25));

	expect(node_desc).toEqual({tree: otree.subtree(3).subtree(5), octant: 0});
});
