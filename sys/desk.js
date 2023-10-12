
/*«

Two folders on the desktop: har and zlar.
I opened up har, and minimized it.
I moved the har icon into zlar.
I then moved the icon from zlar back onto the desktop.
Upon double-clicking har, I expected it to be unminified, but instead another folder named har
was openened...

This was fixed @TEIOPLKJHY (by removing the .icon property of the icon's associated window, at
it's own .win property), but this introduces the problem in the cases where the icons
are "returned" as NO_MOVE_ICONS because they are being edited or just don't have the permission
to move.

This was fixed @EMKIOFDPM (by checking for the existence of the .win property on each icon of 
NO_MOVE_ICONS, and then setting the .icon property of the .win property to the given icon).

»*/
//«

/*«Test for tiling mode
(async()=>{

let subw=2;
let subh=38;
let vals=[
	[238,295,17,50,"None"],
	[775,144, 425, 15],
	[218, 307, 879, 206,"None"],
	[718, 145, 93, 382],
//	[368, 156, 889, 525],
//	[518, 206, 15, 475]
];
if (tiling_mode) return;
if (layout_mode) toggle_layout_mode();
for (let v of vals){
open_app(v[4]||TERMINAL_APP, {force: true, winArgs: {X:v[2],Y:v[3],WID:v[0]-subw,HGT:v[1]-subh}});
}
toggle_layout_mode();
toggle_tiling_mode();
})();

»*/

//»

//Imports«

import { util, api as capi } from "./util.js";
import {FS as fsmod} from "./fs.js";
import { globals } from "./config.js";
//«
const{
	isMobile,
	qObj,
	NS, 
		
	FS_PREF,
	FS_TYPE, 

	USERNAME,
	HOME_PATH,
	DESK_PATH,

	FOLDER_APP,
	TEXT_APP,
	TERMINAL_APP,
	IMAGE_APP,
	MEDIA_APP,

	APPICONS,
	VIEWONLY_APPS,
	TEXT_EXTENSIONS,
	MEDIA_EXTENSIONS,
	IMAGE_EXTENSIONS,
	ALL_EXTENSIONS,
	ALL_EXTENSIONS_RE,
	TEXT_EDITOR_APP,
	DEF_BIN_OPENER,
	WRITING_APPS,

	ABOUT_STR,
	BACKGROUND_IMAGE_URL,
	DESK_GRADIENT
}=globals;

//»
const{KC,center,isnum,isobj,isarr,isint,isstr,mkdv,mksp,mkbut,make, log, cwarn, cerr}=util;
const {dist,getNameExt,getKeys}=capi;
const NUM=Number.isFinite;

//»

//Desk«

