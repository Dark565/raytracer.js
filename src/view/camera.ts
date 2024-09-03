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

import { Point, Vector } from '@app/math/geometry';
import * as vector from '@app/math/vector';

export interface CameraPixel {
	x: number;
	y: number;
	dir: vector.Vector3;
}

/** Configuration of the Camera */
export interface CameraConfig {
	/** Vertical FOV in radians */
	fov_v: number;
	/** Horizontal FOV in radians */
	fov_h: number;
	/** Screen width */
	screen_w: number;
	/** Screen height */
	screen_h: number;
	/** Vertical rotation angle in radians */
	rot_v: number;
	/** Horizontal rotation angle in radians */
	rot_h: number;
	/** Camera flags */
	flags: {
		/** If this flag is true, the vertical rotation is locked to 180 degrees (90 up, 90 down). */
		vertical_locked?: boolean 
	}
}

type Vec2Pair = [vector.Vector2, vector.Vector2];
type Vec3Pair = [vector.Vector3, vector.Vector3];

export class Camera {
	private conf: CameraConfig;
	private pos: Point;
	private norm_fr: vector.Vector3;
	private norm_lf: vector.Vector3;
	private norm_up: vector.Vector3;
	private rot_v_v: vector.Vector2;
	private rot_h_v: vector.Vector2;
	private rot_scan_h_v: vector.Vector2;
	private rot_scan_v_v: vector.Vector2;

	constructor(conf: CameraConfig, init_pos: Point, init_v_angle?: number, init_h_angle?: number) {
		this.conf = Object.assign({}, conf);
		this.pos = vector.clone(init_pos);
		this.norm_fr = vector.vector3(1,0,0);
		this.norm_lf = vector.vector3(0,1,0);
		this.norm_up = vector.vector3(0,0,1);

		this.init_rot_vectors();

		if (init_h_angle != undefined)
			this.rotate_h(init_h_angle);

		if (init_v_angle != undefined)
			this.rotate_v(init_v_angle);
	}

	private init_rot_vectors() {
		const conf = this.conf;
		this.rot_h_v = vector.vector2(Math.cos(conf.rot_h), Math.sin(conf.rot_h));
		this.rot_v_v = vector.vector2(Math.cos(conf.rot_v), Math.sin(conf.rot_v));

		const rad_h_per_pixel = this.conf.fov_h / this.conf.screen_w;
		const rad_v_per_pixel = this.conf.fov_v / this.conf.screen_h;

		this.rot_scan_h_v = vector.vector2(Math.cos(rad_h_per_pixel), Math.sin(rad_h_per_pixel));
		this.rot_scan_v_v = vector.vector2(Math.cos(rad_v_per_pixel), Math.sin(rad_v_per_pixel));
	}

	/** Rotate the camera in horizontal axis */
	rotate_h(angle: number) {
		const rot_h_v = vector.vector2(Math.cos(angle), Math.sin(angle));
		this.rotate_h_v(rot_h_v);
	}

	/** Rotate the camera in vertical axis */
	rotate_v(angle: number) {
		const rot_v_v = vector.vector2(Math.cos(angle), Math.sin(angle));
		this.rotate_v_v(rot_v_v);
	}

	/** Rotate the camera vertically (with conf.rot_v angle) by n steps */
	rotate_h_step(n: number) {
		const rot_vec = n >= 0 ? this.rot_v_v : vector.vector2(this.rot_v_v.v[0], -this.rot_v_v.v[1]);
		const steps = Math.abs(n);
		for (let i = 0; i < steps; i++)
			this.rotate_h_v(rot_vec);
	}

	/** Rotate the camera vertically (with conf.rot_v angle) by n steps */
	rotate_v_step(n: number) {
		const rot_vec = n >= 0 ? this.rot_h_v : vector.vector2(this.rot_h_v.v[0], -this.rot_h_v.v[1]);
		const steps = Math.abs(n);
		for (let i = 0; i < steps; i++) {
			if (!this.rotate_v_v(rot_vec))
				break;
		}
	}

	/** Rotate the camera horizontally by the angle between positive X-axis [1,0] and a **normalized** 2D vector v.
	 * @return true */
	rotate_h_v(v: vector.Vector2): boolean {
		let norm_fr_xy = vector.vector2(this.norm_fr.v[0], this.norm_fr.v[1])
		let norm_lf_xy = vector.vector2(this.norm_lf.v[0], this.norm_lf.v[1]);
		[norm_fr_xy] = <Vec2Pair> vector.rotate_vectors(norm_fr_xy, vector.ortho(norm_fr_xy), v);
		[norm_lf_xy] = <Vec2Pair> vector.rotate_vectors(norm_lf_xy, vector.ortho(norm_lf_xy), v);
		this.norm_fr = <vector.Vector3> vector.extend(norm_fr_xy, 3, [this.norm_fr.v[2]]);
		this.norm_lf = <vector.Vector3> vector.extend(norm_lf_xy, 3, [this.norm_lf.v[2]]);
		this.norm_up = vector.cross(this.norm_fr, this.norm_lf);
		return true;
	}

