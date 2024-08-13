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

/** Clamp a number to given bounds */
export function clamp(number: number, min: number, max: number): number {
	return Math.max(Math.min(number, max), min);
}

export function min<T>(list: Iterable<T>, cmp_fn: (a:T, b:T) => number): T {
	let iter = list[Symbol.iterator]();
	let next = iter.next();
	let min: T = next.value;
	while (!(next = iter.next()).done) {
		if (cmp_fn(next.value, min) < 0)
			min = next.value;
	}
	return min;
}

export function max<T>(list: Iterable<T>, cmp_fn: (a:T, b:T) => number): T {
	let iter = list[Symbol.iterator]();
	let next = iter.next();
	let min: T = next.value;
	while (!(next = iter.next()).done) {
		if (cmp_fn(next.value, min) > 0)
			min = next.value;
	}
	return min;
}
