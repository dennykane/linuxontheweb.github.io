import { util, api as capi } from "/sys/util.js";
import { globals } from "/sys/config.js";

export const app = function(Win, Desk) {

//Var«

//const {Core, Main, NS}=arg;
const{NS}=globals;
const {fs}=NS.api;

//const{log,cwarn,cerr,globals}=Core;
const{make}=util;
const topwin = Win;
const Main = topwin.main;
const statbar = topwin.status_bar;
const lines = [];

const winid = topwin.id;

let DIRKIDS;
let did_load = false;
let kids;
let iter;
let tot;
let path;

//»

//DOM«
Main._over="auto";
let textarea = make('textarea');
textarea._noinput = true;
textarea.width = 1;
textarea.height = 1;
textarea.style.opacity = 0;
textarea.onpaste=e=>{
	let file = e.clipboardData.files[ 0 ];
	if (!file) return;
	log(file);
	let reader = new FileReader();
	reader.onload = function (ev) {
		load_bytes(new Uint8Array(ev.target.result));
	}; 
	reader.readAsArrayBuffer(file);
}

let areadiv = make('div');
areadiv._pos="absolute";
areadiv._loc(0,0);
areadiv._z=-1;
areadiv._add(textarea);
//Main.tcol="black";
Main._bgcol="black";
Main._add(areadiv);

//»

//Funcs«

const setimg=()=>{
    Main.innerHTML="";
    let img = new Image;
    Main._add(img);
    let nm = kids[iter];
	let kid = DIRKIDS[nm];
    let url = capi.fsUrl(`/blobs/${kid.blobId}`);
    topwin.title=kid.baseName;
    img.src=url;
};
const next=()=>{
    iter++;
    if (iter == tot) iter=0;
    setimg();
};
const prev=()=>{
    iter--;
    if (iter<0) iter = tot-1;
    setimg();
};
const getkids=async(patharg)=>{
    let arr = patharg.split("/");
    let name = arr.pop();
    path = arr.join("/");
    let dir = await fs.pathToNode(path);
    let exts=["jpg","gif","png","webp"];
	DIRKIDS = dir.kids;
    kids = DIRKIDS._keys.filter(val=>exts.includes(val.split(".").pop().toLowerCase())).sort();
    tot = kids.length;
    iter = kids.indexOf(name)
}
const load_file=arg=>{
	let img = new Image;
	img.src = arg.url;
	Main._add(img);
	getkids(arg.node.fullpath);
	topwin.title = arg.node.baseName;
};
const load_bytes=bytes=>{
	if (did_load){
cwarn("Already loaded!");
		return;
	}
//log(bytes);
	did_load=true;
	let blob = new Blob([bytes]);
	let url = URL.createObjectURL(blob);
	let img = new Image;
	img.src = url;
	Main._add(img);
};

//»

//CBs«

this.onfocus=()=>{
	textarea.focus();
};
this.onblur=()=>{
	textarea.blur();
};

this.onresize=()=>{
}

this.onkill=()=>{
};

this.onappinit=(arg)=>{
	if (!(arg&&arg.node&&arg.url)) return;
    load_file(arg);
};
this.onloadfile=load_bytes;;

this.onkeydown=(e,k)=>{
    if (k=="LEFT_") prev();
    else if (k=="RIGHT_") next();
};
setTimeout(()=>{
	textarea.focus();
},0);

//»

}
