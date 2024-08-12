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

/** @file The rendering context of the raytracer */

import { Octree } from '@app/octree';
import { SpaceOctree, OctreeWalker, OctreeDim, SpaceOctreePos } from '@app/octree_space';
import { Entity } from '@app/entity';

export type EntityOtree       = SpaceOctree<EntitySet>;
export type EntityOtreeWalker = OctreeWalker<EntitySet>;
export type EntityOtreePos    = SpaceOctreePos<EntitySet>;

/** EntitySet is a set of entities */
export class EntitySet {
	/** The EntitySet's octree position */
	private octree_pos?: EntityOtreePos;
	private set: Set<Entity>;

	constructor(octree_pos?: EntityOtreePos) {
		this.octree_pos = octree_pos;
	}

	get_set() {
		return this.set;
	}

	get_octree_pos(): EntityOtreePos {
		return this.octree_pos;
	}
}

export function new_entity_octree(dim: OctreeDim): EntityOtree {
	return new Octree<EntitySet, OctreeDim>(dim);
}

export function new_entity_octree_walker(tree: EntityOtree): EntityOtreeWalker {
	return new OctreeWalker(tree);
}
