import * as linalg from '@app/linalg';
import * as otree from '@app/octree';
import * as space from '@app/octree_space';

test('OctreeWalker sanity', () => {
	const dim: space.OctreeDim = { pos: linalg.point(0,0,0), size: 1 };
	const tree = new otree.Octree<any,space.OctreeDim>(dim);
	const tree_walker = new space.OctreeWalker(tree);
	tree_walker.start_point = linalg.point(0.1,0.1,0.1);
	tree_walker.direction = linalg.vector(3/4, Math.sqrt(3)/4, 0);
	//tree_walker.direction = linalg.vector(0, 1, 0);
	
	let time_start = performance.now();
	for (let sub of tree_walker.each_cross({include_undefined: true})) {
		const time_now = performance.now();
		console.log(`delta ${(Number(time_now) - Number(time_start)) / 1000}: crossing child ${sub[1]}`);
		time_start = performance.now();
	}
});
