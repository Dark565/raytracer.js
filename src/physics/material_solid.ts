import { StaticMaterial, ResponseType } from '@app/physics/material';
import { Color, clone_color, mul_color, scale_color } from '@app/physics/color';
import { Ray } from '@app/raytracer';
import { Point } from '@app/linalg';

/** Solid color material */
export class SolidMaterial extends StaticMaterial {
	color: Color;

	constructor(color: Color, attenuation: number, mirror: boolean, response: ResponseType) {
		super(attenuation, mirror, response);
		this.color = clone_color(color);
	}

	alter_ray(ray: Ray, point: Point): boolean {
		const old_color = ray.get_color();
		const new_color = scale_color(mul_color(old_color, this.color), this.reflectivity);
		ray.set_color(new_color);
		return true;
	}
}

