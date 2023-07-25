
//Imports«

import { util, api as capi } from "/sys/util.js";
import {globals} from "/sys/config.js";

const{ mk, log, cwarn, cerr, isnum, isstr, make, mkdv} = util;
const {NS} = globals;
const {fs, widgets: wdg} = NS.api;

//»

let DEVICE_ID = '3548e80fcd93245a7e7c782b372f3bc06b8e1f3b828e325ba36b0ff21163b37e';

export const app = function(Win, Desk) {

//Var«

let snap_funcs=[];
let tracks=[];
let Main = Win.main;
Main._overy="scroll";
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


//»






let vid = make('video');
let can = mk('canvas');
let ctx = can.getContext('2d',{willReadFrequently: true});
Main._add(vid);
Main._add(can);
let constraints={
	video: {
		deviceId: {
			exact: DEVICE_ID
		}
	}
};
const take_picture = ()=>{
	ctx.save();
ctx.translate(0, 100+can.height);
ctx.rotate(-90*Math.PI/180);
	ctx.drawImage(vid, 0, 0);
	ctx.restore();
//	let im = make('img');
//	im.src = can.toDataURL("image/png", 1);
};
this.onappinit=async()=>{
//let devs = await navigator.mediaDevices.enumerateDevices();

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

};
this.onkill=()=>{//«
//for (let tr of tracks) tr.stop();
};//»
this.onkeydown=(e,k)=>{//«
	if (k=="SPACE_"){
	}
	else if (k=="s_C"){
	}
};//»

}
