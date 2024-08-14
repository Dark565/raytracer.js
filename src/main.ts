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

const CANVAS_NAME = 'rtcanvas';
const REFMAX = 32;

function generate_some_aligned_entities(tree: EntityOtree, material: material.Material, n_entities: number) {
	//const entity_classes = [SphereEntity, BoxEntity];
	for (let i = 0; i < n_entities; i++) {
		const level = 3 + Math.ceil(Math.random() * 7);
		const n_quant = 1 << (level);
		const size = 1 / n_quant;
		const [x, y, z] = Array(3).map(_ => { return ((Math.random() * n_quant) << 0) * size + size/2 });
		const entity = new BoxEntity(undefined, material, point(x,y,z), size);
		add_entity_to_octree(tree, entity, { max_in_depth: 10, max_out_depth: 0 });
	}
}

function main() {
	const canvas = document.getElementById(CANVAS_NAME) as HTMLCanvasElement;
	if (canvas == undefined)
		throw Error("Cannot access the canvas!!");

	const camera_conf: CameraConfig = {
		fov_v: Math.PI,
		fov_h: Math.PI,
		screen_w: canvas.width,
		screen_h: canvas.height,
		rot_v: Math.PI/45,
		rot_h: Math.PI/45,
		flags: { vertical_locked: true }
	};

	const canvas_ctx = canvas.getContext("2d");

	const screen = new CanvasScreen(canvas_ctx, { buffer_pixels: true });
	const camera = new Camera(camera_conf);

	const otree = new_entity_octree({pos: point(0,0,0), size: 1}, undefined);
	const raytracer = new Raytracer({refmax: REFMAX}, point(0.5,0.5,0.5), otree, camera, screen);

	const gen_material = new SolidMaterial({r: 1.0, g: 0.33, b: 1.0, a: 1.0}, true, material.ResponseType.REFLECTION);

	generate_some_aligned_entities(otree, gen_material, 3);

	raytracer.trace_frame();
}

main();
