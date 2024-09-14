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

import PRNG from './prng';

/* Those constants are randomly generated prime quotients */
const PRNG_MUL1  = (3532205053565347.0/3768278866164713.0)
const PRNG_TERM1 = (3773467585272041.0/4435662911655887.0)

const PRNG_MUL2  = (3632519696538149.0/4496133748415501.0)
const PRNG_TERM2 = (3396159042346757.0/4429161683464229.0)

const PRNG_MUL3  = (4056279137291581.0/4272384783187219.0)
const PRNG_TERM3 = (3685311960670787.0/3909517015383373.0)

export interface FpLcgParam {
	mul1: number;
	mul2: number;
	mul3: number;
	term1: number;
	term2: number;
	term3: number;
}

export const SIMPLEPRNG_DEFAULT_PARAM = <FpLcgParam> {
	mul1: PRNG_MUL1,
	mul2: PRNG_MUL2,
	mul3: PRNG_MUL3,
	term1: PRNG_TERM1,
	term2: PRNG_TERM2,
	term3: PRNG_TERM3
}

/** Simple floating-point tri-state Linear Congruential Generator with state mixing
 * which achieves reasonable uniformly distributed randomness without relying on bitwise arithmetic
 * (which is a bit odd in JavaScript due to the floating-point nature of the number type). */
export default class FpLcg extends PRNG {
	private state1: number;
	private state2: number;
	private state3: number;
	private param: FpLcgParam;

	constructor(seed: number, param = SIMPLEPRNG_DEFAULT_PARAM) {
		super();
		this.param = Object.assign({}, param);
		this.seed(seed);
	}

	seed(seed: number) {
		this.state1 = seed;
		this.state2 = seed * PRNG_MUL3;
		this.state3 = seed * PRNG_MUL2;
	}

	/** Returns a random number in range <0.0, 1.0) that follows the uniform distribution */
	next(): number {
		// LCG step
		const s1 = (this.state1 * this.param.mul1 + this.param.term1) % 1.0;
		const s2 = (this.state2 * this.param.mul2 + this.param.term2) % 1.0;
		const s3 = (this.state3 * this.param.mul3 + this.param.term3) % 1.0;

		// mix states
		this.state1 = s2 + s3;
		this.state2 = s3;
		this.state3 = s1 + s2;

		// combine states to get the result
		return (s1+s2+s3) % 1.0;
	}
}
