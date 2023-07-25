//This application assumes there is only a video track in a webm file.
//Hence, the name of it is VideoCutter.

/*Issues«

Not "pixel perfect": The actual duration of all of the blocks does not necessarily
seem to be reflected in the final duration. Maybe need to exclude the last
block

@YDUIOPENRT(x2): Does this make it better???

»*/
/*Muxing in audio«

let out_blocks=[];
let hash = {};
let tags = [];
for (let bl of audio_blocks){
	let time1 = `${bl[1]}`.padStart(3, "0");
	let time0 = `${bl[2]}`.padStart(3, "0");
	let nm = `${time1}-${time0}-a`;
	tags.push(nm);
	hash[nm]=bl;
}
for (let bl of video_blocks){
	let time1 = `${bl[1]}`.padStart(3, "0");
	let time0 = `${bl[2]}`.padStart(3, "0");
	let nm = `${time1}-${time0}-v`;
	tags.push(nm);
	hash[nm]=bl;
}
tags = tags.sort();
for (let t of tags) blocks.push(hash[t]);
»*/
/*To parse Info/Tracks«

let INFOTAGS = SEGKIDS["1549a966"];
let TRACKSTAGS = SEGKIDS["1654ae6b"]

1) Get the respective element bytes via the seekhead method
2) Do a parse_section(bytes, WHICHTAGS)

»*/

//Vars«

let ALLOW_MOUSE_SCROLLING = false;

//let USE_INIT_MARKS = true;
let USE_INIT_MARKS = false;
let INIT_MARKS=[[6,"a"],[23,"b"],[20,"c"],[40,"d"]];

let magnify_to_center = false;

let DO_SNAP_TO_TIME = false;

let SHOW_CLUSTER_MARKS_ON_INIT = true;
//let SHOW_CLUSTER_MARKS_ON_INIT = false;

//»

//Imports«

import { util, api as capi } from "/sys/util.js";
import {globals} from "/sys/config.js";
const {lowToHigh} = capi;
const{ log, jlog, cwarn, cerr, isstr, isnum, make, mk, mkdv} = util;
const {NS} = globals;
const {fs, widgets: wdg} = NS.api;

//»

