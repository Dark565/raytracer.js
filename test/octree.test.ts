import * as octree from '@app/octree';

test('Octree constructor', () => {
	expect(() => new octree.Octree(0, null, ...Array(9).fill([0]))).toThrow();
	expect(() => new octree.Octree(0, null, ...Array(16).fill([0]))).toThrow();
});

test('Octree.get() bound checking', () => {
	let oct = new octree.Octree(0);
	expect(()=>oct.get(8)).toThrow();
	expect(()=>oct.get(-1)).toThrow();
});
