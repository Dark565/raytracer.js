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

import { EntityOtree } from '@app/octree_entity';
import { Point, Vector } from '@app/math/geometry';
import { Ray } from '@app/raytracer';
import { Material } from '@app/material'
import { Texture } from '@app/texture/texture';
import Substance from '@app/substance';

/** Information about ray collision. */
export interface CollisionInfo {
	/** Point of the collision. (intersection point) */
	point: Point;
  /** Material of the entity. */
	material: Material;
	/** The texture of the entity */
	texture: Texture;
	/** The (normalized) vector orthogonal to the entity surface. */
	normal: Vector;
}

export abstract class Entity {
	protected substance?: Substance;

	/* for introspection */
	/** The octree including this entity */
	protected _octree?: EntityOtree;

	constructor(octree?: EntityOtree, substance?: Substance) {
		this._octree = octree;
		this.substance = substance;
	}

	set_octree(tree: EntityOtree, flags: { keep_in_current?: boolean } = {}) {
		if (!flags.keep_in_current && this._octree != undefined)
			this._octree.value.set.delete(this);

		this._octree = tree;
		tree.value.set.add(this);
	}

	get octree() {
		return this._octree;
	}

	get_substance() {
		return this.substance;
	}

	/** Set the inner substance of the entity and return the old one */
	set_substance(s: Substance): Substance {
		const substance = this.substance;
		this.substance = s;
		return substance;
	}

	/** Get the position of an entity (typically its center point). */
	abstract get_pos(): Point;
	/** Set the position of an entity (typically its center point).
	 * This method is for the library use and shouldn't be called directly.
	 * Use move_entity() from octree_entity.ts instead. */
	abstract _set_pos(p: Point): Point;

	/** If a ray would collide, return CollisionInfo, otherwise null. */
	abstract collision_info(ray: Ray): CollisionInfo|null;

	abstract get_material(): Material;
	/** Set material and return the old one */
	abstract set_material(material: Material): Material;

	abstract get_texture(): Texture;
	/** Set texture and return the old one */
	abstract set_texture(texture: Texture): Texture;

	/** Check whether a given point is fully within the entity */
	abstract is_within(point: Point): boolean;

	/** Get the axis-aligned bounding box for the entity.
	 * @returns A pair: the attachment point of the first vertex and the length of edges. */
	abstract get_aabb(): [Point, number];

	/** Map 3D surface coordinates to 2D texture coordinates */
	abstract map_uv(p: Point): [number, number];

}
