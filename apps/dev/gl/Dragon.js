/*«



window.addEventListener('resize', resize, false);
resize();


requestAnimationFrame(update);

        </script>
    </body>
</html>


»*/

//Imports«
import { util, api as capi } from "/sys/util.js";
import {globals} from "/sys/config.js";
import { Renderer, Transform, Camera, Geometry, Texture, Program, Mesh, Orbit, Plane, Skin } from '/node/ogl/src/index.mjs';

const{ log, cwarn, cerr, isnum, make, mkdv} = util;
//»

export const app = function(Win, Desk) {
//GLSL«

const vertex = /* glsl */ `
	attribute vec3 position;
	attribute vec3 normal;
	attribute vec2 uv;
	attribute vec4 skinIndex;
	attribute vec4 skinWeight;

	uniform mat3 normalMatrix;
	uniform mat4 modelMatrix;
	uniform mat4 modelViewMatrix;
	uniform mat4 projectionMatrix;

	uniform sampler2D boneTexture;
	uniform int boneTextureSize;

	mat4 getBoneMatrix(const in float i) {
		float j = i * 4.0;
		float x = mod(j, float(boneTextureSize));
		float y = floor(j / float(boneTextureSize));

		float dx = 1.0 / float(boneTextureSize);
		float dy = 1.0 / float(boneTextureSize);

		y = dy * (y + 0.5);

		vec4 v1 = texture2D(boneTexture, vec2(dx * (x + 0.5), y));
		vec4 v2 = texture2D(boneTexture, vec2(dx * (x + 1.5), y));
		vec4 v3 = texture2D(boneTexture, vec2(dx * (x + 2.5), y));
		vec4 v4 = texture2D(boneTexture, vec2(dx * (x + 3.5), y));

		return mat4(v1, v2, v3, v4);
	}

	varying vec2 vUv;
	varying vec3 vNormal;

	void main() {
		vUv = uv;
		vNormal = normalize(normalMatrix * normal);

		mat4 boneMatX = getBoneMatrix(skinIndex.x);
		mat4 boneMatY = getBoneMatrix(skinIndex.y);
		mat4 boneMatZ = getBoneMatrix(skinIndex.z);
		mat4 boneMatW = getBoneMatrix(skinIndex.w);

		// update normal
		mat4 skinMatrix = mat4(0.0);
		skinMatrix += skinWeight.x * boneMatX;
		skinMatrix += skinWeight.y * boneMatY;
		skinMatrix += skinWeight.z * boneMatZ;
		skinMatrix += skinWeight.w * boneMatW;
		vNormal = vec4(skinMatrix * vec4(vNormal, 0.0)).xyz;

		// Update position
		vec4 bindPos = vec4(position, 1.0);
		vec4 transformed = vec4(0.0);
		transformed += boneMatX * bindPos * skinWeight.x;
		transformed += boneMatY * bindPos * skinWeight.y;
		transformed += boneMatZ * bindPos * skinWeight.z;
		transformed += boneMatW * bindPos * skinWeight.w;
		vec3 pos = transformed.xyz;

		gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
	}
`;

const fragment = /* glsl */ `
	precision highp float;

	uniform sampler2D tMap;

	varying vec2 vUv;
	varying vec3 vNormal;

	void main() {
		vec3 tex = texture2D(tMap, vUv).rgb;

		vec3 normal = normalize(vNormal);
		vec3 light = vec3(0.0, 1.0, 0.0);
		float shading = min(0.0, dot(normal, light) * 0.2);

		gl_FragColor.rgb = tex + shading;
		gl_FragColor.a = 1.0;
	}
`;

const shadowVertex = /* glsl */ `
	precision highp float;

	attribute vec2 uv;
	attribute vec3 position;

	uniform mat4 modelViewMatrix;
	uniform mat4 projectionMatrix;

	varying vec2 vUv;

	void main() {
		vUv = uv;
		
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	}
`;

const shadowFragment = /* glsl */ `
	precision highp float;

	uniform sampler2D tMap;

	varying vec2 vUv;

	void main() {
		float shadow = texture2D(tMap, vUv).g;
		
		gl_FragColor.rgb = vec3(0.0);
		gl_FragColor.a = shadow;
	}
`;

//»

//Var«

let Main = Win.main;
let rafId;

const renderer = new Renderer({ dpr: 2 });
const gl = renderer.gl;
Main.appendChild(gl.canvas);
gl.clearColor(1, 1, 1, 1);

const camera = new Camera(gl, { fov: 35 });
camera.position.set(6, 2, 6);

const controls = new Orbit(camera, {element: Main});

const scene = new Transform();

let skin, animation;

//»


//Funcs«

const resize=()=>{//«
	renderer.setSize(Main._w, Main._h);
	camera.perspective({ aspect: gl.canvas.width / gl.canvas.height });
}//»

const loadModel= async ()=>{//«

const data = await (await fetch(`/node/ogl/assets/snout-rig.json`)).json();
// Rig JSON data format
// format is the same as regular model json, with the addition of the rig object
//
// {
//     position: [],
//     skinWeight: [],
//     ... other vertex attributes

//     rig: {
//         bones: [
//             {name: 'root', parent: -1},
//             {name: 'spine', parent: 0},
//             ... for whole bone hierarchy
//         ],
//         bindPose: {
//             ... for the following properties, values concatenated for all bones, arranged in order of bones array
//             position: [x1, y1, z1, x2, y2, z2, ...],
//             quaternion: [x1, y1, z1, w1, x2, y2, z2, w2, ...],
//             scale: [x1, y1, z1, x2, y2, z2, ...],
//         },
//     },
// }

const animationData = await (await fetch(`/node/ogl/assets/snout-anim.json`)).json();
// Animation JSON format
// data is expected to be baked for each frame, therefore duration is derived
// from number of frames in array.
// {
//     frames: [
//         {
//             ... identical format to bindPose above, values are concatenated
//             position: [x1, y1, z1, x2, y2, z2, ...],
//             quaternion: [x1, y1, z1, w1, x2, y2, z2, w2, ...],
//             scale: [x1, y1, z1, x2, y2, z2, ...],
//         },
//         ... continue for number of frames
//     ]
// }

const geometry = new Geometry(gl, {
position: { size: 3, data: new Float32Array(data.position) },
uv: { size: 2, data: new Float32Array(data.uv) },
normal: { size: 3, data: new Float32Array(data.normal) },
skinIndex: { size: 4, data: new Float32Array(data.skinIndex) },
skinWeight: { size: 4, data: new Float32Array(data.skinWeight) },
});

const texture = new Texture(gl);
const img = new Image();
img.onload = () => (texture.image = img);
img.src = '/node/ogl/assets/snout.jpg';

const program = new Program(gl, {
vertex,
fragment,
uniforms: {
	tMap: { value: texture },
},
});

// Skin extends Mesh - so on top of passing in geometry and program,
// pass in the rig data, including a list of bones and their bind transforms.
// The Skin class will automatically add 'boneTexture' and 'boneTextureSize' uniforms.
skin = new Skin(gl, { rig: data.rig, geometry, program });
skin.setParent(scene);

skin.scale.set(0.01);
skin.position.y = -1;

// Helper function to add animation to skin's bones.
// The Animation class can be used directly for any hierarchy - is not solely for bones.
animation = skin.addAnimation(animationData);
}//»

const initShadow=()=>{//«
	const texture = new Texture(gl);
	const img = new Image();
	img.onload = () => (texture.image = img);
	img.src = '/node/ogl/assets/snout-shadow.jpg';

	const geometry = new Plane(gl, { width: 7, height: 7 });
	const program = new Program(gl, {
	vertex: shadowVertex,
	fragment: shadowFragment,
	uniforms: {
		tMap: { value: texture },
	},
	transparent: true,
	cullFace: false,
	});

	const mesh = new Mesh(gl, { geometry, program });
	mesh.rotation.x = -Math.PI / 2;
	mesh.position.y = -1;
	mesh.setParent(scene);
}//»

const update=(t)=>{//«
	rafId = requestAnimationFrame(update);

	// Control animation but updating the elapsed value.
	// It uses modulo to repeat the animation range,
	// so below is playing a never-ending loop.
	if (animation) animation.elapsed += 0.1;

	// Calling 'update' updates the bones with all of the
	// attached animations based on their weights.
	if (skin) skin.update();

	controls.update();
	renderer.render({ scene, camera });
}//»

//»


this.onresize=resize;
this.onappinit=()=>{//«
resize();
loadModel();
// Added baked occlusion on the floor to help ground the character
initShadow();
rafId = requestAnimationFrame(update);
}//»
this.onkill=()=>{//«
cancelAnimationFrame(rafId);
};//»
this.onkeydown=(e,k)=>{//«
};//»

}
