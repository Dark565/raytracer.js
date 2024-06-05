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

import { Point } from '@app/linalg';
import { Ray } from '@app/raytracer';

export enum ResponseType {
	REFLECTION,
	TRANSMISSION
};

/** The abstract class for all materials */
export abstract class Material {
	/** Returns the type of material's response on a ray at a particular point on its surface */ 
	abstract response_type(point: Point): ResponseType;

	/** Check if a material would reflect unscattered light at a particular point. */
	abstract is_mirror(point: Point): boolean;

	/** Modify ray's attributes (i.e the color) depending on material's parameters. */
	abstract alter_ray(ray: Ray, point: Point): boolean;
}

/** A material type whose light response is determined onle by its static parameters */
export abstract class StaticMaterial extends Material {
	/** The ratio of the reflected/transmitted light intensity to the received light intensity.
	 * This parameter is a coefficient when calculating a new color. */
	reflectivity: number;

	/** The response type for a material. */
	response: ResponseType;

	/** The result of is_mirror(). */
	mirror: boolean;

	protected constructor(reflectivity: number, mirror: boolean, response: ResponseType) {
		super();
		this.reflectivity = reflectivity;
		this.mirror = mirror;
		this.response = response;
	}

	response_type(_: Point) {
		return this.response;
	}

	is_mirror(_: Point) {
		return this.mirror;
	}
}
