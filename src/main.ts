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

import { Vector, Point, point } from '@app/math/geometry';
import * as vector from '@app/math/vector';
import { Color } from '@app/physics/color';
import { clamp } from '@app/math/mathutils';
import { Octree } from '@app/octree';
import { SpaceOctree, OctreeWalker, new_subtree } from '@app/octree_space';
import { EntitySet, EntityOtree, new_entity_octree, add_entity_to_octree } from '@app/octree_entity';
import { Entity, CollisionInfo } from '@app/entity';
import { SphereEntity } from '@app/entities/entity_sphere';
import { BoxEntity } from '@app/entities/entity_box';
import * as material from '@app/material';
import { SIMPLE_SMOOTH_MATERIAL, SIMPLE_ROUGH_MATERIAL, SIMPLE_LIGHT_MATERIAL, SIMPLE_TRANSPARENT_MATERIAL } from '@app/materials/material_solid';
import { Texture, TextureError } from '@app/texture/texture';
import { ImageTexture } from '@app/texture/texture_image';
import { SolidTexture } from '@app/texture/texture_solid';
import { SkySphere } from '@app/sky/sky_sphere';
import { Raytracer, RaytracerConfig } from '@app/raytracer';
import { Camera, CameraConfig } from '@app/view/camera';
import Screen from '@app/view/screen';
import CanvasScreen from '@app/view/screen_canvas';
import View from '@app/view/view';
import { ToneMapper_StdDevAroundMean, ToneMapper_Identity } from'@app/view/tone_mapping';
import ExposureBuffer from '@app/view/exposure_buffer';
import { SUBSTANCE_AIR, SUBSTANCE_WATER, SUBSTANCE_GLASS } from '@app/substance';
import RNG from '@app/math/rng/rng';
import SystemRNG from '@app/math/rng/system-rng';
import FpLcg from '@app/math/rng/fp-lcg';

const CANVAS_ID = 'rtcanvas';
const STATS_DIV_ID = 'rtstats';
const REFMAX = 4;
const RANDOM_SEED = 42;

const TEXTURE_URLS: [string,boolean,boolean][] = 
	[['assets/texture1.jpg', false, false],
	 ['assets/texture2.jpg', false, false],
   ['assets/texture3.jpg', true, false]];

function load_textures(): Texture[] {
	return TEXTURE_URLS.map((url) => new ImageTexture(url[0], {r:0,g:0,b:0,a:1.0}, url[1], url[2]));
}

// Return a random color vector from the RGB color space with a specific magnitude (intensity)
function get_random_color_with_intensity(rng: RNG, intensity: number): Color {
	const [r,g,b] = Array(3).fill(0).map(()=>rng.next());
	const col_vec = vector.scale_self(vector.normalize_self(vector.vector(r,g,b)), intensity);
	return { r: col_vec.v[0], g: col_vec.v[1], b: col_vec.v[2], a: 1.0 };
}

/* Return a random image texture or a new solid color one */
function get_random_texture(rng: RNG, img_txt_prob: number, img_textures: Texture[], intensity: number) {
	const rnd = rng.next();
	if (rnd <= img_txt_prob) { // get image texture
		const txt_i = (rng.next() * img_textures.length) << 0;
		return img_textures[txt_i];
	} else {
		const rand_color = get_random_color_with_intensity(rng, intensity);
		return new SolidTexture(rand_color);
	}
}

function get_random_element_with_weights<T>(rng: RNG, elem: T[], weights: number[]): T {
	const nweights = weights.length;
	const weights_norm = vector.vector(...weights);
	vector.scale_self(weights_norm, 1/vector.dot(weights_norm, vector.new_filled(nweights, 1)));

	const weights_sorted_i = Array(nweights).fill(0).map((_,i) => i).sort(i => weights_norm.v[i]);
	const rnd = rng.next();

	let obj_i: number;
	let weight = 0;
	for (obj_i of weights_sorted_i.slice(0,-1)) {
		weight += weights_norm.v[obj_i];
		if (rnd <= weight)
			return elem[obj_i];
	}
	return elem[weights_sorted_i[weights_sorted_i.length-1]];
}

