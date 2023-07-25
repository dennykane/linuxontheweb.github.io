//Imports«

import { util, api as capi } from "/sys/util.js";
import {globals} from "/sys/config.js";

//import * as THREE from '/ext/gltf/js/build/three.module.js';
//import { OrbitControls } from '/ext/gltf/js/examples/jsm/controls/OrbitControls.js';
//import { Sky } from '/ext/gltf/js/examples/jsm/objects/Sky.js';
//import { GLTFLoader } from '/ext/gltf/js/examples/jsm/loaders/GLTFLoader.js';

import { FBXLoader } from '/node/three/examples/jsm/loaders/FBXLoader.js';

//import * as THREE from '/node/three/build/three.module.min.js';
//import { OrbitControls } from '/node/three/examples/jsm/controls/OrbitControls.js'
//import {GLTFLoader} from '/node/three/examples/jsm/loaders/GLTFLoader.js';
const{isarr, isstr, isnum, isobj, make, log, jlog, cwarn, cerr}=util;
const {NS} = globals;
const {fs} = NS.api;

//»

export const app = function(Win, Desk) {

//Var«

let Main = Win.main;
//»

//Funcs«

/*«		
	const Load3DFiles=(cubeVar)=>{//«
		return new Promise((Y,N)=>{
			let loader = new GLTFLoader();
			loader.loadArrayBuffer( buffer, gltf=>{
				mixer = new THREE.AnimationMixer(gltf.scene)
				let box = new THREE.Box3().setFromObject( gltf.scene ); 
				let sz = box.getSize(new THREE.Vector3());
				sceneSize = sz;
				model = gltf.scene;  // model 3D object is loaded
let anim0 = gltf.animations[0];

log(dumpObject(model).join("\n"));
if (anim0){

let tr = anim0.tracks;
bone = MAP.mixamorigLeftArm_08;
//log(bone.position);
bone_pos_times = tr[6].times;
bone_pos_vals = tr[6].values;
bone_quat_times = tr[7].times;
bone_quat_vals = tr[7].values;
}

				model.position.y = 0;
				Y();
			});
		});
	}//»
	const initSky=()=>{//«
		// Add Sky
		sky = new Sky();
		sky.scale.setScalar( 450000 );
		scene.add( sky );

		sun = new THREE.Vector3();
		// SKY OPTIONS
		const effectController = {turbidity: 10,rayleigh: 3,mieCoefficient: 0.005,mieDirectionalG: 0.7,elevation: 2,azimuth: 45,exposure: renderer.toneMappingExposure};

		const uniforms = sky.material.uniforms;
		uniforms[ 'turbidity' ].value = effectController.turbidity;
		uniforms[ 'rayleigh' ].value = effectController.rayleigh;
		uniforms[ 'mieCoefficient' ].value = effectController.mieCoefficient;
		uniforms[ 'mieDirectionalG' ].value = effectController.mieDirectionalG;

		const phi = THREE.MathUtils.degToRad( 90 - effectController.elevation );
		const theta = THREE.MathUtils.degToRad( effectController.azimuth );

		sun.setFromSphericalCoords( 1, phi, theta );

		uniforms[ 'sunPosition' ].value.copy( sun );
		
		renderer.toneMappingExposure = effectController.exposure;
		renderer.render( scene, camera );
	}//»
	const init=async()=>{//«
	
		await Load3DFiles();

		clock = new THREE.Clock();
		scene = new THREE.Scene();
		// ---------------- RENDERER ----------------
		
		renderer = new THREE.WebGLRenderer( { antialias : true } );
		renderer.setPixelRatio( window.devicePixelRatio  );
		renderer.setSize( Main._w, Main._h );
		Main._add( renderer.domElement );  // we add the HTML element to the HTML page
		
		// ---------------- CAMERA ----------------
		
//let delta = Math.min(1.0 / sceneSize.x, 1.0 / sceneSize.y, 1.0 / sceneSize.z);
		camera = new THREE.PerspectiveCamera( 75, Main._w / Main._h, 1, 10000 );
//		camera = new THREE.PerspectiveCamera( 60, Main._w / Main._h, 1, 10000 );
		camera.position.set( CAMX, CAMY, CAMZ);
		camera.lookAt(new THREE.Vector3(0,0,0));
		scene.add( camera );
		
		controls = new OrbitControls( camera, renderer.domElement );
		controls.update();
		controls.addEventListener( "change", event => {  
			let pos = controls.object.position; 
			CAMX=pos.x;
			CAMY=pos.y;
			CAMZ=pos.z;
		}); 
		
		// ---------------- WHITE GRID HELPER ----------------
		
		let helper = new THREE.GridHelper( 10, 2, 0xffffff, 0xffffff );
		scene.add( helper );
		
		// ---------------- LIGHTS ----------------
		
		let ambientLight = new THREE.AmbientLight( 0xcccccc, 2 );
		scene.add( ambientLight );
		
		const directionalLight = new THREE.DirectionalLight( 0xffffff, 0.6 );
		directionalLight.position.set( - 1, 1, 1 );
		scene.add( directionalLight );
		
		// ---------------- CALLING LOADING AND INIT FUNCTIONS ----------------
		
//		initSky();
		
		// ---------------- PERFORMANCE STATS PLUGIN ----------------
		
//		stats = new Stats();
//		stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
//		document.body.appendChild( stats.dom );
		
		
		// ---------------- EVENTS ----------------
		
//		window.addEventListener( 'resize', onWindowResize, false );
		
		// ---------------- STARTING THE GAME MAIN LOOP ----------------
		
//		render();
		animate();		
	}//»
	const CheckLoaded=()=>{//«
		
		if(model == undefined)
		{
			return false;
		}
		
		
		return true;
	}//»
	const animate=()=>{//«
		requestAnimationFrame(animate)

		if (!paused && mixer) {
			mixer.update(clock.getDelta())
		}

		render()

//		stats.update()
	}//»
	const render=()=>{//«
//		stats.begin();						//performance stats
		
		let delta = clock.getDelta();		//get delta time between two frames
		let elapsed = clock.elapsedTime;	//get elapsed time

		if( is_Loaded == false)
		{
			if( CheckLoaded())
			{
				// As explained, this is exeuted only once !
				
				is_Loaded = true;
				
				// InitMap contains all the tasks to execute only once - when the 3D models are loaded
				InitMap();
			}	
		}
		else // When the game is already loaded, the else case is executed at every loop tick
		{
			// Game tick tasks are there

			// ---------------- UPDATING MAIN OBJECTS POSITION  ----------------
			
//				model.position.y = 4 + 0.5 * Math.sin(elapsed);  // floating effect
//				model.rotation.z += 0.01;
		}
			
		
		renderer.render( scene, camera ); 	// We are rendering the 3D world
//		stats.end(); 						// stats , fps ratio ect...
//		requestAnimationFrame( render );	// we are calling render() again,  to loop
	}//»
	const InitMap=()=>{//«
		// model
		scene.add(model);
	}//»
const dumpObject=(obj, lines = [], isLast = true, prefix = '')=>{//«
	let localPrefix = isLast ? '└─' : '├─';
	lines.push(`${prefix}${prefix ? localPrefix : ''}${obj.name || '*no-name*'} [${obj.type}]`);
	MAP[obj.name]=obj;
	let newPrefix = prefix + (isLast ? '  ' : '│ ');
	let lastNdx = obj.children.length - 1;
	obj.children.forEach((child, ndx) => {
		let isLast = ndx === lastNdx;
		dumpObject(child, lines, isLast, newPrefix);
	});
	return lines;
}//»
const set_cam=()=>{//«
	camera.position.set( CAMX, CAMY, CAMZ);
	controls.update();
};//»
»*/

//»

//«

this.onresize=()=>{//«
//	camera.aspect = Main._w / Main._h;
//	camera.updateProjectionMatrix();
//	renderer.setSize( Main._w, Main._h );
};//»
this.onloadfile=(bytes)=>{
//log(bytes);
//buffer = bytes.buffer;
//init();
let loader = new FBXLoader();
loader.loadArrayBuffer(bytes.buffer,(obj)=>{
log(obj);
});
//log(loader);
};
this.onappinit=async()=>{//«

}//»
this.onkill=()=>{//«
//controls.dispose();
//renderer.dispose();
};//»
/*
this.onkeydown=(e,k)=>{//«
let marr;
	if (k=="SPACE_"){
paused = !paused;
	}
	if (k=="-_"){
		CAMX++;
		CAMY++;
		CAMZ++;
		set_cam();
	}
	else if (k=="=_S"){
		CAMX--;
		CAMY--;
		CAMZ--;
		set_cam();
	}
	else if (k=="RIGHT_"){
		CAMX++;
		set_cam();
	}
	else if (k=="LEFT_"){
		CAMX--;
		set_cam();
	}
	else if (k=="UP_"){
		CAMY--;
		set_cam();
	}
	else if (k=="DOWN_"){
		CAMY++;
		set_cam();
	}
	else if (k=="._"){
		CAMZ--;
		set_cam();
	}
	else if (k==",_"){
		CAMZ++;
		set_cam();
	}
	else if (k=="c_"){
log(controls);
	}
else if (k=="d_"){
//let rv = dumpObject(model);
//log(rv.join("\n"));
}
else if (marr = k.match(/^([0-9])_$/)){
	let num = parseInt(marr[1]);
	let n0 = num*4;
	let n1 = n0+1;
	let n2 = n0+2;
	let n3 = n0+3;
	let q = new THREE.Quaternion();
	q.setFromAxisAngle( new THREE.Vector3( bone_quat_vals[n0], bone_quat_vals[n1], bone_quat_vals[n2] ), bone_quat_vals[n3] );
	bone.rotation.setFromQuaternion(q);
	n0 = num*3;
	n1 = n0+1;
	n2 = n0+2;
	bone.position.set(bone_pos_vals[n0],bone_pos_vals[n1],bone_pos_vals[n2]);
}
};//»
*/

this.onkeyup=(e,k)=>{//«
	if (k=="SPACE_"){
	}
};//»

//»

//log(FBXLoader);
//log(three.ObjectLoader);

//log(THREE);

}
