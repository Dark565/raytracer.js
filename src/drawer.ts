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

export class Drawer {
	ctx: CanvasRenderingContext2D;
	img: ImageData;
	px_img: ImageData;

	constructor(canvas_id: string) {
		let canvas = <HTMLCanvasElement> document.getElementById(canvas_id);
		this.ctx = canvas.getContext("2d");
		this.img = this.ctx.createImageData(canvas.width, canvas.height);
		this.px_img = this.ctx.createImageData(1,1);
	}

	draw_noise() {
		let width  = this.ctx.canvas.width;
		let height = this.ctx.canvas.height;
		let total_size = width * height;
		let img_data = this.img.data;

		for (let i = 0; i < total_size*4; i += 4 /* rgba */) {
			let _r = Math.random();
			let rnd = (_r * 0xffffff);
			img_data[i]   = rnd & 0xff;
			img_data[i+1] = (rnd >> 8)  & 0xff;
			img_data[i+2] = (rnd >> 16) & 0xff;
			img_data[i+3] = 0xff;
		}
		
		this.ctx.putImageData(this.img, 0, 0);
	}

	draw_line(from: number[], to: number[], width: number, color: number[]) {
		this.ctx.lineWidth = width
		this.ctx.beginPath();
		this.ctx.moveTo(from[0], from[1]);
		this.ctx.lineTo(to[0], to[1]);
		this.ctx.stroke();
	}

	draw_pixel(x: number, y: number, color: number[]) {
		let img_data = this.px_img.data;
		img_data[0] = color[0];
		img_data[1] = color[1];
		img_data[2] = color[2];
		this.ctx.putImageData(this.px_img, x, y);
	};
};
