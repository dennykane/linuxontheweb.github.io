import { util, api as capi } from "/sys/util.js";
import { globals } from "/sys/config.js";
const{mkdv, mksp,mk,strnum, isarr, isstr, isnum, isobj, make, KC, kc, log, jlog, cwarn, cerr}=util;

export const app = function(Win, Desk) {//«
//log(Win);
const CATEGORIES = [//«

"Imagery",null,//«

"Dingbats" ,["0x2700","0x27BF"],
"Ornamental Dingbats" ,["0x1F650","0x1F67F"],
"Miscellaneous Symbols" ,["0x2600","0x26FF"],
"Miscellaneous Symbols and Pictographs" ,["0x1F300","0x1F5FF"],
"Miscellaneous Technical" ,["0x2300","0x23FF"],
"Emoticons" ,["0x1F600","0x1F64F"],
"Transport and Map Symbols" ,["0x1F680","0x1F6FF"],
"Supplemental Symbols and Pictographs" ,["0x1F900","0x1F9FF"],

null,null,
//»

"Symbols", null,//«

"Enclosed Alphanumerics" ,["0x2460","0x24FF"],
"Enclosed Alphanumeric Supplement" ,["0x1F100","0x1F1FF"],

"General Punctuation" ,["0x2000","0x206F"],
"Supplemental Punctuation" ,["0x2E00","0x2E7F"],

"Superscripts and Subscripts" ,["0x2070","0x209F"],
"Currency Symbols" ,["0x20A0","0x20CF"],
"Letterlike Symbols" ,["0x2100","0x214F"],
"Number Forms" ,["0x2150","0x218F"],
"Common Indic Number Forms" ,["0xA830","0xA83F"],

"Control Pictures" ,["0x2400","0x243F"],
"Optical Character Recognition" ,["0x2440","0x245F"],

//Mathematical symbols
//Game tiles and cards
"Mahjong Tiles" ,["0x1F000","0x1F02F"],
"Domino Tiles" ,["0x1F030","0x1F09F"],
"Playing Cards" ,["0x1F0A0","0x1F0FF"],

"Runic" ,["0x16A0","0x16FF"],
"Alchemical Symbols" ,["0x1F700","0x1F77F"],
"Specials" ,["0xFFF0","0xFFFF"],

null, null,
//»

"Math/Geometry",null,//«

"Mathematical Operators" ,["0x2200","0x22FF"],
"Miscellaneous Mathematical Symbols-A" ,["0x27C0","0x27EF"],
"Miscellaneous Mathematical Symbols-B" ,["0x2980","0x29FF"],
"Supplemental Mathematical Operators" ,["0x2A00","0x2AFF"],
"Mathematical Alphanumeric Symbols" ,["0x1D400","0x1D7FF"],

"Geometric Shapes" ,["0x25A0","0x25FF"],
"Geometric Shapes Extended" ,["0x1F780","0x1F7FF"],

"Counting Rod Numerals" ,["0x1D360","0x1D37F"],
"Tai Xuan Jing Symbols (math)" ,["0x1D300","0x1D35F"],

null,null,
//»

"Arrows/Diagrams",null,//«

"Arrows" ,["0x2190","0x21FF"],
"Supplemental Arrows-A" ,["0x27F0","0x27FF"],
"Supplemental Arrows-B" ,["0x2900","0x297F"],
"Supplemental Arrows-C" ,["0x1F800","0x1F8FF"],
"Miscellaneous Symbols and Arrows" ,["0x2B00","0x2BFF"],

"Box Drawing" ,["0x2500","0x257F"],
"Block Elements" ,["0x2580","0x259F"],

null,null,
//»

"General Language",null,//«

"Alphabetic Presentation Forms" ,["0xFB00","0xFB4F"],
"Variation Selectors" ,["0xFE00","0xFE0F"],
"Vertical Forms" ,["0xFE10","0xFE1F"],
"Combining Half Marks" ,["0xFE20","0xFE2F"],
"Small Form Variants" ,["0xFE50","0xFE6F"],
"Halfwidth and Fullwidth Forms" ,["0xFF00","0xFFEF"],

"IPA Extensions" ,["0x0250","0x02AF"],
"Braille Patterns" ,["0x2800","0x28FF"],
"Spacing Modifier Letters" ,["0x02B0","0x02FF"],
"Combining Diacritical Marks" ,["0x0300","0x036F"],
"Combining Diacritical Marks for Symbols" ,["0x20D0","0x20FF"],
"Combining Diacritical Marks Extended" ,["0x1AB0","0x1AFF"],
"Combining Diacritical Marks Supplement" ,["0x1DC0","0x1DFF"],
"Phonetic Extensions" ,["0x1D00","0x1D7F"],
"Phonetic Extensions Supplement" ,["0x1D80","0x1DBF"],
"Modifier Tone Letters" ,["0xA700","0xA71F"],

null,null,
//»

"Latin",null,//«
"Basic Latin" ,["0x0000","0x007F"],
"Latin-1 Supplement" ,["0x0080","0x00FF"],
"Latin Extended-A" ,["0x0100","0x017F"],
"Latin Extended-B" ,["0x0180","0x024F"],
"Latin Extended-C" ,["0x2C60","0x2C7F"],
"Latin Extended-D" ,["0xA720","0xA7FF"],
"Latin Extended-E" ,["0xAB30","0xAB6F"],
"Latin Extended Additional" ,["0x1E00","0x1EFF"],
null,null,
//»

"Greek",null,//«

"Greek and Coptic" ,["0x0370","0x03FF"],
"Coptic" ,["0x2C80","0x2CFF"],
"Greek Extended" ,["0x1F00","0x1FFF"],
"Cyrillic" ,["0x0400","0x04FF"],
"Cyrillic Extended-A" ,["0x2DE0","0x2DFF"],
"Cyrillic Extended-B" ,["0xA640","0xA69F"],
"Cyrillic Extended-C" ,["0x1C80","0x1C8F"],
"Cyrillic Supplement" ,["0x0500","0x052F"],

null,null,

//»

"Aramaic", null,//«
"Hebrew" ,["0x0590","0x05FF"],
"Arabic" ,["0x0600","0x06FF"],
"Arabic Supplement" ,["0x0750","0x077F"],
"Arabic Extended-A" ,["0x08A0","0x08FF"],
"Arabic Presentation Forms-A" ,["0xFB50","0xFDFF"],
"Arabic Presentation Forms-B" ,["0xFE70","0xFEFF"],
"Syriac" ,["0x0700","0x074F"],
"Syriac Supplement" ,["0x0860","0x086F"],
"Thaana" ,["0x0780","0x07BF"],
"N'Ko" ,["0x07C0","0x07FF"],
"Samaritan" ,["0x0800","0x083F"],
"Mandaic" ,["0x0840","0x085F"],
null, null,
//»

"Brahmic", null,//«
"Devanagari" ,["0x0900","0x097F"],
"Devanagari Extended" ,["0xA8E0","0xA8FF"],
"Bengali" ,["0x0980","0x09FF"],
"Gurmukhi" ,["0x0A00","0x0A7F"],
"Gujarati" ,["0x0A80","0x0AFF"],
"Oriya" ,["0x0B00","0x0B7F"],
"Tamil" ,["0x0B80","0x0BFF"],
"Telugu" ,["0x0C00","0x0C7F"],
"Kannada" ,["0x0C80","0x0CFF"],
"Malayalam" ,["0x0D00","0x0D7F"],
"Sinhala" ,["0x0D80","0x0DFF"],
"Thai" ,["0x0E00","0x0E7F"],
"Lao" ,["0x0E80","0x0EFF"],
"Tibetan" ,["0x0F00","0x0FFF"],
"Myanmar" ,["0x1000","0x109F"],
"Myanmar Extended-A" ,["0xAA60","0xAA7F"],
"Myanmar Extended-B" ,["0xA9E0","0xA9FF"],
null, null,
//»

"Philippine", null,//«
"Tagalog" ,["0x1700","0x171F"],
"Hanunoo" ,["0x1720","0x173F"],
"Buhid" ,["0x1740","0x175F"],
"Tagbanwa" ,["0x1760","0x177F"],
null, null,
//»

"Tai", null,//«
"Tai Le" ,["0x1950","0x197F"],
"New Tai Lue" ,["0x1980","0x19DF"],
"Khmer Symbols" ,["0x19E0","0x19FF"],
"Buginese" ,["0x1A00","0x1A1F"],
"Tai Tham" ,["0x1A20","0x1AAF"],
"Tai Viet" ,["0xAA80","0xAADF"],
null, null,
//»

"CJK", null,//«
"CJK Compatibility Ideographs" ,["0xF900","0xFAFF"],
"CJK Compatibility Forms" ,["0xFE30","0xFE4F"],
"CJK Radicals Supplement" ,["0x2E80","0x2EFF"],
"Kangxi Radicals" ,["0x2F00","0x2FDF"],
"Ideographic Description Characters" ,["0x2FF0","0x2FFF"],
"Enclosed Ideographic Supplement" ,["0x1F200","0x1F2FF"],
"CJK Symbols and Punctuation" ,["0x3000","0x303F"],
"Hiragana" ,["0x3040","0x309F"],
"Katakana" ,["0x30A0","0x30FF"],
"Bopomofo" ,["0x3100","0x312F"],

"Yi Syllables" ,["0xA000","0xA48F"],
"Yi Radicals" ,["0xA490","0xA4CF"],

"Hangul Jamo" ,["0x1100","0x11FF"],
"Hangul Jamo Extended-A" ,["0xA960","0xA97F"],
//"Hangul Syllables" ,["0xAC00","0xD7AF"],
"Hangul Jamo Extended-B" ,["0xD7B0","0xD7FF"],
"Hangul Compatibility Jamo" ,["0x3130","0x318F"],

"Kanbun" ,["0x3190","0x319F"],
"Bopomofo Extended" ,["0x31A0","0x31BF"],
"CJK Strokes" ,["0x31C0","0x31EF"],
"Katakana Phonetic Extensions" ,["0x31F0","0x31FF"],
"Enclosed CJK Letters and Months" ,["0x3200","0x32FF"],
"CJK Compatibility" ,["0x3300","0x33FF"],
//"CJK Unified Ideographs Extension A" ,["0x3400","0x4DBF"],
"Yijing Hexagram Symbols" ,["0x4DC0","0x4DFF"],
//"CJK Unified Ideographs" ,["0x4E00","0x9FFF"],

null, null,
//»

"Native American",null,//«

"Unified Canadian Aboriginal Syllabics" ,["0x1400","0x167F"],
"Unified Canadian Aboriginal Syllabics Extended" ,["0x18B0","0x18FF"],
"Cherokee" ,["0x13A0","0x13FF"],
"Cherokee Supplement" ,["0xAB70","0xABBF"],

null,null,
//»

"Uncategorized",null,//«

"Armenian" ,["0x0530","0x058F"],

"Georgian" ,["0x10A0","0x10FF"],
"Georgian Extended" ,["0x1C90","0x1CBF"],
"Georgian Supplement" ,["0x2D00","0x2D2F"],

"Ethiopic" ,["0x1200","0x137F"],
"Ethiopic Supplement" ,["0x1380","0x139F"],
"Ethiopic Extended" ,["0x2D80","0x2DDF"],
"Ethiopic Extended-A" ,["0xAB00","0xAB2F"],

"Ogham" ,["0x1680","0x169F"],

"Khmer" ,["0x1780","0x17FF"],
"Mongolian" ,["0x1800","0x18AF"],
"Limbu" ,["0x1900","0x194F"],

"Balinese" ,["0x1B00","0x1B7F"],
"Sundanese" ,["0x1B80","0x1BBF"],
"Sundanese Supplement" ,["0x1CC0","0x1CCF"],
"Batak" ,["0x1BC0","0x1BFF"],
"Lepcha" ,["0x1C00","0x1C4F"],
"Ol Chiki" ,["0x1C50","0x1C7F"],
"Vedic Extensions" ,["0x1CD0","0x1CFF"],

"Glagolitic" ,["0x2C00","0x2C5F"],
"Tifinagh" ,["0x2D30","0x2D7F"],

"Lisu" ,["0xA4D0","0xA4FF"],
"Vai" ,["0xA500","0xA63F"],
"Bamum" ,["0xA6A0","0xA6FF"],
"Syloti Nagri" ,["0xA800","0xA82F"],
"Phags-pa" ,["0xA840","0xA87F"],
"Saurashtra" ,["0xA880","0xA8DF"],
"Kayah Li" ,["0xA900","0xA92F"],
"Rejang" ,["0xA930","0xA95F"],
"Javanese" ,["0xA980","0xA9DF"],
"Cham" ,["0xAA00","0xAA5F"],
"Meetei Mayek Extensions" ,["0xAAE0","0xAAFF"],
"Meetei Mayek" ,["0xABC0","0xABFF"],

null, null,

//»


/*«

"Private Use Area" ,["0xE000","0xF8FF"],

"Musical notation",null,
"Byzantine Musical Symbols" ,["0x1D000","0x1D0FF"],
"Musical Symbols" ,["0x1D100","0x1D1FF"],
"Ancient Greek Musical Notation" ,["0x1D200","0x1D24F"],
null, null,

"Surrogates", null,
"High Surrogates" ,["0xD800","0xDB7F"],
"High Private Use Surrogates" ,["0xDB80","0xDBFF"],
"Low Surrogates" ,["0xDC00","0xDFFF"],
null, null,

"Chess Symbols" ,["0x1FA00","0x1FA6F"],
"Symbols and Pictographs Extended-A" ,["0x1FA70","0x1FAFF"],
"Mayan Numerals" ,["0x1D2E0","0x1D2FF"],


»*/

]
//»

//Var«

const categories = {};
const toplevel = [];
let toplevel_showing = true;
let cur_category;
let NAMES_MAP = [];
let last_focused;

//»

//DOM«


let Main = Win.main;
Main._tcol="#ccc";
//log(Main);
Main.top.title="Unicoder";
const main = mkdv();
//Main.tabIndex="-1";
main._dis="flex";
main._bgcol="#000";
Main._fs=32;
Main._fw=900;
const side_div=mkdv();
side_div._overy="scroll";

const side_tab = mk('table');
side_tab._bor="none";

side_tab._tcol="#ccc";
side_tab._fs=18;
side_tab._fw=900;
side_tab.setAttribute("cellpadding",5);
main._add(side_tab);
side_div._add(side_tab);

const main_div=mkdv();
//log(main_div);
main_div.style.userSelect="text";
main_div._pos="relative";
//main_div._fs=32;
main_div._tcol="#ccc";
main_div._overy="scroll";
main_div.style.flexGrow=1;
main._add(side_div);
main._add(main_div);

Main._add(main);
side_div._h= Main.clientHeight;
main_div._h= Main.clientHeight;

const mag_div = mkdv();
mag_div._dis="none";
if (1){

const numsp = mkdv();
numsp._fs=21;
numsp._marb=20;
const chdv = mkdv();
chdv._fs=50;
chdv._w=50;
chdv._h=50;
const nmdv = mkdv();
nmdv._w=150;
nmdv._mart=20;
mag_div.setval=(num, ch, name)=>{
	numsp.innerText = num;
	chdv.innerText = ch;
//	if (!name) name="";
//	nmdv.innerText=name;
}
mag_div._add(numsp);
mag_div._add(chdv);
//mag_div._add(nmdv);
}
mag_div._ta="center";
mag_div._pad=10;
mag_div._bgcol="#000";
//mag_div._tcol="#fff";
mag_div._pos="absolute";
//mag_div._loc(0,0);
mag_div._x=0;
mag_div._b=0;


let textarea;
let areadiv;
textarea = make('textarea');
textarea.id = `textarea_${Win.id}`;
textarea._noinput = true;
textarea.width = 1;
textarea.height = 1;
textarea.style.opacity = 0;
areadiv = make('div');
areadiv._pos="absolute";
areadiv._loc(0,0);
areadiv._z=-1;
areadiv.appendChild(textarea);
Main._add(areadiv);
//log(areadiv);
//    textarea.focus();
//    this.textarea = textarea; 
//»

//Funcs«

const docopy=(s, elem)=>{
	let act = document.activeElement;
	textarea.focus();
	textarea.value = s;
	textarea.select();
	Desk.api.showOverlay(`Copied: ${s}`);
	document.execCommand("copy")
	setTimeout(()=>{
		if (last_focused) last_focused.focus();
	},50);
};
const focus_first_tab=()=>{
	let act = document.activeElement;
	let all = Main.getElementsByClassName("tabbable");
	for (let tab of all){
		if (is_visible(tab)){
			setTimeout(()=>{
				tab.focus();
				tab.onblur=()=>{
					last_focused = tab;
				};
			},50);
			break;
		}
	}
};
const show_category=act=>{//«
	side_div.scrollTop=0;
	if (main_div.childNodes[0]) main_div.childNodes[0]._del();
	toplevel_showing = false;
	for (let tr of toplevel) tr._dis="none";
	let arr = categories[act.category];
	for (let tr of arr) tr._dis="";
	cur_category = [act,arr];
//	Main.focus();
	side_div.style.minWidth = side_tab.clientWidth;
focus_first_tab();
};//»
const is_visible = which => {//«
    let mr = Main.getBoundingClientRect();
    let r = which.getBoundingClientRect();
    return (r.top >= mr.top-5 && r.bottom <= mr.bottom+5);
}; //»

const make_row=(nm,arr)=>{//«
	let div;

	let min = arr[0];
	let max = arr[1];

	let tr = mk('tr');
	tr.onmouseover=e=>{tr.style.cursor="pointer";};
	tr.tabIndex="-1";
	tr.className="tabbable";
	tr._bor="1px solid #777";

	let td = mk('td');
	td.innerText=nm;
	tr._add(td);
	td = mk('td');
	td.innerText=`${min}-${max}`;
	tr._add(td);
	tr.onfocus=()=>{
//		tr._bgcol="#ffc";
	};
	tr.onblur=()=>{
//		tr._bgcol="";
	};
	tr.render=()=>{
		if (main_div.childNodes[0]) main_div.childNodes[0]._del();
		if (div){
			main_div._add(div);
			return;
		}
		div = mkdv();
//log(div);
		div._dis="flex";
//div.style.justifyContent="space-between";
		div.style.flexWrap="wrap";
		let mn = min.pi();
		let mx = max.pi();
		main_div._add(div);

/*

This only works for a small enough range of characters because, this causes the time to increase exponentially.
Otherwise, there needs to be a concept of "render this page/slice/subset only"

For example, this range takes at least a couples minutes minutes to render (20991 characters)
//"CJK Unified Ideographs" ,["0x4E00","0x9FFF"],

*/

		for (let i=mn; i <= mx; i++){
			let sp = mkdv();
			sp._dis="flex";
			sp.style.flexDirection="column";
			sp.style.justifyContent="space-between";
			sp.style.alignItems="center";
			sp._bor="1px dotted #aaa";
			sp._pad= 5;
			if (i<32) continue;
			let numstr = i.toString(16);
			let ch = eval('"\\u\{'+numstr+'}"');
			let chsp = mksp();
			chsp.innerText = ch;
			chsp.onclick=(e)=>{
				e.stopPropagation();
				docopy(ch);
			};
			let valsp = mksp();
			valsp.style.fontSize="16px";
			valsp.innerText = numstr;
			valsp.onclick=(e)=>{
				e.stopPropagation();
				docopy(numstr);
			};
			sp.appendChild(chsp);
			sp.appendChild(valsp);
			div._add(sp);
			sp.onmouseout=()=>{
				mag_div._del();
			}
			sp.onmouseover=(e)=>{
				mag_div.setval(numstr,ch);
//				mag_div.setval(numstr,ch, NAMES_MAP[i]);
				Main._add(mag_div);
			};
		}
	};
	tr.onclick = tr.render;
//log(tr);
	return tr;
};
//»

const make_table = (par_elem)=>{//«

let curcat = null;
let len=CATEGORIES.length;
for (let i=0; i < len; i+=2){
let nm = CATEGORIES[i];
let arr = CATEGORIES[i+1];
if (!curcat){
	if (isstr(nm)&&arr === null){
		curcat = nm;
		let tr = mk('tr');
		tr.tabIndex="-1";
		tr.className="tabbable";
		let td = mk('td');
		td.innerText=nm;
		td._fw="bold";
		tr._add(td);
		td = mk('td');
		tr._add(td);
		td.innerText="\xa0";
		par_elem._add(tr);
		tr.onfocus=()=>{
//			tr._bgcol="#ffc";
		};
		tr.onblur=()=>{
//			tr._bgcol="";
		};
		tr.onclick=()=>{
			show_category(tr);
		};
		tr.onmouseover=e=>{tr.style.cursor="pointer";};
		tr.category=nm;
		categories[nm]=[];
		toplevel.push(tr);
	}
	else if (isstr(nm)&&isarr(arr)){
		let tr = make_row(nm, arr);
		toplevel.push(tr);
		par_elem._add(tr);
	}
	else{
cerr("WUT IZ THIS?");
log(nm,arr);
	}
}
else if (nm===null&&arr===null) curcat = null;
else if (isstr(nm)&&isarr(arr)){
	let tr = make_row(nm, arr);
	tr._dis= "none"
	par_elem._add(tr);
	categories[curcat].push(tr);
}
else{

cerr("WUT IZ THIS?");
log(nm,add);

}


}

};//»

//»

make_table(side_tab);
side_div.style.minWidth = side_tab.clientWidth+"px";
Win.status_bar.innerHTML=`Arrows to navigate | Click to copy`;
/*
let allnameslen = ALLNAMES.length;
for (let i=0; i < allnameslen;i+=2) {
let n = ALLNAMES[i+1];
	if (NAMES_MAP[n]) NAMES_MAP[n]+="\n"+ALLNAMES[i];
	else NAMES_MAP[n] = ALLNAMES[i];
}
*/

//log(NAMES_MAP);

//Obj/CB«

this.onkeydown=(e,s)=>{//«

let act = document.activeElement;
if (s==="DOWN_"||s==="UP_"){
	e.preventDefault();
	if (act.className=="tabbable"){
		if (s=="UP_"){
			let prev = act.previousSibling;
			while (prev&&prev._dis=="none") prev = prev.previousSibling;
			if (prev) {
				prev.focus();
				prev.onblur=()=>{last_focused = prev;};
			}
		}
		else{
			let next = act.nextSibling;
			while (next&&next._dis=="none") next = next.nextSibling;
			if (next) {
				next.focus();
				next.onblur=()=>{last_focused = next;};
			}
		}
	}
}

else if (s=="LEFT_"){
e.preventDefault();
	if (cur_category){
		if (mag_div.parentNode) mag_div._del();
		if (main_div.childNodes[0]) main_div.childNodes[0]._del();
		let arr = cur_category[1];
		for (let tr of arr) tr._dis="none";
		for (let tr of toplevel) tr._dis="";
		toplevel_showing = true;
		cur_category[0].focus();
		cur_category=null;
		side_div.style.minWidth = side_tab.clientWidth;
	}
}
else if (s=="RIGHT_"||s=="ENTER_"){
e.preventDefault();
if (act.className!="tabbable") return;

if (toplevel_showing){
	if (act.category) show_category(act);
	else act.render();
}
else{
	act.render&&act.render();
}
/*
if (act.className!="tabbable") return;
if (act.category) {
cur_category = categories[act.category];
if (toplevel_showing){
toplevel_showing = false;
for (let tr of toplevel) tr._dis="none";

}
}
else {

}
*/
}

};//»

this.onescape=()=>{
	if (mag_div.parentNode){
		mag_div._del();
		return true;
	}
	return false;
};
this.onfocus=()=>{
//	Main.focus();
	focus_first_tab();
};
this.onresize=()=>{

side_div._h= Main.clientHeight;
main_div._h= Main.clientHeight;

};

//»

//setTimeout(()=>{
//	Main.focus();
//},0);



}//»
