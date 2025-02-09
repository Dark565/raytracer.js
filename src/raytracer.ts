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

import { Vector, Point } from '@app/math/geometry';
import * as vector from '@app/math/vector';
import { clamp } from '@app/math/mathutils';
import { EntitySet, new_entity_octree_walker, entity_at_pos, EntityOtree, EntityOtreeWalker, EntityOtreePos } from '@app/octree_entity';
import { Entity, CollisionInfo } from '@app/entity';
import { node_at_pos } from '@app/octree_space';
import { Sky } from '@app/sky/sky';
import { Color, color, clone_color, mul_color, clamp_color } from '@app/physics/color';
import * as material from '@app/material';
import { Camera } from '@app/view/camera';
import ExposureBuffer from '@app/view/exposure_buffer';
import RNG from '@app/math/rng/rng';
import { isotropic_sphere_sample } from '@app/math/vector_utils';
import Substance from '@app/substance';
import * as debug from '@app/debug/object_hacks';

export interface RaytracerConfig {
	/** Global maximum count of collisions for all rays */
	refmax: number;
	/** Sky definition */
	sky: Sky;
	/** The default (vacuum) substance */
	default_substance: Substance;
	/** It is the parameter A to the equation: isl_coef = 1 / (A * intensity)^2
	 * where isl_coef (inverse square law coefficient) controls how distance affects light intensity. */
	distance_attenuation_factor: number;
};

//const COLOR_SKY   = color(1e-1,1e-1,1e-1);
//const COLOR_SKY = color(1,1,1);
const COLOR_BLACK = color(0,0,0);
const COLOR_WHITE = color(1,1,1);

const COLOR_SKY = COLOR_BLACK;

const VECTOR_ORTHO = vector.vector2(0,1);

/* Ray description class */
export class Ray {
	/** The raytracer */
	private tracer: Raytracer;
	/** Current count of reflections */
	private refcount: number;
	/** Maximum count of reflections */
	private refmax: number;
	/** The last point of reflection or the start point of the ray */
	private refpoint: Point;
	/** The node at the start point */
	private startnode?: EntityOtreePos;
	/** Current direction of the ray */
	private dir: vector.Vector;
	/** Current color of the ray; modulated by materials */
	private color: Color;
	/** The OctreeWalker assigned to the ray */
	private walker: EntityOtreeWalker;
	/** Path distance used for the inverse square law calculation */
	private path_distance: number;
	/** The current substance through which the ray moves */
	private cur_substance: Substance;

	private static debug_ray_count = 0;

