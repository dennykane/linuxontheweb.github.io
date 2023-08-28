
//Imports«

import { util, api as capi } from "/sys/util.js";
import {globals} from "/sys/config.js";

const{ mk, log, cwarn, cerr, isnum, isstr, make, mkdv} = util;
const {NS} = globals;
const {fs, widgets: wdg} = NS.api;

//»

//let DEVICE_ID = '3548e80fcd93245a7e7c782b372f3bc06b8e1f3b828e325ba36b0ff21163b37e';
const IDS = [
	'24adf415bbbd5857b7fd1c2a9b52e67cce8dc153d25c0bb9a2df4ee7e047f132',//Laptop
	'bf66766eda9ce70ca2c470849827a78447de64260c23aef78429aa76d2551253'//1
];

export const app = function(Win, Desk) {

//Var«

let snap_funcs=[];
let tracks=[];
let videos = [];
let streams = [];
let rafId;

let ws;
//»

//DOM«

let Main = Win.main;
Main._overy="scroll";
let can = make('canvas');		
let ctx = can.getContext('2d',{willReadFrequently: true});
can.width = 640;
can.height = 480;
Main._add(can);
log(can);
//»

//Funcs«

const enumerate_devices = async()=>{//«
	let devs = await navigator.mediaDevices.enumerateDevices();
	log(devs);
	devs.forEach((device) => {
		if (device.kind == "videoinput") {
			log(`${device.label}: id = ${device.deviceId}`);
		}
	});
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
const take_picture = ()=>{//«
	ctx.save();
ctx.translate(0, 100+can.height);
ctx.rotate(-90*Math.PI/180);
	ctx.drawImage(vid, 0, 0);
	ctx.restore();
//	let im = make('img');
//	im.src = can.toDataURL("image/png", 1);
};//»

const start_loop = (e) => {//«
//drawImage(image, dx, dy)
//drawImage(image, dx, dy, dWidth, dHeight)
//drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
for (let i=0; i < videos.length; i++){
	let vid = videos[i];
	if (i==0) ctx.drawImage(vid, 0, 0);
	else ctx.drawImage(vid, 0, 0, 640/4, 480/4);
}
let dat = ctx.getImageData(0, 0, 640, 480);
ws.send(dat.data.buffer);

rafId = requestAnimationFrame(start_loop);
};//»

//»

this.onappinit=async()=>{//«
for (let id of IDS) {
log(`Getting: ${id}`);
	let vid = make('video');
	videos.push(vid);
	let stream = await navigator.mediaDevices.getUserMedia({
		video: {
			deviceId: {
				exact: id
			}
		}
	})
//log(stream);
	streams.push(stream);
	vid.srcObject = stream;
	vid.play();
//	Main._add(vid);
}
ws = new WebSocket('ws://localhost:20002');
ws.onopen = ()=>{
rafId = requestAnimationFrame(start_loop);
cwarn("OPEN");
};
ws.onclose=()=>{
cerr("CLOSED");
};
//cwarn(`Got: ${streams.length} STREAMS`);
/*«
	let stream = await navigator.mediaDevices.getUserMedia(constraints);
	vid.onloadedmetadata = ()=>{
		can.width = vid.videoWidth;
		can.height = vid.videoHeight;
		vid.play();
		setTimeout(take_picture, 250);
		take_picture();
//		ctx.drawImage(vid, 0, 0);
	};
	snap_funcs.push(()=>{
		return im;
	});
	vid.srcObject = stream;
log(vid);

///*
//*/
//log(ws);
};//»
this.onkill=()=>{//«
	for (let stream of streams){
		let tracks = stream.getVideoTracks();
		for (let tr of tracks) tr.stop();
	}
	cancelAnimationFrame(rafId);
	ws.close();
//log(ws);
};//»
this.onkeydown=(e,k)=>{//«
	if (k=="SPACE_"){
	}
	else if (k=="d_"){
		enumerate_devices();
	}
	else if (k=="s_C"){
	}
};//»

}