function generate_some_aligned_entities(tree: EntityOtree, rng: RNG, n_entities: number, img_txt_prob: number, material_prob_weights: number[], img_textures: Texture[]) {
	const entity_classes = [{
		class: SphereEntity,
		is_textured: true
	}, {
		class: BoxEntity,
		is_textured: false
	}];

	const substances = [SUBSTANCE_AIR, SUBSTANCE_WATER, SUBSTANCE_GLASS];
	const materials = [SIMPLE_LIGHT_MATERIAL, SIMPLE_ROUGH_MATERIAL, SIMPLE_SMOOTH_MATERIAL, SIMPLE_TRANSPARENT_MATERIAL];

	let existing_qpos: [number,number,number][] = [];

	for (let i = 0; i < n_entities; i++) {
		const level = 1 + Math.floor(rng.next() * 7);
		const n_quant = 1 << (level);
		const size = 1 / n_quant;
		const [q_x, q_y, q_z] = [0,0,0].map(_ => (rng.next() * n_quant) << 0);
		const [x, y, z] = [q_x,q_y,q_z].map(q => q * size + size/2);
		const e_point = point(x,y,z);
		let already_existing = false;
		for (let q of existing_qpos) {
			if (q_x == q[0] && q_y == q[1] && q_z == q[2]) {
				already_existing = true;
				break;
			}
		}

		if (already_existing)
			continue;

		existing_qpos.push([q_x,q_y,q_z]);

		const ent_class = entity_classes[(rng.next() * entity_classes.length) << 0];
		const substance = substances[(rng.next() * substances.length) << 0];
		const material = get_random_element_with_weights(rng, materials, material_prob_weights);

		const texture = get_random_texture(rng, material == SIMPLE_LIGHT_MATERIAL || !ent_class.is_textured ? 0 : img_txt_prob, img_textures,
																			 material == SIMPLE_LIGHT_MATERIAL ? 5.0 : 1.0);

		console.log(`${x}, ${y}, ${z}   ${size}`);
		const entity = new ent_class.class(undefined, material, texture, substance, e_point, size);
		//entity.set_octree(tree);
		//tree.value.set.add(entity);
		add_entity_to_octree(tree, entity, { max_in_depth: 16, max_out_depth: 0 });
	}
	//add_entity_to_octree(tree, new SphereEntity(undefined, material, point(0.5,0.5,0.5), 1), { max_in_depth: 5, max_out_depth: 5 });
	//add_entity_to_octree(tree, new SphereEntity(undefined, material, point(0.76,0.5,0.5), 0.5), { max_in_depth: 5, max_out_depth: 5 });
	//add_entity_to_octree(tree, new SphereEntity(undefined, material, point(0.77,0.5,0.5), 0.5), { max_in_depth: 5, max_out_depth: 5 });
}

function obtain_seed_from_url_param(): number {
	const search = new URLSearchParams(window.location.search);
	return Number(search.get('seed'));
}

interface PlayerInterfaceConfig {
	fps_mean_window_size: number;

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
	view: View;
	tick_handler: ()=>void;
	fps_samples: number[] = [];
	fps_mean: number = 0; // sma(window_size)

	constructor(config: PlayerInterfaceConfig, canvas_elem: HTMLElement, stat_elem: HTMLDivElement,
							camera: Camera, view: View, reset_pos: Point, tick_handler: ()=>void) {
		this.config = config;
		this.canvas_elem = canvas_elem;
		this.stat_elem = stat_elem;
		this.camera = camera;
		this.view = view;
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

		setInterval(() => { if (this.view.ebuffer.next_frame()) this.tick() }, 16.6666);
	}

	update_stats() {
		if (this.stat_elem == undefined)
			return;

		const pos = this.camera.get_pos();
		const fr_vec = this.camera.get_front_vector();
		const fr_vec_xy = <vector.Vector2> vector.reduce(fr_vec, 2);

		const angle_deg_x = vector.angle2D(fr_vec_xy) * 180/Math.PI;
		const angle_deg_y = vector.angle2D(vector.vector2(vector.length(fr_vec_xy), fr_vec.v[2])) * 180/Math.PI;

		const br_mean = this.view.ebuffer.get_mean();

		this.stat_elem.innerHTML = `
			<h2>Camera</h2>
			pos: ${pos.v.map((x)=>x.toPrecision(4))}<br>
			direction: ${fr_vec.v.map((x)=>x.toPrecision(4))}<br>
			- angles: ${angle_deg_x.toPrecision(4)}°, ${angle_deg_y.toPrecision(4)}°<br><br>

			fps: ${(this.fps_samples[this.fps_samples.length-1] ?? 0).toPrecision(4)}<br>
			- μ(${this.config.fps_mean_window_size}): ${this.fps_mean}<br><br>
			
			brightness:<br>
			- μ: ${this.view.ebuffer.get_mean()}<br>
			- stddev: ${Math.sqrt(this.view.ebuffer.get_variance(br_mean))}<br>`
	}


	private update_fps(fps: number) {
		if (this.fps_samples.length >= this.config.fps_mean_window_size) {
			const threw = this.fps_samples.shift();
			this.fps_mean -= threw/this.config.fps_mean_window_size;
		}

		this.fps_mean += fps/this.config.fps_mean_window_size;
		this.fps_samples.push(fps);
	}

