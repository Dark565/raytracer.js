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
	//size: number;

	constructor(x: number|number[]|Vector, flags: { no_copy?: boolean, no_init?: boolean } = {}) {
		if (x instanceof Array) {
			this.v = flags.no_copy ? x : x.slice(0);
		} else if (x instanceof Vector) {
			this.copy_from(x);
		} else if (Number.isInteger(x)) {
			this.v = flags.no_init ? Array(x) : Array(x).fill(0);
		}
	}

	static new_empty_sized(dim: number) {
		return new Vector(dim, { no_init: true });
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

	get w(): number {
		return this.z[3];
	}

	get size() {
		return this.v.length;
	}

	copy_from(x: Vector) {
		this.v = x.v.slice(0);
	}

	clone() {
		return new Vector(this);
	}

	is_compatible(v2: Vector) {
		return this.size == v2.size;
	}

	assert_compatibility(v2: Vector) {
		if (!this.is_compatible(v2))
			throw new VectorError("this and v2 must have the same size");
	}

	dot(v2: Vector) {
		this.assert_compatibility(v2);

		let sum = 0;
		for (let i=0; i < this.size; i++) {
			sum += this.v[i] * v2.v[i];
		}
		return sum;
	}

	cross(v2: Vector) {
		this.assert_size(3);
		v2.assert_size(3);

		const res = Vector.new_empty_sized(this.size);
		res.v[0] = this.v[1]*v2.v[2] - this.v[2]*v2.v[1];
		res.v[1] = this.v[2]*v2.v[0] - this.v[0]*v2.v[2];
		res.v[2] = this.v[0]*v2.v[1] - this.v[1]*v2.v[0];
		return res;
	}

	hadamard(v2: Vector) {
		this.assert_compatibility(v2);
		const res = Vector.new_empty_sized(this.size);
		for (let i=0; i < this.size; i++)
			res.v[i] = this.v[i] * v2.v[i];
	}

	add(v2: Vector) {
		this.assert_compatibility(v2);
		//let res = this.clone();
		const res = Vector.new_empty_sized(this.size);
		for (let i=0; i < this.size; i++) {
			res.v[i] = this.v[i] + v2.v[i];
		}
		return res;
	}

	sub(v2: Vector) {
		this.assert_compatibility(v2);
		//let res = this.clone();
		const res = Vector.new_empty_sized(this.size);
		for (let i=0; i < this.size; i++) {
			res.v[i] = this.v[i] - v2.v[i];
		}
		return res;
	}

	scale(scalar: number): Vector {
		//let res = this.clone();
		const res = Vector.new_empty_sized(this.size);
		for (let i=0; i < res.size; ++i) {
			res.v[i] = this.v[i] * scalar;
		}
		return res;
	}

	negate(): Vector {
		//let res = this.clone();
		const res = Vector.new_empty_sized(this.size);
		for (let i=0; i < res.size; ++i) {
			res.v[i] = -this.v[i];
		}
		return res;
	}

	length_sq() {
		return this.dot(this);
	}

	length() {
		return Math.sqrt(this.length_sq());
	}

	/** Get the angle between a 2D vector and the X axis in radians */
	angle() {
		this.assert_size(2);
		return Math.atan2(this.y, this.x);
	}

	assign(v2: Vector) {
		for (let i=0; i < this.size; i++) {
			this.v[i] = v2.v[i];
		}
		return this;
	}

	add_self(v2: Vector) {
		this.assert_compatibility(v2);
		for (let i=0; i < this.size; i++) {
			this.v[i] += v2.v[i];
		}
		return this;
	}

	sub_self(v2: Vector) {
		this.assert_compatibility(v2);
		for (let i=0; i < this.size; i++) {
			this.v[i] -= v2.v[i];
		}
		return this;
	}

	scale_self(scalar: number) {
		for (let i=0; i < this.size; i++) {
			this.v[i] *= scalar;
		}
		return this;
	}


	normalize() {
		const len = this.length();
		//let res = this.clone();
		const res = Vector.new_empty_sized(this.size);
		for (let i=0; i < this.size; i++)
			res.v[i] = this.v[i] / len;

		return res;
	}

	normalize_self() {
		const len = this.length();
		return this.scale_self(1.0/len);
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
			throw new VectorError("The requested vector size is smaller than the current size of the vector");

		const new_fields = fields ?? Array(n - this.size).fill(0);

		if (new_fields.length < (n - this.size))
			throw new VectorError("Not enough elements passed");

		return vector(...this.v, ...new_fields);
	}

	/** Return a copy of the vector with only the first n fields and remove all further */
	reduce(n: number) {
		if (n > this.size - 1)
			throw new VectorError("The requested vector size exceeds the vector's total size");

		return new Vector(this.v.slice(0,n), { no_copy: true });
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

	/** Get reflection direction of this vector with respect to a specific normal.
	 * The normal is **assummed to be normalized**.
	 * The effect is the same as calling rotate_axis with [1,0] (i.e 90 degree) half_angle, but
	 * this function is optimized specifically for reflection and additionally works for any vector size. */
	reflection(normal: Vector): Vector {
		this.assert_compatibility(normal);

		const norm_scale = -this.dot(normal);
		return this.add(normal.scale(norm_scale * 2));
	}

	/** Get the vector orthogonal to the 2D vector clockwise */
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
		this.assert_compatibility(v2);
		for (let i = 0; i < this.size; i++) {
			if (this.v[i] != v2.v[i])
				return false;
		}

		return true;
	}

	/** Compare two vectors with space for error */
	near_equal(v2: Vector, max_diff: number) {
		this.assert_compatibility(v2);
		for (let i = 0; i < this.size; i++) {
			if (this.v[i] - v2.v[i] > max_diff)
				return false;
		}

		return true;
	}
}

