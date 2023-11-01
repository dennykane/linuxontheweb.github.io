
//Commented out check_memory @POLKEYUTO: NOT WORKING IN FF!!!!

/*Call do_syntax_timer() BEFORE all of the cursor/editing functions since this//«
will set a syntax_timer global variable, which causes all synchronous renders
to not render. These synchronous renders can cause a temporary blink of the 
syntax colors when, for example, an ending quotation mark is deleted.
»*/
//«
//Render with no cursor: render({noCursor:true});
/*«

@TEWOPJTYS: Just commented out set_completer_words() in init !!!
This can take >1 second for larger files that normally open almost instantly

The hotkey to do this manually is c_CAS


=		=		=


STILL NOT PERFECT!!!!!!!!

@YEOPIUYHG Just added in some logic to fix the issue of justifying text at the
bottom of the screen. There had been two issues:

1) The delete operation would remove the line just above the top line of
the justified paragraph (seltop). So there is a test:
	if (seltop !== cy()) doaddline=true;
...which leads to:
	if (doaddline) lines.splice(cy(), 0, [""]);
...after the insert_lines operation is done.

2) Also, we need to know if there is an empty last line like this: 
	let last_line_null = !lines[lines.length-1][0];

... then after all the delete and insert logic is done, we do this:

	if (!last_line_null && !lines[lines.length-1].length) lines.pop();

... which just says "If the last line was inititially not null (had content in
it) and now it is, then get rid of it."



@WIUPTNGFH (2x), there was a bug when there was no "ch" variable. Now, we are 
returning from that case.



Infinite loop during arbitrary editing with heavy usage of Ctrl-j paragraph justifying!

Look into every while/for loop.

Solution!? @QOPIUTHGS, took out the "true" as the second argument to delete_lines, and now
everything seems perfect.

»*/
/*Repeat/Delay Test«

//I am getting Delay ~300ms  Repeat ~31ms
vvv   Globals   vvv
let did_print = false;
let finished_delay_test;
let start_repeat=null;
let start_delay=null;
let num_repeats=0;
^^^   Globals   ^^^


//Put everything below at DELAY_REPEAT_TEST_HERE

//Delay test
if (!did_print){
start_delay = window.performance.now();
did_print=true;
}
else if (!finished_delay_test){
log(window.performance.now()-start_delay);
finished_delay_test=true;
}

//Repeat test
if (did_print) {
if (start_repeat===null) start_repeat = window.performance.now();
num_repeats++;
if (num_repeats==200){
let ms_per_key = Math.round((window.performance.now()-start_repeat)/num_repeats);
log(ms_per_key);
}
}
did_print=true;

//»*/
/*Issues«

WATCH OUT FOR SCROLLING TYPE COMMANDS. DO THIS PATTERN:

if (!last_updown) scroll_hold_x = x;
last_updown = true;
some_scrolling_func();



Weird issue when doing paste of a visual block at the bottom of a file:file
at paste->undo_block_del->scroll_to_line->render..., something got screwed up unless
the 3rd arg in scroll_to_line() is true (so it doesn't try to render)
scroll_to_line=(num, if_force_newline, if_no_render, if_no_open_exact_fold_hit)


Reserved 3 byte signature for line beginnings of folded lines: "×--": (\xd7+2 dashes)

To edit in foldmode with this signature in the file (for now, it is always
foldmode), you need to pass --convert-markers to vim, in order to turn these
into X's.

TODO

Allow for search and replace within folds that are highlighted in visual line mode.

*		*		*		*		*		*		*		*		*		*		*

in insert_lines, we had this little one-off adjuster thing, which messes up this like
justify, when doing the insert of the justified lines. Don't know if some other insert 
stuff is messed up now?


	let n=0;
//	if (!lines[cy()].length) n=1;
	let donum = newlines.length-n;

*		*		*		*		*		*		*		*		*		*		*

Highlighting: This is based on the current lines array (not including folds), which is good becase
the only thing that screws up the globals (multiline) highlighting situation inside of folds 
are mistakes/errors (misplaced multiline comments and quotes), and finding these are the job 
of full parsers.

Var Weirdness

x_hold vs vim.hold_x !?!?!?!?

// \xab (171) == "<<" opening guillemet
// \xbb (187) == ">>" closing guillemet

folds start with "\xd7"

XXX   !!! INSERTING AND UNDOING STUFF AT THE BOTTOM OF FILES !!! XXX

CREATING LINES AND KEEPING real_lines UP TO DATE!!!!

When doing pastes at the bottom of the file, we need to create lines, but
the undo needs to take the lines away. When all of this is combined with folds and real_lines,
which might report a real_lines of 0, things can get a little wonky...


BROKEN:

For line select and copies, using v_S + y + p, you need to slice the arrays because they
use the same underlying arrays, for when you do mulitple line pastes. c_C then u_C is the kind of
behaviour we want...


Prettifier 

lines = pretty(str,{indent_size:1,indent_char:"\t"}).split("\n");
lines = pretty(str,{indent_with_tabs:1}).split("\n");

this.raw_options = s(t, e), 
this.disabled = this._get_boolean("disabled"), 
this.eol = this._get_characters("eol", "auto"), 
this.end_with_newline = this._get_boolean("end_with_newline"), 
this.indent_size = this._get_number("indent_size", 4), 
this.indent_char = this._get_characters("indent_char", " "), 
this.indent_level = this._get_number("indent_level"), 
this.preserve_newlines = this._get_boolean("preserve_newlines", !0), 
this.max_preserve_newlines = this._get_number("max_preserve_newlines", 32786), 
this.preserve_newlines || (this.max_preserve_newlines = 0), 
this.indent_with_tabs = this._get_boolean("indent_with_tabs"),
this.indent_with_tabs && (this.indent_char = "\t", this.indent_size = 1),
this.wrap_line_length = this._get_number("wrap_line_length",this._get_number("max_char"))
»*/
/*«

1) The "one off" issue with undo/redo

2) Enter "splice mode" with a hotkey. Select a range of text with visual line/range mode,
and figure out the byte (not character!) offset of the range.

»*/
//»

//Imports«

import { util, api as capi } from "util";
import { globals } from "config";

const{strnum, isarr, isstr, isnum, isobj, make, KC, kc, log, jlog, cwarn, cerr}=util;

const{fs,FS_TYPE,NS}=globals;

const fsapi = fs.api;

const MB = 1024*1024;

//»