export const app = function(Win, Desk) {//«

//Var«

let cur_set_images;
let grid_time_elems;
let IMG_CACHE = {};

let MAG_PIX_PER_SEC_ARR = [//«
	0.1,
	0.25,
	0.5,
	1,
	2.5,
	5,
	10,
	20,
	40,
	100,
	200,
	400,
	1000,
	2000,
	4000,
	10000,
	20000,
	40000,
	100000,
	200000,
	400000
];//»
let MAX_MAG_ITER = MAG_PIX_PER_SEC_ARR.length-1;
let DEF_MAG_LEVEL = 6;
let cur_mag_level = DEF_MAG_LEVEL;
let mag_pix_per_sec = MAG_PIX_PER_SEC_ARR[cur_mag_level];
let timeline_sig_figs = (mag_pix_per_sec+"").length-2;
if (timeline_sig_figs < 0) timeline_sig_figs = 0;

let TIMELINE_SCROLL_PER = 0.95;

let VID_IMG_H;

let GRID_W = 200;
let GRID_W_HALF = GRID_W/2;
let mag_sec_per_grid = GRID_W/mag_pix_per_sec;

//let mag_sec_per_grid;

//let timeline_sig_figs;
/*
let GRID_W = 150;
let GRID_W_HALF = GRID_W/2;
let mag_sec_per_grid = GRID_W/mag_pix_per_sec;
let timeline_sig_figs = (mag_pix_per_sec+"").length-2;
if (timeline_sig_figs < 0) timeline_sig_figs = 0;
*/

let cur_output_file;

let scroll_mode;
const SCROLL_MODE_MARKER = 1;
const SCROLL_MODE_TIMELINE = 2;

let cur_images = [];
let images_showing = true;

let VID_IMG_OP = 1;
let VID_IMG_PAD = 7;

let await_arrow_up;
let total_scroll;
//let TIMELINE_H = 35;
let TIMELINE_H = 42;
//let TIMELINE_H = 35;
let USE_TIMELINE_X = 0;
let PIX_PER_SEC = 10;

let MAX_MAG_LEVEL = 10000;
let MIN_SANE_MAG_LEVEL = 0.01;


let webm_mod, file;
let file_bytes;
let ebml, tracks;
let url, node;

let CLUSTER_KIDS;
let SEG_KIDS;

let grid_marks;
let grid_times;

let clusters;
let cluster_times = [];
let cluster_time_marks;

let marks = [];
//let mark_times

let min_time_wid=0;
let edown;
let cur_mark;
let is_waiting = false;

let SNAP_TO_CLUSTER_THRESH = 0.5;
let MARK_DIFF_THRESH = 0.25;
let MARK_X_OFF = -5;
let TIME_MARK_SZ = 15;
let MARK_SZ = 20;
let MARK_Y = -7;
let TIME_MARK_X_OFF = -2;
let TIME_MARK_B = -8;
let viddur;
let vidw, vidh;

let RDX = null;//Ruler Drag Event
let TLX;

let use_padl=0;

//»

//DOM«

const NOPROPDEF=e=>{e.stopPropagation();e.preventDefault();};

let statbar = Win.status_bar;
let Main = Win.main;
Main._bgcol="#111";
let canvas = mk('canvas');
let ctx = canvas.getContext('2d',{willReadFrequently: true});

let viddiv = mk('div');
viddiv._pos="absolute";
viddiv._x=0;
viddiv._y=0;
viddiv._w="100%";

//viddiv._h = Main._h - TIMELINE_H - VID_IMG_H -  VID_IMG_PAD;

Main._add(viddiv);

let vid = mk('video');
vid._w="100%";
vid._h="100%";
viddiv._add(vid);
let timeline = mk('div');
timeline._pos="absolute";
timeline._w="100%";
timeline._x=0;
timeline._xLoc = 0;
timeline._h=TIMELINE_H;
timeline._b=0;
timeline._bgcol="#000";

Main._add(timeline);

let tmdiv = mkdv();
tmdiv._fs=26;
tmdiv._fw=900;
tmdiv._pos="absolute";
tmdiv._x=0;
tmdiv._y=0;
tmdiv._tcol="#ccc";
Main._add(tmdiv);

let durdiv = mkdv();
durdiv._fs=26;
durdiv._fw=900;
durdiv._pos="absolute";
durdiv._r=0;
durdiv._y=0;
durdiv._tcol="#ccc";
Main._add(durdiv);


let mark = mkdv();
mark.setAttribute("name","current-time");
mark._pos="absolute";
mark._fs = TIME_MARK_SZ;
//mark._x = MARK_X_OFF;
mark._z = 10;
mark._xLoc = 0;
mark._b = TIME_MARK_B;
mark._fw=900;
mark.innerHTML="^";
mark._tcol="#fff";

//mark._dis="none";
timeline._add(mark);

let ruler = mkdv();
ruler._tcol="#999";
ruler.setAttribute("name","ruler");
ruler._pos="absolute";
ruler._b = 0;
ruler._h = "100%";
//ruler._w = "100%";
//ruler.style.cursor="move";
timeline._add(ruler);

let overdiv = mkdv();
overdiv._pos="absolute";
overdiv._bgcol="#00f";
overdiv._op=0.1;
overdiv._w="100%";
overdiv._h="100%";
overdiv._x=0;
overdiv._y=0;
overdiv._z=99999999;
overdiv.onclick = NOPROPDEF;
overdiv.onmousedown = NOPROPDEF;
overdiv.onmousemove = NOPROPDEF;
overdiv.onmouseup = NOPROPDEF;
overdiv.ondblclick = NOPROPDEF;
overdiv.oncontextmenu = NOPROPDEF;
overdiv.onmouseout = NOPROPDEF;
overdiv.onmouseleave = NOPROPDEF;
overdiv._dis="none";
Main._add(overdiv);

let cluster_marks_div = mkdv();
cluster_marks_div.pos="absolute";
cluster_marks_div._w="100%";
cluster_marks_div._b=0;
if (!SHOW_CLUSTER_MARKS_ON_INIT){
	cluster_marks_div._dis="none";
}
cluster_marks_div.setAttribute("name","clusters");
timeline._add(cluster_marks_div);
//Main._add(cluster_marks_div);

let img_div = mkdv();
img_div._padt = VID_IMG_PAD;
//img_div._padb = VID_IMG_PAD;
img_div._pos="absolute";
img_div._x=0;
img_div._b=TIMELINE_H;
img_div._w="100%";

//img_div._h=VID_IMG_H;

img_div._bgcol="#000";
Main._add(img_div);


//»
//Funcs«

//Util«

const load_webm=async()=>{//«
	webm_mod = await capi.getMod("webmparser");
	SEG_KIDS = webm_mod.WebmTags.kids["18538067"]
	CLUSTER_KIDS = SEG_KIDS.kids["1f43b675"];
	file_bytes = await node.bytes;
	get_clusters();
};//»

const await_seek = (tm)=>{//«
	return new Promise((Y,N)=>{
		vid.onseeked = ()=>{
			Y();
		};
		vid.currentTime = tm;
		tmdiv.innerHTML = get_main_time_str(tm);
	});
};//»

const handle_tab = k => {//«
	let m = find_next_of_arr(k, cur_mark, marks);
	if (!m) return;
	if (cur_mark) {
		cur_mark._off();
	}
	m._on();
};//»

const remove_elem = (elem, arr) => {//«
	for (let i=0; i < arr.length;  i++){
		let elm = arr[i];
		if (elm == elem){
			arr.splice(i, 1);
			break;
		}
	}
};//»

const round_ms = (tm)=>{//«
	return Math.round(tm*1000);
};//»
const stat = s => {//«
	if (Win.is_fullscreen){
		wdg.popup(s);
	}
	statbar.innerHTML=s;
};//»
const clstat = () => {//«
	statbar.innerHTML = "";
};//»
const find_next_of_arr=(k, elem, arr)=>{//«
	let ind = arr.indexOf(elem);
	if (k.match(/_S$/)) ind--;
	else ind++;
	if (ind == arr.length) ind = 0;
	else if (ind < 0) ind = arr.length-1;
	return arr[ind];
};//»
const tofloat = (arr) => {//«
	if (arr.length <= 4) return (new DataView(arr.buffer)).getFloat32();
	if (arr.length <= 8) return (new DataView(arr.buffer)).getFloat64();
}//»
const toint = (arr, if_cp) => {//«
	if (if_cp) arr = arr.slice().reverse();
	else arr = arr.reverse();
	let n = 0;
	for (let i = 0; i < arr.length; i++) n |= (arr[i] << (i * 8));
	return n;
}//»
const try_delete = async()=>{//«
	if (cur_mark){
		is_waiting = true;
		if (await wdg.popyesno(`Delete current marker?`)){
			cur_mark._delIt();
		}
		is_waiting = false;
	}
};//»
const try_save = async()=>{//«
	if (!cur_output_file) {
		stat("No output file to save");
		return;
	}
	if (await Desk.api.saveAs(Win, cur_output_file, "webm")){
		cur_output_file = null;
	}
};//»
this.try_kill = async() => {//«
	if (!cur_output_file) return Win.forceKill();
	if (await wdg.popyesno("There is an unsaved file. Really close the window?")){
		Win.forceKill();
	}
};//»
const get_render_slices = (arr, errarg) => {//«

const err = errarg || wdg.poperr;

let hash = {};
for (let m of marks){
	hash[m._id] = m;
}

let slices = [];
for (let m of arr){
	let m1 = m[0];
	let mrk1 = hash[m1];
	let m2 = m[1];
	let mrk2 = hash[m2];

	if (!mrk1) return err(`${m1}: Not a marker`);
	if (!mrk2) return err(`${m2}: Not a marker`);
	if (m1===m2) return err(`${m1}${m2}: Cannot make a null slice`);
	if (mrk1._time > mrk2._time) return err(`${m1}${m2}: Cannot make a negative time slice`);
	slices.push([Math.floor(mrk1._time*1000), Math.floor(mrk2._time*1000)]);
}

return slices;
//log("RENDER THESE SLICES");
//jlog(slices);

};//»

const get_render_args_from_str = str => {//«
	let arr;
	if (!str) return;
	str = str.trim();
	if (!str) return;
	if (!str.match(/^[ a-zA-Z]+$/)){
		return false;
	}
	arr = str.split(/ +/);
	for (let s of arr){
		if (!s.match(/^[a-zA-Z]{2}$/)){
			return false;
		}
	}
	return arr;

};//»

const sleep=(ms)=>{//«
	return new Promise((Y,N)=>{setTimeout(Y,ms)});
};//»
const get_blocks_from_cluster=(clust)=>{//«
	let blocks = webm_mod.parse_section(clust, CLUSTER_KIDS);
	blocks.shift();
	let tmcode = blocks.shift();
	let out = [tmcode];
	
	for (let i=0; i < blocks.length; i+=2){
		out.push(blocks[i+1]);
	}
	return out;
};//»

//»

const video_init = async ()=>{//«
	viddur = vid.duration;
//	timeline._width = viddur * maglevel * PIX_PER_SEC;
	timeline._width = viddur * mag_pix_per_sec;
	vidh = vid.videoHeight;
	vidw = vid.videoWidth;

	VID_IMG_H  = GRID_W*vidh/vidw;
	viddiv._h = Main._h - TIMELINE_H - VID_IMG_H -  VID_IMG_PAD;
	img_div._h=VID_IMG_H;
//	GRID_W_HALF = GRID_W/2;
//	mag_sec_per_grid = GRID_W/mag_pix_per_sec;
//log(GRID_W);


	canvas.width = vidw;
	canvas.height = vidh;
	let s = get_main_time_str(viddur, true);
	min_time_wid = s.split(":").length;
	durdiv.innerHTML=s;
	tmdiv.innerHTML = get_main_time_str(0);
	if (USE_INIT_MARKS){
		for (let arr of INIT_MARKS){
			create_mark(arr[0],arr[1],true);
		}
	}
	update_all();
};//»
const webm_prep = async()=>{//«

let ebml, tracks;
let CUESHASH={};
let seg_off, tracks_pos, cues_pos;
let b,c,rv;

let mod = await capi.getMod("webmparser");
webm_mod = mod;
let {ebml_sz, dump_hex_lines, parse_section, parse_section_flat} = mod;

let SEGKIDS = mod.WebmTags.kids["18538067"].kids;
let SKHDTAGS = SEGKIDS["114d9b74"];
let CUESTAGS = SEGKIDS["1c53bb6b"];

//Get ebml bytes <ebml(Uint8Array)>«
b = await node.getValue({start: 0, end: 5000});
rv = ebml_sz(b, 4);
c = rv[0]+rv[1];
ebml = b.slice(0, c);
//»

//Get segment byte offset <seg_off(Int)>«
if (!(b[c]==0x18&&b[c+1]==0x53&&b[c+2]==0x80&&b[c+3]==0x67)) return err("Segment ID not found");
c+=4;
rv = ebml_sz(b, c);
seg_off = c = rv[1];
//»

{//« Get byte off for cues <cues_pos(Int)> and tracks <tracks_pos(Int)>

if (!(b[c]==0x11&&b[c+1]==0x4d&&b[c+2]==0x9b&&b[c+3]==0x74)) return err("Seekhead ID not found at expected position");
c+=4;
rv = ebml_sz(b, c);
c = rv[1];
let skhd_bytes = b.slice(c,c+rv[0]);
let skhd = parse_section(skhd_bytes, SKHDTAGS);
for (let i=0; i < skhd.length; i+=2){
	let ent = skhd[i+1];
	let id = ent[1];
	if (id[0]==0x1c && id[1]==0x53 && id[2]==0xbb && id[3]==0x6b){
		cues_pos = seg_off + toint(ent[3]);
	}
	if (id[0]==0x16 && id[1]==0x54 && id[2]==0xae && id[3]==0x6b){
		tracks_pos = seg_off + toint(ent[3]);
	}

}

if (!(cues_pos||tracks_pos)) return err("Cues/Tracks not found");

}//»

//Get tracks bytes <tracks(Uint8Array)>«
{
let tracks_bytes = await node.getValue({start: tracks_pos, end: tracks_pos+20});
rv = ebml_sz(tracks_bytes, 4);
let tracks_size = rv[0];
c = tracks_pos +rv [1];
tracks = await node.getValue({start: tracks_pos, end: c+tracks_size});
}
//»

//Create CUESHASH«
{
let cues_bytes = await node.getValue({start: cues_pos, end: cues_pos+20});
rv = ebml_sz(cues_bytes, 4);
let cues_size = rv[0];
c = cues_pos +rv[1];
cues_bytes = await node.getValue({start: c, end: c+cues_size});
let cues = parse_section(cues_bytes, CUESTAGS);

for (let i=0; i < cues.length; i+=2){
	let cue1 = cues[i+1];
	let tm1 = toint(cue1[1], true);
	let pos1 = toint(cue1[3][3], true);

	let sz;
	let cue2 = cues[i+3];
	if (cue2) {
		let tm2 = toint(cue2[1], true);
		let pos2 = toint(cue2[3][3], true);
		sz = pos2 - pos1;
	}
	else if (pos1 < cues_pos){
		sz = cues_pos - (pos1+seg_off);
	}
	CUESHASH[tm1]=[seg_off+pos1, sz];
}



}
//»

return { ebml, tracks, CUESHASH };


};//»

const render_from_slices = async slices => {//«

const err=s=>{//«
	is_waiting = false;
	cerr(s||"");
};//»

//«
overdiv._dis="";
is_waiting = true;
//»

//Var«

let mod = await capi.getMod("webmparser");
webm_mod = mod;
let {ebml_sz, dump_hex_lines, parse_section, parse_section_flat} = mod;

let SEGTAGS = mod.WebmTags.kids["18538067"];
let SEGKIDS = SEGTAGS.kids;
let CUESTAGS = SEGKIDS["1c53bb6b"];
let CLUSTTAGS = SEGKIDS["1f43b675"];

let cue_times;

let out_slices=[];

let new_clusters = [];
let new_cluster_times = [];
let tot_time = 0;

let { ebml, tracks, CUESHASH } = await webm_prep();

//»

/*
{//«Check/Update the slices arg array to "snap" to close cluster boundaries
cue_times = CUESHASH._keys;
let clust_thresh_ms = SNAP_TO_CLUSTER_THRESH * 1000;
for (let sl of slices) {
	let cur_clust = [];
	for (let i=0; i < 2; i++) {
		let mtm = sl[i];
		let mtm1 = sl[i+1];
		for (let ctm of cue_times) {
			let diff = ctm - mtm;
			let absdiff = Math.abs(diff);
			if (absdiff < clust_thresh_ms) {
				sl[i] = parseInt(ctm);
				cur_clust.push(sl[i]);
				break;
			}
		}
	}
}

}
//»
*/

//«Chunk the render slices by inserting all cluster boundaries
for (let sl of slices){
	let m0 = sl[0];
	let m1 = sl[1];
	let slice =[m0, m1];
	for (let ctm of cue_times) {
		if (ctm <= m0) continue;
		if (ctm >= m1) break;
		slice.push(parseInt(ctm));
	}
	out_slices.push(slice.sort(lowToHigh));
}
//»

jlog(out_slices);

//«Main loop: All chunks not cluster aligned must be re-encoded
for (let sl of out_slices){
	for (let i=0; i < sl.length-1; i++){
		let m0 = sl[i];
		let use_m0 = m0;
		let m1 = sl[i+1];
if (m0 === m1){
cwarn(`Skipping null chunk: ${m0} -> ${m1}`);
continue;
}
		let reencode = false;
		let tmdiff = m1 - m0;
		if (i==0 && !CUESHASH[m0]) {
			let prevtm;
			for (let tm of cue_times){
				if (m0 < tm){
					use_m0 = parseInt(prevtm);
					break;
				}
				prevtm = tm;
			}
			reencode = true;
		}

		let cluster_elem = await node.getValue({start: CUESHASH[use_m0], end: CUESHASH[m1]});
		let cluster_bytes = mod.parse_section_flat(cluster_elem, SEGTAGS)[1];
		let blocks=[];

		{
			let prevtm;
			let block_elems = parse_section(cluster_bytes, CLUSTTAGS);
			block_elems.shift();
			block_elems.shift();
			for (let i=0; i < block_elems.length; i+=2){
				let bl = block_elems[i+1];
				let tm = use_m0 + toint([bl[1],bl[2]]);
				if (reencode) {
//YDUIOPENRT
//Pixel precision: Break here, right???
					if (tm > m1) break;
					if (tm >= m0) {
						if (!blocks.length) blocks.push(prevtm);
						blocks.push(tm);
					}
				}
				else blocks.push(bl);
				prevtm = tm;
			}
			let new_blocks;
			if (reencode) {
				let stamps = blocks;
				let first_time = stamps[0];
				let frames = [];
				for (let tm of stamps) {
					await await_seek(tm/1000);

//In order to do composition/layering, you have to use the canvas/context approach
//					ctx.drawImage(vid, 0, 0, vidw, vidh);
/*createImageBitmap«

createImageBitmap(image)
createImageBitmap(image, options)
createImageBitmap(image, sx, sy, sw, sh)
createImageBitmap(image, sx, sy, sw, sh, options)

image
An image source, which can be any one of the following:

HTMLImageElement
SVGImageElement
HTMLVideoElement
HTMLCanvasElement
Blob
ImageData
ImageBitmap
OffscreenCanvas

sx
The x coordinate of the reference point of the rectangle from which the
ImageBitmap will be extracted.

sy
The y coordinate of the reference point of the rectangle from which the
ImageBitmap will be extracted.

sw
The width of the rectangle from which the ImageBitmap will be extracted. This
value can be negative.

sh
The height of the rectangle from which the ImageBitmap will be extracted. This
value can be negative.

options Optional
An object that sets options for the image's extraction. The available options are:

imageOrientation
Specifies whether the image should be presented as is or flipped vertically.
Either none (default) or flipY.

premultiplyAlpha
Specifies whether the bitmap's color channels should be premultiplied by the
alpha channel. One of none, premultiply, or default (default).

colorSpaceConversion
Specifies whether the image should be decoded using color space conversion.
Either none or default (default). The value default indicates that
implementation-specific behavior is used.

resizeWidth
A long integer that indicates the output width.

resizeHeight
A long integer that indicates the output height.

resizeQuality
Specifies the algorithm to be used for resizing the input to match the output
dimensions. One of pixelated, low (default), medium, or high.

»*/
//					let fr = new VideoFrame(await createImageBitmap(ctx.getImageData(0,0,vidw,vidh)), {timestamp: Math.floor((tm-first_time)*1000)});

//Otherwise, createImageBitmap can directly take the video element as the argument
					let fr = new VideoFrame(await createImageBitmap(vid), {timestamp: Math.floor((tm-first_time)*1000)});
					frames.push(fr);
				}
				new_blocks = await encode(frames);
			}
			else {
				new_blocks = [];
				for (let bl of blocks){
					let tm = m0 + toint([bl[1],bl[2]]);
//YDUIOPENRT
//Pixel precision: Break here, right???
					if (tm > m1) break;
					new_blocks.push(bl);
				}
			}

			let new_cluster_elem = webm_mod.make_cluster_elem_from_blocks(tot_time, new_blocks);
			let new_cluster = webm_mod.parse_section_flat(new_cluster_elem, SEGTAGS)[1];
			new_clusters.push(new_cluster);
			new_cluster_times.push(tot_time);
			tot_time += tmdiff;
		}
	}
}
//»

//«

is_waiting = false;
overdiv._dis="none";

//»

/*«
ebml: Uint8Array 
tracks: Uint8Array 
new_clusters: [Uint8Array...]
new_cluster_times: [Int]
tot_time: Int (output video duration in milliseconds)
»*/

stat(`Output duration: ${(tot_time/1000).toFixed(3)}s `);

return make_webm_file(ebml, tracks, new_clusters, new_cluster_times, tot_time/1000);

};//»
const render_from_script = str => {//«

	let args = get_render_args_from_str(str);
	if (!args) return;

	let slices = get_render_slices(args, cerr);
	if (!slices) return;

	return render_from_slices(slices);

};//»
const try_render = async()=>{//«
	is_waiting = true;
	let nogood = false;
	let rv = await wdg.popin(`Markers for to render it withem?`);
	if (isstr(rv)) {
		cur_output_file = await render_from_script(rv);
if (cur_output_file) {
cwarn("Output file");
log(cur_output_file);
}
else{
cwarn("No output");
}
	}
	is_waiting = false;
};//»

const scroll_elem = (elem, tm, x_off)=>{//«
	let offset = get_timeline_offset(tm);
	if (offset < -10||offset>Main._w+10) elem._dis = "none";
	else{
		elem._dis = "";
		elem._x = x_off + offset;
		elem._padl = use_padl;
	}
};
mark._scroll = ()=>{
	scroll_elem(mark, vid.currentTime, TIME_MARK_X_OFF);
}
//»
const scroll_timeline = (which, opts={}) => {//«

	let x = timeline._xLoc;
	let dir;
	if (which == "LEFT") dir=1;
	else dir = -1;
	let inc;
	if (opts.small){
		inc = dir*GRID_W;
	}
	else{
		inc = TIMELINE_SCROLL_PER * dir * Main._w;
	}
	let gotx = x+inc;
	timeline._xLoc = gotx;
	let tr = get_timeline_rect();
	let mr = Main.getBoundingClientRect();
	if (tr.left > mr.left){
		timeline._xLoc = 0;
	}
	else if (tr.right < mr.right){
		gotx = x + mr.right - tr.right;
		if (gotx > 0) {
			timeline._xLoc = 0;
		}
		else if (tr.right < mr.left){
			timeline._xLoc += (mr.left - tr.right) + 100;
		}
	}
	else{}
	align_timeline();
	let xdiff = x - timeline._xLoc;
	mark._xLoc -= xdiff;
	update_all();

};//»

const scroll_time_marker = (which, opts={}) => {//«
	let dir;
	if (which == "LEFT") dir=-1;
	else dir = 1;
	let ctm = vid.currentTime;
	let tot_time = vid.currentTime + total_scroll;
	let use_time;
	if (!(opts.small||opts.tiny)) {
		use_time = snap_curtime_to_grid(tot_time, which);
	}
	let gotto;
	if (use_time){
		gotto = use_time;
		vid.currentTime = gotto;
	}
	else {
		let inc = dir * mag_sec_per_grid;
		if (opts.small) inc *= 0.1;
		else if (opts.tiny) inc *= 0.01;
		total_scroll+=inc;
		gotto = vid.currentTime + total_scroll;
		tmdiv.innerHTML = get_main_time_str(gotto);
	}
	if (gotto > viddur) {
		gotto = viddur;
	}
	else if (gotto < 0) gotto = 0;
//	let gotto_rnd = Math.round(gotto * 1000);
	let round_to = round_ms(gotto);
	if (dir > 0){
		if (round_to > round_ms(get_visual_time_bounds().end)){
			scroll_timeline("RIGHT");
		}
	}
	else{
//log(gotto , get_visual_time_bounds().start);
		if (round_to < round_ms(get_visual_time_bounds().start)){
			scroll_timeline("LEFT");
		}
	}
	scroll_elem(mark, gotto, TIME_MARK_X_OFF);

}//»

const snap_curtime_to_grid = (tm, which) => {//«
	let dir;
	if (which == "LEFT") dir=-1;
	else dir = 1;
	let use_time = null;
	let rtm = Math.round(tm*1000);
	if (!grid_times.includes(rtm)){
		let use_times = grid_times.slice();
		if (dir==1) {
			for (let t of use_times){
				if (t > rtm){
					use_time = t;
					break;
				}
			}
		}
		else {
			use_times = use_times.reverse();
			for (let t of use_times){
				if (t < rtm){
					use_time = t;
					break;
				}
			}
		}
	}
	return use_time/1000;
}//»

const handle_await_arrow_up=(k)=>{//«
	let arr = k.split("_");
	let which = arr[0];
	if (await_arrow_up === which){
		await_arrow_up = null;
		if (scroll_mode === SCROLL_MODE_MARKER) {
			if (!cur_images.length){
				if (cur_set_images) cur_set_images.cancel();
				cur_set_images = new SetTimelineImages();
			}
			let gotto = vid.currentTime + total_scroll;
			if (gotto > viddur) gotto = viddur;
			else if (gotto < 0) gotto = 0;
			vid.currentTime = gotto;
			tmdiv.innerHTML = get_main_time_str(gotto);
			mark._scroll();
		}
		else if (scroll_mode === SCROLL_MODE_TIMELINE){
			let sttm = get_visual_time_bounds().start;
			vid.currentTime = sttm;
			tmdiv.innerHTML = get_main_time_str(sttm);
			update_all();
		}
		else{
cwarn(`UNKNOWN SCROLL_MODE: ${scroll_mode}`);
		}
	}
};//»

const handle_arrow = (k, opts={}) => {//«
	let arr = k.split("_");
	let which = arr[0];
	let mod = arr[1];
	if (await_arrow_up){
		if (await_arrow_up != which) return;
	}
	else {
		await_arrow_up = which;
		total_scroll = 0;
	}
	if (!mod){
		scroll_mode = SCROLL_MODE_MARKER;
		scroll_time_marker(which);
	}
	else if (mod=="AS"){
		scroll_mode = SCROLL_MODE_MARKER;
		scroll_time_marker(which, {small: true});
	}
	else if (mod=="CAS"){
		scroll_mode = SCROLL_MODE_MARKER;
		scroll_time_marker(which, {tiny: true});
	}
	else if (mod=="S"){
		scroll_mode = SCROLL_MODE_TIMELINE;
		scroll_timeline(which);
	}
	else if (mod=="CS"){
		scroll_mode = SCROLL_MODE_TIMELINE;
		scroll_timeline(which, {small: true});
	}
};//»

const get_ruler_time_str = tm => {//«

	let hrs = Math.floor(tm / 3600);
	let mins;
	let secs;
	let huns;
	if (hrs >= 1){
		mins = tm - hrs * 3600;
	}
	else{
		mins = Math.floor(tm/60);
	}

	if (mins >= 1){
		secs = tm - mins * 60;
	}
	else{
		secs = tm;
	}
	let s='';
	if (hrs) {
		hrs+="";
		s+=hrs.padStart(2,"0");
	}
	if (mins) {
		mins+="";
		if (s) {
//			s+=":";
			s+=`:${mins.padStart(2,"0")}`;
		}
		else s=`${mins}`;
	}
	if (s) s+=":";
	if (!secs) {
		if (s) s+="00";
		else s="0";
	}
	else {
		if (secs<10) {
			if (s) s+="0";
		}
		s+=secs.toFixed(3);
	}
	if (s.match(/\./)) {
		s = s.replace(/0+$/,"");
		s = s.replace(/\.$/,"");
	}
	return s;
//	return s.replace(/\.$/,"");
};//»
const get_main_time_str = (tm, if_init) => {//«
	if (tm <= 0) return "[BEG]";
	if (!if_init && tm>=viddur) return "[END]";
//	else if (tm==)
	let hrs = Math.floor(tm / 3600);
	let mins;
	let secs;
	let huns;
	if (hrs >= 1){
		mins = tm - hrs * 3600;
	}
	else{
		mins = Math.floor(tm/60);
	}

	if (mins >= 1){
		secs = tm - mins * 60;
	}
	else{
		secs = tm;
	}
	let s='';
	if (hrs || min_time_wid > 2) {
		hrs+="";
		s+=hrs.padStart(2,"0");
	}
	if (mins || min_time_wid > 1) {
		if (s) s+=":";
		mins+="";
		s+=mins.padStart(2,"0");
	}
	if (s) s+=":";
	if (!secs) s+="00";
	else {
		if (secs<10) s+="0";
//		s+=secs.toFixed(3);
		s+=secs.toFixed(2);
	}
	return s;
};//»

const fit_timeline_to_window=()=>{//«

/*
Need to find a mag_pix_per_sec that will let the full timeline have a "best fit"
in the window.

But this means that we are outside of the cur_mag_level flow....
*/
let want_w = Main._w - GRID_W;
let vizdur = viddur;
let use_mag_pix_per_sec = want_w / vizdur;
if (use_mag_pix_per_sec == mag_pix_per_sec){
	stat("The timeline is already fit!");
	return;
}
let arr = MAG_PIX_PER_SEC_ARR;
let use_cur_mag_level=null;
for (let i=0; i < arr.length; i++){
	if (use_mag_pix_per_sec < arr[i]){
		use_cur_mag_level = (i+i-1)/2;
		break;
	}
}
if (use_cur_mag_level===null) return;

cur_mag_level = use_cur_mag_level;
mag_pix_per_sec = use_mag_pix_per_sec;
timeline_sig_figs = (Math.floor(mag_pix_per_sec)+"").length-2;
if (timeline_sig_figs < 0) timeline_sig_figs = 0;
//log(timeline_sig_figs);
mag_sec_per_grid = GRID_W/mag_pix_per_sec;
timeline._xLoc = 0;
timeline._width = viddur * mag_pix_per_sec;
update_all();

};//»
const update_all = () => {//«
	tmdiv.innerHTML = get_main_time_str(vid.currentTime);
	draw_ruler();
	mark._scroll();
	scroll_marks();
	scroll_cluster_marks();
};//»
const center_to_time = tm => {//«
//	tm = mag_sec_per_grid * Math.floor(tm/mag_sec_per_grid);
	let bounds = get_visual_time_bounds();
	let ctr_time = (bounds.end + bounds.start)/2;
	let off_secs = tm - ctr_time;
	off_secs -= (off_secs % mag_sec_per_grid);
	let pix_off = mag_pix_per_sec * off_secs;
	timeline._xLoc-=pix_off;
	if (timeline._xLoc > 0) timeline._xLoc = 0;
	update_all();
};//»
const seek_to_time = async(tm)=>{//«
	await await_seek(tm);
	let ctr_time;
	if (tm == viddur){
		let start_x = GRID_W_HALF;
		let end_x = Main._w - GRID_W_HALF;
		let w = end_x-start_x;
		let start_tm = viddur - w/mag_pix_per_sec;
		ctr_time = (viddur + start_tm) / 2;
	}
	else ctr_time = vid.currentTime;
	center_to_time(ctr_time);
	return true;
}//»
const seek_to_end=async()=>{//«
	timeline._xLoc = Main._w - timeline._width - GRID_W;
	align_timeline();
	await seek_to_time(viddur);
	draw_ruler({addLast:true});
};//»
const center_to_curtime = () => {//«
	center_to_time(vid.currentTime);
};//»
const get_timeline_offset = tm => {//«
	let bounds = get_visual_time_bounds();
	let tmoff = tm - bounds.start;
	let peroff = tmoff / viddur;
	return peroff * timeline._width;
};//»
const check_scroll = elm => {//«
	let r = elm.getBoundingClientRect();
	let x = (r.left + r.right)/2;
	let y = (r.top + r.bottom)/2;
	if (!(x&&y)) return;
	let got = document.elementFromPoint(x,y); 
	if (got){
		return;
	}
	let mr = Main.getBoundingClientRect();
	let main_middle = (mr.left+mr.right)/2;
	let diff_x = x - main_middle;
	let tx = timeline._xLoc;
	let gotx = tx - diff_x;
	if (gotx > 0) gotx = 0;
	timeline._xLoc = gotx;
	update_all();
};
mark._maybeScroll=()=>{
	check_scroll(mark);
};

//»
const get_timeline_rect = ()=>{//«
	return {
		left: timeline._xLoc,
		right: timeline._xLoc+timeline._width,
		width: timeline._width
	};
};//»
const get_visual_time_bounds=()=>{//«

let rr = get_timeline_rect();
//log("RR", rr);
let mw = Main._w;

let left_edge = 0 > rr.left ? 0 : rr.left;
let right_edge = mw < rr.right ? mw : rr.right;

let vw = right_edge - left_edge;

let viz_duration = vw/mag_pix_per_sec;

let viz_start;
let viz_end;

let left_diff = rr.left;
if (left_diff > 0){
	let diff = rr.left - mw;
//log(1, diff);
	if (rr.left > mw){
		return {invalid: true, type: 1};
	}
	viz_start = 0;
}
else {
	if (rr.right < 0){
		return {invalid: true, type: 2, diff: -rr.right};
	}
	viz_start = -left_diff/mag_pix_per_sec;
}
viz_end = viz_start + viz_duration;

return {
	start: viz_start,
	end: viz_end,
	duration: viz_duration,
	startDiff: left_diff,
	width: viz_duration * mag_pix_per_sec
};

};//»

const scroll_to_time = (tm, which)=>{//«
	vid.currentTime = tm;
	tmdiv.innerHTML = get_main_time_str(tm);
	mark._scroll();
};//»

const SetTimelineImages = function(){//«

const seek = (tm)=>{//«
	return new Promise((Y,N)=>{
		v.onseeked = Y;
		v.currentTime = tm;
//		tmdiv.innerHTML = get_main_time_str(tm);
	});
};//»

//if (grid_marks && grid_marks.length && grid_marks[0]._img){
//	stat("Already have images! (use 'i' to toggle them)");
//	return;
//}

let cancelled = false;
this.cancel = ()=>{
	cancelled = true;
};

cur_images = [];
let cache_miss = false;

let aspect = vid.videoWidth/vid.videoHeight;
let w = VID_IMG_H * aspect;

for (let m of grid_marks){//«
	if (cancelled) return;
	let tm = m._time;
	let im = IMG_CACHE[tm];
	if (!im){
		cache_miss = true;
		continue;
	}
	m._img = im;
	let d = mkdv();
	d.onclick=()=>{
		scroll_to_time(tm, 1);

	};
	d._pos = "absolute";
	d._over="hidden";
	d._w = w;
	d._h = VID_IMG_H;
	d._op = VID_IMG_OP;
//	d._y=-VID_IMG_H;
	d._add(im);
//	timeline._add(d);
	img_div._add(d)
//	d._x = m._x - w/2;
	d._x = use_padl + m._x - w/2;
	d._z = 10;
	d._bor = "1px solid #000";
	cur_images.push(d);
}//»

if (!cache_miss) return;

let v = make('video');
let can = mk('canvas');
let cx = can.getContext('2d',{willReadFrequently: true});

v.onloadedmetadata=async()=>{//«
	for (let m of grid_marks){
		if (cancelled) return;
		let tm = m._time;
//log(tm);
		await seek(tm);
		if (cancelled) return;
		if (IMG_CACHE[tm]) continue;
		let im = new Image;
		IMG_CACHE[tm]=im;
		cx.drawImage(v, 0, 0, vidw, vidh, 0, 0, w, VID_IMG_H);
		im.src = can.toDataURL();
		m._img = im;
		let d = mkdv();
		d.onclick=()=>{
			scroll_to_time(tm, 2);
		};
		d._over="hidden";
		d._pos = "absolute";
		d._w = w;
		d._h = VID_IMG_H;
		d._op = VID_IMG_OP;
//		d._y=-VID_IMG_H;
		d._add(im);
//		timeline._add(d);
		img_div._add(d);
		if (tm==viddur){
//			d._x = m._x;
			d._x = use_padl + m._x;
		}
		else{
//			d._x = m._x - w/2;
			d._x = use_padl + m._x - w/2;
		}
		d._z = 10;
		d._bor = "1px solid #000";
		cur_images.push(d);
	}
};//»

v.src = url;


};//»

const draw_ruler = (opts={}) => {//«
ruler.innerHTML="";

if (cur_set_images) {
	cur_set_images.cancel();
}

for (let im of cur_images) im._del();

let {invalid, startDiff: left_diff, start: viz_start, end: viz_end, duration: viz_duration, width: viz_width} = get_visual_time_bounds();
if (invalid) {
cwarn("NOT UPDATING RULER!!!!");
reset_timeline();
	return;
}

//let mag_sec_per_grid = GRID_W/mag_pix_per_sec;
let mag_sec = GRID_W/mag_pix_per_sec;
//log(mag_sec);

let num_grids = Math.floor(viz_duration / mag_sec);
let diff_w = (Main._w-GRID_W) - timeline._width;
if (viz_start == 0 || diff_w > 0) {
//	let use_x = viz_start ?  : 0;
	let g = mkdv();
	g._pos = "absolute";
	g._w=5;
	g._bgcol="#aaa";
	g._h="100%";
	g._x = -(mag_pix_per_sec * viz_start);
	g._y = 0;
	g._z = 1;
	ruler._add(g);
}
grid_times = [];
grid_time_elems = [];
grid_marks = [];
cur_images = [];
//images_showing = true;
let last_x;
let first_x;
for (let i=-1; i < num_grids; i++){
	let g = mkdv();
	grid_marks.push(g);
	g._pos = "absolute";
	g._w=3;
	g._h="100%";
	g._x = ((i + 1) * GRID_W)-1;
	g._y = 0;
	g._z = 1;
	let t = mkdv();
	t._pos = "absolute";
	t._z = 1;
	let tm = viz_start + ((i+1) * mag_sec);
	grid_times.push(Math.round(tm*1000));
	g._time = tm;
	t.innerHTML=get_ruler_time_str(tm);
	g._add(t);
	t._bgcol="#000";
	ruler._add(g);
//log(t.clientWidth);
	t._x = -t.clientWidth/2;
	t._fs = 21;
	t._y = TIMELINE_H/2 - 9.5;
	g._bgcol="#555";
	if (i==-1||i==num_grids-1) {
		if (i==-1){
			let lft = t.getBoundingClientRect().left;
			let diff = lft - Main.getBoundingClientRect().left;
			first_x = lft;
			if (diff < 0) {
				t._padl = -diff;
				first_x -= diff;
			}
		}
		else{
			let r = t.getBoundingClientRect();
			let diff = t.getBoundingClientRect().right - Main.getBoundingClientRect().right;
			if (diff > 0) {
//				t._x -= diff;
			}
			last_x = t.getBoundingClientRect().right;
		}
	}
	else {
		grid_time_elems.push(t);
	}
}
if (Math.abs(viz_end-viddur) < 0.01){
	let g = mkdv();

	g._pos = "absolute";
	g._w=5;
	g._bgcol="#aaa";
	g._h="100%";
	g._x = ((viddur-viz_start) * mag_pix_per_sec);
//	last_x = g._x;
	g._y = 0;
	g._z = 1;
	g._time = viddur;
	if (opts.addLast) {
		grid_time_elems.push({});
		grid_marks.push(g);
	}
	ruler._add(g);
	last_x = g.getBoundingClientRect().right;
}
use_padl = (Main._w - (last_x - first_x))/2;
timeline._padl = use_padl;
//log(timeline);
//log(img_div);
img_div._padl = use_padl;

if (images_showing && !await_arrow_up) {
	cur_set_images = new SetTimelineImages();
}

};//»
const align_timeline = ()=>{//«
	let {start} = get_visual_time_bounds();
	let secs_per_grid = GRID_W/mag_pix_per_sec;
	let num_grids = Math.round(start/secs_per_grid);
	let secs_to_start = secs_per_grid * num_grids;
	let pix_to_start = mag_pix_per_sec * secs_to_start;
	timeline._xLoc = -pix_to_start;
//	update_all();
};//»

const reset_timeline = ()=>{//«

cur_mag_level = DEF_MAG_LEVEL;
mag_pix_per_sec = MAG_PIX_PER_SEC_ARR[cur_mag_level];
mag_sec_per_grid = GRID_W/mag_pix_per_sec;
timeline_sig_figs = (mag_pix_per_sec+"").length-2;
if (timeline_sig_figs < 0) timeline_sig_figs = 0;
timeline._width = viddur * PIX_PER_SEC;

timeline._xLoc = 0;

update_all();


};//»
const flush_right_edge=()=>{//«
//Make sure the timeline location flushes with the right edge, when the visible
//duration is long enough
	let {duration, width} = get_visual_time_bounds();

	if (duration < viddur && width < Main._w - GRID_W){
		let x_adj = (Main._w - GRID_W) - width;
		timeline._xLoc += x_adj;
		return true;
	}
	return false;
}//»
const check_timeline_right_edge_for_underflow_and_center_to_time=(tm)=>{//«

/*

When demagnifying, the timeline width gets smaller, but
its (x) coordinate stays the same, which means that it has
a tendency to "underflow" the viewport's left edge.

The hack below works somewhat, but there are cases where
the timeline's width turns out to be smaller than it "should" be,
given how wide it would be at the given magnification level.

*/

	let tw = timeline._width;
	let tx = timeline._xLoc;
	let right_loc = tx + tw;
	if (right_loc < 0) {
		timeline._xLoc -= right_loc-(Main._w-GRID_W_HALF);
	}
	let view_w = Main._w-GRID_W;
	let bnds = get_visual_time_bounds();
	let {start, end, width, duration} = bnds;
	if (tw > view_w){
		let diff_w = view_w - width;
		if (diff_w > 0){
			timeline._xLoc += diff_w;
		}
	}
	flush_right_edge();
	center_to_time(tm);

//log(get_visual_time_bounds());

}//»

const magnify = () => {//«
cur_mag_level = Math.floor(cur_mag_level);
if (cur_mag_level+1 == MAX_MAG_ITER){
return;
}
let bnds = get_visual_time_bounds();
cur_mag_level++;
mag_pix_per_sec = MAG_PIX_PER_SEC_ARR[cur_mag_level];
mag_sec_per_grid = GRID_W/mag_pix_per_sec;
timeline_sig_figs = (mag_pix_per_sec+"").length-2;
if (timeline_sig_figs < 0) timeline_sig_figs = 0;
timeline._width = viddur * mag_pix_per_sec;

center_to_curtime();
if (flush_right_edge()){update_all();}
//center_to_time((bnds.start+bnds.end)/2);
//update_all();
//seek_to_timeline_start();

};//»
const demagnify=()=>{//«

cur_mag_level = Math.ceil(cur_mag_level);
if (cur_mag_level-1 < 0){
	return;
}
cur_mag_level--;
mag_pix_per_sec = MAG_PIX_PER_SEC_ARR[cur_mag_level];
mag_sec_per_grid = GRID_W/mag_pix_per_sec;
let w = timeline._width;
timeline._width = viddur * mag_pix_per_sec;
timeline_sig_figs = (mag_pix_per_sec+"").length-2;
if (timeline_sig_figs < 0) timeline_sig_figs = 0;
//center_to_curtime();
check_timeline_right_edge_for_underflow_and_center_to_time(vid.currentTime);

};//»

const make_webm_file =(ebml, tracks, clusters, cluster_times, viddur) => {//«

//	let cl_times = cluster_times.slice();
//	cl_times.unshift(0);
	let cluster_dat = [];
	let cluster_sizes = [];
	let all_clusters_length = 0;
	for (let cl of clusters) {
		let newclust = webm_mod.make_ebml_elem([0x1f, 0x43, 0xb6, 0x75], cl);
		all_clusters_length += newclust.length;
		cluster_sizes.push(newclust.length);
		cluster_dat.push(newclust);
	}
	let all_clusters = new Uint8Array(all_clusters_length);
	let curbyte=0;
	for (let clust of cluster_dat){
		all_clusters.set(clust, curbyte);
		curbyte+=clust.length;
	}

	let f = new webm_mod.WebmFile();
	f.duration = viddur*1000;
	f.timeCodeScale = 1_000_000;
	f.muxingApp = "Zgrancheed";
	f.writingApp = "Sofflering";
	f.tracks = tracks;
	f.clusters = all_clusters;
	f.clusterSizes = cluster_sizes;
	f.clusterTimes = cluster_times;
	f.ebml = ebml;
	f.makeInfo();
	f.makeSeekHead();
	f.makeCues();
	f.makeSegment();
	f.makeFile();
	return f.file;

//	fs.writeFile("/home/me/Desktop/OOBOOBWOOB.webm", f.file);

};//»

const scroll_marks=()=>{//«
	for (let m of marks){
		scroll_elem(m, m._time, MARK_X_OFF);
	}
};//»
const seek_to_timeline_start=async()=>{//«
	await await_seek(get_visual_time_bounds().start);
};//»
const try_seek_mark=async()=>{//«
	is_waiting = true;
	let rv = await wdg.popkey(`Seek to marker?`, {alpha: true});
	if (rv)	{
		rv = String.fromCharCode(rv);
		let nogo=false;
		for (let mrk of marks){
			if (mrk._id == rv){
				mrk._on();
				break;
			}
		}
	}
	is_waiting = false;
};//»
const try_create_mark=async()=>{//«
	is_waiting = true;
	let rv = await wdg.popkey(`New marker id?`, {alpha: true});
//log(rv);
	if (rv)	{
		rv = String.fromCharCode(rv);
		let nogo=false;
		for (let mrk of marks){
			if (mrk._id == rv){
				nogo = true;
				stat(`Another mark with id '${rv}' exists!`);
				break;
			}
		}
		if (!nogo){
			create_mark(vid.currentTime, rv);
		}
	}
	is_waiting = false;
};//»
const create_mark=(usetime, id, if_auto)=>{//«
	let tm = usetime || vid.currentTime;
	for (let m of marks){
		let diff = Math.abs(m._time - tm);
		if (diff < MARK_DIFF_THRESH){
			stat(`Another mark is too close (${diff} < ${MARK_DIFF_THRESH})`);
			return;
		}
	}
	let mrk = mkdv();
	mrk._pos="absolute";
//	mrk._tcol="#000";
	mrk.innerHTML='v';
	mrk._fs = MARK_SZ;
	mrk._y = MARK_Y;
//	mrk._fw=900;
	mrk.setAttribute("name","marker");
	mrk._z = 1;
	mrk._time = tm;
	mrk._id = id;
//log(mrk);
	mrk._off = ()=>{
		mrk._tcol="#ccc";
		cur_mark = null;
	};
	mrk._on = async()=>{
		mrk._tcol="#ff0";
		cur_mark = mrk;
		await seek_to_time(mrk._time);
		center_to_curtime();
		scroll_marks();
		scroll_cluster_marks();
	};
	mrk._delIt = ()=>{
		remove_elem(mrk, marks);
		mrk._del();
		if (marks.length) marks[0]._on();
	};
	if (cur_mark) cur_mark._off();
	mrk._maybeScroll = ()=>{
		check_scroll(mrk);
	}
if (!if_auto) {
	mrk._on();
}
	timeline._add(mrk);
	marks.push(mrk);
	marks = marks.sort((a,b)=>{
		if (a._time < b._time) return -1;
		return 1;
	});
	scroll_marks();
	scroll_cluster_marks();
};//»

const scroll_cluster_marks=()=>{//«
	if (cluster_marks_div._dis=="none") return;
	for (let i=0; i < cluster_times.length; i++){
		scroll_elem(cluster_time_marks[i], cluster_times[i], MARK_X_OFF);
	}
};//»
const add_cluster_time_marks=()=>{//«
	cluster_time_marks = [];
	for (let tm of cluster_times){
		let d = mkdv();
		d._pos="absolute";
		d._tcol="#fff";
		d.innerHTML="*";
		d._b=-10;
		d._z=10;
		cluster_marks_div._add(d);
		cluster_time_marks.push(d);
	}
//log(cluster_marks_div);
//log(cluster_times);
};//»
const find_nearest_cluster=(tm, if_next)=>{//«
	let lowdiff = Infinity;
	let good = null;
	let times = cluster_times.slice();
	times.unshift(0);

	if (if_next===false) {
		times = times.reverse();
//		if_next = true;
	}
	for (let t of times){
		let diff = tm - t;
		if (if_next==true){
			if (diff < 0) return t;
		}
		else if (if_next==false){
			if (diff > 0) return t;
		}
		else if (Math.abs(diff) < lowdiff) {
			lowdiff = diff;
			good = t;
		}
	}
	return good;
};//»
const get_clusters=async()=>{//«

if (cluster_times.length) return;

let { ebml, tracks, CUESHASH } = await webm_prep();

if (!CUESHASH){
cerr("NO CUES!");
return;
}
let keys = CUESHASH._keys;
for (let k of keys){
	cluster_times.push(parseInt(k)/1000);
}
cluster_times.shift();
add_cluster_time_marks();

scroll_cluster_marks();

log(cluster_times);

};//»
const encode = frames =>{//«
return new Promise((Y,N)=>{

let blocks = [];
let gotfirst = false;
let last_time = frames[frames.length-1].timestamp;

let encoder = new VideoEncoder({//«

	output:e=>{//«
		let a = new Uint8Array(e.byteLength);
		let tmstamp = e.timestamp;
		let tm = Math.round(tmstamp/10**3);
		let tmarr = new Uint8Array((new Uint16Array([tm])).buffer);
		e.copyTo(a);
		let b = new Uint8Array(a.length+4);
		b[0] = 129;
		b[1] = tmarr[1];
		b[2] = tmarr[0];
		if (!gotfirst) {
			b[3]=128;
			gotfirst = true;
		}
		b.set(a, 4);
		blocks.push(b);
		if (tmstamp === last_time){
			Y(blocks);
			encoder.flush();
		}
	},//»
	error:e=>{
cerr(e);
	}
});//»

encoder.configure({
	codec:"vp8",
	width: vid.videoWidth,
	height: vid.videoHeight,
	bitrate: 1_000_000,
	framerate: 30
});
for (let fr of frames){
	encoder.encode(fr);
	fr.close();
}

});
};//»

//»
//Listeners«

ruler.draggable = true;
ruler.ondragstart=e=>{//«
	e.preventDefault();
	if (!ALLOW_MOUSE_SCROLLING) {
		stat("Mouse scrolling is currently disabled ( Ctrl + Alt + Shift + m to enable)");
		return;
	}
	Main.style.cursor="move";
	RDX = e.clientX;
	TLX = timeline._xLoc;
};//»
let mousemove=e=>{//«
	if (RDX==null) return;
	let x = e.clientX;
	let diff = e.clientX - RDX;
	timeline._xLoc = TLX + diff;
	update_all();

}//»
const clear_drag=()=>{RDX = null;Main.style.cursor="";};
Main.addEventListener('mousemove',mousemove);
Main.addEventListener('mouseup',clear_drag);
Main.addEventListener('mouseleave',clear_drag);

timeline.onmousedown=(e)=>{//«
	let dur = vid.duration;
	if (!dur) return;
	let r = get_timeline_rect();
	let x = e.clientX - Main.getBoundingClientRect().left - use_padl;
	let per = (x - r.left)/r.width;
	if (!vid.paused) vid.pause();
	let tm = per*dur;
	if (!e.ctrlKey){
		scroll_to_time(tm, 3);
		return;
	}	
	if (!cluster_times.length){
		stat("There are no cluster times to snap to");
		return;
	}
	let usetm;
	let lowdiff = Infinity;
	for (let t of cluster_times){
		let d = Math.abs(tm - t);
		if (d < lowdiff){
			usetm = t;
			lowdiff = d;
		}
	}
	tm = usetm;
	scroll_to_time(tm);
	center_to_time(tm);
//	update_all();
};//»

vid.onloadedmetadata=video_init;

const timeupdate = ()=>{//«
	let ctime = vid.currentTime;
//	mark._scroll();
	tmdiv.innerHTML = get_main_time_str(ctime);
	mark._scroll();
	if (ctime > get_visual_time_bounds().end) {
		handle_arrow("RIGHT_S");
	}
};//»

//»
//Obj/CB«

this.is_editing = true;
this.onescape=()=>{//«
	return false;
};//»
this.onappinit=async arg=>{//«
	if (arg.reInit) arg = arg.reInit;
	url = arg.url;
	node = arg.node;
	vid.src = arg.url;
};//»
this.onkill=()=>{//«
	this.reInit = {url, node};
	if (!vid.paused) vid.pause();
	vid._del();
	vid.ontimeupdate = null;
};//»
this.onresize=()=>{//«
//	viddiv._h = Main._h - TIMELINE_H;
//	viddiv._h = Main._h - TIMELINE_H - VID_IMG_H;
	viddiv._h = Main._h - TIMELINE_H - VID_IMG_H - VID_IMG_PAD;
	let dur = vid.duration;
	update_all();
};//»
this.onkeydown=(e,k)=>{//«
	if (is_waiting) return;
	if (k.match(/^TAB_/)){
		e.preventDefault();
		handle_tab(k);
	}
	if (k=="=_S"){
//		do_magnify(2);
		magnify();
	}
	else if (k=="-_"){
//		do_magnify(0.5);
		demagnify();
	}
//	else if (k=="ENTER_"){
//		set_timeline_images();
//	}
	else if (k=="r_"){
//		reset_timeline();
		try_render();
	}
	else if (k=="=_"){
		reset_timeline();
	}
	else if (k=="c_S"){
		seek_to_time(viddur/2);
	}
	else if (k=="c_CAS"){
		if (cluster_times.length) return stat("Have cluster times");
		get_clusters();
	}
	else if (k=="c_"){
		let {start, end} = get_visual_time_bounds();
		seek_to_time((start+end)/2);
	}
	else if (k=="m_S"){
		if (cluster_marks_div._dis=="none") {
			cluster_marks_div._dis="";
			scroll_cluster_marks();
		}
		else cluster_marks_div._dis="none";
	}
	else if (k=="s_C"){
		try_save();
	}
	else if (k=="SPACE_"){
		e.preventDefault();
		if (vid.paused) {
			vid.play();
			vid.ontimeupdate = timeupdate;
		}
		else {
			vid.pause();
			vid.ontimeupdate = null;
		}
	}
	else if (k=="m_"){
		try_create_mark();
	}
	else if (k=="`_"){
		try_seek_mark();
	}
	else if (k=="f_"){
		fit_timeline_to_window();
	}
	else if (k=="t_"){
		center_to_curtime();
	}
	else if (k=="t_S"){
		if (mark._dis=="none") mark._dis="";
		else mark._dis="none";
	}
	else if (k=="z_"){
cwarn("Cluster times");
log(cluster_times);
	}
	else if (k.match(/^(LEFT|RIGHT)_/)){
		handle_arrow(k);
	}
	else if (k=="DEL_"){
		try_delete();
	}
	else if (k=="0_"||k=="a_C"){
		seek_to_time(0);
	}
	else if (k=="4_S"||k=="e_C"){
		seek_to_end();
	}
	else if (k=="m_CAS"){
//		magnify_to_center = !magnify_to_center;
//		stat(`Magnifying to center: ${magnify_to_center}`);
ALLOW_MOUSE_SCROLLING = !ALLOW_MOUSE_SCROLLING;
stat(`Mouse scrolling: ${ALLOW_MOUSE_SCROLLING}`);

	}
	else if (k=="i_"){
//		toggle_images();
	}
	else if (k=="._"||k=="/_"){
//		toggle_images();
		dew_yoimpst();
	}
};//»
this.onkeyup=(e,k)=>{//«

if (await_arrow_up){

handle_await_arrow_up(k);

}

};//»

//»

}//»















