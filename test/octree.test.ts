import * as octree from '@app/octree';

test('Octree.get() bound checking', () => {
	let oct = new octree.Octree(0);
	expect(()=>oct.get(8)).toThrow();
	expect(()=>oct.get(-1)).toThrow();
});
