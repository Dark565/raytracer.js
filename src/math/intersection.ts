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
	BACKWARD,
}

export interface IntersectionFlags {
	/** This flag instructs an intersection function to not get rid of infinity.
	 * For example, with this flag, line_intersection() function on Plane returns a +-infinity
	 * parameter if a line is parallel to a plane. */
	allow_infinity?: boolean
}

export interface IntersectionInfo {
	parameter: number;
}

export interface IntersectionInfoWithNormal extends IntersectionInfo {
	normal: Vector;
}

export interface Intersectable {
	line_intersection(line: Line, flags: IntersectionFlags): IntersectionInfo[];
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

		return [{
			parameter: ratio,
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

		return [{parameter: t1}, {parameter: t2}];
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

		return [{parameter: u2, normal: normal2}, {parameter: u1, normal: normal1}];
	}
}

export function select_parameters(param: IntersectionInfo[], dir: IntersectionDirection): IntersectionInfo[] {
	switch (dir) {
	case IntersectionDirection.FORWARD:
		return param.filter((i) => i.parameter >= 0);
	case IntersectionDirection.BACKWARD:
		return param.filter((i) => i.parameter < 0);
	default: // IntersectionDirecton.BOTH
		return param;
	}
}

export function compute_intersection_point(line: Line, param: IntersectionInfo): Point {
	return vector.add(line.start, vector.scale(line.dir, param.parameter));
}