	constructor(rt: Raytracer, refmax: number, start_point: Point,
							start_node: EntityOtreePos|undefined, dir: Vector,
							cur_substance: Substance, color: Color,
							walker: EntityOtreeWalker, flags: { keep_dir_unnormalized?: boolean } = {})
	{
		this.tracer = rt;
		this.refcount = 0;
		this.refmax = refmax;
		this.refpoint = vector.clone(start_point);
		this.startnode = start_node;
		this.color = clone_color(color);
		this.walker = walker;
		this.cur_substance = cur_substance;
		this.path_distance = 0;
		if (!flags.keep_dir_unnormalized)
			this.dir = vector.normalize(dir);
		else
			this.dir = vector.clone(dir);

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

	reflect_ray(coll_info: CollisionInfo) {
		this.dir = vector.reflection(this.dir, coll_info.normal);
	}

	scatter_ray(coll_info: CollisionInfo) {
		const rng = this.tracer.rng;
		const rand_vec = isotropic_sphere_sample(rng);
		//const rand_vec = vector.vector3(rng.next()*2-1, rng.next()*2-1, rng.next()*2-1)

		if (vector.dot(rand_vec,coll_info.normal) < 0)
			vector.scale_self(rand_vec, -1);

		const ref_vec = vector.add(vector.scale(this.dir, 1-coll_info.material.roughness_index),
		                           vector.scale(rand_vec, coll_info.material.roughness_index));

		this.dir = vector.normalize_self(ref_vec);
	}

	refract_ray(substance: Substance, coll_info: CollisionInfo) {
		const r_ratio  = this.cur_substance.refractive_index / substance.refractive_index;
		const r_ratio_sq = r_ratio*r_ratio;
		const cosine   = vector.dot(this.dir, coll_info.normal);
		const cosine_sq = cosine * cosine;
		const ref_sine_sq = (1 - cosine_sq) * r_ratio_sq;

		if (ref_sine_sq <= 1) {
			const ref_cosine = Math.sqrt(1 - ref_sine_sq);
			const adj_term = vector.scale(coll_info.normal, ref_cosine - cosine);
			vector.scale_self(this.dir, r_ratio);
			vector.sub_self(this.dir, adj_term);
		} else { // total internal reflection
			this.reflect_ray(coll_info);
		}
	}

	transmit_or_reflect_ray(coll_info: CollisionInfo) {

	}

	/** Move slightly forward towards the ray's direction.
	 * Used to get rid of the last collision point from future collision tests */
	move_slightly_forward() {
		const dir = this.dir;
		//const move_dir = vector.hadamard(vector.vector3(Number.EPSILON, Number.EPSILON, Number.EPSILON),
		//																 vector.vector3(Math.sign(dir.v[0]), Math.sign(dir.v[1]), Math.sign(dir.v[2])));
		//vector.add_self(this.refpoint, move_dir);
		vector.add_self(this.refpoint, vector.scale(dir, 1e-3));
	}

	/** Trace and modify the ray along its path */
	/* TODO: Split this function */
	trace() {
		//console.log(`${Ray.debug_ray_count}: called trace()`);
		const walker = this.walker;
		walker.set_pos_and_dir(this.refpoint, this. dir, this.startnode);
		//walker.start_point = (this.refpoint);
		let tree_node: ReturnType<typeof walker.next>;
		let last_entity: Entity = undefined;
		let light_hit = false;
		const rng = this.tracer.rng;
		const otree = this.tracer.tree;
		const def_substance = this.tracer.config.default_substance;
		while ((tree_node = walker.next()) != undefined) {
			//console.log(`${Ray.debug_ray_count}: got node id ${debug.unique_object_id(tree_node.node)}, walker's stack size: ${walker.info_stack.length}`);

			const search_array = tree_node.node.value;

			let collision_info: CollisionInfo;
			let entity: Entity;
			for (entity of search_array.set) {
				//if (entity == last_entity) {
				//	continue;
				//}

				collision_info = entity.collision_info(this);
				/* TODO: Probably find a better way for getting rid of the previous collision point */
				if (collision_info != undefined /*&& !vector.near_equal(collision_info.point, this.refpoint, 1e-3) */)
					break;
			}

			if (collision_info != undefined) {

				// Starting direction cannot be aligned with the reflection normal 
				if (vector.dot(this.dir, collision_info.normal) >= 0) {
					console.warn(`warning: object ${entity.constructor.name}: reflection normal is acute to the incoming direction!`);
					return;
				}

				//console.log(`${debug.unique_object_id(this)}: found intersect: ${collision_info.point.v}, entity: ${debug.unique_object_id(entity)}, raydir: ${this.dir.v}, raypos: ${this.refpoint.v}, normal: ${collision_info.normal.v}`);
				last_entity = entity;

				this.refcount++;
				collision_info.material.alter_ray(this, entity, collision_info.texture, collision_info.point);
				this.path_distance += vector.length(vector.sub(collision_info.point, this.refpoint));
				//const _orig_point = this.refpoint;
				this.refpoint = collision_info.point;

				const response_type = collision_info.material.response_type(collision_info.point);
				if (collision_info.material.is_light_source()) {
					light_hit = true;
					break;
				}

				switch (response_type) {
				case material.ResponseType.REFLECTION:
					if (!collision_info.material.is_mirror(collision_info.point)) {
						// TODO: implement scattering properly
						return;
					}

					//this.dir = this.dir.rotate_axis(collision_info.normal, VECTOR_ORTHO).negate();
					if (vector.dot(this.dir, collision_info.normal) >= 0)
						debugger;

					this.reflect_ray(collision_info);

					if (collision_info.material.roughness_index > 0.0) {
						this.scatter_ray(collision_info);
					}
					this.move_slightly_forward();
					break;
				case material.ResponseType.TRANSMISSION:
					this.move_slightly_forward();
					const rf_entity = entity_at_pos(otree, this.refpoint);
					const substance = rf_entity ? rf_entity.get_substance() : def_substance;

					/* If the substance of entity is undefined, it is assumed
					 * to be the same as that of outside */
					if (substance != undefined) {
						this.refract_ray(substance, collision_info);
						this.cur_substance = substance;
					}	
					break;
				default:
					return;
				}

				walker.set_pos_and_dir(this.refpoint, this.dir);

				if (this.refcount >= this.refmax) {
					//console.log(`${debug.unique_object_id(this)}: reflection limit`);

					/* If the reflection count was exceeded and no light source was hit, the ray
					 * has no right to hold any visible color thus its color is set to black. */
					this.color = COLOR_BLACK;
					return;
				}
			}
		}

		if (!light_hit) {
			const sky_color = this.tracer.config.sky.get_color(this.dir);
			this.color = mul_color(this.color, sky_color);
			return;
		}

		/* Attenuate the ray's intensity due to the inverse square law */
		const isl_coef = 1.0 / (Number.EPSILON + (this.path_distance * this.tracer.config.distance_attenuation_factor)**2);
		this.color = mul_color(this.color, { r: isl_coef, g: isl_coef, b: isl_coef, a: 1.0 });
		walker.set_pos_and_dir(this.refpoint, this.dir);
	}
}

/** Main raytracer class */
export class Raytracer {
	private otree: EntityOtree;
	private walker: EntityOtreeWalker;
	private camera: Camera;
	private ebuffer: ExposureBuffer;
	/** A random number generator engine. Used for phenomena like light scattering */
	private _rng: RNG; 

