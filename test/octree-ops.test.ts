import { Octree } from '@app/octree';
import * as ops from '@app/octree_ops';
import { point } from '@app/linalg';

test('point_at_pos() fuzzy test', ()=>{
		let otree = new Octree();
		let otree_dim = { pos: point(0,0,0), size: 1 };

		otree.set(0, new Octree);

		let p = point(0,0,0);

		let rnd_between = (low: number, high: number) => {
			let delta = high - low;
			return Math.random() * delta + low;
		}

		for (let i = 0; i < 100; i++) {
			let rnd = (Math.random()*8)<<0;
			for (let j = 0; j < 3; j++)
				p.v[j] = rnd & (1<<j) ? rnd_between(0.5,1.0) : rnd_between(0.0,0.5);

			if (rnd == 0) {
				let sp = p.scale(1/0.250);
				rnd = (sp.x <<0) + (sp.y <<1) + (sp.z <<2);
			}

			let node_desc = ops.node_at_pos(otree, otree_dim, p);
			expect(node_desc).toEqual([otree,rnd]);
		}
});
