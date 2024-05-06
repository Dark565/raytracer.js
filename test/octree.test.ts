import * as octree from '@app/octree';

test('Octree constructor', () => {
	expect(() => new octree.Octree(...Array(9).fill([0]))).toThrow();
});

test('Octree.get() sanity', () => {
	let oct = new octree.Octree([1],[2],[3],[4],[5],[6],[7],[8]);
	expect(oct.get(0)).toEqual([1]);
});

test('Octree.get() bound checking', () => {
	let oct = new octree.Octree();
	expect(()=>oct.get(8)).toThrow();
	expect(()=>oct.get(-1)).toThrow();
});
