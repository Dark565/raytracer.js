import * as vector from './vector';
import RNG from './rng/rng';

/** Get a random sample bounded by a unit sphere.
 * This method utilizes sample rejection approach and is generally efficient.
 * The probability that sample is within a sphere is pi/6 (~52.35%)
 * so this function will return a valid sample in two iterations on average. */
export function isotropic_sphere_sample(rng: RNG): vector.Vector3 {
	let vec: vector.Vector3;
	do {
		vec = vector.vector3(rng.next()*2-1, rng.next()*2-1, rng.next()*2-1);
	} while (vector.dot(vec,vec) > 1);
	return vec;
}
