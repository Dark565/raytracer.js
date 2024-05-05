import * as octree from '@app/octree';
import * as octree_ops from '@app/octree_ops';

test('node_at_pos sanity', () => {
	let oct = new octree.Octree([1],[2],[3],[4],[5],[6],[7],[8]);
	expect(oct.get(0)[0]).toBe(1);
})
