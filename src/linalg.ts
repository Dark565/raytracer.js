/*
 * Copyright 2024 Grzegorz Kociołek
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export class VectorError extends Error {}

/**
* An abstraction of the mathematical vector.
*/
export class Vector {
	v: number[];
	size: number;

	constructor(x?: number[]|Vector) {
		if (x instanceof Array) {
			this.v = x.slice(0);
		} else if (x instanceof Vector) {
			this.copy_from(x);
			return;
		} else {
			this.v = [0,0,0];
		}

		this.size = this.v.length;
	}

	[Symbol.iterator]() {
		let i = 0;
		return {
			next: () => {
				if (i < this.size)
					return { value: this.v[i++], done: false };
				else
					return { done: true };
			}
		};
	}

	get x(): number {
		return this.v[0];
	}

	get y(): number {
		return this.v[1];
	}

	get z(): number {
		return this.v[2];
	}

	copy_from(x: Vector) {
		this.v = x.v.slice(0);
		this.size = x.size;
	}

	clone() {
		return new Vector(this);
	}

	_check_compatibility(v2: Vector) {
		if (this.size != v2.size)
			throw new VectorError("this and v2 must have the same size");
	}

	dot(v2: Vector) {
		this._check_compatibility(v2);

		let sum = 0;
		for (let i=0; i < this.size; i++) {
			sum += this.v[i] * v2.v[i];
		}
		return sum;
	}

	cross(v2: Vector) {
		if (this.size != 3 || v2.size != 3)
			throw new VectorError("cross product is defined only for 3-element vectors");

		let res = new Vector;
		res.v[0] = this.v[1]*v2.v[2] - this.v[2]*v2.v[1];
		res.v[1] = this.v[2]*v2.v[0] - this.v[0]*v2.v[2];
		res.v[2] = this.v[0]*v2.v[1] - this.v[1]*v2.v[0];
		return res;
	}

	add(v2: Vector) {
		this._check_compatibility(v2);
		let res = this.clone();
		for (let i=0; i < this.size; i++) {
			res.v[i] += v2.v[i];
		}
		return res;
	}

	sub(v2: Vector) {
		this._check_compatibility(v2);
		let res = this.clone();
		for (let i=0; i < this.size; i++) {
			res.v[i] -= v2.v[i];
		}
		return res;
	}

	scale(scalar: number): Vector {
		let res = this.clone();
		for (let i=0; i < res.size; ++i) {
			res.v[i] *= scalar;
		}
		return res;
	}

	length_sq() {
		return this.dot(this);
	}

	normalize() {
		const len = Math.sqrt(this.length_sq());
		let res = this.clone();
		for (let i=0; i < this.size; i++)
			res.v[i] /= len;

		return res;
	}
}

export function vector(...numbers: number[]): Vector {
	return new Vector(numbers);
}

export type Point = Vector;
export var point = vector;

export interface Line {
	start: Point;
	dir: Vector;
}

export interface Solid {
	line_cross_point(line: Line): Vector[];
}

export class Plane implements Solid {
	normal: Vector;
	pos: Vector;
	constructor(normal: Vector, pos: Vector) {
		this.normal = normal.normalize();
		this.pos = pos;
	}

	line_cross_point(line: Line): Vector[] {
		let denom = line.dir.dot(this.normal);
		if (denom == 0)
			return [];

		let off_dist = this.pos.sub(line.start);
		let ratio = off_dist.dot(this.normal) / denom;
		return [line.start.add(line.dir.scale(ratio))];
	}
}

export class Sphere implements Solid {
	radius: number;
	pos: Vector;
	constructor(pos: Vector, radius: number) {
		this.pos = pos;
		this.radius = radius;
	}

	line_cross_point(line: Line): Vector[] {
		let dist = line.start.sub(this.pos);
		let a = line.dir.dot(line.dir);
		let b = dist.dot(line.dir);
		let c = dist.dot(dist) - this.radius*this.radius;
		let delta = b*b - a*c*4;
		if (delta < 0)
			return [];

		let s_delta = Math.sqrt(delta);
		let tmp1 = -b / (a*2);
		let tmp2 = s_delta / (a*2);
		let t1 = tmp1 - tmp2;
		let t2 = tmp1 + tmp2;
		return [line.start.add(line.dir.scale(t1)), line.start.add(line.dir.scale(t2))];
	}
}