export const mod = function(termobj) {

//Imports«

const{
	cur_dir,
	refresh,
	onescape,
	topwin,
	modequit,
	get_dir_contents,
	real_get_buffer,
	Desk
} = termobj;

let{
w,h
} = termobj;

//»
//Var«

let is_root = false;

let app_cb;

const vim = this;

let hold_overrides;
const overrides=["c_A","f_A", "f_CAS"];

let MEM_WARN_THRESHHOLD_PERCENT = 50;

let REAL_LINES_SZ = 32*1024;
let real_lines;

let yank_buffer = null;
let lines, line_colors;
let zlncols;
let x=0,y=0,scroll_num=0;

let MARKS = {};
let states = [];
let cut_buffer = [];
let cut_to_end = false;
let state_iter=null;
let did_type_flag;

let splice_mode = false;
let splice_start, splice_end;

this.command_history = [];
this.search_history = [];

let last_action;//«
let last_action_hold;
const LAST_CH = 1;
const LAST_ENTER = 2;
const LAST_BACK = 3;
const LAST_DEL = 4;
const LAST_PASTE = 5;
const LAST_DEL_LINES = 6;
const LAST_SEARCH_REPLACE = 7;
const LAST_INS_LINES = 8;
const LAST_JUSTIFY = 9;
const LAST_PREPEND_SPACE = 10;
//»

//Saving«
const OK_DIRTY_QUIT = true;
//const OK_DIRTY_QUIT = false;
//let do_saveloop = true;
//let do_saveloop = false;

let editsave_interval;
let EDITSAVE_LOOP_MS = 60 * 1000;
//»

let MIN_COMPLETE_LETTERS=6;
//let REAL_LINES_SZ = 1;
let WRAP_LENGTH = 85;
let NUM_ESCAPES_TO_RESET=2;

let ALL_WORDS;
let NO_CTRL_N=false;
let no_key_mode = false;
let hist_iter=0;
let last_updown = false;
let scroll_hold_x;
let no_render=false;
let last_pos=null;
let convert_markers=false;
let last_key_time;

let init_error=null;
let cur_escape_handler = null;
let num_escapes = 0;
let waiting = false;
let pretty = null;

let meta_downs = {};
let meta_ups = {};

const STAT_NONE = 0;
const STAT_OK=1;
const STAT_WARNING=2;
const STAT_ERROR=3;

//let show_marks = false;
let show_marks = true;
let if_no_del_mark = false;
let real_line_mode = false;

let visual_line_mode = false;
let visual_mode = false;
let visual_block_mode = false;

let macro_mode = false;
/*Unused«
//"macro mode" disables repeat and allows holding down several keys 
//in order to, ie, automagically print out a certain word.
const MACROS = {wha:"tever"};
let MACROMODE = false;//"New" macro mode
let KEYDOWNS = {};
let KEYTIMES = {};
let macros={
"abc":{c:'HELLO MACRO ABC!!!', n: "ABC"}
};
»*/

let x_hold;
let y_hold;
let error_cursor;

let stat_com_x_hold;

let	num_completion_tabs;//«
let cur_completion_name;
let cur_completion_dir;
let cur_completion_str;
//»

let foldmode = true;
//let foldmode = false;
let edfold_meth;
let open_folds;
let open_fold_nums;
let end_folds;
let end_fold_nums;
let fold_lines={};
let FOLDED_ROW_COLOR = "rgb(95,215,255)";

let EDIT_REINIT_SYM = "y_CAS";

let edit_cut_continue = false;
let edit_insert;

//let edit_sel_mode, edit_sel_start, seltop, selbot;
let edit_sel_start, seltop, selbot;
let edit_sel_mark, selleft, selright;
let edit_fname;
let edit_fobj;
let edit_fullpath;
let edit_ftype;
let edit_stdin_func;
let edit_show_col = true;
let edit_emulate_nano_down = false;
let edit_kill_cb = null;
let edit_cursor_is_error;

let dirty_flag = false;

let stat_message, stat_message_type;
let stat_cb;
let stat_input_mode;
let stat_com_arr;

let	num_stat_lines = 1;


let scroll_pattern_not_found;
let scroll_search_str;
let scroll_search_dir;
let scroll_lines_checked;
let last_render;

let toggle_hold_y = null;
let toggle_hold_x = null;

//Old Change«
const CT_LNS_INS = 5;//We can just use height
const CT_LNS_DEL = 6;
const CT_MARK_INS = 7;//We can just use height
const CT_MARK_DEL = 8;
const CT_BLOCK_INS = 9;//Need height and width
const CT_BLOCK_DEL = 10;
let Change=function(type, time, x, lny, scry, data, args){
this.type=type;
this.time=time;
this.x=x;
this.y=lny;
this.scry=scry;
//this.scroll=scroll;
this.data=data;
this.args=args;
};
//»

//»

//Util«

const LO2HI = (a, b)=>{if(a>b)return 1;else if (a<b)return -1;return 0;};
const HI2LO = (a, b)=>{if(a>b)return -1;else if (a<b)return 1;return 0;};
const NOOP=()=>{};
const NUM=(v)=>Number.isFinite(v);

const stop_stat_input = () => {//«
	if (stat_input_mode == "Save As: ") {
		x = vim.hold_x;
	}
	else x = x_hold;
	hist_iter=0;
	stat_input_mode = false;
	vim.stat_input_mode = false;
	xescape();
};//»
const check_if_need_backspace=()=>{if(edit_insert && x>0 && !curch())x--;}
const paste = ()=>{//«
const undo_lns_del = (chg,if_copy) => {//«
	let no_lines = false;
	if (!lines.length) {
		no_lines = true;
	}
	let isbot=false;
	let ry = chg.y;
	if (no_lines){
		y=0;
		scroll_num=0;
		isbot=true;
	}
	else if (realnum(lines.length-1) < chg.y){
		scroll_to_line(chg.y+1, true, true);
		set_screeny(chg.scry,2);
		isbot=true;
	}
	else{
		scroll_to_line(chg.y+1,null,true, true);
		set_screeny(chg.scry,2);
	}
	x=0;
	let add_i=0;
	let fromy = cy();
	let foldy = []
	let newopen = [];
	let newend = [];
	let arr = [];
	let dat = chg.data.slice();
	let datlen = dat.length;

	if (isbot && lines[lines.length-1]===1) lines.pop();

	if (foldmode) {
		for (let i=0; i < datlen;i++) arr.push(dat[i].join(""));
		adjust_row_folds(ry, datlen);
		init_folds(arr, ry, false);
		let ret = get_folded_lines(arr, ry);
		lines.splice(fromy, 0, ...ret);

		if (!no_lines) real_lines.copyWithin(fromy+ret.length, fromy);

		let add_i=0;
		let first_fold_len = 0;
		let gotfold = fold_lines[realnum(fromy)];
		if (gotfold) first_fold_len = gotfold.length;
		let iter=0;
		let realstart;
		if (first_fold_len) realstart = real_lines[fromy]+first_fold_len;
		else if (no_lines) realstart=0;
		else realstart = real_lines[fromy]+1;
		let start_i;
		if (isbot) start_i = fromy;
		else start_i = fromy+1;
		for (let i=start_i; i < lines.length; i++){
			real_lines[i]=realstart+iter+add_i;
			let gotfold = fold_lines[realnum(i)];
			if (gotfold) add_i+= gotfold.length;
			else iter++;
		}
	}
	else {
		lines.splice(fromy, 0, ...dat);
	}

	chg.x=x;
	if (!if_copy) chg.type = CT_LNS_INS;
	chg.nlines = datlen;	
	return datlen;
};//»
const undo_block_del=(chg,if_copy)=>{//«

scroll_to_line(chg.y+1,null,true);
//scroll_to_line(chg.y+1);
set_screeny(chg.scry);
let dat = chg.data.slice();
let datlen = dat.length;
let fromx = chg.x;
for (let i=0; i < datlen; i++){
	let n = i+cy();
	let ln = lines[n];

	if (!ln) {
		ln = [];
		lines.push(ln);
		if (foldmode){
			real_lines[n] = real_lines[n-1]+1;
		}
	}
	if (ln.length < fromx){
		for (let i=ln.length; i < fromx; i++) ln.push(" ");
	}
	ln.splice(fromx, 0, ...dat[i]);
}

if (!if_copy) chg.type = CT_BLOCK_INS;
chg.nlines = datlen;	

return datlen;
};//»
const undo_mark_del=(chg,if_copy)=>{//«
	scroll_to_line(chg.y+1);
	set_screeny(chg.scry);
	let fromy = cy();
	let nlines = chg.args[7];
	if (nlines) adjust_row_folds(chg.y, nlines);
	let dat = chg.data.slice();
	let first = dat.shift();
	let ry = chg.y;
	let rem = lines[cy()].slice(chg.x);
	lines[cy()]=lines[cy()].slice(0,chg.x);
	let last = dat.pop();
	if (!dat.length){
		if (last){
			lines[cy()].splice(chg.x, 0, ...first);
			last = last.concat(...rem);
			dat =[last];
			last = null;
		}
		else {
			first = first.concat(...rem);
			lines[cy()].splice(chg.x, 0, ...first);
		}
	}
	else lines[cy()].splice(chg.x, 0, ...first);

	let len = dat.length;
	let iter=0;
	for (let i=0; i < len; i++) {
		iter++;
		if (iter==1000){
			cerr("YINFINITE");
			break;
		}
		lines.splice(cy()+i+1, 0, [...dat[i]]);
	}
	if (last){
		last = last.concat(...rem);
		lines.splice(cy()+len+1, 0, [...last]);
	}
	if (foldmode&&nlines){
		real_lines.copyWithin(fromy+nlines, fromy);
		for (let i=fromy+1; i < lines.length; i++) real_lines[i]+=nlines;
	}
	if (!if_copy) chg.type = CT_MARK_INS;
};//»

	let yb=yank_buffer;
	let a = yb.args;
	let dat = yb.data.slice();
	let len = dat.length;
	let top = cy();
	let bot = top+len-1;
	if (yb.type==CT_MARK_DEL){//«
		let mark,xarg,left,right;
		mark = x;
		left = mark;
		let x1 = dat[0].length;
		if (len > 1){
			let x2 = dat[dat.length-1].length-1;
			xarg = x2;
			right = x2;
		}
		else xarg=right=mark+x1;
		undo_mark_del(new Change(CT_MARK_DEL, null, x+1, realy(), y, yb.data, yb.args.slice()),true);
	}//»
	else if (yb.type==CT_LNS_DEL){//«
		if (cy()+1==lines.length){
			edit_insert=true;
			enter(true);
			up();
			edit_insert=false;
		}
		undo_lns_del(new Change(CT_LNS_DEL, null, x, realy(1), y+1, yb.data.slice(), yb.args.slice()),true);
	}//»
	else if (yb.type==CT_BLOCK_DEL){//«
		let left,right;
		left = x;
		right =left+dat[dat.length-1].length-1;
		let _x = x;
		let _y = y;
		let ry = realy();
		for (let i=top; i <= bot; i++){
			if (check_if_folded(i)){
				stat_message=`Fold detected at line ${realnum(i)+1}`;
				stat_message_type = STAT_ERROR;
				return;
			}
		}
		undo_block_del(new Change(CT_BLOCK_DEL, null, x, ry, y, yb.data.slice(), yb.args.slice()),true);
	}//»

}//»
const dopaste = val=>{//«
	if (!val) return;
	last_action = LAST_INS_LINES;
	save_state();
	let arr=val.split("\n");
	while (arr.length&&!arr[arr.length-1]) arr.pop();
	if (!arr.length) return;
	let dat = [];
	for (let ln of arr) dat.push([...ln]);
	let use_change;
	if (arr.length==1) use_change=CT_MARK_DEL;
	else use_change=CT_LNS_DEL;
	yank_buffer = new Change(use_change, Date.now(), 0,0,0,dat,[]);
	paste();
	do_syntax_timer();
	render({},2);
};//»
const trysave=(if_saveas)=>{//«
//	if (edit_fullpath) return editsave();
	if (edit_fullpath&&!if_saveas) return editsave();
	let edit_fullpath_hold = edit_fullpath;
	sescape(()=>{
		edit_fullpath = edit_fullpath_hold;
		stat_render("Cancelled");
		return true;
	});
	stat_input_mode = "Save As: ";
	stat_com_arr=[];
	num_completion_tabs = 0;
	vim.hold_x = x;
	x=0;
	render({}, 110);
};//»

const init_splice_mode=()=>{//«

	if (!(visual_line_mode||visual_mode)) return;

	if (splice_mode) return stat_err("Already in splice mode!");
	if (edit_ftype!=FS_TYPE) return stat_err(`Can only enter splice mode with '${FS_TYPE}' files!`);

	if (dirty_flag){
		stat_warn("Please save before entering splice mode!");
		return;
	}

	let off1=0, off2=0;
	if (visual_mode){
		if (foldmode) {
			if (real_lines[y+scroll_num] == real_lines[seltop]){
				if (x < edit_sel_mark){
					off1 = x;
					off2 = edit_sel_mark;
				}
				else{
					off2 = x;
					off1 = edit_sel_mark;
				}
			}
			else{
				off1 = edit_sel_mark;
				off2 = x;
			}
		}	
		else {
			if (y+scroll_num == seltop){
				if (x < edit_sel_mark){
					off1 = x;
					off2 = edit_sel_mark;
				}
				else{
					off2 = x;
					off1 = edit_sel_mark;
				}
			}
			else{
				off1 = edit_sel_mark;
				off2 = x;
			}
		}	
	}

	let arr = geteditlines();
	let start = arr.slice(0, foldmode ? real_lines[seltop] : seltop);
	let s1='';
	for (let ar of start) s1+=ar.join("")+"\n";
	let middle;
	let to = foldmode ? real_lines[selbot+1]: selbot+1;
	if (!to) middle = arr.slice(foldmode ? real_lines[seltop]:seltop);
	else middle = arr.slice(foldmode ? real_lines[seltop]:seltop, foldmode ? real_lines[selbot+1]:selbot+1);
	let s2='';
	let newlines=[];
	for (let i=0; i < middle.length; i++){
		let ar = middle[i];
		if (off1 && i===0){
			let add = ar.slice(0, off1);
			s1+=add.join("");
			ar = ar.slice(off1);
		}
		if (off2 && i==middle.length-1) {
			if (middle.length===1) ar = ar.slice(0, off2-off1+1);
			else ar = ar.slice(0, off2);
		}
		let ln = ar.join("");
		newlines.push(ln);
		s2+=ln+"\n";
	}
	init_error = false;
	lines = [];
	let len;
	if (foldmode) {
		len = init_folds(newlines,null,true);
		if (init_error) {
			cur_escape_handler();
			return stat_err(init_error);
		}
	}
	else{
		for(let ln of newlines) lines.push(ln.split(""));
	}

	splice_start = new Blob([s1]).size;
	splice_end = splice_start + (new Blob([s2]).size) ;
	splice_mode=true;
	cur_escape_handler();
	states=[];
	line_colors = [];
	zlncols=[];
	if (foldmode) len--;
	state_iter = 0;
	x=0;
	y=0;
	scroll_num=0;
	termobj.set_lines(lines, line_colors);
	render({},5);

}//»
const syntax_refresh=()=>{zlncols=[];render({fromtop:true},6);};
const stat_timer=(mess,ms)=>{setTimeout(()=>{stat(mess)},ms);};
const set_completer_words=(linesarg)=>{//«
	if (!linesarg) linesarg = get_edit_save_arr()[0].split("\n");
	ALL_WORDS = capi.uniq(linesarg.join(" ").split(/\W+/).sort());
	ALL_WORDS = ALL_WORDS.filter( w =>
		w.length >= MIN_COMPLETE_LETTERS && !w.match(/^\d/)
	);
};//»
const stat_memory=()=>{//«
	let mem = window.performance.memory;
	let lim = mem.jsHeapSizeLimit;
	let used = mem.usedJSHeapSize;
	let per = Math.floor(100*used/lim);

	let limmb = Math.round(lim/MB);
	let usedmb = Math.round(used/MB);
	stat(`Memory: ${usedmb}MB/${limmb}MB  (${per}%)`);
};//»
const check_memory=()=>{//«
	let mem = window.performance.memory;
	let lim = mem.jsHeapSizeLimit;
	let used = mem.usedJSHeapSize;
	let got = Math.floor(100*used/lim);
	if (got > MEM_WARN_THRESHHOLD_PERCENT) {
		setTimeout(()=>{
			stat_message=`!!! Memory threshhold exceeded (${got}>${MEM_WARN_THRESHHOLD_PERCENT}) !!!`;
			stat_message_type=STAT_WARNING;
			render({},7);
		},500);
	}
};//»
const stat_which_state = (if_render) => {//«
	stat_message = `State: ${state_iter+1}/${states.length}`;
	stat_message_type = null;
	if (if_render) render({},8);
};//»
const set_stat=(mess)=>{stat_message=mess;stat_message_type=null;};
const set_stat_ok=(mess)=>{stat_message=mess;stat_message_type=STAT_OK;};
const set_stat_warn=(mess)=>{stat_message=mess;stat_message_type=STAT_WARNING;};
const set_stat_err=(mess)=>{stat_message=mess;stat_message_type=STAT_ERROR;};
const new_stdin_func_cb = new_func => {//«
	if (!new_func instanceof Function){
cerr("Second arg (callback) to edit_stdin_func called without a function!");
		return;
	}
	edit_stdin_func = new_func;
};//»
const cancel=()=>{stat_render("Cancelled!");};
const quit=()=>{//«
	if (editsave_interval) clearInterval(editsave_interval);
	termobj.is_dirty = false;
	termobj.onescape = onescape;
	termobj.overrides = hold_overrides;
	if (edit_fobj) {
		edit_fobj.unlockFile();
	}
	modequit();
};//»
const dopretty=()=>{//«
	seltop=selbot=y+scroll_num;
	visual_line_mode=true;
	delete_lines(false);
	visual_line_mode=false;
	let dat = yank_buffer.data;
	let str='';
	for (let ln of dat) str+=ln.join("")+"\n";
	str = str.replace(/\n$/,"");
	let newarr = pretty(str,{indent_with_tabs:1}).split("\n");
	insert_lines(newarr,true);
	do_syntax_timer();
	render({},9);
};//»
const dolinewrap=()=>{//«
// s/ \?\([-:{};=+><(),]\) \?/\1/g
	let mess="";
	let str, ch0, n, start, end;
	const comments=()=>{stat_render("Comments detected(//)");};
	const folds=()=>{stat_render("Fold detected");};
	const nochar=(num)=>{stat_render("No char found: line "+num);};
	const find_start=()=>{//«
	let i = n;
	ch0 = lines[i][0];
	if (!ch0) return;
	while (ch0==" "||ch0=="\t"){
		let ri = realnum(i);
		if ((foldmode&&(open_folds[ri]||end_folds[ri]))||i<0) return folds();
		ch0 = lines[i][0];
		if (!ch0) return nochar(ri+1);
		if (lines[i].join("").match(/\/\//)) return comments();
		i--;
	}
	start = i+1;
};//»
const find_end=()=>{//«
	if (!lines[n]) return;
	let tonum = lines.length;
	let i=n;
//log("?",i, tonum);
	ch0 = lines[i][0];
	while (ch0==" "||ch0=="\t"){
		let ri = realnum(i);
		if ((foldmode&&(open_folds[ri]||end_folds[ri]))||i>=tonum) return folds();
		ch0 = lines[i][0];
		if (!ch0) return nochar();
		else{
			let str = lines[i].join("");
			if (str.match(/^}\)?;?$/)){
				end = i;
				return;
			}
			else if (str.match(/\/\//)) return comments();
		}
		i++;
	}
};//»

if (visual_line_mode) mess = "Not checking for internal comments";
else{ 
	if (!is_normal_mode(true)) return;
	n = y+scroll_num;
//log(y, scroll_num);
	if (foldmode&&open_folds[realnum(n)]) return folds();
	if (!lines[n]) return;
	ch0 = lines[n][0];
	if (!ch0) return nochar();
	str = lines[n].join("");
	if (str.match(/^}\)?;?$/)) {
		end = n;
		n--;
		find_start();
	}
	else {
		if (!(ch0==" "||ch0=="\t")) {
			if (str.match(/\/\//)) return comments();
			start = n;
			n = start+1;
		}
		else {
			let holdn = n;
			find_start();
			n=holdn+1;
		}
		find_end();
	}
	if (!(NUM(start)&&NUM(end)&&start<end&&start>=0)) return;

	visual_line_mode=true;
	seltop = start;
	selbot = end;
}

delete_lines(false);
visual_line_mode=false;
let dat = yank_buffer.data;
str='';
for (let ln of dat) str+=ln.join("");
str = str.replace(/[\x20\t]*([-:{};=+><(),])[\x20\t]*/g,"$1");
insert_lines([str],true);
if(y<0) {
	scroll_num+=(y);
	y=0;
}
stat_render(mess);


};//»
termobj.onescape=()=>{//«
	if (cur_escape_handler){
		cur_escape_handler();
		cur_escape_handler=null;
		if (stat_input_mode) stop_stat_input();
		stat_cb=null;
		render({},10);
	}
	else if (line_colors.length){
    	line_colors.splice(0, line_colors.length);
		render({},11);
	}
	else {
		if (num_escapes==NUM_ESCAPES_TO_RESET){
			scroll_num=0;
			y=0;
			num_escapes=0;
			edit_insert=visual_line_mode=visual_mode=visual_block_mode=stat_input_mode=null;
			render({},12);
		}
		num_escapes++;
	}
	return true;
};//»
const set_escape_handler = cb => {cur_escape_handler=cb;};
const xescape = () => {cur_escape_handler=null;};
const sescape = set_escape_handler;
const line_from_real_line = num => {//«
	if(!foldmode) return lines[num]
	for (let i=0; i < lines.length; i++){
		if (real_lines[i]==num) return lines[i];
	}
	return null;
};//»
const line_num_from_real_line_num = num => {//«
	if(!foldmode) return num;
	for (let i=0; i < lines.length; i++){
		if (real_lines[i]==num) return i;
	}
	return null;
};//»
const cx = () => {return x;}
const cy = () => {return y + scroll_num;}
const logreallines = if_str => {//«
	if (if_str) jlog(real_lines.slice(0,lines.length));
	else log(real_lines.slice(0,lines.length));
};//»
const stat_ok=mess=>{stat_message=mess;stat_message_type=STAT_OK;render({},13);};
const stat_warn=mess=>{stat_message=mess;stat_message_type=STAT_WARNING;render({},14);};
const stat_err=mess=>{stat_message=mess;stat_message_type=STAT_ERROR;render({},15);};
const stat_render=(mess)=>{stat_message=mess;stat_message_type=STAT_NONE;render({},16);};
const stat = stat_render;
const realnum=num=>{if(!foldmode)return num;return real_lines[num];};
const realy=d=>{if(!d)d=0;if(foldmode)return real_lines[cy()+d];return cy()+d;};
const is_normal_mode = edit_ok => {//«
	if (edit_ok) return (!(visual_line_mode || visual_mode || visual_block_mode || stat_input_mode));
	return (!(edit_insert || visual_line_mode || visual_mode || visual_block_mode || stat_input_mode));
};//»
const prepend_visual_line_space=(ch)=>{//«
	for (let i=seltop; i<= selbot; i++) lines[i].splice(0,0,ch);
	render({},17);
	dirty_flag = true;
	termobj.is_dirty = true;
};//»
const maybequit=()=>{//«
//return quit();
	if (OK_DIRTY_QUIT || !dirty_flag) return quit();
	stat_message = "Really quit? [y/N]";
	render({},18);
	stat_cb = (ch)=>{
		stat_cb = null;
		if (ch=="y"||ch=="Y") quit();
		else render({},19);
	}
}//»
const insert_hex_ch=()=>{//«
	sescape(()=>{
		stat_render("Cancelled!");
	});
	let nogo=()=>{
		stat_cb=null;
		stat_render("Invalid token");
	};
	let s='';
	stat_cb=ch=>{
		if(ch=="__OK__"){
			if (!s) return cur_escape_handler();
			last_action = LAST_CH;
			save_state();
			printch(String.fromCharCode(parseInt(s,16)));
			stat_cb = null;
			return;
		}
		if (!(ch&&ch.match(/^[0-9a-fA-F]$/))) {
			nogo();
			return;
		}
		if (s.length==4) return cur_escape_handler();
		s+=ch;
		stat_render(s);
	};
}//»
const printchars=s=>{//«
	let arr=s.split("");
	if (!edit_insert) x++;
	for(let ch of arr)printch(ch);
	if (!edit_insert) x--;
//	save_state();
	do_syntax_timer();
};//»
const printch = ch =>{//«
	let linenum = cy();
	let lnarr = lines[linenum];
	if (!lnarr) lnarr = [];
	if (check_if_folded(linenum)) return;
//	if (lnarr.length==1&&lnarr[0]=="") lnarr[0]=ch;
	if (!lnarr[0]) lnarr[0]=ch;
	else lnarr.splice(x, 0, ch);
	update_syntax_printch();
	x++;
	render({},20);
	dirty_flag = true;
	termobj.is_dirty = true;
}//»
const geteditlines=()=>{//«
	let uselines;
	if (foldmode){
		uselines = [];
		for (let i=0; i < lines.length; i++){
			let realln = real_lines[i];
			if (fold_lines[realln]){
				uselines.push(...fold_lines[realln]);
			}
			else uselines.push(lines[i]);
		}
	}
	else uselines = lines;
	return uselines;

}//»
const get_edit_save_arr = () =>{//«
	let str = "";
	let uselines=geteditlines();
	for (let ln of uselines) {
		if (!ln) break;
		str += ln.join("")+"\n";
	}
	return [str.replace(/\n$/,""), uselines.length];
};//»
const curnum=(addx)=>{//«
	if (!addx) return y+scroll_num;
	return y+scroll_num+addx;
}//»
const curln=(if_arr, addy)=>{//«
	let num = curnum();
	if (!addy) addy = 0;
	let ln = lines[y+scroll_num+addy];
	if (!isarr(ln)) ln = [];
//log(ln);
	if (if_arr) return ln;
	else return ln.join("");
}//»
const curch=(addx)=>{//«
	if (!addx) return lines[y+scroll_num][x];
	return lines[y+scroll_num][x+addx];
}//»
const seek_line_start=()=>{//«
	toggle_if_folded();
	x = 0;
	render({},21);
}//»
const seek_line_end=()=>{//«
	toggle_if_folded();
	x = curln().length;
	if (!edit_insert && x > 0) x--;
	render({},22);
}//»
const creturn=()=>{//«carriage return
	var num = cy();
	if (!down()) return;
	if (cy() > num) seek_line_start();
}//»
const set_sel_mark=()=>{//«
//	if (!visual_mode) return;
	if (!(visual_mode||visual_block_mode)) return;
	if (x==edit_sel_mark) selleft=selright=x;
	else if (x < edit_sel_mark){
		selleft = x;
		selright = edit_sel_mark;
	}
	else{
		selleft = edit_sel_mark;
		selright = x;
	}
}//»
const set_sel_end=()=>{//«
	if (!(visual_line_mode||visual_mode||visual_block_mode)) return;
	if (cy() == edit_sel_start) seltop=selbot=cy();
	else if (cy() < edit_sel_start) {
		seltop = cy();
		selbot = edit_sel_start;
	}
	else {
		seltop = edit_sel_start;
		selbot = cy();
	}
	set_sel_mark();

}//»
const seldel=()=>{//«
	for (let i=seltop; i <=selbot; i++){
		let ln = lines[i];
		let ch = ln[0];
		if (ch==" "||ch=="\t") ln.splice(0, 1);
	}
	dirty_flag = true;
	termobj.is_dirty = true;
	render({},23);
}//»

//»
//Syntax/Parsing«

//Var«
let syntax_hold;
let syntax_timer = null;
let syntax_delay_ms = 0;

const NO_SYNTAX=0;
const JS_SYNTAX=1;

let SYNTAX=NO_SYNTAX;
//let SYNTAX=JS_SYNTAX;
const KEYWORDS=[
"await",
"break",
"case",
"catch",
"class",
"const",
"continue",
"debugger",
"default",
"delete",
"do",
"else",
"export",
"extends",
"finally",
"for",
"if",
"import",
"in",
"instanceof",
"new",
"return",
"super",
"switch",
"throw",
"try",
"typeof",
"while",
"with",
"implements",
"interface",
"package",
"private",
"protected",
"null"
];
const LIGHT_RED="#ff998f";
const RED="#ff3333";

const JS_KEYWORD_COL = "#af5f00";
const JS_DEC_COL = "#06989a";
const JS_COMMENT_COL = LIGHT_RED;
const JS_QUOTE_COL=RED;
const JS_BOOL_COL = LIGHT_RED;
//const JS_COMMENT_COL = "#ef2929";
//const JS_QUOTE_COL="#c00";
let KEYWORD_STR='';
for (let c of KEYWORDS) KEYWORD_STR+="\\b"+c+"\\b"+"|";
KEYWORD_STR=KEYWORD_STR.slice(0,KEYWORD_STR.length-1);

const DECS = ["function","this","var","let"];
let DEC_STR='';
for (let c of DECS) DEC_STR+="\\b"+c+"\\b"+"|";
DEC_STR=DEC_STR.slice(0,DEC_STR.length-1);

const BRACES = ["{","}","[","]"];
let BRACES_STR = "{|}|\\[|\\]";

const BOOLS=["true","false"];
const BOOL_STR="\\btrue\\b|\\bfalse\\b";

const C_COMMENT = "//";
const SQUOTE = "'";
const DQUOTE = '"';
const C_OPEN_COMMENT_PAT = "/\\x2a";
const C_CLOSE_COMMENT_PAT = "\\x2a/";
const C_OPEN_COMMENT = "/\x2a";
const C_CLOSE_COMMENT = "\x2a/";
const BACKTICK = "\x60"; 
const JS_STR="("+BRACES_STR+"|"+BOOL_STR+"|"+KEYWORD_STR+"|"+DEC_STR+"|"+C_COMMENT+"|"+C_OPEN_COMMENT_PAT+"|"+C_CLOSE_COMMENT_PAT+"|"+BACKTICK+"|"+SQUOTE+"|"+DQUOTE+")";
const ALPHA_JS_STR="("+BOOL_STR+"|"+KEYWORD_STR+"|"+DEC_STR+")";
const ALPHA_JS_RE = new RegExp(ALPHA_JS_STR);
/*«
const C_COMMENT = "//";
const SQUOTE = "'";
const DQUOTE = '"';
const C_OPEN_COMMENT_PAT = "/\\x2a";
const C_CLOSE_COMMENT_PAT = "\\x2a/";
const C_OPEN_COMMENT = "/\x2a";
const C_CLOSE_COMMENT = "\x2a/";
const BACKTICK = "\x60";
const JS_MULTILINE_QC_STR ="("+C_COMMENT+"|"+C_OPEN_COMMENT_PAT+"|"+C_CLOSE_COMMENT_PAT+"|"+BACKTICK+"|"+SQUOTE+"|"+DQUOTE+")";
»*/
//»

const render = (opts={}, which) =>{//«

if (syntax_timer || no_render) return;

let to = scroll_num+h-1;
try{
syntax_screen(opts.fromtop);
}catch(e){
//log(e);
}
vim.opts = opts;
vim.x = x;
vim.y = y;
vim.scroll_num = scroll_num;
vim.stat_input_mode = stat_input_mode;
vim.stat_com_arr = stat_com_arr;
vim.stat_message = stat_message;
vim.stat_message_type = stat_message_type;
vim.stat_cb = stat_cb;
vim.insert = edit_insert;
vim.fullpath = edit_fullpath;
vim.seltop=seltop;
vim.selbot=selbot;
vim.selleft=selleft;
vim.selright=selright;
vim.selmark=edit_sel_mark;
vim.error_cursor=error_cursor;
vim.real_line_mode=real_line_mode;
vim.real_lines=real_lines;
vim.visual_line_mode=visual_line_mode;
vim.visual_block_mode=visual_block_mode;
vim.visual_mode=visual_mode;
vim.macro_mode=macro_mode;
vim.show_marks=show_marks;
vim.splice_mode=splice_mode;
try{
refresh();
}catch(e){
//log(lines);
//log(e);
}
last_render = performance.now();
}//»
const do_syntax_timer=()=>{//«
	if (SYNTAX==NO_SYNTAX){
		render({},112);
		return
	}
	let now = window.performance.now();
	if (syntax_timer && (now - last_key_time < syntax_delay_ms)){
		clearTimeout(syntax_timer);
	}
	syntax_timer=setTimeout(()=>{
		zlncols=[];
		syntax_timer = null;
		render({},24);
	}, syntax_delay_ms);
	last_key_time = now;
};//»
const blank_syntax_screen=()=>{//«
	let from = scroll_num;
	let to = from+h-1;
	for (let i=from; i < to; i++) delete zlncols[foldmode ? real_lines[i]:i];
};//»
const clear_syntax=()=>{//«
	zlncols=[];
//  To just blank out all the line colors instead of refreshing.
	for (let i=0; i <line_colors.length;i++){
		line_colors[i]=[];
	}
	for (let i=0; i <zlncols.length; i++)zlncols[i]=[];
};//»
const syntax_key=()=>{//«
sescape(cancel);
stat_cb=ch=>{
stat_cb=null;
xescape();

if (ch=="a"){

unfold_all();
//line_colors=[];
for (let i=0; i <line_colors.length; i++)line_colors[i]=[];
//for (let i=0; i <zlncols.length; i++)zlncols[i]=[];
zlncols=[];
syntax_file();

}
else if (ch=="c"){
//  To just blank out all the line colors instead of refreshing.
//clear_syntax();
	for (let i=0; i <zlncols.length; i++)zlncols[i]=[];
//	line_colors=[];
//	zlncols=[]

}
else if (ch=="l"){
//Blank out the line by setting it to empty
	delete zlncols[foldmode ? real_lines[cy()]:cy()];
}
else if (ch=="s"){
	let from = scroll_num;
	let to = from+h-1;
	for (let i=from; i < to; i++){
//Blank out the screen by setting all to empty
		let ry = foldmode ? real_lines[i]:i;
		delete zlncols[ry];
	}
}
else if (ch=="t"){
	if (syntax_hold){
		SYNTAX=syntax_hold;
		syntax_hold=null;
	}
	else{
		syntax_hold=SYNTAX;
		SYNTAX=NO_SYNTAX;
		clear_syntax();
	}
}
else return stat_err(`${ch}: not a syntax command`);
render({},25);


};
};//»
const insert_quote_color=(pos,s)=>{//«
	let lno = cy();
	let ry = foldmode ? real_lines[lno]:lno;
	let colarr = zlncols[ry]||[];
	zlncols[ry]=colarr;
	colarr[pos]=[2, JS_QUOTE_COL, "", s, pos];
};//»
const insert_word_color=(pos, s)=>{//«
	let lno = cy();
	let ry = foldmode ? real_lines[lno]:lno;
	let colarr = zlncols[ry]||[];
	zlncols[ry]=colarr;
	let t, col;
	if (KEYWORDS.includes(s)){
		t="kw";col=JS_KEYWORD_COL;
	}
	else if (DECS.includes(s)){
		t="dec";col=JS_DEC_COL;
	}
	else{
		t="bool";col=JS_BOOL_COL;
	}
	let slen = s.length;
	let movecols = [];
	for (let col of colarr){
		if (!col) continue;
		let _p = col[4];
		if (x <= _p) {
			delete colarr[_p];
			col[4]+=slen;
			movecols.push(col);
		}
	}
	for (let col of movecols) colarr[col[4]] = col;//Activate the new colors

	if (!t) return;
	colarr[pos]=[s.length, col, "", t, pos];

};//»
const update_syntax_printch=()=>{//«
if (SYNTAX !== JS_SYNTAX) return;
/*Note«
This does not check for syntax destroyers like quotes in quotes (" " ") or comment enders
The idea is that at the level of printing single characters: when it comes to real time
highlighting, dumber is better. So much time can be wasted on trying to clear the 
multiline comment red from vim when it wraps folds with many internal lines. We often want
to comment out large chunks of code, with lots of that code hidden inside of folds that
are hundreds/thousands of lines long. The idea of putting the onus on the syntax highlighter 
to instantly decipher what the typist is trying to structurally do is pretty dumb. The
theory of LOTW, when it comes to folded up folds, is to treat their contents as purely as
whitespace (a newline character). For someone to put unbalanced multiline comment enders or
quotes (`) inside of a fold is always a mistake at a deeper level that the immediate feedback
syntax highlighter algorithm should not be trying to correct.
»*/
//Var«
const ID_RE = /^[a-zA-Z0-9_]$/;
const expanders=[
"//","/*","'",'"'
];
let ln = curln(true);
let lnlen = ln.length;

//WIUPTNGFH (also see the one below where there is ch.match)
let prv="", nxt=ln[x+1], ch = ln[x];
if (x>0) prv=ln[x-1];

let lnum = y+scroll_num;
let rlnum = foldmode ? real_lines[lnum]:lnum;

let incol;
let prevcol, nextcol;
let movecols=[];
let colarr = zlncols[rlnum];
if (!(colarr&&NUM(colarr.length))) {
	colarr = [];
	zlncols[rlnum]=colarr;
}

let info = colarr._info;
let _end;
if (info) _end = info.end;
//»

if (info&&info.type=="/*"){//«
	let cobj = colarr[0];
	if (!cobj){
		colarr[0]=[1, JS_COMMENT_COL,"", "/*", 0];
		return;
	}
	else if (colarr.length==1 &&colarr[0][4]==0){
		if (_end && x >= _end){}
		else return cobj[0]++;
	}
	else{
	}
}//»
nextcol = colarr[x];//We are stepping right *on* the color's position//«
						// ---- here
						// V
						// "abc def"
						// const
//»
if (!nextcol&&x>0){//«Are we *in* one?
//If not stepping on one, we might be in one
//     ---- here
//     V
// "abc def"
// const		(being *on* the last character is considered being *in* its syntax)
try{
	for (let col of colarr){
		if (!col) continue;
//log(col);
		let pos = col[4];
		if (x < pos) continue;
		if (x > pos && x < pos+col[0]){
			incol = col;
			break;
		}
	}
}
catch(e){
log(e);
cwarn("colarr is not iterable?");
log(colarr);
}
}//»
if (!incol && x > 0){//«Are we *after* one?
//If not in one, might be directly after one
//          ---- here
//          V
// "abc def"
//     const
	for (let col of colarr){
		if (!col) continue;
		let pos = col[4];
		if (x < pos) continue;
		if (x == pos + col[0]){
			prevcol = col;
		}
//		else break;
	}
//log();
}//»
if (!incol){//«If we are after a line comment "//"
	try{
		for (let col of colarr){
			if (!col) continue;
			if (col[3]=="//"&& x > col[4]){
				col[0]++;
				return;
			}
		}
	}
	catch(e){
	log(e);
	cwarn("What is colarr?");
	log(colarr);
	}
}//»

if (incol){//If in one, increment the expanders and negate everything else//«
	let typ = incol[3];
if (!typ){
cwarn("No type @incol[0]");
log(incol);
}
//log(incol);
	if (expanders.includes(typ)){
		incol[0]+=1;
	}
	else {
		delete colarr[incol[4]];
	}
}//»
if (incol && incol[3]=="//" && x>0 && x-1 == incol[4] && ch!="/"){//«
	delete colarr[incol[4]];
	return;
}//»
if (nextcol && !expanders.includes(nextcol[3]) && ch.match(ID_RE)){//Negate the nextious color if not an expander//«
	delete colarr[nextcol[4]];
}//»
if (prevcol && !expanders.includes(prevcol[3]) && ch.match(ID_RE)){//Negate the previous color if not an expander//«
	delete colarr[prevcol[4]];
}//»
if (prevcol){//«
	let typ = prevcol[3];
	if (typ=="/*"&&!(x > 2 && ln[x-1]=="/"&&ln[x-2]=="*")){
		if (_end && x>=_end){}
		else prevcol[0]++;
	}
}//»

for (let col of colarr){//«Find everything to move ahead to put into movecols array
	if (!col) continue;//delete it from colarr and increment its position argument (4th)
	let pos = col[4];
	if (x <= pos) {
		delete colarr[pos];
		col[4]++;
		movecols.push(col);
	}
}//»
for (let col of movecols) colarr[col[4]] = col;//Activate the new colors
if (!incol){//«If not interior to something...
let have_comment = false;
//WIUPTNGFH
if (!ch) return;
if (ch.match(/^[a-z]$/)){//«Might have a new keyword if lower case
	let s = ch;
	let start_i=x;
	if (x > 0){
		for (let i=x-1; i >= 0; i--){
			let c = ln[i];
			if (c.match(/^[a-z]$/)) {
				s = c+s;
				start_i = i;
			}
			else break;
		}
	}
	for (let i=x+1; i < lnlen; i++){
		let c = ln[i];
		if (c.match(/^[a-z]$/)) s = s+c;
		else break;
	}
	if (ALPHA_JS_RE.test(s)){
		let typ,col;
		if (KEYWORDS.includes(s)){
			typ = "kw";
			col = JS_KEYWORD_COL;
		}
		else if(DECS.includes(s)){
			typ = "dec";
			col = JS_DEC_COL;
		}
		else {
			typ = "bool";
			col = JS_BOOL_COL;
		}
		colarr[start_i]=[s.length, col, "", typ, start_i];
	}

}//»
else if (ch=="/"){//Many starting a new eol comment«
	if (prv=="/"||nxt=="/"){
		let _x=x;
		if (prv=="/") _x--;
		for (let col of colarr){
			if (!col) continue;
			let pos = col[4];
			if (pos>x) delete colarr[pos];
		}
		have_comment = true;
		colarr[_x]=[lnlen-_x, JS_COMMENT_COL, "", "//", _x];
	}
}//»
if (!ch.match(ID_RE)&&!have_comment){//If not in a color, does introducing a meta«

let s1 = '';
let start_i1=x;
if (x > 0){
	for (let i=x-1; i >= 0; i--){
		let c = ln[i];
		if (c.match(/^[a-z]$/)) {
			s1 = c+s1;
			start_i1 = i;
		}
		else break;
	}
}
let s2 = '';
let start_i2 = x+1;
for (let i=x+1; i < lnlen; i++){
	let c = ln[i];
	if (c.match(/^[a-z]$/)) s2 = s2+c;
	else break;
}
if (ALPHA_JS_RE.test(s1)){
	let typ,col;
	if (KEYWORDS.includes(s1)){
		typ = "kw";
		col = JS_KEYWORD_COL;
	}
	else if(DECS.includes(s1)){
		typ = "dec";
		col = JS_DEC_COL;
	}
	else {
		typ = "bool";
		col = JS_BOOL_COL;
	}
	colarr[start_i1]=[s1.length, col, "", typ, start_i1];
}
if (ALPHA_JS_RE.test(s2)){
	let typ,col;
	if (KEYWORDS.includes(s2)){
		typ = "kw";
		col = JS_KEYWORD_COL;
	}
	else if(DECS.includes(s2)){
		typ = "dec";
		col = JS_DEC_COL;
	}
	else {
		typ = "bool";
		col = JS_BOOL_COL;
	}
	colarr[start_i2]=[s2.length, col, "", typ, start_i2];
}



}//»
}//»

};//»
const update_syntax_delch=(ch)=>{//«

//Var«
const ID_RE = /^[a-zA-Z0-9_]$/;
const expanders=[
"//","/*","'",'"'
];
let ln = curln(true);
let lnlen = ln.length;
let prv;
if (x>0) prv=ln[x-1];
let nxt=ln[x];

let lnum = y+scroll_num;
let rlnum = foldmode ? real_lines[lnum] : lnum;

let incol;
let prevcol, nextcol;
let movecols=[];
let colarr = zlncols[rlnum];

if (!isarr(colarr)) {

	zlncols[rlnum]=[];
	return;
}
//»

nextcol = colarr[x+1];//We are stepping right *on* the color's position//«
						// ---- here
						// V
						// "abc def"
						// const
//»
if (!nextcol){//«Are we *in* one?
//If not stepping on one, we might be in one
//     ---- here
//     V
// "abc def"
// const		(being *on* the last character is considered being *in* its syntax)
	for (let col of colarr){
		if (!col) continue;
		let pos = col[4];
		if (x < pos) continue;
//log(x,pos,col[0]);
		if (x >= pos && x < pos+col[0]){
			incol = col;
			break;
		}
	}
}//»
if (!incol && x > 0){//«Are we *after* one?
//If not in one, might be directly after one
//          ---- here
//          V
// "abc def"
//     const
	for (let col of colarr){
		if (!col) continue;
		let pos = col[4];
		if (x < pos) continue;
		if (x == pos + col[0]){
			prevcol = col;
		}
	}
}//»
if (prevcol&&nextcol&&!expanders.includes(prevcol[3])&&!expanders.includes(nextcol[3])){//«
	delete colarr[nextcol[4]];
	delete colarr[prevcol[4]];
}//»
if (incol){//If in one, decrement the expanders and negate everything else//«
	let typ = incol[3];
	let pos = incol[4];
	if (ch=="/" && typ=="//"&&(pos==x-1||pos==x)){
		delete colarr[pos];
	}
	else if (ch=="*"&&typ=="/*"&&pos==x-1){
		delete colarr[incol[4]];
	}
	else if (ch=="/"&&typ=="/*"&&pos==x){
		delete colarr[incol[4]];
	}
	else if ((ch=='"' && typ=='"')||ch=="'"&&typ=="'"){
		delete colarr[incol[4]];
	}
	else if (expanders.includes(typ)){
		incol[0]-=1;
	}
	else {
		delete colarr[incol[4]];
	}
}//»
else if (nextcol){//«
	let typ = nextcol[3];
	let pos = nextcol[4];
	if (ch=="/" && typ=="//"&&pos==x) delete colarr[pos];
}//»
for (let col of colarr){//«Find everything to move ahead to put into movecols array
	if (!col) continue;//delete it from colarr anddencrement its position argument (4th)
	let pos = col[4];
	if (x < pos) {
		delete colarr[pos];
		col[4]--;
		movecols.push(col);
	}
}//»
for (let col of movecols) colarr[col[4]] = col;//Activate the new colors
if (!incol){//«
	if (prv=="/"&&nxt=="/"){
		let _x = x-1;
		for (let col of colarr){
			if (!col) continue;
			if (col[4]>_x)delete colarr[col[4]];
		}
		colarr[_x]=[lnlen-_x, JS_COMMENT_COL, "", "//", _x];
		return;
	}

	if (prevcol){
		let _t = prevcol[3];
		if (_t=="dec"||_t=="kw"||_t=="bool") delete colarr[prevcol[4]];
	}
	if (nextcol){
		let _t = nextcol[3];
		if (_t=="dec"||_t=="kw"||_t=="bool") delete colarr[nextcol[4]];
	}

	let s = '';
	let start_i=x;
	if (x > 0){
		for (let i=x-1; i >= 0; i--){
			let c = ln[i];
			if (c.match(/^[a-z]$/)) {
				s = c+s;
				start_i = i;
			}
			else break;
		}
	}
	for (let i=x; i < lnlen; i++){
		let c = ln[i];
		if (c.match(/^[a-z]$/)) s = s+c;
		else break;
	}
	if (ALPHA_JS_RE.test(s)){
		let typ,col;
		if (KEYWORDS.includes(s)){
			typ = "kw";
			col = JS_KEYWORD_COL;
		}
		else if(DECS.includes(s)){
			typ = "dec";
			col = JS_DEC_COL;
		}
		else {
			typ = "bool";
			col = JS_BOOL_COL;
		}
		colarr[start_i]=[s.length, col, "", typ, start_i];
	}

}//»

};//»
const parse_js_syntax_line=(arr, last, ry)=>{//«
	let _state, _type;
	let _statei, _stateln, _col;
	let _lasty=null;
	let _end;
	let colobj=[];
	if (last){
		_state = last.state;
		_type = last.type;
		_col = last.col;
		_statei = last.statei;
		_stateln = last.stateln;
		_lasty = last.realy;
	}

	const mkobj=(pos, len, col, which)=>{
		colobj[pos]=[len, col, "", which, pos];
	};
	const setinfo=()=>{
		colobj._info={
			state:_state,
			end: _end,
			type:_type,
			col:_col,
			statei:_statei,
			stateln:_stateln,
			realy:ry
		}
	};
	if(!arr) return;
/*
	else if (!arr.join){
cwarn(`Got bad array @ry=${ry}`);
log(arr);
arr=[];
	}
*/
//log(arr);
	let rest = arr.join("");
	if (!rest) {
//		colobj.state = _state;
		setinfo();
		return colobj;
	}
	let marr;
	let type = null;
	let from=0;
	let to = rest.length-1;
	let JS_RE  = new RegExp(JS_STR,"g");
	let didnum = 0;
	while (marr = JS_RE.exec(rest)){
		didnum++;
		let tok = marr[1];
		let i = marr.index;
		if (!_state){//«
			if (KEYWORDS.includes(tok)){
				mkobj(i,tok.length, JS_KEYWORD_COL, "kw");
				continue;
			}
			if (DECS.includes(tok)){
				mkobj(i,tok.length, JS_DEC_COL, "dec");
				continue;
			}
			if (BRACES.includes(tok)){
				mkobj(i,1, "#06989a");
				continue;
			}
			if (BOOLS.includes(tok)){
				mkobj(i,tok.length, JS_BOOL_COL, "bool");
				continue;
			}
			let c1 = arr[i]||" ";
			let col;
			if (tok==DQUOTE||tok==SQUOTE||tok==BACKTICK) col=JS_QUOTE_COL;
			else if (tok==C_COMMENT||tok==C_OPEN_COMMENT) col=JS_COMMENT_COL;
			else col="";
			if (tok==C_COMMENT){
				mkobj(i, arr.length-i, col, "//");
				break;
			}
//			else if (tok==DQUOTE){
//log(1234567);
//				mkobj(i,1, col, '"');
//				break;
//			}
			_stateln = ry;
			_statei = i;
			_col=col;
			_state = true;
			_type = tok;
			type = tok;
		}//»
		else {//«
			if (type==tok){
				mkobj(_statei, i-_statei+1, _col, tok);
				_state = false;
				_type=null;
				_col=null;
				type=null;
			}

			else if (tok==C_CLOSE_COMMENT&&_type==C_OPEN_COMMENT){
				if (_stateln==ry) mkobj(_statei, i-_statei+2, _col,_type);
				else {
					mkobj(0, i+2, _col, _type);
					_end = i+2;
				}
				_state=false;
				_type=null;
				_col=null;
			}
			else if (tok==BACKTICK&&_type==BACKTICK){
				if (_stateln==ry) mkobj(_statei, i-_statei+1, _col,_type);
				else mkobj(0, i+1, _col, _type);
				_state = false;
				_type=null;
				_col=null;
			}
			else if (type==C_OPEN_COMMENT){
//log("STATE OPEN");
			}
			else{
//console.warn("SYNTAX WHAT?????????", tok, _type);
didnum=0;
			}
		}//»
	}

	if (!didnum && (_type==C_OPEN_COMMENT||_type==BACKTICK))mkobj(0, arr.length, _col);
	else if (_state && (type==SQUOTE||type==DQUOTE)){
		mkobj(_statei, arr.length-_statei, _col, type);
		_state = false;
	}
	else if (_state) mkobj(_statei, arr.length-_statei, _col, _type);
	if (!(_type==C_OPEN_COMMENT||_type==BACKTICK)){
		_type=null;
		_state=null;
	}
	_statei=null;
	setinfo();
	return colobj;
}//»
const js_syntax_screen=(if_start_top)=>{//«
	let from;
	if (if_start_top) from = 0;
	else from = scroll_num;
	let to = scroll_num+h-1;
	for (let i=from; i < to; i++){
		let ln = lines[i];
		let ry;
		if (foldmode) ry = real_lines[i];
		else ry = i;
		let colobj = zlncols[ry]
		if (!colobj) {
			let prev;
			if (i>0) {
				if (foldmode) prev = zlncols[real_lines[i-1]];
				else prev = zlncols[i-1];
			}
			colobj = parse_js_syntax_line(ln, prev&&prev._info, ry);
			zlncols[ry] = colobj;
		}
		line_colors[i] = colobj;
	}
}//»
const js_syntax_file=()=>{//«
	let to = lines.length-1;
	for (let i=0; i < to; i++){
		let ln = lines[i];
		let colobj = line_colors[i];
		if (!colobj) {
			let prev;
			if (i>0) prev = line_colors[i-1];
			colobj = parse_js_syntax_line(ln,prev&&prev._info, i);
			zlncols[i] = colobj;
		}
		line_colors[i] = colobj;
	}
}//»
const syntax_screen=(if_start_top)=>{//«
if (SYNTAX==JS_SYNTAX) js_syntax_screen(if_start_top);
};//»
const syntax_file=()=>{//«
if (SYNTAX==JS_SYNTAX) js_syntax_file();
};//»

//»
//Folding«

const make_indent_fold=()=>{//«
let start=cy();
let end;
let ln = curln(true,1);
if (!ln) return;
let use=ln[0];
log(1);
if (!(use=="\x20"||use=="\x09")) return;
ln = curln(true);
let ln0 = ln;
let ln1;
let indent=0;
for(let i=0; i < ln.length; i++) {
	if(ln[i]!=use)break;
	indent++;
}
let len=lines.length;
let k=0;
LOOP: for (let i=start+1;i<len;i++){
k++;
	if (k>100000) {
cerr("INFIN?");
		return;
	}
	let ln = lines[i];
//log(i,ln);
	if (!ln.length) continue;
	for (let j=0; j < indent-1; j++){
		k++;
		if (k>100000) return;
		if (ln[j]!=use){
			return;
		}
	}
	if (ln[indent]!=use) {
		end=i;
		ln1 = ln;
		break;
	}
}
if (start && end && start < end){
let rt = real_lines[start];
let rb = real_lines[end];

open_folds[rt]=true;
open_fold_nums.push(rt);
open_fold_nums.sort(LO2HI);
end_folds[rb]=true;
end_fold_nums.push(rb);
end_fold_nums.sort(LO2HI);

ln0.push("/","/", "\xab");
ln1.push("/","/", "\xbb");
lines[start]=ln0;
lines[end]=ln1;
render({},26);
}


};//»
const make_visual_fold=()=>{//«

if (seltop===selbot) return;

let rt = real_lines[seltop];
let rb = real_lines[selbot];

visual_line_mode=false;
edit_insert=true;
x=0;
if (open_folds[rb]||end_folds[rb]){
	y=selbot-scroll_num;
	enter(true);
	selbot++;
}
if (open_folds[rt]||end_folds[rt]){
	y=seltop-scroll_num;
	this.key_handler("ENTER_");
	selbot++;
}
rt = real_lines[seltop];
rb = real_lines[selbot];

let usetop = seltop;

let topln = lines[seltop];
if (SYNTAX==JS_SYNTAX){
	if (! /\/(\*|\/)[\t\x20]*$/.test(topln.join(""))) topln.push("/","/");
}
topln.push("\xab");
open_folds[rt]=true;
open_fold_nums.push(rt);
open_fold_nums.sort(LO2HI);

let botln = lines[selbot];
if (SYNTAX==JS_SYNTAX){
	if (/^\*\/[\t\x20]*$/.test(botln.join(""))) botln.unshift("\xbb");
	else if (/^\/\/[\t\x20]*$/.test(botln.join(""))) botln.push("\xbb");
	else botln.push("/","/","\xbb");
}
else botln.push("\xbb");
end_folds[rb]=true;
end_fold_nums.push(rb);
end_fold_nums.sort(LO2HI);

x=0;
visual_line_mode=false;
edit_insert=false;
do_syntax_timer();
render({},27);
};//»
const make_visual_comment=(if_fold)=>{//«
//if_fold=false;
	if (SYNTAX==NO_SYNTAX) return;
	if (seltop===selbot) return;


	let rt = real_lines[seltop];
	let rb = real_lines[selbot];
	if (open_folds[rb]||end_folds[rb]||open_folds[rt]||end_folds[rt]) return;

	let ln1 = lines[seltop];
	let ln2 = lines[selbot];
	if (SYNTAX==JS_SYNTAX) {
		if (if_fold) {
			ln1.unshift("\xab");
			open_folds[rt]=true;
			open_fold_nums.push(rt);
			open_fold_nums.sort(LO2HI);
		}
		ln1.unshift("/","*");
		if (if_fold) {
			ln2.push("\xbb");
			end_folds[rb]=true;
			end_fold_nums.push(rb);
			end_fold_nums.sort(LO2HI);
		}
		ln2.push("*","/");
	}
	do_syntax_timer();
	visual_line_mode=false;
	render({},28);
};//»
const unfold_all = () => {//«
	lines=geteditlines();
	for (let i=0; i < lines.length; i++) real_lines[i]=i;
	fold_lines={};
//	line_colors=[];
	zlncols=[];
	termobj.set_lines(lines, line_colors);
	render({},29);
};//»
const fold_all = () => {//«
	let newlines = [];
	for (let ln of lines) newlines.push(ln.join(""));
	real_lines = new Uint32Array(REAL_LINES_SZ);
	init_folds(newlines,null,true);
//	line_colors=[];
	zlncols=[];
	termobj.set_lines(lines, line_colors);
	render({},111);
};//»
const do_fold_all = () => {//«
	let ry = realy();
	for (let k in fold_lines){
		unfold_all();
		break;
	}
	y=scroll_num=0;
	fold_all();
	for (let i = 0 ; i < real_lines.length; i++){
		let ln = real_lines[i];
		if (ln >= ry){
			if (i>0) {
				y=i;
				if (ln != ry) y--;
				let diff = y-h;
				if (diff > 0){
					scroll_num += diff;
					y=h-1;
				}
			}
			break;
		}
	}
	let iter=0;
	for (let n of real_lines){
		if (n>=ry) {
			if (n>ry) iter--;
			break;
		}
		else if (n==0 && iter>0) {
			iter--;
			break;
		}
		iter++;
	}
	scroll_num=0;
	jump_to_line(iter);
	render({},30);
}//»
const get_folded_lines=(linesarg, add_i, is_init)=>{//«
	let depth = 0;
	let start_i;
	let have_open=false;
	let ret = [];
	if (!add_i) add_i=0;
	let num_lines = 0;
	for (let i=0; i < linesarg.length; i++){
		if (open_folds[i+add_i]){
			if (depth==0) {
				start_i = i;
				have_open = true;
			}
			depth++;
		}
		else if (end_folds[i+add_i]){
			if (depth>0) depth--;
		}
		if (have_open&&depth==0){
			let n = i - start_i+1;
			let nstr = n+"";
			nstr = nstr.padStart(3, " ");
			have_open = false;
			let lnstr = linesarg[start_i].replace(/\xab/,"---");
			lnstr = lnstr.replace(/\/\//,"");
			lnstr = lnstr.replace(/\/\*/,"");
			let str = ("\xd7--"+nstr+" lines: "+lnstr.regstr());
			if (str.length < w) str = str.padEnd(w,"-");
			let lnarr = str.split("");
//			lnarr.tcolor = {'0':[w, FOLDED_ROW_COLOR]};
			ret.push(lnarr);
			let arr = [];
			for (let j=0; j < n; j++) arr.push(linesarg[j+start_i].split(""));
			
			fold_lines[start_i+add_i] = arr;
			if (is_init) real_lines[add_i+num_lines++] = start_i+add_i;
		}
		else if (!have_open){
			let ln = linesarg[i];
			ret.push(ln.split(""));
			if (is_init) real_lines[add_i+num_lines++] = i+add_i;
		}
	}
	if (have_open){
		for (let i=start_i; i<linesarg.length; i++) {
			ret.push(linesarg[i].split(""));
			if (is_init) real_lines[add_i+num_lines++] = i+add_i;
		}
	}
	return ret;

}//»
const init_folds = (linesarg, add_i, is_init)=>{//«
	if (!add_i) add_i=0;
	if (is_init) {
		open_fold_nums=[];
		open_folds={};
		end_fold_nums=[];
		end_folds={};
		fold_lines={};
	}
	let len = 0;
	let have_error = false;
	for (let i=0; i < linesarg.length; i++){//«
		let ln = linesarg[i];
		if (is_init && ln.length &&  /^\xd7--/.exec(ln)){
			if (convert_markers) {
				let arr = ln.split("");
				arr[0] = "X";
				ln = arr.join("");
				linesarg[i]=ln;
			}
			else {
				init_error=`Reserved fold marker \\xd7 (\xd7) found at 0,${i}\nUse: --convert-markers to convert to X's`
				break;
			}
		}
		len += ln.length+1;
		let real_i=i+add_i;
		let ret = /\xab|\xbb/.exec(ln);
		if (ret) {
			if (is_init && ln.length > 1 && /\xab|\xbb/.exec(ln.slice(ret.index+1))) {
				open_fold_nums=[];
				open_folds={};
				end_fold_nums=[];
				end_folds={};
				fold_lines={};
				init_error = "Multiple fold meta chars found on line: "+(i+1);
				break;
//				return null;
			}
			if (ret[0]==="\xab") {
				open_folds[real_i]=1;
				open_fold_nums.push(real_i);
			}
			else {
				end_folds[real_i]=1;
				end_fold_nums.push(real_i);
			}
		}
	}//»
	if (is_init) lines = get_folded_lines(linesarg, null, true);
	return len;
}//»
const foldopen=(numarg, lnsarg, yarg)=>{//«
	delete fold_lines[numarg];
	let arr = [];
	let start_ln = real_lines[yarg];
	zlncols[start_ln]=null;
	let add_num = 0;
	let to_len;
	let marks = null;
	let ret;
	if (lnsarg.length>=4) {
		marks={};
		for (let i=1; i < lnsarg.length-1;i++) {
			let ln = lnsarg[i];
			if (ln.marks){
				let newmarks = [];
				for (let m of ln.marks) {
					let pos = ln.indexOf(m);
					if (pos>=0) {
						m.pos = pos;
						newmarks.push(m);
					}
				}
				if (newmarks.length) marks[start_ln+i]=newmarks;
			}
			arr.push(ln.join(""));
		}
		ret = get_folded_lines(arr, numarg+1);
		to_len = ret.length+2;
		ret.unshift(lnsarg[0]);
		ret.push(lnsarg[lnsarg.length-1]);
		lines.splice(yarg, 1, ...ret);
		real_lines.copyWithin(yarg+to_len-1, yarg);
	}
	else {
		lines.splice(yarg, 1, ...lnsarg);
		to_len = lnsarg.length;
		real_lines.copyWithin(yarg+to_len-1, yarg);
	}
	for (let i=0; i < to_len; i++) {
		let real_num = start_ln+add_num+i;
		real_lines[yarg+i] = real_num;
		let gotfold = fold_lines[real_num];
		if (gotfold) add_num+=gotfold.length-1;
	}
	if (marks && ret){
		for (let k in marks){
			let ln = line_from_real_line(k);
			if (ln){
				ln.marks = marks[k];
				for (let m of marks[k]){
					ln[m.pos]=m;
					m.ln =ln;
				}
			}
		}
	}
	if (toggle_hold_y!==null) {
		x = toggle_hold_x;
		y = toggle_hold_y;
	}
}//»
const foldclose=(i)=>{//«
	let depth = 1;
	let start_j=i;
	let start_ln = lines[start_j];
	let real_start_ln = real_lines[start_j];
	zlncols[real_start_ln]=null;
	let fold_len;
	let internal_fold_length = 0;
	for (let j=start_j+1; j < lines.length; j++){//«
		let real_ln = real_lines[j];
		if (fold_lines[real_ln]) continue;
		if (open_folds[real_ln]) depth++;
		else if (end_folds[real_ln]) depth--;
		if (depth==0){
			let n = j - start_j+1;
			let arr = [];
			let add_n = 0;
			for (let k=0; k < n; k++){
				let yarg = k+start_j;
				let real_num = real_lines[yarg];
				let gotlns = fold_lines[real_num];
				if (gotlns) {
					let add_len = gotlns.length-1;
					add_n+=add_len;
					arr.push(...gotlns);
					internal_fold_length+=gotlns.length-1;
					delete fold_lines[real_num];
				}
				else {
					arr.push(lines[k+start_j]);
				}
			}
			let lnstr = start_ln.join("").replace(/\xab/,"---");
			lnstr = lnstr.replace(/\/\//,"");
			lnstr = lnstr.replace(/\/\*/,"");
			let str = ("\xd7--"+(n+add_n+"").padStart(3, " ")+" lines: "+lnstr.regstr());
			if (str.length < w) str = str.padEnd(w,"-");
			let lnarr = str.split("");
			lines.splice(start_j, n, lnarr);
			fold_lines[real_start_ln] = arr;
			fold_len = arr.length-internal_fold_length;
			break;
		}
	}//»
//log(fold_len);
	if (!fold_len) return;
	real_lines.copyWithin(i+1, i+fold_len);
	y=start_j-scroll_num;
	x=0;
	if (y<0) {
		scroll_num+=y;
		y=0;
	}
	render({},33);
}//»
const foldtoggle = () =>{//«
	let num = real_lines[cy()];
	let lns = fold_lines[num];
	if (lns) {
		foldopen(num, lns, cy());
		render({},34);
		return;
	}
	let _cy = cy();

	toggle_hold_y = y;
	toggle_hold_x = x;
	if (open_fold_nums.includes(real_lines[_cy])) {
		return foldclose(_cy);
	}
	let depth = 1;
	for (let i=_cy-1; i>=0; i--) {
		num = real_lines[i];
		if (fold_lines[num]) continue;
		else if (end_fold_nums.includes(num)) depth++;
		else if (open_fold_nums.includes(num)) depth--;
		if (depth==0){
			foldclose(i);
			break;
		}
	}
}//»
const adjust_row_folds=(from, donum)=>{//«
	if (!foldmode) return;
	let new_fold_lines = {};
	open_folds = {};
	end_folds = {};
	open_fold_nums.sort(LO2HI);
	for (let i=0; i < open_fold_nums.length; i++) {
		let n = open_fold_nums[i];
		if (n < from) {
			new_fold_lines[n] = fold_lines[n];
			open_folds[n]=1;
			open_fold_nums[i] = n;
		}
		else {
			new_fold_lines[n+donum] = fold_lines[n];
			open_fold_nums[i] = n+donum;
			open_folds[n+donum]=1;
		}
	}
	fold_lines = new_fold_lines;

	end_fold_nums.sort(LO2HI);
	for (let i=0; i < end_fold_nums.length; i++) {
		let n = end_fold_nums[i];
		if (n >= from){
			end_fold_nums[i] = n+donum;
			end_folds[n+donum]=1
		}
		else {
			end_folds[n]=1
			end_fold_nums[i] = n;

		}
	}
}//»
const warn_if_folded=(mess, num)=>{//«
	if (foldmode && check_if_folded(num)){
//		let str = "TODO: Implement " + mess+"!";
//cwarn(str);
//		stat_message=str;
//		render({},35);
		return true;
	}
	return false;
}//»
const check_if_folded=(num)=>{//«
	if (!foldmode) return false;
	if (!num && num!==0) num = cy();
	return fold_lines[real_lines[num]];
}//»
const toggle_if_folded=()=>{//«
	if (foldmode && fold_lines[real_lines[cy()]]) {
		foldtoggle();
	}
}//»

/*
const toggle_fold_lines = () =>{//«

		if (foldmode) {
			lines=geteditlines();
			line_colors=[];
			x=0;
			y=0;
			scroll_num=0;
			foldmode = false;
			open_fold_nums=[];
			open_folds={};
			end_fold_nums=[];
			end_folds={};
			fold_lines={};
			real_lines = null;
			termobj.set_lines(lines, line_colors);
			render({},31);
		}
		else {
			let newlines = [];
			for (let ln of lines) newlines.push(ln.join(""));
			real_lines = new Uint16Array(16*1024);
			init_folds(newlines,null,true);
//			lines = newlines;
			line_colors=[];

			foldmode = true;
			x=0;
			y=0;
			scroll_num=0;
			termobj.set_lines(lines, line_colors);
			render({},32);
		}
};//»
*/

//»
//Cursor motion/Editing«

const do_complete=async()=>{//«

const getminsubstr = words=>{ return words.join(" ").match(/^(\w*)\w*(?: \1\w*)*$/)}
const doword=word=>{
	ln.splice(startx, len, ...word);
	x+=word.length-len;
	render({},36);
	do_syntax_timer();
};

if (!edit_insert) return;
if (x == 0) return;
if (foldmode && fold_lines[real_lines[cy()]]) return;
let ln = curln(true);
let s = ln[x-1];
if (!s.match(/\w/)) return;
for (let i=x-2; i >=0; i--){
	let c = ln[i];
	if (!c.match(/\w/)) break;
	s=`${c}${s}`;
}
let re = new RegExp("^"+s);
let all = ALL_WORDS.filter(w=>re.test(w));
if (!all.length) return stat_timer("No matches",100);
let len = s.length;
let startx = x - len;
if (all.length==1) return doword(all[0]);
let rv = getminsubstr(all);
if (rv&&rv[1]){
	let rem = rv[1].slice(s.length);
	if (rem) return printchars(rem);
}
stat(all.join(" "));
/*
stat_timer(all.join(" "),100);

no_key_mode = true;
rv = await NS.api.widgets.popkey(all);
setTimeout(()=>{no_key_mode=false;},100);
if (!rv) return;
doword(rv);
*/
};//»
const clear_nulls_from_cur_ln = () => {//«
	let ln = curln(true);
	let len = ln.length;
	let num = 0;
	for (let i = 0; i < len; i++) {
		if (ln[i] == "") {
			num++;
			ln.splice(i, 1);
			len--;
			i--;
		}
	}
	if (num) do_syntax_timer();
	stat_warn(`${num} nulls found in the line`);
};//»
const clear_nulls_from_file = () => {//«
	let num = 0;
	for (let ln of lines) {
		let len = ln.length;
		for (let i = 0; i < len; i++) {
			if (ln[i] == "") {
				num++;
				ln.splice(i, 1);
				len--;
				i--;
			}
		}
	}
	stat_warn(`${num} nulls found in the file`);
	if (num) do_syntax_timer();
};//»
const fmt=(str,opts={})=>{//«
	let{
		maxlen,
		nopad
	}=opts;
	let ret = [];
	let w = termobj.w;
	let dopad = 0;
	if (maxlen&&maxlen < w) {
		if (!nopad) dopad = Math.floor((w - maxlen)/2);
		w = maxlen;
	}

	let wordarr = str.split(/\x20+/);
	let curln = "";
	let m;
	for (let i=0; i < wordarr.length; i++){
		let w1 = wordarr[i];
		let gotlen = (curln + " " + w1).length;
// Breaking consecutive non-whitespace char strings along hyphen (-), emdash (—), and forward-slash (/)

		if (gotlen > w && (m=w1.match(/^([a-z]+[-\/\u2014])([-\/\u2014a-z]+[a-z])/i))){
			if ((curln + " " + m[1]).length < w){
				curln = curln + " " + m[1];
				w1 = m[2];
			}
		}
		gotlen = (curln + " " + w1).length;
		if (gotlen >= w){
			if (dopad) ret.push((" ".repeat(dopad))+curln);
			else ret.push(curln);
			curln = w1;
		}
		else {
			if (!curln) curln = w1;
			else curln += " " + w1;
		}
		if (i+1==wordarr.length) {
			if (dopad) ret.push((" ".repeat(dopad))+curln);
			else ret.push(curln);
		}
	}
	return ret.join("\n");
};//»
const do_justify=()=>{//«
	let holdx = x;
	let holdy = y;
	if (is_normal_mode(true)){
		let thisln = lines[cy()];
		if (!thisln.length) return;
		if (/^[\t ]+$/.test(thisln.join(""))) return;

		let start, end;
		let i = cy();
		for (;;){
			let ln = lines[i];
			if (!ln.length) {
				i++;
				break;
			}
			if (/^[\t ]+$/.test(ln.join(""))) {
				i++;
				break;
			}
			if (i===0) break;
			i--;
		}
		start = i;
		let to = lines.length;
		i = cy()+1;
		for (;;){
			let ln = lines[i];
			if (!(ln&&ln.length)) {
				i--;
				break;
			}
			if (/^[\t ]+$/.test(ln.join(""))) {
				i--;
				break;
			}
			if (i+1===to) break;
			i++;
		}
		end = i;
		if (NUM(start)&&NUM(end) && start <= end){
			visual_line_mode = true;
			seltop = start;
			selbot = end;
		}
		else return;
	}

	if (visual_line_mode) {
//YEOPIUYHG
		last_action = LAST_JUSTIFY;
		save_state();

		let last_line_null = !lines[lines.length-1][0];
		let doaddline;
		delete_lines();
		if (seltop !== cy()) doaddline=true;
		let arr = yank_buffer.data;
		let s='';
		for (let ln of arr) s+=ln.join("")+" ";
		let arr2 = fmt(s,{maxlen:WRAP_LENGTH,nopad:true}).split("\n");
		insert_lines(arr2);
		if (x>=w) x=w-1;
		if (doaddline) lines.splice(cy(), 0, [""]);
		if (!last_line_null && !lines[lines.length-1].length) lines.pop();
		y = holdy;
		render({},37);
	}
//*/

}//»
const insert_comment=()=>{//«

sescape(cancel);

stat_cb=c=>{
stat_cb=null;
xescape();
let ln = lines[cy()];
let lno = cy();
let ry = foldmode ? real_lines[lno] : lno;
let colarr = zlncols[ry];
let s,t;
const wrn=()=>{stat_warn("Already in comment");return true;};
const check_in_multi=()=>{//«
	if (colarr){
		let info = colarr._info;
		if (info && info.state && info.type=="/*") return wrn();
		let incol;
		for (let col of colarr){
			if (!col) continue;
			let pos = col[4];
			if (x < pos) continue;
			if (x >= pos && x < pos+col[0]){
				incol = col;
				break;
			}
		}
		if (incol && incol[3]=="/*") return wrn();
	}
	return false;
}//»
if(c=="s"){s="//";t="//";}
else if (c=="i"){//«
	if (check_in_multi()) return;
	s="/**/";
	t="/*";
}//»
else if (c=="m"){//«
	x=0;
	if (check_in_multi()) return;
	last_action = LAST_INS_LINES;
	save_state();
	do_enter(true);
	do_enter(true);
	do_enter(true);

	let newln0 = lines[lno];
	newln0.push("/","*");
	let ry0 = foldmode ? real_lines[lno] : lno;
	let colarr0= zlncols[ry0];
	colarr0[0]=[2, JS_COMMENT_COL, "", "/*", 0];
	colarr0._info={state:true,type:"/*"};

	let newln1 = lines[lno+1];
	let ry1 = foldmode ? real_lines[lno+1] : lno+1;
	let colarr1= zlncols[ry1];
	colarr1._info={state:true,type:"/*"};

	let newln2 = ["*","/"]
	lines[lno+2] = newln2;
	let ry2 = foldmode ? real_lines[lno+2] : lno+2;
	let colarr2=zlncols[ry2];
	colarr2[0]=[2, JS_COMMENT_COL, "", "/*", 0];
	colarr2._info={state:true,type:"/*",end:2};

	y++;
	render({},38);
	return;
}//»
if(!(s&&t)) return;
last_action = LAST_CH;
save_state();
ln.splice(x, 0, ...(s));
colarr[x]=[s.length, JS_COMMENT_COL, "", t, x];
x+=2;
render({},39);
};

};//»
const await_fold_command=()=>{//«
	sescape(cancel);
	stat_cb=c=>{
		stat_cb=null;
		xescape();
		if (c=="m"){
			last_pos={x:x, y: realnum(y+scroll_num)};
			x=0;
			do_fold_all();
		}
		else if (c=="o"){
			let diff = realy()-y;
			scroll_num+=diff;
			unfold_all();
		}
		render({},40);

	};
}//»
const insert_quote=()=>{//«
	const map={s:"'",d:'"',b:"`"};
	sescape(cancel);
	stat_cb=c=>{
		stat_cb=null;
		xescape();
		let got = map[c];
		if (got){
			last_action = LAST_CH;
			save_state();
			let ln = lines[cy()];
			ln.splice(x, 0, ...(got+got));
			insert_quote_color(x, got);
			x+=1;
		}
		render({},41);
	};
};//»
const insert_kw=()=>{//«
	const map={
		l:"let",
		c:"const",
		f:"function"
	};
	sescape(cancel);
	stat_cb=c=>{
		stat_cb=null;
		xescape();
		let got = map[c];
		if (got){
			last_action = LAST_CH;
			save_state();
			let ln = lines[cy()];
			ln.splice(x, 0, ...(got+" "));
			insert_word_color(x, got);
			x+=got.length+1;
		}
		render({},42);
	};
}//»
const jump_to_line=(which)=>{//«
	let goty = cy();
	if (goty > which) {
		if (which >= scroll_num){
			y = which - scroll_num;
		}
		else {
			y=0;
			scroll_num = which;
		}
	}
	else if (goty < which){
		let endscry = scroll_num + h - 1;
		if (which < endscry) y+=(which-goty);
		else {
			y=h-2;
			scroll_num = which - h + 2;
		}
	}
};//»
const adjust_cursor=()=>{//«
	let ln = curln();
	let usex;
	if (last_updown) usex = scroll_hold_x;
	else usex = x;
	if (usex > ln.length) x = ln.length;
	else x = usex;
}//»
const insert_cut_buffer=()=>{//«
//	if (!edit_insert) return;
	if (visual_line_mode) return;
	if (!(is_normal_mode()||edit_insert)) return;
	insert_lines(cut_buffer);
	render({},43);
}//»
const set_screeny=(num,id)=>{//«
	if (num < 0) return;
	let donum = (num>scroll_num)?scroll_num:num;
	scroll_num-=donum;
	y+=donum;
};//»
const insert_lines = (linesarg, if_from_pretty)=>{//«
	if (edit_insert||is_normal_mode()) {
		let fromy=cy();
		let ry=realy();
		let scry=y;
		let newlines = [];
		for (let ln of linesarg)newlines.push(ln.split(""));
		let n=0;
//XXX DOWUTHERE???
//		if (!lines[cy()].length) n=1;
		let donum = newlines.length-n;
		if (donum && foldmode) adjust_row_folds(realy(), donum);
		lines.splice(cy(),n,...newlines);
		if (donum && foldmode) {
			let realstart = real_lines[fromy]+1;
			real_lines.copyWithin(fromy+donum, fromy);
			let iter=0;
			let tonum = fromy+donum;
			for (let i=fromy+1; i < tonum;i++,iter++) real_lines[i]=realstart+iter;
			for (let i=tonum; i < lines.length; i++) real_lines[i]+=donum;
		}
		if (if_from_pretty) donum--;
	}
	else if (stat_input_mode){
		let ln = linesarg[0];
if (linesarg.length > 1){
cwarn("Ignoring: " + (linesarg.length-1) + "  lines in stat_input_mode!");
}
		stat_com_arr.splice(x, 0, ...ln);
		x+=ln.length;
		vim.x=x;
	}
}
this.insert_lines = insert_lines;
//»
const linecopy=(if_kill)=>{//«
	if (visual_line_mode) return;
	if (is_normal_mode() || edit_insert){}
	else return;
	if (!edit_cut_continue) cut_buffer = [];
	if (warn_if_folded("line kill/copy on folds")) return;

	let ln = lines[cy()];
	if (!(ln&&ln.slice)) return;

	if (cut_to_end) cut_buffer.push(ln.slice(x).join(""));
	else cut_buffer.push(ln.slice(0).join(""));
	edit_cut_continue = true;
	if (if_kill) {
		let ry = realy();
/*
		if (!cut_to_end||x===0) {
			let arr = lines.splice(cy(), 1);
			if (foldmode) {
				adjust_row_folds(realy(), -1);
				let usey = cy();
				real_lines.copyWithin(usey, usey+1);
				for (let i=usey; i < lines.length; i++) real_lines[i]-=1;
			}
		}
*/
//		else {
		let arr = ln.slice(x);
		let usex = x +arr.length;
		lines[y+scroll_num] = ln.slice(0, x);	
		if (!cut_to_end) creturn();
//		}
		render({},44);
		dirty_flag = true;
		termobj.is_dirty = true;
	}
	else {
		creturn();
	}
}//»
const do_delete_lines=(from_or_num, to, if_copy)=>{//«
	let from;
	let donum;
	if (!to && to!==0){
		donum = from_or_num;
		from = cy();
		to = lines.length;
	}
	else {
		from = line_num_from_real_line_num(from_or_num);
		to = line_num_from_real_line_num(to);
	}
	let arr = [];
	let folddiff=0;
	let didrealllines=0;
	let numfolds=0;
	for (let i=from; i <= to; i++){
		let realy = foldmode ? real_lines[i] : i;
		let gotfold = fold_lines[realy];
		if (gotfold) {
			numfolds++;
			folddiff+=gotfold.length-1;
			arr.push(...gotfold);
			if (!if_copy) {
				delete fold_lines[realy];
				delete open_folds[realy];
				open_fold_nums.splice(open_fold_nums.indexOf(realy), 1);
				delete end_folds[realy+gotfold.length];
				end_fold_nums.splice(end_fold_nums.indexOf(realy+gotfold.length-1), 1);
			}
			didrealllines++;
		}
		else {
			arr.push(lines[i].slice());
			didrealllines++;
		}
		if (donum) {
			if (arr.length == donum) {
				to = i;
				break;
			}
			else if (arr.length > donum){
throw new Error("We needed to exactly get a  certain number of lines ("+donum+"), but we seem to have exceeded that amount because arr.length=" + arr.length+" this error condition must be related to a fold issue!");
			}
		}
	}
	if (!if_copy) {
		lines.splice(from, didrealllines);
		if (foldmode){
			let diff = (to+1)-from;
			if (folddiff) diff+=folddiff;
			adjust_row_folds(realnum(from), -diff);
			real_lines.copyWithin(from, to+1);
			for (let i=from; i < lines.length; i++) real_lines[i]-=diff;
			
		}
	}
	return arr;
};//»
const do_delete_marker=(xarg,mark,toparg,botarg,left,right,if_copy)=>{//«
//const do_delete_marker=(xarg,mark,toparg,botarg,left,right,if_copy,noarg,if_down)=>{
	let top = line_num_from_real_line_num(toparg);
	let bot = line_num_from_real_line_num(botarg);
	let arr=[];
	let got;
	let ln;
	let fromx;
	let nlines = 0;
	if (top==bot){
		ln = lines[top];
		if (if_copy) got = ln.slice(left,right);
		else got = ln.splice(left, right-left);
		fromx=xarg=left;
		arr.push([...got]);
		x = mark < xarg?mark:xarg;
	}
	else {//«
		nlines = 1;
		let toppart;
		let botpart;
		let iter=0;
		let useleft, useright;
		let idiff=0;
		for (let i = top; i <= bot; i++){
iter++;
if (iter==1000) {
	cerr("INIFINITE");
	break;
}
			ln = lines[i];
			let is_splice=false;
			if (i>top && i<bot){
				arr.push(ln);
				nlines++;
				if (!if_copy) {
					lines.splice(i, 1);
					i--;
					bot--;
					idiff++;
				}
				useleft=0;
			}
			else {
				if (i == top){
					useright = ln.length-1;
//					if (if_down) useleft = mark;
//					else useleft = ((i+idiff)==cy())?xarg:mark;
					useleft = ((i+idiff)==cy())?xarg:mark;
					fromx = useleft;
				}
				else if (i == bot){
					useleft = 0;
//					if (if_down) useright = xarg;
//					else useright = ((i+idiff)==cy())?xarg:mark;
					useright = ((i+idiff)==cy())?xarg:mark;
				}
				else throw new Error("SMuth Gogogorototot");
				if (if_copy) got = ln.slice(useleft,useright+1);
				else {
					got = ln.splice(useleft, useright-useleft+1);
				}
				arr.push([...got]);
			}
		}
		if (!if_copy) {
			x=useleft;
/*
At this point, top+1 is the end.
*/
//jlog(lines[top]);
//log(lines[top+1]);
/*
Here, lines[top+1] can still have some extra stuff in front when we are doing this automatically 
through yank_buffer
*/
			lines[top] = lines[top].concat(lines[top+1]);
//			lines[top] = lines[top].concat(lines[top+1].slice(xarg+1));
			lines.splice(top+1,1);
		}
	}//»
	if (!if_copy&&foldmode&&nlines){
		adjust_row_folds(realnum(top), -nlines);
		real_lines.copyWithin(top, top+nlines);
		for (let i=top; i < lines.length; i++) real_lines[i]-=nlines;
	}
	return [arr,fromx,nlines];

}//»
const do_delete_block=(top,bot,left,right,if_copy)=>{//«
	let arr=[];
	let usetop = line_num_from_real_line_num(top);
	let usebot = line_num_from_real_line_num(bot);
	let got;
	let want_len = right-left+1;
	for (let i=usetop; i <= usebot; i++){
		let ln = lines[i];
		if (if_copy) got = ln.slice(left,right+1);
		else got = ln.splice(left, right-left+1);
		if (got.length < want_len){
			got.push(...(" ".repeat(want_len - got.length)));
		}
		arr.push(got);
	}
	return arr;
};//»
const delete_lines = (if_copy, if_justify) =>{//«
//	last_action = LAST_DEL_LINES;
	let sety=()=>{
		if (!lines.length) {
			x=0;y=0;
			return;
		}
		y=seltop-scroll_num;
		if (y<0) {
			scroll_num+=y;
			y=0;
		}
		if (cy() > lines.length-1) {
			y--;
			if (y < 0){
				scroll_num--;
				y++;
			}
		}
	};
	let realtop = realnum(seltop);
	if (visual_line_mode){
		let arr = do_delete_lines(realnum(seltop), realnum(selbot), if_copy);
		yank_buffer = new Change(CT_LNS_DEL, Date.now(),0,realtop,seltop-scroll_num,arr,[realnum(seltop),realnum(selbot),if_copy]);
		visual_line_mode = false;
		if (!if_justify) sety();
	}
	else if (visual_mode){
		let hold_x=x;
		let ret = do_delete_marker(hold_x, edit_sel_mark, realnum(seltop), realnum(selbot), selleft, selright+1, if_copy);
		yank_buffer = new Change(CT_MARK_DEL, Date.now(), ret[1],realtop,seltop-scroll_num,ret[0],[hold_x, edit_sel_mark, realnum(seltop), realnum(selbot), selleft, selright+1, if_copy, ret[2]]);
		sety();
		visual_mode = false;
	}
	else if (visual_block_mode){
		let arr = do_delete_block(realnum(seltop), realnum(selbot), selleft, selright, if_copy);
		yank_buffer = new Change(CT_BLOCK_DEL, Date.now(),selleft,realtop,seltop-scroll_num,arr,[realnum(seltop),realnum(selbot),selleft,selright,if_copy]);
		sety();
		visual_block_mode=false;
	}
	if (!lines.length) lines.push([]);
	render({},45);
};//»
const scroll_to_line=(num, if_force_newline, if_no_render, if_no_open_exact_fold_hit)=>{//«

//if (foldmode){

if (num==0) num=1;
let add_lines = 0;
let good_num;
let tonum = num-1;
if (tonum >= (foldmode ? real_lines[lines.length-1] : lines.length-1)){
	if (if_force_newline && tonum == (foldmode ? real_lines[lines.length-1]+1: lines.length)) lines.push(1);
	scroll_num = lines.length-1;
	y=0;
}
else {
	y=0;
	for (let i=0; i < lines.length-1; i++){
		let ln1 = foldmode ? real_lines[i]:i;
		let fold = fold_lines[ln1];
		if (ln1===tonum){
			scroll_num = ln1 - add_lines;
			y = 0
			if (fold&&!if_no_open_exact_fold_hit) foldtoggle();
			break;
		}
		if (fold) {
			let ln2 = foldmode ? real_lines[i+1]:i+1;
			if (tonum > ln1 && tonum < ln2) {
				scroll_num = i;
				y=0;
				foldtoggle();
			}
			else add_lines += fold.length-1;
		}
	}
}

adjust_cursor();
if (!if_no_render) render({},46);
return;

}//»
const do_enter = (no_move_cursor) =>{//«
//	last_action = LAST_ENTER;
	let arr = curln(true);
	let marks = arr.marks;
	let start_marks;
	let end_marks;
	let did_scroll_num;
	if (marks){
		for (let m of marks){
			let pos = arr.indexOf(m);
			if (pos < 0) continue;
			if (pos < x) {
				if (!start_marks) start_marks=[];
				start_marks.push(m);
			}
			else {
				if (!end_marks) end_marks=[];
				end_marks.push(m);
			}
		}
	}
	let start = arr.splice(0,x);
	let end = arr;
	start.marks=start_marks;
	end.marks=end_marks;
	let linenum = curnum();
	lines[linenum]=start;
	if (end.length) lines.splice(curnum(1), 0, end);
	else {
		lines.splice(curnum(1), 0, [""]);
	}

	x = 0;
	y++;
	if (y+num_stat_lines == h) {
		scroll_num++;
		y--;
		did_scroll_num=1;
	}
	let rno, rno_1;
	if (foldmode) {
		real_lines.copyWithin(cy()+1, cy());
		for (let i=cy()+1; i < lines.length; i++) {
			real_lines[i]+=1;
		}
		let llen = lines.length;
		if (llen > 1 && cy()+1==llen && !real_lines[llen-1]) real_lines[llen-1] = real_lines[llen-2]+1;
		if (start.includes("\xbb")||start.includes("\xab")) adjust_row_folds(realy(0), 1);
		else adjust_row_folds(realy(-1), 1);
		rno = real_lines[linenum];
		rno_1 = real_lines[linenum+1];
	}
	else {
		rno =linenum;
		rno_1 = linenum+1;
	}

	if (!start.length){
		zlncols.splice(rno, 0, []);
	}
	else if (end.length) {
		let cobj = zlncols[rno]||[];
		let len = start.length;
		let keys = Object.keys(cobj);
		let cobj1={};
		for (let k of keys){
			if (k.match(/^_/)) continue;
			let n = parseInt(k);
			if (n >= len){
				cobj1[n-len] = cobj[k];
				delete cobj[k];
			}
		}
		cobj1._info = cobj._info;
		zlncols.splice(rno_1, 0, cobj1);
	}
	else zlncols.splice(rno_1, 0, []);
	if (no_move_cursor){
		y--;
		if (did_scroll_num){
			y++;
			scroll_num--;
		}
	}
}//»
const enter=(if_ctrl)=>{//«
	if (visual_line_mode) return;

	let did_toggle=false;
	no_render=true;
	if (check_if_folded(cy())) {
		if (if_ctrl) {
			if (!lines[cy()+1]) {
				foldtoggle();
				end();
				enter(true);
				y--;
				foldtoggle();
				y++;
				no_render=false;
				return;
			}
			no_render=true;
			down();
			enter();
			up();
			no_render=false;
			return;
		}
		else {
			foldtoggle();
			did_toggle=true;
		}
	}
	else if (if_ctrl) seek_line_end()

	do_enter();
	if (did_toggle) foldtoggle();
	no_render=false;
	render({},47);
	dirty_flag = true;
	termobj.is_dirty = true;
	do_syntax_timer();
}//»
const del_mark=m=>{//«
	delete MARKS[m.mark];
	let ln = m.ln;
//log(ln);
	try {
		let pos=ln.marks.indexOf(m);
		ln.marks.splice(pos,1);
		if (!ln.marks.length) delete ln.marks;
	}catch(e){
cwarn(e);
	}
};//»
const ok_del_ch=ch=>{//«
	if (ch.mark) {
		if (if_no_del_mark) {
			stat_render("Not removing mark: " + ch.mark);
			return false;
		}
		del_mark(ch);
	}
	return true;
};//»
const check_fold_del=ch=>{//«
	let ry = realy();
	if (ch=="\xab"){
		if(open_folds[ry]){
			delete open_folds[ry];
			open_fold_nums.splice(open_fold_nums.indexOf(ry),1);
		}
	}
	else if (ch=="\xbb"){
		if(end_folds[ry]){
			delete end_folds[ry];
			end_fold_nums.splice(end_fold_nums.indexOf(ry),1);
		}
	}
};//»
const do_null_del = ()=>{//«
	let ln = curln(true);
	let usex = null;
	if (!curch() && curch(1)) usex=x;
	else if (!curch(1) && curch(2)) usex=x+1;
	else if (ln.length > x+1){
		if (!curch()||!curch(1)){
cwarn("Detected numerous nulls, doing line join and split!");
			lines[y+scroll_num] = ln.join("").split("");
			stat("Null bytes deleted");
			return;
		}
	}
	if (!NUM(usex)) return;
	let arr = ln.splice(usex, 1);
	lines[y+scroll_num] = ln.slice();
	stat("Null byte deleted");
};//»
const do_ch_del = is_change =>{//«
	let ln = curln(true);
	if (!curch()) {
		if (curch(1)) do_null_del();
		return;
	}
	let have_ch = ln[x];
	if (!ok_del_ch(have_ch)) return;
	check_fold_del(have_ch);
	let arr = ln.splice(x, 1);
	lines[y+scroll_num] = ln.slice();
	dirty_flag = true;
	termobj.is_dirty = true;
	if (is_change) {
		render({},48);
		return;
	}
	update_syntax_delch(have_ch);
};//»
const try_empty_line_del=()=>{//«
if (!curln(true).length){

last_action = LAST_BACK;
save_state();
edit_insert=true;
no_render=true;
down();
do_backspace();
edit_insert=false;
no_render=false;
render({},49);
}
};//»
const del=()=>{//«
	if (check_if_folded(cy())) return;
///*
	
//*/
	if (!edit_insert) return;
	if (visual_line_mode) seldel();
	else {
		do_ch_del();
	}
}//»
const do_backspace=is_change=>{//«
	let have_ch;
	let have_enter;
	if (foldmode){
		let ln = cy();
		if (check_if_folded(ln)) {
			if (ln > 0 && !curln(true,-1).length) {}
			else return;
		}
		else if (x == 0 && ln > 0 && warn_if_folded("backspace onto folded rows", ln-1)){
			return;
		}
	}
	if (x > 0) {//«
		let ln = curln(true);
		have_ch = ln[x-1];
		if (!ok_del_ch(have_ch)) return;
		check_fold_del(have_ch);
		x--;
		let arr = ln.splice(x, 1);
		lines[y+scroll_num] = ln;
		dirty_flag = true;
		termobj.is_dirty = true;
		update_syntax_delch(have_ch);
	}//»
	else if (y > 0||scroll_num > 0) {//«
		let ry = foldmode ? real_lines[cy()] : cy();
		if (foldmode) {
			if (open_folds[ry]||end_folds[ry]){
				let ry2 = real_lines[cy()-1];
				if (open_folds[ry2]||end_folds[ry2]){
					return;
				}
			}
		}
		if (y > 0) y--;
		else scroll_num--;
		let lno = y+scroll_num;
		let rno = foldmode ? real_lines[lno]:lno;
		let rno_1 = foldmode ? real_lines[lno+1]:lno+1;
		have_enter = true;
		if (foldmode) adjust_row_folds(realy(), -1);
		let thisln = curln(true);
		let curln_1 = curln(true,1);
		let thisln_marks = thisln.marks;
		let curln_1_marks = curln_1.marks;
		lines[lno] = thisln.concat(curln_1);
		if (thisln_marks || curln_1_marks) {
			let marks = (thisln_marks||[]).concat(curln_1_marks||[]);
			let ln = lines[y+scroll_num];
			for (let m of marks) m.ln=ln;
			ln.marks=marks;
		}
		lines.splice(y+scroll_num+1, 1);

		let len = thisln.length;

		let cobj = zlncols[rno] || [];
		let cobj1 = zlncols[rno_1] || [];

/*XXX BUG

util.vim.js:2567 Uncaught TypeError: Cannot convert undefined or null to object
    at Function.keys (<anonymous>)
    at do_backspace (filesystem:http://127.0.0.1:8080/temporary/default/runtime/mods/util.vim.js:2567:22)
    at backspace (filesystem:http://127.0.0.1:8080/temporary/default/runtime/mods/util.vim.js:2606:2)
    at window.<computed>.mods.util.vim.key_handler (filesystem:http://127.0.0.1:8080/temporary/default/runtime/mods/util.vim.js:4107:8)
    at handle (filesystem:http://127.0.0.1:8080/temporary/default/runtime/apps/sys.Terminal.js:2894:33)
    at window.<computed>.apps.sys.Terminal.onkeydown (filesystem:http://127.0.0.1:8080/temporary/default/runtime/apps/sys.Terminal.js:2899:1)
    at HTMLDocument.dokeydown (filesystem:http://127.0.0.1:8080/temporary/default/runtime/mods/sys.desk.js:3019:32)
*/

		let keys1 = Object.keys(cobj1);
//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

		for (let k of keys1){
			if(k.match(/^_/))continue;
			let n = parseInt(k);
			cobj[n+len+""] = cobj1[k];
		}


/*XXX BUG!!!
util.vim.js:2566 Uncaught TypeError: Cannot set property '_info' of undefined
do_backspace @ util.vim.js:2566
undo_enter_ins @ util.vim.js:3376
key_handler @ util.vim.js:3837
handle @ sys.Terminal.js:2894
onkeypress @ sys.Terminal.js:2902
dokeypress @ sys.desk.js:3025
*/
		cobj._info = cobj1._info;

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

		zlncols.splice(rno_1,1);
		x = len;
		dirty_flag = true;
		termobj.is_dirty = true;
		if (foldmode){
			real_lines.copyWithin(cy(), cy()+1);
			for (let i=cy(); i < lines.length; i++) real_lines[i]-=1;
		}
	}//»
	if (is_change) return;
	render({},50);
};//»
const backspace=()=>{//«
	if (is_normal_mode())return try_empty_line_del();
	if (!edit_insert) return;
	do_backspace();
}//»
const left=(if_ctrl)=>{//«
	if (if_ctrl) {
		let addi=0;
		for (let i=0;;i--) {
			let ch1 = curch(i-2);
			let ch2 = curch(i-1);
			if (!ch2) break;
			if ((ch1===" "||ch1==="\t")&&(ch2!==" "&&ch2!=="\t")) break;
			addi++;
			if (x-addi <= 0) {
				break;
			}
		}
		x-=addi+1;
		if (x<0) x=0;
		set_sel_mark();
		render({},51);
		return;
	}
	if (x > 0) {
		x--;
	}
	else {
		if (!edit_insert) return;
		if (y > 0) {
			if (!up_one_line(true)) return;
			y--;
		}
		else if (scroll_num > 0) {
			if (!up_one_line(true)) return;
			scroll_num--;
		}
	}
	set_sel_mark();
	render({},52);
}//»
const right = (if_ctrl)=>{//«
	toggle_if_folded();
	if (if_ctrl) {
		if (!curch()) return;
		let addi=0;
		for (let i=1;;i++) {
			let ch1 = curch(i-1);
			let ch2 = curch(i);
			if (!ch2) break;
			if ((ch1===" "||ch1==="\t")&&(ch2!==" "&&ch2!=="\t")) break;
			addi++;
		}
		x+=addi+1;
		set_sel_mark();
		render({},53);
		return;
	}
	if (edit_insert){
		if (curch(1)||curch()) {
			x++;
			render({},54);
		}
	}
	else if (!curch(1)) return;
	else {
		x++;
		set_sel_mark();
		render({},54);
		return;
	}

}//»
const home=()=>{//«
	y = scroll_num = 0;
	adjust_cursor();
	set_sel_end();
	render({},55);
}//»
const end=()=>{//«
	scroll_num = lines.length - h + num_stat_lines;
	if (scroll_num < 0) scroll_num = 0;
	y = lines.length-1-scroll_num;
	adjust_cursor();
	set_sel_end();
	render({},56);
}//»
const pgup=()=>{//«
	if (scroll_num == 0) {
		if (y > 0) {
			y = 0;
			adjust_cursor();
			set_sel_end();
			render({},57);
		}
		return;
	}
	let donum;
	if (scroll_num - h > 0) {
		donum = h;
		scroll_num -= h;
	}
	else scroll_num = 0;
	adjust_cursor();
	set_sel_end();
	render({},58);
}//»
const pgdn=()=>{//«
	let donum = h - num_stat_lines;
	if (scroll_num + donum >= lines.length) {
		if (scroll_num + y < lines.length-1) {
			y = lines.length-1-scroll_num;
			adjust_cursor();
			set_sel_end();
			render({},59);
		}
		return;
	}
	scroll_num += donum;
	if (scroll_num + h - num_stat_lines > lines.length) {
		scroll_num = lines.length - h + num_stat_lines;
		if (scroll_num < 0) scroll_num = 0;
	}
	adjust_cursor();
	set_sel_end();
	render({},60);
}//»
const check_visual_up = () =>{//«
	if ((visual_mode||visual_block_mode) && foldmode && cy() > 0){
		let ry = foldmode ? real_lines[cy()-1] : cy()-1;
		if (open_folds[ry]||end_folds[ry]) return stat_render("Marker detected in foldmode");
	}
	return true;
};//»
const check_visual_motion=if_down=>{//«
	if ((visual_mode||visual_block_mode) && foldmode && ((if_down && cy() < lines.length-1)||(!if_down && cy()>0))){
		let add_1;
		if (if_down) add_1=1;
		else add_1 = -1;
		let ry = real_lines[cy()+add_1];
		if (open_folds[ry]||end_folds[ry]) return stat_render("Marker detected in foldmode");
	}
	return true;
};//»
const up_one_line=(if_seek_end)=>{//«
	let _y = cy();
	let ln = lines[_y-1];
	if (!ln) {
		if (y>0) return true;
		return false;
	}
	if (!check_visual_motion(false)) return;
//log(2);
//log("????",!!check_if_folded());
	let usex = scroll_hold_x;
	if (if_seek_end) x = ln.length;
	else if (usex > ln.length) {
		if (edit_insert) x = ln.length;
		else if (ln.length) x = ln.length-1;
		else x=0;
	}
	else x = usex;
	if (x==-1) x=0;
	return true;
}//»
const up=()=>{//«
	if (y > 0) {
		if (!up_one_line()) return;
		y--;
		if (check_if_folded()) x=0;
		set_sel_end();
		render({},61);
	}
	else if (scroll_num > 0) {
		if (!up_one_line()) return;
		scroll_num--;
		if (check_if_folded()) x=0;
		set_sel_end();
		render({},62);
	}
}//»
const down=()=>{//«
	if (y + scroll_num < lines.length-1) {
		if (!check_visual_motion(true)) return;
		let ln = lines[y + scroll_num + 1];
		if (y+num_stat_lines < h-1) y++;
		else scroll_num++;
		let usex = scroll_hold_x;
		if (check_if_folded()) x=0;
		else if (usex > ln.length) {
			if (edit_insert) x = ln.length;
			else if (ln.length) x = ln.length-1;
			else x=0;
		}
		else x = usex;
		set_sel_end();
		render({},63);
	}
	else {
		let ln = lines[cy()];
		if (!ln){
//			reinit_warning("1B");
			return false;
		}
		if (!check_visual_motion(true)) return;
		if (!ln.length) return true;
		if (ln[0]==="") return true;
		if (!edit_emulate_nano_down) return true;

		lines.push([]);
		x=0;
		y++;
		if (y+num_stat_lines == h) {
			scroll_num++;
			y--;
		}
		set_sel_end();
		render({},64);
	}
	return true;
}//»

//»
//Command mode/Saving«

const load_state=()=>{//«
	let state = states[state_iter];
	open_fold_nums=state.open_fold_nums;
	open_folds=state.open_folds;
	end_fold_nums=state.end_fold_nums;
	end_folds=state.end_folds;
	lines = [];
	line_colors=[];
	termobj.set_lines(lines, line_colors);
	zlncols=[];
	let lns = state.lines.split("\n");
	lns.pop();
	for (let ln of lns) lines.push(ln.split(""));
if (foldmode) {
	let reals=state.real_lines;
	let len = reals.length;
	for (let i=0; i < len; i++) real_lines[i]=reals[i]
	fold_lines={};
	let folds = state.folds;
	for (let k in folds){
		let a = folds[k].split("\n");
		a.pop();
		let arr = [];
		for (let ln of a) arr.push(ln.split(""));
		fold_lines[k] = arr;
	}
}
	x = state.x;
	y = state.y;
	scroll_num = state.scr;

	render({},65);
};//»
const save_state = (if_undo)=>{//«
/*
Given the first repeat of an action type, I just want to remove the original state
*/
//	if (if_undo && skipped_save){
	if (if_undo && last_action){

	}
	else if (last_action_hold && last_action_hold === last_action) {
//		skipped_save = true;
		return;
	}
	last_action_hold = last_action;

	let lns='';
	for (let ln of lines) lns += ln.join("")+"\n";
	let obj = {};
	let str;
	let reals = [];
	if (foldmode) {
		let keys = fold_lines._keys;
		for (let k of keys){
			let fold = fold_lines[k];
			if (!fold) continue;
			let s='';
			for (let ln of fold) s += ln.join("")+"\n";
			obj[k]=s;
		}
		for (let i=0; i < real_lines.length; i++){
			let n = real_lines[i];
			if (i>0&&!n) break;
			reals.push(n);
		}
	}

	let out = {
		x:x,
		y:y,
		scr:scroll_num
	};
	out.lines=lns;
	if (foldmode) {
		out.folds=obj;
		out.open_fold_nums=open_fold_nums;
		out.open_folds=open_folds;
		out.end_fold_nums=end_fold_nums;
		out.end_folds=end_folds;
		out.real_lines = reals;
	}

	out.time=Date.now();
	if (state_iter!=states.length-1) {
//log("!!!");
if (states.length) {
//cwarn("OUTOFSEQUENCE?", state_iter, states.length-1);
stat_warn(`Popping ${states.length-1-state_iter} states`);
cwarn(`Popping ${states.length-1-state_iter} states`);
states=states.slice(0, state_iter+1);
//log("INSEQUENCE?", state_iter, states.length-1);
}
	}
	states.push(out);
	state_iter=states.length-1;
//POLKEYUTO
//	check_memory();
//	last_action = null;
};//»
const do_history_arrow=sym=>{//«
let hist;
let sim = stat_input_mode;
if (sim==":") hist = this.command_history;
else if (sim=="?"||sim=="/") hist = this.search_history;
if (!hist) return;
if (sym=="UP_") hist_iter++;
else hist_iter--;
if (hist_iter<0) {
	hist_iter=0;
	return;
}
else if (hist_iter>hist.length){
	hist_iter = hist.length;
	return;
}
if (hist_iter==0){
	stat_com_arr=[];
	x=0;
}
else{
	stat_com_arr = hist[hist_iter-1].split("");
	x=stat_com_arr.length;
}
}//»
const init_stat_input=which=>{//«
	stat_com_arr=[];
	x_hold = x;
	x=0;
	stat_input_mode = which;
	vim.stat_input_mode = stat_input_mode;
	let hold_escape = cur_escape_handler;
	sescape(()=>{
		if (hold_escape) hold_escape();
		render({},66);
	});
	render({},67);
};//»
const get_confirmation = (lno, ind, len, out)=>{//«
	return new Promise((y,n)=>{
		stat_cb = (ch)=>{
			if (ch=="q") {
				stat_cb = null;
				return y();
			}
			else if (ch=="n") return y(false);
			else if (ch=="y") y(true);
		};
		visual_block_mode = true;
		let scrin = scroll_num;
		if(cy()!=lno) scroll_to_line(lno+1);
		edit_sel_start=seltop=selbot=lno;
		selleft=ind;
		selright=ind+len-1;
		stat_message = `replace with ${out} (y/n/q)?`;
		render({noCursor:true}, 68);
		visual_block_mode = false;
	});
};//»
const search_and_replace = async(arr, if_entire_file) =>{//«
	let pat=[];
	let sub=[];
	let mods=[];
	let ch, ch1;
	let fail = false;
	let have_sub = false;
	let have_pat = false;
	let ok_mods=["c","g","i"];
	for (let i=0; i<arr.length; i++){
		ch = arr[i];
		ch1 = arr[i+1];
		if (ch=="\\"){
			if (!ch1){
				fail = true;
				break;
			}
			if (!have_sub)pat.push({esc:ch1});
			else sub.push({esc:ch1});
			i++;
		}
		else if (ch=="/"){
			if (!have_sub) have_sub = true;
			else if (!have_pat) have_pat = true;
			else {
				fail = true;
				break;
			}
		}
		else if (!have_sub) pat.push(ch);
		else if (!have_pat) sub.push(ch);
		else {
			if (!ok_mods.includes(ch)){
				fail = true;
				break;
			}
			mods.push(ch);
		}
	}
	if (!(have_sub&&have_pat)) fail = true;
	if (fail) return stat_err("Invalid pattern");

	let pat_re="";
	for (let c of pat){
		if (c.esc) pat_re+="\\"+c.esc;
		else pat_re+=c;
	}

	let sub_re="";
	for (let c of sub){
		if (c.esc) sub_re+="\\"+c.esc;
		else sub_re+=c;
	}
	let re;
	let base_re;
	let modstr="";
	let is_global;
	let is_confirming;	
	if (mods.includes("c")) is_confirming = true;
	if (mods.includes("g")) {
		is_global = true;
//		if (is_confirming) modstr="y";
//		else modstr = "g";
		modstr = "g";
	}
	if (mods.includes("i")) modstr+="i";
	try {
		if (modstr) {
			re = new RegExp(pat_re, modstr);
			base_re = new RegExp(pat_re);
		}
		else  re = new RegExp(pat_re);
	}
	catch(e){
		cerr(e);
		stat_err(e.message);
		return;
	}

	last_action = LAST_SEARCH_REPLACE;
	save_state();
	let iter=0;
	if (if_entire_file||visual_line_mode) {
		let from,to;
		if (if_entire_file){
			from = 0;
			to = lines.length;
		}
		else{
			from = seltop;
			to = selbot+1;
			visual_line_mode = false;
		}

		for (let i=from; i < to; i++){
			let ri = realnum(i);
//log(ri, open_folds);
//			if (open_folds[ri]) {
			if (open_folds[ri]) {
				let lns = fold_lines[ri];
				if (!lns) continue;
				to+=lns.length-1;
				foldopen(ri, lns, i);
				i+=lns.length;
			}
		}

//log(re);
		for (let i=from; i < to; i++){
			if (foldmode && fold_lines[realnum(i)]) continue;
			let ln = lines[i].join("");
			let match;
//log(ln);
			while (match = re.exec(ln)){
				iter++;
				if (iter>=10000){cerr("INFINITE LOOP?");break;}
				let len1;
				if (is_confirming) {
					let rv = await get_confirmation(i, match.index, match[0].length, sub_re);
					if (rv===false) {
						if (!is_global) break;
						else continue;
					}
					else if (!rv) break;
//					re.lastIndex--;
 					len1 = ln.length;
				}
				if (base_re) ln = ln.replace(base_re, sub_re);
				else ln = ln.replace(re, sub_re);
				lines[i]=[...ln];
//				if (!(is_global&&is_confirming)) break;
				if (!is_global) break;
				else {
					re.lastIndex+=(ln.length-len1);
				}
			}
		}
	}
	else{
		let ln = curln();
		let match;
		while (match = re.exec(ln)){
			iter++;if (iter>=10000){cerr("INFINITE LOOP?");break;}
			let i = cy();
			let len1;
			if (is_confirming) {
				let rv = await get_confirmation(i, match.index, match[0].length, sub_re);
				if (rv===false) continue;
				else if (!rv) break;
				re.lastIndex--;
				len1 = ln.length;
			}
			let old = ln;
			if (base_re) ln = ln.replace(base_re, sub_re);
			else ln = ln.replace(re, sub_re);
//			ln = ln.replace(re, sub_re);
			lines[i]=[...ln];
			if (!(is_global&&is_confirming)) break;
			else re.lastIndex+=ln.length-len1;
		}
	}
	stat_cb = null;
//	render({},69);
	do_syntax_timer();
};//»
const do_scroll_search=(if_start)=>{//«
	line_colors.splice(0, line_colors.length);
	if (if_start && foldmode){
		stat_message = "Not searching inside folds!";
		stat_message_type=STAT_NONE;
	};
	let strlen = scroll_search_str.length;
	let arr = [];
	let metas = [".","*","+","?","[","(","{","/","^","$","\\"];
	for (let ch of scroll_search_str.split("")) {
		if (metas.includes(ch)) ch = "\\"+ch;
		arr.push(ch);
	}
	let usestr=arr.join("");

	let re;
	usestr = usestr.replace(/\)/g,"\\)");
	usestr = usestr.replace(/\]/g,"\\]");
	try {
		re = new RegExp(usestr,"g");
	}
	catch(e){
cerr(e);
return;
	}

	const gotmatch=(num, xoff)=>{//«
		let ln = lines[num];
		if (!ln) return false;
		if (foldmode && fold_lines[real_lines[num]]) return false;
		let line_str = ln.join("").slice(xoff);
		let marr = (new RegExp(usestr)).exec(line_str);
		if (marr===null) return false;

		let obj = line_colors[num];
		if (!obj) obj = {};
		obj[marr.index+xoff]=[strlen, "black", "#ccc"];
		x = marr.index+xoff;
		line_colors[num] = obj;
		return true;
	};//»

	let i=y+scroll_num;
	let donum = 0;
	let did_get_match = false;
	let xoff=x;
	if (!if_start) xoff++;
	if (scroll_search_dir=="/") {//«
		for (; i < lines.length; i++) {
			if (!lines[i]) break;
			if (gotmatch(i, xoff)) {
				did_get_match = true;
				scroll_num+=donum;
				render({noCursor:true}, 70);
				return;
			}
			donum++;
			xoff=0;
		}
	}//»
	else {//«
		for (; i >= 0; i--) {
			if (gotmatch(i, xoff)) {
				did_get_match = true;
				scroll_num+=donum;
				if (scroll_num<0) {
					y+=scroll_num;
					scroll_num=0;
				}
				render({noCursor:true}, 71);
				return;
			}
			donum--;
			xoff=0;
		}
	}//»
	if (if_start||scroll_pattern_not_found) {
		stat_message = "Pattern not found";
		scroll_pattern_not_found = true;
		render({},72);
	}
	else {
//		stat_message = "No more matches";
		stat_message = "Search wrapped";
		if (scroll_search_dir=="/"){
			scroll_num=0;
			y=0;
			x=0;
			do_scroll_search();
		}
		else{
			scroll_num=0;
			x=0;
			y=lines.length-1;
			do_scroll_search();
		}
	}
}//»
const detect_fold_error=arrarg=>{//«
	let arr;
	if (!arrarg) arr = get_edit_save_arr();
	else arr = arrarg;
	let val = arr[0];
	let lnarr = val.split("\n");
	for (let i=0;i < lnarr.length; i++){
		let ln = lnarr[i];
		if (ln.match(/^\xd7--/)){
console.error("Fold error detected, line: ", i);
			return true;
		}
	}
	return false;
};//»
const do_edit_saveloop=()=>{//«

editsave_interval = setInterval(()=>{
	if (dirty_flag) editsave(true);
}, EDITSAVE_LOOP_MS);

};//»
const editsave=async(if_nostat)=>{//«

const write_cb_func = async(ret, err_or_pos, reallenret)=>{//«
	if (ret) {
		if (!edit_fobj){
			edit_fobj = ret;
			edit_fobj.lockFile();
		}
		if (Desk) Desk.make_icon_if_new(ret);
		if (splice_mode) splice_end = splice_start + reallenret;
		if (!if_nostat) stat_message = `${edit_fname} ${numlines}L, ${err_or_pos}C written`;
		dirty_flag = false;
		termobj.is_dirty = false;
	}
	else stat_message = err_or_pos || "The file could not be saved";
	render({},73);
};//»

	let arr = get_edit_save_arr();
//log(arr);
	if (detect_fold_error(arr)) {
		stat_warn("Fold error!");
		return;
	}
	let val = arr[0];
	let numlines = arr[1];
	let opts={retArr: true};
	if (splice_mode){
		opts.spliceStart = splice_start;
		opts.spliceEnd = splice_end;
	}

	let usepath = edit_fullpath;

	let OK_TYPES=[FS_TYPE];
	if (!OK_TYPES.includes(edit_ftype)){
		stat_message = "Invalid file system type: " + edit_ftype;
		render({},80);
		return;
	}

	let rv;
	if (edit_ftype==FS_TYPE) rv = await fsapi.saveFsByPath(usepath, val, opts);
	else{
cerr(`WHAT EDIT_FTYPE: ${edit_ftype}!?!?!??!`);
return;
	}
	
	if (rv) write_cb_func(rv[0], rv[1], rv[2]);
	else write_cb_func();

//	fs.save_fs_by_path(usepath, val, write_cb_func, opts);
}
//»
const handle_edit_input_tab = (if_ctrl)=>{//«
	if (if_ctrl) num_completion_tabs = 0;
	let gotpath = stat_com_arr.join("").trim();
	let usedir, usename;
	if(!num_completion_tabs) {
		if (gotpath.match(/^\//)){
			let arr = gotpath.split("/");
			usename = arr.pop();
			usedir = ("/"+arr.join("/")).regpath();
		}
		else if (gotpath.match(/^~\//)){
			let arr = gotpath.split("/");
			arr.shift();
			usename = arr.pop();
			usedir = (globals.home_path+arr.join("/")).regpath();
			gotpath = gotpath.replace(/^~/, globals.home_path);
		}
		else if (gotpath.match(/\//)){
			let arr = gotpath.split("/");
			usename = arr.pop();
			usedir = cur_dir+"/"+arr.join("/");
		}
		else {
			usedir = cur_dir;
			usename = gotpath;
		}
		if (!usename)usename="";
		stat_com_x_hold = x;
		cur_completion_str = gotpath;
		cur_completion_name = usename;
		cur_completion_dir = usedir;
	}
	get_dir_contents(cur_completion_dir, cur_completion_name, rv=>{
		if (!rv.length) return;
		let dump = "";
		for (let a of rv){
			let f = a[0];
			if (a[1]=="Folder") f = f+"/";
			dump = dump + f +"  ";
		}
//console.log("Completes:\n"+dump);
		let which = rv[num_completion_tabs%rv.length];
		let str = which[0].slice(cur_completion_name.length);
		if (which[1]=="Folder") str=str+"/";
		stat_com_arr=(cur_completion_str+str).split("");
		x=stat_com_arr.length;
		render({},81);
	});
	num_completion_tabs++;
	return;
};//»
const handle_edit_input_enter = async()=> {//«
let mode = stat_input_mode;
let com = stat_com_arr.join("").trim();

stop_stat_input();
if (mode=="Save As: ") {//«
let err=s=>{
	stat_message = s;
	x = vim.hold_x;
	render({},82);
};
let name = com;
if (!name.match(/^[-/a-z0-9_~.]+$/i)) {
	stat_message = "Invalid characters in the name (want /^[-/a-z0-9_~.]$/i)";
	render({},83);
	return;
}

name = name.replace(/^~\//, globals.home_path+"/");
let path = capi.normPath(name, cur_dir);
let arr = path.split("/");
let fname = arr.pop();
let pardir = arr.join("/");
if (!pardir) pardir = "/";
if (!fname) return err("No file name given");

let parobj = await fsapi.pathToNode(pardir);
if (!parobj) return err(pardir+": directory not found");
let rtype;
let rootobj;
let checkok = () =>{
	rtype = rootobj.type;
	if (rtype!=FS_TYPE) return "Cannot create file type: " + rootobj.type;
	if (!fs.check_fs_dir_perm(parobj,is_root)) return "Permission denied: " + fname;
	return true;
};  
let ok=ifnew=>{
	edit_fullpath = path;
	edit_fname = fname;
	edit_ftype = rtype;
	editsave();
//	if (do_saveloop && edit_fullpath && edit_ftype==FS_TYPE) do_edit_saveloop();
};
rootobj = parobj.root;
let rv = checkok();
if (isstr(rv)) return err(rv);
else if (rv!==true) return err("WHATRET???");
stop_stat_input();
x=vim.hold_x;
if (parobj.kids[name]){
	stat_message = fname+": file exists! Overwrite? [y/N]";
	stat_cb = ch=>{
		stat_cb = null;
		if (ch=="y"||ch=="Y") ok();
		else {
			stat_message = "Cancelled!";
			render({},84);
		}
	}
	render({},85);
}
else ok(true);

}//»
else if (mode=="Comment: "){
	log("Comment", com);
	stop_stat_input();
	x = x_hold;
	stat_render("Now append this into a COMMENTS file next to its number...");
}
else if (mode==":") {//«

if (!com) {
	visual_line_mode = false;
	render({},86);
	return;
}

this.command_history.unshift(com);
let marr;
if (marr = com.match(/^(%)?s\/(.*)$/)){
	if (visual_line_mode && marr[1]){
		visual_line_mode = false;
		stat_err("'%': Invalid range modifier in visual line mode");
		return;
	}
	search_and_replace(marr[2], marr[1]);
	return;
}
else if (marr = com.match(/^tab +(.*)$/)){
let num = marr[1];
if (termobj.set_tab_size(num)) return stat_ok(`Tab size is set to: ${num}`);
stat_err("Error: invalid tab size");
return;
}
else if (visual_line_mode){
	visual_line_mode = false;
	stat_err("Invalid command in visual line mode");
	return;
};
if (com.match(/^\d+$/)) {
	if (!last_updown) scroll_hold_x = x;
	last_updown = true;
	return scroll_to_line(parseInt(com));
}
else if (marr = com.match(/^syntax +(.+)$/)){
	let which = marr[1];
	if (which=="js") SYNTAX = JS_SYNTAX;
	else if (which=="none") SYNTAX = NO_SYNTAX;
	else stat_message = "Unknown syntax mode: " + which;
	render({},87);
cwarn("Using syntax", SYNTAX);
}
else if (com=="q"||com=="quit")maybequit();
//else if (com=="w"||com=="write"||com.match(/^w( +(.+))?$/))stat_warn("Ctrl+s to save!");
else if (com.match(/^w(rite)?( +(.+))?$/))stat_warn("Ctrl+s to save!");
else if (marr = com.match(/^set( +(.+))?$/)){
	if (!marr[2]) return stat("Nothing to set!");
	let arr = marr[2].split(/ +/);
	let assignment = arr.shift();
	if (!assignment) return stat("Nothing to set!");
	let setarr = assignment.split("=");
	let which = setarr[0];
	let arg = setarr[1];
	if (which=="wraplen"){
		if (!arg) return stat("No arg given!");
		let num = arg.ppi();
		if (!num) return stat_err(`Invalid arg to 'wraplen': ${arg}`);
		WRAP_LENGTH = num;
		stat_ok(`OK: wraplen=${arg}`);
	}
	else if (which=="no_ctrl_n"){
		if (arg=="1"||arg=="true") NO_CTRL_N=true;
		else if (arg=="0"||arg=="false") NO_CTRL_N=false;
		else return stat_warn("Invalid argument to 'no_ctrl_n'");
		stat_ok(`OK: no_ctrl_n=${NO_CTRL_N}`);
	}
}
else stat_err("Unknown command: " + com);

}//»
else if (mode=="/"||mode=="?"){//«
	if (!com) return render({},88);
	this.search_history.unshift(com);
	scroll_search_str = com;
	scroll_search_dir=mode;
	scroll_lines_checked = [];
//	line_colors = [];
	scroll_pattern_not_found = false;

	line_colors.splice(0, line_colors.length);
	do_scroll_search(true);
}//»
//else if (mode=="?"){
//	if (!comstr) return render({},89);
//	stat_render("Search backward for: " + comstr);
//}
else{
	stat_warn("Handle enter for mode: " + mode);
}


};//»
const download = (str, which) => {
	stat_render("Fold error detected,downloading core...");
//	Core.api.download(str, "VIMDUMP.json");
};

//»
//Handlers«

this.key_up_handler = (arg1,e)=>{//«
	let code = e.keyCode;
if (code >=32 && code <= 126) {
/*Macros...«
	if (MACROMODE) {
		let k = e.key;
		let tm = KEYDOWNS[k];
if (tm){
delete KEYTIMES[tm];
delete KEYDOWNS[k];
}
if (!Object.keys(KEYDOWNS).length){
KEYDOWNS={};
KEYTIMES={};
}
	}
»*/
}
	else if (code >=16 && code <=18){
		let meta = (code==18?"A":(code==17?"C":"S"))+e.location;
		let dval = meta_downs[meta];
		if (dval==1) meta_ups[meta]=1;
		else if (dval==2){
			if (cur_escape_handler) cur_escape_handler();
			meta_downs={};
			meta_ups={};
		}
	}
};//»
this.key_handler=async(sym, e, ispress, code, meta)=>{//«

	if (no_key_mode||macro_mode) return;
	if (meta){
		if (!meta_downs[meta]) meta_downs[meta]=1;
		else if (meta_ups[meta]) meta_downs[meta]=2;
		return;
	}
	did_type_flag=1;
	meta_downs = {};
	meta_ups = {};
	edit_cursor_is_error=false;
	error_cursor = null;
	num_escapes=0;
	let mess;

	if (ispress) {//«
		last_updown = false;
		toggle_hold_y = null;
		toggle_hold_x = null;
		if (stat_input_mode) {//«
			if (!(code >= 32 && code <= 126)) return;
			if (stat_com_arr===true) {
				stat_com_arr = [];
				return;
			}
			num_completion_tabs = 0;
			stat_com_arr.splice(x, 0, String.fromCharCode(code));
			x++;
			render({},90);
			return;
		}//»
		if (code >=32 && code <= 126) {//«
			let ch = String.fromCharCode(code);
			if (stat_cb) return stat_cb(ch);
			if (edit_insert) {
/*Macros«
				let macro_key;
				if (MACROMODE){
					macro_key = '';
					let k = e.key;
					if (k.match(/[a-z]/)) {
						if (KEYDOWNS[k]) return;
						let tm = new Date().getTime();
						KEYDOWNS[k]=new Date().getTime();
						KEYTIMES[tm]=k;
let arr=[];
for (let k in KEYDOWNS){
arr.push(KEYDOWNS[k]);
}
arr = arr.sort();
for (let n of arr){
	macro_key+=KEYTIMES[n];
}
//log(macro_key);
					}
				}
//»*/
				last_action = LAST_CH;
				save_state();
				printch(ch, e);
/*Macros«
if (macro_key){
let str = MACROS[macro_key];

if (str) printchars(str);
}
»*/
				do_syntax_timer();
				return 
			}
			if (visual_line_mode||visual_mode||visual_block_mode){//«
				let s;
				(visual_line_mode&&(s="line"))||(visual_mode&&(s="mark"))||(s="block");
				if (ch=="x"||ch=="y") {
					last_action = LAST_DEL_LINES;
					save_state();
					delete_lines(ch=="y");
					if (ch=="x") do_syntax_timer();
					else mess=`Yanked: ${s}`;
				}
				else if (visual_line_mode){
					if (ch==" ") {
						last_action = LAST_PREPEND_SPACE;
						save_state();
						prepend_visual_line_space(" ");
					}
					else if (ch==":"){
						init_stat_input(ch);
					}
				}
			}//»
			else if (ch=="Y"){//«
				visual_line_mode = true;
				seltop=0;
				selbot=lines.length-1;
				delete_lines(true);
				mess = "Yanked file";
			}//»
			else if (ch=="a"||ch=="i"||ch=="I") {//«
				set_escape_handler(()=>{
					edit_insert=false;
					if (x>0) x--;
					render({},91);
					return true;
				});
				if (ch=="a"&&curch()) x++;
				edit_insert = true;
				return render({},92);
			}//»
			else if (ch==":"||ch=="/"||ch=="?"){//«
					init_stat_input(ch);
                    return;
			}//»
			else if (ch=="n"){//«
				if (scroll_search_str) return do_scroll_search();
			}//»
			else if (ch=="\x60"){//«
				stat_cb = ch=>{
					stat_cb = null;
if (ch=="\x60"){
if (last_pos){
x=last_pos.x;
scroll_num=0;
scroll_to_line(last_pos.y+1);
}
return;
}
					if (!ch.match(/^[a-z]$/)) return stat_render("Ignoring the character: "+ ch);
					let m = MARKS[ch];
					if (!(m)) return stat_render(ch+": mark not set");
if (foldmode){
	let diff = realy()-y;
	scroll_num+=diff;
	unfold_all();
}
					let ln = m.ln;
					let lnpos = lines.indexOf(ln);
/*//«
					if (lnpos==-1) {
						let gotln = false;
						let foldpos;
						if (foldmode){

							for(let k in fold_lines){
								let pos=fold_lines[k].indexOf(ln);
								let n=parseInt(k)+pos+1; 
								if (pos >= 0){
									scroll_to_line(n);
									if (!lines[cy()]==ln) return stat_render("Could not scroll to line: "+n);
									lnpos=cy();
									gotln=true;
								}
							}
						}
						if (!gotln) return stat_render("GOTNOLINEPOS");
					}
//»*/
					jump_to_line(lnpos);
					lines[lnpos]=ln;
					let marks=m.ln.marks;
					let pos=ln.indexOf(m);
					if (pos==-1)  return stat_render("GOTNOMARKPOS");
					x=pos;
					render({},93);
				}
				mess = "Awaiting a mark (a-z) to jump to";
			}//»
			else if (ch=="m"){//«
				set_escape_handler(cancel);
				stat_cb = ch=>{
					stat_cb = null;
					if (!ch.match(/^[a-z]$/)) return stat_render("Ignoring the character: "+ ch);
					let m = MARKS[ch];
					if (m){
						del_mark(m);
					}
					let ln = lines[cy()];
					let gotch = ln[x];
					if(!gotch)gotch="";
					if (gotch.mark) del_mark(gotch);
					let s = new String(gotch);
					s.mark = ch;
					s.ln = ln;
					let marks=ln.marks||[];
					ln.marks=marks;
					marks.push(s);
					ln[x]=s;
					MARKS[ch] = s;
					stat_render("Marking the file with: " + ch +" at: " + x+","+realy());
				}
				mess = "Awaiting a letter (a-z) for file marking";
			}//»
			else if(ch=="p"){//«
				if (!yank_buffer) return;
/*
When you are coming out of normal mode and doing a paste, x++ is like hitting the "a" key for append.
*/
				last_action = LAST_PASTE;
				save_state();
				paste();
				do_syntax_timer();

			}//»
			else if (ch=="f") {//«
				if (stat_cb) return;
				mess = edit_fullpath|| "New File";
			}//»
			else if (ch=="v"){//«
				if (foldmode){
					let ry = real_lines[cy()];
					if (open_folds[ry]||end_folds[ry]) return stat_render("Fold marker detected. Not starting visual mode.");
				}
				visual_mode = true;
				edit_sel_start=seltop=selbot=cy();
				edit_sel_mark=selleft=selright=x;
				set_escape_handler(()=>{
					visual_mode = false;
					render({},94);
				});
			}//»
			else if (ch=="V"){//«
				visual_line_mode = true;
				edit_sel_start=seltop=selbot=cy();
				set_escape_handler(()=>{
					visual_line_mode = false;
					render({},95);
				});
				render({},96);
			}//»
			else if (ch=="x") {//«
				last_action = LAST_DEL;
				save_state();
				do_ch_del();
				do_syntax_timer();
				return;
			}//»
			else if (ch=="u"){//«
//				if (states.length==1||state_iter===0) set_stat_warn("At the first state");
//				if (!skipped_save && (states.length==1||state_iter===0)) {
				if (!last_action && (states.length==1||state_iter===0)) {
//log(last_action);
					set_stat("At the first state");
//					stat_which_state();
				}
				else {

					if (last_action){
						save_state(true);
last_action = null;
					}
					if(state_iter===null){
//						do_save_state();
						state_iter=states.length-1;
					}
					state_iter--;
					load_state();
					stat_which_state();
				}
			}//»
			else if (ch=="r"){//«
				if (state_iter==null||state_iter==states.length-1) {
//					stat_which_state();
					state_iter=null;
					set_stat("At the newest state");
				}
				else{
					if (!states[state_iter+1]) return;
					state_iter++;
					load_state();
					stat_which_state();
				}
			}//»
			else if (ch=="X") {//«
				last_action = LAST_DEL;
				save_state();
				do_null_del();
			}//»
			else if (ch=="h") {//«
				insert_hex_ch();
				mess="Hex?";
			}//»
			else if (ch=="k"){//«
				insert_kw();
				mess="kw";
			}//»
			else if(ch=="q"){//«
				insert_quote();
				mess="qu";
			}//»
			else if (ch=="c"){//«
				insert_comment();
				mess="cm";
			}//»
			else if (ch=="s"){//«
//else if (sym=="r_CA") {
syntax_key();
mess="Syntax?";
//}
//				blank_syntax_screen();
			}//»
			else if (ch=="z"){//«
				await_fold_command();
				mess = "fold";
			}//»
			else if (ch=="C"){//«
if (!yank_buffer) return;
termobj.clipboard_copy(yank_buffer.data.reduce((prev,arr)=>prev+arr.join("")+"\n",""));
			}//»
			else if (ch=="l") syntax_refresh();
//«
/*
			else if (ch=="z"){
				set_escape_handler(()=>{
					stop_macro_mode();
					cancel();
				});
				start_macro_mode();
				mess = "Listening for macro keys...";
			}
*/
//»
			if (mess) {
				stat_message = mess;
			}
			render({},97);

		}//»
		return;
	}//»

	if (stat_cb){//«
		if (sym==="ENTER_") stat_cb("__OK__");
		return;
	}//»
	let sim = stat_input_mode;
	if (sim){//«
		if (sym=="TAB_"||sym=="TAB_C") return handle_edit_input_tab(sym==="TAB_C");
		num_completion_tabs = 0;
		if (sym=="ENTER_") return handle_edit_input_enter();
		if (sym=="LEFT_"){if (x > 0) x--;}
		else if(sym=="RIGHT_"){if(x<stat_com_arr.length)x++;}
		else if (sym == "BACK_") {
			if (x > 0) {
				x--;
				stat_com_arr.splice(x, 1);
			} else stop_stat_input();
		}
		else if(sym=="DEL_"){if(stat_com_arr.length)stat_com_arr.splice(x,1);}
		else if(sym=="a_C"){if(x==0)return;x=0;}
		else if(sym=="e_C"){if(x==stat_com_arr.length)return;x=stat_com_arr.length;}
		else if (sym=="UP_"||sym=="DOWN_") do_history_arrow(sym);

		

		render({},98);
		return;
	}//»
	if (sym=="ESC_A"){//«
		if (Desk && !cur_escape_handler) {
			topwin.off();
			return;
		}
	}//»
/*
	else if (sym===EDIT_REINIT_SYM){//«
//		if (foldmode) toggle_fold_lines();
		dirty_flag = true;
		visual_line_mode=false;
		edit_cut_continue = false;
		cut_buffer = [];
		scroll_num = 0;
		y=0;
		x=0;
		stat_message="The editing session has been reinitialiazed!";
		render({},99);
		return;
	}//»
*/
	if (!edit_insert){
		if (sym=="ENTER_") {
			if (foldmode) foldtoggle();
			return;
		}
	}
	toggle_hold_y = null;
	toggle_hold_x = null;
/*
	if (sym=="f_CA") {
		last_pos={x:x, y: realnum(y)};
		return do_fold_all();
	}
	else if (sym=="o_CA"){//«
		let diff = realy()-y;
		scroll_num+=diff;
		unfold_all();
	}//»
*/
	if (sym=="k_C") return linecopy(true);
	else if (sym=="v_C"){//«
		if (!is_normal_mode()) return;
		e.preventDefault();
		if (foldmode){
			let ry = real_lines[cy()];
			if (open_folds[ry]||end_folds[ry]) return stat_render("Fold marker detected. Not starting visual mode.");
		}
		visual_block_mode = true;
		edit_sel_start=seltop=selbot=cy();
		edit_sel_mark=selleft=selright=x;
		set_escape_handler(()=>{
			visual_block_mode = false;
			render({},100);
		});
		render({},101);
	}//»
	else if (sym=="v_CA"){//«
		if (!syntax_hold&&SYNTAX==NO_SYNTAX) return stat_warn("No syntax to validate");
		else if (!(syntax_hold==JS_SYNTAX||SYNTAX==JS_SYNTAX)) return stat_warn("Unknown syntax");

		let arr = get_edit_save_arr();
		if (detect_fold_error(arr)) {
			stat_warn("Fold error!");
			return;
		}
		let str = 'function Nothing(){"use strict";'+arr[0]+"}";

		let scr = util.make('script');
		let holderr = window.onerror;
		let goterr;
		window.onerror=e=>{
			window.onerror = holderr;
			goterr = e;
		};
		scr.onload=()=>{
			if (goterr) stat_err("Invalid");
			else stat_ok("Valid!");
			window.onerror = holderr;
			scr.del();
		}
		scr.onerror=e=>{
			stat_err("Invalid");
			scr.del();
		};
		scr.src = URL.createObjectURL(new Blob([str],{type:"application/javascript"}));
		document.head.add(scr);
	}//»
	else if (sym=="c_C") {//«
		if (edit_kill_cb) {
			edit_kill_cb();
			edit_kill_cb = null;
			return;
		}
		return linecopy();
	}//»
	edit_cut_continue = false;

	const updown_funcs={//«
		UP_:up,
		DOWN_:down,
		PGDOWN_S: () => {
			if (lines[cy() + h - 1]) {
				scroll_num++;
				if (y>0) y--;
				render({},102);
			}
		},
		PGUP_S: () => {
			if (scroll_num) {
				scroll_num--;
				if (y < h-2) y++;
				render({},103);
			}
		},
		PGUP_: pgup,
		PGDOWN_:pgdn,
		HOME_:home,
		END_:end
	};//»
	if (updown_funcs[sym]){
		if (!last_updown) scroll_hold_x = x;
		last_updown = true;
		updown_funcs[sym]();
		return;
	}
	last_updown = false;

//Begin state changing keys
	if (sym=="TAB_") {//«
		e.preventDefault();
		if (visual_line_mode) {
			last_action = LAST_PREPEND_SPACE;
			save_state();
			prepend_visual_line_space("\t");
			return 
		}
		if (!edit_insert) return;
		last_action = LAST_CH;
		save_state();
		printch("\t",e);
	}//»
	else if (sym=="ENTER_") {//«
		last_action = LAST_ENTER;
		save_state();
		enter();
	}//»
	else if (sym=="ENTER_C") {//«
		last_action = LAST_ENTER;
		save_state();
		let hold = edit_insert;
		edit_insert=true;
		enter(true);
		edit_insert=hold;
		render({},104);
	}//»
	else if (sym=="BACK_") {//«
		last_action = LAST_BACK;
		save_state();
		do_syntax_timer();
		if (visual_line_mode) seldel();
		else backspace();
		return;
	}//»
	else if (sym=="DEL_") {//«
		last_action = LAST_DEL;
		save_state();
		del();
		do_syntax_timer();
		return;
	}//»
	else if (sym=="-_CAS") {//«
		last_action = LAST_CH;
		save_state();
		printch("—");
	}//»
	else if (sym=="l_C"){//«
		/*Instead of doing row folds, bring a multiline block up into a single line*/
		e.preventDefault();
if (!visual_line_mode){
syntax_refresh();
}
else {
		last_action = LAST_DEL_LINES;
		save_state();
		dolinewrap();
		do_syntax_timer();
}
	}//»
	else if (sym=="p_A"){//«
		if (!pretty) {
			if (!is_normal_mode(true)) {
				stat_warn("Pretty printing requires normal/edit mode!");
				return;
			}
			stat("Loading the pretty module...");
			let modret = await capi.getMod("util.pretty");
			if (!modret) return stat_render("No pretty module");
			pretty = modret.getmod().js;
			dopretty();
		}
		else dopretty();
	}//»
	else if (sym=="u_C") {//«
		e.preventDefault();
		last_action = LAST_INS_LINES;
		save_state();
		insert_cut_buffer();
	}//»
	else if (sym=="o_A"){//«
		let ry = realy();
		if (end_folds[ry]||open_folds[ry])return;
		if (SYNTAX==JS_SYNTAX) printchars("//\xab");
		else printchars("\xab");
		open_folds[ry]=true;
		open_fold_nums.push(ry);
		open_fold_nums.sort(LO2HI);
	}//»
	else if (sym=="c_A"){//«
		let ry = realy();
		if (end_folds[ry]||open_folds[ry])return;
		if (SYNTAX==JS_SYNTAX) printchars("//\xbb");
		else printch("\xbb");
		end_folds[ry]=true;
		end_fold_nums.push(ry);
		end_fold_nums.sort(LO2HI);
	}//»
	else if (sym=="/_A") {//«
		if (SYNTAX==JS_SYNTAX) {
			last_action = LAST_CH;
			save_state();
			printchars("/**/");
		}
	}//»
	else if (sym=="j_C") do_justify();
	else if (sym=="f_C") {//«
		if (visual_line_mode) {
			last_action = LAST_CH;
			save_state();
			make_visual_fold();
		}
		else {
//			make_indent_fold();
//For wherever the cursor is, 
stat_warn("Not calling make_indent_fold()");
		}
	}//»
	else if (sym=="x_CAS") {//«
		if (visual_line_mode) {
			last_action = LAST_CH;
			save_state();
			make_visual_comment(true);
		}
	}//»
	else if (sym=="n_CA"){//«
//stat_warn("Clearing nulls from current line...");
		last_action = LAST_DEL;
		save_state();
		clear_nulls_from_cur_ln();
	}//»
	else if (sym=="n_CAS"){//«
		last_action = LAST_DEL;
		save_state();
		clear_nulls_from_file();
	}//»
	else if (sym=="p_C"){//«
//press "c_CAS" to set the completer words (they must each be at least MIN_COMPLETE_LETTERS in length)
		e.preventDefault();
		do_complete();
	}//»
//End state changing keys


	else if(sym=="n_C"){//«
		if (NO_CTRL_N){
			e.preventDefault();
		}
		else{
stat_warn("To stop window popups, do: 'set no_ctrl_n=true'!");
		}
	}//»
	else if (sym=="n_A") {//«
		edit_show_col = !edit_show_col;
		render({},105);
	}//»
	else if (sym=="a_C") {//«
		e.preventDefault();
		seek_line_start();
	}//»
	else if (sym=="k_A") {//«
		cut_to_end = !cut_to_end;
		stat_message = "Cut to end is " + (cut_to_end?"en":"dis")+ "abled!";
		render({},106);
	}//»
/*
	else if (sym=="l_A"){//«
//		if (edit_stdin_func) edit_stdin_func(get_edit_save_arr()[0], log, true);
		if (edit_stdin_func) edit_stdin_func(get_edit_save_arr()[0], new_stdin_func_cb);
	}//»
*/
	else if (sym=="e_C") seek_line_end();
	else if (sym=="LEFT_") left();
	else if (sym=="LEFT_C") left(true);
	else if (sym=="RIGHT_") right();
	else if (sym=="RIGHT_C") right(true);
	else if (sym=="x_C") maybequit();
	else if (sym=="m_CA"){//«
		show_marks=!show_marks;
		stat_render("Showing marks: " + show_marks);
	}//»
	else if (sym=="s_C") trysave();
	else if (sym=="s_CS") {//«
		if (!edit_fullpath) return trysave();
		trysave(true);	
	}//»

	else if (sym=="SPACE_CAS") {log(real_lines);}
	else if (sym=="o_CAS"){//«
		x=0;y=0;scroll_num=0;
		render({},107);
	}//»
	else if (sym=="d_A"){//«
		y++;
		if (y==h-1){
			y--;
			scroll_num++;
		}
		render({},108);
	}//»
	else if (sym=="m_CAS") stat_memory();
/*
	else if (sym=="l_CS") {//«
//		save_state_to_db(states[states.length-1]);
	}//»
	else if (sym=="0_A"){//«
		if (is_normal_mode()&&Dev_mode) {
			printch("");
			save_state();
			stat_warn('Now inserting a null byte in dev mode');
		}
	}//»
*/
	else if (sym.match(/^[-0-9]_CA$/)){//«
		if (sym=="0_CA"){
			state_iter=0;
			load_state();
stat("Original state");
		}
		else if (sym=="-_CA"){
			state_iter=states.length-1;
			load_state();
stat("Newest state");
		}
		else{
let which = parseInt(sym.match(/^(.)/));
state_iter = Math.floor(which*states.length/10);
//log(off);
//let per = which
//per =
//state_iter = sl - Math.ceil(sl/which);
load_state();
stat_which_state(true);
		}
	}//»
	else if (sym=="c_CAS"){
		set_completer_words();
		stat(`Reset completers (${ALL_WORDS.length} words)`);
	}
/*«
else if (sym=="q_A"){
	MACROMODE = !MACROMODE;
	if (MACROMODE) {
		KEYDOWNS={};
		KEYTIMES={};
//		for (let k in KEYDOWNS) delete KEYDOWNS[k];
//		for (let k in KEYTIMES) delete KEYTIMES[k];
		stat("Macro mode is on");
	}
	else stat("Macro mode is off");
//KEYDOWNS={};
}
»*/
	else if (sym=="d_CA"){
//		let arr = get_edit_save_arr();
//		Core.api.download(arr[0],edit_fname||"VIMDL.txt")
	}
	else if (sym=="r_CA") {
//log(1);
//update_syntax_delch();
//do_syntax_timer();
	}
	else if (sym=="j_CAS"){
		init_splice_mode();
	}
	else if (sym=="f_CAS"){
//log("FM", foldmode);
if (foldmode){
unfold_all();
foldmode = false;
}
else{
foldmode = true;
fold_all();
}
	}

}//»

//»
//«Obj/CB

this.save=trysave;
this.set_stat_message=arg=>{stat_message=arg;vim.stat_message=arg;};
this.set_ask_close_cb = () =>{//«
	stat_cb = ch=>{
		stat_cb = null;
		if (ch=="y"||ch=="Y") {
			if (edit_fobj) {
				edit_fobj.unlockFile();
/*
				delete edit_fobj.write_locked;
				let par = edit_fobj.par;
				while (par){
					if (par.is_root) break;
					par.rmMoveLock(MOVE_LOCK);
					par = par.par;
				}
*/

			}
			if (app_cb) app_cb();
			topwin.forceKill();
		}
		else {
			stat_message = "Not closing!";
			render({},1);
		}
	}
}//»
this.check_paste=val=>{if(edit_insert||stat_input_mode)dopaste(val);};
this.set_allow_paste_cb = () => {//«
	stat_cb = ch=>{
		stat_cb = null;
		if (ch=="n"||ch=="N") {
			stat_message="Cancelled";
			render({},3);
			return;
		}
		else dopaste();
	}
};//»
this.unset_stat_message=()=>{stat_message=null;stat_message_type=null;};
this.resize=(warg,harg)=>{//«
	w=warg;
	h=harg;
	render({},4);
};//»

//»

//Init«
this.init = async(arg, patharg, opts)=>{
return new Promise((Y,N)=>{


	let len = arg.length;
	let linesarg = arg.split(/\r?\n/);
	if (foldmode) {
		if (linesarg.length >= REAL_LINES_SZ){
			let mess = `Fatal exception: In 'foldmode', the length of the lines array (${linesarg.length}) must be less than the length of the real_lines array (${REAL_LINES_SZ})`;
			return Y(mess);
		}
	}
	let old = termobj.overrides;
	hold_overrides = old;
	let overs = {};
	if (old) {
		for (let k in old){
			overs[k] = old[k];
		}
	}
	for (let str of overrides) overs[str]=1;
	termobj.overrides = overs;

	let typearg = opts.TYPE;
	convert_markers = opts.CONVMARKS;
	if (foldmode) real_lines = new Uint32Array(REAL_LINES_SZ);
	edit_stdin_func = opts.STDINFUNC;
	if (edit_stdin_func) edit_stdin_func(null, new_stdin_func_cb);
	edit_fobj = opts.FOBJ;

	if (edit_fobj) edit_fobj.lockFile();
	
	termobj.is_editing = true;
	edit_fullpath = patharg;
	edit_ftype = typearg;
	edit_insert = false;
	dirty_flag = false;
	termobj.is_dirty = false;
	visual_line_mode = visual_mode = visual_block_mode = false;
	edit_cut_continue = false;
	cut_buffer = [];
	edit_fname = null;
	let ext;

	if (patharg) {
		let arr = patharg.split("/");
		edit_fname = arr.pop();
		ext = edit_fname.split(".").pop();
	}
	else if (opts.USEEXT) ext = opts.USEEXT;

	if (ext) {
		if (ext.match(/^js(on)?$/)) SYNTAX = JS_SYNTAX;
		else SYNTAX=NO_SYNTAX;
	}
	termobj.hold_lines();
	lines=[];
	line_colors = [];
	zlncols=[];
	if (foldmode) {
		init_folds(linesarg,null,true);
		if (init_error) return Y({ERR: init_error});
	}
	else{
		for(let ln of linesarg) lines.push(ln.split(""));
	}

	state_iter = 0;
	if (!edit_fname) stat_message = "New File";
	else stat_message = '"'+edit_fname+'" '+linesarg.length+'L, '+len+'C';
	termobj.set_lines(lines, line_colors);
	app_cb = Y;
	vim.cb = app_cb;
	vim.fname = edit_fname;
	termobj.init_edit_mode(vim, num_stat_lines);
	render({},109);


});
}
//»

}

