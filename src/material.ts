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

import { Point } from '@app/math/geometry';
import { Ray } from '@app/raytracer';
import { Entity } from '@app/entity';
import { Texture } from '@app/texture/texture';

export enum ResponseType {
	REFLECTION,
	REFRACTION,
	BOTH // needs additional ray
};

/** The abstract class for all materials */
export abstract class Material {
	/** Returns the type of material's response on a ray at a particular point on its surface */ 
	abstract response_type(point: Point): ResponseType;

	/** Check if a material would reflect unscattered light at a particular point. */
	abstract is_mirror(point: Point): boolean;

	/** Modify ray's attributes (i.e the color) depending on material's parameters. */
	abstract alter_ray(ray: Ray, entity: Entity, texture: Texture, point: Point): boolean;

	/** Light source is the final target of a ray */
	abstract is_light_source(): boolean;

	/** Set the transparence index of the material.
	 * If transparence index is greater than 0, the raytracer engine
	 * shoots one additional ray from the point of incidence to handle
	 * ray transmission through material.
	 * Range: <0, 1>. */
	//abstract set transparence_index(index: number);
	//abstract get transparence_index();

	/** Set the refractive index of the material.
	 * Range: (0, +inf) */
	//abstract set refractive_index(index: number);
	//abstract get refractive_index(): number;

	/** Set the roughness index of the material.
	 *  Roughness is a measure of the extent to which a material deviates from being smooth.
	 *  The rougher the meterial, the more it scatters the light.
	 *  Scattering has the visible effect of blurring reflection.
	 *  Roughness index of 0 is equivalent to the material being a perfect mirror.
	 *  Range: <0, 1>
	 */
	//abstract set roughness_index(index: number);
	abstract get roughness_index(): number;
}

/** A material type whose light response is determined only by its static parameters */
export abstract class StaticMaterial extends Material {
	/** The ratio of the reflected/transmitted light intensity to the received light intensity.
	 * This parameter is a coefficient when calculating a new color. */
	//reflectance: number;

	/** The response type for a material. */
	response: ResponseType;

	/** Is a light source */
	light_source: boolean;

	/** The result of is_mirror(). */
	mirror: boolean;

	roughness_index: number;

	protected constructor(response: ResponseType, light_source: boolean, mirror: boolean, roughness: number) {
		super();
		this.response = response;
		this.light_source = light_source;
		this.mirror = mirror;
		this.roughness_index = roughness;
	}

	response_type(_: Point) {
		return this.response;
	}

	is_mirror(_: Point) {
		return this.mirror;
	}

	is_light_source() {
		return this.light_source;
	}
}
