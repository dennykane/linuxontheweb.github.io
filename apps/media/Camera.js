
//Imports«

import { util, api as capi } from "/sys/util.js";
import {globals} from "/sys/config.js";

const{ mk, log, cwarn, cerr, isnum, isstr, make, mkdv} = util;
const {NS} = globals;
const {fs, widgets: wdg} = NS.api;

//»

//let USE_DEVICE = "9bf05e13e1ab9416e22e9c2055b8b3e537569da12ebd9f2d9f6247c73977a0c1";
let USE_DEVICE = false;

export const app = function(Win, Desk) {

//Var«

let Main = Win.main;
let imdiv = mkdv();
Main._add(imdiv);
imdiv._w = "100%";
imdiv._dis="flex";
imdiv.style.flexWrap="wrap";
Main._over="auto";
let track;
let vid = make('video');
let can = mk('canvas');
let ctx = can.getContext('2d',{willReadFrequently: true});
let imcan = mk('canvas');
let imctx = imcan.getContext('2d',{willReadFrequently: true});
let w, h;
let imw, imh;
let images = [];
let scrh;
let numrows=1;
let is_waiting = false;
let iter;

let constraints = {
	video: {
		width: { min: 1280 },
		height: {min: 720}
	}
};
if (USE_DEVICE){
	constraints.video.deviceId = {exact: USE_DEVICE};
}

//»
//Funcs«

const num_to_arr = (num, want_size) => {//«
	let a = Array.from(new Uint8Array((new Uint32Array([num])).buffer).reverse());
	if (want_size && a.length === want_size) return a;
	if (!a[0]) a.shift();
	if (want_size && a.length === want_size) return a;
	if (!a[0]) a.shift();
	if (want_size && a.length === want_size) return a;
	if (!a[0]) a.shift();
	return a;
};//»
const dosave = (name, arr) => {//«
	iter=0;
	let alldat=[];
	let totlen=0;
	for (let im of arr){
		let bstr = atob(im.replace(/^data:image\x2fpng;base64,/,""));
		let arr = bstr.split("");
		let dat = Uint8Array.from(arr, ch=> ch.charCodeAt());
		alldat.push({size:num_to_arr(dat.length, 4), data: dat});
		totlen += 4 + dat.length;
	}
	let out = new Uint8Array(totlen);
	let pos=0;
	for (let d of alldat){
		out.set(d.size, pos);
		pos+=4;
		out.set(d.data, pos);
		pos+=d.data.length;
	}
	capi.download(new Blob([out.buffer],{type:"application/octet-stream"}), name);
};//»

const init = async() => {//«

let stream = await navigator.mediaDevices.getUserMedia(constraints);
vid.srcObject = stream;

};//»
const take_picture=()=>{//«

	ctx.drawImage(vid, 0, 0);
	let pngbase64 = can.toDataURL("image/png", 1);
 	imctx.drawImage(vid, 0, 0, w, h, 0, 0, imw, imh);
	let url = imcan.toDataURL();
	let im = mk('img');
	let o = {thumbnail: im, png: pngbase64};
	im.ondblclick=()=>{
		delete o.png;
		im._op=0;
	};
	im._w = imw;
	im._h = imh;
	images.push(o);
	im.style.transform='rotate(0.25turn)';
	imdiv._add(im);

	im.src = url;
	if (Main.scrollHeight > scrh){
		numrows++;
		imdiv._h = numrows*imw;
		scrh = Main.scrollHeight;
	}

};//»
const trysave = async()=>{//«
	let arr=[];
	for (let im of images){
		if (!im.png) continue;
		arr.push(im.png);
	}
	if (!arr.length){
		wdg.popup("No images");
		return;
	}
	is_waiting = true;
//if (await wdg.popyesno(`Save ${arr.length} images as?`)){
//	dosave(arr);
//}
///*
    let name = await wdg.popin(`Name for archive of ${arr.length} images?`);
	if (isstr(name)) {
		name = name.trim().replace(/ +/g," ");
		if (name.match(/[a-zA-Z]/)) {
			dosave(name, arr);
		}
		else wdg.popup("Cancelled");
	}
	else wdg.popup("Cancelled");
//*/
	is_waiting = false;
};//»

vid.onloadedmetadata=()=>{//«
	w = vid.videoWidth;
	h = vid.videoHeight;
	Win.status_bar.innerHTML=`Ready: ${w}x${h}`;
	can.width = w;
	can.height = h;
	imw = w/4;
	imh = h/4;
	imdiv._h = numrows*imw;
	scrh = Main.scrollHeight;
	vid.play();
};//»

//»

this.onresize=()=>{};
this.onappinit=init;
this.onkill=()=>{//«
};//»
this.onkeydown=(e,k)=>{//«
	if (is_waiting) return;
	if (k=="SPACE_"){
		e.preventDefault();
		take_picture();
	}
	else if (k=="s_C"){
		trysave();
	}
};//»

}