//new Desk(){«
  new   (function(){
//»

//Var«

const Desk = this;
const body = document.body;
let fs, fsapi;
let pathToNode;
const NOOP=()=>{}
//Flags/Modes«
let debug_localstorage=false;
let show_desktop_during_win_cycle = true;
let win_cycle_wins_hidden = false;
//let folders_open_in_same_window = false;
let folders_open_in_same_window = true;
let tiling_mode = false;
let layout_mode = false;
//let DEF_NO_DELETE_ICONS = true;
let DEF_NO_DELETE_ICONS = false;
let PREV_DEF_ALL_KEYS = false;
let CYCLE_MIN_WINS = true;
let cur_showing = false;
let taskbar_hidden;
let taskbar_expert_mode;

let have_window_cycle = false;
let debug_keydown = false;
//if (qObj.debug_keydown) debug_keydown = true;
let noevents = false;
let cmenu_active = true;
//if (qObj.nocontext) cmenu_active = false;
let	windows_showing = true;
let window_chrome_mode = true;
let alt_is_up=false;

//»
//DOM Elements/Objects/Arrays«
let CPR;
let CWIN;
let taskbar;
//let CUR;
//const CUR = mkdv();
const desk = mkdv();
const desk_coldiv=mkdv();
const desk_imgdiv=mkdv();
//const taskbar = mkdv();
const start_button=mkdv();
const tiling_underlay = mkdv();
//const minwinbar = mkdv();

//A "fake" window object that gets put into the window stack during
//keyboard window cycling when show_desktop_during_win_cycle=true.
const NOWINDOW={elem:{}, winElem:{}};

let overlay;

let CWIN_HOLD;
let CWCW;
let ICONS=[];
let CDL;
let CDICN, CDW, CRW, CEDICN;
let CRWINS;
CDW = CDICN = CRW = CEDICN = null;
let DDD;
let CG;
let windows = [];

//»
//String/Regex constants/vars«

const RE_SP_PL = / +/,
	RE_SP_G = / /g;
//»
//JS Objects«
let desk_menu;
const api={};
Desk.api=api;
//let win_overflow={t:0,b:1,l:1,r:1};
let win_overflow={top:0,bottom:0,left:0,right:0};
let keysym_map, keysym_funcs;
let std_keysym_map={
	"f_A":{"n":"fullscreen_window"},
//	"f_CA":{"n":"open_root_folder"},
	"f_CA":{"n":"make_folder"},
	"`_A":{"n":"window_cycle"},
	"x_A":{"n":"close_window"},
	"m_A":{"n":"maximize_window"},
	"d_A":{"n":"toggle_desktop"},
	"l_CA":{"n":"toggle_layout_mode"},
	"w_CA":{"n":"toggle_win_chrome"},
	"n_A":{"n":"minimize_window"},
//	"f_CAS":{"n":"toggle_fullscreen"},
	"b_A":{"n":"toggle_taskbar"},
	t_A:{n:"open_terminal"}
};

//»
//Style/CSS Values«

let TASKBAR_BOR_COL="#575757";
let TASKBAR_BOR_WID="2.5px";

let MIN_WIN_OP=1;

//Making this negative is a trivial way to "deactivate" the desktop because
//the mouse event handlers can't the called. For some reason, the icon 
//cursor doesn't even work in this case!
let DESK_Z = 0;

//The "Click Guard" is a child of the desktop, and is turned on whenever
//there is a context menu or an icon's label is being edited.
//Windows "should never" be able to reach this level!
let CG_Z = 9999999;

let ICON_Z = 1;

//Certain desktop elements might want to position themselves against the
//lowest window in the stacking order
let MIN_WIN_Z = 10;

//The active window will have this zIndex. This keeps getting raised when
//a window is clicked on or is brought to the top via window_cycle()
//(It might be good to somehow "restack" the windows).
let	HI_WIN_Z = MIN_WIN_Z;

const SAVEAS_BOTTOM_HGT = 30;

let APP_BG_COL = "#271313";

const TASK_BAR_COL_RGB="8,8,24";
//let DEF_DESK_GRADIENT = "linear-gradient(135deg,#000 0%,#003 50%,#006 75%,#000077 87%,#33c 100%)";
//let DEF_DESK_GRADIENT = DESK_GRADIENT;
const TASKBAR_BG_COL=`rgb(${TASK_BAR_COL_RGB})`;
const TASKBAR_BOR=`2px outset rgba(0,0,0,0.75)`;
const MIN_WIN_LIN_GRAD  =`linear-gradient(90deg, rgba(${TASK_BAR_COL_RGB},0) 90%, rgba(${TASK_BAR_COL_RGB},1) 97%)`;
let OVERLAYOP = "0.5";
let TASKBAR_OP=1;

//In Folder.js, Main._pad= 5. We need this value here so the icon selection cursor will line up right.
let CUR_FOLDER_XOFF = 5;
let CUR_FOLDER_YOFF = 5;

let DEF_BG_IMG_OP = 0.3;
let DESK_ICON_BOR = "2px dotted rgba(255,255,64,0.66)";
let DESK_ICON_BG = "rgba(255,255,200,0)";
let FOLDER_ICON_BOR = DESK_ICON_BOR;
let FOLDER_ICON_BG = DESK_ICON_BG;
let FOLDER_ICON_CUR_BOR = "2px solid #000";

let CURBORWID=1;

let CURBORSTY="solid";//dotted dashed solid double groove ridge inset outset none hidden 
let CURBORCOL="#fff";
let CURBGCOL="rgba(0,0,0,1)";

let WIN_CYCLE_CG_OP = 0;
let WINBUT_OFF_COL = "#778";
let WINBUT_ON_COL = "#bba";
let WIN_COL_ON="#2a2a3a";
let WIN_COL_OFF="#232333";
let WINNAME_COL_ON=WINBUT_ON_COL;
let WINNAME_COL_OFF=WINBUT_OFF_COL;

let hidden_taskbar_thresh;
const STEP_MODE_DESK_OP=0.5;

//When dragging icons around, a large enough value here insures that the 
//"n items->" label keeps showing.  If you are moving the mouse very fast, the
//pointer can go over the label and trigger an event to make it disappear and
//think that you've "dropped" your payload.
let CDL_OFFSET=5;

let ICON_OP_MS=250;

let MIN_WIN_ON_COL="#ddd";
let MIN_WIN_OFF_COL="gray";

const DRAG_IMG_OP = 0.66;

//Used in the math to determined how fast 
//icons move to the new locations.
//Larger numbers make the icons faster.
let ICON_MOVE_FACTOR = 1200;
//let ICON_MOVE_FACTOR = 200;

//This unused variable has sentimental value.
const MAC_ICON_PURPLE="#8c4eb8";

const DEF_CG_OP = 0;

let ICON_DIM = 44,
	TITLE_DIM = 16,
	FOLDER_GRID_W = 5,
	win_move_inc = 50,
	win_move_inc_small = 5,
	win_resize_inc = 50,
	win_resize_inc_small = 5,
	min_win_width = 86,
	min_win_hgt = 50

let desktop_bgcol = "#000",
	mainwin_bgcol = "#fff",
	mainwin_tcol = "#000",
	desk_icon_label_col = "rgba(0,0,0,0.42)",
	desk_icon_font_col = "#fff",
	menubar_bg_color = "#e8e8e8",

	window_boxshadow = "3px 3px 20px rgba(255,255,255,0.10)",
//	window_boxshadow = "",
	window_boxshadow_hold;

let folder_grid_start_x = 20,
	folder_grid_start_y = 5,
	desk_grid_start_x = 25,
	desk_grid_start_y = 40

let	IGSX = 100, IGSY = 100;

let DESK_GRID_W;
let DESK_GRID_H;

let MAX_OVERLAY_LENGTH = 42;

//»
//Init Events & Values«

let	ev = null;

let DDIE, WDIE, DDX, DDY;
let drag_timeout;
DDIE=WDIE=DDX=DDY=null;

//»
//Timers/Counters/Numbers/Amounts«

let overlay_timer;
let num_minimized_wins=0;
let nowindow_pos;
let num_tiled_wins;
let MAX_TILED_WINS_FOR_RESIZING=4;
let win_num = 0;
let icon_num = 0;
let VERNUM=1;
let OVERLAY_MS = 1500;
let WIN_MIN_TRANS_SECS="0.25";
let TASKBAR_TRANS_SECS = 0.125;

let MS_BETWEEN_BIG_FOLDER_BATCHES = 0;
let BIG_FOLDER_BATCH_SIZE = 1000;
let MAX_FILE_SIZE = 1024*1024;
let SHOW_TASKBAR_DELAY = 250;
let num_win_cycles = 0;
const RS_TIMEOUT = 300;
let rs_timer = null;
let taskbar_timer;
let alt_tab_presses = 1;
let tilde_press = 0;

//»
//Protos/Props«
let CDA = null;
Object.defineProperty(this,"CDA",{
	get:()=>{
		return CDA;
	},
	set:(icn)=>{
		CDA = icn;
		if (CDA == null) return;
		CDA._z = CG_Z-1;
		desk._add(CDA);
//		CDA.onmousemove=desk.onmousemove;
//CDA.addEventListener('mousemove', desk.onmousemove);
	}

});
Object.defineProperty(Object.prototype,'_keys',{get:function(){return Object.keys(this);},set:function(){}});
Object.defineProperty(Object.prototype,'_vals',{get:function(){let arr=[];let keys=Object.keys(this);for(let k of keys){arr.push(this[k]);}return arr;},set:function(){}});
Object.defineProperty(this,"CWIN",{get:()=>CWIN});
Object.defineProperty(this,"WINS",{get:()=>windows});

{

const doParseNumber = (thisarg, opts, if_float) => {//«
	if (thisarg.match(/^0+$/)) thisarg="0";
	const dec = /^([-+])?[0-9]+(e[-+]?([0-9]+))?$/i,
		dec_dot = /^([-+])?([0-9]+)?\.[0-9]*(e[-+]?([0-9]+))?$/i,
		hex = /^([-+])?0x[0-9a-f]+$/i,
		oct = /^([-+])?0o[0-7]+$/,
		bin = /^([-+])?0b[01]+$/;
	let MIN = -Infinity;
	let MAX = Infinity;
	let KEYS = ["POS", "NEG", "NOTNEG", "NOTPOS", "NOTZERO", "MIN", "MAX", "DOTOK"];
	let val;
	let str;
	if (!opts) opts = {};
	for (let k of Object.keys(opts)) {
		if (!KEYS.includes(k)) throw new Error("Invalid option:" + k);
	}
	if (Number.isInteger(opts.MIN)) MIN = opts.MIN;
	else if (opts.MIN) throw new Error("Invalid value to MIN:" + opts.MIN);
	if (Number.isInteger(opts.MAX)) MAX = opts.MAX;
	else if (opts.MAX) throw new Error("Invalid value to MAX:" + opts.MAX);

	if (thisarg.match(dec) || thisarg.match(dec_dot)) {
		if (thisarg == "0") str = thisarg;
		else str = thisarg.replace(/^0+/, "");
	} else str = thisarg;
	if (str.match(dec) || str.match(hex) || str.match(oct) || str.match(bin)) val = eval(str);
	else {
		if ((if_float || opts.DOTOK) && (str.match(dec_dot))) {
			if (if_float) val = eval(str);
			else val = Math.floor(eval(str));
		} else return NaN;
	}
	if (opts.POS && val <= 0) return NaN;
	if (opts.NEG && val >= 0) return NaN;
	if (opts.NOTNEG && val < 0) return NaN;
	if (opts.NOTPOS && val > 0) return NaN;
	if (opts.NOTZERO && val == 0) return NaN;
	if (val < MIN) return NaN;
	if (val > MAX) return NaN;
	return val;
};//»
const set_style_props = (which, arr) => {//«
	for (var i = 0; i < arr.length; i += 2) {
		(function(k, v) {
			Object.defineProperty(which.prototype, k, {
				get: function() {
					var val = this.style[v];
					if (k.length == 2) {
						return parseInt(val);
					}
					return val;
				},
				set: function(arg) {
					this.style[v] = arg;
				}
			});
		})(arr[i], arr[i + 1]);
	}
}//»
set_style_props(HTMLElement,//«
[

"_fs","fontSize",
"_fw","fontWeight",
"_tcol","color",
"_bgcol","backgroundColor",
"_pad", "padding",
"_padt", "paddingTop",
"_padb", "paddingBottom",
"_padl", "paddingLeft",
"_padr", "paddingRight",
"_mar", "margin",
"_mart", "marginTop",
"_marb", "marginBottom",
"_marl", "marginLeft",
"_marr", "marginRight",
"_bor", "border",
"_pos","position",
"_dis","display",
"_op", "opacity",
"_ta", "textAlign",
"_ff", "fontFamily",
"_over", "overflow",
"_overx", "overflowX",
"_overy", "overflowY",
"_x","left", 
"_y","top",
"_r","right",
"_b","bottom",
"_z", "zIndex",
"_w","width",
"_h", "height"
]);//»
set_style_props(SVGElement,//«
[
"_op","opacity",
"_dis","display"
]);//»

Blob.prototype.toString = function() {return '[Blob ('+this.size+', "'+this.type+'")]';}

let _;
_ = HTMLElement.prototype;
_._loc=function(x,y){if(x !=0 && !x)return{X:this.style.left,Y:this.style.top};else{this.style.left=x;this.style.top=y;}}
_._del = function(){if (this.parentNode) {this.parentNode.removeChild(this);}}
_._add=function(...args){for(let kid of args)this.appendChild(kid);}
_._gbcr=function(){return this.getBoundingClientRect()}

_.ael = function(which, fun){this.addEventListener(which, fun, false);}
_.html = function(str) {this.innerHTML = str;}
_.vcenter=function(amount){if(!amount)amount="50%";this._pos="relative";this._y=amount;this.style.transform="translateY(-"+amount+")";}
_.flexcol=function(if_off){if(if_off){this.style.display="";this.style.alignItems="";this.style.justifyContent="";this.style.flexDirection="";}else{this.style.display="flex";this.style.alignItems="center";this.style.justifyContent="center";this.style.flexDirection="column";}}
_.scrollIntoViewIfNeeded || (_.scrollIntoViewIfNeeded = _.scrollIntoView);

_ = String.prototype;
_.regstr=function(useend){var endsp="";if(useend)endsp=" ";return this.replace(/^[\x20\t]+/g,"").replace(/[\x20\t]+$/g,endsp).replace(/[\x20\t]+/g," ");}
_.rep = function (num) {var ret = "";for (var i=0; i < num; i++) {ret = ret + this;}return ret;}
_.lc = function (){return this.toLowerCase();}
_.uc = function (){return this.toUpperCase();}
_.tonbsp = function(){return this.split(/\x20/).join("&nbsp;")}
_.chomp = function () {return this.replace(/\x20+$/g, "");}
_.lpad=function(num,fill){var tmp;if(this.length<num)return fill.repeat(num-this.length)+this;return this;}
_.pi = function(opts) {return doParseNumber(this, opts);}//ParseInt
_.pir=function(lo,hi){if(!(Number.isFinite(lo)&&Number.isFinite(hi)&&hi>lo))throw new Error("Invalid arguments to String.pir");return doParseNumber(this,{MIN:lo,MAX:hi});}//ParseIntRange "15".pir(10,20) => 15 , "15".pir(0,10) => NaN
_.ppi=function(opts){if(!opts)opts={};opts.POS=true;return doParseNumber(this,opts);}//ParsePositiveInt
_.pnni=function(opts){if(!opts)opts={};opts.NOTNEG=true;return doParseNumber(this,opts);}//ParseNonNegativeInt
_.pf=function(opts){return doParseNumber(this,opts,true);}//ParseFloat

_=SVGElement.prototype;
_.ael = function(which, fun){this.addEventListener(which, fun, false);}
_.add=function(...args){for(let kid of args)this.appendChild(kid);}
_.del = function() {if (this.parentNode) this.parentNode.removeChild(this);}
}
//»

//»
//Main Context Menu«
const DESK_CONTEXT_MENU=[
	"\u{1f381}\xa0\xa0New",[
		"Folder",
		()=>{make_new_icon(desk, FOLDER_APP)},
		"Text File",
		()=>{make_new_icon(desk, "Text")}
	],
	"\u{1f4ca}\xa0\xa0About",()=>{make_popup({WIDE:true,STR: ABOUT_STR, TIT: "About"});},
	"\u{1f5b3}\u{2009}\xa0Terminal",()=>{open_terminal()},
	'\xa0<span style="font-size: 21px;"><b>\u{2442}</b></span>\xa0\xa0\xa0\xa0Fork\xa0me!',()=>{
		window.open("https://github.com/linuxontheweb/linuxontheweb.github.io/");
	},
];
//»

//Desktop«

const fit_desktop = ()=>{//«
	let _h = winh(true)+1;
	let _w = winw()+1;
	let str = `${_w} ${_h}`;
	desk._w= _w;
	desk._h = _h;
	desk.style.backgroundSize = str;
	desk_coldiv._w= _w;
	desk_coldiv._h = _h;
	desk_coldiv.style.backgroundSize = str;
	desk_imgdiv._w= _w;
	desk_imgdiv._h = _h;
	desk_imgdiv.style.backgroundSize = str;
	CG._w= _w;
	CG._h = _h;
	get_desk_grid();
};//»
const set_desk_styles = () => {//«
	desk._tcol= "#000";//Main desktop layer«
	desk._pos= "relative";
	desk._over= "auto";
	desk._w = winw()+1;
	desk._h = winh()+1;
	desk._z= DESK_Z;
	desk.style.backgroundSize = winw() + " " + winh();
//»
	desk_coldiv._pos= "absolute";//Color layer (solid or gradient)«
	desk_coldiv._loc(0, 0);
	desk_coldiv._w= winw()+1;
	desk_coldiv._h = winh()+1;
	desk_coldiv._z= DESK_Z - 3;
	desk_coldiv.style.backgroundSize = winw() + " " + winh();
	desk_coldiv.id="bg_color_div";
//»
	desk_imgdiv._pos= "absolute";//Image layer«
	desk_imgdiv._loc(0, 0);
	desk_imgdiv._w= winw();
	desk_imgdiv._h = winh();
	desk_imgdiv._z= DESK_Z - 2;
	desk_imgdiv.style.backgroundSize = winw() + " " + winh();
	desk_imgdiv.style.backgroundRepeat="no-repeat";
	desk_imgdiv.style.backgroundPosition="center";
	if (!qObj.nobgimg) desk_imgdiv.style.backgroundImage=`url("${BACKGROUND_IMAGE_URL}")`;
	desk_imgdiv._op = DEF_BG_IMG_OP;
	desk_imgdiv.id="bg_image_div";
//»
	DDD = make('div');//Desk Drag Div = The icon "lasso"«
	DDD._pos= 'fixed';
	DDD._bor= '1px solid white';
	DDD._bgcol= 'gray';
	DDD._op= 0.5;
	DDD.id="icon_lasso";
	DDD._loc(-1, -1);
	DDD._w= 0;
	DDD._h = 0;
	desk._add(DDD);
//»
	CG = make('div');//Click Guard«
	CG.id = 'click_guard';
	CG._dis= 'none';
	CG._pos= "fixed";
	CG._loc(0, 0);
	CG._z= CG_Z;
	CG._bgcol= "#000";
	CG._w= "100%";
	CG._h = "100%";
	CG._op= DEF_CG_OP;
	CG.on = useop => {
		if (NUM(useop)) CG._op= useop;
		else CG._op= DEF_CG_OP;
		CG._dis= "block";
	};
	CG.off = () => {
		CG._dis= "none";
	};
	CG.onclick = focus_editing;
	CG.ondblclick = focus_editing;
	CG.onmousedown = e => {
		if (desk_menu) {
			e.stopPropagation();
			return desk_menu.kill();
		}
		focus_editing(e);
	};
	CG.onmouseup = focus_editing;
	CG.oncontextmenu = focus_editing;
	CG.onmousemove = nopropdef;
//»
	overlay=(()=>{//«
		let fakediv = make('div');
		fakediv.innerHTML = '<div style="opacity: '+OVERLAYOP+';border-radius: 15px; font-size: xx-large; padding: 0.2em 0.5em; position: fixed; -webkit-user-select: none; transition: opacity 180ms ease-in; color: rgb(16, 16, 16); background-color: rgb(240, 240, 240); font-family: monospace;"></div>';
		return fakediv.childNodes[0];
	})();
	overlay._z=CG_Z+1;
//»
//Tiling underlay«
{
	let tul = tiling_underlay;
	tul._bgcol="#000";
	tul._dis="block";
	tul.id="tiling_underlay";
	tul._z=ICON_Z+1;
	tul._pos="fixed";
	tul.onmousedown=e=>{
e.stopPropagation();
e.preventDefault();

	};
	tul.onmousemove=e=>{
//e.stopPropagation();
//e.preventDefault();

		if (CRW) {
//log(e);
			handle_resize_event(e);
		}

	};

	tul.oncontextmenu=nopropdef;
	tul.ondblclick=nopropdef;
//	tul.dims(0,0);
	tul._w=0;
	tul._h=0;
	tul._loc(0,0);
//log(tul);
	tul.on=()=>{
		tul._w=winw();
		tul._h=winh();
	};
	tul.off=()=>{
		tul._w=0;
		tul._h=0;
	};
}
//»

	desk._add(tiling_underlay);
	desk._add(CG);
	body._add(desk);
	body._add(desk_coldiv);
	body._add(desk_imgdiv);
}
//»
const set_desk_events = () => {//«

	let didleave = false;
	let on = () => {
		if (!CDL) return;
		CDL.into(desk.name);
	};
	let off = () => {
		if (!CDL) return;
		CDL.reset();
	};
	desk.onmousemove = e => {//«

		ev = e;
		if (CDL) {//«
if (!ICONS[0]){
CDICN = null;
cldragimg();
return;
}
			if (e.clientX+CDL.clientWidth+CDL_OFFSET-winx() > winw()){
				CDL._x="";
				CDL._r= winw()-e.clientX+winx();
			}
			else{
				CDL._r="";
				CDL._x=e.clientX+CDL_OFFSET-winx();
			}

			if (e.clientY+CDL.clientHeight+CDL_OFFSET-winy() > winh()){
				CDL._y="";
				CDL._b= winh()-e.clientY+winy();
			}
			else {
				CDL._b="";
				CDL._y=e.clientY+CDL_OFFSET-winy();
			}
		}//»
		else if (CDA){
let r = CDA.getBoundingClientRect();
			CDA._loc(e.clientX+(CDA._offx), e.clientY-(r.height+CDA._offy));
		}
		else if (CRW) handle_resize_event(e);
		else if (CDW) {//«
			let x = e.clientX-DDX;
			let y = e.clientY-DDY;
			let elm = CDW.winElem;
			if (x<0) {
				if (!win_overflow.left) {
					DDX+=x;
					x = 0;
				}
			} 
			else {
				let dx = x + elm.offsetWidth - winw();
				if (dx > 0 && !win_overflow.right) {
					x -= dx;
					DDX+=dx;
				}
			}
			if (y<0) {
				if (!win_overflow.top) y = 0;
			} 
			else {
				let dy = y + elm.offsetHeight - winh();
				if (dy > 0 && !win_overflow.bottom) y -= dy;
			}
			elm._loc(x, y);
			if (CDW.movediv) CDW.movediv.update();
		}//»
		else if (DDIE) {//«
			clearTimeout(drag_timeout);
			if (DDIE.clientX < e.clientX) {
				DDD.style.right = "";
				DDD._x= DDIE.clientX-winx();
				DDD._w= e.clientX - DDIE.clientX;
			} else {
				DDD.style.left = "";
				DDD.style.right = winw() - DDIE.clientX+winx();
				DDD._w= DDIE.clientX - e.clientX;
			}
			if (DDIE.clientY < e.clientY) {
				DDD.style.bottom = "";
				DDD._y= DDIE.clientY-winy();
				DDD._h = e.clientY - DDIE.clientY;
			} else {
				DDD.style.top = "";
				DDD.style.bottom = winh(true) - DDIE.clientY+winy();
				DDD._h = DDIE.clientY - e.clientY;
			}
drag_timeout = setTimeout(()=>{
	select_icons_in_drag_box_desk(e);
},0);
		}//»
		else if (WDIE) {//«
			clearTimeout(drag_timeout);
			let w = CWIN;
			if (!w){
				WDIE = null;
				return;
			}
			let m = w.main;
			let scrtopdiff = m.scrollTop - WDIE.scrtop;
			let scrleftdiff = m.scrollLeft - WDIE.scrleft;
			let d = w.drag_div;
			if (!d){
				WDIE = null;
				return;
			}
			let x_scroll_diff = m.offsetWidth - m.clientWidth;
			let y_scroll_diff = m.offsetHeight - m.clientHeight;
			let gotw;
			let goth;
			if (WDIE.clientX < e.clientX) {
				d.style.right = "";
				d._x= WDIE.clientX - w.winElem.offsetLeft + m.scrollLeft - scrleftdiff - winx();
				gotw = e.clientX - WDIE.clientX + scrleftdiff;
				if (gotw > WDIE._maxWidth) gotw = WDIE._maxWidth;
				d._w= gotw;
			} else {
				d.style.left = "";
				d.style.right = w.main._w - (WDIE.clientX - w.winElem.offsetLeft + m.scrollLeft) - x_scroll_diff + scrleftdiff + winx();
				d._w= WDIE.clientX - e.clientX - scrleftdiff;
			}
			if (WDIE.clientY < e.clientY) {
				d.style.bottom = "";
				d._y= WDIE.clientY - w.winElem.offsetTop - w.titlebar._h + m.scrollTop - scrtopdiff-winy();
				d._h = e.clientY - WDIE.clientY + scrtopdiff;
			} else {
				d._y= e.clientY - m.getBoundingClientRect().top + m.scrollTop;
				d._h = WDIE.clientY - e.clientY - scrtopdiff;
			}
			drag_timeout = setTimeout(()=>{w.select_icons();},0);
		}//»
		else if (!taskbar_expert_mode){//«
			if (CWIN&&CWIN.is_fullscreen) return;
			if (e.clientY+hidden_taskbar_thresh >=window.innerHeight){
				if (taskbar_hidden){
					if (taskbar_timer) return;
					taskbar_timer = setTimeout(()=>{
						taskbar.taskbarElem._b=0;
					}, SHOW_TASKBAR_DELAY);
				}
				else {
					if (taskbar_timer) return;
					taskbar_timer = setTimeout(()=>{
						taskbar.taskbarElem._z=CG_Z-1;
					}, SHOW_TASKBAR_DELAY);
				}
			}
			else {
				if (taskbar_hidden){
					if (taskbar_timer){
						clearTimeout(taskbar_timer);
						taskbar_timer=null;
						return;
					}
					taskbar.taskbarElem._b=-taskbar.taskbarElem._gbcr().height;
				}
				else {
					if (taskbar_timer){
						clearTimeout(taskbar_timer);
						taskbar_timer=null;
						return;
					}
					taskbar.taskbarElem._z = MIN_WIN_Z - 1;
				}
			}
		}//»

	};//»
	desk.onmouseup = async e => {//«
		e.preventDefault();
		e.stopPropagation();
		body.style.cursor = "default";
		desk.style.cursor = "default";
		DDIE = null;
		DDD._loc(-1, -1);
		DDD._w= 0;
		DDD._h = 0;
		ev = e;
		if (CDICN) {
			cldragimg();
			desk.style.cursor = "";
			if (document.elementFromPoint(e.clientX,e.clientY)!==desk){
				CDICN = null;
				return;
			}
			if (CDICN.parWin == desk) { /*Back where we started:just move icon*/
				let proms = [];
//				for(let i=0;i<ICONS.length;i++)icon_off(ICONS[i]);
				for(let i=0;i<ICONS.length;i++) ICONS[i].off();
				CG.on();
				let pos={X:e.clientX+desk.scrollLeft,Y:e.clientY+desk.scrollTop};
				proms.push(placeInIconSlot(CDICN, {pos:pos, noClear: true}));
				CDICN.moved = true;
				for (let i = 0; i < ICONS.length; i++) {
					let icn = ICONS[i];
					if (ICONS[i] != CDICN) {
						proms.push(placeInIconSlot(icn, {pos:pos, noClear: true}));
					}
				}
				await Promise.all(proms);
				ICONS = [];
				CG.off();
			}
//			else if (CDICN.parWin.fullpath == desk.fullpath) no_move_all_icons();
			else if (CDICN.parWin.fullpath != desk.fullpath) {
				await move_icons(DESK_PATH, {e});
				CDICN = null;
				return;
			}
			CDICN = null;
		}
		else if (CDW) {
			CDW.winElem.style.boxShadow = window_boxshadow;
			CDW = null;
		} else if (CRW) {
			delete CRW.rs_dir;
			delete CRW.startx;
			delete CRW.starty;
			update_and_clear_resize_wins();
		}
		else if (CDA){
//log("APP",CDA.app);
//CDA._z=ICON_Z;
//CDA._pos="absolute";
//cwarn("DROP CDA");
//let appname = CSA

//toggle_show_windows();
//CG.on();
//make_new_text_file(desk, `{"app":"${CDA.app}"}`, "txt", {name: CDA.app.split(".").pop()});
CDA._del();
let name = CDA.app.split(".").pop();
let path = `${globals.desk_path}/${name}.app`;
let gotnode = await pathToNode(path);
//log(gotnode);
if (!gotnode){
//log("WRITE TO",path);
let node = await fsapi.writeFile(path,`{"app":"${CDA.app}"}`, {noMakeIcon: true});
if (node){
make_icon(name, desk, {ext: "app", node , pos:{X:e.clientX, Y: e.clientY}});
}

}

CDA=null;
		}
	};//»
	desk.onmousedown = e => {//«
		e.preventDefault();
		if (CWIN) {
			CWIN.off();
			CWIN = null;
			CUR.todesk();
		}
		icon_array_off(2);
		if (e.button===0) DDIE = e;
//		desk.area.focus();
		CDICN = null;
	};//»
	desk.onclick = e => {//«
		if (!windows_showing) toggle_show_windows();
		if (desk.dblclick) delete desk.dblclick;
	};//»
	desk.ondblclick = e => {//«
//log(`${e.timeStamp} DBL`);
	};//»
	desk.onmouseleave = e => {//«
		if (document.elementsFromPoint(e.clientX,e.clientY).includes(desk)) return;
		body.style.cursor = "default";
		desk.style.cursor = "default";
		if (DDIE) desk_drag_off();
		cldragimg();
		update_and_clear_resize_wins();
/*«
		if (CRW && CRW.app) CRW.app.onresize();
		if (CRWINS){
			for (let win of CRWINS){
				win.status_bar.resize();
				win.app.onresize();
			}
		}
		CRW = null;
		CRWINS = null;
»*/
		CDICN = null;
		CDW = null;
		if (taskbar_hidden) taskbar.taskbarElem._b=-taskbar.taskbarElem._gbcr().height;
		else taskbar.taskbarElem._z=MIN_WIN_Z-1;
		if (taskbar_timer){
			clearTimeout(taskbar_timer);
			taskbar_timer=null;
		}
	};//»
	desk.onmouseout = e => {//«
		if (CDICN) {
			didleave = true;
			off();
			return;
		}
		if (CDL && CDL.clear) CDL.clear();
	};//»
	desk.onmouseover = e => {//«
		if (CDL && CDL.copyto) CDL.copyto("Desktop");
		if (!CDICN) {
			return;
		}
		if (CDICN.parWin === desk) return;
//		if (!IA.length && CDICN.path === DESK_PATH) return;
//		if (!IA.length && (capi.newPathIsBad(CDICN.fullpath, DESK_PATH + "/" + CDICN.name))) return;
		if (CDICN.path === DESK_PATH) return;
		if (capi.newPathIsBad(CDICN.fullpath, DESK_PATH + "/" + CDICN.name)) return;
		didleave = false;
		if (!CDICN) return;
		if (!didleave) on();
	};//»
	desk.oncontextmenu = e => {//«
		if (isMobile || e.altKey || !cmenu_active) return;
		e.preventDefault();
		e.stopPropagation();
		CWIN&&CWIN.off();
		let usex=e.clientX, usey=e.clientY;
		set_context_menu({
			X: usex,
			Y: usey
		});
	};//»
	desk.ondrop = async e => {//«
		e.preventDefault();
		save_dropped_files(e, desk);
	};//»

	desk.ondragover = async e => {//«
//log("desk over");
	};//»

};
//»
const make_desktop = () => {//«
	taskbar = new Taskbar();
	desk.fullpath = DESK_PATH;
	desk.name = DESK_PATH.split("/").pop();
	desk.id = "desktop";
	Desk.desk = desk;
	globals.desk_elem = desk;
	get_desk_grid();
	set_desk_styles();
	set_desk_events();
	if (qObj.bgcol) desk_coldiv._bgcol= `#${qObj.bgcol}`;
	else {
		desk_coldiv.style.backgroundImage=DESK_GRADIENT;
	}
/*
    return new Promise(async (Y,N)=>{//«
        if (await fsapi.pathToNode(USER_BG_COL_PATH)) {
            let arr = await fsapi.readFile(USER_BG_COL_PATH, {text: true});
            let text;
            if (isarr(arr) && isstr(arr[0])) text = arr[0];
            else return Y();
            if (text.match(/gradient/)) desk_coldiv.style.backgroundImage=text;
            else desk_coldiv._bgcol= text;
        }
        else desk_coldiv.style.backgroundImage=DEF_DESK_GRADIENT;
        Y();
    });//»
*/

}//»

//»
//Icons«

const Icon = function(node, elem, observer){//«

//DOM«
let d;
let icn = this;
if (elem) d = elem;
else {
	d = make("div");
	d.className="icon";
}
let iconelm = d;
d.iconElem = d;
d.icon = this;
let fullname = node.name;
let name = node.baseName;
let ext = node.ext;
let app;
let linkapp;
let islink=false;
if (node.kids) app=FOLDER_APP;
else if (node.appicon){
	try{app=JSON.parse(node.appicon).app;}
	catch(e){cerr(e);};
}
else if (node.link){
	app = node.ref.appName;
	islink = true;
}
else if (node.appName) app = node.appName;
else if (ext) app = capi.extToApp(ext.toLowerCase());
if (!app) app = "util.BinView";

if (app=="Application"&&node.ref&&node.ref.appicon){
	try{linkapp=JSON.parse(node.ref.appicon).app;}
	catch(e){cerr(e);};
}
//log("APP",app);
let ch = capi.getAppIcon(linkapp||app,{html:true});
d.innerHTML=`<span class="iconw"><span class="iconi">${ch}</span></span><div class="iconl">${name}</div>`;
d._z=ICON_Z;
let wrapper = d.childNodes[0];
wrapper.draggable=true;
wrapper.iconElem=d;


let label = d.childNodes[1];
label.iconElem = d;
label.title = name;
wrapper.childNodes[0].title = app;

//»

//Listeners«
//log();
if (node.appName !== FOLDER_APP) {//«
	wrapper.ondragover=nopropdef;
	wrapper.ondrop=e=>{
		e.stopPropagation();
		e.preventDefault();
		popup("Cannot drop files onto non-folders!");
	};
}//»
else {//«
let didleave;
let isopen = false;
let in_transit = false;
let not_allowed = false;
let on = () => {//«
	isopen = true;
	wrapper.style.cursor = "copy";
	if (!CDL) return;
	CDL.into(icn.name); 
	icn.imgdiv.innerHTML = '\u{2009}\u{1f4c2}';
};//»
let off = () => {//«
	if (in_transit) return;
	not_allowed=false;
	isopen = false;
	iconelm.style.cursor = "";
	wrapper.style.cursor="";
	if (!CDL) return;
	CDL.reset();
	icn.imgdiv.innerHTML = '\u{1f4c1}';
};//»
wrapper.onmouseover = e => {//«
	e.stopPropagation();
	if (!CDICN) return;
	if (CDICN === icn) return;
	if ((CDICN.path === icn.linkfullpath) || (capi.newPathIsBad(CDICN.fullpath, icn.linkfullpath + "/" + CDICN.name))) {
		not_allowed = true;
	}
	didleave = false;
	if (!CDICN) return;
	if (not_allowed) {
		CDL.nogo();
		wrapper.style.cursor = "not-allowed";
	}
	else if (!didleave) on();
};//»
wrapper.onmouseout = e => {//«
	off();
	if (CDICN === icn) return;
	e.stopPropagation();
	if (!CDICN) return;
	didleave = true;
};//»
wrapper.onmouseup = async e => {//«
	e.stopPropagation();
	if (CDICN) {
		icn.off(true);
		if (!ICONS.length) return;
		desk.style.cursor = "";
		if (not_allowed) {
			CDICN.shake();
		}
		if (!isopen) {
			CDICN = null;
			off();
			cldragimg();
			return;
		}
		let rect = iconelm._gbcr();
		in_transit = true;
		await move_icons(icn.fullpath, {loc:{X: rect.left, Y: rect.top}});
		in_transit = false;
		off();
		CWIN&&CWIN.off();
		if (icn.parWin !== desk) icn.parWin.on();
		CDICN = null;
		cldragimg();
		for (let icn of ICONS) icn.off();
		ICONS=[];
		if (icn.win) icn.win.app.reload();
		return;
	}
	if (DDIE) {
		DDIE = null;
		DDD._loc(-1, -1);
		DDD._w= 0;
		DDD._h = 0;
	}
	if (icn.parWin === desk) return;
	icn.parWin.clear_drag();
};//»
wrapper.ondragover=e=>{//«
	e.stopPropagation();
	e.preventDefault();
};//»
wrapper.ondrop=async e=>{//«
	e.stopPropagation();
	e.preventDefault();
	let win = await icn.openWin();
	await save_dropped_files(e, win);
};//»

}
//}//»
wrapper.ondragstart = e => {//«
	e.preventDefault();
	e.stopPropagation();
	if (globals.read_only) return;
	let par = iconelm.parentNode;
	CDICN = icn;
	CDL = make_cur_drag_img();
	if (par !== desk) par = par.parentNode; /*Sad but true(for now):origins are always the mainwin,NOT topwin OR icon_div*/
	desk.style.cursor = "grabbing";
	CDL._loc(e.clientX + CDL_OFFSET - winw(), e.clientY + CDL_OFFSET - winy());
	desk._add(CDL);
};//»
wrapper.onmousedown = e => {//«
	e.stopPropagation();
	if (e.button != 0) return;
	let par = icn.parWin;
	if (par === desk) {
		CWIN&&CWIN.off();
	}
	else par.on();
//	if (e.ctrlKey&&ICONS.includes(icn)) icon_off(icn,true);
	if (e.ctrlKey&&ICONS.includes(icn)) icn.off(true);
	else if (!ICONS.includes(icn)) {
		if (!e.ctrlKey) icon_array_off(18);
//		icon_on(icn,true);
		icn.on(true);
	}
};//»
wrapper.onclick = e => {//«
	e.stopPropagation();
};//»
wrapper.oncontextmenu = e => {//«
if (isMobile) return;
if (!e.isFake) nopropdef(e);
if (have_window_cycle) return;
let menu = [//«
"Rename", () => {
	setTimeout(() => {
		icn.nodelete = true;
		init_icon_editing(icn);
	}, 25);
}, 
"Delete", () => {delete_selected_files(icn);}
];//»
let open_opts=["Binary\xa0Viewer", ()=>{open_icon(icn,{useApp: DEF_BIN_OPENER});}];
if (icn.appName !== FOLDER_APP){
	if (TEXT_EXTENSIONS.includes(icn.ext)){
		open_opts.unshift(()=>{open_icon(icn,{useApp:TEXT_EDITOR_APP});});
		open_opts.unshift("Text\xa0Editor");
	}
	menu.unshift(open_opts);
	menu.unshift("Open\xa0with...");
}
set_context_menu({X:e.clientX,Y:e.clientY},{items:menu});

};//»
wrapper.ondblclick = e => {//«
	e.stopPropagation();
	icn.dblclick = true;
	open_icon(icn, {e: e});
};//»
capi.detectClick(wrapper, 100,()=>{
	open_icon(icn);
});

//»
//Methods«

if (observer) {
	this.move_cb=()=>{
		observer.unobserve(d);
		delete this.move_cb;
	};
}
this.del=()=>{//«
	if (!d.parentNode) return;
	this.clear(null,1);
	d._del();
};//»
this.rename = namearg => {//«
	icn.clear(null,0);
	let oldext = icn.ext||"";
	let name;
	let arr = getNameExt(namearg);
	name = arr[0];
	icn.ext = arr[1]||"";
	icn.name = name;
	icn.label.innerText = name;
	icn.label.title = name;
	icn.off();
	if (icn.appName == FOLDER_APP) return;
	if (icn.ext.toLowerCase() != oldext.toLowerCase()) {
		delete icn.wrapper;
		icn.imgdiv.innerHTML = "";
		let newapp = ext_to_app(icn.ext.toLowerCase());
		icn.appName = newapp;
		set_app_img(icn.imgdiv, newapp);
	}
	icn.save();
};//»
this.set_window_name = (name) => {//«
	let win = this.win;
	if (!win) return;
	win.title = name;
	win.name = name;
}//»
this.off = do_vacate => {//«
//	if (!(icn && icn.imgdiv)) return;
	if (do_vacate && ICONS.includes(icn)) ICONS.splice(ICONS.indexOf(icn), 1);
	icn.iconElem._bor= "2px solid transparent";
	icn.iconElem._bgcol="";
	icn.isOn=false;
	if (icn.parWin!==desk) {
		if (ICONS.length===1) icn.parWin.app.stat(ICONS[0].fullname);
		else icn.parWin.app.stat(`${ICONS.length} selected`);
	}
}//»
this.on = do_add => {//«
//	if (!icn) return;
//	if (icn.fake) return;
	if (isMobile) return;
	let iconelm = icn.iconElem;
	if (do_add && !ICONS.includes(icn)) {
		if (ICONS.length && (icn.parWin !== ICONS[0].parWin)) icon_array_off(9);
		ICONS.push(icn);
	}
	if (iconelm.parentNode === desk) {
		iconelm._bor= DESK_ICON_BOR;
		iconelm._bgcol= DESK_ICON_BG;
	}
	else {
		iconelm._bor= FOLDER_ICON_BOR;
		iconelm._bgcol= FOLDER_ICON_BG;
		if (ICONS.length===1) icn.parWin.app.stat(icn.fullname);
		else icn.parWin.app.stat(`${ICONS.length} selected`);
	}
//HRYWKHDS
	icn.isOn = true;
}//»
this.add_overlay = () => {//«
	let oncontext = (e) => {
		e.preventDefault();
		e.stopPropagation();
		if (overdiv.context_menu) return;
		let canfunc = this.cancel_func;
		set_context_menu({
			X: e.clientX,
			Y: e.clientY
		}, {
			items: ["Stop File Transfer", canfunc]
		});
	};
	let overdiv = make('div');
	let rect = icn.iconElem.getBoundingClientRect();
	overdiv._w= rect.width;
	overdiv._h = rect.height;

	let od = overdiv;
	icn.overdiv = od;
	od._dis= "flex";
	od.style.alignItems = "center";
	od.style.justifyContent = "center";
	od.style.flexDirection = "column";
	od._bgcol= "#000";
	od._op= 0.66;
	od._tcol= "#fff";
	od._ta= "center";
	od._fs= 21;
	od._pos= "absolute";
	od._w="100%";
	od._h="100%";
	od._loc(0, 0);
	icn.iconElem._add(overdiv);
	icn.activate = () => {
		this.cancel_func = null;
		overdiv._del();
		delete icn.disabled;
	};
	overdiv.oncontextmenu = oncontext;
	return overdiv;
};
//»
icn.shake = () => {//«
	iconelm.style.animation = "shake 0.5s cubic-bezier(.36,.07,.19,.97)\x20both";
	iconelm.addEventListener("animationend", () => {
		iconelm.style.animation = "";
	});
};//»
icn.clear = (patharg, which) =>{//«
	if (icn.parWin !== desk) return;
	let path;
	if (patharg) path = patharg;
	else path = icn.fullpath;
	let k =`${FS_PREF}:${path}`;
	if (!localStorage[k]) {
cwarn(`Nothing found in localStorage[${k}]`);
return 
}
if (debug_localstorage) {
log(`Deleting: localStorage["${k}"]`);
}
	delete localStorage[`${k}`];
};//»
icn.save = ()=>{//«
	if (globals.read_only) return;
	if (icn.parWin!==desk) return;
	let k =`${FS_PREF}:${icn.fullpath}`;
let verb;
	if (localStorage[k]) {
verb="Updating";
	}
	else{
verb="Setting";
	}
if (debug_localstorage) {
log(`${verb}: localStorage["${k}"]`);
}
	localStorage[k]=`${icn.col} ${icn.row}`;
};//»
icn.openWin = ()=>{//«
	return new Promise((Y,N)=>{
		if (icn.win) return Y(icn.win);
		open_icon(icn, {winCb: Y});
	});
};//»
icn.add_link = if_broken => {//«
	let link_str = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="128" height="128"><g style="opacity:1;" transform="translate(0 0)"><rect style="fill:#fff;stroke:#000;stroke-width:3.5;" x="68" y="68" height="60" width="60" /><g style="fill:none;stroke:#000;stroke-width:3.234;stroke-miterlimit:4;stroke-opacity:1;stroke-dasharray:none"><rect width="11.473064" height="24.621971" rx="6.5" ry="6.5" x="134.24921" y="-51.794231" transform="matrix(0.36548997,0.93081528,-0.93081528,0.36548997,0,0)" /><rect width="11.473064" height="24.621971" rx="6.5" ry="6.5" x="143.13367" y="-16.949551" transform="matrix(0.6743771,0.73838711,-0.73838711,0.6743771,0,0)" /><rect width="11.473064" height="24.621971" rx="6.5" ry="6.5" x="137.76695" y="21.29994" transform="matrix(0.90331408,0.42897981,-0.42897981,0.90331408,0,0)" /></g></g>';
	let broken_str = '<g style="fill:none;stroke:red;stroke-width:8px"><path d="M 128,128 70,78" /></g>';
	if (if_broken) link_str += broken_str;
	link_str += "</svg>";
	let img = util.make('img');
	img.iconElem = icn.iconElem;
	let link_div = make('div');
	wrapper._add(link_div);
	link_div._add(img);
	link_div._pos= "absolute";
	link_div._op=0.66;
	link_div._r=0;
	link_div._b=0;
	img.src = 'data:image/svg+xml;base64,' + btoa(link_str);
	img.style.maxWidth = ICON_DIM;
};//»

//»
//Properties«

Object.defineProperty(this, "fullpath", {//«
	get: ()=>{
		if (!this.name) return null;
		let path = `${(this.path ? this.path : "/")}/${this.name}`;
		if (this.ext) path =`${path}.${this.ext}`;
		return path.regpath();
	}
});//»
Object.defineProperty(this, "linkfullpath", {//«
	get: ()=>{
		if (this.link) this.link.regpath();
		return this.fullpath;
	}
});//»
Object.defineProperty(this,"path",{//«
	get:function(){
		if (this.parWin === desk) return DESK_PATH;
		return this.parWin.fullpath;
	}
});//»
Object.defineProperty(this, "fullname", {//«
	get: function() {
		let name = this.name;
		if (this.ext) name = `${name}.${this.ext}`;
		return name;
	}
});//»
this.node = node;
this.iconElem = d;
this.wrapper = wrapper;
this.imgdiv = wrapper.childNodes[0];
this.imgdiv.iconElem = d;
this.name = name;
this.ext = ext;
this.appName = app;
this.label = label;
if (islink) {//«
	this.add_link(!app);
	this.link = node.link
	let ref = node.ref;
	if (ref) {
		let arr = capi.getNameExt(ref.name);
		this.linkname = arr[0];
		this.linkext = arr[1];
		this.linkpath = ref.par.fullpath;
		this.ref = ref;
	}
}//»
//»

};
api.Icon = Icon;
//»

const move_icons = async (destpath,  opts={}) => {//«
return new Promise(async(cb,N)=>{
let {e, win:usewin, loc}=opts;

const do_end=()=>{//«
	if (usewin) {
		if (usewin === desk) {
			for (let icn of ICONS) {
				icn.parWin = desk;
				icn.iconElem._pos="absolute";
				if(!icn.iconElem.parentNode) {
					desk._add(icn.iconElem);
				}
			}
		}
		else {
			for (let i = 0; i < ICONS.length; i++) {
				let icn = ICONS[i];
				icn.parWin = usewin;
			}
			let wins = get_wins_by_path(usewin.fullpath);
			for (let w of wins) {
				w.app.update(didnum);
			}
		}
	}
	else {
		let wins = get_wins_by_path(destpath);
		for (let w of wins) w.app.update();
	}

	if (origwin && origwin.appName == FOLDER_APP) {
		let wins = get_wins_by_path(origwin.fullpath);
		for (let w of wins) {
			if (do_copy) w.app.reload();
			else w.app.update(-didnum);
		}
	}
	for (let icn of ICONS){
		icn.iconElem._op=1;
		delete icn.disabled;
		icn.save();
	}
	icon_array_off(5);
	if (cb) cb(true);
	shell_moving_done = true;
	check_no_move_icons();

};//»
const reset_display=()=>{//«
	if (did_reset) return;
	did_reset = true;
	if (origwin){
		if (ERROR_MSGS.length) poperr(ERROR_MSGS.join("<br>"),{WIDE: true});
		let no_move_icon_wins = [];
		if (origwin !== desk) {
			for (let icn of NO_MOVE_ICONS) {
				icn._del();
			}
			return;
		}
		for (let icn of NO_MOVE_ICONS){
//EMKIOFDPM
			if (icn.win) {
				icn.win.icon = icn;
			}
			delete icn.disabled;
			icn.iconElem.style.transform = "";
			icn.iconElem.style.transition = "";
			icn.iconElem._op=1;
			icn.iconElem._pos="absolute";
			placeInIconSlot(icn, {create: true});
		}
	}
}//»
const check_no_move_icons = ()=>{//«
	if (visual_moving_done && shell_moving_done) return reset_display();
	check_interval = setInterval(()=>{
		if (!(visual_moving_done && shell_moving_done)) return;
		clearInterval(check_interval);
		reset_display();
	},50);

};//»

if (!ICONS[0]){//«
cwarn("THis is a rare event!");
	cldragimg(true);
	return;
}//»
if (globals.read_only){//«
	for (let icn of ICONS) {
		icn.shake();
		icn.off();
	}
	cb();
	return;
};//»
//Var«
if (e && destpath === DESK_PATH) usewin = desk;
let origwin;
let visual_moving_done = false;
let shell_moving_done = false;
let check_interval;
let didnum=0;
let did_reset = false;
let do_copy = false;
let fromnode = await pathToNode(ICONS[0].fullpath, true);
let paths = [];
let good = [];
let empties = [];
let proms = [];
let NO_MOVE_ICONS = [];
let ERROR_MSGS=[];
let icon_obj = {};
let real_locs = [];
let destnode = await pathToNode(destpath);
let desttype = destnode.type;
let fromtype = fromnode.type;
let scrl = desk.scrollLeft;
let scrt = desk.scrollTop;

//Fake parser.shell_exports object for fs.com_mv:serr cbok werr wclerr path2obj cwd is_root term.kill_register get_var_str
let shell_exports = {//«
	cbok: do_end,
	serr: arg => {
		cerr(arg);
		if (cb) cb();
	},
	no_move_cb:(icn)=>{
		if (!icn) return;
		NO_MOVE_ICONS.push(icn);
	},
	werr: s => {
		if (!s) return;
		s = s.trim();
		if (!s.length) return;
		ERROR_MSGS.push(s);
	},
	cberr: (mess) =>{
		let err = "There was a problem moving the icon(s)";
		if (mess) err += `: ${mess}`;
		ERROR_MSGS.push(err);
		do_end();
//		shell_moving_done = true;
//		check_no_move_icons();
//		if (cb) cb();
	},
//		wclerr: log,
	cwd: "/",
	is_root: false,
	termobj: {
		kill_register: func => {
//				cwarn("Got kill_register call");
		},
		kill_unregister: func => {
//				cwarn("Got kill_unregister call");
		}
	},
	get_var_str: () => {
		return null;
	}
};//»

//»

if (fromtype !== FS_TYPE){//«
do_copy = true;
let CP_ICONS = [];
for (let icn of ICONS) {
	if (icn.appName===FOLDER_APP) {
		icn.shake();
//		icon_off(icn);
		icn.off();
		continue;
	}
//	icon_off(icn);
	icn.off();
	let r = icn.iconElem.getBoundingClientRect();
	let newicn = new Icon(icn.node);
	let elm = newicn.iconElem;
	elm._pos="fixed";
	elm._x=r.left;
	elm._y=r.top;
	desk._add(elm);
	newicn.parWin = icn.parWin;
	CP_ICONS.push(newicn);
}

if (!CP_ICONS.length){
	cb();
	return;
}
ICONS = CP_ICONS;
}//»
if (desttype !== FS_TYPE){//«
for (let icn of ICONS) {
	icn.shake();
//	icon_off(icn);
	icn.off();
}
cb();
return;
}//»

for (let icn of ICONS) {//Sanity check«
//	icon_off(icn);
	icn.off();
	let usename = icn.name;
	if (icn.ext) usename += "." + icn.ext;
	if (await pathToNode(destpath + "/" + usename)) {
		icn.shake();
		continue;
	}
	if (icn.path === destpath) {
		if (icn.parWin === desk && usewin == desk) {} else icn.shake();
		continue;
	}
//		let fullpath = icn.fullpath();
	let fullpath = icn.fullpath;
	if (capi.newPathIsBad(fullpath, destpath + "/" + usename)) {
		icn.shake();
		continue;
	}
	paths.push(fullpath);
	good.push(icn);
}//»

if (!paths.length) {//«
	let icons = ICONS.slice();
	ICONS=[];
//	for (let icn of icons) icon_on(icn, true);
	for (let icn of icons) icn.on(true);
	if (cb) cb(false);
	return;
} //»

ICONS=good;
origwin = ICONS[0].parWin;
didnum = ICONS.length;
paths.push(destpath);
for (let icn of ICONS) icon_obj[icn.fullpath] = icn;

if (do_copy){//«
	let NEWICNS=[];
	let newpaths = [];
	for (let icn of ICONS){
		if (icn.appName!=FOLDER_APP) {
			NEWICNS.push(icn);
			newpaths.push(icn.fullpath);
		}
		else{
cwarn(`Skipping icn.appName!='${FOLDER_APP}'`, icn.fullpath);
		}
	}
	paths = newpaths;
	if (!paths.length){
		if (cb) cb();
		return;
	}
	paths.push(destpath);
	ICONS = NEWICNS;
	icon_obj = {};
	for (let icn of ICONS) icon_obj[icn.fullpath] = icn;
}//»

for (let icn of ICONS) {//«
	if (icn.move_cb) icn.move_cb();
	icn.iconElem._op=0.5;
	icn.disabled = true;
	let rect = icn.iconElem._gbcr();
	icn.iconElem._pos="fixed";
	let scrdiff=0;
	let nextsib;

	if (icn.parWin!==desk) {
		if (icn.show && !icn.showing) icn.show();
		nextsib = icn.iconElem.nextSibling;
	}

//Onto a folder icon's dropzone
	if (loc) {//«
		vacate_icon_slot(icn);
		icn.iconElem._loc(rect.left+desk.scrollLeft, rect.top+scrdiff+desk.scrollTop);
		desk._add(icn.iconElem);
		proms.push(move_icon(icn, loc.X+desk.scrollLeft, loc.Y+desk.scrollTop, {scale:0.25, fade:true, 
			cb:()=>{
				icn.iconElem._del();
//TEIOPLKJHY
				if (icn.win && icn.win.icon){
					icn.win.icon = undefined;
					delete icn.win.icon;
				}
			}
		}));
	}//»
//Onto the desktop:get location from 'e',passed into the desktop's ondrop event handler
	else if (usewin == desk) {//«
		icn.iconElem._loc(rect.left+scrl, rect.top+scrdiff+scrt);
		desk._add(icn.iconElem);
		proms.push(placeInIconSlot(icn,{doMove: true, create: do_copy, pos:{X:e.clientX+scrl,Y:e.clientY+scrt}}));
	}//»
//Onto a folder main window,from the desktop or another folder. The folder automatically places it
	else {//«
		const movecb=()=>{//«
			let name = icn.name;
			let ext = icn.ext;
			if (ext) name += `.${ext}`;
			let icns = Array.from(usewin.icon_div.children);
			for (let ic of icns){
				let ext = ic.ext;
				let nm = ic.name;
				if (ext) nm += `.${ext}`;
				if (nm==name){
					icn.iconElem._del();
					return;
				}
			}
			icn.iconElem.style.transform = "";
			icn.iconElem.style.transition = "";
			icn.iconElem._pos="";
			usewin.icon_div._add(icn.iconElem);
		};//»
		vacate_icon_slot(icn);
		if (icn.parWin !== desk) {
			icn.iconElem._loc(rect.left+scrl, rect.top+scrdiff+scrt);
			desk._add(icn.iconElem);
		} 
		let icons = usewin.getIcons();
		usewin.main.scrollTop = usewin.main.scrollHeight;
		let last = icons.pop();
		let wr;

		if (last) {
			wr = last.iconElem._gbcr();
			let d = mkdv();
			d._op=0;
			d._w=100;
			d._h=100;
			usewin.icon_div._add(d);
			let r2 = d._gbcr();
			d._del();
			proms.push(move_icon(icn, r2.left+scrl, r2.top+scrt, {cb:movecb}));
		}
		else {
			wr = usewin.winElem._gbcr();
			proms.push(move_icon(icn, wr.left+scrl, wr.top+usewin.titlebar.clientHeight+scrt, {cb:movecb}));
		}
	}//»

	if (nextsib){
		let empty = mkdv();
		empty = mkdv();
		empty.className = "emptyicon";
		let obj = {
			iconElem: empty,
			empty: true,
			parWin: origwin, 
			fullname:" "
		};
		empty.icon = obj;
		empty.iconElem = empty;
		empty._w= 104;
		empty._h = 104;
		nextsib.parentNode.insertBefore(empty, nextsib);
		empties.push(empty);
	}
}//»

//Start the graphical moving first. Sometimes there are issues involved when,
//for example, the user does not have permission to move to the destination location.
Promise.all(proms).then(()=>{//«
	visual_moving_done = true;
	check_no_move_icons();
});//»
//Do the "real" system moving
//fs.com_mv(shell_exports, paths, do_copy, {//«
//	win: usewin,
//	icons: icon_obj
//});//»

fs.com_mv(paths, {
	shell_exports,
	if_cp: do_copy,
	dom_objects: {
		win: usewin,
		icons: icon_obj
	}
});



});
};//»
const move_icon = (icn, want_x, want_y, opts={}) => {//«

if (globals.read_only){
	icn.shake();
	return;
}
let scale_fac = opts.scale;
let if_fade_out = opts.fade;
let cb = opts.cb;
let iconelm = icn.iconElem;
if (!cb) cb=()=>{};

return new Promise((res, rej) => {

	const transend = e => {//«
		iconelm.style.transition = "";
		iconelm.style.transform = "";
		iconelm._loc(want_x, want_y);
		iconelm._z= ICON_Z;
//		if (if_fade_out) {
//			setTimeout(() => {
//				iconelm._op= 1;
//			}, 100);
//		}
		res();
		delete iconelm.ontransitionend;
		cb();
	};//»

	let fromx = pi(iconelm.style.left);
	let fromy = pi(iconelm.style.top);
	let diffx = want_x - fromx;
	let diffy = want_y - fromy;
	let d = Math.sqrt(Math.pow(diffx, 2) + Math.pow(diffy, 2));
	let factor = ICON_MOVE_FACTOR;
	let time = d * 1 / factor;
	if (time > 0.5) time = 0.5;
	else if (time < 0.15) time = 0.15;
	iconelm.style.transform = "";
	let str = `transform ${time}s ease 0s`;
//	if (if_fade_out) str += `,opacity ${time}s ease 0s`;
	iconelm.style.transition = str;
//log(str);
	iconelm.ontransitionend=transend;
	setTimeout(() => {
		let str = `translate(${diffx}px,${diffy}px)`;
		if (NUM(scale_fac)) str += ` scale(${scale_fac})`;
		iconelm._z= CG_Z - 1;
//		if (if_fade_out) iconelm._op= 0.5;
		iconelm.style.transform = str;
	}, 25);
});


};
//»
const move_icon_by_path = (frompath, topath, app, opts = {}) => {//«
return new Promise(async(Y,N)=>{

	const doend=()=>{//«
		if (frompath && topath) update_all_paths(frompath, topath);
		Y(ret);
	};//»
//log(frompath, topath);
	let ret = [];
	let use_link;
	let is_folder = (app == FOLDER_APP);
	let no_del_icon = opts.icon;
	if (no_del_icon){
		delete no_del_icon.disabled;
		no_del_icon.iconElem._op=1;
	}
	let no_add_win = opts.win;
	let is_regular_file = false;
	if (!(is_folder || opts.link)) is_regular_file = true;
	let fromparts, frombase;
	let icons = [];
	if (frompath) {
		let pathname, ext;
		if (is_regular_file){
			let arr = getNameExt(frompath, true);
			pathname = arr[0];
			ext = arr[1];
		}
		else pathname = frompath;
		icons = get_icons_by_path(pathname, ext);
		fromparts = fs.path_to_par_and_name(frompath);
		frombase = fromparts[0];
	}

	let toparts = fs.path_to_par_and_name(topath);
	let tobase = toparts[0].replace(/\/$/, "");
	let toname = toparts[1];
	let ext;
	if (is_regular_file) {
		let marr = ALL_EXTENSIONS_RE.exec(toname);
		if (marr && marr[1] && marr[2]) {
			toname = marr[1];
			ext = marr[2];
		}
	}

	if (frombase && (frombase == tobase)) {
		for (let icn of icons) {
			let usename = toname;
			if (ext) usename += `.${ext}`;
			icn.rename(usename);
		}
		doend();
		return 
	} 
	for (let icn of icons) {
		if (icn === no_del_icon) {
			delete icn.disabled;
			icn.iconElem._op=1;
			continue;
		}
		icn.del();
	}
	let wins = get_wins_by_path(tobase, {getDesk: true});
	opts.ext = ext;
	for (let w of wins) {
		if (w === no_add_win) {
			if (no_del_icon) ret.push(no_del_icon);
			continue;
		}
		let newicon = await make_icon(toname, w, opts);
		if (newicon) ret.push(newicon);
	}
	doend();

});
}
this.move_icon_by_path = move_icon_by_path;
//»
const move_icon_array=(opts={})=>{//«

if (!ICONS.length) return;
let{toOrigin}=opts;
let rect;
let cur_is_on = CUR.ison();
let goticn;
let towin = CWIN;
let rect_elem;
if (!cur_is_on) rect_elem = ICONS[0].iconElem;
else{
	rect_elem = CUR.curElem;
	goticn = CUR.geticon();
}

rect = rect_elem._gbcr();

if (toOrigin) goticn = null;

const move_to_win_or_desk=()=>{//«
	if (towin){
		move_icons(towin.fullpath,{win: towin});
		return;
	}
	let par = ICONS[0].parWin;
	let	x=((rect.left+rect.right)/2);
	let	y=((rect.top+rect.bottom)/2);
	if (par!==desk){
		if(toOrigin||!cur_is_on){
			x=0;
			y=0;
		}
		move_icons(DESK_PATH, {e:{clientX:x,clientY:y}});
		return;
	}
	for (let icn of ICONS) vacate_icon_slot(icn, true);
	if (toOrigin){
		x=0;
		y=0;
	}
	for (let icn of ICONS) placeInIconSlot(icn, {noVacate: true, pos:{X:x+desk.scrollLeft,Y:y+desk.scrollTop}});
	icon_array_off(15);
};//»
const moveit = async()=>{//«
	if (!goticn) return move_to_win_or_desk();
	goticn.off(true);
	if (!ICONS.length) return;
	if (goticn.appName !== FOLDER_APP){
		poperr("Cannot move to a non-folder!");
		return;
	}
	let rect2 = goticn.iconElem._gbcr();
	if (!await move_icons(goticn.fullpath,{loc:{X: rect2.left, Y: rect2.top-15}})) return;
	if (CWIN) CWIN.off();
	if (goticn.parWin&&goticn.parWin !== desk) goticn.parWin.on();
	icon_array_off(16);
	if (goticn.win) goticn.win.app.reload();
};//»

if (windows_showing) return moveit();
toggle_show_windows();
setTimeout(moveit, 10);

}//»
const switch_icons = () => {//«
//Switch the locations of 2 icons on the desktop
	if (!(!CWIN && CUR.ison() && ICONS.length===1)) return;
	let icn1 = CUR.geticon();
	let icn2 = ICONS[0];
//log(icn1 === icn2);
	if (!(icn1 && icn2)) return;
	if (icn1 === icn2) return;
	let r1 = icn1.iconElem._gbcr();
	let r2 = icn2.iconElem._gbcr();
	let scrl = desk.scrollLeft;
	let scrt = desk.scrollTop;
	vacate_icon_slot(icn1);
	vacate_icon_slot(icn2);
	placeInIconSlot(icn1, {noVacate: true, pos: {X:r2.left+scrl, Y:r2.top+scrt}});
	placeInIconSlot(icn2, {noVacate: true, pos: {X:r1.left+scrl, Y:r1.top+scrt}});
	icon_array_off();
}//»

const check_special_ext = node =>{//«
	let ext = node.ext;
	if (MEDIA_EXTENSIONS.includes(ext.toLowerCase())) {
		let url = capi.fsUrl(`/blobs/${node.blobId}`);
		open_app(MEDIA_APP, {appArgs:{url, node}});
		return true;
	}
	if (IMAGE_EXTENSIONS.includes(ext.toLowerCase())) {
		let url = capi.fsUrl(`/blobs/${node.blobId}`);
		open_app(IMAGE_APP, {appArgs:{url, node}});
		return true;
	}   
	return false; 
};//»   

//The main activation function (double-clicking)
const open_icon = async(icn, opts={}) => {//«
	const{
		e, winCb, force, useApp
	}=opts;
	const noopen = (mess) => {
		let str = "The file could not be opened:&nbsp;" + fullpath;
		if (mess) str += ` (${mess})`;
		poperr(str);
	};
	if (icn.disabled) return;
	if (!windows_showing) toggle_show_windows();
	icon_array_off(23);
	let win;
	let app=icn.appName;

	let fullpath = (icn.path + "/" + icn.name).regpath();
	let gotext = icn.ext;
	if (gotext) fullpath = fullpath + "." + gotext;
	if (!icn.win){
		for (let w of windows){
			if (!w.icon && w.fullpath===fullpath){
				icn.win = w;
				w.icon = icn;
				break;
			}
		}
	}
	if (!(!icn.win || force || (e && e.ctrlKey))) {//«
		if (icn.win.is_minimized) {
			if (icn.win.winElem.parentNode !== desk) {
cerr("Where is the minimized window?");
				return;
			}
			icn.win.unminimize();
		}
		else{
			icn.win.on();
		}
		return;
	}//»


	if (app==FOLDER_APP) {//«
		let w = icn.parWin;
		if (w.saver || (w!==desk && !force && folders_open_in_same_window)){
			let obj;
			if (w.saver) obj={SAVER: w.saver};
			icn.winargs={BOTTOMPAD: w.bottompad, X: w.winElem._x, Y:w.winElem._y, WID: w.main._w, HGT: w.main._h};
			w.easyKill();
			win = open_new_window(icn, null, obj);
		}
		else win = open_new_window(icn);
		if(winCb) winCb(win);
		return;
	}//»

	let link = icn.link;
	let node = await pathToNode(fullpath);
	let roottype = node.type;

	const OK_TYPES=[FS_TYPE,"local"];
	if (!OK_TYPES.includes(roottype)) return poperr(`Cannot open type: ${roottype}`);

	if (check_special_ext(node)) return;
	
	if (roottype==FS_TYPE&&!fs.check_fs_dir_perm(node)) return noopen("permission denied");
	let ret = await fsapi.readFile(fullpath, {binary: true});
	if (!ret) return noopen();
	icn.node = node;
	open_icon_app(icn, ret, gotext, useApp, force);

}//»

const icon_array_off = (which) => {//«
	let icn = ICONS[0];
	for (let i = 0; i < ICONS.length; i++) ICONS[i].off();
	ICONS = [];
	if (icn && icn.parWin!==desk) icn.parWin.app.update();
}//»
const select_icons_in_drag_box_desk = (e) => {//«
	if (!DDIE) return;
	let icons = get_icon_array(desk);
	let hix = null,
		lox;
	let hiy = null,
		loy;
	if (DDIE.clientX < e.clientX) {
		hix = e.clientX;
		lox = DDIE.clientX;
	} else {
		hix = DDIE.clientX;
		lox = e.clientX;
	}
	if (DDIE.clientY < e.clientY) {
		hiy = e.clientY;
		loy = DDIE.clientY;
	} else {
		hiy = DDIE.clientY;
		loy = e.clientY;
	}
	if (hix == null || hiy == null) return;

	hix-=winx();
	hiy-=winy();
	lox-=winx();
	loy-=winy();

	let OK=[];

	for (let icn of icons) {
		if (!(icn&&icn.wrapper)) continue;
		let rect = icn.wrapper.getBoundingClientRect();
		let left = rect.left;
		let right = rect.right;
		let top = rect.top;
		let bot = rect.bottom;
		if (!(left > hix || right < lox || top > hiy || bot < loy)) {
			OK.push(icn);
			icn.on();
		}
		else icn.off();
	}
	ICONS = OK;
}//»
const select_all_icons=()=>{//«
	let cwin = CWIN;
	icon_array_off(14);
	let icons;
	if (!cwin) icons = Array.from(desk.children).filter(el=>el.className==="icon");
	else icons = Array.from(cwin.icon_div.childNodes);
	if (cwin){
		for (let icn of icons) {
			if (!icn.showing) icn.show();
		}
	}
	for (let icn of icons) {
		icn.icon.on(true);
	}
};//»
const select_first_visible_folder_icon=(win)=>{//«
	if (!(win.main)) return;
	let rect = win.main.getBoundingClientRect();
	let x = rect.left+folder_grid_start_x+IGSX/2;
	let y = rect.top+folder_grid_start_y;
	let el = document.elementsFromPoint(x,y+0.75*IGSY)[0];
	if(!(el && el.iconElem)) el = document.elementsFromPoint(x,y+0.5*IGSY)[0];
	if(!(el && el.iconElem)) el = document.elementsFromPoint(x,y+0.25*IGSY)[0];
	if(!(el && el.iconElem)) return;
	let icn;
	if (el.className=="icon") icn = el;
	else if (el.iconElem) icn = el.iconElem;
	if (NUM(icn.col)&&NUM(icn.row)) CUR.setpos(icn.col, icn.row, icn);
	else CUR.setpos(0,0,icn);
};//»

const get_desk_icons=()=>{//«
	let _arr = desk.getElementsByClassName("icon");
	let arr=[];
	for (let icn of _arr){
		arr.push(icn.icon);
	}
	return arr;
};//»
const get_icons_by_path = (patharg, extarg) => {//«
	let arr = get_desk_icons();
	let ret = [];
	patharg = patharg.regpath();
	for (let icn of arr) {
		if (!icn) {
			continue;
		}
		let ext = icn.ext;
		let namepath = (icn.path + "/" + icn.name).regpath();
		if (namepath == patharg) {
			if (extarg) {
				if (ext === extarg) ret.push(icn);
			} else if (!ext) ret.push(icn);
		}
	}
	return ret;
};
this.get_icons_by_path = get_icons_by_path;
//»

const save_icon_editing = async() => {//«

	const abort=async mess=>{//«
		if (!mess) mess="There was an error";
		CEDICN._del();
		if (CEDICN._editcb) {
			await WDGAPI.poperr(mess);
			CEDICN._editcb();
			CEDICN._editcb = null;;
		}
		else poperr(mess);
		CEDICN = null;
		CG.off();
	};//»

	const doend = async newname => {//«
		let oldpath = `${CEDICN.path}/${holdname}`;
		let nameext = getNameExt(holdname);
		let oldname = nameext[0];
		let oldext = nameext[1];
		let newnameext;
		if (newname){
			newnameext = newname;
			if (oldext) newnameext=`${newname}.${oldext}`;
		}
		if (newnameext) {
			update_all_paths(oldpath, `${CEDICN.path}/${newnameext}`);
			CEDICN.set_window_name(newname);
		}
		else newname = oldname;
		CEDICN.name = newname;
		CEDICN.label.innerText = newname;
		CEDICN.label.title = newname;
		CEDICN.dblclick = null;
		CEDICN.off();
		if (CEDICN._savetext||CEDICN._savetext==="") {
//			let rv = await fsapi.writeFile(CEDICN.fullpath(), CEDICN._savetext);
			let rv = await fsapi.writeFile(CEDICN.fullpath, CEDICN._savetext, {noMakeIcon: true });
			if (!rv) return abort("The file could not be created");
			CEDICN._entry = rv.entry;
			delete CEDICN._savetext;
		}

		if (CEDICN._editcb) {
			CEDICN._editcb(CEDICN);
			CEDICN._editcb = null;
		}
		CEDICN.clear(oldpath,2);
		CEDICN.save();
		if (CEDICN.parentNode===desk && !windows_showing) toggle_show_windows();
		CEDICN = null;
		CG.off();
	};//»

	let ifnew;
	if (!CEDICN) return;
	if (CEDICN.isnew) {
		ifnew = true;
		delete CEDICN.isnew;
		CEDICN.isnew = undefined;
	}
	let val = CEDICN.name;
	let holdname = val;
	let checkit = CEDICN.area.value.trim().replace(RE_SP_PL, " ").replace(RE_SP_G, "\u00A0");
	let checkithold = checkit;
	if (CEDICN.ext) {
		checkit += "." + CEDICN.ext;
		holdname += "." + CEDICN.ext;
	}
	if (!(ifnew || (checkit != CEDICN.fullname))) return doend();
	
	let srcpath = CEDICN.path + "/" + holdname;
	let destpath = CEDICN.path + "/" + checkit;
	if (!(!await check_name_exists(checkit, CEDICN.parWin) || (ifnew && (srcpath == destpath)))) {
		popup(`The name "${checkit}" is already taken... reverting to "${holdname}"`);
		CEDICN.area.value = val;
		if (ifnew) CEDICN.isnew = true;
		save_icon_editing();
		return;
	}
	if (ifnew){//«
		let parobj = await pathToNode(CEDICN.path);
		if (!parobj) {
			doend();
cerr("pathToNode(): parpath not found:" + CEDICN.path);
			return;
		}
		let rtype = parobj.type;
		if (rtype!==FS_TYPE){
			doend();
cerr("Unsupported type:" + rtype);
			return;
		}
		if (CEDICN._savetext||CEDICN._savetext==="") {
			return doend(checkithold);
		}
		let mkret = await fsapi.mkDir(parobj, checkit, {noMakeIcon: true});
		if (mkret) doend(checkit);
		else abort("Could not create the new directory");
		return;
	}//»
	let srcnode = await pathToNode(srcpath);
	let srctype = srcnode.type;
	if (srctype!==FS_TYPE) return doend();
	if (await fsapi.comMv([srcpath, destpath])) return doend(checkithold);
	doend();
}//»
const init_icon_editing = icn => {//«
	CEDICN = icn;
	if (icn.parentNode===desk && windows_showing) toggle_show_windows();
	CG.on();
	let label = icn.label;
	let area = make('input');
	area.type="text";
	area.value = icn.name;
	CEDICN.area = area;
	let usediv = label;
	usediv.html("");
	area.style.resize = "none";
	area._w="100%";
	area._marl= "auto";
	area._marr= "auto";
	area._over= "hidden";
	usediv._add(area);
	usediv.area = area;
	area.ael('mousedown', e => {
		e.stopPropagation();
		area.focus();
	});
	area.ael('mouseup', e => {
		e.stopPropagation();
	});
	area.ael('dblclick', e => {
		e.stopPropagation();
		area.select();
	});
	area.select();
	focus_editing();
};//»
const update_all_paths = (oldpath, newpath) => {//«
	const replacepath=(w, oldpath, newpath)=>{
//		let patharr=w._path.split("/");
		let patharr=w.path.split("/");
		let oldarr=oldpath.split("/");
		for(let i=0;i<oldarr.length;i++) patharr.shift();
//		w._path=(newpath+"/"+patharr.join("/")).regpath();
		w.path=(newpath+"/"+patharr.join("/")).regpath();
	};
	let app_has_ext = (app) => {
		if (app === FOLDER_APP || app === "Link") return false;
		return true;
	};
	oldpath = oldpath.regpath();
	newpath = newpath.regpath();
	let re = new RegExp("^" + oldpath + "/");
	for (let w of windows) {
		if (w.fullpath === oldpath) {
			let newarr = newpath.split("/");
			let fname = newarr.pop();
			let ext = "";
			if (app_has_ext(w.appName)) {
				let marr = getNameExt(fname);
				fname = marr[0];
				ext = marr[1];
			}
			w.name = fname;
			w.ext = ext;
			w.title = fname;
			w.path = newarr.join("/");
			if (w.appName===FOLDER_APP) w.app.reload(`${w.path}/${fname}`);
		} 
		else {
			let gotpath = w.path;
			if (gotpath == oldpath || re.exec(gotpath)) {
				replacepath(w, oldpath, newpath);
			}
		}
	}
};
this.update_all_paths = update_all_paths;
//»

const make_new_text_file = (winarg, val, ext, opts={})=>{//«
	return new Promise(async(Y,N)=>{
//		if (!path) path = globals.DESK_PATH;
		let path = winarg.fullpath;
		let usepos = null;
		let num = 0;
		let basename = opts.name||"New_File";
		let name = basename;
		let iter = 0;
		while (await check_name_exists(`${name}.${ext}`, null, path)) {
			name = basename + (++num);
			iter++;
			if (iter > 50) {
				cerr("infinite loop detected");
				return Y();
			}
		}
		let parobj = await pathToNode(path);
		if (!parobj) return;
		let rtype = parobj.type;
		if (rtype != FS_TYPE) {
			await popwait(`Cannot create a file of type: '${rtype}'`, "error");
			Y();
			return;
		}
		let fobj = {name: `${name}.${ext}`, baseName: name, ext: ext};
		if (ext==="app") fobj.appicon = val;
		let icn = new Icon(fobj);
		icn._savetext = val;
		icn._editcb = Y;
		if (winarg===desk) placeInIconSlot(icn, {create: true});
		else add_icon_to_folder_win(icn, winarg);
		setTimeout(() => {
			init_icon_editing(icn);
		}, 0);
		icn.isnew = true;
		return true;
	});
};
//»
const make_folder_icon = async(winarg) => {//«
	if (CG._dis != "none") return;
	CG.on();
	let usewin, usepath;
	if (winarg===desk){
		usewin = desk;
		usepath = DESK_PATH;
	}
	else{
		usewin = winarg.main;
		usepath = winarg.path + "/" + winarg.name;
	}
	let name = "New_Folder";
	let num = 0;
	let iter = 0;
	while (await check_name_exists(name, null, usepath)) {
		name = "New_Folder_" + (++num);
		iter++;
		if (iter >= 50) return poperr("Infinite loop detected in make_folder_icon");
	}
	let parobj = await pathToNode(usepath);
	if (!parobj) return;
	let rtype = parobj.type;
	if (!(rtype==FS_TYPE)) {
		return poperr(`Not making a directory of type: '${rtype}'`);
	}
	let obj;
	let icn = new Icon({name: name, baseName: name, kids:true});
	icn.isnew = true;
	if (usewin===desk) placeInIconSlot(icn, {create: true});
	else add_icon_to_folder_win(icn, usewin.top);
	setTimeout(() => {
		init_icon_editing(icn);
	}, 0);
}
//»
const make_new_icon = async(winarg, type) => {//«
	if (type == FOLDER_APP) make_folder_icon(winarg);
	else if (type == "Text") {
		let val = await WDGAPI.popinarea("Paste text");
		if (!val) return;
		if (CG._dis != "none") return;
		CG.on();
		make_new_text_file(winarg, val, "txt");
	}
};
this.make_new_icon = make_new_icon;
//»
const make_icon_if_new = async node => {//«
//log("make_icon_if_new", node);
	if (isstr(node)) {
		let path = node;
		node = await pathToNode(path);
		if (!node){
cwarn(`No node returned in make_icon_if_new, (path=${path})`);
			return;
		}
	}
	let fullpath = node.fullpath;
	let icons = get_desk_icons();
	for (let icn of icons) {
		if (icn.fullpath == fullpath) return;
	}
	let parts = capi.pathParts(fullpath);
	let dirpath = parts[0];
	let fname = parts[1];
	let ext = parts[2];
	if (node.type==FS_TYPE && ext==="app"){
		node.appicon = await fsapi.readFile(fullpath,{text: true});
	}
	if (dirpath === DESK_PATH) {
		placeInIconSlot(new Icon(node), {create: true});
	}
	let wins = get_wins_by_path(dirpath);
	for (let w of wins) add_icon_to_folder_win(new Icon(node), w);

};
this.make_icon_if_new = make_icon_if_new;
//»
const make_icon = async(name, where, opts={}) => {//«

/*«

Only called in the desktop via save_dropped_files, with opts.pos

Otherwise, it is on called at the end of:
		
	const move_icon_by_path = (frompath, topath, app, opts = {}) => 

Those who call this with opts are:
fs.com_mv, with opts={node, icon, win}
save_from_local with opts={icon, win}

»*/

	let {ext, node, icon: oldicon} = opts;

	let fullname;
	if (ext) fullname = `${name}.${ext}`;
	else fullname = name;

	let path;
	if (where == desk) path = DESK_PATH;
	else path = `${where.path}/${where.name}`;

	let fullpath = `${path}/${fullname}`;

	let icons = get_icon_array(where, true);
	for (let icn of icons){
		if (icn && icn.fullname === fullname) {
cwarn(`make_icon: Already have an icon named: ${fullname}`);
log(where);
			return;
		}
	}

	if (!node) {
		node={name:fullname, baseName: name, ext: ext};
		node.kids = (oldicon && oldicon.appName === FOLDER_APP);
	}

	if (ext==="app") node.appicon = await fsapi.readFile(fullpath, {text: true});

	let icn = new Icon(node);

	if (where===desk) placeInIconSlot(icn, {pos: opts.pos, create: true});
	else add_icon_to_folder_win(icn, where);

	return icn;

}
//»

const delete_selected_files = async which => {//«
	let arr = [];
	let usewin = desk;
	if (CWIN && CWIN.appName == FOLDER_APP) usewin = CWIN;
	if (which) arr = [which.fullpath];
	else if (ICONS) {
		for (let icn of ICONS) arr.push(icn.fullpath);
		icon_array_off(6);
	}
	arr = capi.uniq(arr);
	if (arr.length) {
		let ret = await popyesno(`Delete ${arr.length} files?`,{reverse: DEF_NO_DELETE_ICONS});
		if (!ret) return;
		let errprompt;
		let errors = [];
		await fsapi.doFsRm(arr, mess=>{errors.push(mess);});
		icon_array_off(8);
		if (usewin!==desk){
			usewin.app.reload();
			if (CUR.main) delete CUR.main.lasticon;
			CUR.set();
		}
		if (errors.length) poperr(errors.join("<br>"), {wide: true});
	}
	return !!(arr.length);
}//»

const add_icon_to_folder_win = (icn, win) => {//«
	let main = win.main;
	icn.iconElem._pos= "relative";
	main.scrollTop = 0;
	let idiv = main.icon_div;

//QHBTUDJYTA
if (!idiv){//«
log(`The window is below. It should only be a Folder.`)
log(win);
log(`Testing for win.appName === ${FOLDER_APP}:  ${win.appName === FOLDER_APP}`);
log("The main div is below.");
log(main);
log(`There doesn't seem to be a .icon_div property on it.`); 
log(`There *should* be an element with id=="icondiv_win_#" inside of it.`);
log(`Testing !!main.icon_div: ${!!main.icon_div}`);
poperr("Please see the console to debug this very strange situation...");
throw new Error("WHAT THE IN THE EVERLIVING CRAP IS THIS?????");
}//»

	let kids = idiv.childNodes;
	if (!kids.length) idiv._add(icn.iconElem);
	else idiv.insertBefore(icn.iconElem, kids[0]);
	icn.parWin = win;
};//»

//»
//Windows«

const Window = function(arg){//«

//Var«

	const thiswin = this;
	let app = arg.appName;
	let is_folder = app === FOLDER_APP;
	let winid;
	let marr;
	let fs_url;

	let winargs = arg.WINARGS||{};
	let defwinargs = get_newwin_obj();
	let usex, usey, usew, useh;
	if (NUM(winargs.X)) usex = winargs.X;
	else usex = defwinargs.X;

	if (NUM(winargs.Y)) usey = winargs.Y;
	else usey = defwinargs.Y;

	if (NUM(winargs.WID)) usew = winargs.WID;
	else if (winargs.WID === "100%") usew = winw();
	else usew = defwinargs.WID;

	let botpad = winargs.BOTTOMPAD;
	if (NUM(winargs.HGT)) useh = winargs.HGT;
	else if (winargs.HGT === "100%") useh = winh();
	else {
		useh = defwinargs.HGT;
		if (botpad) useh -= botpad;
	}

	let wintitle;
	if (arg.name) wintitle = arg.name;
	else if (winargs.TITLE) wintitle = winargs.TITLE;
	else wintitle = "Untitled";

//This won't work when the local filesystem is no longer uses this
// kind of one-to-one mapping between files and the physically stored blobs

//Test for app.match(/filesystem:.+.js$/, and "slice out" the "app" name)
	if (marr = app.match(/^filesystem:.+\/([a-z][a-z0-9]*)\.js$/i)){
		fs_url = app;
		app = `local.${marr[1]}`;
	}
//»

//DOM«

	let win = make("div");//The top level window«
	no_select(win);

//I guess this is here so the app name shows up in the Elements view of devtools
	win.dataset.app = app;
	win._pos= "fixed";
	win._bor= "1px solid #333";
	win.id = winargs.ID || `win_${++win_num}`;
	winid = win.id;
	win._x=usex;
	win._y=usey;
	win._z=HI_WIN_Z+1;
	win.className="topwin";
	win.style.boxShadow = window_boxshadow;
//»
	let main = make("div");//The application area«
	no_select(main);
	main.top = this;
	main.id = "main_"+winid;
	main._w=usew;
	main._h=useh;
	main._bgcol= APP_BG_COL;
	main._tcol= "#000";
	main._bor= "0px solid transparent";
	main._pos= "relative";
	main.className="mainwin";
	main.type = "window";
//»
	let titlebar = make('div');//«
	titlebar.id="titlebar_"+winid;
	titlebar._h = 18;
	no_select(titlebar);
	titlebar.className = "titlebar";
	titlebar.win = win;
	main.titlebar = titlebar;
	main.appName = app;
	let title = make("div");
	title.id="title_"+winid;
	title._padt=1.25;
	title._ta= "center";
	title._pos= "relative";
	title._tcol= "black";
	title._ff= "sans-serif";
	titlebar._add(title);

	let namespan = make('span');
	namespan.id="namespan_"+winid;
	namespan._fs= 12;
	namespan["tcol.on"] = WINNAME_COL_ON;
	namespan["tcol.off"] = WINNAME_COL_OFF;
	namespan.title = winid;
	titlebar.label = namespan;
	title._add(namespan);
	main._over="hidden";

	let img_div = make('div');
	img_div._pos= "absolute";
	img_div._bor= "0px solid transparent";
	img_div._x= 0;
	img_div._y= 0;
	img_div._padb= 3;
	img_div.style.cursor = "default";

	img_div.draggable=true;
	img_div.ondragstart=nopropdef;

	img_div.onclick = ()=>{this.contextMenuOn()};
	title._add(img_div);
	let useimg = winargs.WINTITLEIMG;
	if (useimg) {
		img_div.img = useimg;
		img_div._add(useimg);
	}
	else set_app_img(img_div, app);
	img_div.id="titleimgdiv_"+winid;
	img_div._fs=12;
	img_div._tcol="#a7a7a7";
	img_div.title = app.split(".").pop();
//»
//«Min/Max/Close buttons

	const mkbut = (sz) => {//«
//	const mkbut = (col, sz) => {
		let b = make('div');
		b._over= "hidden";
		b._padl=b._padr=2;
		b._ta= "center";
		b._fs= sz;
		b._w= 16;
		b._h = 16;
		b._bor="1px solid #000";
		b._bgcol= WINBUT_OFF_COL;
		b.onmousedown=e=>{e.stopPropagation();};
		b.hover = () => {
			b._bgcol=WINBUT_ON_COL;
		};
		b.unhover = () => {
			b._bgcol=WINBUT_OFF_COL;
		};
		b.top = win;
		butdiv._add(b);
		return b;
	};//»
	const doclose = (force, if_dev_reload)=>{//«
//	const doclose = function(evt, thisarg, force, if_dev_reload) {

		if (this.is_minimized||this.is_tiled) return;
		if (!force && (this != CWIN)) return;
		if (this.no_events) return;
		if (this.nobuttons && !force) return;
		if (this.app.onkill) this.app.onkill(if_dev_reload, force);
		for (let i = 0; i < windows.length; i++) {
			if (windows[i] == this) {
				windows.splice(i, 1);
				break;
			}
		}
		if (is_folder) icon_array_off(3);
		this.killed = true;
		this.app.killed = true;
//		this._del();
//log(win._del);
		win._del();
		let icn = this.icon;
		let node = this.node;
		if (icn) {
			if (!node) node = icn.node;
//			if (icn.node) delete icn.node.unlockFile();
			icn.win = null;
		}
//		else if (this.node) this.node.unlockFile();
		if (node && node.unlockFile) node.unlockFile();
		top_win_on();
	};//»
	const onhover=function(){//«
		if (CDL) return;
		butdiv._op= 1;
		this.hover();
	};//»
	const onunhover=function(){//«
		if (CDL) return;
		if (thiswin !== CWIN) butdiv._op=0.5;
		else butdiv._op= 0.75;
		this.unhover();
	};//»

	let butdiv = make('div');//«
	butdiv.style.cursor = "default";
	butdiv.off = () => {
		butdiv._op= 0.5;
	};
	butdiv.on = () => {
		butdiv._op= 0.75;
	};
	butdiv._pos= "absolute";
	butdiv._r= 3;
	butdiv._y= 0;
	butdiv._dis= "flex";
	butdiv.style.flexDirection = "row-reverse";
	butdiv._h = 16;
	butdiv._z=1000000;
	butdiv._tcol= "#000";
	butdiv.win = thiswin;
//»
	let close = mkbut("15px");//«
	close.id="closebut_"+winid;
	close.innerHTML="<b>X</b>";
	close.title="Close";
	close.style.lineHeight = "110%";
	butdiv.close = close;
	titlebar.close = close;
	this.easyKill=()=>{
//		doclose(null, close);
		doclose();
	}
	this.forceKill = if_dev_reload => {
		if (this.is_minimized) this.unminimize(true);
//		doclose(null, close, true, if_dev_reload);
		doclose(true, if_dev_reload);
	};
	close.onclick=()=>{
		if (this._savecb) this._savecb();
		this.forceKill();
	}
	this.keyKill = () => {
		if (this.app && this.app.is_editing) {
			if (this.app.try_kill) this.app.try_kill();
			else cwarn("Dropping close signal");
		} 
		else {
//			doclose(null, close, true);
			doclose(true);
		}
	};
//»
	let max = mkbut("14px");//«
	max.id="maxbut_"+winid;
	max.style.lineHeight = "16px";
	max.reset=()=>{
		max.innerText="\u{1f5d6}";
		max.title="Maximize";
		win.style.boxShadow = window_boxshadow;
	};
	max.onclick = () => {
		close.unhover();
		max.unhover();
		min.unhover();
//		toggle_max_window(win);
//		maximize_window(thiswin);
		this.maximize();
	};
	max.reset();
//»
	let min = mkbut("14px");//«
	min.id="minbut_"+winid;
//	min.innerText="\u{1f5d5}"; 
	min.innerText="\u{2b07}"; //Solid down arrow
	min.style.lineHeight="135%";
	min.title="Minimize";
	min.onclick=()=>{
		if (this.is_fullscreen) {
			if (thiswin!==CWIN) {
cwarn("thiswin!==CWIN ????");
				return;
			}
//			fullscreen_window(true);
			this.fullscreen(true);
		}
		if (this.is_minimized||this.is_tiled) return;
		if (ICONS.length && ICONS[0].parWin==this) icon_array_off();
		taskbar.addwin(thiswin);
	};
//»
//Button event listeners«
	close.draggable=max.draggable=min.draggable=true;
	close.ondragstart=max.ondragstart=min.ondragstart=(e)=>nopropdef;
	close.onmousedown=max.onmousedown=min.onmousedown=(e)=>{
		icon_array_off();
	}
	close.onmouseenter=onhover;
	close.onmouseleave=onunhover;
	max.onmouseenter=onhover;
	max.onmouseleave=onunhover;
	min.onmouseenter=onhover;
	min.onmouseleave=onunhover;
//»
	title._add(butdiv);

//»
	let footer = make('div');//«
	let footer_wrap=make('div');

/*«The BOTTOMPAD property is ultimately given to us via a WINARG argument, so
that, for example, from Desk.api.saveAs (@DWEUNFKL), a folder window can be
opened up that has a Main window with a smaller height than normal (shrunken by
the amount of SAVEAS_BOTTOM_HGT), so that buttons (like Save and Cancel) can be
put on the bottom. The point is that this bottom area is considered to be part
of the system's "window chrome" (like the titlebar), and the application
doesn't have to worry about changing anything about the logic of it's own
layout.
»*/
	let bottom_div = make('div');
	if (botpad){
		bottom_div._bgcol="#373747";
		bottom_div._tcol="#ddd";
		bottom_div.style.borderTop="1px solid #556";
		bottom_div.style.borderBottom="1px solid #556";
		bottom_div._h=botpad-2;
		footer_wrap._add(bottom_div);
	}

	footer._dis="flex";
	footer.style.justifyContent="space-between";
	footer._h=18;
	let statdiv=make('div');
	statdiv.id="stat_"+winid;
	statdiv.onmousedown=e=>{
		e.stopPropagation();
		icon_array_off();
	};
	statdiv.onclick=noprop;
	statdiv.oncontextmenu=noprop;
	statdiv._tcol="#ddd";
	statdiv._fs=14;
	statdiv._padl=3;
	statdiv._padt=1;
	statdiv._over="hidden";
	let rsdiv = make('div');
	rsdiv.id="rsdiv_"+winid;
	rsdiv.win = thiswin;
	rsdiv.style.flex="0 0 15px";
	rsdiv._bgcol="#778";
	rsdiv._bor="2px inset #99a";
	rsdiv.onmouseover=e=>{
		if (CDL) rsdiv.style.cursor = "";
		else rsdiv.style.cursor = "nwse-resize";
	};
	rsdiv.draggable=true;
	rsdiv.ondragstart=e=>{
		e.preventDefault();
		if (this.is_maxed) max.reset();
		CRW = thiswin;
		if (CRW != CWIN) CRW.on();
		desk.style.cursor = "nwse-resize";
	};
	statdiv.resize=()=>{statdiv.style.maxWidth = main._w - 20;};

	footer._add(statdiv);
	footer._add(rsdiv);
	footer_wrap._add(footer);
//»

	win._add(titlebar);
	win._add(main);
	win._add(footer_wrap);
	desk._add(win);
//»

//Properties«

Object.defineProperty(this, "fullpath", {//«
	get: ()=>{
		if (!this.name) {
			return null;
		}
		let path = (this.path ? this.path : "/") + "/" + this.name;
		if (this.ext) path = path + "." + this.ext;
		return path.regpath();
	}
});//»
Object.defineProperty(this, "title", {//«
	get: () => {
		return namespan.innerText.trim();
	},
	set: arg => {
		let str = arg.regstr().replace(/\x20/g, "\xa0");
		namespan.innerText = str;
		if (this.is_minimized) this.mintitle.innerText = str
	}
});//»

	this.Desk = Desk;
	this.bottom_div = bottom_div;
	this.status_bar = statdiv;
	this.rs_div = rsdiv;
	this.footer=footer_wrap;
	this.butdiv = butdiv;
	this.close_button = close;
	this.max_button = max;
	this.minimize_button = min;
	this.main = main;
	this.titlebar = titlebar;
	this.title_div = title;
	this.title = wintitle;
	this.winElem = win;
	this.app = {onresize:NOOP};
	this.appName = app;
	this.type = "window";
	this.id=winid;
	this.namespan = namespan;
	this.img_div = img_div;
	if (arg.APPARGS) this.nosave = true;
	else this.nosave = null;
	this["bgcol.on"]=WIN_COL_ON;
	this["bgcol.off"]=WIN_COL_OFF;

//»
//Methods«

	this.up=()=>{//«
		if (this.is_minimized) this.unminimize(true);
		win.style.zIndex = ++HI_WIN_Z;
		if (this.overdiv) this.overdiv.style.zIndex = ++HI_WIN_Z;
	};//»
	this.getIcons=()=>{//«
		let _icons = main.getElementsByClassName("icon");
		let ret = [];
		for (let icn of _icons) ret.push(icn.icon);
		return ret;
	};//»
	this.on = (which, if_no_zup) => {//«
		if (this.killed) return;
		if (!windows_showing) toggle_show_windows();
		if (CPR) return;
		if (CWIN) {
			if (this === CWIN) return;
			CWIN&&CWIN.off();
		}
		else {
			if (CUR.parentNode === desk) {
				desk.lastcurpos = CUR.getpos();
				CUR.off();
			}
		}
		this.winElem._dis= "block";
		if (is_folder && !this.is_minimized) {
			this.main.focus();
			CUR.icon_div = this.main.icon_div;
			CUR.main = this.main;
			this.main._add(CUR.curElem);
			this.cursor = CUR;
			CUR.set();
			CUR.on();
		}
		if (if_no_zup){}
		else if (this.winElem._z && this.winElem._z < 10000000) this.up();

		CWIN = this;
		
		this.zhold = null;
		if (!this.no_shadow) this.winElem.style.boxShadow = window_boxshadow;
		document.activeElement.blur();
		this.img_div._op= 0.75;
		this.namespan._fw = "bold";
		this.namespan._tcol= this.namespan["tcol.on"];
		this.winElem._bgcol= this["bgcol.on"];
		if (this.butdiv) this.butdiv.on();
		if (this.movediv) this.movediv.on();
		let winobj = this.app;
		if (winobj) {
			if (winobj.onfocus&&!this.popup) winobj.onfocus();
		}
		else{
	cwarn(`window_on(): NO WINOBJ for this`, this);
		}
		if (this.is_minimized) this._button.onmousedown();
		if (CWIN.child_win) CWIN.child_win.on();

	};
	//»
	this.off = () => {//«
		if (is_folder) {
			delete this.cursor;
			this.cursor = null;
		}
		this.img_div._op= 0.5;
		this.namespan._fw = "";
		this.namespan._tcol= this.namespan["tcol.off"];
		this.winElem._bgcol = this["bgcol.off"];
		if (this.butdiv) this.butdiv.off();
		if (this.movediv) this.movediv.off();
		if (this.area) {
			this.area.selectionEnd = this.area.selectionStart;
			this.area.blur();
		}
		this.winElem.style.boxShadow = "";
		if (this.app && this.app.onblur) this.app.onblur();
		if (this == CWIN) CWIN = null;
		if (this.is_minimized) {
			this._button.onmouseup();
			this.winElem._dis="none";
		}
	};
	//»
	this.set_defs = () => {//«
		if (isMobile) this.fullscreen(true);
		let a = this.app;
		a.winid = this.id;
		a.topwin = this;
		if (!a.onresize) a.onresize = NOOP;
		if (!a.onappinit) a.onappinit = NOOP;
		if (!a.onkill) a.onkill = NOOP;
		if (!a.onsave) a.onsave = NOOP;
		if (!a.onloadfile) a.onloadfile = NOOP;
		if (!a.onfocus) a.onfocus = NOOP;
		if (!a.onblur) a.onblur = NOOP;
		if (!a.onkeydown) a.onkeydown = NOOP;
		if (!a.onkeyup) a.onkeyup = NOOP;
		if (!a.onkeypress) a.onkeypress = NOOP;
		if (!a.get_context) a.get_context = ()=>{return [];}
	//	check_win_visible(this);
		this.check_visible();
		this.status_bar.resize();
		this.on();

	};//»
	this.check_visible=()=>{//«
		let rect = win.getBoundingClientRect();
		if (!rect) return;
		if ((rect.left > winw()) || (rect.right < 0) || (rect.top > winh()) || rect.bottom < 0) {
			cwarn("WINDOW IS OFFSCREEN... moving it to 0,0!");
			win._loc(0, 0);
		}
	};
	//»
	this.check_loc = () => {//«
		let rect = win._gbcr();
		let w = rect.width,
			h = rect.height;
		let miny = 0;
		if (win._x < 0) {
			if (!win_overflow.left) win._x= 0;
			else if (win._x + w < 0) win._x += 2 * win_move_inc;
		} else if (win._x + w > winw()) {
			if (!win_overflow._r) win._x= winw() - w;
			else if (win._x > winw()) win._x -= 2 * win_move_inc;
		}
		if (win._y < miny) {
			if (!win_overflow.top) win._y= miny;
			else if (win._y + h < 0) win._y += 2 * win_move_inc;
		} else if (win._y > miny && win._y + h > winh()) {
			if (!win_overflow.bottom) {
				let usey = winh() - h;
				if (usey < miny) usey = miny;
				win._y= usey;
			} else if (win._y > winh()) win._y -= 2 * win_move_inc;
		}
	}//»
	this.check_size = () => {//«
		if (main._w < min_win_width) main._w= min_win_width;
		else if (win._x + win.clientWidth > winw()) {
			if (!win_overflow.right) main._w= winw() - win._x;
		}
		if (win._h < 1) win._h = 1;
		else if (win._y + win.clientHeight > winh()) {
			if (!win_overflow.bottom) {
				let menu_hgt = 0;
				let winfrills = this.titlebar._h + 15;
				let calc_hgt = winh() - win._y - winfrills - 3;
				if (calc_hgt < 1) calc_hgt = 1;
				main._h = calc_hgt;
			}
		}
	}//»
	this.add_to_resize_wins=()=>{//«
		if (!CRWINS) CRWINS=[];
		if (CRWINS.indexOf(this)<0) {
			CRWINS.push(this);
		}
	};//»
	this.set_fullscreen_dims=()=>{//«
		let usepl = 0;
		let usepr = 0;
		let pl = main._padl;
		let pr = main._padr;
		if (pl) usepl = pi(pl);
		if (pr) usepr = pi(pr);
		win._bor="";
		win._x= 0;
		if (this.no_chrome_mode) win._y=0;
		else win._y= "-" + (this.titlebar._h) + "px";
		main._w= winw() - usepl - usepr;
		main._h = winh(true);
	};//»
	this.fullscreen = (if_instant) => {//«
		if (this.is_transitioning) return;
		let transend = e => {
			win.style.transition = "";
			main.style.transition = "";
			this.status_bar.resize();
			this.app.onresize();
			if (this.movediv) this.movediv.update();
			win.removeEventListener('transitionend', transend);
			this.is_transitioning = null;
			delete this.is_transitioning;
		};
		if (this.is_tiled || this.is_minimized) return;
		win.style.transition = "left 0.2s,top 0.2s";
		main.style.transition = "width 0.2s,height 0.2s";
		if (this.is_fullscreen) {
			win._bor= this.bor_hold;
			delete this.bor_hold;
			win._x= this.fsholdx;
			win._y= this.fsholdy;
			main._w= this.fsholdw;
			main._h = this.fsholdh;
			this.is_fullscreen = false;
		} else {
			this.fsholdw = main._w;
			this.fsholdh = main._h;
			this.fsholdx = win._x;
			this.fsholdy = win._y;
			this.bor_hold = win._bor;
			this.set_fullscreen_dims();
			this.is_fullscreen = true;
		}

		if (if_instant) transend();
		else {
			this.is_transitioning = true;
			win.addEventListener('transitionend', transend);
		}

	}//»
	this.set_max_dims = ()=>{//«
		let usepl = 0;
		let usepr = 0;
		let pl = main._padl;
		let pr = main._padr;
		if (pl) usepl = pi(pl);
		if (pr) usepr = pi(pr);
		win._loc(1,0);
		main.style.width = winw() - usepl - usepr - 2;
		main.style.height = winh() - this.titlebar._gbcr().height - this.footer._gbcr().height;
		win.style.boxShadow = "";
		max.innerText="\u{1f5d7}";
		max.title="Unmaximize";
	};//»
	this.maximize = (if_instant) => {//«
		if (this.is_tiled||this.is_transitioning||this.is_minimized||this.is_fullscreen) return;
		let transend = e =>{
			win.style.transition = "";
			main.style.transition = "";
			this.status_bar.resize();
			this.app.onresize();
			win.removeEventListener('transitionend', transend);
			this.is_transitioning = null;
			delete this.is_transitioning;
		};
		win.style.transition = "left 0.2s, top 0.2s";
		main.style.transition = "width 0.2s, height 0.2s";
		let max = this.max_button;
		if (!this.is_maxed) {
			this.maxholdw = main._w;
			this.maxholdh = main._h;
			this.maxholdx = win._x;
			this.maxholdy = win._y;
			this.is_maxed = true;
			this.set_max_dims();
		} else {
			this.is_maxed = false;
			main._w= this.maxholdw;
			main._h = this.maxholdh;
			win._x= this.maxholdx;
			win._y= this.maxholdy;
			win.style.boxShadow = window_boxshadow;
			max.innerText="\u{1f5d6}";
			max.title="Maximize";
		}
		if (if_instant) transend();
		else {
			this.is_transitioning = true;
			win.addEventListener('transitionend', transend);
//			this.is_transitioning = true;
//			win.addEventListener('transitionend', transend);
		}
	};//»
	this.minimize=()=>{this.minimize_button.click();};
	this.close=()=>{this.keyKill();}
	this.toggle_layout=(if_set)=>{//«
		let get_cursor = (e, rect) => {//«
			let lr_pad = rect.width * 0.25;
			let tb_pad = rect.height * 0.25;
			let lhit = false;
			let rhit = false;
			let thit = false;
			let bhit = false;
			let ret;
			if (e.clientX < rect.left + lr_pad) lhit = true;
			else if (e.clientX > rect.right - lr_pad) rhit = true;
			if (e.clientY < rect.top + tb_pad) thit = true;
			else if (e.clientY > rect.bottom - tb_pad) bhit = true;;
			if (rhit && bhit) ret = ["nwse-resize", "se"];
			else if (lhit && thit) ret = ["nwse-resize", "nw"];
			else if (rhit && thit) ret = ["nesw-resize", "ne"];
			else if (lhit && bhit) ret = ["nesw-resize", "sw"];
			else if (rhit) ret = ["ew-resize", "e"];
			else if (lhit) ret = ["ew-resize", "w"];
			else if (thit) ret = ["ns-resize", "n"];
			else if (bhit) ret = ["ns-resize", "s"];
			else ret = ["move"];
	//log(ret);
			if (this.is_tiled) {
				if (ret[0][2]!=="-"||num_tiled_wins>MAX_TILED_WINS_FOR_RESIZING) return [""];

	//Comment this to allow the more difficult case of north and west resizing...
	//			if (ret[1]=="w"||ret[1]=="n") return [""];

	//Need to figure out if this is an interior edge.

				if ((lhit && rect.left <= 0)||
					(thit && rect.top <= 0)||
					(rhit && rect.right + 3 > winw())||
					(bhit && rect.bottom + 3 > winh())) return[""];

	//				if (bhit && rect.top > 0) return [""];

			}
			return ret;
		};//»

		let mkhandle = (wid, hgt, x, y) => {//«
			let div = make('div');
			div._bor= "1px solid black";
			div._pos= "absolute";
			div._w= wid;
			div._h = hgt;
			if (x) div._x= 0;
			else div._r= 0;
			if (y) div._y= 0;
			else div._b= 0;
			odiv._add(div);
		};//»

		if (this.is_layout) {
			desk.style.cursor = "default";
			this.movediv._del();
			delete this.movediv;
			delete this.rs_dir;
			this.is_layout = false;
			return;
		}
		let odiv;
		let dsty = document.body.style;
		let rect = win.getBoundingClientRect();
		odiv = make('div');
		let osty = odiv.style;
		odiv._pos= "absolute";
		odiv._w= rect.width;
		odiv._h = rect.height; 
		odiv._x= 0;
		odiv._y= 0;
		odiv._z= 10000000;
		odiv.class = "titlebar";
		odiv.win = this;
		odiv.onmousemove = (e) => {
			if (CDICN || CRW) return;
	//		if (this.is_layout) return;
			osty.cursor = get_cursor(e, odiv.getBoundingClientRect())[0];
		};

		odiv.oncontextmenu = nopropdef;

		odiv.onmousedown = (e) => {//«
			e.stopPropagation();
			if (this != CWIN) this.on();
			let arr = get_cursor(e, odiv.getBoundingClientRect());
			let sty = arr[0];
			osty.cursor = sty;
			if (this.is_tiled) {
			if (!sty) return;

	/*
	Once we figure out the logic of how to resize the other windows that are 
	being overlapped, then we can comment out this.
	*/
	//return;
			}
			if (sty == "move") {
				CDW = this;
				DDX = e.clientX - pi(win.offsetLeft);
				DDY = e.clientY - pi(win.offsetTop);
				return;
			}
			CRW = this;
	//log(CRW);
			CRW.startx = e.clientX;
			CRW.starty = e.clientY;
			CRW.startw = this.main._w;
			CRW.starth = this.main._h;
			CRW.rs_dir = arr[1];
			CRW.startl = win._x;
			CRW.startt = win._y;
		};//»
		odiv.onmouseup = e => {//«
			update_and_clear_resize_wins();
			CDW = null
		};//»
		odiv.update = () => {//«
			let rect = win._gbcr();
			odiv._w= rect.width;
			odiv._h = rect.height;
			statdiv.innerHTML = Math.round(rect.width) + "x" + Math.round(rect.height) + "+" + Math.round(rect.left) + "+" + Math.round(rect.top);
	//		statdiv._w= odiv._w - 40;
		};//»
	//	odiv._bgcol=capi.randCol(0.25);
		odiv.on=()=>{
			statdiv._tcol= "#ccc";
			odiv._bgcol= "rgba(224,224,224,0.4)";
		};
		odiv.off=()=>{
			statdiv._tcol= "#999";
			odiv._bgcol= "rgba(176,176,176,0.4)";
		};
		win._add(odiv);
		this.movediv = odiv;
		let statdiv = make('div');
		statdiv._bgcol= "#000";
		statdiv._fs= 21;
		statdiv.vcenter();
		statdiv._ta= "center";
		statdiv._over="hidden";
		odiv._add(statdiv);
		odiv.update();
		mkhandle("100%", "25%", 1, 1);
		mkhandle("100%", "25%", 1, 0);
		mkhandle("25%", "100%", 1, 1);
		mkhandle("25%", "100%", 0, 1);
		this.is_layout = true;
		if (CWIN == this) odiv.on();
		else odiv.off();


	};//»
	this.toggle_chrome = () => {//«
		if (this.is_fullscreen || this.is_maxed || this.is_minimized) return;
		this.no_chrome_mode = !this.no_chrome_mode;
		let bar = this.titlebar;
		let foot = this.footer;
		let m = main;
		if (this.no_chrome_mode) {
			let h = bar._gbcr().height + foot._gbcr().height;
			this.bor_hold = this._bor;
			this._bor= "";
			m.diff_h = h;
			bar._dis= "none";
			foot._dis= "none";
			m._h += h;

		} else {
			bar._dis= "block";
			foot._dis= "";
			this._bor= this.bor_hold;
			delete this.bor_hold;
			m._h -= m.diff_h;
		}
		this.status_bar.resize();
		this.app.onresize();
		return true;
	}//»

this.select_icons = () =>{//«
//let drag_div = this.drag_div;
let drect = this.drag_div.getBoundingClientRect();
let dr = drect.right;
let dl = drect.left;
let dt = drect.top;
let db = drect.bottom;
let OK=[];

let icons = this.getIcons();

for (let icn of icons) {
	let wrap = icn.wrapper;
	if (!wrap) continue;
	let rect = wrap.getBoundingClientRect();
	if (rect.left > dr || rect.right < dl || rect.top > db || rect.bottom < dt) {
		icn.off();
	}
	else {
		OK.push(icn);
//		icon_on(icn);
		icn.on();
	}
	
}
ICONS = OK;
};//»


//»
//Event listeners«

	if (is_folder) {//«
		let didleave;
		const clear_drag = () => {//«
			WDIE = null;
			let dd = this.drag_div;
			dd._loc(-1, -1);
			dd._w = 0;
			dd._h = 0;
		};//»
		const nogo=()=>{//«
			if (!CDL) return;
			CDL.nogo();
			main.style.cursor = "not-allowed";
		};//»
		const on = () => {//«
			if (!CDL) return;
			main.style.cursor = "copy";
			CDL.into(this.name);
		};//»
		const off = () => {//«
			main.style.cursor = "";
			if (CDL) CDL.reset();
		};//»
		main.onmousedown=e=>{//«
			e.stopPropagation();
			icon_array_off(20);
			if (e.clientX < win.offsetLeft + main.clientWidth + winx() && e.clientY < win.offsetTop + main.clientHeight + this.titlebar._h + winy()) {
				this.on();
				WDIE = e;
				WDIE.scrtop = main.scrollTop;
				WDIE.scrleft = main.scrollLeft;
				let gotw = main.scrollWidth - (e.clientX - win.offsetLeft + main.scrollLeft);
				WDIE._maxWidth = gotw - 1 + winw();
			}
			if (CWIN == this) return;
			CWIN&&CWIN.off();
			this.on();
		};//»
		main.onmouseover=e=>{//«
			e.stopPropagation();
			if (CDICN){
				if (CDICN.path === this.fullpath) return nogo();
		//		if ((capi.newPathIsBad(CDICN.fullpath(), win.fullpath + "/" + CDICN.name))) return nogo();
				if ((capi.newPathIsBad(CDICN.fullpath, this.fullpath + "/" + CDICN.name))) return nogo();
				didleave = false;
				if (!CDICN) return;
				if (!didleave) on();
			}
		};//»
		main.onmouseout=e=>{//«
			e.stopPropagation();
			off();
			if (CDICN) {
				didleave = true;
			}
		};//»
		main.onmouseup=async e=>{//«
			e.stopPropagation();
			if (CDICN){
				desk.style.cursor = "";
				await move_icons(this.fullpath, {e, win: this});
				off();
				CWIN&&CWIN.off();
				CDICN = null;
				cldragimg();
			}
			else {
				CRW = null;
				CRWINS = null;
				CDW = null;
				clear_drag();
			}
		};//»
		main.ondrop=e=>{//«
			e.stopPropagation();
			e.preventDefault();
			save_dropped_files(e, this);
		};//»
		main.onmouseleave=e=>{clear_drag();};
		main.ondragover=e=>{};
		this.clear_drag = clear_drag;
		win.onmouseover=noprop;
		win.onmouseout=noprop;
	}//»
	else{//«
		main.onmouseup=e=>{
			CRW = null;
			CRWINS = null;
			CDW = null;
		};
		main.ondrop=e=>{
cwarn("No drop on main window");
		};
		win.onmouseover=()=>{
			if (!CDL) return;
			CDL.nogo();
			win.style.cursor = "not-allowed";
			main.style.cursor = "not-allowed";
		};
		win.onmouseout=()=>{
			if (!CDL) return;
			CDL.reset();
			win.style.cursor = "";
			main.style.cursor = "";
		};
	}//»
	title.ael('mouseover',()=>{body.style.cursor="default";});
	titlebar.onmouseover=e=>{//«
		if (CDL) titlebar.style.cursor = "";
		else titlebar.style.cursor = "move";
	};//»
	titlebar.oncontextmenu = nopropdef;
	titlebar.draggable=true;
	titlebar.ondragstart=e=>{//«
		e.preventDefault();
//		if (this.is_maxed) this.max_button.reset();
		if (this.is_maxed) return;
		win.style.boxShadow = "";
		CDW = thiswin;
		DDX = e.clientX - pi(win.offsetLeft);
		DDY = e.clientY - pi(win.offsetTop);
	};//»
	main.oncontextmenu = e => {//«

//		if (isMobile) return;
		e.preventDefault();
		e.stopPropagation();
//		if (have_window_cycle) return;
//		if (!cmenu_active) return;
//		if (this.contextMenuOn) this.contextMenuOn(e);
	};//»
	win.ondrop = e => {//«
		e.stopPropagation();
		e.preventDefault();
	};//»
	win.onclick=noprop;
	win.ondblclick=noprop;
	win.onmousedown=e=>{//«
		e.stopPropagation();
		icon_array_off(21);
		this.on();
	};//»
	win.ondrop = nopropdef;
	win.ondragover = nopropdef;
/*
{//Touch scrolling of "main" div«
	let tch1;
	let scrt1;
	main.addEventListener('touchstart', e => {
		if (tch1) return;
		scrt1 = main.scrollTop;
		tch1 = e.touches[0];
	});
	main.addEventListener('touchmove', e =>{
		if (!tch1) return;
		let t = e.changedTouches[0];
		let dy = tch1.pageY - t.pageY;
		main.scrollTop = scrt1 + dy;
	});
	main.addEventListener('touchend', ()=>{
		tch1 = null;
	});

}//»
*/
//»
//Context menu«
	this.contextMenuOn = (e) => {
		if (!this.app.get_context) return;
		let items = this.app.get_context();
		if (!(items&&items.length)) items=[
			"Fake\xa0Choice",()=>{
				popup("I'm fake");
			}
		];
		CG.on();
		let op_hold = img_div._op;
		let usex,usey;
		if (e) {
			usex = e.clientX;
			usey = e.clientY;
		}
		else{
			img_div._bgcol= "#fff";
			img_div._op=1;
			let rect = win._gbcr();
			usex = rect.left;
			usey = rect.top+this.titlebar._h;
		}
//log(items);
		set_context_menu({X:usex,Y:usey},{items: items});
		desk_menu.kill_cb = () => {
			img_div._op=op_hold;
			img_div._bgcol= "";
			if (this.app&&this.app.onfocus) {
				setTimeout(this.app.onfocus,50);
			}
		};

	};//»

//Make app«
	arg.topwin = this;
	arg.FS_URL = fs_url;
	if (arg.SAVER) {
		this.bottompad = botpad;
		this.saver = arg.SAVER;
		arg.SAVER.folderCb(this);
	}
	make_app(arg);
	windows.push(this);
//»

}
//»

const get_newwin_obj = (app) => {//«
	const map={
//An (old) example for default winargs, based on the app name
//		"sys.Login":{WID:650,HGT:400, CENTER: true}
	};
	let usew = 0.95 * winw();
	if (usew < 0) usew = winw();
	let useh = 0.5 * winh();
	if (useh < 0) useh = winh();
	let obj;
	if (app) obj = map[app];
	if (!obj) {
		obj={};
		obj.X = 15;
		obj.Y = 35;
		obj.WID = usew;
		obj.HGT = useh;
	}
	return obj;
}//»
const get_wins_by_path = (path,opts={}) => {//«

	let {getDesk, extArg}=opts;
	let ret = [];
	path = path.regpath();
	for (let w of windows) {
		let ext = w.ext;
		let winpath = (w.path + "/" + w.name).regpath();
		if (winpath !== path) continue;
		if (extArg) {
			if (ext === extArg) ret.push(w);
		} else if (!ext) ret.push(w);
	}
	if (path === DESK_PATH && getDesk) ret.push(desk);
	return ret;

};
api.getWinsByPath = get_wins_by_path;
//»
const get_active_windows = () => {//«
	let wins = [];
	for (let i = 0; i < windows.length; i++) {
		let w = windows[i];
		if (w.killed) {
			windows.splice(i, 1);
			i--;
		} else if (!w.is_minimized) wins.push(w);
	}
	return wins;
}//»

const fit_all_windows=()=>{//«
	let w = document.body.clientWidth;
	let h = document.body.clientHeight;

	for (let win of windows){
		win.main._w = w;
		win.main._h = h;
		win.app.onresize();
	}

}//»
const toggle_show_windows = (if_no_current) => {//«
	let wins = get_active_windows();
	if (windows_showing) {
		windows_showing = false;
		for (let i = 0; i < wins.length; i++) {
			let w = wins[i];
			if (w == CWIN) w.is_current = true;
			w.winElem._dis= "none";
			if (w.overdiv) w.overdiv._dis= "none";
		}
		CWIN && CWIN.off();
		CWIN = null;
		CUR.todesk();
if (tiling_mode){
tiling_underlay.off();
}
	} else {
		windows_showing = true;
		CWIN && CWIN.off();
		for (let i = 0; i < wins.length; i++) {
			let w = wins[i];
			w.winElem._dis= "";
			if (w.overdiv) w.overdiv._dis= "";
			if (w.is_current) {
				if (!if_no_current) {
					if (w.is_minimized) w.overdiv.on();
					else w.on();
				}
				w.is_current = null;
			}
		}
		if (!CWIN && !if_no_current) top_win_on();
if (tiling_mode){
tiling_underlay.on();
}
	}
//	Desk.update_windows_showing();
	return true;
}//»
const toggle_layout_mode = () => {//«
	let gotwins=[];
	for (let w of windows){
		if (w.is_maxed || w.is_fullscreen) {
			popup("Cannot initiate layout mode!");
			return true;
		}
		if (!w.is_minimized) gotwins.push(w);
	}
	layout_mode = !layout_mode;
	for (let w of gotwins){
		if (layout_mode && w.is_layout) continue;
		if (!layout_mode && !w.is_layout) continue;
		w.toggle_layout(layout_mode);
	}
	return true;
};//»
const toggle_tiling_mode = () => {//«

//0 overlap leaves a gap
	let TILING_OVERLAP=1;

	const reset_wins=()=>{//«
		for (let _w of arr) _w.is_tiled = false;
	};//»
	const intersects = (w1, w2) => {//«
		let t1 = w1.T;
		let b1 = w1.B;
		let l1 = w1.L;
		let r1 = w1.R;
		let t2 = w2.T;
		let b2 = w2.B;
		let l2 = w2.L;
		let r2 = w2.R;
		if (t1 < 0 || t2 < 0) return true;
		if (b1 > hgt || b2 > hgt) return true;
		if (l1 < 0 || l2 < 0) return true;
		if (r1 > wid || r2 > wid) return true;
		if (!(l1 > r2 || r1 < l2 || t1 > b2 || b1 < t2)) {
			return true;
		}
		return false;
	};//»
	const intersects_any = w1 => {//«
		for (let w2 of arr) {
			if (w1.win === w2.win) continue;
			if (intersects(w1, w2)) return true;
		}
		return false;
	};//»
	const do_step = (step_sz) => {//«
		for (let w of arr) {
			if (w.is_tiled) continue;
			let got_change = false;
			for (let i = 0; i < 4; i++) {
				if (i == 0) {
					if (!intersects_any({win: w.win,L:w.L-step_sz,R:w.R,T:w.T,B:w.B})) {
						w.L-=step_sz;
						got_change = true;
					}
				} else if (i == 1) {
					if(!intersects_any({win:w.win,L:w.L,R:w.R+step_sz,T:w.T,B:w.B})){
						w.R+=step_sz;
						got_change = true;
					}
				} else if (i == 2) {
					if(!intersects_any({win:w.win,L:w.L,R:w.R,T:w.T-step_sz,B:w.B})){
						w.T-=step_sz;
						got_change = true;
					}
				} else if (i == 3) {
					if(!intersects_any({win:w.win,L:w.L,R:w.R,T:w.T,B:w.B+step_sz})){
						w.B+=step_sz;
						got_change = true;
					}
				}
			}
			if (!got_change) w.is_tiled = true;
		}
	};//»
	const do_steps=(step_sz)=>{//«
		let max_steps = 2*((winw()>winh())?winw():winh());
		for (let iters = 0; iters < max_steps; iters++) {//«
			let got_all_maxed = true;
			for (let _w of arr) {
				if (!_w.is_tiled) {
					got_all_maxed = false;
					break;
				}
			}
			if (!got_all_maxed) do_step(step_sz);
			else break;
		}//»
	}//»
	let wid = winw();
	let hgt = winh();
	let arr = [];
	let if_intersects = false;
	let has_tile_holds = false;
	for (let win of windows) {//«
		if (!win.is_minimized) {
			let rect = win.winElem._gbcr();
			arr.push({win:win,T:rect.top,B:rect.bottom,L:rect.left,R:rect.right});
			if (win.no_chrome_mode) win.toggle_chrome();
			if (isFinite(win.tileholdw) && isFinite(win.tileholdh) && isFinite(win.tileholdx) && isFinite(win.tileholdy)) {
				has_tile_holds = true;
				win.main._w= win.tileholdw;
				win.main._h = win.tileholdh;
				win.winElem._x= win.tileholdx;
				win.winElem._y= win.tileholdy;
			}
			else if (win.is_tiled) has_tile_holds = true;

			if (win._bor_hold){
				win.winElem._bor = win._bor_hold;
				delete win._bor_hold;
			}
			win.app.onresize();
			if (win.movediv) win.movediv.update();
			delete win.tileholdw;
			delete win.tileholdh;
			delete win.tileholdx;
			delete win.tileholdy;
			delete win.is_tiled;
		}
	}//»
	if (has_tile_holds) {
		window_boxshadow = window_boxshadow_hold;
		tiling_mode = false;
		tiling_underlay.off();
		return;
	}

	if (!arr.length) return popup("Nothing to do!");
	if (arr.length == 1) return popup("The max button should work,\x20no?");
	num_tiled_wins = arr.length;
	LOOP1: for (let j = 0; j < arr.length; j++) {//«
		let w1 = arr[j];
		for (let i = j + 1; i < arr.length; i++) {
			let w2 = arr[i];
			if (intersects(w1, w2)) {
//log(w1.win, w2.win);
				if_intersects = true;
				break LOOP1;
			}
		}
	}//»
	if (if_intersects) {
		popup("Can't do window tiling!\x20(Overlapping windows detected)");
		return;
	}
//}
//	do_steps(100);
//	reset_wins();
	do_steps(10);
	reset_wins();
	do_steps(1);
	let tot_area=0;
	let wins=[];
	for (let _w of arr) {//«
		let win = _w.win;
		wins.push(win);
		win.is_tiled = true;
		let rect = win.winElem._gbcr();
		let main = win.main;
		let dl = TILING_OVERLAP + rect.left - _w.L;
		let dr = TILING_OVERLAP + _w.R - rect.right;
		let dt = TILING_OVERLAP + rect.top - _w.T;
		let db = TILING_OVERLAP + _w.B - rect.bottom;
		win.tileholdw = main._w;
		win.tileholdh = main._h;
		win.tileholdx = win.winElem._x;
		win.tileholdy = win.winElem._y;
		main._w += (dl + dr);
		win.winElem._x -= dl;
		main._h += (dt + db);
		win.winElem._y -= dt;
		win.winElem.style.boxShadow = "";
		if (!win.no_chrome_mode) win.toggle_chrome();
		else win.app.onresize();
//		win.app.onresize();
		if (win.movediv) win.movediv.update();

		win._bor_hold = win._bor;
		win.winElem._bor = "0px solid #000";

		let rect2 = win.winElem.getBoundingClientRect();
		tot_area+=rect2.width*rect2.height;
	}//»
	window_boxshadow_hold = window_boxshadow;
	window_boxshadow = "";
	tiling_mode = true;
	tiling_underlay.on();
//setTimeout(()=>{
//log(tiling_underlay);
//},100);
};//»

const window_cycle = () => {//«

	if (tilde_press) return;

	let wins = windows;
	let len = wins.length;
	if (!len) return;

	if (!num_win_cycles){
//		if (taskbar_hidden&&num_minimized_wins) taskbar.show(true);
		CWIN_HOLD = CWIN;
		wins.sort((a,b)=>{
			if (pi(a.winElem.style.zIndex) < pi(b.winElem.style.zIndex)) return 1;
			else if (pi(a.winElem.style.zIndex) > pi(b.winElem.style.zIndex)) return -1;
			return 0;
		});
		let samelen = num_minimized_wins === wins.length;
		let first;
		if (!(!CWIN_HOLD && !samelen)) first = wins.shift();
		if (show_desktop_during_win_cycle) {
			wins.push(NOWINDOW);
			len++;
		}
		if (first) wins.push(first);
		if (samelen && wins.includes(NOWINDOW)){
			windows.splice(windows.indexOf(NOWINDOW),1)
			wins.push(NOWINDOW);
		}
		nowindow_pos = wins.indexOf(NOWINDOW);
		CG.on(WIN_CYCLE_CG_OP);
	}

	if (CWCW){//Current Win Cycle Win
		CWCW.winElem._z= CWCW.z_hold;
		delete CWCW.z_hold;
		CWCW.off();
		if (CWCW.is_minimized && taskbar_hidden) taskbar.hide(true);
		CWCW = null;
	}
	let w = wins[num_win_cycles%len];
	if (w===NOWINDOW){
		have_window_cycle = true;
		win_cycle_wins_hidden = true;
		toggle_show_windows();
		num_win_cycles=nowindow_pos+1;
		CG.off();
		return;
	}

	if (win_cycle_wins_hidden){
		win_cycle_wins_hidden = false;
		toggle_show_windows();
		CG.on(WIN_CYCLE_CG_OP);
	}
//log(w);

/*«
	if (show_desktop_during_win_cycle) {
		if (!win_cycle_wins_hidden){ 
			if ((w===CWIN_HOLD) || (num_win_cycles && (!(num_win_cycles%len)))){
				if (w===CWIN_HOLD) num_win_cycles++;
				CWIN_HOLD=null;
				have_window_cycle = true;
				win_cycle_wins_hidden = true;
				toggle_show_windows();
				CG.off();
				return;
			}
		}
		if (win_cycle_wins_hidden){
			win_cycle_wins_hidden = false;
			toggle_show_windows();
			CG.on(WIN_CYCLE_CG_OP);
		}
	}
»*/
	CWCW = w;
	CWCW.z_hold = CWCW.winElem._z;
	CWCW.winElem._z= CG_Z+1;
	CWCW.on(true);
	if (CWCW.is_minimized && taskbar_hidden) taskbar.show(true);
	num_win_cycles++;

}//»
const top_win_on = () => {//«
	let gothi = -1;
	let gotwin = null;
	let wins = get_active_windows();
	for (let w of wins){
		if (w.winElem._z > gothi) {
			gothi = w.winElem._z;
			gotwin = w;
		}
	}
	if (gotwin) gotwin.on();
	else {
		CWIN = null;
		CUR.todesk();
	}
}//»
const move_window = (which, if_small) => {//«
	let w = CWIN;
	if (!w) return;
	if (w.is_minimized) {} else if (w.is_maxed) w.max_button.reset();
	let elem = w.winElem;
	let useinc;
	if (if_small) useinc = win_move_inc_small;
	else useinc = win_move_inc;
	if (which == "R") elem._x= elem._x + useinc;
	else if (which == "L") elem._x= elem._x - useinc;
	else if (which == "D") elem._y= elem._y + useinc;
	else if (which == "U") elem._y= elem._y - useinc;
	w.check_loc();
	if (w.overdiv) w.overdiv._loc(elem._x, elem._y);
	if (w.movediv) w.movediv.update();
	if (w.is_minimized) {
		w.last_min_x = elem._x;
		w.last_min_y = elem._y;
	}
}//»
const resize_window = (which, if_reverse, if_small) => {//«
	const w2r = () => {
		w.main._w= w.main._w - useinc;
		w.winElem._x += useinc;
	};
	const w2l = () => {
		let dx = w.winElem._x - useinc;
		if (dx < 0) useinc += dx;
		w.main._w= w.main._w + useinc;
		w.winElem._x -= useinc;
	};
	const n2d = () => {
		w.main._h = w.main._h - useinc;
		w.winElem._y += useinc;
	};
	const n2u = () => {
		let dy = w.winElem._y - useinc;
		if (dy < 0) useinc += dy;
		w.main._h = w.main._h + useinc;
		w.winElem._y -= useinc;
	};
	const e2r = () => {
		let dx = w.winElem._x + w.winElem._gbcr().width + useinc - winw();
		if (dx > 0) useinc -= dx;
		w.main._w= w.main._w + useinc;
	};
	const e2l = () => {
		w.main._w= w.main._w - useinc;
	};
	const s2d = () => {
		let dy = w.winElem._y + w.winElem._gbcr().height + useinc - winh();
		if (dy > 0) useinc -= dy;
		w.main._h = w.main._h + useinc;
	};
	const s2u = () => {
		w.main._h = w.main._h - useinc;
	};
	let w = CWIN;
	if (w.dialog) return;
	if (w.is_minimized) return;
	if (w.is_maxed) w.max_button.reset();
	let useinc;
	if (if_small) useinc = win_resize_inc_small;
	else useinc = win_resize_inc;
	if (if_reverse) {
		if (which == "R") e2l();
		else if (which == "L") w2r();
		else if (which == "D") s2u();
		else if (which == "U") n2d();
	} else {
		if (which == "R") e2r();
		else if (which == "L") w2l();
		else if (which == "D") s2d();
		else if (which == "U") n2u();
	}
	w.check_loc();
	w.check_size();
	check_rs_timer();
	if (w.movediv) w.movediv.update();
}//»
const handle_resize_event = e => {//«

const getorresize = (dir, val, rect, selfarg, if_resize)=>{//«
	let all = windows;
	let wins=[];
	all.map(win => {
		if (win.is_tiled && win !== selfarg) {
			wins.push(win)
		}
	});
	let low = Infinity;
	let lowwin;
let dolog=false;
	for (let win of wins){
if (win.id==="win_2") dolog=true;
//let id = win.id;
		let rct = win.winElem.getBoundingClientRect();
//let l = rct.left;
		let val2 = rct[dir];
		if (dir=="left"||dir=="right"){
			if (rct.top > rect.bottom || rct.bottom < rect.top) {
				continue;
			}
		}
		else{
 			if (rct.left > rect.right || rct.right < rect.left) {
//log("");
//log("BAD", win, win.id);
				continue;
			}
		}
		let diff = val-val2;
if (dolog) {
//cwarn(diff);
}
		if (if_resize){
			if (diff > 0){//«
				if (dir==="left") {
					win.winElem._x+=diff;
					let diff2 = win.winElem.getBoundingClientRect().right - winw();
					if (diff2 > 0) {
						win.main._w-= diff2;
						win.add_to_resize_wins();
					}
				}
				else if (dir==="right") {
					let diff2 = win.winElem.getBoundingClientRect().right - val;
					if (diff2 > 0) {
						win.main._w-= diff2;
						win.add_to_resize_wins();
					}
				}
				else if (dir==="top"){
					win.winElem._y+=diff;
					let diff2 = win.winElem.getBoundingClientRect().bottom - winh();
					if (diff2 > 0) {
						win.main._h-= diff2;
						win.add_to_resize_wins();
					}
				}
				else if (dir==="bottom"){
					let diff2 = win.winElem.getBoundingClientRect().bottom - val;
					if (diff2 > 0) {
						win.main._h-= diff2;
						win.add_to_resize_wins();
					}
				}
				if (win.movediv) win.movediv.update();
			}//»
			else{
				if (dir=="bottom") {
					win.main._h+=diff;
					win.add_to_resize_wins();
				}
				else if (dir=="right") {
					win.main._w+=diff;
					win.add_to_resize_wins();
				}
				if (win.movediv) win.movediv.update();
			}
		}
		else {
			diff = Math.abs(diff);
			if ((diff) < low) {
				low = diff;
				lowwin = win;
			}
		}
	}
	return lowwin;
};//»

/*
The rs_dir property is set in "window layout mode", which puts a div over
window that gives highly accessible "handles" for each of the directions
(n,s,e,w,ne,nw,se,sw) and a central handle for moving (not handled here).
*/

let dir = CRW.rs_dir;
//The user is dragging the tiny handle at the bottom right of every window
if (!dir){//«
let elem = CRW.winElem;
//log(CRW);
	CRW.main._w= CRW.main._w + (e.clientX - (pi(CRW.main.offsetWidth) + elem._x)) - winx();
	CRW.main._h = CRW.main._h + (e.clientY - (pi(CRW.main.offsetHeight) + elem._y + CRW.titlebar._h + CRW.footer.getBoundingClientRect().height)) - winy();
	if (CRW.main._w < min_win_width) CRW.main._w= min_win_width;
	CRW.status_bar.resize();
	return;
}//»

let tul = tiling_underlay;

//The user is dragging one of the 8 "window layout" handles described above
//Var«
let w = CRW;
let rect = w.winElem.getBoundingClientRect();
let odiv = w.movediv;
let m = w.main;
let ex = e.clientX;
let ey = e.clientY;
let sx = w.startx;
let sy = w.starty;
let sw = w.startw;
let sh = w.starth;
let sl = w.startl;
let st = w.startt;
let tiled = w.is_tiled;
//»

if (dir.match(/s/)) {//«
	let goth = sh + ey - sy;
//Tiled
	let lft, rgt;//«
	if (tiled){
		if (goth < rect.height) return;
		if (goth < sh) return;
		let bot = rect.bottom+2;
		lft = rect.left+5;
		rgt = rect.right-5;
		let gotwin;
		if (document.elementFromPoint(lft, bot)==tul) gotwin = getorresize("top", bot, {left: lft, right: rgt}, w);
		else if (document.elementFromPoint(rgt, bot)==tul) gotwin = getorresize("top", bot, {left: lft, right: rgt}, w);
		if (!gotwin) return;
		let torect = gotwin.winElem.getBoundingClientRect();
//		let totop = gotwin.top;
		let totop = torect.top;
		if (e.clientY > totop) return;
	}//»

	if (goth > min_win_hgt) {
		m._h = goth;
		let dy = w.winElem._gbcr().bottom - winh();
		if (dy > 0 && !win_overflow.bottom) m._h -= dy;
	}
	if (tiled) getorresize("top", rect.bottom, {left: lft, right: rgt}, w, true);
} //»
else if (dir.match(/n/)) {//«
	let dy = e.clientY - sy;
	let goth = sh - dy;

//Tiled

	let lft, rgt;//«
	if (tiled){
		if (goth < rect.height) return;
		if (goth < sh) return;
		let _top = rect.top-1;
		lft = rect.left+5;
		rgt = rect.right-5;
		let gotwin;
		if (document.elementFromPoint(lft, _top)==tul) gotwin = getorresize("bottom", _top, {left: lft, right: rgt}, w);
		else if (document.elementFromPoint(rgt, _top)==tul) gotwin = getorresize("bottom", _top, {left: lft, right: rgt}, w);
		if (!gotwin) return;
		let torect = gotwin.winElem.getBoundingClientRect();
//		let tobot = gotwin.bottom;
		let tobot = torect.bottom;
		if (e.clientY < tobot) return;
	}//»

	if (goth > min_win_hgt) {
		let goty = st + dy;
		if (goty >= 0 || win_overflow.top) {
			m._h = goth;
			w.winElem._y= goty;
		}
	}
	if (tiled) {
//log(rect.top, lft, rgt);
		getorresize("bottom", rect.top, {left: lft, right: rgt}, w, true);
	}
}//»
if (dir.match(/e/)) {//«
	let gotw = sw + ex - sx;

//Tiled
	let _top, bot;//«
	if (tiled){
		if (gotw < rect.width) return;
		if (gotw < sw) return;
		let rgt = rect.right+2;
		_top = rect.top+5;
		bot = rect.bottom-5;
		let gotwin;
		if (document.elementFromPoint(rgt, _top)==tul) gotwin = getorresize("left", rgt, {top: _top, bottom: _top}, w);
		else if (document.elementFromPoint(rgt, bot)==tul) gotwin = getorresize("left", rgt, {top: bot, bottom: bot}, w);
		if (!gotwin) return;
		let torect = gotwin.winElem.getBoundingClientRect();
//		let toleft = gotwin.left;
		let toright = torect.left;
		if (e.clientX > toright) return;
	}//»

	if (gotw > min_win_width) m._w= gotw;
	let dx = w.winElem._gbcr().right - winw();
	if (dx > 0 && !win_overflow.right) m._w -= dx;
	if (tiled) getorresize("left", rect.right, {top: _top, bottom: bot}, w, true);
}//»
else if (dir.match(/w/)) {//«
	let dx = e.clientX - sx;
	let gotw = sw - dx;
//Tiled
	let _top, bot;//«
	if (tiled){

		if (gotw < rect.width) return;
		if (gotw < sw) return;
		let lft = rect.left-1;
		_top = rect.top+5;
		bot = rect.bottom-5;
		let gotwin;
		if (document.elementFromPoint(lft, _top)==tul) gotwin = getorresize("right", lft, {top: _top, bottom: _top}, w);
		else if (document.elementFromPoint(lft, bot)==tul) gotwin = getorresize("right", lft, {top: bot, bottom: bot}, w);
		if (!gotwin) return;
		let torect = gotwin.winElem.getBoundingClientRect();
//		let toleft = gotwin.left;
		let toleft = torect.right;
//log(gotwin);
//log(e.clientX, toleft);
		if (e.clientX < toleft) return;
	}//»

	if (gotw > min_win_width) {
		let gotx = sl + dx;
		if (gotx >= 0 || win_overflow.left) {
			m._w= gotw;
			w.winElem._x= gotx;
		}
		if (tiled) getorresize("right", rect.left, {top: _top, bottom: bot}, w, true);
	}
}//» 

//XXX TODO odiv can be undefined here (can it though?) TODO XXX//«
if (!odiv) {
	cerr("Hi,no odiv with CRW in Gen_mousemove");
} else {
	odiv._w= w.winElem.offsetWidth;
	odiv._h = w.winElem.offsetHeight;
	odiv.update();
}
//»

CRW.status_bar.resize();


};//»

const update_and_clear_resize_wins = () => {//«
	if (CRW) {
		CRW.app.onresize();
		CRW.status_bar.resize();
	}
	if (CRWINS){
		for (let win of CRWINS){
			if (win) {
				win.status_bar.resize();
				win.app.onresize();
			}
		}
	}
	CRW = null;
	CRWINS = null;
};//»
this.cleanup_deleted_wins_and_icons = path => {//«
    let namearr = getNameExt(path, null, true);
    let usepath = `${namearr[0]}/${namearr[1]}`;
    let useext = namearr[2];
    let wins = get_wins_by_path(usepath, {extArg: useext});
	for (let win of wins){
	    if (win && win.forceKill) win.forceKill();
	}
    let icons = get_icons_by_path(usepath, useext);
    for (let icn of icons) {
		if (icn.cancel_func) icn.cancel_func();
		icn.del();
    }  
}//»

//»
//File/App«

const make_app = arg => {//«

//Var«
	let hashsum;
	let have_cache = false;
	let hold_current = CWIN;
	let win = arg.topwin;
	let mainwin = win.main;
	let fs_url = arg.FS_URL;
	let cb = arg.CB||(()=>{});
	let scrpath;
	let winapp = win.appName;
	let str, marr;
	let script_path;
//»
	const barferror = e => {//«
		mainwin._pad= 10;
		mainwin._bgcol= "#000";
		mainwin._tcol= "#aaa";
		mainwin._fs= "";
		let mess = e.stack||`The script could not be loaded<br>(Url: ${script_path})`;
		mainwin.innerHTML = `<br><div style='text-align:center;color:#f55;font-size:34;font-weight:bold;'>Error</div><br><pre style="font-size:18;"><b>${mess}</b></pre>`;
		win.on();
		cb(win);
	};//»
	const loadit = async() => {//«
//		set_win_defs(win);
		win.set_defs();
		if (winapp===FOLDER_APP) {
			win.app.onappinit(arg.FULLPATH, arg.PREVPATHS);
		}
		else if (arg.APPARGS) win.app.onappinit(arg.APPARGS);
		cb(win);
	};//»
	const load_cb = async() => {//«
		try {
//			if (!arg.main) console.log(" ");
			if (fs_url){
				win._fs_url = fs_url
//				win.app = new NS.apps[winapp](appobj);
				win.app = new NS.apps[winapp](win, Desk);
			}
			else {
				const { app } = await import(script_path);
				NS.apps[winapp] = app;
//				win.app = new app(appobj);
				win.app = new app(win, Desk);
			}
			win.app.arg = arg;
			loadit();
		} catch (e) {
			barferror(e);
		}
	};//»
	const make_it = async () => {//«
		let scr = make('script');
		scr.onload = load_cb;
		scr.onerror = e => {
			barferror(e);
		};
		if (fs_url) script_path = fs_url;
		else {
			scr.type = "module";
			script_path = `/apps/${winapp.replace(/\./g, "/")}.js`;
		}
		let v = (Math.random()+"").slice(5,9);
//		script_path += `?v=${VERNUM++}`;
		script_path += `?v=${v}`;
		scr.src = script_path;
		scr.id = `script_${winapp}`;
		document.head._add(scr);
	};//»
	if (winapp=="None"){//«
//win.main._tcol="#fff";
/*
win.app.onfocus=()=>{
win.main.innerHTML="<center><h1>FOCUS</h1></center>";
};
win.app.onblur=()=>{
win.main.innerHTML="<center><h1>BLUR</h1></center>";
};
*/
//		set_win_defs(win);

		win.set_defs();
		cb(win);
		return;
	}//»
	if (!NS.apps[win.appName]) return make_it();
//	win.app = new NS.apps[winapp](appobj,NS,globals,Core,Desk,mainwin);
	win.app = new NS.apps[winapp](win, Desk);
	loadit();
}//»
const open_text_editor = () => {//«
	open_app(TEXT_EDITOR_APP, {force: true});
	return true;
};//»

const open_terminal = () => {//«
	open_app(TERMINAL_APP, {force: true});
	return true;
};//»

const raise_app_if_open=(appname)=>{//«
	for (let w of windows){
		if (w.appName==appname){
			if (w.is_minimized) w.unminimize();
			return true;
		}
	}
	return false;
};//»

const open_app = (appname, opts={}) => {//«
	let {force, winCb=NOOP, winArgs, appArgs={}, icn} = opts;
	if (!force && raise_app_if_open(appname)) return winCb();
	let win = new Window({CB:winCb, WINARGS:winArgs, name: appname.split(".").pop(), appName:appname, APPARGS:appArgs});
	if (icn) {
		icn.win = win;
		win.icon = icn;
	}
};
this.open_app = (appname, force_open, winargs, appargs) => {
	return new Promise((Y, N) => {
		open_app(appname, {cb: Y, force: force_open, winArgs: winargs, appArgs: appargs});
	});
};
api.openApp=this.open_app;

//»

const open_new_window = (icn, cb, opts={}) => {//«

//Verify that this is a correct determination
	let app = icn.appName;
	if (opts.altApp) app = opts.altApp;
	else if (icn.linkapp) app = icn.linkapp;

	if (icn.node && WRITING_APPS.includes(app)){
		if (icn.node.write_locked ){
			popup(`${icn.node.name}: the file is "write locked"`);
			return;
		}
		if (icn.node.lockFile) icn.node.lockFile();
	}
	let usename = icn.linkname||icn.name;
	let usepath = icn.linkpath||icn.path||"";
	let useext = icn.linkext||icn.ext;
	let ref = icn.ref;
	if (ref){
		let arr = capi.getNameExt(ref.name);
		usename = arr[0];
		useext = arr[1];
		usepath = ref.par.fullpath;
	}

	let fullpath = `${usepath}/${usename}`;
	if (useext) fullpath+=`.${useext}`;

	let win = new Window({
		CB: cb,
		WINARGS: icn.winargs,
		appName: app,

		name: usename,
		FULLPATH: fullpath,
		PREVPATHS: opts.PREVPATHS,
		SAVER: opts.SAVER
	});
	if (!win) return;

	win.name = usename;
	win.path = usepath;
	win.ext = useext;
	icn.win = win;
	win.icon = icn;
	return win;
}//»

const open_icon_app = async(icn, bytes, ext, useapp, force_open) => {//«
	if (bytes instanceof ArrayBuffer) bytes = new Uint8Array(bytes);
	if (icn.appName=="Application") ext = "app";
	if (!(!useapp && ext == "app")) return open_file(bytes, icn, useapp);
	let obj;
	try {
		obj = JSON.parse(await capi.toStr(bytes));
		icn.appobj = obj;
	} catch (e) {
		poperr(`The application JSON could not be parsed (${e.message})`);
cerr(e.message);
		return;
	}
	if (!obj) return poperr("Open error #1");
	let which = obj[ext];
	if (!which) {
		return poperr(`No ${ext} field in the JSON object!`);
	}

	if (which.match(/\.js$/)){
		let path = capi.normPath(which, icn.path);
		let node = await pathToNode(path);
		if (!node) return poperr(`${path}: File not found`);
		if (!node.type==FS_TYPE) return poperr(`${path}: Not in the local file system`);
		which = capi.fsUrl(node.fullpath);
	}
//	open_app(which, {force: true, winArgs: icn.winargs, appArgs: obj.args, icon: icn});
	open_app(which, {winArgs: icn.winargs, appArgs: obj.args, icon: icn});
}//»
const open_file_by_path = async(patharg, cb, opt={}) => {//«
	const err = (str) => {
		if (cb) return cb(null, str);
		poperr(str);
	};
	const ok = () => {
		if (cb) cb(true)
	};
	let node = await pathToNode(patharg);
	if (!node) {
		let marr;
		return err("Cannot open:" + patharg);
	}
	if (node.appName == FOLDER_APP) {
		let path;
		if (!node.par) path="/";
		else path = node.par.fullpath;
		ok();
		return open_folder_win(node.name, path, null, opt.WINARGS, opt.SAVER, opt.PREVPATHS);
	}

	if (check_special_ext(node)) return;

	let fullpath = node.fullpath;
	let patharr = fullpath.split("/");
	if (!patharr[patharr.length - 1]) patharr.pop();
	let fname = patharr.pop();
	let fake = {
		winargs: opt.WINARGS,
		name: fname,
		path: (patharr.join("/")).regpath(true),
		fullpath: () => {
			return fullpath;
		}
	};

	let arr = getNameExt(fullpath);
	let ext = arr[1];
	if (ext) {
		fake.name = arr[0];
		fake.ext = ext;
		fake.appName = ext_to_app(ext);
	} 
	else fake.appName = DEF_BIN_OPENER;
	let rtype = node.type;
	if (rtype!==FS_TYPE) return poperr(`Not (yet) handling type(${rtype})!`);
	let bytes = await fsapi.readFile(fullpath, {binary: true});
	if (!bytes) {
cwarn("got nothing:" + fullpath);
		return;
	}
	if (ext && ext == "app") return open_icon_app(fake, bytes, ext, null, opt.FORCE);
	open_file(bytes, fake, null, cb);
}
this.open_file_by_path=open_file_by_path;
//»
const open_file = (bytes, icn, useapp, cb) => {//«
	if (!bytes) bytes = new Uint8Array();
	let viewOnly = false;
	if (VIEWONLY_APPS.includes(icn.appName)) viewOnly = true;
	let name, ext;
	if (icn.link) {
		name = icn.linkname;
		ext = icn.linkext;
	}
	else{
		name = icn.name;
		ext = icn.ext;
	}
	open_new_window(icn, win => {
		cb&&cb(win);
		if (!win) return;
		win.ext = icn.ext;
		win.app.onloadfile(bytes, {name, ext, viewOnly});
	}, {altApp: useapp});
}//»
const win_reload = () => { //«
	let win = CWIN;
	if (!win) return;
//	let fsholdw, fsholdh, fsholdx, fsholdy, bor_hold; 
	let {is_fullscreen, fsholdw, fsholdh, fsholdx, fsholdy, bor_hold} = win;
	let {is_maxed, maxholdw, maxholdh, maxholdx, maxholdy} = win; 
	let winCb=(win)=>{//«
		if (is_maxed){
			win.is_maxed = true;
			win.maxholdw=maxholdw; 
			win.maxholdh=maxholdh; 
			win.maxholdx=maxholdx; 
			win.maxholdy=maxholdy;
			if (!fsholdw) win.set_max_dims();
		}
		if (is_fullscreen){
			win.is_fullscreen=true;
			win.fsholdw=fsholdw; 
			win.fsholdh=fsholdh; 
			win.fsholdx=fsholdx; 
			win.fsholdy=fsholdy;
			win.bor_hold=bor_hold;
			win.set_fullscreen_dims();
		}
	};//»
//	if (win.is_fullscreen) win.fullscreen(true);
//	else if (win.is_maxed) win.maximize(true);
	let winargs = {
		WINTITLEIMG: win.img_div.childNodes[0],
		ID: win.id,
		X: win.winElem._x,
		Y: win.winElem._y,
		WID: win.main._w,
		HGT: win.main._h
	};
	let app = win.appName;
	let scr = gbid(`script_${app}`);
	if (scr) scr._del();
	eval('delete ' + __OS_NS__ + '.apps["' + app + '"]');
	eval(__OS_NS__ + '.apps["' + app + '"]=undefined');
	let icn = win.icon;
	if (icn && !icn.path) icn=null;
	win.forceKill(true);
	let appobj = win.appobj||{};
	appobj.reInit = win.app.reInit;
	CWIN&&CWIN.off();
	if(!icn) {
		open_app((win._fs_url || win.appName), {winCb, force: true, winArgs: winargs, appArgs: appobj});
		return 
	}
	icn.service_obj = win.service_obj;
	icn.winargs = winargs;
	open_icon(icn,{winCb});

};//»

//»
//Cursor«

const Cursor = function(){//«
let curElem = make('div');
this.curElem = curElem;
curElem.id="icon_cursor";
curElem._pos="absolute";
curElem._bor=`${CURBORWID}px ${CURBORSTY} ${CURBORCOL}`;
curElem._bgcol=CURBGCOL;
curElem._w=IGSX;
curElem._h=IGSY;
curElem._dis="none";
curElem._op=1;
curElem._mart=-1.5;
this.on=(is_tog)=>{
	if (is_tog) cur_showing = true;
	else if (!cur_showing) return;
	curElem._op=1;
	curElem._dis="";
	curElem.scrollIntoViewIfNeeded();
};
this.off=(is_tog)=>{
	if (is_tog) cur_showing = false;
	else if (cur_showing) return;
	curElem._op=0;
	curElem._dis="none";
};
this.ison=()=>{
	return (curElem._op==1);
};
this.isdesk=()=>{
	return (curElem.parentNode===desk);
};
this.xoff=()=>{
	return (curElem.parentNode===desk)?desk_grid_start_x:folder_grid_start_x;
};
this.yoff=()=>{
	return (curElem.parentNode===desk)?desk_grid_start_y:folder_grid_start_y;
};
this.getpos=()=>{
	return {X:(curElem._x-CUR.xoff())/IGSX, Y:(curElem._y-CUR.yoff())/IGSY};
};
this.setpos=(x,y,icn)=>{//«
	if (this.isdesk()) {
		curElem._x= this.xoff()+IGSX*x;
		curElem._y= this.yoff()+IGSY*y;
		curElem.scrollIntoViewIfNeeded();
		return;
	}
	if (!icn) return;
	curElem._loc(icn.offsetLeft,icn.offsetTop);
	let d = this.main.scrollTop - curElem.offsetTop;
	if (d > 0) this.main.scrollTop-=d;
};//»
this.set = ()=>{//«
	if (this.isdesk()){
		curElem._x=desk_grid_start_x;
		curElem._y=desk_grid_start_y;
		curElem.scrollIntoViewIfNeeded();
	}
	else{
		let got = this.main.lasticon;
		if (got && got.parWin == this.main.top) {
			curElem._loc(got.iconElem.offsetLeft+2,got.iconElem.offsetTop+2);
		}
		else {
			this.main.scrollTop=0;
			curElem._x=CUR_FOLDER_XOFF;
			curElem._y=CUR_FOLDER_YOFF;
		}
	}
};//»
this.zero=()=>{//«
	if (this.isdesk()){
		curElem._x=desk_grid_start_x;
		curElem._y=desk_grid_start_y;
		curElem.scrollIntoViewIfNeeded();
	}
	else{
		this.main.scrollTop=0;
		curElem._x=CUR_FOLDER_XOFF;
		curElem._y=CUR_FOLDER_YOFF;
	}
};//»
this.todesk=()=>{//«
	if (curElem.parentNode===desk){
		return this.on();
	}
	desk._add(curElem);
	let pos = desk.lastcurpos;
	if (pos) this.setpos(pos.X, pos.Y);
	else this.set();
	this.on();
};//»
this.right=(if_ctrl)=>{//«
	let {X:_x,Y:_y}=this.getpos();
	if (if_ctrl) this.select(true);
	if (this.isdesk()){
//		if (_x+1 < DESK_GRID_W) _x++;
		if (desk_grid_start_x+(IGSX*(_x+2)) < winw()) _x++;
		else {
			if (this.yoff()+(IGSY*(_y+2)) < winh()) {
//				_y++;
				_x=0;
			}
			else {
				_x=0;
//				_y=0;
			}
		}
		this.setpos(_x,_y);
		return;
	}
	let icn = this.geticon();
	let next;
//log("ICN",icn);
	if (!icn) {
		let num = this.icon_div.childNodes.length;
		if (!num) return;
		next = this.icon_div.childNodes[0];
	}
	else next = icn.iconElem.nextSibling;
	if (!next) return;
	let xpos = next.offsetLeft;
	let ypos = next.offsetTop;
//ZOPTNJYW
	this.main.lasticon = next.icon;
	curElem._loc(xpos+CUR_FOLDER_XOFF,ypos+CUR_FOLDER_YOFF);
	if (CWIN) {
		if (!(next.icon&&next.icon.fullname)){
			setTimeout(()=>{
				if (next.icon) CWIN.app.stat(next.icon.fullname);
			},10);
		}
		else if (next.icon) CWIN.app.stat(next.icon.fullname);
	}
};//»
this.left=(if_ctrl)=>{//«
	let {X:_x,Y:_y}=this.getpos();
	if (if_ctrl) this.select(true);
	if (this.isdesk()){
		if (_x > 0) _x--;
		else if (_y > 0){
			_x = DESK_GRID_W-1;
//			_y--;
		}
		else {
			_x = DESK_GRID_W-1;
//			_y = DESK_GRID_H-1;
		}
		this.setpos(_x,_y);
		return;
	}
	let icn = this.geticon();
	let prev;
	if (!icn) {
		let num = this.icon_div.childNodes.length;
		if (!num) return;
		prev = this.icon_div.childNodes[num-1];
	}
	else prev = icn.iconElem.previousSibling;
	if (!prev) return;
	let xpos = prev.offsetLeft;
	let ypos = prev.offsetTop;
	this.main.lasticon = prev.icon;
	curElem._loc(xpos+CUR_FOLDER_XOFF,ypos+CUR_FOLDER_YOFF);
	if (CWIN&&prev.icon) CWIN.app.stat(prev.icon.fullname);
};//»
this.up=if_ctrl=>{//«
	if (if_ctrl) this.select(true);
	let {X:_x,Y:_y}=this.getpos();
	if (this.isdesk()){
		_y--;
		if (_y<0) {
			_y = Math.floor((winh()-this.yoff())/IGSY)-1;
//			_x--;
			if (_x<0) _x = DESK_GRID_W-1;
		}
		this.setpos(_x,_y);
		return;
	}
	let icn = this.geticon();

	if (!icn) {
		this.left();
		return;
	}
	const doit=()=>{
		let rect = icn.iconElem._gbcr();
		let elem = document.elementFromPoint(5+rect.left, rect.top-10);
		if (!elem) return;
		if (elem.parentNode.className==="icon") elem = elem.parentNode;
		if ((elem.className==="icon" || elem.className=="emptyicon") && elem.parentNode===icn.iconElem.parentNode){
			curElem._loc(elem.offsetLeft+CUR_FOLDER_XOFF, elem.offsetTop+CUR_FOLDER_YOFF);
			curElem.scrollIntoViewIfNeeded();
			this.main.lasticon = elem.icon;
			if (CWIN&&elem.icon) CWIN.app.stat(elem.icon.fullname);
			return true;
		}
	}
	if (!doit()) {
		this.main.scrollTop-=IGSY;
		doit();
	}
};//»
this.down=if_ctrl=>{//«
	let {X:_x,Y:_y}=this.getpos();
	if (if_ctrl) this.select(true);
	if (this.isdesk()) {
		if (desk_grid_start_y+(IGSY*(_y+1.5)) < winh()) {
			_y++;
		}
		else{
			_y=0;
//			_x++;
			if (_x==DESK_GRID_W) _x=0;
		}
		this.setpos(_x,_y);
		return;
	}
	let icn = this.geticon();
	if (!icn) {
		this.right();
		return;
	}
	const doit=()=>{
		let rect = icn.iconElem._gbcr();
		let elem = document.elementFromPoint(5+rect.left, 5+IGSY+rect.top);
		if (!elem) return;
		if ((elem.className==="icon"||elem.className=="emptyicon") && elem.parentNode===icn.iconElem.parentNode){
			curElem._loc(elem.offsetLeft+CUR_FOLDER_XOFF, elem.offsetTop+CUR_FOLDER_YOFF);
			curElem.scrollIntoViewIfNeeded();
			this.main.lasticon = elem.icon;
			if (CWIN) {
				if (!(elem.icon&&elem.icon.fullname)){
					setTimeout(()=>{
						if (elem.icon) CWIN.app.stat(elem.icon.fullname);
					},10);
				}
				else if (elem.icon) CWIN.app.stat(elem.icon.fullname);
			}
			return true;
		}
	};
	if (!doit()) {
		this.main.scrollTop+=IGSY;
		doit();
	}
};//»
this.move=(which, if_ctrl)=>{//«
	if (!this.ison()) return CUR.on();
	if (which==="R") this.right(if_ctrl);
	else if (which==="L") this.left(if_ctrl);
	else if (which==="U") this.up(if_ctrl);
	else if (which==="D") this.down(if_ctrl);
	if (!this.isdesk()) curElem.scrollIntoViewIfNeeded();
};//»
this.geticon=()=>{//«
	if (!this.ison()) return null;
	let rect = curElem.getBoundingClientRect();
	let elems = document.elementsFromPoint((rect.left+rect.right)/2,(rect.top+rect.bottom)/2);
	let e0=elems[0];
	if (e0===CUR) e0=elems[1];
	if(!e0) return null;
	if (e0.iconElem) return e0.iconElem.icon;
	if (e0.className=="icon") return e0.icon;
	if(e0.parentNode&&e0.parentNode.className=="icon") return e0.parentNode.icon;
	let e1=elems[1];
	if(!e1) return null;
	if (e1.className=="icon") return e1.icon;
	if(e1.parentNode&&e1.parentNode.className=="icon") return e1.parentNode.icon;
	return null;
};//»
this.select=(if_toggle,if_open,if_force_new_win)=>{//«
	let openit=()=>{
		if (!if_toggle&&ICONS.length==1) {
			open_icon(ICONS[0]);
			return true;
		}
		return false;
	};
	if (!this.ison()) {
		if(openit()) return;
		return this.on();
	}
	let icn = this.geticon();
	if (!icn || icn.fake) return openit();


	let haveit = ICONS.includes(icn);
	if (if_toggle&&haveit){
//		icon_off(icn,true);
		icn.off(true);
	}
	else if (if_open){
//		if (haveit) icon_off(icn,true);
		if (haveit) icn.off(true);
		open_icon(icn, {force: if_force_new_win});
	}
	else if (!haveit){
		if (ICONS.length&&(icn.parWin!==ICONS[0].parWin)) icon_array_off(1);
//		ICONS.push(icn);
//		icon_on(icn);
		icn.on(true);
	}
	else open_icon(icn, {force: if_force_new_win});
};//»

};//»

const CUR = new Cursor();

//»
//Folders«

const make_folder=()=>{
	if (!CWIN){
		make_new_icon(desk, FOLDER_APP);
	}
	else if (CWIN.appName == FOLDER_APP) {
		make_new_icon(CWIN, FOLDER_APP);
	}
};

const reload_desk_icons_cb = async () => {//«
	CG.on();
//	let nodes = Array.from(desk.childNodes);
//	let arr = nodes.filter(n => n.className === "icon");
//	while (arr.length) arr.pop()._del();
	Desk.clear_desk_icons();
	await reloadIcons();
	CG.off();
};
this.clear_desk_icons = ()=>{
	let nodes = Array.from(desk.childNodes);
	let arr = nodes.filter(n => n.className === "icon");
	while (arr.length) arr.pop()._del();
};
//»
const reload_desk_icons = (arr) => {//«
	let icon_name_compare = function(a, b) {
		if (a.name > b.name) return 1;
		else if (a.name < b.name) return -1;
		return 0;
	};
	if (desk.icons) {
		for (let icn of desk.icons) {
			if (icn) icn.iconElem._del();
		}
		desk.icons = [];
	}
	arr = arr.sort(icon_name_compare);
	for(let obj of arr){
		let icn = new Icon(obj);
		icn.parWin = desk;
		placeInIconSlot(icn, {create: true, load: true});
	}
	desk.loaded = true;
}//»
const reload_icons = async(cb, is_refresh) => {//«
	let fullpath = DESK_PATH;
	let usemain = desk;
	let ret = await pathToNode(fullpath);
	if (!ret) {
cerr("Nothing returned from pathToNode:\x20"+fullpath);
		return;
	}
	if (!ret.done) await fsapi.popDir(ret);
	let kids = ret.kids;
	let keys = getKeys(kids);
	let kid;
	let arr = [];
	for (let i = 0; i < keys.length; i++) {
		let name = keys[i];
		if (name == "." || name == "..") continue;
		kid = kids[name];
		if (kid.perm===false) continue;
		arr.push(kid);
	}
	reload_desk_icons(arr);
	cb && cb();

};//»
const open_folder_win = (name, path, iconarg, winargs, saverarg, prevpaths) => {//«
	let icn = iconarg ||{appName: FOLDER_APP,name: name,path: path,fullpath:()=>{(path + "/" + name).regpath()}};
	icn.winargs = winargs;
	open_new_window(icn, null, {SAVER: saverarg, PREVPATHS: prevpaths});
}//»
const check_name_exists = (str, which, usepath) => {//«
	return new Promise(async(Y,N)=>{
		let path;
		if (which) path = which.fullpath;
		else path = usepath;
		let fullpath = `${path}/${str}`.regpath();
		Y(pathToNode(fullpath));
	});
}//»
const get_icon_array = (arg, if_compact) => {//«
	if (arg!==desk) {
		let out = [];
		let arr = Array.from(arg.winElem.getElementsByClassName("icon"));
		for (let icn of arr) out.push(icn.icon);
		return out;
	}
	let icons;
	if (desk.icons) {
		icons = desk.icons;
	}
	else {
		icons = set_icon_array_of_desk();
	}
	if (!if_compact) return icons;
	let arr = [];
	for (let i = 0; i < icons.length; i++) {
		let icn = icons[i];
		if (icn&&icn.parentNode) arr.push(icn);
	}
	return arr;
}//»
const set_icon_array_of_desk = () => {//«
	let numx = DESK_GRID_W;
	desk.cols = numx;
	let arr = [];
	let kids = desk.childNodes;
	for (let i = 0; i < kids.length; i++) {
		let kid = kids[i];
		if (kid.className != "icon" || kid.path != DESK_PATH) continue;
		let num = kid.col + (kid.row * numx);
		arr[num] = kid;
	}
	desk.icons = arr;
	return arr;
}//»
const vacate_icon_slot = (icn, if_no_clear) => {//«
	if (icn.parWin!==desk) return;
	if (!(icn.name && icn.parWin)) {
cerr("No icn.name && icn.parWin", icn);
		return;
	}
	let oldarr = icn.parWin.icons;
	let ind = oldarr.indexOf(icn);
	if (ind > -1) {
		if (icn.parWin===desk){
//			if (!globals.read_only) delete localStorage[FS_PREF+":"+icn.Fullpath()];
			if (!(globals.read_only || if_no_clear)) icn.clear(null,3);
		}
		oldarr[ind] = undefined;
	} else cerr("The icon was not in the icons array!", icn);
}//»
const placeInIconSlot = (icn, opts={}) => {//«
//const place_in_icon_slot = (icn, pos, if_create, if_load, if_no_vacate, if_no_clear)
	const do_add=()=>{//«
		if (elem.icon_div) {
			icn.parWin = elem.icon_div.win;
			elem.icon_div._add(icn);
		} else {
			icn.parWin = desk;
			elem._add(iconelm);
			icn.save();
		}
	};//»
	let{
		pos, create, load, noVacate, noClear, doMove
	}= opts;
	let startx = desk_grid_start_x;
	let starty = desk_grid_start_y;
	let elem = desk;
	if (icn.name && !create && !noVacate) vacate_icon_slot(icn, noClear);
	let arr = get_icon_array(elem);
	let iconelm = icn.iconElem;
	if (create){//«
		iconelm._pos="absolute";
		icn.parWin = desk;
		elem._add(iconelm);
		if (!pos) {
//			let s = localStorage[FS_PREF+":"+icn.fullpath()];
			let s = localStorage[FS_PREF+":"+icn.fullpath];
			if (s){
				let parr = s.split(" ");
				let col = parseInt(parr[0]);
				let row = parseInt(parr[1]);
				let i = col + (row * DESK_GRID_W);
				let dosave = false;
				if (isNaN(i)||arr[i]){
					i=0;
					dosave=true;
					for (let j = i+1; ;j++){
						if (!arr[j]){
							i=j;
							row = Math.floor(i/DESK_GRID_W);
							col = i % DESK_GRID_W;
							break;
						}
					}
				}
				arr[i] = icn;
				icn.col=col;
				icn.row=row;
				iconelm._z= ICON_Z;
				iconelm._x=desk_grid_start_x + (col * IGSX);
				iconelm._y=desk_grid_start_y + (row * IGSY);
				if (dosave) icn.save();
				return;
			}
			else if(load){
cwarn(`The icon (${icn.name}) was not found in localStorage!`);
log(icn);
			}
		}
	}//»
	if (!pos) {//«
		let i = 0;
		let x, y;
		let doit = () => {
			let xnum = i % elem.cols;
			let ynum = Math.floor(i / elem.cols);
			x = startx + (xnum * IGSX);
			y = starty + (ynum * IGSY);
			icn.col = xnum;
			icn.row = ynum;
			iconelm._x= x;
			iconelm._y= y;
			arr[i] = icn;
			iconelm._z= ICON_Z;
			do_add();
		};
		for (; i < arr.length; i++) {
			if (!(arr[i] && arr[i].iconElem.parentNode)) break;
		}
		doit();
		return;
	}//»
	let low_dist = Infinity;
	let low_x = null;
	let low_y = null;
	let good_it = null;
	let i = 0;
	let grid_x = Math.floor((pos.X - startx) / IGSX);
	if (grid_x < 0) grid_x = 0;
	let grid_y = Math.floor((pos.Y - starty) / IGSY);
	if (grid_y < 0) grid_y = 0;
	let grid_pos = (grid_y * elem.cols) + grid_x;
	if (!arr[grid_pos] && (grid_x < elem.cols)) {//«
		good_it = grid_pos;
		low_x = startx + (grid_x * IGSX);
		low_y = starty + (grid_y * IGSY);
	}//»
	else {//«
		let check_low = () => {
			let ynum = Math.floor(i / elem.cols);
			let xnum = i % elem.cols;
			let x = startx + (xnum * IGSX);
			let y = starty + (ynum * IGSY);
			let got_dist = dist(x + 40, y + 40, pos.X, pos.Y);
			if (got_dist < low_dist) {
				low_dist = got_dist;
				low_x = x;
				low_y = y;
				good_it = i;
			}
		};
		for (i = 0; i < arr.length; i++) {
			let icn = arr[i];
			if (!icn) check_low();
		}
		if (!(low_x && low_y)) check_low();
	}//»
	if (low_x && low_y) {
		icn.col = good_it % elem.cols;
		icn.row = Math.floor(good_it / elem.cols);
		iconelm._z= ICON_Z;
		arr[good_it] = icn;
		do_add();
		if (doMove || !create) {
			return move_icon(icn, low_x, low_y);
		}
		iconelm._x= low_x;
		iconelm._y= low_y;
		return;
	}
	throw new Error("failure");
}//»
const reloadIcons = win => {//«
	return new Promise((Y, N) => {
		reload_icons(Y);
	});
}//»
const update_folder_statuses = usepath => {//«
	for (let w of windows) {
		if (w.appName !== FOLDER_APP) continue;
		if (usepath) {
			if (w.fullpath === usepath) w.app.update();
		} else w.app.update();
	}
};
this.update_folder_statuses=update_folder_statuses;
//»

//»
//Taskbar«

const Taskbar = function(){

//DOM«

let bar = mkdv();//«
this.taskbarElem=bar;

bar.style.justifyContent="space-between";
bar.style.userSelect="none";
bar.onmousedown=noprop;
bar._padt=3;
bar._padb=1;
bar._h=26;
if (qObj.nobar) bar._dis="none";
else bar._dis="flex";
bar._pos="fixed";
bar._b=0;
bar._w="100%";
bar._op=0;
bar._z=MIN_WIN_Z-1;
bar._bgcol=TASKBAR_BG_COL;
bar._bor=TASKBAR_BOR;
bar.id="taskbar";
//»
let mwb = mkdv();//«
mwb._marr=mwb._marl=3;
mwb._dis="flex";
//»
let st = start_button;//«
//st._padt=st._padb=3;
st._padr=st._padl=5;
//st._bgcol="#222";

st._tcol="#999";
st._ff="arial";
st._dis="flex";
st.style.alignItems="center";
st.style.justifyContent="center";
st._fs=16;
//st.innerText="\u{1f30e}\u{202f}Begin";
st.innerText="\u{1f463}\u{202f}Begin";
st._bor=`${TASKBAR_BOR_WID} outset ${TASKBAR_BOR_COL}`;
//»

//»

//Methods«

this.hide=(if_temp)=>{//«
	bar._z = CG_Z-1;
	bar._b = -bar._gbcr().height;
	if (if_temp) return;
	taskbar_hidden=true;
	if (!globals.read_only) localStorage[lst_hidden]="true";
};//»
this.show=(if_temp)=>{//«
	bar._b=0;
	if (if_temp) {
		bar._z=CG_Z+2;
		return;
	}
	bar._z=MIN_WIN_Z-1;
	taskbar_hidden=false;
	if (!globals.read_only){
		delete localStorage[lst_hidden];
	}
};//»
this.toggle_expert_mode = ()=>{//«
	if (taskbar_expert_mode){
		taskbar_expert_mode = false;
		delete localStorage[lst_expert];
		st._dis="";
	}
	else{
		taskbar_expert_mode = true;
		localStorage[lst_expert]="true";
		st._dis="none";
	}
}//»
this.addwin=(w)=>{//«
	const dounmin=(if_instant)=>{//«
		w.winElem._dis="";
		let rect = d._gbcr();
		d._del();
		const done=()=>{//«
			delete w.is_minimized;
			w.winElem._op=1;
			num_minimized_wins--;
			delete w.unminimize;
			if (w===CWIN) CWIN=null;
			w.check_loc();
			w.check_size();
			w.on();
		}//»
		if (if_instant) return done();
		w.winElem._op=0;
		let t = mkdv();
		t._pos="fixed";
		t._w=rect.width;
		t._h=rect.height;
		t._loc(rect.left,rect.top);
		t._bor="1px solid #ccc";
		t._z=CG_Z-1;
		desk._add(t);
		rect = w.winElem._gbcr();
		t.style.transition = `transform ${WIN_MIN_TRANS_SECS}s ease 0s, left ${WIN_MIN_TRANS_SECS}s ease 0s, top ${WIN_MIN_TRANS_SECS}s ease 0s, width ${WIN_MIN_TRANS_SECS}s ease 0s`;
		requestAnimationFrame(()=>{
			t.ontransitionend=()=>{
				w.winElem._op=1;
				t._del();
				done();
			};
			t._loc(rect.left, rect.top);
			t._w=rect.width;
			t._h=rect.height;
		});
	};//»
	let max_wid = "300px";

	let rect = w.winElem._gbcr();
	let t = mkdv();
	t._pos="fixed";
	t._w=rect.width;
	t._h=rect.height;
	t._loc(rect.left,rect.top);
	t._bor="1px solid #ccc";
	t._z=CG_Z-1;
	t.style.transition = `transform ${WIN_MIN_TRANS_SECS}s ease 0s, left ${WIN_MIN_TRANS_SECS}s ease 0s, top ${WIN_MIN_TRANS_SECS}s ease 0s, width ${WIN_MIN_TRANS_SECS}s ease 0s`;
	requestAnimationFrame(()=>{
		let c = mwb.lastChild;
		let x = c._gbcr().left;
		let wid = c._gbcr().width;
		t.ontransitionend=()=>{
			d._op=1;
			t._del();
		};
		t._loc(x, winh());
		t._w=wid;
	});

	desk._add(t);

	w.winElem._dis="none";
	w.is_minimized=true;
	w.winElem._op = MIN_WIN_OP;
	num_minimized_wins++;
	w.winElem._z= MIN_WIN_Z;
	let d = mkdv();
	d.style.flexShrink=1;
	d._op=0;
	d.style.flexBasis=max_wid;
	d._padt=d._padb=1;
	d._padl=d._padr=5;
	d._marr=d._marl=1.5
	d.style.maxWidth=max_wid;
	d._fs=15;
	d._dis="flex";
	d._pos="relative";
	d._tcol="#999";
	d._bor=`${TASKBAR_BOR_WID} outset ${TASKBAR_BOR_COL}`;
	d._over="hidden";

	let imdiv = w.img_div.cloneNode(true);
	imdiv._marr=5;
	imdiv._pos="";
	d._add(imdiv);
	let titstr = w.title;

	let tit = mkdv();
	tit._w="100%";
	tit.innerText=titstr;
	w.mintitle = tit;
	d._add(tit);
	let fdv = mkdv();
	fdv._pos="absolute";
	fdv._loc(0,0);
	fdv._w="100%";
	fdv._h="100%";
	fdv.style.backgroundImage=MIN_WIN_LIN_GRAD;
	d._add(fdv);
	d.onmousedown=(e)=>{
		if (e&&e.button!==0) return;
		d.is_active = true;
		d._bor=`${TASKBAR_BOR_WID} inset ${TASKBAR_BOR_COL}`;
	};
	d.onmouseup=()=>{
		d.is_active = false;
		d._bor=`${TASKBAR_BOR_WID} outset ${TASKBAR_BOR_COL}`;
	};
	d.onmouseout=()=>{
		d.is_active = false;
		d._bor=`${TASKBAR_BOR_WID} outset ${TASKBAR_BOR_COL}`;
	};

	d.oncontextmenu=nopropdef;
	d.onclick=()=>{dounmin()};
//	w.unminimize = dounmin;
	w.unminimize=(if_instant)=>{
		if (if_instant) return dounmin(true);
		d._bor=`${TASKBAR_BOR_WID} inset ${TASKBAR_BOR_COL}`;
		setTimeout(() => {
			dounmin();
			d._bor = `${TASKBAR_BOR_WID} outset ${TASKBAR_BOR_COL}`;
		}, 200);
	};
	w._button=d;
	mwb._add(d);
	if (w===CWIN) {
		CWIN=null;
		top_win_on();
	}
};//»
this.resize=()=>{mwb._w=winw()};
//»

//Listeners«
bar.oncontextmenu=e=>{//«
	e.preventDefault();
	e.stopPropagation();

	CWIN&&CWIN.off();

	let items_arr=[];
	if (taskbar_hidden){
		items_arr.push("Show\x20Taskbar");
		items_arr.push(()=>{
			this.show();
		});
	}
	else{
		items_arr.push("Hide\x20Taskbar");
		items_arr.push(()=>{
			this.hide();
		});
	}
	if (taskbar_expert_mode){
		items_arr.push("Expert\x20Mode\x20Off");
		items_arr.push(Desk.toggle_expert_mode);
	}
	else{
		items_arr.push("Expert\x20Mode\x20On");
		items_arr.push(Desk.toggle_expert_mode);
	}

	set_context_menu({
		X: e.clientX,
		Y: e.clientY
	}, {items: items_arr});

}//»
bar.onmouseleave=()=>{//«
	if (taskbar_hidden){
		this.hide();
	}
}//»
bar.onmousemove=noprop;
st.onmousedown = (e) => {
	if (e.button !== 0) return;
	st._bor = `${TASKBAR_BOR_WID} inset ${TASKBAR_BOR_COL}`;
//log(st);
};
st.onmouseup=()=>{st._bor=`${TASKBAR_BOR_WID} outset ${TASKBAR_BOR_COL}`;};
st.onmouseout=()=>{st._bor=`${TASKBAR_BOR_WID} outset ${TASKBAR_BOR_COL}`;};
st.oncontextmenu=nopropdef;
st.onclick=(e)=>{//«
	const doit=()=>{set_context_menu({X:0,Y:bar.clientHeight+5},{BREL:true});}
	if (e.isTrusted) return doit();
	st._bor=`${TASKBAR_BOR_WID} inset ${TASKBAR_BOR_COL}`;
	setTimeout(()=>{st._bor=`${TASKBAR_BOR_WID} outset ${TASKBAR_BOR_COL}`;doit();},200);
};//»
//»

//Init«

let curuser = globals.current_user;
let lst_hidden = `taskbar_hidden:${curuser}`;
let lst_expert = `taskbar_expert:${curuser}`;

taskbar_hidden = localStorage[lst_hidden];
taskbar_expert_mode = localStorage[lst_expert];

if (taskbar_hidden) this.hide();
if (taskbar_expert_mode) st._dis="none";

bar._add(st);
bar._add(mwb);
if (!isMobile) desk._add(bar);

setTimeout(()=>{
	bar.style.transition = `bottom ${TASKBAR_TRANS_SECS}s ease 0s`;
},500);

//»

};

//»
//Widgets«

const Widgets = function() {//«
//Var«
const api={};
const MENU_BGCOL="#c0c0c0";
const ACTIVE_MENU_BG = "#006";
const ACTIVE_MENU_FG = "#fff";

const make=x=>{return document.createElement(x);};
const isarr=arg=>{return (arg && typeof arg === "object" && typeof arg.length !== "undefined");}
const now=if_secs=>{var ms=new Date().getTime();if(if_secs)return Math.floor(ms/1000);return ms;}
const center = (elem, usewin) => {
	let usew = winw();
	let useh = winh();
	if (usewin) {
		if (usewin.main) {
			usew = usewin.main._w;
			useh = usewin.main._h;
		} else {
			usew = usewin.offsetWidth;
			useh = usewin.offsetHeight;
		}
	}
	let elemw = elem.offsetWidth;
	let elemh = elem.offsetHeight;
	let usex = (usew / 2) - (elemw / 2);
	let usey = (useh / 2) - (elemh / 2);
	if (usex < 0) usex = 0;
	if (usey < 0) usey = 0;
	elem._x = usex;
	elem._y = usey;
}
//»


//Context Menu«

const noop=()=>{};
//const{winw,winh}=Core;
const noprop=(e)=>{e.stopPropagation();}
const set_box_shadow=(elm,val)=>{elm.style.webkitBoxShadow=val;elm.style.boxShadow=val;}

const menu_loc_from = (menuobj, item) => {//«
	let type = menuobj.type;
	let parelem = menuobj.parelem;
	let menuelem = menuobj.menuElem;
	let l, t, r, b;
	let w, h;
	let arr;
	if (type == "desk") {
		r = winw();
		l = menuelem.offsetLeft;
	} else {
		let menurect = menuelem.getBoundingClientRect();
		let parrect = parelem.getBoundingClientRect();
		l = menurect.left;
		r = parrect.right;
	}
	let newx, newy;
	if (item) {
		let r = item._gbcr();
		newy = r.top - 5;
	}
	if (l + 375 < r) newx = menuelem._x + menuelem.offsetWidth;
	else {
		newx = menuelem._x;
		let curelem = menuelem;
		while (curelem) {
			curelem._x -= curelem.offsetWidth;
			curelem = curelem.prevelem;
		}
	}
	return {
		X: newx,
		Y: newy
	};
}//»
const ContextMenu=function(elem, loc, type, prevelem, noarg, if_internal) {//«
	let killed = false;
	let self = this;
	let menu = make('div');
	menu.style.userSelect="none";
	menu.className="context_menu";
	menu._bor="2px outset #aaa";
    menu.style.borderRadius="2px";
    menu._bgcol=MENU_BGCOL;
    menu._padt=5;
    menu._padb=2;
    menu._fs=16;
	menu._pos="absolute";
	menu.style.minWidth = 180;
	let usex=loc.X-winx(), usey=loc.Y-winy();
	if (if_internal) {
		usex-=8;
		usey-=2;
	}
	if (loc.BREL===true){
		menu._y="";
		menu._b = usey;
	}
	else {
		menu._b="";
		menu._y = usey;
	}
	if (loc.RREL===true) {
		menu._x = "";
		menu._r=usex;
	}
	else{
		menu._r="";
		menu._x = usex;
	}
	let curitem=null;
	let kids = [];

	const check_menu_width = (sp) => {
		let diff = menu.offsetWidth - sp.offsetWidth;
		let mindiff = 57;
		let diffoff = mindiff - diff;
		if (diffoff > 0) sp._marr = diffoff;
	};
	const next_item = () => {
		let kid;
		if (!curitem) kid = kids[0];
		else {
			let pos = kids.indexOf(curitem);
			if (pos < kids.length - 1) kid = kids[pos + 1];
			else kid = kids[0];
		}
		if (kid) kid.on();
	};
	const prev_item = () => {
		let kid;
		if (!curitem) kid = kids[kids.length - 1];
		else {
			let pos = kids.indexOf(curitem);
			if (pos > 0) kid = kids[pos - 1];
			else kid = kids[kids.length - 1];
		}
		if (kid) kid.on();
	};

	this.adjust_y = function() {
		if (type == "desk") {
			let y = 0;
			let winh=window.innerHeight;
			let _h = menu.getBoundingClientRect().height;
			if (menu._y + _h > winh) {
				menu._y = winh - _h;
			}
		} else {
			let menurect = menu.getBoundingClientRect();
			let parrect = elem.getBoundingClientRect();
			let t = menurect.top;
			let b = parrect.bottom;
			if (t + menu.offsetHeight > b) menu._y = elem.offsetHeight - menu.offsetHeight;
		}
	};
	this.kill = function() {
		if (killed) return;
		delete elem.context_menu;
		menu._del();
		if (self == desk_menu) {
			if (desk_menu.kill_cb) desk_menu.kill_cb();
			desk_menu = null;
			CG.off()
		} 
		killed = true;
		if (self.par) self.par.kill();
		if (self.kid) self.kid.kill();
	};
	this.key_handler = function(e, sym) {
		e.preventDefault();
		if (sym == "UP_") prev_item();
		else if (sym == "DOWN_") next_item();
		else if (sym == "RIGHT_") {
			if (curitem && curitem.is_array) curitem.select();
		} else if (sym == "LEFT_") {
//HEJUI
			if (curitem && curitem.menu.par) {
				curitem.menu.par.curitem.on();
				delete curitem.menu.par.kid;
				curitem.menu.menuElem._del();
			}
		}
	};
	this.select = function() {
		if (curitem) curitem.select();
		else cerr("No curitem!");
	};
	this.scroll_to = num => {
		if (num == 0) {
			kids[0].on();
			return;
		}
		for (let i = 0; i < num; i++) next_item();
	};
	this.add_item = function(name, val) {
		const select = () => {
			if (val instanceof Function) {
				self.kill();
				val();
			} else if (isarr(val)) {
				self.curitem = curitem;
				let olditem = curitem;
				if (curitem) curitem.off();
				let newmenu = new ContextMenu(elem, menu_loc_from(self, olditem), type, menu, null, true);
				newmenu.kill_cb = desk_menu.kill_cb;
				desk_menu = newmenu;
				for (let i = 0; i < val.length; i += 2) {
					let item = newmenu.add_item(val[i], val[i + 1]);
					if (i == 0) item.on();
				}
				newmenu.par = self;
				self.kid = newmenu;
				newmenu.adjust_y();
			}
		};
		let div = make('div');
		const delete_menus=()=>{//«
			let gotmenu = desk_menu || elem.context_menu;
			if (!gotmenu) {
				cerr("No gotmenu???");
				return;
			}
			let gotcur = gotmenu.curitem;
			if (!gotcur) return;
			
			let gotmatch = false;
			let arr = [];
			while (true) {
				try {
					arr.push(gotcur.menu.menuElem);
					gotcur = gotcur.menu.par.curitem;
				} catch (e) {
					break;
				}
				if (!gotcur) {
					cerr("!!!! Could not find the previous item! !!!!");
					break;
				}
				if (gotcur.menu === div.menu) {
					gotmatch = true;
					break;
				}
			}
			if (!gotmatch) {
				return;
			}
			for (let elm of arr) {
				if (elem.context_menu.par) delete elem.context_menu.par.kid;
				elm._del();
			}
		};//»
		div.menu = self;
		div._marb = 5;
		div._padl = 18;
		div._padr = 15;
		div._padt = 5;
		div._padb = 5;
		div._h="20px";
		div._ff = "sans-serif";
		div._dis = "flex";
		div.style.justifyContent = "space-between";
		div.style.alignItems = "center";
		let namesp = make('sp');
		div._add(namesp);
		div.className= "context_menu_item";
		namesp.className ="context_menu_label";
		menu._add(div);
		if (isarr(val)) {
			div._tcol="#000";
			namesp.innerHTML = name;
			let sp = make('span');
			sp.style.textAlign = "right";
			sp._fs = 12;
			sp.html('&#9654;');
			sp.style.cssFloat = "right";
			div._add(sp);
			div.is_array = true;
			check_menu_width(namesp);
		} else {
			if (val) div._tcol="#000";
			else {
				div._tcol="#333";
				div.style.fontStyle="italic";
			}
			let mark = null;
			if (name.match(/\x20*__XMARK__\x20*$/)) {
				name = name.replace(/\x20*__XMARK__\x20*$/, "");
				mark = '&#10007;'
			} else if (name.match(/\x20*__CHECK__\x20*$/)) {
				name = name.replace(/\x20*__CHECK__\x20*$/, "");
				mark = '&#10003;'
			}
			namesp.innerHTML = name;
			check_menu_width(namesp);
			if (mark) {
				let sp = make('span');
				sp.html(mark);
				sp.html(mark);
				sp.is_sym = true;
				div._add(sp);
			}
		}
		div.on = function(if_mouse) {
			if (curitem) curitem.off();
			div._bgcol = ACTIVE_MENU_BG;
			div.hold_tcol = div._tcol;
			div._tcol = ACTIVE_MENU_FG;
			curitem = div;
			if (type == "desk") desk_menu = curitem.menu;
			else elem.context_menu = curitem.menu;
			curitem.menu.curitem = curitem;
		};
		div.off = function() {
			curitem = null;
			div._tcol = div.hold_tcol;
			div._bgcol="";
		};
		div.select = select;
		div.onclick = ()=>{
			if(self.kid) {
				delete_menus();
				div.on(true);
				return;
			}
			delete_menus();
			select();
		};
		div.onmouseenter = e => {
			if((desk_menu || elem.context_menu)!==self) return;
			if (curitem) {
				div.on(true);
				return;
			}
			delete_menus();
			div.on(true);
		};
		div.onmouseover=()=>{
			div.style.cursor="default";
		};
		kids.push(div);
		return div;
	}

	elem.context_menu = this;
	this.type=type;
	this.menuElem = menu;
	this.parelem = elem;
	menu.onclick = noprop;
	menu.onmousedown = noprop;
	menu.ondblclick = noprop;
	menu.oncontextmenu = noprop;
	menu._z = CG_Z+1;
	menu.prevelem = prevelem;

	document.body._add(menu);
}
this.ContextMenu = ContextMenu;
//»
//»

//Popup/Prompt«

//IGen«

const IGen=function() {

function gbid(id) {return document.getElementById(id);}
//let log = Core.log;
//let globals = Core.globals;
let fs;
let svg_open = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" ';
let noptr = 'pointer-events:none;';

const make_popup_str=(which)=>{let str=svg_open+' width="64px" height="64px">';let alert_yellow='Gold';if(which=="idea"){let lsty_1=' style="fill:none;stroke:#e98f2c;stroke-width:2.5;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-opacity:1;stroke-dasharray:none"';str+='<path d="m 29.559104,44.909254 a 13.539703,13.539703 0 1 1 12.774974,0.122635" transform="translate(-4.5774122,-5.07004)" style="color:#000000;fill:none;stroke:#e98f2c;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-opacity:1;stroke-dasharray:none;stroke-dashoffset:0;marker:none;visibility:visible;display:inline;overflow:visible;enable-background:accumulate" />';str+='<path d="m 31.632996,45.55994 1.5398,-6.173398 0.568182,-7.825476-2.651515,-2.531772-4.734849,0-0.189394,2.992094 2.84091,3.222255 4.545454,-0.230161 2.840909,-4.37306 0,-4.142899-2.462121,-3.682577" style="fill:none;stroke:#e98f2c;stroke-width:1.4;stroke-linecap:butt;stroke-linejoin:round;stroke-miterlimit:4;stroke-opacity:1;stroke-dasharray:none" />';str+=	'<path d="m 25.407645,39.8604 0,5.871212 12.121212,0 0,-6.060606"'+lsty_1+' />';str+='<path d="M 13.286433,45.731612 19.725827,41.75434"'+lsty_1+' />';str+='<path d="M 14.422796,31.527067 6.6576443,30.958885"'+lsty_1+' />';str+='<path d="M 14.990978,16.75434 11.392493,11.072522"'+lsty_1+' />';str+='<path d="m 24.460675,11.640703 0,-7.575757"'+lsty_1+' />';str+='<path d="M 38.097039,11.640703 39.422796,2.5497945"'+lsty_1+' />';str+='<path d="M 47.566736,15.239188 52.11219,10.314946"'+lsty_1+' />';str+='<path d="m 49.081887,31.148279 7.19697,0.378788"'+lsty_1+' />';str+='<path d="m 43.210675,40.80737 7.386364,5.113636"'+lsty_1+' />';str+='<path d="M 24.460675,51.406327 38.899177,51.005258"'+lsty_1+' />';str+='<path d="M 24.326985,56.794446 38.765487,56.393377"'+lsty_1+' />';str+='<path d="m 35.427806,54.441177 a 1.9385027,4.0775399 0 1 1-3.877005,0 1.9385027,4.0775399 0 1 1 3.877005,0 z" transform="matrix(1,0,0,0.5,-1.3414645,31.023755)" style="color:#000000;fill:#e98f2c;fill-opacity:1;fill-rule:nonzero;stroke:#e98f2c;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-opacity:1;stroke-dasharray:none;stroke-dashoffset:0;marker:none;visibility:visible;display:inline;overflow:visible;enable-background:accumulate" />';}else if(which=="alert"){str+='<path d="M 32.129316,4.1098389 A 1.9399015,1.9399015 0 0 0 30.558815,5.2119455 L 6.6155497,55.137373 a 1.9399015,1.9399015 0 0 0 1.7358178,2.782819 l 49.0437415,0 A 1.9399015,1.9399015 0 0 0 59.130927,55.10982 L 34.03045,5.1843928 a 1.9399015,1.9399015 0 0 0-1.708265,-1.0745539 1.9399015,1.9399015 0 0 0-0.192869,0 z" style="font-size:medium;font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;text-indent:0;text-align:start;text-decoration:none;line-height:normal;letter-spacing:normal;word-spacing:normal;text-transform:none;direction:ltr;block-progression:tb;writing-mode:lr-tb;text-anchor:start;baseline-shift:baseline;color:#000000;fill:'+alert_yellow+';fill-opacity:1;stroke:'+alert_yellow+';stroke-width:3.87899995;stroke-miterlimit:4;stroke-opacity:1;stroke-dasharray:none;marker:none;visibility:visible;display:inline;overflow:visible;enable-background:accumulate;font-family:Sans;-inkscape-font-specification:Sans"/>';str+='<g style="font-size:56px;font-style:normal;font-variant:normal;font-weight:bold;font-stretch:normal;text-align:start;line-height:125%;letter-spacing:0px;word-spacing:0px;writing-mode:lr-tb;text-anchor:start;fill:#ffffff;fill-opacity:1;stroke:none;font-family:Times New Roman">';str+='<path d="m 32.621634,45.333283 c-2.575997,0-4.704,2.184002-4.704,4.704 0,2.687997 2.016003,4.76 4.648,4.76 2.687997,0 4.816,-2.072003 4.816,-4.648 0,-2.631998-2.128003,-4.816-4.76,-4.816 m 0.784,-4.368 c 0.727999,-6.887994 1.232002,-9.632006 2.912,-15.008 0.783999,-2.463998 1.008,-3.584002 1.008,-4.872 0,-3.639997-1.736003,-5.712-4.704,-5.712-3.023997,0-4.76,2.072003-4.76,5.6 0,1.399998 0.224001,2.464002 1.008,4.984 1.623998,5.319994 2.184001,8.120006 2.912,15.008 l 1.624,0"/></g>';}else if(which=="error"){str+='<path d="M 12.826086,22.695652 0.62845029,34.752046-16.521739,34.652173-28.578133,22.454537-28.47826,5.304348-16.280624,-6.7520463 0.86956503,-6.6521733 12.925959,5.5454627 z" transform="matrix(1.349617,0,0,1.349617,42.340122,13.11007)" style="color:#000000;fill:#d42121;fill-opacity:1;fill-rule:nonzero;stroke:#c6c6c6;stroke-width:1.3996563;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-opacity:1;stroke-dasharray:none;stroke-dashoffset:0;marker:none;visibility:visible;display:inline;overflow:visible;enable-background:accumulate" />';str+='<text x="8.4782629" y="36.608696" xml:space="preserve" style="font-size:13px;font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;text-align:start;line-height:125%;letter-spacing:0px;word-spacing:0px;writing-mode:lr-tb;text-anchor:start;fill:#ffffff;fill-opacity:1;stroke:none;font-family:Sans;-inkscape-font-specification:Sans">';str+='<tspan x="8.4782629" y="36.608696">ERROR</tspan></text>';}else if(which=="ok"){str+='<defs><filter color-interpolation-filters="sRGB" id="pu_FILTER"><feGaussianBlur stdDeviation="0.77384537" /></filter></defs>';str+='<rect width="58.038403" height="58.038403" rx="8.0885181" ry="8.1922169" x="3.4741683" y="3.2831869" style="color:#000000;fill:#42c129;fill-opacity:1;fill-rule:nonzero;stroke:#000000;stroke-width:1.45200002;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-opacity:1;stroke-dasharray:none;stroke-dashoffset:0;marker:none;visibility:visible;display:inline;overflow:visible;filter:url(#pu_FILTER);enable-background:accumulate" />';str+='<text x="16.18037" y="47.81963" xml:space="preserve" style="font-size:48px;font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;text-align:start;line-height:125%;letter-spacing:0px;word-spacing:0px;writing-mode:lr-tb;text-anchor:start;fill:#ffffff;fill-opacity:1;stroke:none;font-family:Times New Roman;-inkscape-font-specification:\"Times New Roman\"">';str+='<tspan x="15.18037" y="47.81963">&#x2713;</tspan></text>';}str+='</svg>';return [str];};

const attach = (obj) => {
	let parelm = obj['PAR'];
	let type = obj['TYPE'];
	let idarg = obj['ID'];
	let subtype = obj['SUBTYPE'];
	let svgstr, svgelm;
	let retarr;
	retarr = make_popup_str(subtype);
	parelm.innerHTML = retarr.shift();
	return parelm;
};
this.attach = attach;

}

const igen = new IGen();

//»
let popup_link_col = "#009"
//let prompt_boxshadow = "0px 0px 20px 2px #888888";
let popup_queue = [];
const make_func_span=(str,cb)=>{let sp=make('sp');if(str=="__BR__")str="<hr style='margin:0px;height:6px;visibility:hidden;'>";sp.html(str);if(cb){sp.ael('click',cb);sp._tcol=popup_link_col;sp.style.textDecoration="underline";sp.style.cursor="pointer";}return sp;}
const make_func_div=(all)=>{let div=make('div');for(let i=0;i<all.length;i++){let arr=all[i];if(typeof arr=="string")div._add(make_func_span(arr));else div._add(make_func_span(arr[0],arr[1]));}return div;}
this.pophuge=(str,opts={})=>{return make_popup({STR:str,VERYBIG:true,WIN:opts.win,TIT:opts.title,SEL:opts.SEL});}

const popinfo=(str,type)=>{return make_popup({'STR':str,'TYP':type,'INF':true});};this.popinfo = popinfo;
const popok = (str, opts={}) => {//«
//const popok = (str, timearg) => {
	make_popup({
		STR: str,
		TYP: "ok",
		TIME: opts.time,
		WIN: opts.win,
		TIT: opts.title,
		CB:opts.cb
	});
}
this.popok = popok;
api.popok=popok;//»
const poperr = (str, opts = {}) => {//«
	return make_popup({
		STR: str,
		TYP: "error",
		TIME: opts.time,
		WIN: opts.win,
		CB: opts.cb,
		TIT: opts.title,
		WIDE: opts.wide
	});
}
this.poperr = poperr;
//api.poperr=poperr;
api.poperr = (str, opts={})=>{
	return new Promise((Y, N) => {
		if (!opts.cb) opts.cb = Y;
		poperr(str, opts);
	});
}//»
const popup = (str, opts={}) => {//«
	return make_popup({
		TIT: opts.title,
		STR: str,
		SEL: opts.sel,
		WIN: opts.win,
		CB: opts.cb,
		WIDE: opts.wide
	});
}
this.popup=popup;
api.popup=popup;//»
this.popwide=(str,opts={})=>{opts.STR=str;opts.WIDE=true;return make_popup(opts);};
const popkey = (arr, cb, opts={}) => {//«
	let str="";
	let chars={};
	let ch;
	if (opts.alpha){
		str = arr;
		for (let i=65; i <= 90; i++){
			ch = String.fromCharCode(i);
			chars[ch] = i;
		}
		for (let i=97; i <= 122; i++){
			ch = String.fromCharCode(i);
			chars[ch] = i;
		}
	}
	else{
		for (let i = 0; i < arr.length; i++) {
			if (i<10) ch = String.fromCharCode(i + 48);
			else if (i<36) ch = String.fromCharCode(i-10 + 97);
			else if (i < 62) ch = String.fromCharCode(i-36 + 65);
			else break;
			str += ch + ")\xa0" + arr[i] + "<br>";
			chars[ch]=arr[i];
		}
	}
	return make_popup({
		'TIT': opts.title||"Choose one",
		'STR': str,
		'KEYS': chars,
		'CB': cb,
		WIN:opts.win		
	});
}
this.popkey=popkey;

api.popkey = (arr, opts = {}) => {
	return new Promise((Y, N) => {
		popkey(arr,Y,opts);
	});
}
//»
const popin = (str, cb, opts) => {//«
//const popin = (str, cb, deftxt, title) => {
	if (!str) str = " ";
	return make_popup({
		CANCEL:true,
		ONCANCEL:"",
		STR: str,
		INPUT: true,
		CB: cb,
		TXT: opts.deftxt,
		TIT: opts.title
	});
}
this.popin = popin;
api.popin = (str, opts = {}) => {
	return new Promise((Y, N) => {
		make_popup({
			STR: str,
			CANCEL:true,
			INPUT: true,
			CB: Y,
			TXT: opts.defTxt,
			TIT: opts.title,
			WIN: opts.win,
			PASSWORD: opts.password,
//			CHOICES: opts.choices
		});
	});
}
//»
const popwait = (str, cb, type) => {//«
	return make_popup({
		STR: str,
		TYP: type,
		CB: cb
	});
}
this.popwait=popwait;
api.popwait = (str, type)=>{
	return new Promise((y,n)=>{
		popwait(str,y,type);
	});
};
//»
//Keep this in since it might be useful later, but comment out to decrease the system parse/load time for now
//const popform=(arr,cb,title)=>{let table=make('table');let focuselm=null;for(let i=0;i<arr.length;i++){let tr=make('tr');let lab_td=make('td');lab_td.style.verticalAlign="top";let elm_td=make('td');let type=arr[i][0];let label=arr[i][1];let def=arr[i][2];let optarg=arr[i][3];let elm;if(type=="select"){if(!def)def=0;else def=parseInt(def);elm=make('select');elm.style.width="85";let list=optarg;for(let j=0;j<list.length;j++){let opt=make('option');opt.setAttribute('value',list[j]);if(j==def)opt.setAttribute("selected","true");opt.html(list[j]);elm._add(opt);}}else if(type=="field"){elm=make('span');elm.innerHTML=def;}else if(type=="check"){elm=make('input');elm.type="checkbox";if(def)elm.checked=true;elm.ael('click',e=>{setTimeout(()=>{elm.checked=!elm.checked;},1);});}else if(type=="text"){elm=make('input');elm.type="text";if(def)elm.setAttribute("placeholder",def);if(!focuselm)focuselm=elm;}else if(type=="textarea"){elm=make('textarea');elm.rows=6;elm.style.width=235;if(optarg)elm.setAttribute("maxlength",optarg);if(def)elm.setAttribute("placeholder",def);if(!focuselm)focuselm=elm;}elm.ael('mousedown',function(e){e.stopPropagation();});elm.setAttribute("name",label);lab_td.html(label+":");lab_td._tcol="#000";elm_td._add(elm);tr._add(lab_td);tr._add(elm_td);tr.elm=elm;table._add(tr);}return make_popup({'STR':table,'TYP':"form",'CB':cb,'TIT':title,'FOCUS':focuselm});};this.popform=popform;api.popform=(arr,title)=>{return new Promise((y,n)=>{popform(arr,y,title);});};

this.popcancel=(str,cb)=>{return make_popup({STR:str,CANCEL:true,CB:cb});}

const popyesno = (str, cb, if_rev) => {//«
	return make_popup({
		STR: str,
		TYP: "yesno",
		CB: cb,
		REV: if_rev
	});
}
this.popyesno = popyesno;
api.popyesno = (str, opts = {}) => {
	return new Promise((Y, N) => {
		make_popup({
			STR: str,
			TYP: "yesno",
			CB: Y,
			REV: opts.reverse,
			TIT: opts.title,
			WIN:opts.win,
			DEFNO: opts.defNo
		});
	});
}
//»
const poparea = (str_or_arr, title, if_rev_arr, cb, read_only, if_cancel, win) => {//«
	let arr;
	if (typeof str_or_arr == "string") arr = str_or_arr.split("\n");
	else arr = str_or_arr;
	if (if_rev_arr) arr = arr.reverse();
	let div = make('div');
	let area = make('textarea');
	area.value = arr.join("\n");
	area.id="prompt_textarea";
	if (read_only) {
		area.setAttribute("readonly", "1");
	}
	area._w="100%";
	area._h="100%";
	area._fs = 20;
	div._add(area);
	return make_popup({
//		INPUT:if_input,
		USEINPUT:area,
		'SEL': true,
		'STR': div,
		'VERYBIG': true,
		'CB': cb,
		'TIT': title,
		CANCEL:if_cancel,
		WIN:win
	});
}
this.poparea=poparea;
this.popinarea=(tit, cb)=>{
	poparea("",tit,null,cb,false,true);
};
api.popinarea=(tit, opts={})=>{
	let if_can = true;
	if (opts.noCancel) if_can = false;
//	let read_only = fa;
//if (opts.readOnly) read
	return new Promise((y,n)=>{
//		poparea(str,tit,null,y,true,true, opts.win);
		poparea("",tit,null,y,opts.readOnly,if_can, opts.win);
	})
}
//»
const make_prompt = (str, def_text, cb, if_long) => {//«
	let isshort = true;
	if (if_long) isshort = null;
	make_popup({
		'STR': str,
		'ICO': true,
		'TXT': def_text,
		'CB': cb,
		'SHT': isshort
	});
}
this.make_prompt=make_prompt;
//»
const mkpopup_imgdiv = (type, use_img, if_big_img) => {//«
	let imgdiv = make('div');
	imgdiv._pos='absolute';
	let usedim = 64;
	if (if_big_img) usedim = 128;
	imgdiv._w = usedim;
	imgdiv._h = usedim;
	let usetype = type;
	if (!type || type == "form") usetype = "alert";
	else if (type == "yesno") usetype = "alert";
	if (use_img) {
		let img;
		if (use_img instanceof HTMLImageElement) img = use_img;
		if (img && img instanceof HTMLImageElement) {
			imgdiv.style.backgroundImage = "url(" + img.src + ")";
			imgdiv.style.backgroundPosition = "center center";
			imgdiv.style.backgroundRepeat = "no-repeat";
			imgdiv.style.backgroundSize = "contain";
		}
	} else {
		igen.attach({
			'PAR': imgdiv,
			'TYPE': "popup",
			"SUBTYPE": usetype
		});
	}
	return imgdiv
}//»
const do_links = elm=>{//«
	let lns = Array.from(elm.getElementsByTagName("a"));
	for (let ln of lns){
		let win;
		ln.onclick=e=>{
			e.preventDefault();
			e.stopPropagation();
			if (win&&!win.closed){
				win.focus();
				return;
			}
			win = window.open(ln.href, ln.href,`width=${window.outerWidth-100},height=${window.outerHeight-100}`)
		};      
		ln.onmousedown=(e)=>{
			e.preventDefault();
			e.stopPropagation();
		}       
		ln.oncontextmenu=e=>{
			e.stopPropagation();
		};
	}
};//»
const mkpopup_tdiv = (str, opts={}) => {//«

	let w = opts.WIN;
	let text_fs = opts.FS;
	let if_big_img = opts.BIGIMG;
	let selectable = opts.SELECTABLE;
	let if_verybig = opts.VERYBIG;
	let if_systerm = opts.SYSTERM;
	let tdiv = make('div');
	if (selectable) {
		tdiv.style.userSelect = "text";
		tdiv.ael('mousedown', function(e) {
			e.stopPropagation()
		});
	}
	if (text_fs) tdiv._fs = text_fs;
	else tdiv._fs = 18;
	if (!(opts.NOBOLD||if_systerm)) tdiv._fw="bold";
	
	tdiv._tcol="black";
	tdiv._pos='absolute';
	let usex = 109;
	if (if_big_img) usex += 64;
	tdiv._loc(usex, 37);
	if (if_verybig) {
		tdiv._bor="1px dotted #333";
		tdiv.classList.add("scroller");
		tdiv._overy="auto";
		if (w){
			tdiv._w = w._gbcr().width - (20 + 134);
			tdiv._h = w._gbcr().height - (35 + 79);
		}
		else{
			tdiv._w = winw() - (20 + 134);
			tdiv._h = winh() - (35 + 79);
		}
	} else {
		tdiv._overy="auto";
		tdiv._w = opts.WIDTH - 134;
		tdiv._h = 75;
	}
	tdiv._overx="hidden";
	if (str) {
		if (typeof str == "string") {
			tdiv.style.overflowWrap = "break-word";
			tdiv.innerHTML=str;
		} 
		else if (str instanceof HTMLElement) tdiv._add(str);
		do_links(tdiv);
	}
	return tdiv;
}//»
const make_popup = (arg) => {//«
	const popup_dequeue = () => {
		make_popup(_popup_queue.shift());
	}
	const mkbut=(txt, if_active)=>{
		let d = mkdv();
//		d.tabIndex=""+(cur_tab_index++);
		d.onfocus=()=>{
			d._fw="bold";
			d._bgcol="#ccf";
		}
		d.onblur=()=>{
			d._fw="";
			d._bgcol="";
		}
		d.style.textAlign="center";
		d._fs=14;
		d._tcol="#000";
		d.innerText=txt;
		d._bor="3px outset #ccc";
		d.onmousedown=()=>{d._bor="3px inset #ccc";};
		d.onmouseup=()=>{d._bor="3px outset #ccc";};
		d.onmouseout=()=>{d._bor="3px outset #ccc";};
		d._w=68.46;
		d.type = "popup_button";
		if (if_active) active_button = d;
		return d;
	}
	const do_cancel = ()=>{
		div._del();
		if (win) delete win.popup;
		else{
			CG.off();
			CPR = null;
		}
		if (cb) {
			if ('ONCANCEL' in arg) cb(arg.ONCANCEL);
			else cb(false);
		}
		if (!win){
			if (_popup_queue.length) popup_dequeue();
			else if (holdwin) holdwin.on();
		}
	};
	const nopropdef=(e)=>{
		e.stopPropagation();
		e.preventDefault();
	};
	const noprop=(e)=>{
		e.stopPropagation();
	};
	let cur_tab_index = 1;
	let active_button;
	let win = arg.WIN;
	let _popup_queue = popup_queue;
	if (!win) {
		if (CPR && CPR !== true) {
			_popup_queue.push(arg);
			return;
		}
	}
	let choices;
	let no_buttons;
	let if_cancel, if_input, if_password;
	let if_systerm;
	let expires;
	let if_rev, title, str, type;
	let res_text, cb, if_short, if_info;
	let text_fs;
	let verybig;
	let big_img, use_img, caption, selectable;
	let keys, timer;
	let oktxt, cantxt;
	let comp_keydown;
	let div = make('div');
	let butdiv = make('div');
	let cancel_button_div;
	let okbutdiv;
	butdiv._pos="absolute";
	butdiv._b=0;
	butdiv._r=0;
	butdiv._mar=5;
	div._add(butdiv);
	div._fs=18;
	div.style.userSelect = "none";
	div.style.boxShadow = "2px 3px 7px #444";
	if (document.activeElement) document.activeElement.blur();
	if (typeof arg == "string") {
		str = arg;
		type = typearg;
	} else if (typeof arg == "object") {
		str = arg.STR || arg.DIV;
		if_cancel = arg.CANCEL;
		verybig = arg.VERYBIG;
		oktxt = arg.OKTXT;
		cantxt = arg.CANTXT;
		caption = arg.CAP;
		text_fs = arg.FS;
		use_img = arg.IMG;
		big_img = arg.BIGIMG;
		if_input = arg.INPUT;
		if_password = arg.PASSWORD;
		res_text = arg.TXT;
		cb = arg.CB;
		if_short = arg.SHT;
		if_info = arg.INF;
		title = arg.TITLE || arg.TIT;
		timer = arg.TIME;
		expires = arg.EXP;
		keys = arg.KEYS;
		if_rev = arg.REV;
		selectable = arg.SEL;
		type = arg.TYPE || arg.TYP;
		no_buttons = arg.NOBUTTONS;
	} else if (arg) str = arg;
	if (!str) str = "";
	if (typeof str == "object" && typeof str.length == "number") str = make_func_div(str);
	else if (typeof str == "string") str = str.replace(/__BR__/g, "<hr style='margin:0px;height:6px;visibility:hidden;'>");
	if (str instanceof HTMLElement) div.htelem = str;
	let usewid = 420;
	if (big_img||arg.WIDE) usewid += 64;
	let def_text_h = 75;
	let def_h = arg.HEIGHT||154;
	if (big_img) def_h += 32;
	if (arg.WIDTH) usewid = arg.WIDTH;
	else if (if_short) usewid = 275;
	else if (verybig) {
		if (win){
			usewid = win._gbcr().width-20;
			def_h = win._gbcr().height-35;
		}
		else{
			usewid = winw() - 20;
			def_h = winh() - 35;
		}
		def_text_h = def_h - 79;
	}
	let holdwin;
	if (!win) {
		holdwin = CWIN;
		if (holdwin) holdwin.off();
	}
	if (keys) {
		if (keys == "__ANY__") div.keys = true;
		else div.__keys = keys;
	}
	if (win) {
		win.popup=div;
		div._z=10000000;
		win._add(div);
	}
	else document.body._add(div);
	
	div.ael('dblclick', e => {
		e.stopPropagation()
	});
	if (cb) div.cb = cb;
	div.nosave = true;
	div._w = usewid;
	div._h = def_h;
	div._bgcol="#fff";
	div._pos='absolute';
	if (!win) {
		div._z = 10000000;
		if (CG) CG.on();
		CPR = div;
	}
	let bar = make("div");
	bar.type = "prompt";
	bar.style.borderBottom = "1px solid #515151";
	bar._pos="absolute";
	bar._h = 21;
	bar._w = usewid;
	if (title) {
		bar.style.textAlign = "center";
		bar._fw="bold";
		bar._fs="16px";
		bar._padt = 4;
		bar._tcol="#bbb";
		bar.innerHTML = title;
	}
	bar._bgcol="#303030";
	div._add(bar);
	let imgdiv = mkpopup_imgdiv(type, use_img, big_img);
	imgdiv._x = 25;
	div._add(imgdiv);
	imgdiv._y = div.offsetHeight / 2 - imgdiv.offsetHeight / 2;
	if (caption) {
		let capdiv = make('div');
		capdiv._tcol="#000";
		capdiv._pos='absolute';
		capdiv._loc(25, 100);
		capdiv.innerHTML = caption;
		capdiv.style.textAlign = "center";
		div._add(capdiv);
		let wid = capdiv.offsetWidth;
		if (wid > 64) {
			let diffx = (wid - 64) / 2;
			if (diffx < 25) capdiv._x = 25 - diffx;
			else capdiv._x = 0;
		}
	}
	let tdiv = mkpopup_tdiv(str, {
		NOBOLD: arg.NOBOLD,
		WIDTH: usewid,
		WIDE: arg.WIDE,
		FS: text_fs,
		BIGIMG: big_img,
		SELECTABLE: selectable,
		VERYBIG: verybig,
		SYSTERM: if_systerm,
		WIN:win
	});
	if (str instanceof HTMLElement) div.htelm = str;
	div.messdiv = tdiv;
	div._add(tdiv);

	okbutdiv = make('div');
	okbutdiv._dis="inline-block";
	let input;
	if (if_input||arg.USEINPUT) {
		if (arg.USEINPUT) {
			input = arg.USEINPUT;
//			butdiv._add(okbutdiv);
		}
		else {
			input = make('input');
			if (res_text) input.value = res_text;
			if (if_password) input.type="password";
			else input.type = "text";
			if (if_short) input._w = 140;
			else input._w = 250;
			input._h = 20;
			tdiv._add(make('br'));
			tdiv._add(input);
		}
		input.tabIndex = ""+(cur_tab_index++);
		input.ael('mousedown', e => {
			e.stopPropagation();
		});
		setTimeout(() => {
			input.focus();
			input.select();
		}, 1);
		div.res_input = input;
//		butdiv._add(okbutdiv);
	}
	else if (if_cancel) okbutdiv = null;
//	else if (!if_cancel) butdiv._add(okbutdiv);
//	else okbutdiv = null;
	let useok = "OK";
	if (oktxt) useok = oktxt;
	else if (type == "yesno") {
//		if (if_rev) useok = "NO";
//		else useok = "YES";
		useok = "YES";
	}
	if (okbutdiv) okbutdiv._add(mkbut(useok, true));
	div.ok_button = okbutdiv;
	if (keys || no_buttons) {
		okbutdiv._op = 0;
		div.inactive = true;
	}

	let ok_cb = () => {
		div._del();
		delete div.active;
		if (input && input.matchdiv) input.matchdiv._del();
		if (!win&&CG) CG.off();
		if (comp_keydown) document.removeEventListener('keydown', comp_keydown);
		if (type == "form") {
			let rows = div.htelm.childNodes;
			let retobj = {};
			for (let i = 0; i < rows.length; i++) {
				let elm = rows[i].elm;
				if (elm.type == "checkbox") retobj[elm.name] = elm.checked;
				else retobj[elm.name] = elm.value;
			}
			if (cb) cb(retobj);

			if (win) {
				delete win.popup;
				if (win===CWIN&&win.app&&win.app.onfocus) win.app.onfocus();
			}
			else CPR = null;
			return;
		}
		if (div.timer) clearTimeout(div.timer);
		if (div.cb) {
			if (div.res_input) div.cb(div.res_input.value);
			else {
				if (div.__keys) {
					if (div.choices) div.cb(div.choices[div.keyok]);
					else div.cb(div.keyok);
				}
				else {
					div.cb(true);
				}
			}
		}
		if (win) {
			delete win.popup;
			if (win===CWIN&&win.app&&win.app.onfocus)  win.app.onfocus();
		}
		else {
			CPR = null;
			if (_popup_queue.length) {
				CPR = true;
				popup_dequeue();
			} else if (holdwin) holdwin.on();
		}
	};
	div.ok = ok_cb;
	if (!no_buttons) okbutdiv.ael('click', ok_cb);
	if (expires || timer) {
		if (expires) {
			timer = expires - now();
			if (timer < 0) timer = 0;
		}
		let timerdiv = make('div');
		timerdiv._pos='absolute';
		timerdiv._loc(1, 1);
		timerdiv._w = 1;
		timerdiv._h = 1;
		timerdiv._op = 0;
		div._add(timerdiv);
		div.timeoutdiv = timerdiv;
		timerdiv.ael('click', e => {
			e.stopPropagation();
			div._del();
			delete div.active;
			if (!win) CG.off();
			if (comp_keydown) document.removeEventListener('keydown', comp_keydown);
			if (div.cb) div.cb();

			if (win) delete win.popup;
			else{
				CPR = null;
				if (_popup_queue.length) {
					CPR = true;
					popup_dequeue();
				} else if (holdwin) holdwin.on();
			}
		});
		div.timer = setTimeout(_ => {
			if (!win) div.timeoutdiv.click();
			else if (CWIN && CWIN.popup === div) CWIN.popup.timeoutdiv.click();
		}, parseInt(timer));
	}
	if (if_cancel || type == "form" || type == "yesno" || cantxt) {
		cancel_button_div = make('div');
		cancel_button_div._dis="inline-block";
		cancel_button_div._marl=10;
		let usecan = "CANCEL";
		if (cantxt) usecan = cantxt;
		else if (type == "yesno") {
//			if (if_rev) usecan = "YES";
//			else usecan = "NO";
			usecan = "NO";
		}
		cancel_button_div.ael('click', () => {
			do_cancel();
		});
//		butdiv._add(cancel_button_div);
		if (!if_input && !arg.USEINPUT && if_cancel) {
			cancel_button_div._add(mkbut(usecan, true));
			div.cancel_only = true;
		} else {
			cancel_button_div._add(mkbut(usecan, false));
		}
		div.cancel_button = cancel_button_div;
	}
	div.cancel = do_cancel;

	if (verybig){}
	else if (tdiv.scrollHeight > def_text_h) {
		let hdiff = tdiv.scrollHeight - def_text_h;
		let tot_h = window.innerHeight;
		let hi_h = def_h + hdiff + 20;
		if (hi_h <= tot_h) {
			div._h = def_h + hdiff;
			tdiv._h = def_text_h + hdiff;
			center(div);
		} else {
			div._h = tot_h - 20;
			tdiv._h = (tot_h - 20) - (def_h - def_text_h);
			center(div);
		}
		div._y = div._y - 17;
	}

let butdiv1, butdiv2;
if (okbutdiv && cancel_button_div){
	if (if_rev) {
		butdiv1 = cancel_button_div;
		butdiv2 = okbutdiv;
	}
	else{
		butdiv1 = okbutdiv;
		butdiv2 = cancel_button_div;
	}
}
else if (okbutdiv) butdiv1 = okbutdiv;
else if (cancel_button_div) butdiv1 = cancel_button_div;
if (butdiv1) {
	butdiv._add(butdiv1);
	butdiv1.childNodes[0].tabIndex=""+(cur_tab_index++);
}
if (butdiv2) {
	butdiv._add(butdiv2);
	butdiv2.childNodes[0].tabIndex=""+(cur_tab_index++);
}
	if (input){}
	else if (arg.FOCUS) arg.FOCUS.focus();
	else if (butdiv1) setTimeout(()=>{butdiv1.childNodes[0].focus();},10);

	if (!win) center(div);
	else center(div, win);
	div.active = true;
	return div;

}//»

this.make_popup = make_popup;
NS.api.wdg=api;
NS.api.widgets=api;

//»

}//»

const WDG = new Widgets();
globals.widgets = WDG;
const{popup:_popup,poperr:_poperr,popok:_popok,make_popup:_make_popup}=WDG;
const WDGAPI = NS.api.widgets
const{popwait, popyesno} = WDGAPI;
const popup=(s,opts)=>{_popup(s,opts);};
const poperr=(s,opts)=>{_poperr(s,opts);};
const popok=(s,opts)=>{_popok(s,opts);};
const make_popup = arg=>{return _make_popup(arg);};

//»
//Saving«

//Called via "real/outer" OS file drop event(ChromeOS,Windows,etc)
const save_dropped_files = (e, where) => {//«
/*Reading folders doesn't work!«
function traverseFileTree(item, path) {
  path = path || "";
  if (item.isFile) {
    // Get file
    item.file(function(file) {
      console.log("File:", path + file.name);
    });
  } else if (item.isDirectory) {
    // Get folder contents
    var dirReader = item.createReader();
    dirReader.readEntries(function(entries) {
      for (var i=0; i<entries.length; i++) {
        traverseFileTree(entries[i], path + item.name + "/");
      }
    });
  }
}


  var items = e.dataTransfer.items;
  for (var i=0; i<items.length; i++) {
    // webkitGetAsEntry is where the magic happens
    var item = items[i].webkitGetAsEntry();
log(item);
    if (item) {
      traverseFileTree(item);
    }

  }
return;
»*/
return new Promise(async(y,n)=>{
	let usepath = where.fullpath;
	let usepos={X:e.clientX+desk.scrollLeft,Y:e.clientY+desk.scrollTop,};
/*«
	if (!where) {
		usepath = DESK_PATH;
	}
	else usepath = where.fullpath;
»*/
	let files = fs.event_to_files(e);
	let iter = -1;
	let dofile = async() => {
		iter++;
		if (iter >= files.length) return y();
		let f = files[iter];
		if (!(f && f.name)) return dofile();
		let saver = new fs.FileSaver();
		saver.set_cb("error", mess => {
cerr(mess);
			dofile();
		});
		let parobj = await saver.set_cwd(usepath);
		if (!parobj) return dofile();
		let nameret = await saver.set_filename(f.name);
		if (!nameret) return dofile();
		const writer_func = async(r3, errmess) => {//«
			if (!r3) {
				if (errmess) {
					cwarn(errmess);
				}
				return dofile();
			}
			let fObj = r3;
			let parts = getNameExt(nameret);
			let ext = parts.pop();
			let fname = parts.pop();
			let curicon = await make_icon(fname, where, {pos: usepos, ext: ext});
			curicon.disabled=true;
			curicon.add_overlay();
			let odiv = curicon.overdiv;
			odiv.innerHTML = "0%";
			curicon.cancel_func = () => {
				fObj.unlockFile();
			};
			saver.set_cb("update", per => {
				odiv.innerHTML = per + "%";
			});
			saver.set_cb("done", () => {
				if (odiv.context_menu) odiv.context_menu.kill();
				curicon.activate();
				fObj.unlockFile();
				dofile();
			});
			saver.save_from_file(f);
		};//»
		saver.set_fent(writer_func);
	};
	dofile();
});


}
//»

//Opens a folder in "Save As..." mode
api.saveAs=(win)=>{//«
//api.saveAs=(win, val, ext)=>{
return new Promise(async(Y,N)=>{
open_file_by_path(globals.home_path, null, {
//DWEUNFKL
	WINARGS: {BOTTOMPAD: SAVEAS_BOTTOM_HGT},
	SAVER:{
		folderCb: fwin=>{
			win.cur_save_folder = fwin;
		},
		cb:async (fwin, savename)=>{//«
			if (!fwin){
				win.cur_save_folder = null;
				Y({});
				return;
			}
			Y({path: fwin.fullpath, name: savename});
			fwin.forceKill();
/*«
			let icn = await make_new_text_file(fwin, val, ext);
			if (!icn) {
				win.cur_save_folder.easyKill();
				win.cur_save_folder = null;
				Y();
				return;
			}
			if (win.icon){
				win.icon.win=undefined;
				delete win.icon.win;
			}
			icn.parWin.easyKill();
			win.name = icn.name;
			win.path = icn.path;
			win.ext = icn.ext;
			win.title = icn.name;
			win.icon=undefined;
			delete win.icon;
			win.cur_save_folder = null;
			let obj = await pathToNode(win.fullpath);
			win.status_bar.innerText = `${obj.size} bytes written`;
			obj.lockFile();
			win.node = obj;
			Y(obj);
			make_icon_if_new(obj);
»*/
		}//»
	}

});

});

};//»

//»
//Keyboard«

const handle_ESC = (if_alt) => {//«
	window.getSelection().removeAllRanges();
	body.style.cursor = "default";
	desk.style.cursor = "default";
	DDIE = null;
	DDD._loc(-1, -1);
	DDD._w= 0;
	DDD._h = 0;
	WDIE = null;
	CDICN = null;
	CRW = null;
	CRWINS = null;
	CDW = null;
	cldragimg(true);
	CG.off();
	if (ICONS.length) return icon_array_off(17);
	if (layout_mode) return toggle_layout_mode();
	if (windows_showing) toggle_show_windows();
};//»
const dokeydown = function(e) {//«

const check_input = ()=>{//«
	if (cwin && !text_inactive) return true;
	return false;
};//»
	const check_prompt=cpr=>{//«
		if (cpr.key_handler) {
			if (kstr == "ENTER_A") kstr = "ENTER_";
			else return cpr.key_handler(kstr, e, false, code, mod_str);
		}
		let okbut;
		let canbut = cpr.cancel_button;
		if (cpr.cancel_only) okbut = canbut;
		else okbut = cpr.ok_button;
		let clickok = () => {
			okbut.click();
		};
		if (okbut) {
			let keys = cpr.__keys;
			if (keys) {
				if (kstr != "ESC_" && (keys === true)) cpr.keyok = true;
				if (kstr != "ESC_") {
					if (keys === true) cpr.keyok = true;
					else {
						if (kstr.match(/_S$/)) {
							if (kstr==="_S") return;
							let ch = String.fromCharCode(kstr[0].charCodeAt()-32);
							cpr.keyok = keys[ch];
						}
						else cpr.keyok = keys[kstr[0]];
					}
				}
				return clickok();
			}
			else if ((kstr == 'ENTER_') || (kstr == "ESC_" && cpr.inactive)) {
/*
				if (macro_cb) {
					Core.set_macro_update_cb(null);
					Core.set_macros(null);
				}
*/
				if (kstr=="ENTER_"){
					if (!text_inactive && (act instanceof HTMLTextAreaElement) && !act._noinput) return;
					e.preventDefault();
					if (act.type=="popup_button") return act.click();
				}
			}
		}
		if (canbut&&kstr=="ESC_") return canbut.click();
		if (kstr=="a_C"){
			if (cpr.messdiv.style.userSelect=="text") document.getSelection().selectAllChildren(cpr.messdiv);
		}
		else if (kstr=="c_C"){
			if (cpr.messdiv.style.userSelect=="text") {
				document.execCommand("copy")
				window.getSelection().removeAllRanges();
			}
		}
		else if (kstr==="ESC_"){
			if (cpr.cancel) cpr.cancel();
		}
	};//»
	const wasd={//«
		w:'U',
		a:'L',
		s:'D',
		d:'R'
	};//»
	const CUR_KSYMS=["LEFT_","RIGHT_","UP_","DOWN_","LEFT_C","RIGHT_C","UP_C","DOWN_C","ENTER_","ENTER_A","ENTER_CA","ENTER_C","SPACE_"];
//Var«
	let marr;
	let cwin = CWIN;
	let is_full;
	let is_max;
	if (cwin){
		is_full=cwin.is_fullscreen;
		is_max=cwin.is_maxed;
	}
	let cobj;
	let overrides;
	if (cwin) {
		cobj = cwin.app;
		overrides = cobj.overrides || {};
	}
	else overrides = {};

	let cpr = CPR;
	let code = e.keyCode;
	let mod_str = "";
	let chr, kstr;
	let act = document.activeElement;
	let act_type = null;
	if (act) act_type = act.type;
	let usecwin;
	let text_inactive = true;
	if (e.ctrlKey) mod_str = "C";
	if (e.altKey) mod_str += "A";
	if (e.shiftKey) mod_str += "S";
	chr = KC[code];
	kstr = chr + "_" + mod_str;
	e._sym = kstr;
//»
/*Old«
	let macro_cb = Core.get_macro_update_cb();
	if (code >= 16 && code <= 18) {
		if (!macro_cb) {
//			if (cwin && cwin.app.onkeydown) cwin.app.onkeydown(e, "", "");
			return;
		}
	}
//»*/
	if (PREV_DEF_ALL_KEYS) {//«
		if (e.altKey||e.ctrlKey) e.preventDefault();
	}//»
	if (debug_keydown) {//«
		log(kstr, e.keyCode, e.code, e);
	}//»
/*A graphical keystroke displayer (disabled)«
if (keydiv){
	if (code===16) keydiv.shiftOn();
	else if (code===17) keydiv.ctrlOn();
	else if (code===18) keydiv.altOn();
	else {
		if (["PGUP","HOME"].includes(chr))keydiv.on(`UP`);
		else if (["PGDOWN","END"].includes(chr))keydiv.on(`DOWN`);
		else keydiv.on(chr);
	}
}
»*/
//Prevent the default behaviour of these shortcuts//«
/*
These are the keycodes that are used by the browser to do various things that we might not give 
a crap about in LOTW, so we stop that thing from happening here. (I mean, who needs Ctrl+p to 
open a print dialog if you never print anything or even have a printer!)
*/
	const prevent = {
//n_C:1,
//		"l_C": 1,
		"LEFT_A":1,
		"RIGHT_A":1,
		"s_CA": 1,
		"e_C": 1,
//		"=_C": 1,
//		"-_C": 1,
		"f_C": 1,
		"s_C": 1,
		"c_CS": 1,
		"k_C": 1,
//		"w_C":1,
		"d_A":1,
		"p_C":1,
		"j_C":1,
		f_A:1
//PGUP_:1,
//PGDN_:1
	};
	const notext_prevdef={
		"BACK_": 1,
		"a_C":1
	};
	if (prevent[kstr]) e.preventDefault();
//	if (act && act != desk.area && act_type && act_type.match(/^(text|password|number)/)) text_inactive = false; /*Prevent Default Detection(To stop unwanted browser actions like unloading)*/
	if (act && act_type && act_type.match(/^(text|password|number)/)) text_inactive = false; /*Prevent Default Detection(To stop unwanted browser actions like unloading)*/
	if (text_inactive && notext_prevdef[kstr]) e.preventDefault();
//»

/*Old«
//Macros gobble everything.
	if (macro_cb && kstr !== "ESC_") {
		let str = Core.macro_key_down(code);
		if (str === null) return;
		macro_cb(str);
		return;
	}
//»*/

//If there is a system prompt, it takes precedence over everything below.
	if (cpr) return check_prompt(cpr);

/*What is the "click guard", and how does it relate to the following conditions???//«
I'm pretty sure it is only activated when there is an icon's name being edited,
or when there is an active context menu.
//»*/

//We have an icon with a <textarea> whose name is being created or updated
	if (CEDICN) {//«
		if (kstr == "ESC_"){
			if (CEDICN.nodelete) {
				CEDICN.nodelete = undefined;
				CEDICN.area.value = CEDICN.name;
				save_icon_editing();
			}
			else {
				if (CEDICN.parWin._save_escape_cb) CEDICN.parWin._save_escape_cb();
				CEDICN._del();
				CEDICN = null;
			}
			CG.off();
		}
		else if (kstr == 'ENTER_') {
			save_icon_editing();
		}
		else if (kstr=="TAB_")e.preventDefault();
		return;
	}//»
//Enter key selects a menu option or unminimizes a window
	else if (kstr == "ENTER_") {//«
		if (desk_menu) return desk_menu.select();
		else if (cwin && cwin.context_menu) return cwin.context_menu.select();
		else if (cwin && cwin.is_minimized) {
			return cwin.unminimize();
		}
	}//»
//Direction keys to navigate the current context menu
	else if (kstr == "LEFT_" || kstr == "RIGHT_" || kstr == "UP_" || kstr == "DOWN_") {//«
		if (desk_menu) return desk_menu.key_handler(e, kstr);
		else if (cwin && cwin.context_menu) return cwin.context_menu.key_handler(e, kstr);
	} //»
//We have a context menu on the desktop. Kill it with Escapes, or bail out.
	else if (desk_menu) {//«
		if (kstr == "ESC_") desk_menu.kill();
		return;
	}//» 
/*//«
	else if (CG.style.display == "block") {//«
		if (kstr == "ESC_") {
			if (desk_menu) {
				return desk_menu.kill();
			}
		} else if (desk_menu) return;
	}//» 
»*/
//If there's a click guard, don't window escape things below.
	else if (CG.style.display == "block") {//«
//This branch is reached during window cycling "`_A"
//The click guard is also activated when moving icons and reloading icons.
//I don't know if this is necessary, though, if we just deactivate the icons
//that we want to be inactive (by adding a .disabled property).
	}//»
//Escape and a focused window
	else if (kstr == "ESC_" && cwin) {//«
		if (layout_mode) return toggle_layout_mode();
		if (cwin.context_menu) {
			cwin.context_menu.kill();
			return 
		}
		if (!cwin.is_minimized && cobj && cobj.onescape && cobj.onescape()) return;
		if (cwin.appName==FOLDER_APP && ICONS.length){
			icon_array_off(12);
			return;
		}
		if (cwin.is_fullscreen) return cwin.fullscreen();
		if (cwin.is_maxed) return cwin.maximize();
		cwin.off();
		CUR.todesk();
		return;
	}//»
//A "soft escape", use on a window means its escape handler is not called
	else if (kstr==="ESC_A"&&cwin){//«
//This is really just useful for folders that need to keep their
//active icon arrays still active so that icons can be moved to the
//desktop via the keyboard.
		cwin.off();
		CUR.todesk();
		return;
	}//»

//Issues with arrow keys
//«
	if (cwin) {
		if (!text_inactive) {
			if (code >= 37 && code <= 40 && (mod_str == "S" || mod_str == "CS")) e.preventDefault();
		}
	} else {
		if (code >= 33 && code <= 40 && text_inactive) e.preventDefault();
	} 
//»

//System hotkeys
	let mapobj;
	if (overrides[kstr]){}
	else mapobj = keysym_map[kstr];//«
	if (mapobj) {
		let args = mapobj.args||mapobj.a;
		if (!args) args = [];
		let nm = mapobj.name||mapobj.n;
		let gotfunc = keysym_funcs[nm];
		if (!gotfunc) return poperr(`There is nothing named '${nm}' in keysym_funcs using the sym: ${kstr}`);
		gotfunc.apply(null, args);
		return;
	}//» 

//Open context menu of selected icon, desktop or current window

//Desktop and folder specific functions dealing with icons or the icon cursor:
	if (!cwin || cwin.appName==FOLDER_APP){//«

		if (kstr == "c_A") {//«
			let curicon;
			if (CUR.ison()) curicon = CUR.geticon();
			if (curicon || ICONS.length===1){
				let useicon;
				if (curicon) useicon = curicon;
				else {
					let icn = ICONS[0];
					if (!desk.contains(icn)){
	cwarn("There was an unattached icon in ICONS!");
						icon_array_off(13);
						return;
					}
					useicon = icn;
				}
				let rect = useicon.iconElem._gbcr();
				useicon.wrapper.oncontextmenu({clientX: rect.left, clientY: rect.top, isFake: true});
			}
			
			else if (!cwin) {
				set_context_menu({X:0,Y:(taskbar_hidden?0:taskbar.taskbarElem.clientHeight)},{BREL:true});
				return;
			}
			else if (cobj && cobj.get_context) {
				if (!(cobj.overrides && cobj.overrides["c_A"])) {
					cwin.contextMenuOn();
					return;
				}
			}
		}//»


//		if (kstr == "f_CAS") return toggle_fullscreen();
		if (cwin && cwin.saver && kstr.match(/^TAB_S?$/)){
			e.preventDefault();
			cobj.onkeydown(e, kstr, mod_str);
			return;
		}
		if (kstr=="c_"||kstr=="/_") {
			if (check_input()) return;
			return toggle_cursor();
		}
		if (cwin&&(kstr==="PGDOWN_"||kstr==="PGUP_"||kstr==="HOME_"||kstr==="END_")){//«
			let mn = cwin.main;
			if (kstr==="PGDOWN_") mn.scrollTop+=mn.clientHeight;
			else if (kstr==="PGUP_") mn.scrollTop-=mn.clientHeight;
			else if (kstr==="HOME_") mn.scrollTop=0;
			else mn.scrollTop=mn.scrollHeight;
			mn.onscroll=e=>{
				select_first_visible_folder_icon(cwin);
			};
			return;
		}//»
		else if (CUR.ison()&&CUR_KSYMS.includes(kstr)) {//«
			if (kstr == "LEFT_" || kstr == "RIGHT_" || kstr == "UP_" || kstr == "DOWN_") {
				e.preventDefault();
				CUR.move(kstr[0]);
				return 
			}
			else if (kstr == "LEFT_C" || kstr == "RIGHT_C" || kstr == "UP_C" || kstr == "DOWN_C") return CUR.move(kstr[0],true);
			else if (kstr=="ENTER_") {
				if (act.tagName=="BUTTON") return;
				CUR.select();
				return;
			}
			else if (kstr=="ENTER_C") return CUR.select(null,null,{ctrlKey:true});
			else if (kstr=="ENTER_A") return CUR.select(null,true);
			else if (kstr=="ENTER_CA") return CUR.select(null,true, {ctrlKey:true});
			else if (kstr=="SPACE_") {
				if (check_input()) return;
				e.preventDefault();
				CUR.select(true);
				return 
			}
		}//»
		else if (kstr=="BACK_C"&&ICONS.length)return delete_selected_files();
		else if (kstr=="a_C") return select_all_icons();
		else if (kstr=="s_" && !cwin) return switch_icons();
		else if (kstr.match(/_$/)){
			if (check_input()) return;
			if (kstr=="m_") return move_icon_array();
			else if (kstr=="0_") return move_icon_array({toOrigin: true});
		}
	}//»

//Various harcoded keysyms that *just* intercept the current window
//«
	if (kstr=="1_CAS"){
		open_app("None", {force: true});
		return;
	}
	if (kstr=="l_CAS") return console.clear();
	if (kstr=="t_CAS") return keysym_funcs.test_function();
//	if (kstr=="t_CAS") return keysym_funcs.open_app("util.Titles");
	if (kstr=="r_CAS") return reload_desk_icons_cb();
	if (kstr=="k_CAS") {
		return (debug_keydown = !debug_keydown);
//		toggle_key_viewer();
		return;
	}
	if (kstr == "d_CAS") {
		if (cwin) {
log(cwin);
let r = cwin.getBoundingClientRect();
log(`[${r.width}, ${r.height}, ${r.left}, ${r.top}]`);
		}

/*
let wins = vizwins();
for (let win of wins){
let r = win.getBoundingClientRect();
log(`[${r.width}, ${r.height}, ${r.left}, ${r.top}]`);
}
*/
//		PREV_DEF_ALL_KEYS = !PREV_DEF_ALL_KEYS;
//		show_overlay(`Prevent default for all keys: ${PREV_DEF_ALL_KEYS}`);
		return;
	}
//»

//Send to the current window
	if (cwin) {//«
		if (cwin.popup) return check_prompt(cwin.popup);
		if (!cobj) return;
/*

Unless your app explicitly overrides them, the system intercepts the <arrow>_S
and <arrow>_CS hotkeys for basic window moving and resizing (of non
maxed/fullscreened wins).

*/
		if (!(cobj.overrides && cobj.overrides[kstr])){
			if (kstr==="r_A"||kstr==="p_CAS") return win_reload();
			if (!(is_full||is_max)) {
				if (kstr.match(/^(RIGHT|LEFT|UP|DOWN)_S$/)) {
					if (is_max) return;
					return move_window(kstr[0]);
				}
				if (kstr=="RIGHT_CS") resize_window("R");
				else if (kstr=="LEFT_CS") resize_window("R", true);
				else if (kstr=="DOWN_CS") resize_window("D");
				else if (kstr=="UP_CS") resize_window("D", true);
			}
		}
		if (cwin.is_layout || cwin.is_minimized) return;
		if (cobj.onkeydown) cobj.onkeydown(e, kstr, mod_str);
		return;
	}//»

//These keys are "free" for the desktop to do what it wants
//«
	if (kstr == "ESC_") return handle_ESC();
	else if (kstr=="1_CA") return open_text_editor();
	else if (kstr=="e_CAS") taskbar.toggle_expert_mode();
	else if (kstr=="w_CAS"){
		for (let w of windows){
			log(w.fullpath);
		}
	}
	else if (kstr=="0_"){
		if (CUR.ison()) CUR.zero();
	}
	else if (kstr=="m_CAS"){//«

	}//»
//»

}
//»
const dokeypress = function(e) {//«
	if (PREV_DEF_ALL_KEYS) e.preventDefault();
	if (CEDICN) return;
	let code = e.charCode;
	if (CPR) {
		if (CPR.key_handler && code >= 32 && code <= 126) CPR.key_handler(null, e, true, code, "");
		return;
	}
	let w = CWIN;
	if (!w || w.movediv || w.is_minimized || w.popup) return;
//	if (code >= 32 && code <= 126 && w.app.onkeypress) w.app.onkeypress(e.key, e, code, "");
	if (code >= 32 && code <= 126 && w.app.onkeypress) w.app.onkeypress(e);
}
this.keypress=dokeypress;
//»
const dokeyup = function(e) {//«
	if (CEDICN) return;
	let w = CWIN;
	let cpr = CPR;
	let getcpr = () => {
		return CPR;
	};
	let code = e.keyCode; 
/*
if (keydiv){
if (code===16) keydiv.shiftOff();
else if (code===17) keydiv.ctrlOff();
else if (code===18) keydiv.altOff();
}
*/

	if (code == KC['ALT']) {
		alt_tab_presses = 1;
		alt_is_up = true;
		if (num_win_cycles){
			CG.off();
			if (windows.includes(NOWINDOW)) windows.splice(windows.indexOf(NOWINDOW),1);

			for (let w of windows){
				if (w.z_hold) w._z= w.z_hold;
				delete w.z_hold;
			}
			if (CWCW) {
				CWCW.on(true);
				CWCW.up();
				if (CWCW.is_minimized) CWCW.unminimize(true);
			}
		}
		if (num_win_cycles && taskbar_hidden) taskbar.hide(true);
		num_win_cycles = 0;
		have_window_cycle = false;
		CWCW=null;
	}
	else if (code == KC['\x60']) tilde_press = 0;
	if (!w) return;
	if (w.is_minimized||w.popup) return;
	if (w.app.onkeyup) w.app.onkeyup(e, capi.evt2Sym(e));
}
this.keyup=dokeyup;
//»

const setsyskeys=()=>{//«

keysym_funcs = {
focus_desktop:()=>{let w=CWIN;if(w&&(w.is_fullscreen||w.is_maxed))return;CWIN&&CWIN.off();CUR.todesk();},
test_function:async()=>{
//delete_all_blobs();
let win = await api.openApp("dev.Launcher", {force: true});
//win.main._tcol="#fff";
//win.main.innerHTML=`<h1>111 222 333 444 555 666 777 888 999 aaa bbb ccc ddd eee fff ggg hhh iii jjj kkk lll mmm nnn.</h1>`

},
make_folder: make_folder,
toggle_taskbar,
toggle_fullscreen,
open_terminal,
toggle_win_chrome:()=>{CWIN&&CWIN.toggle_chrome()},
toggle_layout_mode:toggle_layout_mode,
save_window:()=>{let w=CWIN;if(!w||w.is_minimized)return true;w.app.onsave();return true;},
delete_selected_files: ()=>{return delete_selected_files();},
window_cycle: ()=>{return window_cycle();},
reset: ()=>{return handle_ESC();},
toggle_desktop: ()=>{return toggle_show_windows();},
close_window: ()=>{
	CWIN&&CWIN.close();
},
fullscreen_window: ()=>{CWIN&&CWIN.fullscreen()},
minimize_window: ()=>{CWIN&&CWIN.minimize()},
maximize_window: ()=>{CWIN&&CWIN.maximize();},
popmacro:()=>{WDG.popmacro();return true;},
reload_app_window:()=>{return win_reload(CWIN)},
reload_desk_icons:reload_desk_icons_cb,
open_root_folder:()=>{
open_file_by_path("/")
},
open_app:(name,if_force)=>{open_app(name||"None",{force: if_force});}

}

Desk.keysym_funcs = keysym_funcs;
keysym_map = std_keysym_map;

}
//»

//»
//Touch«


/*
let TCH1;
let TCH2;
let TRIPLE_TOUCH_MS = 333;
const init_touch_listeners=()=>{//«

//Triple touch-click to toggle system fullscreen
document.body.addEventListener('touchstart',e=>{//«
	let t = e.touches[0];
	t.timestamp = Date.now();
	if (!TCH1) {
		TCH1 = t;
		return;
	}
	if (!TCH2){
		if ((Date.now() - TCH1.timestamp) > TRIPLE_TOUCH_MS){
			TCH1 = t;
			return;
		}
		TCH2 = t;
		return;
	}
	if ((Date.now() - TCH2.timestamp) > TRIPLE_TOUCH_MS){
		TCH1 = t;
		TCH2 = null;
		return;
	}
	TCH1=TCH2=null;
	toggle_fullscreen();
});//»

//Mobile way of cycling the windows
capi.detectSwipe(document.body,dir=>{//«
	if (!CWIN) return;
	if (dir=="left"){
		CWIN.close();
		return;
	}
	if (dir !=="right") return;
	let wins = get_active_windows();
	if (wins.length<2) return;
	let ind = wins.indexOf(CWIN);
	ind++;
	if (ind==wins.length) ind=0;
	wins[ind].on();
});//»

desk.addEventListener('touchmove',e=>{//«
e.preventDefault();
});//»

document.onfullscreenchange=e=>{//«
	setTimeout(()=>{
		fit_all_windows();
	},1000);
}//»
screen.orientation.onchange=(e)=>{//«
	setTimeout(()=>{
		fit_all_windows();
	},500);
};//»
capi.detectClick(document.body, 666, ()=>{//«
	toggle_show_windows();
	if (windows_showing) fit_all_windows();
});//»

};//»
*/

//»
//Util«

const focus_editing=e=>{if(e)nopropdef(e);if(CEDICN)CEDICN.area.focus()}
const set_context_menu = (loc, opts={}) => {//«
	let itemsarg=opts.items;
	let desk_ctx_items = get_desk_context();
	CG.on();
	let dx = 0;
	let usex = loc.X - winx();
	let usey = loc.Y - winy();
	if (usex + 200 > winw()) dx = usex + 200 - winw();
	desk_menu = new WDG.ContextMenu(desk, {
		X: usex-dx,
		Y: usey,
		BREL:opts.BREL,
		RREL:opts.RREL
	}, "desk");
	let useitems = desk_ctx_items;
	if (itemsarg) useitems = itemsarg;
	for (let i = 0; i < useitems.length; i += 2) {
		let item = desk_menu.add_item(useitems[i], useitems[i + 1]);
	}
	desk_menu.adjust_y();
	return desk_menu;
};
this.set_context_menu=set_context_menu;
//»
const get_desk_context=()=>{//«
	let menu = DESK_CONTEXT_MENU.slice();
	if (globals.read_only) {
		menu.shift();
		menu.shift();
	}
	return menu;
};//»
/*
const delete_all_blobs=async()=>{//«
	if (!globals.is_local) {
		popup("Not deleting blob storage");
		return;
	}
	let ret = await popyesno(`Delete ALL BLOBS IN STORAGE`,{reverse: true});
	if (!ret) return;
	await fsapi.clearStorage();
	popok("Blobs cleared");
};//»
*/
const make_read_only = ()=>{//«
	let d = mkdv();
	d._z=-1;
	d._ta="center";
	d.style.userSelect="none";
	d._bgcol="#800";
	d._tcol="#eee";
	d.innerText="\xa1\xa0Read\xa0Only\xa0!";
	d._fs=32;
	d._fw=900;
	d._padb=10;
	desk._add(d);
}//»
const check_rs_timer = () => {//«
	if (rs_timer) clearTimeout(rs_timer);
	rs_timer = setTimeout(() => {
		rs_timer = null;
		if (!CWIN) return;
		CWIN.status_bar.resize();
		CWIN.app.onresize();
	}, RS_TIMEOUT);
}//»
const ext_to_app = ext => {//«
	if (!ext) return DEF_BIN_OPENER;
	let num = globals.EXT_TO_APP_MAP[ext];
	if (typeof num == "number" && globals.APP_ARR[num]) {
		return globals.APP_ARR[num];
	}
	return "Unknown";
}//»
const set_app_img=(div,app)=>{div.innerText = capi.getAppIcon(app.split(".").pop());};
const make_cur_drag_img = () => {//«
	let d = mkdv();
	d.className = "dragimg";
	let s = mksp();
	d._pos= "fixed";
	d._z= CG_Z - 1;
	ICONS = capi.uniq(ICONS);
	let numarg = ICONS.length || 1;
	let base_str = '<b>' + numarg + '</b>\xa0items\xa0\u2ba9\xa0';
	d.into = name => {
		s.innerHTML = base_str + '"<b><i>' + name + '</i></b>"';
		d._op= 1;
		d._bor= "2px ridge #0f0";
	};
	d.reset = () => {
		s.innerHTML = base_str + "...";
		d._op= DRAG_IMG_OP;
		d._bor= "2px ridge #999";
	};
	d.nogo = elm => {
//		elm.style.cursor = "not-allowed";
		d._op= 1;
		d._bor= "2px ridge #f00";
	};
	d._padl= 10;
	d._padt= d._padb= d._padr= 5;
	d._bgcol= "#fff";
	d._tcol= "#000";
	d._fs= "16px";
	d.reset();
	d._add(s);
	return d;
};//»
const cldragimg = if_hard => {//«
	if (if_hard) {
		let arr = desk.getElementsByClassName("dragimg");
		for (let d of arr) d._del();
	} else CDL && CDL._del();
	CDL = null;
	desk.style.cursor = "";
};//»
const vizwins = () => {//«
	let ret=[];
	for (let win of windows){
		if (!win.is_minimized) ret.push(win);
	}
	return ret;
};//»
const desk_drag_off=()=>{DDIE=null;DDD._loc(-1,-1);DDD._w=0;DDD._h=0;}
const show_overlay=(str)=>{//«
	if (str.length > MAX_OVERLAY_LENGTH) str = str.slice(0,MAX_OVERLAY_LENGTH)+"...";
	overlay.innerText = str;
	if (overlay_timer) clearTimeout(overlay_timer);
	else desk.appendChild(overlay);
	capi.center(overlay, desk);
	overlay_timer = setTimeout(()=>{
		overlay_timer = null;
		overlay._del();
	}, OVERLAY_MS);
};//»
api.showOverlay = show_overlay;
const winx=()=>{return 0;};
this.winx=winx;
const winy=()=>{return 0;};
this.winy=winy;
const winw=()=>{return window.innerWidth;}
this.winw = winw;
const winarea = ()=>{
return window.innerWidth * window.innerHeight;
};
const winh = (if_no_taskbar) => {
	if (taskbar_hidden||if_no_taskbar) return window.innerHeight;
	return window.innerHeight - taskbar.taskbarElem.getBoundingClientRect().height;
}
this.winh = winh;
const toggle_fullscreen=()=>{//«
	if (!document.fullscreenElement) document.body.requestFullscreen();
	else document.exitFullscreen();
};//»
const get_desk_grid=()=>{DESK_GRID_W=Math.floor((winw()-desk_grid_start_x)/IGSX);DESK_GRID_H=Math.floor((winh()-desk_grid_start_y)/IGSY);};
const toggle_taskbar=()=>{if(taskbar_hidden)taskbar.show();else taskbar.hide();};
const toggle_cursor=()=>{if(cur_showing)CUR.off(true);else CUR.on(true);};
const FATAL=s=>{throw new Error(s)};
const clearpop=()=>{let pop=CPR;if(pop&&pop.ok)pop.ok();};
const z_compare=(a,b)=>{if(pi(a.style.zIndex)<pi(b.style.zIndex))return 1;else if(pi(a.style.zIndex)>pi(b.style.zIndex))return-1;return 0;};
const gbid=(id)=>{return document.getElementById(id)}
const pi=x=>{return parseInt(x, 10)}
const noprop=e=>{e.stopPropagation()}
const nopropdef=e=>{e.preventDefault();e.stopPropagation()}
const no_select=(elm)=>{elm.style.userSelect="none"}

//»

//Init«
(async () => {
	body._ff="sans serif";
	fs = new fsmod();
	fs.set_desk(this);
	globals.fs = fs;
	fsapi = fs.api;
	pathToNode = fsapi.pathToNode;
	let winorig = window.location.origin;
	if (winorig.match(/localhost/)||winorig.match(/127\.0\.0\.1/)||winorig.match(/192\.168\./)) globals.is_local = true;
	if (!await fs.api.init()) return;
	if (!await fs.mk_user_dirs()) return;
	if ('BroadcastChannel' in window) {//«
		let system_channel;
		system_channel = new BroadcastChannel("system");
		system_channel.postMessage("init:"+FS_PREF);
		system_channel.onmessage = e=>{
			let mess = e.data;
			if (mess=="init:"+FS_PREF) {
				if (globals.read_only) return;
				system_channel.postMessage("ack:"+FS_PREF);
			}
			else if (mess=="ack:"+FS_PREF) globals.read_only = true;
			else if (mess.match && mess.match(/^(init|ack):/)){
console.warn("Dropping: " + mess);
			}
			else {
console.warn("Message received on the broadcast channel...");
console.log(mess);
			}
		}
	}//»
	document.title = "LOTW desktop";
	document.onkeyup = null;
	let home_path = globals.home_path;
	make_desktop();
	hidden_taskbar_thresh = taskbar.taskbarElem._gbcr().height;
	taskbar.resize();
	desk._add(CUR.curElem);
	CUR.set();
	if (!isMobile && !qObj.nocursor && globals.is_local) CUR.on(true);
	await reloadIcons();
	setsyskeys();
//	init_touch_listeners();
	if (localStorage[`taskbar_hidden:${globals.current_user}`]) taskbar.hide();
	taskbar.taskbarElem._op=TASKBAR_OP;
	document.onkeypress = dokeypress;
	document.onkeydown = dokeydown;
	document.onkeyup = dokeyup;
	window.onresize = (e)=>{//«
		fit_desktop();
	};//»
	window.onbeforeunload = () => {//«
		for (let w of windows){
			if (w.app) {
				if (w.app.is_dirty) return "There is an unsaved application!";
				if (w.app.onkill) w.app.onkill();
			}
		}
	};//»
	window.addEventListener("dragover",function(e){e =e||event;e.preventDefault();},false);
	window.addEventListener("drop",function(e){e =e||event;e.preventDefault();},false);
	setTimeout(()=>{
		if (globals.read_only) {
			popup("The system is in read-only mode! (Is it open in another tab?)");
			make_read_only();
		}
	},250);
	body.removeChild(gbid("error_message"));
})();

//»

//};//end Desk«
  })();
//»

//»


