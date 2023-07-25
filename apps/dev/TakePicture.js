
//Imports«

import { util, api as capi } from "/sys/util.js";
import {globals} from "/sys/config.js";

const{ mk, log, cwarn, cerr, isnum, isstr, make, mkdv} = util;
const {NS} = globals;
const {fs, widgets: wdg} = NS.api;

//»

//let DEVICE_ID = '3548e80fcd93245a7e7c782b372f3bc06b8e1f3b828e325ba36b0ff21163b37e';
let DEVICE_ID = '9bf05e13e1ab9416e22e9c2055b8b3e537569da12ebd9f2d9f6247c73977a0c1';
let START_FROM_PICTURE_NUM = 0;
let NUM_SECS = 5;

export const app = function(Win, Desk) {

//Var«

let Main = Win.main;
Main._overy="scroll";
let timer_div = mkdv();
timer_div._dis="none";
timer_div.style.alignItems="center";
timer_div.style.justifyContent="center";
timer_div._fs=150;
timer_div._fw=900;
//let tm
timer_div._pos="absolute";
timer_div._x=0;
timer_div._y=0;
timer_div._w="100%";
timer_div._h="100%";
timer_div._bgcol="rgba(127,0,0,0.25)";
timer_div._z=100;
//timer_div._=;
let vid = make('video');
vid._w = 650;
//let vdiv = mkdv();
let can = mk('canvas');
can.width = 512;
can.height = 512;
let ctx = can.getContext('2d',{willReadFrequently: true});
//vid.style.transform=`rotate(0.25turn)`;
//vid._padt=-250;
//vid._h = 300;
Main._add(can);
Main._add(vid);
Main._add(timer_div);

let constraints = {
	video: {
		deviceId: {
			exact: DEVICE_ID
		}
	}
};

//»

//Funcs«

const init = async() => {//«

let stream1 = await navigator.mediaDevices.getUserMedia(constraints1);
vid1.srcObject = stream1;

let stream2 = await navigator.mediaDevices.getUserMedia(constraints2);
vid2.srcObject = stream2;

};//»
const take_pictures=()=>{//«

	ctx1.drawImage(vid1, 0, 0);
	let im1 = make('img');
	im1.src = can1.toDataURL("image/png", 1);
	Main._add(im1);	

	ctx2.drawImage(vid2, 0, 0);
	let im2 = make('img');
	im2.src = can2.toDataURL("image/png", 1);
	Main._add(im2);	

log(im1, im2);

};//»
let picture_num = START_FROM_PICTURE_NUM;

const draw_image=()=>{
	ctx.save();
	ctx.fillStyle = "black";
	ctx.fillRect(0, 0, can.width, can.height);
	ctx.translate(can.width,0)
	ctx.rotate(0.5*Math.PI);
//	ctx.drawImage(vid, 0, 0);
	ctx.drawImage(vid, 0, 0, vid.videoWidth, vid.videoWidth, 0, 104, 512, 512);
	ctx.restore();
};
const take_picture = () => {
//	ctx.drawImage(vid, 0, 0);
	draw_image();

	let png = can.toDataURL("image/png", 1);
	let bstr = atob(png.replace(/^data:image\x2fpng;base64,/,""));
	let arr = bstr.split("");
	let dat = Uint8Array.from(arr, ch=> ch.charCodeAt());
	capi.download(new Blob([dat.buffer],{type:"image/png"}), `PICTURE_${picture_num++}.png`);
}


//»

this.onresize=()=>{};
this.onappinit=async()=>{//«
	let stream = await navigator.mediaDevices.getUserMedia(constraints);
	vid.onloadedmetadata = ()=>{
//		can.width = vid.videoWidth;
//		can.height = vid.videoHeight;
		vid.play();
		setTimeout(draw_image, 250);
	};
	vid.srcObject = stream;
};//»
this.onkill=()=>{//«
};//»

let is_taking_picture = false;
this.onkeydown=(e,k)=>{//«
//log(k);
	if (k=="SPACE_"){
if (is_taking_picture) return;
is_taking_picture = true;
timer_div._dis="flex";
let iter = NUM_SECS;
timer_div.innerHTML=`${iter}`;
let interval = setInterval(()=>{
iter--;
if (iter==0){
clearInterval(interval);
timer_div._dis="none";
take_picture();
is_taking_picture = false;
return;
}
timer_div.innerHTML=`${iter}`;
},1000);
//setTimeout(take_picture, 5000);

	}
	else if (k=="DOWN_"){
Main.scrollTop+=100;
	}
	else if (k=="UP_"){
Main.scrollTop-=100;
	}
	else if (k=="PGDOWN_"){
Main.scrollTop+=Main._h;
	}
	else if (k=="PGUP_"){
Main.scrollTop-=Main._h;
	}
};//»

}
