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

/** An optimization lookup table mapping the 8-bit logic vector to the 8-bit cross vector. */
export const NODE_CROSS_MAP = BigInt("0x804088442010221188440804221102018040884420102211884408042211020180408844201022118844080422110201a0508a45a0502a15a8540a05a2510a05804088442010221188440804221102018040884420102211884408042211020180408844201022118844080422110201a0508a45a0502a15a8540a05a2510a05804088442010221188440804221102018040884420102211884408042211020180408844201022118844080422110201a0508a45a0502a15a8540a05a2510a05c0c0c8c4303032318c4c0c0c23130303c0c0c8c4303032318c4c0c0c23130303c0c0c8c4303032318c4c0c0c23130303e0d0cac5b0703a35ac5c0e0da3530b07");

/** An optimization lookup table mapping the 8-bit logic vector to the 2-bit order index. */
export const NODE_ORDER_MAP = BigInt("0x414411410000000000000000000000004144114100000000000000000000000041441141510410455104104551041045e1e41e4e");

/** Cross order sequences selected by indexes from NODE_ORDER_MAP */
export const NODE_ORDERS = [
	[1, 2, 0, 4, 3, 7, 6, 5],
	[0, 3, 1, 5, 2, 6, 7, 4],
	[1, 0, 2, 3, 5, 4, 6, 7],
	[0, 1, 3, 2, 4, 5, 7, 6]
];
