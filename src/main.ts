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

import { Vector, Point, vector, point } from '@app/math/linalg';
import { Color } from '@app/physics/color';
import { clamp } from '@app/math/mathutils';
import { Octree } from '@app/octree';
import { SpaceOctree, OctreeWalker, new_subtree } from '@app/octree_space';
import { EntitySet, EntityOtree, new_entity_octree, add_entity_to_octree } from '@app/octree_entity';
import { Entity, CollisionInfo } from '@app/entity';
import { SphereEntity } from '@app/entities/entity_sphere';
import * as material from '@app/material';
import { SolidMaterial } from '@app/materials/material_solid';
import { BoxEntity } from '@app/entities/entity_box';
import { Raytracer } from '@app/raytracer';
import { Camera, CameraConfig } from '@app/view/camera';
import { CanvasScreen } from '@app/view/screen_canvas';

const CANVAS_ID = 'rtcanvas';
const STATS_DIV_ID = 'rtstats';
const REFMAX = 6;

// Return a random color vector from the RGB color space with a specific magnitude (intensity)
function get_random_color_with_intensity(intensity: number): Color {
	const [r,g,b] = Array(3).fill(0).map(()=>Math.random());
	const col_vec = vector(r,g,b).normalize_self().scale_self(intensity);
	return { r: col_vec.x, g: col_vec.y, b: col_vec.z, a: 1.0 };
}

function generate_some_aligned_entities(tree: EntityOtree, n_entities: number) {
	const entity_classes = [SphereEntity, BoxEntity];

	for (let i = 0; i < n_entities; i++) {
	const level = 1 + Math.floor(Math.random() * 2);
	const n_quant = 1 << (level);
		const size = 1 / n_quant;
		const [x, y, z] = [0,0,0].map(_ => { return ((Math.random() * n_quant) << 0) * size + size/2 });
		const rand_color = get_random_color_with_intensity(1.0);
		const new_material = new SolidMaterial(rand_color, true, material.ResponseType.REFLECTION);
		console.log(`${x}, ${y}, ${z}   ${size}`);
		const entity = new SphereEntity(undefined, new_material, point(x,y,z), size);
		entity.set_octree(tree);
		tree.value.set.add(entity);
		//add_entity_to_octree(tree, entity, { max_in_depth: 16, max_out_depth: 4 });
	}
	//add_entity_to_octree(tree, new SphereEntity(undefined, material, point(0.5,0.5,0.5), 1), { max_in_depth: 5, max_out_depth: 5 });
	//add_entity_to_octree(tree, new SphereEntity(undefined, material, point(0.76,0.5,0.5), 0.5), { max_in_depth: 5, max_out_depth: 5 });
	//add_entity_to_octree(tree, new SphereEntity(undefined, material, point(0.77,0.5,0.5), 0.5), { max_in_depth: 5, max_out_depth: 5 });
}

interface PlayerInterfaceConfig {
	move_forward: number;
	move_back:    number;
	move_left:    number;
	move_right:   number;
	move_up:      number;
	move_down:    number;
}

class PlayerInterface {
	config: PlayerInterfaceConfig;
	canvas_elem: HTMLElement;
	stat_elem?: HTMLDivElement;

	reset_pos: Point;
	camera: Camera;
	tick_handler: ()=>void;

	constructor(config: PlayerInterfaceConfig, canvas_elem: HTMLElement, stat_elem: HTMLDivElement, camera: Camera, reset_pos: Point, tick_handler: ()=>void) {
		this.config = config;
		this.canvas_elem = canvas_elem;
		this.stat_elem = stat_elem;
		this.camera = camera;
		this.reset_pos = reset_pos;
		this.tick_handler = tick_handler;
	}

	install_events() {
		document.addEventListener('keydown', (ev) => { this.event_keydown(ev) });
		this.canvas_elem.addEventListener('mousemove', (ev) => { this.event_mousemove(ev) });

		/* Request the cursor lock */
		this.canvas_elem.addEventListener("click", async () => {
			if (!document.pointerLockElement) {
			/* A hack to handle noncoherent requestPointerLock definitions across browsers.
			 * Awaiting for functions which don't return a Promise works as described at:
			 * https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API#handling_promise_and_non-promise_versions_of_requestpointerlock */
			const canvas_hack = this.canvas_elem as any as { requestPointerLock: (flags: any) => Promise<void>; };
				await canvas_hack.requestPointerLock({
					unadjustedMovement: true,
				});
			}
		});
	}

