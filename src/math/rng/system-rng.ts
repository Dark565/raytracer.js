import RNG from './rng';

/** The RNG exported by the JavaScript runtime */
class SystemRNG extends RNG {
	next() {
		return Math.random();
	}
}

export default SystemRNG;
