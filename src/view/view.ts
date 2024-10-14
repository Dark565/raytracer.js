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

import ExposureBuffer from './exposure_buffer';
import ToneMapper from './tone_mapping';
import Screen from './screen';


/** A wrapper connecting the ExposureBuffer and Screen */
class View {
	ebuffer: ExposureBuffer;
	screen: Screen;
	tone_mapper: ToneMapper;

	constructor(ebuffer: ExposureBuffer, screen: Screen, tone_mapper: ToneMapper) {
		this.ebuffer = ebuffer;
		this.screen = screen;
		this.tone_mapper = tone_mapper;
	}

	draw_ebuffer() {
		const [drange_min, drange_max] = this.tone_mapper.get_dynamic_range(this.ebuffer);

		this.ebuffer.discretize_to_screen(this.screen, drange_min, drange_max);
	}
}

export default View;
