import { StaticMaterial, ResponseType } from '@app/material';
import { Color, clone_color, mul_color } from '@app/physics/color';
import { Entity } from '@app/entity';
import { Ray } from '@app/raytracer';
import { Point } from '@app/math/geometry';
import { Texture } from '@app/texture/texture';

/** Solid color material */
export class SolidMaterial extends StaticMaterial {
	constructor(response: ResponseType, light_source: boolean, mirror: boolean, roughness: number) {
		super(response, light_source, mirror, roughness);
	}

	alter_ray(ray: Ray, entity: Entity, texture: Texture, p: Point): boolean {
		const old_color = ray.get_color();
		const [u,v] = entity.map_uv(p);
		const new_color = mul_color(old_color, texture.get_color(u,v));
		ray.set_color(new_color);
		return true;
	}
}

export const SIMPLE_SMOOTH_MATERIAL = new SolidMaterial(ResponseType.REFLECTION, false, true, 0);
export const SIMPLE_LIGHT_MATERIAL  = new SolidMaterial(ResponseType.REFLECTION, true, false, 0);

/** A reflective material with 0.5 roughness */
export const SIMPLE_ROUGH_MATERIAL = new SolidMaterial(ResponseType.REFLECTION, false, true, 0.5);
