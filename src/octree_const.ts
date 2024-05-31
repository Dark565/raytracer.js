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

/** An optimization lookup table mapping the 9-bit logic vector to the 2-bit order index. */
export const NODE_ORDER_MAP = BigInt("0x4000000000440040010011000000000140000000000400441100100000000001c0000c0000840048310013000020000200000000000000000000000000000000000000000044004411001100000000000000000000440044110011000000000000000c00004400481100130000000002");

/** Cross order permutations selected by indexes from NODE_ORDER_MAP */
export const NODE_ORDERS = [
	[2, 1, 0, 4, 3, 7, 5, 6],
	[3, 0, 1, 5, 2, 6, 4, 7],
	[1, 0, 2, 3, 5, 4, 6, 7],
	[0, 1, 3, 2, 4, 5, 7, 6]
];
