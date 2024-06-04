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
export const NODE_ORDER_MAP = BigInt("0x2040000040200000801000001080505470505110506450519050504050d0800aaae4008aaaa00108aaa0000ab8a4d18db8e4d18db8e4d18db8e4d18db8e2040020400200002001000010000000077777777222222225555555500000000aaffaaffaaaaaaaa00550055000000007cc0cb0c8028088e5110170100000002");

/** Cross order permutation matrix whose rows are selected by indexes from NODE_ORDER_MAP */
export const NODE_ORDERS = [
	[3, 2, 1, 0, 4, 5, 6, 7],
	[2, 0, 3, 1, 5, 4, 7, 6],
	[1, 0, 3, 2, 6, 7, 4, 5],
	[0, 2, 1, 3, 7, 6, 5, 4]
];