	config: RaytracerConfig;

	constructor(config: RaytracerConfig, otree: EntityOtree, camera: Camera, ebuffer: ExposureBuffer, rng: RNG) {
		this.camera = camera;
		this.ebuffer = ebuffer;
		this.otree = otree;
		this.walker = new_entity_octree_walker(otree);
		this._rng = rng;
		this.config = Object.assign({}, config);
	}

	set_camera(camera: Camera) {
		this.camera = camera;
	}

	set_ebuffer(ebuffer: ExposureBuffer) {
		this.ebuffer = ebuffer;
	}

	trace_frame() {
		const start_pos = this.camera.get_pos();
		const start_node = node_at_pos(this.otree, start_pos);

		const start_ent = entity_at_pos(this.otree, start_pos);
		const start_substance = start_ent ? start_ent.get_substance() : this.config.default_substance;

		const rng = this.rng;
		//const cur_frame = this.ebuffer.current_frame;

		for (let campx of this.camera.get_dir_for_each_pixel()) {
			let dir = campx.dir;
			//const rand_vec = isotropic_sphere_sample(rng);
			//dir = <vector.Vector3> vector.add(dir, vector.scale(rand_vec, 1e-2));

			const ray = new Ray(this, this.config.refmax, start_pos, start_node, dir,
													start_substance, COLOR_WHITE, this.walker, { keep_dir_unnormalized: true });

			ray.trace();
			const color = ray.get_color();
			this.ebuffer.set_color(campx.x, campx.y, [color.r,color.g,color.b]);
		}
	}

	get tree() {
		return this.otree;
	}

	get rng() {
		return this._rng;
	}
}
