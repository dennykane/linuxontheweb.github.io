/*Issues«

Halloween 2023: Don't know if these have been resolved because I don't really understand
these issues

!!! LOGIC BUG @EJMNCYLKIFB !!!
If we cancel the saving operation during the period between the icon being created as New_File_1 (or whatever)
and the "real name" we want for it

If you close this window when it is in the "Save As" mode (for e.g. TextEdit), it is still treated as
the child_window...

»*/

//Imports«

import { util, api as capi } from "util";
import { globals } from "config";

const {getAppIcon}= capi;
const{NS, FS_TYPE, FOLDER_APP}=globals;
const{poperr} = globals.widgets;
const{make,mkdv,mk,mksp,log,cwarn,cerr}=util;
const {fs}=NS.api;

//»

export const app = function(Win) {

//Var«

const {Main, Desk, status_bar} = Win;

const statbar = status_bar;

const {Icon} = Desk.api;

let path;
let num_entries = 0;
let picker_mode;

//»

//DOM«


let savebut, canbut;
let dd = mkdv();
dd._pos = 'absolute';
dd._bor = '1px solid white';
dd._bgcol = 'gray';
dd._op = 0.5;
dd._loc(-1, -1);
dd._w = 0;
dd._h = 0;
Main._add(dd);

Main._overy="auto";
Main._overx="hidden";

const icondv = mkdv();
icondv.id=`icondiv_${Win.id}`;
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
Win.drag_div = dd;
Win.icon_div = icondv;
Main.icon_div = icondv;

let num_div = mkdv();
let cur_div = mkdv();
let cur_sp = mksp();
let MAX_WID = 100;
cur_div._add(cur_sp);
cur_div.style.maxWidth = `${MAX_WID}px`;
cur_div._over="hidden";
let mess_div = mkdv();
statbar._w = "100%";
statbar._dis="flex";
statbar.style.justifyContent="space-between";
statbar._add(mess_div);
statbar._add(cur_div);
statbar._add(num_div);

//»

//Var«

let save_input;
let tab_order;
let prev_paths;

let is_loading = false;
let drag_timeout;
let dir;
let kids;
let curnum;
let observer;

this.show_hidden = false;

//»

//Funcs«

//Util«

const stat_num=()=>{//«
	if (!num_entries) _stat_num("Empty");
	else if (num_entries==1) _stat_num("1 entry");
	else _stat_num(`${num_entries} entries`);
};
const _stat_num=(s)=>{num_div.innerHTML = `${s}\xa0`;};
//»
const stat_mess=()=>{//«
	let mess_str="";
	if (dir.fullpath!="/") mess_str = "\xa0[<b>b</b>]ack ";
	if (prev_paths&&prev_paths[0]) mess_str += "[<b>f</b>]orward";
	else prev_paths = undefined;
	mess_div.innerHTML = mess_str;
};//»
const stat_cur=(s)=>{cur_sp.innerHTML = s;};
const zero_cursor=()=>{//«
	if (!(Win.cursor&&Win.cursor.ison())) return;
	Win.cursor.zero();
}//»
const handle_save_tab=s=>{//«
	let act = document.activeElement;
	let ind = tab_order.indexOf(act);
	if (s.match(/_S$/)) ind--;
	else ind++;
	if (ind < 0) ind = tab_order.length-1;
	else if (ind == tab_order.length) ind = 0;
	tab_order[ind].focus();
};//»
const do_save = ()=>{//«

//EJMNCYLKIFB
	if (!Win.saver) return;
	Win.saver.cb(Win);
	Win.saver=null;

};//»

//»

const go_back = ()=>{//«
	if (path.match(/^\x2f+$/)) return;

	let arr = path.split("/");
	arr.pop();
	if (!prev_paths) prev_paths=[Win.fullpath];
	else prev_paths.unshift(Win.fullpath);
	let opts = {PREVPATHS: prev_paths, WINARGS: {}};
	Win.setWinArgs(opts.WINARGS);
	if (Win.saver) {
		opts.SAVER = Win.saver;
	}
	Win.easyKill();
	Desk.open_file_by_path(arr.join("/"), null, opts);
};//»
const go_forth=()=>{//«
	if (!prev_paths) return;
	let goto_path = prev_paths.shift();
	if (!goto_path){
cwarn("Cannot go forward with goto_path ===", goto_path);
		return;
	}
	if (!prev_paths.length) prev_paths = undefined;
	let opts = {PREVPATHS: prev_paths, WINARGS: {}};
	Win.setWinArgs(opts.WINARGS);
	if (Win.saver) {
		opts.SAVER = Win.saver;
	}
	Win.easyKill();
	Desk.open_file_by_path(goto_path, null, opts);
};//»

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
		else if (!(d.icon && d.icon.isOn)) {
			d.hide();
			if (d.icon && d.icon.win){
				delete d.icon.win.icon;
			}
		}
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
//		icn._pos="relative";
		icn.parWin = Win;
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

const make_save_dom = ()=>{//«

picker_mode = true;
Win.title = `Save\xa0Location\xa0:\xa0'${Win.title}'`;
let botdiv = Win.bottom_div;
let both = botdiv.getBoundingClientRect().height-4;

let sp = mk('span');
sp._marl=5;
sp._fs=18;
sp.innerHTML="Save As:\xa0";
let inp = mk('input');
let ext;
if (Win.saver.ext) {
	ext = mk('span');
	ext._marl = 2;
	ext.innerHTML = `.<i>${Win.saver.ext}</i>`;
}
inp.type="text";
inp.id = `${Win.id}_save_input`;
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
canbut = mk('button');
canbut._fw="bold";
canbut._bgcol="#dde";
canbut._marr=5;
canbut.innerText="Cancel";
canbut.style.cssFloat="right";
canbut._h = both;

Win._save_escape_cb=()=>{
	savebut.disabled = false;
};
savebut.onclick=()=>{
	Win.saver.cb(Win, inp.value);
	savebut.disabled = true;
};
canbut.onclick=()=>{
	Win.close_button.click();
};

botdiv._add(sp);
botdiv._add(inp);
botdiv._add(ext);
inp.style.outline="none";
inp.focus();
botdiv._add(canbut);
botdiv._add(savebut);
tab_order = [inp, savebut, canbut];

};//»

const reload = async(newpath)=>{//«
	if (is_loading) return;
	if (newpath) path = newpath;
	is_loading = true;
	Main.scrollTop=0;
	icondv.innerHTML="";
	await init(true);
	_stat_num(`${dir.kids._keys.length-2} entries`);
	if (Win.cursor) Win.cursor.set();
};//»

const init=(if_reinit)=>{//«

return new Promise(async(Y,N)=>{

	if (Win.saver) {
		make_save_dom();
	}
	if (!path) {
cwarn("No path given (Win._fullpath)");
		return;
	}
	dir = await fs.pathToNode(path);
	if (!dir) {
		if (path) poperr(`Directory not found: ${path}`);
		else cwarn("Opening in 'app mode'");
		return;
	}
	if (dir.fullpath=="/mnt") await fs.mountDir("www");

    if (!dir.done){//«
        _stat_num("Getting entries...");
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
    }//»
	else load_dir();

	if (dir.type!==FS_TYPE) {
		num_entries = Object.keys(dir.kids).length-2;
		stat_num();
	}
	stat_mess();
	Y();
});

}//»

//»

//OBJ/CB«

this.reload=reload;
this.get_context=()=>{//«
	let choices = [
		"Folder",()=>{Desk.make_new_icon(Win, FOLDER_APP)},
		"Text File"
	];  
	if (Win.saver) choices.push(null);
	else choices.push(()=>{Desk.make_new_icon(Win, "Text")});
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
};//»
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
this.onkeydown = (e,s) => {//«

if (save_input && (s=="TAB_" || s=="TAB_S")){
	handle_save_tab(s);
	return;
}

if (s=="r_") reload(path);
else if (s=="0_") zero_cursor();
else if (s=="b_"||s=="b_C") go_back();
else if (s=="f_"||s=="f_C") go_forth();
else if (s=="s_"||s=="s_C") do_save();

}//»
this.onkill = (if_reload, if_force) => {//«
	if (if_force){
		if (Win.saver) {
			Win.saver.cb(null, 1);
			Win.saver=null;
		}
	}
	icondv._del();
}//»
this.onresize = () => {//«

	let cur = Win.cursor;
	if (!cur) return;
	let icn = Main.lasticon;
	if (!icn) return;
	icn.iconElem.scrollIntoViewIfNeeded();
	cur.curElem._loc(icn.iconElem.offsetLeft+globals.CUR_FOLDER_XOFF, icn.iconElem.offsetTop+globals.CUR_FOLDER_XOFF);

}//»
this.onappinit=(arg, prevpaths)=>{//«
	Win.makeScrollable();
	prev_paths = prevpaths;
	path = arg;
	if (!path) cerr("No path in onappinit!");
	init();
};//»
this.update=()=>{_stat_num(`${dir.kids._keys.length-2} entries`);};
this.add_icon=(icn)=>{Main.scrollTop=0;};
this.stat=stat_cur;

//»

}







/*Old«

Removed from onkeydown
else if (s==="TAB_"){

if (savebut) {
e.preventDefault();
let act = document.activeElement;

if (act===savebut) canbut.focus();
else {
	savebut.focus();
}
}
}

»*/

