import { util, api as capi } from "/sys/util.js";
import { globals } from "/sys/config.js";
const{NS}=globals;
const{log,cwarn,cerr, make, mkdv}=util;

export const app = function(Win) {

//Var«

const {Main, Desk} = Win;

let lines;
let text_lines;
let bin_lines;
let bytes;
let nb;
let nb_done;
let nlns;
let text_mode = false;
let y=0, scroll_num=0;
let w,h;
let ch_w;
let nrows,ncols;

let FF = "monospace";
let FW = "500";
let CURBG = "#00f";
let CURFG = "#fff";
let OVERLAYOP = "0.42";
let TCOL = "#e3e3e3";
let is_loading = false;
let hold_lines = [];

let killed = false;

//»

//DOM«

let wrapdiv = make('div');
wrapdiv._bgcol="#000";
wrapdiv._pos="absolute";
wrapdiv._loc(0,0);
wrapdiv._tcol = TCOL;
wrapdiv._fw = FW;
wrapdiv._ff = FF;
wrapdiv._fs=21;

wrapdiv.webkitFontSmoothing="antialiased";

wrapdiv.style.whiteSpace = "pre";

Main.appendChild(wrapdiv);
let tabdiv = make('div');
tabdiv._w="100%";
tabdiv.style.userSelect = "text"
tabdiv._pos="absolute";
tabdiv.onclick=e=>{
    e.stopPropagation();
    setTimeout(_=>{
        if (window.getSelection().isCollapsed) textarea.focus();
    },10);
}
tabdiv._loc(0,0);
tabdiv.style.tabSize = 4;

wrapdiv.tabdiv = tabdiv;
wrapdiv.appendChild(tabdiv);

let textarea = make('textarea');//«
textarea.width = 1;
textarea.height = 1;
textarea.style.opacity = 0;
let areadiv = make('div');
areadiv._pos="absolute";
areadiv._loc(0,0);
areadiv._z=-1;
areadiv.appendChild(textarea);
this.areadiv = areadiv;
this.textarea = textarea; 
Main._tcol="black";
Main._bgcol="black";
Main._fs=19;
Main.appendChild(areadiv);
textarea.focus();
//»

const statbar = Win.status_bar;
statbar._w="100%";
statbar._dis="flex";
statbar.style.justifyContent="space-between";

const messdiv=mkdv();
const loaddiv = mkdv();
const perdiv=mkdv();
perdiv._padr=5;
statbar._add(messdiv, loaddiv, perdiv);

//»

//Funcs«

const stat=()=>{//«
	messdiv.innerText='Spacebar toggles ascii view. Use the arrow/paging keys to scroll';
	if (is_loading) loaddiv.innerText=`Loading: ${Math.floor(100*(nb_done/nb))}%`;
	else loaddiv.innerText="";
	let from = scroll_num * (ch_w);
	let to = (scroll_num + h) * (ch_w);
	if (to > nb) to = nb;
	perdiv.innerText=`${from} - ${to} / ${nb}`;
};//»

const getgrid=()=>{//«
//    let _ = wrapdiv;
    let tdiv = tabdiv;
    let usech = "X";
    let str = "";
    let iter = 0;
    wrapdiv._over="auto";
    while (true) {
        if (Win.killed) return;
        str+=usech;
        tdiv.innerHTML = str;
        if (tdiv.scrollWidth > wrapdiv._w) {
            tdiv.innerHTML = usech.repeat(str.length-1);
            wrapdiv._w = tdiv.clientWidth;
            ncols = str.length - 1;
            break;
        }
        iter++;
        if (iter > 10000) {
log(wrapdiv);
            cwarn("INFINITE LOOP ALERT DOING WIDTH: " + tdiv.scrollWidth + " > " + w);
            return
        }
    }
    str = usech;
    iter = 0;
    while (true) {
        tdiv.innerHTML = str;
        if (tdiv.scrollHeight > wrapdiv._h) {
            let newarr = str.split("\n");
            newarr.pop();
            tdiv.innerHTML = newarr.join("\n");
            wrapdiv._h = tdiv.clientHeight;
            nrows = newarr.length;
            break;
        }
        str+="\n"+usech;
        iter++;
        if (iter > 10000) {
log(wrapdiv);
            return cwarn("INFINITE LOOP ALERT DOING HEIGHT: " + tdiv.scrollHeight + " > " + h);
        }
    }
    tdiv.innerHTML="";
    wrapdiv._over="hidden";
}//»

const render=()=>{//«
	if (text_mode) lines = text_lines;
	else lines = bin_lines;
	if (!lines) return;
	let usescroll = scroll_num;
	let scry=usescroll;
	let slicefrom = scry;
	let sliceto = scry + nrows;
	let uselines=[];
	for (let i=slicefrom; i < sliceto; i++) {
		let ln = lines[i];
		if (!ln) uselines.push([""]);
		else {
			let newln = ln.slice(0,w);
			uselines.push(newln);
		}
	}
	let outarr = [];
	let len = uselines.length;
	let donum = len;
	for (let i = 0; i < donum; i++) {
		let arr = uselines[i];
		let ind;
		outarr.push(arr.join(""));
	}
	tabdiv.innerText = outarr.join("\n");
	stat();
};//»

const make_lines=(which)=>{//«
	if (is_loading) return;
	bin_lines=[];
	text_lines=[];
	let pgsz = ch_w*h;
	let i=0;
	let finished = false;
	is_loading = true;
	nb_done = i;
	const dopage=()=>{
		if (killed) return;
		let to = i+pgsz;
		if (to >= nb) {
			to = nb;
			finished = true;
		}
		stat();
		for (; i < to; i+=ch_w){
			nb_done = i;
			let binln=[];
			let txtln = [];
			for (let j=i; j < i+ch_w; j++){
				if (j >= nb) break;
				let byt = bytes[j];
				let binch = byt.toString(16).lpad(2,"0")
				binln.push(binch[0],binch[1]," ")
				if (byt >= 33 && byt <= 126) txtln.push(String.fromCharCode(byt)," "," ");
				else txtln.push(" "," "," ");
/*
				else if (byt==32) txtln.push(" "," "," ");
				else{
					let ch = byt.toString(16).lpad(2,"0")
					txtln.push(ch[0],ch[1]," ")
				}
*/

			}
			text_lines.push(txtln);
			bin_lines.push(binln);
		}
		if (finished) {
			is_loading = false;
			stat();
		}
		else {
			setTimeout(()=>{
				dopage();
			},0);
		}
	}
	dopage();
//	if (text_mode) lines = text_lines;
//	else lines = bin_lines;
	render();
};//»

const resize=(if_init)=>{//«
	if (!lines) return;
	render();
};//»

//»

//CBs«

this.onresize=resize;
this.onloadfile=arg=>{//«
	y=0;
	scroll_num=0;
	wrapdiv._w=Main.clientWidth;
	wrapdiv._h=Main.clientHeight;
    ncols=nrows=0;
    getgrid();
    if (!(ncols&&nrows)) return;
    w = ncols;
    h = nrows;
	ch_w = Math.floor(ncols/3);

	bytes=arg;
	nb = bytes.length;
	make_lines();
};//»
this.onkill=()=>{killed=true;lines=text_lines=bin_lines=null;};
this.onkeydown=(e,k)=>{//«
	if (k=="DOWN_"){
		if(scroll_num+1+h>lines.length)return;
		scroll_num++;
		render();
	}
	else if (k=="UP_"){
		if (scroll_num > 0) {
			scroll_num--;
			render();
		}
	}
	else if(k=="PGDOWN_"){
		if(scroll_num+1+h>lines.length)return;
		scroll_num+=h;
		if (scroll_num+h > lines.length) scroll_num = lines.length-h;
		render();
	}
	else if(k=="PGUP_"){
		scroll_num -=h;
		if (scroll_num<0)scroll_num=0;
		render();
	}
    else if (k=="HOME_"){
        if (scroll_num == 0 ) return;
        scroll_num=0;
        render();
    }
    else if (k=="END_"){
        if (scroll_num == lines.length-h) return;
        scroll_num = lines.length-h;
        render();
    }
	else if (k=="SPACE_"){
		text_mode = !text_mode;
		render();
	}
	else if (k=="LEFT_"){
	}
	else if (k=="RIGHT_"){
	}
};//»

//»

}

