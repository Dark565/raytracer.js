import { Octree } from '@app/octree';
import * as space from '@app/octree_space';
import * as octree_entity from '@app/octree_entity';
import * as material from '@app/material';
import { SolidTexture } from '@app/texture/texture_solid';
import { SphereEntity } from '@app/entities/entity_sphere';
import { SIMPLE_SMOOTH_MATERIAL } from '@app/materials/material_solid';
import { Point, point } from '@app/math/geometry';
import * as vector from '@app/math/vector';

/*
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
				rnd = (sp.x <<0) + (sp.y <<1) + (sp.z <<2);
				expected_node = inner_tree;
			}

			const node_desc = space.node_at_pos(otree, p);
			expect(node_desc).toEqual({tree: expected_node, octant: rnd});
		}
});
*/

const TEXTURE = new SolidTexture({r:1.0, g:1.0, b:1.0, a:1.0});

function add_arbitrary_entity_at_pos(tree: octree_entity.EntityOtree, pos: Point, size: number) {
	const entity = new SphereEntity(undefined, SIMPLE_SMOOTH_MATERIAL, TEXTURE, pos, size);
	octree_entity.add_entity_to_octree(tree, entity, {max_in_depth: 10, max_out_depth: 10});
	return entity;
}

test('Entity putting at arbitrary positions tests', ()=>{
	debugger;

	const otree_dim: space.OctreeDim = { pos: point(0,0,0), size: 1 };
	const otree = octree_entity.new_entity_octree(otree_dim, undefined);

	let entity = add_arbitrary_entity_at_pos(otree, point(0.25,0.25,0.25), 0.5); // this should be at depth 1 in the 0th node
	expect(otree.get(0).value.set.has(entity)).toBe(true);

	entity = add_arbitrary_entity_at_pos(otree, point(0.5,0.25,0.5), 0.25); // this odd node should be in the root node itself
	expect(otree.value.set.has(entity)).toBe(true);

});
