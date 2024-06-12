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
import { EntityArray, EntityOtree, new_entity_octree } from '@app/context';
import { Entity, CollisionInfo } from '@app/entity';
import { SphereEntity } from '@app/entities/entity_sphere';
import { Raytracer } from '@app/raytracer';
import { Camera, CameraConfig } from '@app/view/camera';
import { CanvasScreen } from '@app/view/screen_canvas';

const CANVAS_NAME = 'rtcanvas';
const REFMAX = 32;

function generate_some_entities(ent_tree: EntityOtree) {
	const entity_classes = [SphereEntity];
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

	const otree = new_entity_octree({pos: point(0,0,0), size: 1});
	const raytracer = new Raytracer({refmax: REFMAX}, point(0.5,0.5,0.5), otree, camera, screen);

	for 

	//while (1) {
		raytracer.trace_frame();
	//}
}

main();
