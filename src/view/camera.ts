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

import { Vector, vector, rotate_vectors } from '@app/math/linalg';

export interface CameraPixel {
	x: number;
	y: number;
	dir: Vector;
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

export class Camera {
	private conf: CameraConfig;
	private norm_fr: Vector;
	private norm_lf: Vector;
	private norm_up: Vector;
	private rot_v_v: Vector;
	private rot_h_v: Vector;
	private rot_scan_h_v: Vector;
	private rot_scan_v_v: Vector;

	constructor(conf: CameraConfig, init_v_angle?: number, init_h_angle?: number) {
		this.conf = Object.assign({}, conf);
		this.norm_fr = vector(1,0,0);
		this.norm_lf = vector(0,1,0);
		this.norm_up = vector(0,0,1);

		this.init_rot_vectors();

		if (init_h_angle != undefined)
			this.rotate_h(init_h_angle);

		if (init_v_angle != undefined)
			this.rotate_v(init_v_angle);
	}

	private init_rot_vectors() {
		const conf = this.conf;
		this.rot_h_v = vector(Math.cos(conf.rot_h), Math.sin(conf.rot_h));
		this.rot_v_v = vector(Math.cos(conf.rot_v), Math.sin(conf.rot_v));

		const rad_h_per_pixel = this.conf.fov_h / this.conf.screen_w;
		const rad_v_per_pixel = this.conf.fov_v / this.conf.screen_h;

		this.rot_scan_h_v = vector(Math.cos(rad_h_per_pixel), Math.sin(rad_h_per_pixel));
		this.rot_scan_v_v = vector(Math.cos(rad_v_per_pixel), Math.sin(rad_v_per_pixel));
	}

	/** Rotate the camera in horizontal axis */
	rotate_h(angle: number) {
		const rot_h_v = vector(Math.cos(angle), Math.sin(angle));
		this.rotate_h_v(rot_h_v);
	}

	/** Rotate the camera in vertical axis */
	rotate_v(angle: number) {
		const rot_v_v = vector(Math.cos(angle), Math.sin(angle));
		this.rotate_v_v(rot_v_v);
	}

	/** Rotate the camera vertically (with conf.rot_v angle) by n steps */
	rotate_h_step(n: number) {
		const rot_vec = n >= 0 ? this.rot_v_v : vector(this.rot_v_v.x, -this.rot_v_v.y);
		const steps = Math.abs(n);
		for (let i = 0; i < steps; i++)
			this.rotate_h_v(rot_vec);
	}

	/** Rotate the camera horizontally (with conf.rot_v angle) by n steps */
	rotate_v_step(n: number) {
		const rot_vec = n >= 0 ? this.rot_h_v : vector(this.rot_h_v.x, -this.rot_h_v.y);
		for (let i = 0; i < n; i++) {
			if (!this.rotate_v_v(rot_vec))
				break;
		}
	}

	/** Rotate the camera horizontally by the angle between positive X-axis [1,0] and a **normalized** 2D vector v.
	 * @return true */
	rotate_h_v(v: Vector): boolean {
		let norm_fr_xy = vector(this.norm_fr.x, this.norm_fr.y)
		let norm_fr_ortho_xy = vector(-this.norm_fr.y, this.norm_fr.x);
		let norm_lf_xy = vector(this.norm_lf.x, this.norm_lf.y);
		let norm_lf_ortho_xy = vector(-this.norm_lf.y, this.norm_lf.x);
		[norm_fr_xy] = rotate_vectors(norm_fr_xy, norm_fr_ortho_xy, v);
		[norm_lf_xy] = rotate_vectors(norm_lf_xy, norm_lf_ortho_xy, v);
		this.norm_fr = norm_fr_xy.extend(3, [this.norm_fr.z]);
		this.norm_lf = norm_lf_xy.extend(3, [this.norm_lf.z]);
		this.norm_up = this.norm_fr.cross(this.norm_lf);
		return true;
	}

	/** Rotate the camera vertically by the angle between positive X-axis [1,0] and a **normalized** 2D vector v.
	 * @return true except when 'this.conf.flags.vertical_locked' is set and it's not possible to rotate further. */
	rotate_v_v(v: Vector): boolean {
		const cmp_sign = v.y < 0 ? 1 : -1;

		const [norm_fr, norm_up] = rotate_vectors(this.norm_fr, this.norm_up, v);
		if (this.conf.flags.vertical_locked && Math.sign(norm_fr.z - this.norm_fr.z) == cmp_sign)
			return false;

		this.norm_fr = norm_fr;
		this.norm_up = norm_up;

		return true;
	}

	reset_angles() {
		this.norm_fr = vector(1,0,0);
		this.norm_lf = vector(0,1,0);
		this.norm_up = vector(0,0,1);
	}

	/** Yield the direction vector for each pixel on the screen. */
	*get_dir_for_each_pixel(): Generator<CameraPixel> {
		const conf = this.conf;
		const camera = this; // to avoid a bug? in typescript transpillers that causes
		                     // 'this' to become undefined in the context of generator lambdas.

		const rot_scan_h_counter_v = vector(this.rot_scan_h_v.x, -this.rot_scan_h_v.y);
		const rot_scan_v_counter_v = vector(this.rot_scan_v_v.x, -this.rot_scan_v_v.y);

		const iter_h = function* (from_x: number, to_x: number, y: number,
														  rot_vec: Vector, beg_fr_v: Vector, loop_inc: number)
		{
			let fr_v = beg_fr_v;
			let lf_v = camera.norm_lf;

			for (let i = from_x; i != to_x; i += loop_inc) {
				[fr_v, lf_v] = rotate_vectors(fr_v, lf_v, rot_vec);
				yield { x: i, y: y, dir: lf_v.clone() };
			}
		}

		const iter_v = function* (from_y: number, to_y: number,
															rot_vec: Vector, loop_inc: number)
		{
			let fr_v = camera.norm_fr;
			let up_v = camera.norm_up;

			for (let i = from_y; i != to_y; i += loop_inc) {
				[fr_v, up_v] = rotate_vectors(fr_v, up_v, rot_vec);
				yield* iter_h((conf.screen_h>>1) + 1, conf.screen_h, i, camera.rot_scan_h_v, fr_v, 1);
				yield* iter_h(conf.screen_h>>1, 0, i, rot_scan_h_counter_v, fr_v, -1);
			}
		}

		yield* iter_v((conf.screen_w>>1) + 1, conf.screen_w, camera.rot_scan_v_v, 1);
		yield* iter_v(conf.screen_w>>1, 0, rot_scan_v_counter_v, -1);
	}
}