	/** Rotate the camera vertically by the angle between positive X-axis [1,0] and a **normalized** 2D vector v.
	 * @return true except when 'this.conf.flags.vertical_locked' is set and it's not possible to rotate further. */
	rotate_v_v(v: vector.Vector2): boolean {
		const cmp_sign = v.v[1] < 0 ? 1 : -1;

		const [norm_fr, norm_up] = <Vec3Pair> vector.rotate_vectors(this.norm_fr, this.norm_up, v);
		if (this.conf.flags.vertical_locked && Math.sign(norm_fr.v[2] - this.norm_fr.v[2]) == cmp_sign)
			return false;

		this.norm_fr = norm_fr;
		this.norm_up = norm_up;

		return true;
	}

	/** Reset camera angles */
	reset_angles() {
		this.norm_fr = vector.vector3(1,0,0);
		this.norm_lf = vector.vector3(0,1,0);
		this.norm_up = vector.vector3(0,0,1);
	}

	set_pos(p: Point) {
		vector.copy(this.pos, p);
	}

	get_pos() {
		return this.pos;
	}

	move(move_vec: Vector) {
		vector.add_self(this.pos, move_vec);
	}

	/** Move forward in the XY plane */
	move_xy_forward(scale = 1) {
		const fr_vec = this.get_xy_front_vector();
		this.move(vector.extend(vector.scale(fr_vec, scale), 3));
	}

	/** Move backward in the XY plane */
	move_xy_backward(scale = 1) {
		const fr_vec = this.get_xy_front_vector();
		this.move(vector.extend(vector.scale(fr_vec, -scale), 3));
	}

	/** Move left in the XY plane */
	move_xy_left(scale = 1) {
		const lf_vec = vector.ortho(this.get_xy_front_vector());
		this.move(vector.extend(vector.scale(lf_vec, -scale), 3));
	}

	/** Move right in the XY plane */
	move_xy_right(scale = 1) {
		const lf_vec = vector.ortho(this.get_xy_front_vector());
		this.move(vector.extend(vector.scale(lf_vec, scale), 3));
	}

	/** Get a normalized (or unnormalized) vector pointing forward from the camera in the XY plane. */
	get_xy_front_vector(flags: { unnormalized?: true } = {}): vector.Vector2 {
		const res = vector.reduce(this.norm_fr, 2);
		return <vector.Vector2> (flags.unnormalized ? res : vector.normalize(res));
	}

	/** Get the vector pointing forward from the camera */
	get_front_vector() {
		return vector.clone(this.norm_fr);
	}

	/** Limit or unlimit the camera's vertical rotation */
	set_vertical_lock_(on: boolean) {
		this.conf.flags.vertical_locked = on;
	}

	/** Yield the direction vector for each pixel on the screen. */
	*get_dir_for_each_pixel(): Generator<CameraPixel> {
		const conf = this.conf;
		const camera = this; // to avoid a bug? that causes
		                     // 'this' to become undefined in the context of generator lambdas.

		const rot_scan_h_counter_v = vector.vector2(this.rot_scan_h_v.v[0], -this.rot_scan_h_v.v[1]);
		const rot_scan_v_counter_v = vector.vector2(this.rot_scan_v_v.v[0], -this.rot_scan_v_v.v[1]);

		const iter_h = function* (from_x: number, to_x: number, y: number,
														  rot_vec: vector.Vector2, beg_fr_v: vector.Vector3, loop_inc: number,
														  rotate_first: boolean)
		{
			let fr_v = beg_fr_v;
			let lf_v = camera.norm_lf;

			if (rotate_first)
				[fr_v, lf_v] = <Vec3Pair> vector.rotate_vectors(fr_v, lf_v, rot_vec);

			for (let i = from_x; i != to_x; i += loop_inc) {
				yield { x: i, y: y, dir: <vector.Vector3> vector.clone(fr_v) };
				[fr_v, lf_v] = <Vec3Pair> vector.rotate_vectors(fr_v, lf_v, rot_vec);
			}
		}

		const iter_v = function* (from_y: number, to_y: number,
															rot_vec: vector.Vector2, loop_inc: number,
															rotate_first: boolean)
		{
			let fr_v = camera.norm_fr;
			let up_v = camera.norm_up;

			if (rotate_first)
				[fr_v, up_v] = <Vec3Pair> vector.rotate_vectors(fr_v, up_v, rot_vec);

			for (let i = from_y; i != to_y; i += loop_inc) {
				yield* iter_h(conf.screen_h>>1, conf.screen_h, i, camera.rot_scan_h_v, fr_v, 1, false);
				yield* iter_h((conf.screen_h>>1)-1, -1, i, rot_scan_h_counter_v, fr_v, -1, true);
				[fr_v, up_v] = <Vec3Pair> vector.rotate_vectors(fr_v, up_v, rot_vec);
			}
		}

		yield* iter_v(conf.screen_w>>1, conf.screen_w, camera.rot_scan_v_v, 1, false);
		yield* iter_v((conf.screen_w>>1)-1, -1, rot_scan_v_counter_v, -1, true);
	}
}