	update_stats() {
		if (this.stat_elem == undefined)
			return;

		const pos = this.camera.get_pos();
		const fr_vec = this.camera.get_front_vector();
		const fr_vec_xy = fr_vec.reduce(2);

		const angle_deg_x = fr_vec_xy.angle() * 180/Math.PI;
		const angle_deg_y = vector(fr_vec_xy.length(), fr_vec.v[2]).angle() * 180/Math.PI;

		this.stat_elem.innerHTML = `
			<h2>Camera</h2>
			pos: ${pos.v.map((x)=>x.toPrecision(4))}<br>
			direction: ${fr_vec.v.map((x)=>x.toPrecision(4))}<br>
			- angles: ${angle_deg_x.toPrecision(4)}°, ${angle_deg_y.toPrecision(4)}°`
	}

	/* Rotate the camera on mouse move and run the tick handler */
	private event_mousemove(ev: MouseEvent) {
		/*
		if (this.last_mouse_pos != undefined) {

			const delta_x = ev.movementX;
			const delta_y = ev.movementY;

			this.camera.rotate_h_step(delta_x);
			this.camera.rotate_v_step(delta_y);

			//console.log(`movementX: ${delta_x}, movementY: ${delta_y}`);
		}
		*/

		const delta_x = ev.movementX;
		const delta_y = ev.movementY;

		this.camera.rotate_h_step(delta_x);
		this.camera.rotate_v_step(delta_y);

		this.update_stats();
		this.tick_handler();

		//this.last_mouse_pos = { x: ev.screenX, y: ev.screenY }
	}

	/* Move the camera on key press and run the tick handler */
	private event_keydown(ev: KeyboardEvent) {
		console.log("key down");

		if (ev.code == 'Space') {
			this.camera.move(vector(0,0,this.config.move_up));
		} else {
			switch (ev.key) {
				case 'w': // move forward
					this.camera.move_xy_forward(this.config.move_forward);
					break;
				case 'a': // move left
					this.camera.move_xy_left(this.config.move_left);
					break;
				case 's': // move backward
					this.camera.move_xy_backward(this.config.move_back);
					break;
				case 'd': // move right
					this.camera.move_xy_right(this.config.move_right);
					break;
				case 'r': // camera reset
					this.camera.reset_angles();
					break;
				case 'Shift': // move down
					this.camera.move(vector(0,0,-this.config.move_down));
					break;
			}
		}

		this.update_stats();
		this.tick_handler();
	}
}

function main() {
	const canvas = document.getElementById(CANVAS_ID) as HTMLCanvasElement;
	if (canvas == undefined)
		throw Error("Cannot access the canvas!!");

	const stat_div = document.getElementById(STATS_DIV_ID) as HTMLDivElement;
	if (stat_div == undefined)
		console.log(`${STATS_DIV_ID} element not found. Statistics will not be shown`);

	const camera_conf: CameraConfig = {
		fov_v: Math.PI*0.75,
		fov_h: Math.PI*0.75,
		screen_w: canvas.width,
		screen_h: canvas.height,
		rot_v: /*Math.PI/120*/ Math.PI/30,
		rot_h: /*Math.PI/120*/ Math.PI/30,
		flags: { vertical_locked: true }
	};

	const canvas_ctx = canvas.getContext("2d");
	const reset_pos = point(0.5,0.5,0.5);

	const screen = new CanvasScreen(canvas_ctx, { buffer_pixels: true });
	const camera = new Camera(camera_conf, reset_pos, 0, Math.PI/180 * 30);

	const otree = new_entity_octree({pos: point(0,0,0), size: 1}, undefined);
	const raytracer = new Raytracer({refmax: REFMAX}, otree, camera, screen);

	//const gen_material = new SolidMaterial({r: 1.0, g: 0.33, b: 1.0, a: 1.0}, true, material.ResponseType.REFLECTION);

	generate_some_aligned_entities(otree, 5);

	const tick_fn = () => {
		raytracer.trace_frame();
	}

	const move_dist = 1e-1;
	const player_iface_conf: PlayerInterfaceConfig = {
		move_forward: move_dist,
		move_back: move_dist,
		move_left: move_dist,
		move_right: move_dist,
		move_up: move_dist,
		move_down: move_dist
	}

	const player_iface = new PlayerInterface(player_iface_conf, canvas, stat_div, camera, reset_pos, tick_fn);
	player_iface.install_events();
}

main();
