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

/** @file Definitions of data structures used for describing scene entities. */

import { EntityOtree } from '@app/context';
import { EntitySet } from '@app/context';
import { Point, Vector } from '@app/math/linalg';
import { Ray } from '@app/raytracer';
import { Material } from '@app/physics/material'

/** Information about ray collision. */
export interface CollisionInfo {
	/** Point of the collision. (intersection point) */
	point: Point;
 /** Material of the entity. */
	material: Material;
	/** The (normalized) vector orthogonal to the entity surface. */
	normal: Vector;
}

export abstract class Entity {
	/* for introspection */
	/** The octree including this entity */
	protected octree: EntityOtree;
	/** The set of all EntitySet-s that include this entity */
	protected entity_sets: Set<EntitySet>;

	constructor(octree: EntityOtree, pos?: Point) {
		this.octree = octree;
		this.entity_sets = new Set;
		this.set_pos(pos);
	}

	/** Get the position of an entity (typically its center point). */
	abstract get_pos(): Point;
	/** Get the position of an entity (typically its center point). */
	abstract set_pos(p: Point): Point;

	/** If a ray would collide, return CollisionInfo, otherwise null. */
	abstract collision_info(ray: Ray): CollisionInfo|null;

	abstract get_material(): Material;
	/** Set material and return the old one */
	abstract set_material(material: Material): Material;

	/** Update this.entity_sets */
	protected abstract refresh_introspection_data(): void;

	get_entity_sets() {
		return this.entity_sets;
	}

	get_octree() {
		return this.octree;
	}

}