	private tick() {
		console.log("-- tick --");

		const time_start = performance.now();
		this.tick_handler();
		const time_end = performance.now();

		// performance.now() returns time in milliseconds
		this.update_fps(1000 / (time_end - time_start));
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

		this.view.ebuffer.reset_exposure();

		this.tick();
		this.update_stats();

		//this.last_mouse_pos = { x: ev.screenX, y: ev.screenY }
	}

	/* Move the camera on key press and run the tick handler */
	private event_keydown(ev: KeyboardEvent) {
		console.log("key down");

		if (ev.code == 'Space') {
			this.camera.move(vector.vector(0,0,this.config.move_up));
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
					this.camera.move(vector.vector(0,0,-this.config.move_down));
					break;
			}
		}

		this.view.ebuffer.reset_exposure();

		this.tick();
		this.update_stats();
	}
}

async function main() {
	const canvas = document.getElementById(CANVAS_ID) as HTMLCanvasElement;
	if (canvas == undefined)
		throw Error("Cannot access the canvas!!");

	const stat_div = document.getElementById(STATS_DIV_ID) as HTMLDivElement;
	if (stat_div == undefined)
		console.log(`${STATS_DIV_ID} element not found. Statistics will not be shown`);

	const prng = new FpLcg(obtain_seed_from_url_param() ?? RANDOM_SEED);
	const system_rng = new SystemRNG();

	const camera_conf: CameraConfig = {
		fov_v: Math.PI*0.5,
		fov_h: Math.PI*0.5,
		screen_w: canvas.width,
		screen_h: canvas.height,
		rot_v: /*Math.PI/120*/ Math.PI/30,
		rot_h: /*Math.PI/120*/ Math.PI/30,
		flags: { vertical_locked: true }
	};

	const canvas_ctx = canvas.getContext("2d");
	const reset_pos = point(0.5,0.5,0.5);

	const camera = new Camera(camera_conf, reset_pos, 0, Math.PI/180 * 30);
	const screen = new CanvasScreen(canvas_ctx, { buffer_pixels: true });
	const ebuffer = new ExposureBuffer(canvas.width, canvas.height, -1);
	const tmapper = new ToneMapper_StdDevAroundMean(screen.dynamic_range, 1.0/(1<<screen.dynamic_range), 8.0);

	const tone_mappers = [tmapper, ToneMapper_Identity.instance];
	let cur_tone_mapper = 0;

	const view = new View(ebuffer, screen, tmapper);

	const otree = new_entity_octree({pos: point(0,0,0), size: 1}, undefined);

	//const gen_material = new SolidMaterial({r: 1.0, g: 0.33, b: 1.0, a: 1.0}, true, material.ResponseType.REFLECTION);

	const textures = load_textures();
	let sky_txt = new ImageTexture('assets/sky2.jpg', {r:0.2,g:0.2,b:0.7,a:1.0});
	//let sky_txt = new SolidTexture({r:0,g:0,b:0,a:1});
	// ensure all textures are loaded before running
	try {
		await Promise.all([...textures, sky_txt].map((txt) => txt.get_loading_promise()));
	} catch (err) {
		if (err instanceof TextureError)
			console.log(err.message);
		else
			throw err;
	}

	console.log("textures loaded");

	const white_txt = new SolidTexture({r:1,g:1,b:1,a:1});
	const scene_box = new BoxEntity(otree, SIMPLE_ROUGH_MATERIAL, white_txt, SUBSTANCE_AIR, point(0.5,0.5,0.5), 1);
	
	generate_some_aligned_entities(otree, prng, 16, 0.0, [1, 1, 1, 1], textures);
	add_entity_to_octree(otree, scene_box, {max_in_depth:1, max_out_depth:0});


	const sky = new SkySphere(sky_txt);

	const raytracer_conf: RaytracerConfig = {
		refmax: REFMAX,
		default_substance: SUBSTANCE_AIR,
		distance_attenuation_factor: 1,
		sky: sky
	};

	const raytracer = new Raytracer(raytracer_conf, otree, camera, ebuffer, prng);

	const tick_fn = () => {
		raytracer.trace_frame();
		view.draw_ebuffer();
		view.screen.flush();
	}

	const move_dist = 1e-1;
	const player_iface_conf: PlayerInterfaceConfig = {
		fps_mean_window_size: 32,
		move_forward: move_dist,
		move_back: move_dist,
		move_left: move_dist,
		move_right: move_dist,
		move_up: move_dist,
		move_down: move_dist
	}

	const player_iface = new PlayerInterface(player_iface_conf, canvas, stat_div, camera, view, reset_pos, tick_fn);
	player_iface.install_events();
}

main();
