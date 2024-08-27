import { StaticMaterial, ResponseType } from '@app/material';
import { Color, clone_color, mul_color } from '@app/physics/color';
import { Entity } from '@app/entity';
import { Ray } from '@app/raytracer';
import { Point } from '@app/math/linalg';
import { Texture } from '@app/texture/texture';

/** Solid color material */
export class SolidMaterial extends StaticMaterial {
	constructor(mirror: boolean, light_source: boolean, response: ResponseType) {
		super(mirror, light_source, response);
	}

	alter_ray(ray: Ray, entity: Entity, texture: Texture, p: Point): boolean {
		const old_color = ray.get_color();
		const [u,v] = entity.map_uv(p);
		const new_color = mul_color(old_color, texture.get_color(u,v));
		ray.set_color(new_color);
		return true;
	}
}

export const SIMPLE_SMOOTH_MATERIAL = new SolidMaterial(true, false, ResponseType.REFLECTION);
export const SIMPLE_LIGHT_MATERIAL  = new SolidMaterial(false, true, ResponseType.REFLECTION);
