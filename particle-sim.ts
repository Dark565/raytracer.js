class Drawer {
	ctx: HTMLCanvasElement;
	img: ImageData;
	px_img: ImageData;

	constructor(canvas_id) {
		let canvas = document.getElementById(canvas_id);
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

	draw_line(from, to, width, color) {
		this.ctx.lineWidth = width
		this.ctx.beginPath();
		this.ctx.moveTo(from[0], from[1]);
		this.ctx.lineTo(to[0], to[1]);
		this.ctx.stroke();
	}

	draw_pixel(x, y, color) {
		let img_data = this.px_img.data;
		img_data[0] = color[0];
		img_data[1] = color[1];
		img_data[2] = color[2];
		this.ctx.putImageData(this.px_img, x, y);
	};
};

class VectorError extends Error {}

class Vector {
	v: number[];
	size: number;

	constructor(x: number[]|void);
	constructor(x: Vector);

	constructor(x: any) {
		if (x instanceof Array) {
			this.v = x.slice(0);
		} else if (x instanceof Vector) {
			this.copy_from(x);
			return;
		} else {
			this.v = [0,0,0];
		}

		this.size = this.v.length;
	}

	[Symbol.iterator]() {
		let i = 0;
		return {
			next: () => {
				if (i < this.size)
					return { value: this.v[i++], done: false };
				else
					return { done: true };
			}
		};
	}

	copy_from(x: Vector) {
		this.v = x.v.slice(0);
		this.size = x.size;
	}

	clone() {
		return new Vector(this);
	}

	_check_compatibility(v2: Vector) {
		if (this.size != v2.size)
			throw new VectorError("this and v2 must have the same size");
	}

	dot(v2: Vector) {
		this._check_compatibility(v2);

		let sum = 0;
		for (let i=0; i < this.size; i++) {
			sum += this.v[i] * v2.v[i];
		}
		return sum;
	}

	cross(v2: Vector) {
		if (this.size != 3 || v2.size != 3)
			throw new VectorError("cross product is defined only for 3-element vectors");

		let res = new Vector;
		res.v[0] = this.v[1]*v2.v[2] - this.v[2]*v2.v[1];
		res.v[1] = this.v[2]*v2.v[0] - this.v[0]*v2.v[2];
		res.v[2] = this.v[0]*v2.v[1] - this.v[1]*v2.v[0];
		return res;
	}

	add(v2: Vector) {
		this._check_compatibility(v2);
		let res = this.clone();
		for (let i=0; i < this.size; i++) {
			res.v[i] += v2.v[i];
		}
		return res;
	}

	sub(v2: Vector) {
		this._check_compatibility(v2);
		let res = this.clone();
		for (let i=0; i < this.size; i++) {
			res.v[i] -= v2.v[i];
		}
		return res;
	}

	scale(scalar: number): Vector {
		let res = this.clone();
		for (let i=0; i < res.size; ++i) {
			res.v[i] *= scalar;
		}
		return res;
	}

	length_sq() {
		return this.dot(this);
	}

	normalize() {
		const len = Math.sqrt(this.length_sq());
		let res = this.clone();
		for (let i=0; i < this.size; i++)
			res.v[i] /= len;

		return res;
	}
}

function vector(...numbers: number[]) {
	return new Vector(numbers);
}

//function Vector(x: number[]|Vector|void): Vector {
//	return new Vector(x);
//}

interface Solid {
	line_cross_point(start: Vector, dir: Vector): Vector[];
}

class Plane implements Solid {
	normal: Vector;
	pos: Vector;
	constructor(normal: Vector, pos: Vector) {
		this.normal = normal.normalize();
		this.pos = pos;
	}

	line_cross_point(start: Vector, dir: Vector): Vector[] {
		let denom = dir.dot(this.normal);
		if (denom == 0)
			return [];

		let off_dist = this.pos.sub(start);
		let ratio = off_dist.dot(this.normal) / denom;
		return [start.add(dir.scale(ratio))];
	}
}

class Sphere implements Solid {
	radius: number;
	pos: Vector;
	constructor(pos: Vector, radius: number) {
		this.pos = pos;
		this.radius = radius;
	}

	line_cross_point(start: Vector, dir: Vector): Vector[] {
		let dist = start.sub(this.pos);
		let a = dir.dot(dir);
		let b = dist.dot(dir);
		let c = dist.dot(dist) - this.radius*this.radius;
		let delta = b*b - a*c*4;
		if (delta < 0)
			return [];

		let s_delta = Math.sqrt(delta);
		let tmp1 = -b / (a*2);
		let tmp2 = s_delta / (a*2);
		let t1 = tmp1 - tmp2;
		let t2 = tmp1 + tmp2;
		return [start.add(dir.scale(t1)), start.add(dir.scale(t2))];
	}
}

class Octree {
	id: number;
	#nodes: Octree[]|any[][];
	
	constructor(...nodes: Octree[]|any[][]) {
		this.#nodes = nodes.map((x)=>x);
	}

	get_node(n: number): Octree|any[] {
		if (n < 0 || n > 7)
			throw Error("Node index out of range (0..7)");

		return this.#nodes[n];
	}

	set_node(n: number, value: Octree|any[]): Octree|any[] {
		if (n < 0 || n > 7)
			throw Error("Node index out of range (0..7)");

		let old_value = this.#nodes[n];
		this.#nodes[n] = value;
		return old_value;
	}
}

function main() {
}

main();
