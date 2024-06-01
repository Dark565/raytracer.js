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
export const NODE_ORDER_MAP = BigInt("0x2000000000200000001000001000400470000100006010010010000010008008a000008008a00100002000003004c00cb000018008e01101002000003002000020000200002001000010000000074004700002000020110100100000000a8008a0000a8008a00100001000000007c00cb000028008e0110100100000000");

/** Cross order permutations selected by indexes from NODE_ORDER_MAP */
export const NODE_ORDERS = [
	[3, 2, 1, 0, 4, 5, 6, 7],
	[2, 0, 3, 1, 5, 4, 7, 6],
	[1, 0, 3, 2, 6, 7, 4, 5],
	[0, 1, 2, 3, 7, 6, 5, 4]
];
