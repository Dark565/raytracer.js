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

import * as vector from '@app/math/vector';

export type Vector = vector.Vector;
export type Point = Vector;
export var point = vector.vector;

export interface Line {
	start: Point;
	dir: Vector;
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

// fast dot
//function dot3(v1: Vector, v2: Vector) {
//	return v1.v[0] * v2.v[0] +
//		     v1.v[1] * v2.v[1] +
//				 v1.v[2] * v2.v[2];
//}

export class Plane implements Entity {
	normal: Vector;
	pos: Vector;
	constructor(normal: Vector, pos: Vector, flags: { assume_normalized?: boolean } = {}) {
		this.normal = flags.assume_normalized ? normal : vector.normalize(normal);
		this.pos = pos;
	}

	line_intersection(line: Line, flags: IntersectionFlags = {}): Vector[] {
		let denom = vector.dot(line.dir, this.normal);
		//const denom = dot3(line.dir, this.normal);
		if (denom == 0 && !flags.allow_infinity)
			return [];

		let tmp_vec = vector.sub(this.pos, line.start);

		//let off_dist = vector.sub(this.pos, line.start);
		let ratio = vector.dot(tmp_vec, this.normal) / denom;
		//const ratio = dot3(off_dist, this.normal) / denom;

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

		vector.copy(tmp_vec, line.start);
		return [vector.add_self(tmp_vec, vector.scale(line.dir, ratio))];
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
		this._dot_pp    = vector.dot(this._pos,this._pos);
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
	const dist = vector.sub(line.start, this.pos);
	const a = vector.dot(line.dir, line.dir);
	const b = vector.dot(dist, line.dir)*2;
	const c = vector.dot(line.start, line.start) + this._dot_pp -
		        vector.dot(line.start, this.pos)*2 - this._radius_sq;

	const delta = b*b - a*c*4;
	if (delta < 0)
		return [];

	//console.log(`sqhere intersected`)
	let s_delta = Math.sqrt(delta);
	let tmp1 = -b / (a*2);
	let tmp2 = s_delta / (a*2);
	let t1 = tmp1 - tmp2;
	let t2 = tmp1 + tmp2;

	const p1 = vector.add(line.start, vector.scale(line.dir, t1));
	const p2 = vector.add(line.start, vector.scale(line.dir, t2));

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

