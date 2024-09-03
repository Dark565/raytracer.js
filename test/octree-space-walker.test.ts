import * as geometry from '@app/math/geometry';
import * as vector from '@app/math/vector';
import * as otree from '@app/octree';
import * as space from '@app/octree_space';

/** Tests only one level of the tree */
function walker_one_level_test<T>(walker: space.OctreeWalker<T>, pos: geometry.Point, dir: geometry.Vector, expected_crosses: number[]) {
	walker.start_point = pos;
	walker.direction = dir;
	const crosses = Array.from(walker.each_cross({include_undefined: true})).slice(0,-1); // slice to filter-out the root
	expect(crosses.map(x => x.pos.octant)).toEqual(expected_crosses);
}

test('OctreeWalker sanity', () => {
	const dim: space.OctreeDim = { pos: geometry.point(0,0,0), size: 1 };
	const tree = new otree.Octree<any,space.OctreeDim>(dim);
	const tree_walker = new space.OctreeWalker(tree);

	walker_one_level_test(tree_walker, geometry.point(0,0,0), vector.vector(3/4, Math.sqrt(3)/4, 0), [0,1,3]);
	walker_one_level_test(tree_walker, geometry.point(1,1,0), vector.vector(-3/4, -Math.sqrt(3)/4, 0), [3,2,0]);
	walker_one_level_test(tree_walker, geometry.point(0,0,0), vector.vector(1,0.8,4), [0,4,5]);
	walker_one_level_test(tree_walker, geometry.point(0,0,0), vector.vector(5,3,2), [0,1,3]);
	walker_one_level_test(tree_walker, geometry.point(0,0,0), vector.vector(1,1,1), [3,5,7,6]);
	walker_one_level_test(tree_walker, geometry.point(1,1,1), vector.vector(-1,-1,-1), [6,7,5,3]);

	//let time_start = performance.now();
	//for (let sub of tree_walker.each_cross({include_undefined: true})) {
	//	const time_now = performance.now();
	//	console.log(`delta ${(Number(time_now) - Number(time_start)) / 1000}: crossing child ${sub[1]}`);
	//	time_start = performance.now();
	//}

});
