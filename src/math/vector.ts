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
export interface Vector {
	v: number[];
}

export interface Vector2 extends Vector {
	v: [number,number];
}

export interface Vector3 extends Vector {
	v: [number,number,number];
}

export function create(numbers: number[], flags: { no_copy?: boolean }): Vector {
	if (flags.no_copy)
		return { v: numbers };
	else
		return { v: [...numbers] }
}


export function new_empty_sized(dim: number): Vector {
	return <Vector> { v: Array(dim) };
}

export function clone(v: Vector): Vector {
	return <Vector> { v: [...v.v] };
}

export function copy(dest: Vector, src: Vector): Vector {
	for (let i = 0; i < src.v.length; i++)
		dest.v[i] = src.v[i];

	return dest;
}

export function size(v: Vector): number {
	return v.v.length;
}

export function are_compatible(v1: Vector, v2: Vector): boolean {
	return v1.v.length == v2.v.length;
}

export function assert_compatibility(v1: Vector, v2: Vector) {
	if (!are_compatible(v1, v2))
		throw new VectorError("v1 and v2 must have the same size");
}


export function assert_size(v: Vector, s: number) {
	if (size(v) != s)
		throw new VectorError(`Size assertion (this.size == ${size}) failed`);
}

export function dot(v1: Vector, v2: Vector) {
	assert_compatibility(v1, v2);

	let sum = 0;
	for (let i=0; i < size(v1); i++) {
		sum += v1.v[i] * v2.v[i];
	}
	return sum;
}

export function cross(v1: Vector3, v2: Vector3): Vector3 {
	const res = <Vector3> new_empty_sized(size(v1));
	res.v[0] = v1.v[1]*v2.v[2] - v1.v[2]*v2.v[1];
	res.v[1] = v1.v[2]*v2.v[0] - v1.v[0]*v2.v[2];
	res.v[2] = v1.v[0]*v2.v[1] - v1.v[1]*v2.v[0];
	return res;
}

export function hadamard(v1: Vector, v2: Vector): Vector {
	assert_compatibility(v1, v2);
	const res = new_empty_sized(size(v1));
	for (let i=0; i < size(v1); i++)
		res.v[i] = v1.v[i] * v2.v[i];

	return res;
}

export function add(v1: Vector, v2: Vector): Vector {
	assert_compatibility(v1, v2);
	const sz = size(v1);
	const res = new_empty_sized(sz);
	for (let i=0; i < sz; i++) {
		res.v[i] = v1.v[i] + v2.v[i];
	}
	return res;
}

export function sub(v1: Vector, v2: Vector): Vector {
	assert_compatibility(v1, v2);
	const sz = size(v1);
	const res = new_empty_sized(sz);
	for (let i=0; i < sz; i++) {
		res.v[i] = v1.v[i] - v2.v[i];
	}
	return res;
}

export function scale(v: Vector, scalar: number): Vector {
	const sz = size(v);
	const res = new_empty_sized(sz);
	for (let i=0; i < sz; ++i) {
		res.v[i] = v.v[i] * scalar;
	}
	return res;
}

export function negate(v: Vector): Vector {
	const sz = size(v);
	const res = new_empty_sized(sz);
	for (let i=0; i < sz; ++i) {
		res.v[i] = -v.v[i];
	}
	return res;
}

export function length_sq(v: Vector): number {
	return dot(v,v);
}

export function length(v: Vector): number {
	return Math.sqrt(length_sq(v));
}

/** Get the angle between a 2D vector and the X axis in radians */
export function angle2D(v: Vector2): number {
	return Math.atan2(v.v[1], v.v[0]);
}

export function	add_self(v1: Vector, v2: Vector): Vector {
	assert_compatibility(v1, v2);
	for (let i=0; i < size(v1); i++) {
		v1.v[i] += v2.v[i];
	}
	return v1;
}

export function sub_self(v1: Vector, v2: Vector): Vector {
	assert_compatibility(v1, v2);
	for (let i=0; i < size(v1); i++) {
		v1.v[i] -= v2.v[i];
	}
	return v1;
}

export function scale_self(v: Vector, scalar: number): Vector {
	for (let i=0; i < size(v); i++) {
		v.v[i] *= scalar;
	}
	return v;
}

export function normalize(v: Vector): Vector {
	return scale(v, 1.0/length(v));
}

export function normalize_self(v: Vector): Vector {
	return scale_self(v, 1.0/length(v));
}

/** Return a copy of the vector extended to n dimensions.
 * New fields are filled with zeros.
 */
