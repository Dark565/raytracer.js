import * as vector from '@app/math/vector';

export type Vector = vector.Vector;
export type Point = Vector;
export var point = vector.vector;

export interface Line {
	start: Point;
	dir: Vector;
}