export function vector(...numbers: number[]): Vector {
	return new Vector(numbers, { no_copy: true });
}


/** Get an n-dimensional vector with all fields to 1 */
export function one_vector(ndim: number): Vector {
	return vector(...Array(ndim).fill(1));
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

export enum IntersectionDirection {
	BOTH,
	FORWARD,
	BACKWAR,
}

export interface IntersectionFlags {
	/** This flag instructs an intersection function to not get rid of infinity.
	 * For example, with this flag, line_intersection() function on Plane returns a point with
	 * Infinity or -Infinity for its fields if a line is parallel to a plane. */
	allow_infinity?: boolean

	/** The allowed direction of intersection point. */
	intersection_direction?: IntersectionDirection
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

		switch (flags.intersection_direction ?? IntersectionDirection.BOTH) {
			case IntersectionDirection.BOTH:
				break;
			case IntersectionDirection.FORWARD:
				if (ratio < 0.0)
					return [];
			default: // BACKWARD
				if (ratio > 0.0)
					return [];
			}

		return [line.start.add(line.dir.scale(ratio))];
	}
}

export class Sphere implements Entity {
	/* cache */
	private _dot_pp: number;
	private _radius_sq: number;

	private _radius: number;
	private _pos: Vector;
	constructor(pos: Vector, radius: number) {
		this._pos = pos;
		this._radius = radius;

		this.update_cache();
	}

	private update_cache() {
		this._dot_pp    = this._pos.dot(this._pos);
		this._radius_sq = this._radius * this._radius;
	}

	set pos(pos: Vector) {
		this.pos = pos;
		this.update_cache();
	}

	get pos() {
		return this._pos;
	}

	set radius(radius: number) {
		this._radius = radius;
		this.update_cache();
	}

	get radius() {
		return this._radius;
	}

 line_intersection(line: Line, flags: IntersectionFlags = {}): Vector[] {
	const sp_dir = flags.intersection_direction ?? IntersectionDirection.BOTH;
	const dist = line.start.sub(this.pos);
	const a = line.dir.dot(line.dir);
	const b = dist.dot(line.dir)*2;
	const c = line.start.dot(line.start) + this._dot_pp
	         - line.start.dot(this.pos)*2 - this._radius_sq;

	const delta = b*b - a*c*4;
	if (delta < 0)
		return [];

	//console.log(`sqhere intersected`)
	let s_delta = Math.sqrt(delta);
	let tmp1 = -b / (a*2);
	let tmp2 = s_delta / (a*2);
	let t1 = tmp1 - tmp2;
	let t2 = tmp1 + tmp2;

	const p1 = line.start.add(line.dir.scale(t1));
	const p2 = line.start.add(line.dir.scale(t2));

	// -- aggresive optimization by using LUT
	
	const a_p1_p2 = [p1,p2];
	const a_p2_p1 = [p2,p1];
	const a_p2 = [p2];

	const res_matrix = [
		  a_p1_p2, a_p1_p2, a_p1_p2, a_p1_p2,
		  [],      [],      a_p2,    a_p1_p2,
		  a_p2_p1, [],      a_p1_p2, []
	]

	const lut_col_idx = (Number(t2 >= 0) << 1) | Number(t1 >= 0);
	return res_matrix[sp_dir * 4 + lut_col_idx];
 }
}