//«
/*
const do_recluster = async()=>{//«
log("recluster");
overdiv._dis="";
let clusts = [];
let good = [];
for (let cl of clusters){
	clusts.push([]);
}
let cltimes = cluster_times.slice();
cltimes.unshift(0);
cltimes.push(viddur);

for (let i=0; i < marks.length; i++){
	let m = marks[i];
	let tm = m._time;
	for (let j=0; j < cltimes.length-1; j++){
		let cltm = cltimes[j];
		let nextcltm = cltimes[j+1];
		if (tm === cltm||tm==nextcltm){}
		else if (tm > cltm && tm < nextcltm){
			let clarr = clusts[j];
			clarr.push(m);
		}
	}
}

for (let i=0; i < clusts.length; i++){
	let cli = clusts[i];
	if (!cli.length) {
		clusts[i] = clusters[i];
		continue;
	}
	for (let j=0; j < cli.length; j++){
		let mrk0 = cli[j];
		let mrk1 = cli[j+1];
		if (!mrk0) break;
		let slice = [mrk0._time*1000];
		if (mrk1) slice.push(mrk1._time*1000);
		else slice.push(cltimes[i+1]*1000);
		mrk0._slice = slice;
	}
	for (let j=0; j < cli.length; j++){
		cli[j] = cli[j]._slice;
	}

	let next_cluster_time = cltimes[i+1];
	let blocks = get_blocks_from_cluster(clusters[i]);
	let first_mark_stamp = cli[0][0];
	let first_slice = [];
	let cluster_stamp = toint(blocks.shift());
	first_slice._stamp = cluster_stamp;
	let cur_stamp;
	let cur_block_times = [];
	let block_times = [];
	for (let j=0; j < blocks.length; j++){//«
		let block = blocks[j];
		let block_stamp = cluster_stamp + toint([block[1],block[2]]);
		block_times[j] = block_stamp;
		if (block_stamp < first_mark_stamp){
			first_slice.push(block)
		}
	}//»

let cur_times;
for (let i=0; i < cli.length; i++){
	let from = cli[i][0];
	let to = cli[i][1];
//log(`${from} -> ${to}`);
	cur_times = [];
	for (let tm of block_times){
		if (tm >= from){
			if (tm >= to){
				cli[i] = cur_times;
				cur_times = [];
				break;
			}
			cur_times.push(tm);
		}
	}
}
if (cur_times.length){
	cli[cli.length-1] = cur_times;
}
cli.unshift(first_slice);

}

const add_cluster_time=(cl)=>{
	let rv = webm_mod.ebml_sz(cl, 1);
	let tmval = toint(cl.slice(rv[1], rv[1]+rv[0]))/1000;
	new_cluster_times.push(tmval);
};
let new_clusters = [];
let new_cluster_times = [];
for (let i=0; i < clusts.length; i++){
	let cl = clusts[i];
	if (cl instanceof Uint8Array) {
		add_cluster_time(cl);
		new_clusters.push(cl);
log(new_clusters);
		continue;
	}
//log("STAMP???",cl[0]._stamp);
	let first_cluster_elem = webm_mod.make_cluster_elem_from_blocks(cl[0]._stamp, cl[0]);
	let first_cluster = webm_mod.parse_section_flat(first_cluster_elem,SEG_KIDS)[1];
//	cl[0] = first_cluster;
	new_clusters.push(first_cluster);
log(new_clusters);
	add_cluster_time(first_cluster);
	for (let j=1; j < cl.length; j++){
		let stamps = cl[j];
		let first_time = stamps[0];
		let frames = [];
		for (let tm of stamps) {
			await await_seek(tm/1000);
			ctx.drawImage(vid, 0, 0, vidw, vidh);
			let fr = new VideoFrame(await createImageBitmap(ctx.getImageData(0,0,vidw,vidh)), {timestamp: Math.floor((tm-first_time)*1000)});
			frames.push(fr);
		}
		let new_blocks = await encode(frames);
		let new_cluster_elem = webm_mod.make_cluster_elem_from_blocks(first_time, new_blocks);
		let new_cluster = webm_mod.parse_section_flat(new_cluster_elem,SEG_KIDS)[1];
//		cl[j] = new_cluster;
		new_clusters.push(new_cluster);
log(new_clusters);
		add_cluster_time(new_cluster);

	}
}
clusters = new_clusters;
cluster_times = new_cluster_times;
cluster_times.shift();
for (let mrk of cluster_time_marks) mrk._del();
add_cluster_time_marks();

overdiv._dis="none";
};//»
//«
let erm_dermming_yoimpst = false;

const dew_yoimpst=async()=>{//«
const err=s=>{
erm_dermming_yoimpst = false;
wdg.poperr(s);
};
let args = get_render_args_from_str("ab cd");
if (!args) return;
let slices = get_render_slices(args, cerr);
if (!slices) return;



if (erm_dermming_yoimpst) return;
erm_dermming_yoimpst = true;
let mod = await capi.getMod("webmparser");
webm_mod = mod;
let {ebml_sz, dump_hex_lines, parse_section, parse_section_flat} = mod;

let segkids = mod.WebmTags.kids["18538067"]

let b = await node.getValue({start: 0, end: 5000});
let rv = ebml_sz(b, 4);
let c = rv[0]+rv[1];
let ebml = b.slice(0, c);

let seg_off;
if (!(b[c]==0x18&&b[c+1]==0x53&&b[c+2]==0x80&&b[c+3]==0x67)) return err("Segment ID not found");
c+=4;
rv = ebml_sz(b, c);
seg_off = c = rv[1];
if (!(b[c]==0x11&&b[c+1]==0x4d&&b[c+2]==0x9b&&b[c+3]==0x74)) return err("Seekhead ID not found at expected position");
c+=4;
rv = ebml_sz(b, c);
c = rv[1];
let skhd_bytes = b.slice(c,c+rv[0]);
let skhd = parse_section(skhd_bytes, segkids.kids["114d9b74"]);
let cues_pos;
let tracks_pos;
for (let i=0; i < skhd.length; i+=2){
	let ent = skhd[i+1];
	let id = ent[1];
	if (id[0]==0x1c && id[1]==0x53 && id[2]==0xbb && id[3]==0x6b){
		cues_pos = seg_off + toint(ent[3]);
	}
	if (id[0]==0x16 && id[1]==0x54 && id[2]==0xae && id[3]==0x6b){
		tracks_pos = seg_off + toint(ent[3]);
	}

}
if (!(cues_pos||tracks_pos)) return err("Cues/Tracks not found");

let tracks_bytes = await node.getValue({start: tracks_pos, end: tracks_pos+20});
rv = ebml_sz(tracks_bytes, 4);
let tracks_size = rv[0];
c = tracks_pos +rv [1];
let tracks = await node.getValue({start: tracks_pos, end: c+tracks_size});


let cues_bytes = await node.getValue({start: cues_pos, end: cues_pos+20});
rv = ebml_sz(cues_bytes, 4);
let cues_size = rv[0];
c = cues_pos +rv[1];
cues_bytes = await node.getValue({start: c, end: c+cues_size});
let cues = parse_section(cues_bytes, segkids.kids["1c53bb6b"]);

let CUES={};

for (let i=0; i < cues.length; i+=2){
	let cue1 = cues[i+1];
	let tm1 = toint(cue1[1], true);
	let pos1 = toint(cue1[3][3], true);

	let sz;
	let cue2 = cues[i+3];
	if (cue2) {
		let tm2 = toint(cue2[1], true);
		let pos2 = toint(cue2[3][3], true);
		sz = pos2 - pos1;
	}
	else if (pos1 < cues_pos){
		sz = cues_pos - (pos1+seg_off);
	}

	CUES[tm1]=[seg_off+pos1, sz];
}

//log(CUES);
//return;


let cue_times = CUES._keys;
let clust_thresh_ms = SNAP_TO_CLUSTER_THRESH * 1000;
for (let sl of slices) {
	let cur_clust = [];
	for (let i=0; i < 2; i++) {
		let mtm = sl[i];
		let mtm1 = sl[i+1];
		for (let ctm of cue_times) {
			let diff = ctm - mtm;
			let absdiff = Math.abs(diff);
			if (absdiff < clust_thresh_ms) {
				sl[i] = parseInt(ctm);
				cur_clust.push(sl[i]);
				break;
			}
		}
	}
}
let out_slices=[];
for (let sl of slices){
	let m0 = sl[0];
	let m1 = sl[1];
	let slice =[m0, m1];
	for (let ctm of cue_times) {
		if (ctm <= m0) continue;
		if (ctm >= m1) break;
		slice.push(parseInt(ctm));
	}
	out_slices.push(slice.sort(lowToHigh));
}

//cwarn("RENDER THIS???");
//jlog(slices);
//jlog(out_slices);
//return;

let new_clusters = [];
let new_cluster_times = [];
let tot_time = 0;
for (let sl of out_slices){
	for (let i=0; i < sl.length-1; i++){
		let m0 = sl[i];
		let use_m0 = m0;
		let m1 = sl[i+1];
		let reencode = false;
		let tmdiff = m1 - m0;
//log(`${m0} -> ${m1}`);
		if (i==0 && !CUES[m0]) {
			let prevtm;
			for (let tm of cue_times){
				if (m0 < tm){
					use_m0 = parseInt(prevtm);
					break;
				}
				prevtm = tm;
			}
			reencode = true;
		}

		let cluster_elem = await node.getValue({start: CUES[use_m0], end: CUES[m1]});
		let cluster_bytes = mod.parse_section_flat(cluster_elem,segkids)[1];
//		let cluster = mod.parse_section(cluster_elem,segkids);
		let blocks=[];
//		if (!reencode){
//log(cluster);
//			new_clusters.push(cluster_bytes);
//			new_cluster_times.push(tot_time);
//			new_cluster_times.push(tmdiff);
//			tot_time += tmdiff;
//			continue;
//		}

//		if(false){
		{
			let prevtm;
			let block_elems = parse_section(cluster_bytes, segkids.kids["1f43b675"]);
			block_elems.shift();
			block_elems.shift();
			for (let i=0; i < block_elems.length; i+=2){
				let bl = block_elems[i+1];
				let tm = use_m0 + toint([bl[1],bl[2]]);
				if (reencode) {
					if (tm >= m0) {
						if (!blocks.length) blocks.push(prevtm);
						blocks.push(tm);
					}
				}
				else blocks.push(bl);
				prevtm = tm;
			}
			let new_blocks;
			if (reencode) {
				let stamps = blocks;
				let first_time = stamps[0];
				let frames = [];
				for (let tm of stamps) {
					await await_seek(tm/1000);
					ctx.drawImage(vid, 0, 0, vidw, vidh);
					let fr = new VideoFrame(await createImageBitmap(ctx.getImageData(0,0,vidw,vidh)), {timestamp: Math.floor((tm-first_time)*1000)});
					frames.push(fr);
				}
				new_blocks = await encode(frames);
			}
			else {
				new_blocks = [];
				for (let bl of blocks){
					let tm = m0 + toint([bl[1],bl[2]]);
//log(`${tm} > ${m1}`);
					if (tm > m1) break;
					new_blocks.push(bl);
				}
			}

			let new_cluster_elem = webm_mod.make_cluster_elem_from_blocks(tot_time, new_blocks);
			let new_cluster = webm_mod.parse_section_flat(new_cluster_elem,segkids)[1];
			new_clusters.push(new_cluster);
			new_cluster_times.push(tot_time);
			tot_time += tmdiff;
		}
	}
}
jlog(slices);
jlog(out_slices);
log(new_cluster_times);
log(tot_time);
//return;
do_save(ebml, tracks, new_clusters, new_cluster_times, tot_time/1000);

erm_dermming_yoimpst = false;

};//»
//»
const webmcat = async (files) => {//«

//	let mod = await capi.getMod("webmparser");
	let mod = webm_mod;
	let tags = mod.WebmTags;
	let segtags = tags.kids["18538067"];
	let parse = mod.parse_section_flat;

let addTicks = 0;
let clusters = [];
let tracks;
let cluster_times=[];
let cluster_sizes=[];
let all_clusters_length = 0;
let cur_tracks_checksum;
let ebml;
while (files.length) {

	let bytes = files.shift();
	let webm = parse(bytes, tags);
	if (!webm) return cerr(`${fullpath}: Invalid webm`);
	if (!ebml) {
		ebml = webm[1]._bytes;
	}
	let seg = parse(webm[3], segtags);
	let info_bytes;
	let clustnum=0;
	for (let i=0; i < seg.length; i+=2){
		let which = seg[i];
		let bytes = seg[i+1];
		if (which.match(/^CLUSTER:/)) {
			if (!bytes[0]===231){
				return cerr(`${fullpath}: ClusterTimeCode ID(0xe7) not found at first byte in cluster[${clustnum}]`);
			}
			let rv = mod.ebml_sz(bytes, 1);
			let tmval = addTicks + toint(bytes.slice(rv[1], rv[1]+rv[0]));
			cluster_times.push(tmval);
			let tmvalarr = mod.num_to_arr(tmval);

			let tmvalszarr = mod.num_to_arr(tmvalarr.length, 3);

			let blocks = bytes.slice(rv[0]+rv[1]);
			let newclustdat = new Uint8Array(blocks.length + 5 + tmvalarr.length);
			newclustdat[0] = 0xe7;
			newclustdat[1] = 0x10;
			newclustdat.set(tmvalszarr, 2);
			newclustdat.set(tmvalarr, 5);
			newclustdat.set(blocks, 5 + tmvalarr.length);
			let newclust = mod.make_ebml_elem([0x1f, 0x43, 0xb6, 0x75], newclustdat);
			all_clusters_length += newclust.length;
			cluster_sizes.push(newclust.length);
			clusters.push(newclust);
			clustnum++;
		}
		else if (which.match(/^INFO:/)) info_bytes = bytes;
		else if (which.match(/^TRACKS:/)) {
			let gottracks = bytes._bytes;
			let sum = await capi.sha1(gottracks);
			if (!cur_tracks_checksum) {
				cur_tracks_checksum = sum;
				tracks = gottracks;
			}
			else if (sum !== cur_tracks_checksum){
				return cerr(`${fullpath}: The tracks section is different from a previous version`);
			}
		}
	}
	let info = mod.parse_section(info_bytes, segtags.kids["1549a966"]);
	for (let i=0; i < info.length; i+=2){
		if (info[i].match(/^DURATION:/)){
			addTicks += Math.round(tofloat(info[i+1]));
		}
	}
}

let last_block = mod.parse_section(clusters[clusters.length-1], segtags).pop().pop();
let last_block_time = toint(last_block.slice(1,3));
let total_ticks = last_block_time + cluster_times[cluster_times.length-1];

let all_clusters = new Uint8Array(all_clusters_length);
let curbyte=0;
for (let clust of clusters){
	all_clusters.set(clust, curbyte);
	curbyte+=clust.length;
}

let f = new mod.WebmFile();
f.duration = total_ticks;
f.timeCodeScale = 1_000_000;
f.muxingApp = "Zgrancheed";
f.writingApp = "Sofflering";
f.tracks = tracks;
f.clusters = all_clusters;
f.clusterSizes = cluster_sizes;
f.clusterTimes = cluster_times;
f.ebml = ebml;
f.makeInfo();
f.makeSeekHead();
f.makeCues();
f.makeSegment();
f.makeFile();

return  new Blob([f.file]);

};//»
*/
//»