export function extend(v: Vector, n: number, fields?: number[]): Vector {
	const sz = size(v);

	if (n < sz)
		throw new VectorError("The requested vector size is smaller than the current size of the vector");

	const new_fields = fields ?? Array(n - sz).fill(0);

	if (new_fields.length < (n - sz))
		throw new VectorError("Not enough elements passed");

	return <Vector> { v: [...v.v, ...new_fields] };
}

/** Return a copy of the vector with only the first n fields and remove all further */
export function reduce(v: Vector, n: number) {
	if (n > size(v) - 1)
		throw new VectorError("The requested vector size exceeds the vector's total size");

	return <Vector> { v: v.v.slice(0,n) };
}

/** Get the vector orthogonal to the 2D vector clockwise */
export function ortho(v: Vector2): Vector2 {
	return <Vector2> {v: [-v.v[1], v.v[0]]};
}

/** Rotate the 2d vector along the xy plane.
* @param{number} angle Rotation angle in radians.
*/
export function rotate_2d(v: Vector2, angle: number): Vector2 {
	const base_y = ortho(v);

	let [sin, cos] = [Math.sin(angle), Math.cos(angle)];
	return <Vector2> add(scale(v,cos), scale(base_y,sin))
}

/** Rotate the 3d vector around the normal vector.
 * There is no verification for the right angle thus
 * the transformation will be uneven if vectors aren't perpendicular.
 * @param{Vector} normal Vector perpendicular to this vector.
 * @param{number} angle  Rotation angle in radians.
 */
export function rotate_normal(v: Vector3, normal: Vector3, angle: number): Vector3 {
	const base_y = cross(v, normal);
	scale_self(base_y, Math.sqrt(length_sq(v)/length_sq(base_y)))

	let [sin, cos] = [Math.sin(angle), Math.cos(angle)];
	return <Vector3> add(scale(v, cos), scale(base_y, sin));
}

	/** Rotate a 3d vector around an axis by two times the half_angle angle */
export function rotate_axis(v: Vector3, axis: Vector3, half_angle: Vector2): Vector3 {	
	const t_v = v;
	const [q_r, q_v] = [half_angle.v[0], <Vector3> scale(axis, half_angle.v[1])];

	const i_r = -dot(q_v, t_v);
	const i_v = <Vector3> add(scale(t_v, q_r), cross(q_v, t_v));
	//const r_r = i_r*q_r + dot(i_v,q_v);
	const r_v = <Vector3> add(add(scale(q_v, -i_r), scale(i_v, q_r)),
												           cross(i_v, <Vector3> negate(q_v)));

	return r_v;
}

	/** Get reflection direction of this vector with respect to a specific normal.
	 * The normal is **assummed to be normalized**. */
export function reflection(v: Vector, normal: Vector): Vector {
	assert_compatibility(v, normal);

	const norm_scale = -dot(v, normal);
	return add(v, scale(normal, norm_scale * 2));
}

export function	to_complex(v: Vector2): Complex {
	return new Complex(v.v[0], v.v[1]);
}

	/** Compare two vectors */
export function equal(v1: Vector, v2: Vector) {
	assert_compatibility(v1, v2);
	for (let i = 0; i < size(v1); i++) {
		if (v1.v[i] != v2.v[i])
			return false;
	}

	return true;
}

/** Compare two vectors with space for error */
export function near_equal(v1: Vector, v2: Vector, max_diff: number) {
	assert_compatibility(v1, v2);
	for (let i = 0; i < size(v1); i++) {
		if (v1.v[i] - v2.v[i] > max_diff)
			return false;
	}
	return true;
}


/** Get an n-dimensional vector with all fields to 1 */
export function new_filled(ndim: number, fill: number): Vector {
	return { v: Array(ndim).fill(fill) };
}

export function vector(...values: number[]): Vector {
	return <Vector> { v: values };
}

export function vector2(x: number, y: number): Vector2 {
	return <Vector2> { v: [x,y] };
}

export function vector3(x: number, y: number, z: number): Vector3 {
	return <Vector3> { v: [x,y,z] };
}

/** Perform a 2D rotation of two **orthogonal** input vectors along their shared plane.
 * @param{Vector} base_x  The first orthogonal vector.
 * @param{Vector} base_y  The second orthogonal vector. 
 * @param{Vector2} rot_vec A **normalized** vector representing the rotation angle.
 * @return{[Vector,Vector]} The rotated vectors */
export function rotate_vectors(base_x: Vector, base_y: Vector, rot_vec: Vector2): [Vector,Vector] {
	return [
		add(scale(base_x, rot_vec.v[0]), scale(base_y, rot_vec.v[1])),
		add(scale(base_x, -rot_vec.v[1]), scale(base_y, rot_vec.v[0]))
	];
}
