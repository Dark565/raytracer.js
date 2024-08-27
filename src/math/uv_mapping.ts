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

import { Vector } from '@app/math/linalg';

export function uv_map_sphere(dir: Vector): [number,number] {
		/* EPSILON is subtracted to ensure the resulting u,v are in range <-eps, 1) */
		const u = Math.atan2(dir.v[1], dir.v[0])/Math.PI/2.0 + 0.5 - Number.EPSILON;
		const v = Math.atan2(dir.v[2], dir.reduce(2).length())/Math.PI + 0.5 - Number.EPSILON;

		return [u,v];
}

// TODO: uv_map_box
