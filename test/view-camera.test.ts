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

const camera = new Camera(camera_conf);

function test_scanning() {
	for (let px of camera.get_dir_for_each_pixel()) {
		//const ang_h = Math.atan2(px.dir.y, px.dir.x);
		//const ang_v = Math.atan2(px.dir.z, Math.sqrt(px.dir.y*px.dir.y  + px.dir.x*px.dir.x));
		//console.log(`x: ${px.x}, y: ${px.y}, ang_h: ${ang_h * 180/Math.PI}, ang_v: ${ang_v * 180/Math.PI}`);
		expect(px.dir.length_sq()).toBeCloseTo(1.0);
	}
}

test('Camera scanning', ()=>{
	test_scanning();
});

test('Camera scanning after horizontal rotation by steps', ()=>{
	camera.rotate_h_step(100);
	test_scanning();
});

test('Camera scanning after vertical rotation by steps', ()=>{
	camera.rotate_v_step(100);
	test_scanning();
});

test('Camera scanning after horizontal rotation by angle', ()=>{
	debugger;
	camera.rotate_h(1);
	test_scanning();
});

test('Camera scanning after vertical rotation by angle', ()=>{
	camera.rotate_v(1);
	test_scanning();
});
