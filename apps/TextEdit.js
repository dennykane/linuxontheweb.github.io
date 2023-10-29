
import { util, api as capi } from "/sys/util.js";
import { globals } from "/sys/config.js";

//export const app = function(arg) {
export const app = function(Win, Desk) {

//Imports«

//const {Core, Main, NS}=arg;
const{NS}=globals;
const wdg = NS.api.widgets;
const {poperr} = wdg;
const{log,cwarn,cerr, make}=util;
//log(wdg);
//const{util}=globals;
//const{make}=util;
const fsapi=NS.api.fs;

//const topwin = Main.top;

let main = Win.main;
let win = Win;
let topwin = win;

const statbar = topwin.status_bar;

//»

//Vars«

let view_only = false;

const EXTENSIONS=[
	'txt', 
	'js', 
	'json', 
	'app', 
	'html', 
	'css'
];
let USE_EXT = 0;

//let is_saving;
//let cur_save_folder;

let thisobj = this;
let yes_cb, no_cb;
let popdiv;
let current_bytes;
let modified = false;
let focused = false;

let area = make('textarea');
area.id = `textarea_${Win.id}`;
area.style.caretShape="block";
//area.spellcheck=false;
area.onmousedown=function(e) {
	e.stopPropagation();
}

win.area = area;
//log(arg.WID);
//»

//OBJ/CB«

//OVERRIDE«
this.overrides = {
	's_A': 1,
	'b_CAS': 1
};//»
//SYMS«

var keysym_map = {
    's_A': {"ON":1,"DESC":"Save file","NAME":"write_file"}
};

var keysym_funcs = {//«
    "write_file":function() {save_context_cb();}
}//»

//»
this.onresize = function() {//«
//	area._w=main._w; 
//	var diff = 0;
//	area.h=parseInt(main.h) - diff; 
//	if (popdiv) Core.api.center(popdiv, main);
}//»
this.onfocus = function() {//«
	if (view_only) return;
	if (topwin.cur_save_folder){
		setTimeout(()=>{
			if(topwin.cur_save_folder) topwin.cur_save_folder.on();
		},10);
		return;
	}
	if (modified) return;
	focused = true;
	if (win.area) {
		win.area.disabled = false;
		win.area.focus();
	}
}//»
this.onblur = function() {//«
	if (view_only) return;
	if (modified) return;
	focused = false;
	if (win.area) {
		win.area.disabled = true;
		win.area.blur();
	}
}
//»
this.kill = function(cb) {//«
}//»
this.onloadfile=function(bytes, opts={}) {//«
	if (!bytes) return;
//	if (text.buffer) text = text.buffer;
    let text = capi.bytesToStr(bytes);
	area.value = text;
	if (opts.viewOnly) {
		view_only = true;
		area.disabled = true;
	}
	area.setSelectionRange(0,0);
}
//»
this.winsave = save_context_cb;
this.set_details = function(name, path, ext) {//«
	topwin.set_winname(name);
	topwin.path=path;
	topwin.ext=ext;
	delete topwin.nosave;
}//»
this.gettext = function() {//«
	return area.value;
}//»
this.getbytes = async function(cb) {//«
	if (!cb) {
cwarn("TextEdit: called getbytes() without a callback!");
return;
	}
	cb(await capi.blobAsBytes(new Blob([win.area.value],{type:"blob"})));
}//»

this.onmodified = function(bytesarg) {//«
	current_bytes = bytesarg;
	if (modified) return;

//console.error("obj.modified HAS BEEN CALLED!");
//return;

//	popdiv = globals.widgets.make_popup({STR:"The file has been modified.<br>Reload it now?", TYP:"yesno"},null, main);
	popdiv = globals.widgets.make_popup({STR:"The file has been modified.<br>Reload it now?", TYP:"yesno", WIN: main});
	modified = true;
	yes_cb = function() {
		yes_cb = null;
		no_cb = null;
		popdiv._del();
		popdiv = null;
		area.value = capi.bytesToStr(current_bytes);
		if (focused) area.disabled = false;
		modified = false;
	}
	popdiv.ok_button.onclick = yes_cb;
	no_cb = function() {
		yes_cb = null;
		no_cb = null;
		popdiv._del();
		popdiv = null;
		if (focused) {
			area.disabled = false;
			area.focus();
		}
		modified = false;
	}
	popdiv.cancel_button.onclick = no_cb;
	area.disabled = true;

}//»
this.onescape=()=>{

if (area.selectionStart!==area.selectionEnd) {
	area.selectionEnd = area.selectionStart;
	return true;
}

};
this.onkeydown=(e,k)=>{
//log(e);
	if (k=="s_C"){
		save_context_cb();
	}
	else if (k=="TAB_"){
		e.preventDefault();
		if (area.selectionStart===area.selectionEnd) area.setRangeText("\x09",area.selectionStart,area.selectionStart,'end');
	}
};
this.get_context = function() {
	if (view_only) return [];
	area.blur();
	let as="";
	if (!topwin.fullpath) as = "\xa0as...";
	let arr = [`Save${as}::Ctrl+s`, save_context_cb]
	if (!topwin.fullpath){
		let ext = EXTENSIONS[USE_EXT];
		arr.push("Set\xa0Ext");
		let ext_func_arr=[];
		for (let i=0; i < EXTENSIONS.length; i++){
			if (i===USE_EXT) continue;
			ext_func_arr.push(EXTENSIONS[i],()=>{USE_EXT = i;});
		}
		arr.push(ext_func_arr);
		arr.push(`Current\xa0Ext:\xa0${ext}`,null);
	}
	return arr;
};

//»

//Funcs«

async function save_context_cb() {//«

if (globals.read_only){
	globals.widgets.poperr("Cannot save in 'read only' mode");
	return;
}

if (topwin.fullpath){
	let rv = await fsapi.writeFile(topwin.fullpath, area.value, {noMakeIcon: true});
	if (!rv) {
poperr("Could not write the file");
		return;
	}
//log(rv);
	statbar.innerText = `${rv.size} bytes written`;
	return;
}

//let {path, name} = await Desk.api.saveAs(topwin, area.value||"", EXTENSIONS[USE_EXT]);
let {path, name} = await Desk.api.saveAs(topwin);
if (!path) return;
name = name.trim();
if (!name.match(/^[-._a-zA-Z0-9 ]+$/)){
	return poperr("Invalid name");
}
let ext = EXTENSIONS[USE_EXT];
let fullpath = `${path}/${name}.${ext}`;
if (! await fsapi.checkDirPerm(path)){
	return poperr(`${path}: permission denied`);
}


if (await fsapi.pathToNode(fullpath)){
	return poperr(`${fullpath}: Already exists`);
}

let node = await fsapi.writeFile(fullpath, area.value);
//log(node);
if (!node){
	poperr("Could not write the file");
	return;
}
statbar.innerText = `${node.size} bytes written`;
Win.name = name;
Win.path = path;
Win.ext = ext;
Win.title = name;
Win.icon=undefined;
delete Win.icon;
Win.cur_save_folder = null;
node.lockFile();
Win.node = node;


//log(fullpath);

}//»
function get_win_path() {//«
	if (!topwin.path) return null;
	var path = topwin.path+"/"+topwin.name
	if (topwin.ext) path += "."+topwin.ext;
	return path;

}//»

//»

//DOM Maker«
win._over="hidden";
main._over="hidden";
area._bgcol="#211";
area._tcol="#EEEEEE";
area._bor="1px solid #322";

area.style.resize = "none";
area._ff="monospace";
area._fs=20;
area._fw=600;
main._tcol="black";
area._w="100%";
area._h="100%";
area.win = win;
area.style.outline = "none";
main.area = area;
win.area = area;
main._add(area);
//»


}


