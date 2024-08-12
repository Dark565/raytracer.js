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

import { Complex } from '@app/math/complex';

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

	*[Symbol.iterator]() {
		for (let i = 0; i < this.size; i++)
			yield this.v[i];
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

	private check_compatibility(v2: Vector) {
		if (this.size != v2.size)
			throw new VectorError("this and v2 must have the same size");
	}

	dot(v2: Vector) {
		this.check_compatibility(v2);

		let sum = 0;
		for (let i=0; i < this.size; i++) {
			sum += this.v[i] * v2.v[i];
		}
		return sum;
	}

	cross(v2: Vector) {
		this.assert_size(3);
		v2.assert_size(3);

		let res = new Vector;
		res.v[0] = this.v[1]*v2.v[2] - this.v[2]*v2.v[1];
		res.v[1] = this.v[2]*v2.v[0] - this.v[0]*v2.v[2];
		res.v[2] = this.v[0]*v2.v[1] - this.v[1]*v2.v[0];
		return res;
	}

	hadamard(v2: Vector) {
		this.check_compatibility(v2);
		let res = new Vector;
		for (let i=0; i < this.size; i++)
			res.v[i] = this.v[i] * v2.v[i];
	}

	add(v2: Vector) {
		this.check_compatibility(v2);
		let res = this.clone();
		for (let i=0; i < this.size; i++) {
			res.v[i] += v2.v[i];
		}
		return res;
	}

	sub(v2: Vector) {
		this.check_compatibility(v2);
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

	negate(): Vector {
		let res = this.clone();
		for (let i=0; i < res.size; ++i) {
			res.v[i] = -res.v[i];
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

	assert_size(n: number) {
		if (this.size != n)
			throw new VectorError(`Size assertion (this.size == ${n}) failed`);
	}

	/** Return a copy of the vector extended to n dimensions.
	 * New fields are filled with zeros.
	 */
	extend(n: number, fields?: number[]): Vector {
		if (n < this.size)
			throw new VectorError("Requested less dimensions that the vector currently operates on");

		const new_fields = fields ?? Array(n - this.size).fill(0);

		if (new_fields.length < (n - this.size))
			throw new VectorError("Not enough elements passed");

		return vector(...this.v, ...new_fields);
	}

	/** Rotate the 2d vector along the xy plane.
	 * @param{number} angle Rotation angle in radians.
	 */
	rotate_2d(angle: number): Vector {
		this.assert_size(2);

		let base_y = this.ortho();

		let [sin, cos] = [Math.sin(angle), Math.cos(angle)];
		return this.scale(cos).add(base_y.scale(sin))
	}

	/** Rotate the 3d vector around the normal vector.
	 * There is no verification for the right angle thus
	 * the transformation will be uneven if vectors aren't perpendicular.
	 * @param{Vector} normal Vector perpendicular to this vector.
	 * @param{number} angle  Rotation angle in radians.
	 */
	rotate_normal(normal: Vector, angle: number): Vector {
		this.assert_size(3);
		normal.assert_size(3);

		let base_y = this.cross(normal);
		base_y = base_y.scale(Math.sqrt(this.length_sq()/base_y.length_sq()));

		let [sin, cos] = [Math.sin(angle), Math.cos(angle)];
		return this.scale(cos).add(base_y.scale(sin))
	}

	/** Rotate a 3d vector around an axis by two times the half_angle angle */
	rotate_axis(axis: Vector, half_angle: Vector): Vector {	
		this.assert_size(3);
		axis.assert_size(3);

		const t_v = this;
		const [q_r, q_v] = [half_angle.x, axis.scale(half_angle.y)];

		const i_r = -q_v.dot(t_v);
		const i_v = t_v.scale(q_r).add(q_v.cross(t_v));
		//const r_r = i_r*q_r + i_v.dot(q_v);
		const r_v = q_v.scale(-i_r).add(i_v.scale(q_r)).add(i_v.cross(q_v.negate()));

		return r_v;
	}

	/** Get the vector orthogonal to the 2D vector */
	ortho() {
		this.assert_size(2);
		return vector(-this.y, this.x);
	}

	to_complex(): Complex {
		this.assert_size(2);
		return new Complex(this.x, this.y);
	}

	/** Compare two vectors */
	equal(v2: Vector) {
		this.check_compatibility(v2);
		for (let i = 0; i < this.size; i++) {
			if (this.v[i] != v2.v[i])
				return false;
		}

		return true;
	}

	/** Compare two vectors with space for error */
	near_equal(v2: Vector, max_diff: number) {
		this.check_compatibility(v2);
		for (let i = 0; i < this.size; i++) {
			if (this.v[i] - v2.v[i] > max_diff)
				return false;
		}

		return true;
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

/** Perform a 2D rotation of two **orthogonal** input vectors along their shared plane.
 * @param{Vector} base_x  The first orthogonal vector.
 * @param{Vector} base_y  The second orthogonal vector. 
 * @param{Vector} rot_vec A **normalized** vector representing the rotation angle.
 * @return{[Vector,Vector]} The rotated vectors */
export function rotate_vectors(base_x: Vector, base_y: Vector, rot_vec: Vector): [Vector,Vector] {
	return [
		base_x.scale(rot_vec.v[0]).add(base_y.scale(rot_vec.v[1])),
		base_x.scale(-rot_vec.v[1]).add(base_y.scale(rot_vec.v[0]))
	];
}

export interface IntersectionFlags {
	/** This flag instructs an intersection function to be less strict on getting rid of infinity.
	 * For example, with this flag, line_intersection() function on Plane returns a point with
	 * Infinity or -Infinity for its fields if a line is parallel to a plane. */
	allow_infinity?: boolean
}

export interface Entity {
	line_intersection(line: Line, flags: IntersectionFlags): Vector[];
}

export class Plane implements Entity {
	normal: Vector;
	pos: Vector;
	constructor(normal: Vector, pos: Vector, flags: { assume_normalized?: boolean } = {}) {
		this.normal = flags.assume_normalized ? normal : normal.normalize();
		this.pos = pos;
	}

	line_intersection(line: Line, flags: IntersectionFlags = {}): Vector[] {
		let denom = line.dir.dot(this.normal);
		if (denom == 0 && !flags.allow_infinity)
			return [];

		let off_dist = this.pos.sub(line.start);
		let ratio = off_dist.dot(this.normal) / denom;
		return [line.start.add(line.dir.scale(ratio))];
	}
}

export class Sphere implements Entity {
	radius: number;
	pos: Vector;
	constructor(pos: Vector, radius: number) {
		this.pos = pos;
		this.radius = radius;
	}

	line_intersection(line: Line): Vector[] {
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
