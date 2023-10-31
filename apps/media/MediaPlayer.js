//@GJSKEOMFKS <--- CHANGE IT TO if (isMobile){...}
//Imports«
import { util, api as capi } from "util";
import {globals} from "config";
const {detectClick, sharedStart, dist}=capi; 
const{strnum, isarr, isstr, isnum, isobj, make, KC, kc, log, jlog, cwarn, cerr}=util;
const {fs, FS_TYPE, NS, isMobile}=globals;
const fsapi = fs.api;
const widgets = NS.api.widgets;
const {poperr}=widgets;



//»

export const app = function(Win, Desk) {//«

const Video=function(vid, node){//«
	this.node = node;
	this.element = vid;
	this.paused = true;
	this.pause=()=>{
		playbutton.innerHTML=PAUSE_SYMBOL;
		vid.pause();
		this.paused = true;
		update_time();
		clearInterval(interval);
	};
	this.play=()=>{
		interval = setInterval(update_time, 1000);
		playbutton.innerHTML=PLAY_SYMBOL;
		vid.play();
		this.paused = false;
	};
	this.setTimeByPer=per=>{
		let newtime = per*vid.duration;
		vid.currentTime = newtime;
		set_timeline_by_per(per);
	};
	Object.defineProperty(this,"currentTime",{
		get:function(){
			return vid.currentTime;
		}, 
		set:function(arg){
			vid.currentTime = arg;
		}
	});
}//»

//Var«
let LONG_TOUCH_MS = 500;
let didtouchstart = false;
let tch1;
let tstrt;
let scrt1;

let SVG_TOP=`<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="50" height="50">
<g transform="scale(0.5)">
`;
let PLAY_SYMBOL=`
${SVG_TOP}
<polygon points="6,0 6,100 31,100 31,0 6,0" fill="#fff"/>
<polygon points="69,0 69,100 94,100 94,0 69,0" fill="#fff"/>
</g></svg>
`;
let PAUSE_SYMBOL=`
${SVG_TOP}
<polygon points="0,0 0,100 100,50 0,0" fill="#fff"/>
</g></svg>
`;

let SONG_PADDING = 5;

//let autoplay=true;
let SONG_FS = 30;

let autoplay=false;

let topwin = Win;
let main = topwin.main;
const Main = main;
let apparg;

let interval;

let noplay;
let VIDEO_ASPECT;

let cur_rate_delta = 0.01;
let small_dt = 5;
//let small_dt = 60;

let duration;

let tot;
let path;
let iter;
let DIRKIDS;

let curpar;
let curnode;
let curdiv;

let kids=[];
let dirs=[];
//»

//DOM«


Main._tcol="#fff";

/*«
let statdiv = make('div');
//statdiv._pos="absolute";
statdiv._w="100%";
statdiv._h=30;
statdiv._b=0;
//statdiv._l=0;
statdiv.innerHTML="Gargamel and hrunsinspunss!!!";
Main._add(statdiv);
log(Main);
»*/

///*«
let timeline = make('div');
//timeline._mart=7;
//timeline._marb=7;
//timeline._ta="center";
timeline._fs=24;
timeline._bgcol="#222";
timeline._pos="relative";
timeline._h=40;
timeline._tcol="#fff";
timeline._w="100%";

let playbutton = make('div');
playbutton._fs=50;
playbutton.innerHTML=PAUSE_SYMBOL;
playbutton._z=9999999;
//playbutton._bgcol="#030";
playbutton._ta="center";
playbutton._pad=5;
playbutton.style.minWidth=60;
//log(playbutton);

let box = make('div');
box._z=0;
box._bgcol="rgba(255,255,0,0.10)";
box._pos="absolute";
box._loc(0,0);
box._h="100%";
timeline._add(box);

let tmbox = make('div');
tmbox._marl=7;
tmbox.style.lineHeight="160%";
tmbox._z = 100;
tmbox._pos="absolute";
tmbox._x=0;
timeline._add(tmbox);

let durbox = make('div');
durbox._marr=7;
durbox._z=100;
durbox._pos="absolute";
durbox._r=0;
durbox.style.lineHeight="160%";
timeline._add(durbox);
//»*/
let songdiv = make('div');
songdiv._pos="absolute";
songdiv._loc(0,0);
songdiv._w="100%";
songdiv._dis="none";
songdiv._h="100%";
songdiv.style.flexDirection="column";
songdiv.style.justifyContent="space-around";
songdiv.style.alignItems="center";

let closediv = make('div');
closediv._pos="absolute";
closediv._r=0;
closediv._y=0;
closediv.innerHTML="X";
closediv._z=999999;
closediv._fw=900;
closediv._fs=40;
closediv._pad=10;
closediv._mart=10;
closediv._marr=30;

let listdiv = make('div');
listdiv._pos="absolute";
listdiv._loc(0,0);
listdiv._w="100%";
listdiv._z=99999999;

let dirlist = make('div');
dirlist.style.minHeight=40;
dirlist._pad=10;
//dirlist.style.textDecoration="underline";
//dirlist._tcol="#909fff";
dirlist._fs=28;

let curdirdiv = make('div');
curdirdiv._marl=10;
curdirdiv._fw="bold";
//curdirdiv._ta="center";
curdirdiv._fs=28;

listdiv._add(curdirdiv);
listdiv._add(make('hr'));

let kidlist = make('div');
kidlist._marl=15;
//kidlist._pad=10;
kidlist._tcol="#ddd";
kidlist._fw="bold";
kidlist._fs=23;
listdiv._add(kidlist);
listdiv._add(make('hr'));
listdiv._add(dirlist);

Main._overy="auto";

let vid, auctx;
Main._bgcol="#000";

Main._add(listdiv);
Main._add(songdiv);

//»
const set_timeline_by_per=per=>{
	let r = timeline.getBoundingClientRect();
	let w = r.width;
	let newtime = per*vid.element.duration;
	tmbox.innerHTML = time_to_str(newtime);
	box._w = w*per;
};

//Listeners«

const timeline_click =function(e){//«
	e.stopPropagation();
	if (!vid) return;
	if (e.touches) e = e.touches[0];
	else if (e.changedTouches) e = e.changedTouches[0];
	let r = timeline.getBoundingClientRect();
	let w = r.width;
	let off_x = r.left;
	let per = (e.clientX - r.left)/r.width;

	let newtime = per*vid.element.duration;
	vid.element.currentTime = newtime;
	tmbox.innerHTML = time_to_str(newtime);
	box._w = w*per;
};//»
timeline.onclick = timeline_click;
//timeline_click
timeline.addEventListener('touchstart', timeline_click);
//timeline.addEventListener('touchmove', timeline_click);

const remove_songdiv=e=>{//«
//	e&&e.preventDefault();
	playbutton.innerHTML=PAUSE_SYMBOL;
//	vid.pause();
//	curdiv._pause();
	songdiv._dis="none";
	listdiv._dis="";
};//»
const toggle_play = e=>{//«
	e&&e.stopPropagation();
//log(vid);
	if (vid.paused){
		interval = setInterval(update_time, 1000);
		playbutton.innerHTML=PLAY_SYMBOL;
//		playbutton._bgcol="#500";
//log(vid.play);
		vid.play();
	}
	else{
		playbutton.innerHTML=PAUSE_SYMBOL;
//		playbutton._bgcol="#030";
		vid.pause();
		update_time();
		clearInterval(interval);
	}
};//»
/*
const dotouchstart=e=>{//«
//	e.stopPropagation();
	if (didtouchstart) return;
	scrt1 = Main.scrollTop;
	tch1 = e.touches[0];
	tstrt = Date.now();
	didtouchstart = true;
};//»
const dotouchend=e=>{//«
//	e.stopPropagation();
	if (!tch1) return;
	let tch2 = e.changedTouches[0];
	let d = dist(tch1.pageX, tch1.pageY, tch2.pageX, tch2.pageY);
	let tm = Date.now() - tstrt;
	if (d < 20 && tm > LONG_TOUCH_MS){
//		if (songdiv._dis!="none") remove_songdiv();
//		if (overdiv._dis=="none") overdiv._dis="";
//		else overdiv._dis="none";
//log("STOP");
	}
	tch1 = null;
	didtouchstart = false;
};//»
const dotouchmove=e=>{//«
	if (!tch1) return;
	let t = e.changedTouches[0];
	let dy = tch1.pageY - t.pageY;
	Main.scrollTop = scrt1 + dy;
};//»
Main.addEventListener('touchstart', dotouchstart);
Main.addEventListener('touchmove', dotouchmove);
Main.addEventListener('touchend', dotouchend);
*/
playbutton.onmouseover=e=>{//«
	playbutton.style.cursor="pointer";
};//»
closediv.onmouseover=e=>{//«
	closediv.style.cursor="pointer";
};//»
playbutton.onclick=toggle_play;
detectClick(playbutton, 175, toggle_play);
closediv.onclick = remove_songdiv;
detectClick(closediv, 175, remove_songdiv);
songdiv.oncontextmenu=e=>{//«
	e.stopPropagation();
	e.preventDefault();
};//»
songdiv.onclick=e=>{//«
	e.stopPropagation();
};//»
Main.oncontextmenu = e =>{//«
	e.preventDefault();
	e.stopPropagation();
};//»


//»
//Funcs«

const yt_clean = n => {//«
	if (n.match(/-[-_a-z0-9]{11}$/i) && n.length > 15){
		let s = n.slice(-11);
		let numlower = s.length - s.replace(/[a-z]/g, '').length;
		if (numlower/11 < 0.7) {
		n = n.slice(0, n.length - 12);
		}
	}
	n = n.replace(/^\d+-/,"").replace(/_+/g," ");
	return n;
};//»
const getkids = async(patharg)=>{//«
	let arr = patharg.split("/");
	let name = arr.pop();
	path = arr.join("/");
	curpar = await fsapi.pathToNode(path);
	if (!curpar.done) await fsapi.popDir(curpar);
	curdirdiv.innerHTML=curpar.name;
	let exts=globals.MEDIA_EXTENSIONS;
	DIRKIDS = curpar.kids;
	let names = DIRKIDS._keys.sort();

	let pardir;	
	let namemap={};
	let gotkidnames=[];
	for (let nm of names) {
		let kid = DIRKIDS[nm];
		if (exts.includes(nm.split(".").pop().toLowerCase())){
			let goodname = yt_clean(kid.baseName);
			namemap[nm] = goodname;
			gotkidnames.push(goodname);
		}
	}
	if (gotkidnames.length>1) {
		let start = sharedStart(gotkidnames);
		for (let nm of namemap._keys){
			let haveit = namemap[nm];
			namemap[nm] = haveit.slice(start.length);
		}
	}
	for (let nm of names){
		if (nm==".") continue;
		let kid = DIRKIDS[nm];
		if (kid.kids){//«
//			let firstkid = await get_first_valid_kid(kid);
//			if (firstkid) {
			let wrap = make('div');
			wrap._marl=10;
			let d = make('span');
			if (nm=="..") {
				if (kid.perm !== false) {
//				if (kid.perm == globals.CURRENT_USER) {
					nm=`../${kid.name}`;
					pardir = wrap;
				}
//log(kid);
			}
			else {
//				d.style.cssFloat="right";
				nm = `${nm}`;
				dirs.push(wrap);
			}
			d.innerHTML=nm;
			d.style.textDecoration="underline";
			d._pad=5;
			wrap._marb=10;
			d.onmouseover=()=>{
				d.style.cursor="pointer";
			};
			d.onmouseout=()=>{
				d.style.cursor="";
			};
			let click_fn =async e=>{
				e.stopPropagation();
				dirlist.innerHTML="";
				kidlist.innerHTML="";
				kids=[];
				dirs = [];
//log(kidlist.innetH);
				Main.scrollTop = 0;
				getkids(`${kid.fullpath}/blah`);
			};
			capi.detectClick(d, 175, click_fn);
//			d.addEventListener('touchend',click_fn);
			d.addEventListener('click', click_fn);
			d._fw="bold";
			wrap._add(d);
//			}
		}//»
		else if (exts.includes(nm.split(".").pop().toLowerCase())){//«
			let click_fn =e=>{//«
				e&&e.stopPropagation();
				vid.pause();
//				vid._del();
				curdiv._stop();
				d._tcol="#fff";
				load_file({node: kid, url: capi.fsUrl(`/blobs/${kid.blobId}`), noGet: true});
				box._w = 0;
				curdiv = wrap;
				listdiv._dis="none";
				songdiv._dis="flex";
				songdiv.innerHTML=`<div style="font-size:34;font-weight:900;">${n}</div>`;
				songdiv._add(playbutton);
				songdiv._add(timeline);
				songdiv._add(closediv);
			};//»
			let set_play_icon=()=>{//«
				d.innerHTML=`${n}\xa0\xa0<span style="font-size:30;">${PAUSE_SYMBOL}</span>`;
			};//»
//			let n = yt_clean(kid.baseName);
			let n = namemap[nm];
			let wrap = make('div');
//			wrap._bor="1px dotted white";
			wrap._marb=5;
			wrap._padl=5;
			wrap._padr=5;
			wrap._padt=SONG_PADDING;
			wrap._padb=SONG_PADDING;
			let d = make('span');
			d._pad=5;
//			d.style.textDecoration="underline";
			d.onmouseover=()=>{//«
				d.style.cursor="pointer";
			};//»
			wrap.onclick = click_fn;
//			d.ontouchend = click_fn;
			detectClick(d, 175, click_fn);
			wrap._play = () => {//«
			};//»
			wrap._pause=()=>{//«
//				set_play_icon();
			};//»
			wrap._stop=()=>{//«
//				set_play_icon();
				d._tcol="";
//				wrap._h = "";
			};//»

			if (kid===curnode) {
				curdiv = wrap;
				d._tcol="#fff";
			}

//			d.innerHTML=`${n}\xa0\xa0<span style="font-size:30;">${PAUSE_SYMBOL}</span>`;
			d.innerHTML=`${n}`;
//log(wrap);
			wrap._add(d);
			kids.push(wrap);

		}//»
	}
	if (pardir) {
		dirlist._add(pardir);
		dirlist._add(make('br'));
	}
	for (let dir of dirs) dirlist._add(dir);
if (kids.length) {
	for (let kid of kids) kidlist._add(kid);
}
else{
kidlist.innerHTML="<center><i>[Empty]</i></center>";
}
	for (let kid of kids) {
		if (kid===curdiv){
//			set_timeline(kid);
		}
	}
//	tot = kids.length;
//	iter = kids.indexOf(name)
}//»
const update_time = ()=>{//«
	if (!vid) return;
	let r = timeline.getBoundingClientRect();
	let tm = vid.currentTime;
	let dur = vid.duration;
	let w = r.width*tm/dur;
	box._w = w;
	tmbox.innerHTML = time_to_str(tm);
//	listdiv._h = Main.scrollHeight;
//	songdiv._h = Main.scrollHeight;
//	overdiv._h = Main.scrollHeight;
};//»
const time_to_str=(val)=>{//«
	let mins = Math.floor(val/60);
	let left = Math.floor(val - (mins*60));
	if (left < 10) left=`0${left}`;
	return `${mins}:${left}`;
};//»
const next=()=>{//«
    iter++;
    if (iter == tot) iter=0;
	setvid();
};//»
const prev=()=>{//«
    iter--;
    if (iter<0) iter = tot-1;
	setvid();
};//»
const get_first_valid_kid=async dir=>{//«
	if (!dir.done) await fsapi.popDir(dir);
	let exts=globals.MEDIA_EXTENSIONS;
	let kids = dir.kids;
	let keys = kids._keys;
	for (let nm of keys){
		if (nm=="."||nm=="..") continue;
		if (exts.includes(nm.split(".").pop().toLowerCase())) {
			let got = kids[nm];
			if (!got.blobId) continue;
			return got;
		}
	}
	return false;
};//»
const setvid=()=>{//«
	vid.pause();
	vid._del();
	let nm = kids[iter];
	let node = DIRKIDS[nm];
	let url = capi.fsUrl(`/blobs/${node.blobId}`);
	topwin.title=yt_clean(node.baseName);
	load_file({node, url, noGet: true});
};//»
const load_file = async(arg)=>{//«
	apparg = arg;
	let {node, url, noGet} = arg;
	curnode = node;
	if (!noGet) await getkids(node.fullpath);
	let rtyp = node.type;
	if (rtyp==FS_TYPE){
	if (!node.blobId){
		poperr(`No blob id was found`);
		return;
	}
	Win.title = yt_clean(node.baseName);

//	vid = make('video');
//	vid.element = vid;
///*
	if (!auctx){
		auctx = new AudioContext();
		globals.audioContext = auctx;
	}
	if (!vid) {
		let _vid = make('video');
		globals.mediaElement = _vid;
		let node = auctx.createMediaElementSource(_vid);
//		node.connect(auctx.destination);
		vid = new Video(_vid, node);
		globals.mediaNode = vid;
	}
//*/
	this.video = vid;
//	main._add(vid);
//	box._w = 0;
	vid.element.src = url;
	if (autoplay||noGet) {
//toggle_play();
//		vid.play();
//		if (curdiv) curdiv._play();
	}
//	if (noGet) {
//		set_timeline(curdiv);
//	}
vid.element.onended = ()=>{
let iter = kids.indexOf(curdiv);
let next = kids[iter+1];
if (next) {
	next.onclick();
	vid.play();
}
else{
remove_songdiv();
}
};
	vid.element.onloadedmetadata=(e)=>{
		tmbox.innerHTML="0:00";
		durbox.innerHTML= time_to_str(vid.element.duration);
	}
listdiv._h = "";
setTimeout(()=>{
	listdiv._h = Main.scrollHeight;
},0);
//	songdiv._h = Main.scrollHeight;
//	overdiv._h = Main.scrollHeight;
}
else{
	return poperr("Unsupported fs type: "+rtyp);
}

};//»

//»

//CB«

this.onappinit=arg=>{//«
	vid = globals.mediaElement;
	auctx = globals.audioContext;
	if (arg.reInit) arg = arg.reInit;
	if (!(arg&&arg.node&&arg.url)) return;
	load_file(arg);
//	interval = setInterval(update, 1000);
};//»
this.onkill = function() {//«
	if (vid) {
//		vid.pause();
//		vid._del();
	}
	clearInterval(interval);
	if (apparg) {
		delete apparg.noGet;
		this.reInit=apparg;
	}
}//»
this.onkeydown = function(e,sym) {//«

	if (!vid) return;

	if (sym=="SPACE_") {
		e.preventDefault();
		if (vid.paused) {
//			vid.play();
			curdiv._play();
		}
		else {
//			vid.pause();
			curdiv._pause();
		}
	}

	else if (sym=="LEFT_") prev();
	else if (sym=="RIGHT_") next();
else if (sym=="UP_"){

//log(curpar.fullpath);

}
/*
	else if (sym=="LEFT_"){
		let newtime = vid.currentTime - small_dt;
		if (newtime < 0) newtime = 0;
		if (vid.paused){
			vid.onseeked=(e)=>{
			vid.onseeked = null;
			setTimeout(()=>{vid.pause();},0);}
		}
		vid.currentTime=newtime;
//cwarn(newtime);
	}
	else if (sym=="RIGHT_"){
		let newtime = vid.currentTime + small_dt;
		if (newtime > vid.duration) newtime = vid.duration;
		if (vid.paused){
			vid.onseeked=(e)=>{
			vid.onseeked = null;
			setTimeout(()=>{vid.pause();},0);}
		}
		vid.currentTime=newtime;
	}
*/
	else if (sym=="0_") vid.playbackRate = 1.0;
	else if (sym=="UP_C") {
		vid.playbackRate += cur_rate_delta;
log(vid.playbackRate);
	}
	else if (sym=="DOWN_C") {
		vid.playbackRate -= cur_rate_delta;
log(vid.playbackRate);
	}
}//»
this.onresize=()=>{//«
	listdiv._h = Main.scrollHeight;
	update_time();
};//»

//»


}//»





/*
const resize=()=>{//«
	if (!(vid&&meddiv)) return;
	var h = main.clientHeight;
	var w = main.clientWidth;
	if (vid.videoHeight <= h && vid.videoWidth <= w){
		vid.height = vid.videoHeight;
		vid.width = vid.videoWidth;
	}
	else {
		if (h*VIDEO_ASPECT > w) {
			vid.width = w;
			vid.height = w/VIDEO_ASPECT;
		}
		else {
			vid.height = h;
			vid.width = h*VIDEO_ASPECT;
		}
//		if (vid.videoHeight > main.clientHeight)vid.height = main.clientHeight;
//		else if (vid.videoWidth > main.clientWidth)vid.width = main.clientWidth;
	}

	center(meddiv, topwin);
}
this.resize=resize;//»
*/
