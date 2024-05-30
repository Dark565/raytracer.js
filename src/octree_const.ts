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
export const NODE_ORDER_MAP = BigInt("0x2040000040200000801000001080104030404110402440108010104010c0000228c4000882200108822000023880108138c4c10c8024c10c8020108138c204002040020000200100001000000003344334400220022441144110000000022cc22cc88228822001100110000000030c0030c802008024010040100000000");

/** Cross order permutations selected by indexes from NODE_ORDER_MAP */
export const NODE_ORDERS = [
	[3, 2, 1, 0, 4, 6, 5, 7],
	[2, 0, 3, 1, 5, 4, 7, 6],
	[1, 0, 3, 2, 6, 4, 7, 5],
	[0, 2, 1, 3, 7, 6, 5, 4]
];
