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

/** @file This file contains different tone mappers to use for the dynamic range compression */

import ExposureBuffer from './exposure_buffer';

export default abstract class ToneMapper {
	abstract get_dynamic_range(ebuffer: ExposureBuffer): [number, number];
}

export class ToneMapper_Identity extends ToneMapper {
	private constructor() {super();}

	get_dynamic_range(): [number, number] {
		return [0, 1];
	}

	static instance = new ToneMapper_Identity();
}

export abstract class ToneMapper_DRLimited extends ToneMapper {
	dynamic_coef: number;
	min_dynamic: number;
	max_dynamic: number;

	constructor(dynamic_range: number, min_dynamic: number, max_dynamic: number) {
		super();
		this.dynamic_coef = 1<<dynamic_range;
		this.min_dynamic = min_dynamic;
		this.max_dynamic = max_dynamic;
	}
}

export class ToneMapper_StdDevAroundMean extends ToneMapper_DRLimited {
	get_dynamic_range(ebuffer: ExposureBuffer): [number, number] {
		const mean_br = ebuffer.get_mean();
		const variance_br = ebuffer.get_variance(mean_br);
		const dev_br = Math.sqrt(variance_br);

		let drange_max = Math.min(mean_br + dev_br, this.max_dynamic);
		let drange_min = drange_max / this.dynamic_coef;
		if (drange_min < this.min_dynamic) {
			drange_min = this.min_dynamic;
			drange_max = drange_min * this.dynamic_coef;
		}

		return [drange_min, drange_max];
	}
}

export class ToneMapper_AbsDevAroundMean extends ToneMapper_DRLimited {
	get_dynamic_range(ebuffer: ExposureBuffer): [number, number] {	
		const mean_br = ebuffer.get_mean();
		const dev_br = ebuffer.get_absolute_dev(mean_br);

		let drange_max = Math.min(mean_br + dev_br, this.max_dynamic);
		let drange_min = drange_max / this.dynamic_coef;
		if (drange_min < this.min_dynamic) {
			drange_min = this.min_dynamic;
			drange_max = drange_min * this.dynamic_coef;
		}

		return [drange_min, drange_max];
	}
}

