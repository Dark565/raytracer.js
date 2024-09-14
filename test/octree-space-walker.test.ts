import * as geometry from '@app/math/geometry';
import * as vector from '@app/math/vector';
import * as otree from '@app/octree';
import * as space from '@app/octree_space';
import * as debug from '@app/debug/object_hacks';

/** Tests only one level of the tree */
function walker_one_level_test<T>(walker: space.OctreeWalker<T>, pos: geometry.Point, dir: geometry.Vector, expected_crosses: number[]) {
	debugger;
	walker.set_pos_and_dir(pos, dir);
	const stops = Array.from(walker.each_stop()).slice(0,-1); // slice to filter-out the root
	expect(stops.map(x => x.pos.octant)).toEqual(expected_crosses);
}

function walker_multiple_level_test<T>(walker: space.OctreeWalker<T>, pos: geometry.Point, dir: geometry.Vector, expected_crosses: [number, number][]) {
	debugger;
	walker.set_pos_and_dir(pos, dir);
	const stops = Array.from(walker.each_stop()).slice(0,-1);
	expect(stops.map(x => [debug.unique_object_id(x.pos.tree), x.pos.octant])).toEqual(expected_crosses);
}

test('OctreeWalker one-level sanity', () => {
	const dim: space.OctreeDim = { pos: geometry.point(0,0,0), size: 1 };
	const tree = new otree.Octree<any,space.OctreeDim>(dim);
	const tree_walker = new space.OctreeWalker(tree, undefined, undefined, undefined, { include_undefined: true });

	const eps = Number.EPSILON;

	walker_one_level_test(tree_walker, geometry.point(0,0,0), vector.vector(3/4, Math.sqrt(3)/4, 0), [0,1,3]);
	walker_one_level_test(tree_walker, geometry.point(1,1,0), vector.vector(-3/4, -Math.sqrt(3)/4, 0), [3,2,0]);
	walker_one_level_test(tree_walker, geometry.point(0,0,0), vector.vector(5,3,2), [0,1,3]);
	walker_one_level_test(tree_walker, geometry.point(0,0,0), vector.vector(1,1,1), [0,1,3,7]);
	walker_one_level_test(tree_walker, geometry.point(1+eps,1,1-eps), vector.vector(-1,-1,-1), [7,3,1,0]);
	walker_one_level_test(tree_walker, geometry.point(1,1,1), vector.vector(-1,-1,-1), [7,6,4,0]);
	walker_one_level_test(tree_walker, geometry.point(0,0,0), vector.vector(2,1.0,4), [0,4,5]);
});

test('OctreeWalker two-level sanity', () => {
	const dim: space.OctreeDim = { pos: geometry.point(0,0,0), size: 1 };
	const tree = new otree.Octree<any,space.OctreeDim>(dim);
	const tree_s1 = space.new_subtree(tree, 0);
	const tree_s2 = space.new_subtree(tree, 3);
	const tree_s3 = space.new_subtree(tree, 7);

	// IDs are used for better readiblity in test output
	const id_tree = debug.unique_object_id(tree);
	const id_s1 = debug.unique_object_id(tree_s1);
	const id_s2 = debug.unique_object_id(tree_s2);
	const id_s3 = debug.unique_object_id(tree_s3);

	const tree_walker = new space.OctreeWalker(tree, undefined, undefined, undefined, { include_undefined: true });

	const eps = Number.EPSILON;

	console.log(`id_tree: ${id_tree}, id_s1: ${id_s1}, id_s2: ${id_s2}, id_s3: ${id_s3}`);

	walker_multiple_level_test(tree_walker, geometry.point(0,0,0), vector.vector(1,1,1), [
		[ id_s1, 0 ],
		[ id_s1, 1 ],
		[ id_s1, 3 ],
		[ id_s1, 7 ],
		[ id_tree, 0 ],
		[ id_tree, 1 ],
		[ id_tree, 3 ],
		[ id_s2, 4 ],
		[ id_tree, 7 ],
		[ id_s3, 0 ],
		[ id_s3, 1 ],
		[ id_s3, 3 ],
		[ id_s3, 7 ]]);
});
