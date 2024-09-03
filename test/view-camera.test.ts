import { point } from '@app/math/geometry';
import * as vector from '@app/math/vector';
import { Camera, CameraConfig } from '@app/view/camera';

const camera_conf: CameraConfig = { 
	fov_v: Math.PI,
	fov_h: Math.PI, 
	screen_w: 100,
	screen_h: 100,
	rot_v: Math.PI/180,
	rot_h: Math.PI/180,
	flags: {}
};

const camera = new Camera(camera_conf, point(0,0,0));

function test_scanning(num: number) {
	for (let px of camera.get_dir_for_each_pixel()) {
		const ang_h = Math.atan2(px.dir.v[1], px.dir.v[0]);
		const ang_v = Math.atan2(px.dir.v[2], Math.sqrt(px.dir.v[1]*px.dir.v[1]  + px.dir.v[0]*px.dir.v[0]));
		//console.log(`${num}: x: ${px.x}, y: ${px.y}, ang_h: ${(ang_h * 180/Math.PI).toPrecision(4)}, ang_v: ${(ang_v * 180/Math.PI).toPrecision(4)}`);
		expect(vector.length_sq(px.dir)).toBeCloseTo(1.0);
	}
}

test('Camera scanning', ()=>{
	test_scanning(1);
});

test('Camera scanning after horizontal rotation by steps', ()=>{
	camera.rotate_h_step(100);
	test_scanning(2);
});

test('Camera scanning after vertical rotation by steps', ()=>{
	camera.rotate_v_step(100);
	test_scanning(3);
});

test('Camera scanning after horizontal rotation by angle', ()=>{
	debugger;
	camera.rotate_h(1);
	test_scanning(4);
});

test('Camera scanning after vertical rotation by angle', ()=>{
	camera.rotate_v(1);
	test_scanning(5);
});
