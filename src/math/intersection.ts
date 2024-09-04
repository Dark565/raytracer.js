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

import { Point, Vector, Line } from '@app/math/geometry';
import * as vector from '@app/math/vector';

/* TODO: Take the intersection checking function outside of class */

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

export interface IntersectionInfo {
	point: Point;
}

export interface IntersectionInfoWithNormal extends IntersectionInfo {
	normal: Vector;
}

export interface Intersectable {
	line_intersection(line: Line, flags: IntersectionFlags): IntersectionInfo[];
}

/** Select intersection points according to flags.intersection_direction. */
function select_intersection_points2(line: Line, t1: number, t2: number, flags: IntersectionFlags,
																		i1?: IntersectionInfo, i2?: IntersectionInfo): IntersectionInfo[] {

		const sp_dir = flags.intersection_direction ?? IntersectionDirection.BOTH;

		const cr1 = Object.assign({}, i1);
		cr1.point = vector.add(line.start, vector.scale(line.dir, t1));

		const cr2 = Object.assign({}, i2);
		cr2.point = vector.add(line.start, vector.scale(line.dir, t2));

		const a_cr1_cr2 = [cr1,cr2];
		const a_cr2_cr1 = [cr2,cr1];
		const a_cr2 = [cr2];

		const res_matrix = [
				a_cr1_cr2, a_cr1_cr2, a_cr1_cr2, a_cr1_cr2,
				[],        [],        a_cr2,     a_cr1_cr2,
				a_cr2_cr1, [],        a_cr1_cr2, []
		];

		const lut_col_idx = (Number(t2 >= 0) << 1) | Number(t1 >= 0);
		return res_matrix[sp_dir * 4 + lut_col_idx];
}

export class Plane implements Intersectable {
	normal: Vector;
	pos: Vector;
	constructor(normal: Vector, pos: Vector, flags: { assume_normalized?: boolean } = {}) {
		this.normal = flags.assume_normalized ? normal : vector.normalize(normal);
		this.pos = pos;
	}

	line_intersection(line: Line, flags: IntersectionFlags = {}): IntersectionInfoWithNormal[] {
		let denom = vector.dot(line.dir, this.normal);
		if (denom == 0 && !flags.allow_infinity)
			return [];

		let tmp_vec = vector.sub(this.pos, line.start);

		let ratio = vector.dot(tmp_vec, this.normal) / denom;

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
		return [{
			point: vector.add_self(tmp_vec, vector.scale(line.dir, ratio)),
			normal: this.normal
		}];
	}
}

export class Sphere implements Intersectable {
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

	line_intersection(line: Line, flags: IntersectionFlags = {}): IntersectionInfo[] {
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

		return select_intersection_points2(line, t1, t2, flags);
	}
}

/** AABB box */
export class Box implements Intersectable {
	pos: Point;
	size: Vector;

	constructor(pos: Point, size: Vector) {
		this.pos = pos;
		this.size = size;
	}

	static FACE_NORMALS = [
		vector.vector(-1,0,0), // left,
		vector.vector(1,0,0),  // right
		vector.vector(0,-1,0), // top
		vector.vector(0,1,0),  // bottom
		vector.vector(0,0,-1), // front
		vector.vector(0,0,1)   // back
	];

	line_intersection(line: Line, flags: IntersectionFlags): IntersectionInfoWithNormal[] {
		const tl_pos = vector.sub(this.pos, vector.scale(this.size, 0.5));

		const p = [
			line.start.v[0] - tl_pos.v[0],
			tl_pos.v[0] + this.size.v[0] - line.start.v[0],
			line.start.v[1] - tl_pos.v[1],
			tl_pos.v[1] + this.size.v[1] - line.start.v[1],
			line.start.v[2] - tl_pos.v[2],
			tl_pos.v[2] + this.size.v[2] - line.start.v[2]
		];

		const q = [
			-line.dir.v[0],
			 line.dir.v[0],
			-line.dir.v[1],
			 line.dir.v[1],
			-line.dir.v[2],
			 line.dir.v[2]
		];

		let u1 = -Infinity;
		let u2 = Infinity;

		let i1: number = undefined;
		let i2: number = undefined;

		for (let i = 0; i < 6; ++i) {
			const elem = p[i];
			const u = elem / q[i];
			if (elem < 0) {
				if (u > u1) {
					u1 = u;
					i1 = i;
				}
			} else {
				if (u < u2) {
					u2 = u;
					i2 = i;
				}
			}
		}

		if (u1 > u2)
			return [];

		const normal1 = Box.FACE_NORMALS[i1];
		const normal2 = Box.FACE_NORMALS[i2];

		return <IntersectionInfoWithNormal[]> select_intersection_points2(line, u1, u2, flags,
                                         <IntersectionInfoWithNormal> { normal: normal1 },
                                         <IntersectionInfoWithNormal> { normal: normal2 });
	}
}
