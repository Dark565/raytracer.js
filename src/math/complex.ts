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

/** @file Complex number implementation */

import { Vector, vector } from '@app/math/linalg'

export class Complex {
	real: number;
	imag: number;

	constructor(real: number, imag?: number) {
		this.real = real;
		this.imag = imag ?? 0;
	}

	add(c: Complex): Complex {
		return new Complex(this.real + c.real, this.imag + c.imag);
	}

	mul(c: Complex): Complex {
		const res_real = this.real * c.real - this.imag * c.imag;
		const res_imag = this.real * c.imag + this.imag * c.real;
		return new Complex(res_real, res_imag);
	}

	/** Convert a complex number to a 2D vector. */
	to_vector(): Vector {
		return vector(this.real,this.imag);
	}
}
