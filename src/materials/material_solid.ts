import { StaticMaterial, ResponseType } from '@app/material';
import { Color, clone_color, mul_color } from '@app/physics/color';
import { Ray } from '@app/raytracer';
import { Point } from '@app/math/linalg';

/** Solid color material */
export class SolidMaterial extends StaticMaterial {
	color: Color;

	constructor(color: Color, mirror: boolean, response: ResponseType) {
		super(mirror, response);
		this.color = clone_color(color);
	}

	alter_ray(ray: Ray, _: Point): boolean {
		const old_color = ray.get_color();
		const new_color = mul_color(old_color, this.color);
		ray.set_color(new_color);
		return true;
	}
}
