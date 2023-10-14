
//«
/*
If we are in the process of saving a file via the Filesaver mechanism...
*/
/* !!! LOGIC BUG @EJMNCYLKIFB !!!

If we cancel the saving operation during the period between the icon being created as New_File_1 (or whatever)
and the "real name" we want for it


*/
/*

If you close this window when it is in the "Save As" mode (for e.g. TextEdit), it is still treated as
the child_window...

*/
//»

//Imports«
import { util, api as capi } from "/sys/util.js";
import { globals } from "/sys/config.js";
//»


export const app = function(Win, Desk) {

//Imports«

//const {Core, Main, NS}=arg;
//const{log,cwarn,cerr, globals, Desk}=Core;
const {Icon} = Desk.api;
const {getAppIcon}= capi;
const{NS, FS_TYPE, FOLDER_APP}=globals;
//const{FOLDER_APP}=globals;
const{make,mkdv,mk,mksp,log,cwarn,cerr}=util;
const {fs}=NS.api;
let CUR_FOLDER_XOFF = 5;
const topwin=Win;
const Main = topwin.main;
//let topwin = Main.top;
//log(topwin);
let winid = topwin.id;
//log("TOPWIN",topwin);
//let path = topwin._fullpath;
let path;
let statbar = topwin.status_bar;
let num_entries = 0;

const{poperr} = globals.widgets;

let picker_mode;

// = false;


//»

//DOM«

///*
const FOOTER_HGT = 0;
//const FOOTER_HGT = 38;
//let Main = _Main;
let savebut, canbut;
//*/
/*
const FOOTER_HGT = 38;
let Main = mkdv();
Main._pos="absolute";
Main._loc(0,0);
Main._w="100%";
Main._overy="hidden";
Main._h=_Main._h-FOOTER_HGT;
_Main._add(Main);
topwin.main = Main;
*/
//log(_Main);
let WDIE;
let dd = mkdv();
dd._pos = 'absolute';
dd._bor = '1px solid white';
dd._bgcol = 'gray';
dd._op = 0.5;
dd._loc(-1, -1);
dd._w = 0;
dd._h = 0;
Main._add(dd);

//Main._bgcol="#332323";
//Main._bgcol="#544";
Main._overy="auto";
Main._overx="hidden";
Main.tabIndex="-1";
//Main._pad=5;
const icondv = mkdv();
icondv.id=`icondiv_${winid}`;
icondv._mar=5;
icondv.main = Main;
icondv.win = Main.top;
icondv._pos = "relative";
icondv._dis="flex";
icondv.style.flexBasis=`100px`;
icondv.style.flexShrink=0;
icondv.style.flexGrow=0;
icondv.style.flexWrap="wrap";
Main._add(icondv);
topwin.drag_div = dd;
topwin.icon_div = icondv;
Main.icon_div = icondv;
//log(topwin);

//»
//Var«
let save_input;
let tab_order;
let prev_paths;

this.show_hidden = false;
//let ICONS=[];
let is_loading = false;
let drag_timeout;
let dir;
let kids;
let curnum;
let observer;
//»

//Funcs«
let num_div = mkdv();
let cur_div = mkdv();
let mess_div = mkdv();
statbar._w = "100%";
statbar._dis="flex";
statbar.style.justifyContent="space-between";
//statbar.style.justifyContent="center";
statbar._add(mess_div);
statbar._add(cur_div);
statbar._add(num_div);
//log(statbar);
const statnum=(s)=>{
	num_div.innerHTML=`${s}\xa0`;
};
const statcur=(s)=>{
	cur_div.innerHTML=s;
};
const NOOP=()=>{};

const load_dir=()=>{//«

let typ = dir.type;
kids = dir.kids;

let keys = Object.keys(kids);
keys.splice(keys.indexOf("."),1);
keys.splice(keys.indexOf(".."),1);

if (picker_mode){
	let arr = [];
	for (let k of keys){
		if(kids[k].appName===FOLDER_APP) arr.push(k);
	}
	keys = arr;
}
keys.sort();
curnum = keys.length
num_entries = keys.length;
stat_num();
let s = '';
let show_hidden = this.show_hidden;
for (let i=0; i < curnum; i++){
let nm = keys[i];
	if (!show_hidden && nm.match(/^\./)) continue;
	s+=`<div data-name="${nm}" class="icon"></div>`;
}
icondv.innerHTML=s;
const options = {
	root: Main,
	rootMargin: '0px',
	threshold: 0.001
}

observer = new IntersectionObserver((ents)=>{
	ents.forEach(ent => {
		let d = ent.target;
		if (ent.isIntersecting) {
			if (!d.showing) d.show();
		}
		else if (!(d.icon && d.icon.isOn)) d.hide();
	});
}, options);

for (let kid of icondv.children) {
	kid.show = ()=>{//«
		let got = kids[kid.dataset.name];
/*If this 'got' should be "owned" by a FileSaver that is writing to it, then we//«
want to be able to call a callback with 'got' and get
an updating overdiv put on it.  Right now, FileSaver creates the kid node upon
end_blob_stream, but we should do it upon start_blob_stream.»*/
		if (!got){
cwarn("Not found in kids: "+ kid.dataset.name);
			kid._del();
			return;
		}
		let icn = new Icon(got, kid, observer);
		if (got.filesaver_cb) got.filesaver_cb(icn);
		icn._pos="relative";
		icn.parWin = topwin;
		kid.showing = true;
//		kid.icon = icn;
	};//»
	kid.hide = ()=>{//«
		kid.innerHTML="";
		kid.showing = false;
	};//»
		observer.observe(kid);
	}
	is_loading = false;

}//»
const stat_num=()=>{//«
	if (!num_entries) statnum("Empty");
	else if (num_entries==1) statnum("1 entry");
	else statnum(`${num_entries} entries`);
};//»
const stat_mess=()=>{
	let mess_str="";
	if (dir.fullpath!="/") mess_str = "\xa0[<b>b</b>]ack ";
	if (prev_paths) mess_str += "[<b>f</b>]orward";
	mess_div.innerHTML = mess_str;
};

//»

const make_save_dom = ()=>{//«

picker_mode = true;
topwin.title = `Save\xa0Location\xa0:\xa0'${topwin.title}'`;
let botdiv = topwin.bottom_div;
let both = botdiv.getBoundingClientRect().height-4;

let sp = mk('span');
sp._marl=5;
sp._fs=18;
//sp._tcol="#fff";
sp.innerHTML="Save As:\xa0";
let inp = mk('input');
inp.type="text";
inp._bgcol="#2a2a3a";//WIN_COL_ON in desk.js
inp._tcol="#DDD";//WIN_COL_ON in desk.js
inp.style.caretColor = "#DDD";
save_input = inp;
savebut = mk('button');
savebut._fw="bold";
savebut._bgcol="#dde";
savebut.innerText="\xa0Save\xa0";
savebut.style.cssFloat="right";
savebut._h = both;
savebut._marr=5;
//savebut.tabIndex="0";
canbut = mk('button');
canbut._fw="bold";
canbut._bgcol="#dde";
canbut._marr=5;
canbut.innerText="Cancel";
canbut.style.cssFloat="right";
canbut._h = both;
//canbut.tabIndex="1";

topwin._save_escape_cb=()=>{
	savebut.disabled = false;
};
savebut.onclick=()=>{
	topwin.saver.cb(topwin, inp.value);
	savebut.disabled = true;
};
canbut.onclick=()=>{
	topwin.close_button.click();
};

botdiv._add(sp);
botdiv._add(inp);
//inp._bor="";
inp.style.outline="none";
inp.focus();
botdiv._add(canbut);
botdiv._add(savebut);
tab_order = [inp, savebut, canbut];
//log(inp);
};
//»

const init=(if_reinit)=>{//«

return new Promise(async(Y,N)=>{


	if (topwin.saver) {
		make_save_dom();
	}

if (!path) {
cwarn("No path given (topwin._fullpath)");
	return;
}
	dir = await fs.pathToNode(path);
	if (!dir) {
if (path) poperr(`Directory not found: ${path}`);
else cwarn("Opening in 'app mode'");
		return;
	}

//Show a loading message in the Main window of the Folder app: //«
//In apps/sys/Folder.js->init
    if (!dir.done){
        statnum("Getting entries...");
        let cb=(ents)=>{
            num_entries+=ents.length;
            stat_num();
            if (numdiv) numdiv.innerHTML=`${num_entries} entries loaded`;
        };
        let numdiv;
        let done = false;
        setTimeout(()=>{
            if (done) return;
            numdiv = make("div");
            numdiv._tcol="#bbb";
            numdiv._pad=10;
            numdiv._fs=24;
            numdiv._fw="bold";
            numdiv._ta="center";
            numdiv.innerHTML=`${num_entries} entries loaded`;
            numdiv._pos="absolute";
            numdiv.vcenter();
            Main._add(numdiv);
        }, 100);
        await fs.popDirByPath(path, {par:dir,streamCb:cb});
        done = true;
        if (numdiv) numdiv._del();
        dir.done=true;
        load_dir();
    }
	else{
		load_dir();
	}
//»
	if (dir.type!==FS_TYPE) {
		num_entries = Object.keys(dir.kids).length-2;
		stat_num();
	}
	stat_mess();

	Y();
});

}//»

//OBJ/CB«

const reload = async(newpath)=>{//«
	if (is_loading) return;
	if (newpath) path = newpath;
	is_loading = true;
	Main.scrollTop=0;
	icondv.innerHTML="";
	await init(true);
	statnum(`${dir.kids._keys.length-2} entries`);
	if (topwin.cursor) topwin.cursor.set();
};//»
this.reload=reload;
this.onescape=()=>{//«

if (savebut) {
let act = document.activeElement;
if (act===savebut) {
	savebut.blur();
	return true;
}
if (act===canbut) {
	canbut.blur();
	return true;
}
}
return false;
};//»
this.onkeydown = function(e,s) {//«

if (save_input && (s=="TAB_" || s=="TAB_S")){
	let act = document.activeElement;
let ind = tab_order.indexOf(act);
if (s.match(/_S$/)) ind--;
else ind++;
if (ind < 0) ind = tab_order.length-1;
else if (ind == tab_order.length) ind = 0;
tab_order[ind].focus();
//log(ind);
	return;
}

if (s=="r_")reload(path);
else if (s=="0_"){
	if (topwin.cursor&&topwin.cursor.ison()) {
		topwin.cursor.zero();
	}
//topwin.cursor.set();
}
else if (s=="b_"||s=="b_C"){
//log(path);
if (path.match(/^\x2f+$/)) return;

let arr = path.split("/");
arr.pop();
if (!prev_paths) prev_paths=[Win.fullpath];
else prev_paths.unshift(Win.fullpath);
let opts = {PREVPATHS: prev_paths, WINARGS: {X: topwin.winElem._x, Y:topwin.winElem._y, WID: Main._w, HGT: Main._h, BOTTOMPAD: topwin.bottompad}};
if (topwin.saver) {
	opts.SAVER = topwin.saver;
}
topwin.easyKill();
Desk.open_file_by_path(arr.join("/"), null, opts);

}
else if (s=="f_"||s=="f_C"){
if (!prev_paths) return;
let goto_path = prev_paths.shift();
if (!prev_paths.length) prev_paths = undefined;
let opts = {PREVPATHS: prev_paths, WINARGS: {X: topwin.winElem._x, Y:topwin.winElem._y, WID: Main._w, HGT: Main._h, BOTTOMPAD: topwin.bottompad}};
if (topwin.saver) {
	opts.SAVER = topwin.saver;
}
topwin.easyKill();
Desk.open_file_by_path(goto_path, null, opts);


}
else if (s=="s_"||s=="s_C"){

//EJMNCYLKIFB
if (topwin.saver) {
//log("GOT SAVECB");
	topwin.saver.cb(topwin);
	topwin.saver=null;
//	topwin._savecb = null;
}
else{
//log("NO SAVECB");

}

}
else if (s==="TAB_"){

if (savebut) {
e.preventDefault();
let act = document.activeElement;

if (act===savebut) canbut.focus();
else {
//log("?");
	savebut.focus();
}
}
}
}//»
this.onkill = function(if_reload, if_force) {//«
	if (if_force){
		if (topwin.saver) {
			topwin.saver.cb(null, 1);
			topwin.saver=null;
//cwarn("HAVE SAVECB");
//			topwin._savecb(null, 1);
//			topwin._savecb = null;
		}
	}
	icondv._del();
}//»
this.onresize = function() {//«

	if (FOOTER_HGT) Main._h=_Main._h-FOOTER_HGT;

	let cur = topwin.cursor;
	if (!cur) return;
	let icn = Main.lasticon;
	if (!icn) return;
	icn.iconElem.scrollIntoViewIfNeeded();
	cur.curElem._loc(icn.iconElem.offsetLeft+2, icn.iconElem.offsetTop+2);

}//»

this.onfocus=()=>{Main.focus();};
this.onblur=()=>{Main.blur();};
this.onappinit=(arg, prevpaths)=>{
prev_paths = prevpaths;
path = arg;
init();
};
//this.onload=()=>{init();};
this.update=()=>{
//log("UPDATE");
	statnum(`${dir.kids._keys.length-2} entries`);
};
this.add_icon=(icn)=>{Main.scrollTop=0;};
this.stat=statcur;

this.get_context=()=>{//«
	let choices = [
		"Folder",()=>{Desk.make_new_icon(topwin, FOLDER_APP)},
		"Text File"
	];  
	if (topwin.saver) choices.push(null);
	else choices.push(()=>{Desk.make_new_icon(topwin, "Text")});
	let arr = [
		"\u{1f381}\xa0New",
		choices
	];  
	if (this.show_hidden){
		arr.push("Hide\xa0dotfiles");
		arr.push(()=>{this.show_hidden = false; this.reload()});
	}   
	else{
		arr.push("Show\xa0dotfiles");
		arr.push(()=>{this.show_hidden = true; this.reload()});
	}   
	return arr;
}//»

//»

Main.focus();

}

