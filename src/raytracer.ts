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

import { Vector, Point, vector } from '@app/math/linalg';
import { clamp } from '@app/math/mathutils';
import { EntitySet, new_entity_octree_walker, EntityOtree, EntityOtreeWalker, EntityOtreePos } from '@app/octree_entity';
import { Entity, CollisionInfo } from '@app/entity';
import { Color, color, clone_color, mul_color } from '@app/physics/color';
import * as material from '@app/material';
import { Camera } from '@app/view/camera';
import { Screen } from '@app/view/screen';
import * as debug from '@app/debug/object_hacks';

export interface RaytracerConfig {
	/** Global maximum count of collisions for all rays */
	refmax: number;
};

const COLOR_SKY   = color(1e-1,1e-1,1e-1);
const COLOR_BLACK = color(0,0,0);
const COLOR_WHITE = color(1,1,1);

const VECTOR_ORTHO = vector(0,1);

/* Ray description class */
export class Ray {
	/** Current count of reflections */
	private refcount: number;
	/** Maximum count of reflections */
	private refmax: number;
	/** The last point of reflection or the start point of the ray */
	private refpoint: Point;
	/** Current direction of the ray */
	private dir: Vector;
	/** Current color of the ray; modulated by materials */
	private color: Color;
	/** The OctreeWalker assigned to the ray */
	private walker: EntityOtreeWalker;

	private static debug_ray_count = 0;

	constructor(refmax: number, start_point: Point, dir: Vector,
							color: Color, walker: EntityOtreeWalker,
							flags: { keep_dir_unnormalized?: boolean } = {}) 
	{
		this.refcount = 0;
		this.refmax = refmax;
		this.refpoint = start_point.clone();
		this.color = clone_color(color);
		this.walker = walker;
		if (!flags.keep_dir_unnormalized)
			this.dir = dir.normalize();
		else
			this.dir = dir.clone();

		++Ray.debug_ray_count;
	}

	set_color(color: Color) {
		this.color = color;
	}

	get_color() {
		return this.color;
	}

	get_pos() {
		return this.refpoint;
	}

	get_dir() {
		return this.dir;
	}

	/** Trace and modify the ray along its path */
	/* TODO: Split this function */
	trace() {
		//console.log(`${Ray.debug_ray_count}: called trace()`);
		const walker = this.walker;
		walker.direction = this.dir;
		walker.start_point = (this.refpoint);
		let tree_node: ReturnType<typeof walker.next>;
		let last_entity: Entity = undefined;
		while ((tree_node = walker.next()) != undefined) {
			//console.log(`${Ray.debug_ray_count}: got node id ${tree_node.node.debug_id}`)

			const search_array = tree_node.node.value;

			let collision_info: CollisionInfo;
			let entity: Entity;
			for (entity of search_array.set) {
				if (entity == last_entity) {
					continue;
				}

				collision_info = entity.collision_info(this);
				/* TODO: Probably find a better way for getting rid of the previous collision point */
				if (collision_info != undefined /*&& !collision_info.point.near_equal(this.refpoint, 1e-3)*/)
					break;
			}

			if (collision_info != undefined) {
				console.log(`${debug.unique_object_id(this)}: found intersect: ${collision_info.point.v}, entity: ${debug.unique_object_id(entity)}, raydir: ${this.dir.v}, raypos: ${this.refpoint.v}, normal: ${collision_info.normal.v}`);
				last_entity = entity;

				this.refcount++;
				// TODO: Convert the intersection point to the surface point for materials
				collision_info.material.alter_ray(this, collision_info.point);
				this.refpoint = collision_info.point;
				walker.start_point = this.refpoint;

				const response_type = collision_info.material.response_type(collision_info.point);
				switch (response_type) {
				case material.ResponseType.REFLECTION:
					if (!collision_info.material.is_mirror(collision_info.point)) {
						// TODO: implement scattering properly
						return;
					}

					//this.dir = this.dir.rotate_axis(collision_info.normal, VECTOR_ORTHO).negate();
					this.dir = this.dir.reflection(collision_info.normal);
					walker.direction = this.dir;
					break;
				case material.ResponseType.TRANSMISSION:
					break
				default: // the ray is scattered by default
					return;
				}

				if (this.refcount >= this.refmax) {
					console.log(`${debug.unique_object_id(this)}: reflection limit`);

					/* If the reflection count was exceeded and no light source was hit, the ray
					 * has no right to hold any visible color thus its color is set to black. */
					this.color = COLOR_BLACK;
					return;
				}
			}
		}

		/* If there is nothing more to intersect, modulate it with the sky color
		 * TODO: Define the Skybox class which will be used in this case
		 *       to get a specific color.
		 */
		this.color = mul_color(this.color, COLOR_SKY);
	}
}

/** Main raytracer class */
export class Raytracer {
	private walker: EntityOtreeWalker;
	private config: RaytracerConfig;
	private pos: Point;
	private camera?: Camera;
	private screen?: Screen;

	constructor(config: RaytracerConfig, pos: Point, otree: EntityOtree, camera?: Camera, screen?: Screen) {
		this.camera = camera;
		this.screen = screen;
		this.pos = pos.clone();
		this.walker = new_entity_octree_walker(otree);
		this.config = Object.assign({}, config);
	}

	set_camera(camera?: Camera) {
		this.camera = camera;
	}

	set_screen(screen?: Screen) {
		this.screen = screen;
	}

	trace_frame() {
		if (this.camera == undefined)
			throw Error("this.camera must be defined");

		if (this.screen == undefined)
			throw Error("this.screen must be defined");

		for (let campx of this.camera.get_dir_for_each_pixel()) {
			const ray = new Ray(this.config.refmax, this.pos, campx.dir, COLOR_WHITE,
													this.walker, { keep_dir_unnormalized: true });

			ray.trace();
			const color = ray.get_color();
			this.screen.set_pixel(campx.x, campx.y, [color.r,color.g,color.b]);
		}
		this.screen.flush();
	}
}
