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

/** @file Definitions of data structures used for describing world entities. */

import { Point, Vector } from '@app/math/linalg';
import { Ray } from '@app/raytracer';
import { Material } from '@app/physics/material'

/** Information about a ray collision. */
export interface CollisionInfo {
	/** Point of the collision. (intersection point) */
	point: Point;
 /** Material of the entity. */
	material: Material;
	/** The (normalized) vector orthogonal to the entity surface. */
	normal: Vector;
}

export abstract class Entity {
	/** If a ray would collide, return CollisionInfo, otherwise null. */
	abstract collision_info(ray: Ray): CollisionInfo|null;
	/** Get position of an entity (typically its center point). */
	abstract get_pos(): Point;
	abstract set_pos(p: Point): Point;
}
