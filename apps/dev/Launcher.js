//Imports«

import { util, api as capi } from "/sys/util.js";
import { globals } from "/sys/config.js";
const{strnum, isarr, isstr, isnum, isobj, make, log, jlog, cwarn, cerr}=util;

//»

export const app = function(Win, Desk) {

const IGen=function(){//«

const ICONS={//«
	Folder:"\u{1f50d}",
//	TextEdit:["\u{1f4dd}",100,76],
//	Settings: ["\u2699",100,64],
	TextEdit:"\u{1f4dd}",
	Settings: "\u{1f4c8}",
//	Help:["\u2753",100,64],
	Help:"\u2753",
	Terminal:"\u{1f4bb}",
	Synth:"\u{1f4cd}",
	Applications:"\u{1f4dc}",
	Something:"\u{231b}",
	Other:"\u{1f5fc}",
	Weather:"\u{26c5}",
	China:"\u{1f409}",
//	Unicoder:"\u{1f680}",
	Unicoder:"\u{1f60b}",
	Watermelon:"\u{1f349}",

	Cake:"\u{1f370}",
	Headphones:"\u{1f3a7}",
	Trophy:"\u{1f3c6}",
	Surfing:"\u{1f3c4}",

	Castle:"\u{1f3f0}",
	Snail: "\u{1f41a}",
	Boat:"\u{26f5}",
	Tent:"\u{26fa}",
	
	Soccer:"\u{26bd}",
	Anchor:"\u{2693}",
	Snowman:"\u{26c4}",
	Coffee:"\u{2615}",
	Golf:"\u{26f3}",
//	:"\u{}",
};//»

this.attach = (obj, cb)=>{//«
let appname = obj.APP.split(".").pop();
return new Promise((Y,N)=>{
	let par = obj.PAR;
	let icn = ICONS[appname];
	par.innerHTML=icn;
	par.img = par;
	Y();
});

}//»

}
const igen = new IGen();
//»

//Imports«

const topwin = Win;
const Main = Win.main;
const main = Main;

const{NS, widgets, DESK_GRADIENT, BACKGROUND_IMAGE_URL}=globals;
//const{isstr, isarr}=util;
const {popyesno}=widgets;
const {mk,mkdv,mksp,configPath}=capi;
const fs = NS.api.fs;

//»

//Var«

let USE_CHAR="\u{2b1c}";
let EMPTY_SYMBOL_LEFT = USE_CHAR;
let EMPTY_SYMBOL_RIGHT = USE_CHAR;
let dock_is_inactive = false;
let SHOW_EMPTY_ICONS = false;
//let SHOW_EMPTY_ICONS = true;
//const is_chrome = arg.ISCHROME;
let is_chrome = false;
let config_path;

let default_icon_names=[
"Folder",
"Terminal",
"TextEdit",
"util.Unicoder",
"sys.Help",
"sys.Settings",
"Watermelon",
"Cake",
"Headphones",
"Trophy",
"Surfing",
"Castle",
"Snail",
"Boat",
"Tent",
"Soccer",
"Anchor",
"Snowman",
"Coffee",
"Golf",
/*
"China",
"sys.Applications",
//"Terminal",
"audio.Synth",
//"Folder",
"Something",
"Other"
*/
];
let cur_evt;
let context_menu_active=false;
let icon_names;
let CDI=null;
let rect;
let base_rect;
let launcher_is_active=false;
let usebasefs, usefinalfs;
let BASEICONFS=10;
let MAXFS = 128;
let MINFS = 8;
let BASEWIDTH=36;
//let use_opacity=0.5;
let use_opacity=0.25;
usebasefs = BASEICONFS;
BASEWIDTH=usebasefs;
let SYSICONNAMEFS=17;
//let TRANSDELAY="0.333s";
let INITDELAY=333;
//let INITDELAY=0;
//let MSDELAY=333;
//let MSDELAY=166;
let MSDELAY=10;
//let MSDELAY=0;
//let ICONMAXWIDTRANS ="max-width 0."+MSDELAY+"s";
let ICONMAXWIDTRANS ="font-size 0."+MSDELAY+"s";
let ICONTRFORMTRANS ="transform 0."+MSDELAY+"s";
let ICONDIMTRANS =`width 0.${MSDELAY}s, height 0.${MSDELAY}s`;
let ICONOPTRANS ="opacity 0.666s";
let BORWID="0";
let BORCOL="#f00";

let TRYMULT = "1.";
let TRYMULTITER=0;
let IFNOSCALE=false;
let DEFMAGSCALE=14.0;
let MAXSCALE=10.0;
let usefinalsc;
let usebasesc=1;
usefinalsc = DEFMAGSCALE;

if (usefinalsc > usebasesc) {
	(()=>{
		let usei,val,lastval;
		let find_the_mult = ()=>{
			for (let i=0; i <= 9; i++){
				TRYMULTITER++;
				if (TRYMULTITER>1000) {
cerr("WHOA INFINITE LOOPER!!!");
					return;
				}
				let mult = TRYMULT+i;
				val = eval(`${usebasesc}*Math.pow(${mult},5)`);
				if (val > usefinalsc) {
					TRYMULT = TRYMULT+(i-1);
					if (TRYMULT.length >= 7) return;
					find_the_mult();
					return;
				}
			}
			TRYMULT = TRYMULT+9;
			if (TRYMULT.length >= 7) return;
			find_the_mult();
		}
		find_the_mult();
	})();
}
else {
	TRYMULT="1.0";
	IFNOSCALE=true;
}


let ICONFSMULT = parseFloat(TRYMULT);
//cwarn("TRYMULT",TRYMULT);
let FS6=usebasesc;
let FS5=FS6*ICONFSMULT;
let FS4=FS5*ICONFSMULT;
let FS3=FS4*ICONFSMULT;
let FS2=FS3*ICONFSMULT;
let FS1=FS2*ICONFSMULT;

//cwarn(ICONFSMULT, parseFloat((FINALICONFS-FS1).toFixed(5)), FS6,FS1);

let FS1_5 = (FS1+FS2)/2;
let FS2_5 = (FS2+FS3)/2;
let FS3_5 = (FS3+FS4)/2;
let FS4_5 = (FS4+FS5)/2;
let FS5_5 = (FS5+FS6)/2;

let FS1_5_diff = FS1 - FS1_5;
let FS2_5_diff = FS2 - FS2_5;
let FS3_5_diff = FS3 - FS3_5;
let FS4_5_diff = FS4 - FS4_5;
let FS5_5_diff = FS5 - FS5_5;

let icon_arr = [];
let icon_arr_left = [];
let icon_arr_right = [];
let num_icons, num_icons_min1, num_icons_min2, num_icons_min3, num_icons_min4, num_icons_min5

//»

//Dom«


main._bgcol="#000";
main._tcol="#ccc";
//main._ff="monospace";
main.style.backgroundImage = DESK_GRADIENT;

let bgdiv = mkdv();
bgdiv._pos="absolute";
bgdiv._loc(0,0);
bgdiv._w="100%";
bgdiv._h="100%";
bgdiv._op=0.3;
//bgdiv.style.backgroundSize="100%";
bgdiv.style.backgroundRepeat="no-repeat";
bgdiv.style.backgroundPosition="center";
bgdiv.style.backgroundImage='url("/www/lotw256.png")';
main._add(bgdiv);
//bgdiv._=;
//bgdiv._=;


const body = mkdv();//«
//log(body);
main._add(body);
body._pos="absolute";
body._b=0;
body._w="100%";
body._dis="flex";
body.style.cssText+=`
flex-direction:column;
align-items:center;
`;//»
const sys_foot=mkdv();
sys_foot._dis="flex";
sys_foot.style.cssText+=`
flex: 0 0 auto;
justify-content:space-between;
align-items:flex-end;
`;


body._add(sys_foot);
const sys_foot_center = mkdv();
const sys_foot_left = mkdv();
sys_foot_left._pad=5;
sys_foot_left._padb=0;
const sys_foot_right = mkdv();
sys_foot_right._pad=5;
sys_foot_right._padb=0;

sys_foot._add(sys_foot_left);
sys_foot._add(sys_foot_center);
sys_foot._add(sys_foot_right);

sys_foot_center._bgcol="rgba(255,255,255,0.15)";
sys_foot_center._op=0;
sys_foot_center._pad=5;
sys_foot_center._padb=0;

sys_foot_left.style.cssText+=`
align-items:flex-end;
display:flex;
flex:0 1 auto;
`;
sys_foot_center.style.cssText+=`
align-items:flex-end;
display:flex;
flex:0 1 auto;
`;
sys_foot_right.style.cssText+=`
align-items:flex-end;
display:flex;
flex:0 1 auto;
`;
/*
sys_foot_center.onclick=e=>{
	let elem = document.elementFromPoint(e.clientX, e.clientY-10);
	if (elem.onclick) {
		elem.onclick();
		dock_is_inactive = true;
		setTimeout(()=>{
			dock_is_inactive = false;
		},1000);
	}
};
*/
/*
sys_foot_center.onmousemove=e=>{
let elem = document.elementFromPoint(e.clientX, e.clientY-10);
if (elem.is_app){
if (!launcher_is_active) {
	launcher_is_active = true;
	sys_foot_center._op=1;
}
set_fs(elem,e);
}
if (!Desk.CDA) {
//dock_is_inactive = false;
	return;
}
};
*/
sys_foot_center.onmouseenter = e => {
//log(e);
CDI = Desk.CDA;
return;
	let ret = Desk.get_drag_img();
	if (!(ret && ret.type === "appicon")) return;
	CDI = ret;
	sys_foot_center.style.cursor = "copy";
	sys_foot_center._op=1;
	if (is_chrome) CDI.copyto("Launcher");
};

sys_foot_center.onmouseout = e => {
}
sys_foot_center.onmouseleave = e => {
//	setTimeout(()=>{
//		if (check_active()) return;
	reset_bar();
//	},10);
/*
dock_is_inactive = false;
return;
	if (Desk.get_drag_img()) sys_foot_center._op=use_opacity;
	sys_foot_center.style.cursor = "";
	if (is_chrome&&CDI) CDI.clear();
	CDI = null;
*/
};


//»

//Funcs«
let cur_elem;
const set_fs = (elem,e, first_time)=>{//«

if (first_time){}
else if (dock_is_inactive) return;

let iter = elem.iter;
let namesp = elem.name_span;
if (cur_elem && cur_elem !== elem){
cur_elem.name_span._dis="none";
}
if (launcher_is_active && Desk.CDA===null) {
	if (elem.div) elem.div._bor=BORWID+"px solid "+BORCOL;
	else elem._bor=BORWID+"px solid "+BORCOL;
	if (namesp._dis==="none") {
		namesp._dis="block";
		namesp._op=1;
	}
	namesp.x = -(3+(namesp.getBoundingClientRect().width-elem.getBoundingClientRect().width)/2);
}
if (IFNOSCALE) return;
let rect = elem.getBoundingClientRect();
let l = rect.left;
let r = rect.right;
let c = (l+r)/2;
let w = rect.width;
let w_2 = w/2;
let x = e.clientX;
let dx= x-c;
let is_west = (dx < 0);
let abs_dx = Math.abs(dx);
let per = (w_2-abs_dx)/w_2;
if (per < 0) per= 0;

let fs = FS1_5 + (per*FS1_5_diff);
let near_fs = FS1_5 - (per*FS1_5_diff);
let near_fs_2 = FS2_5 - (per*FS2_5_diff);
let near_fs_3 = FS3_5 - (per*FS3_5_diff);
let near_fs_4 = FS4_5 - (per*FS4_5_diff);

let far_fs = FS2_5 + (per*FS2_5_diff);
let far_fs_2 = FS3_5 + (per*FS3_5_diff);
let far_fs_3 = FS4_5 + (per*FS4_5_diff);
let far_fs_4 = FS5_5 + (per*FS5_5_diff);
elem.style.fontSize=(BASEWIDTH*fs)+"px";

//If on west, smaller numbers will get the larger value
//If on east, larger numbers will get the larger value
let diffp = num_icons-iter-1;
let diffm = iter;
let icon_p1=icon_arr[iter+1]||icon_arr_right[0],
	icon_p2=icon_arr[iter+2]||icon_arr_right[1-diffp],
	icon_p3=icon_arr[iter+3]||icon_arr_right[2-diffp],
	icon_p4=icon_arr[iter+4]||icon_arr_right[3-diffp];
//	icon_p5=icon_arr[iter+5]||icon_arr_right[4-diffp];
let icon_m1=icon_arr[iter-1]||icon_arr_left[4], 
	icon_m2=icon_arr[iter-2]||icon_arr_left[3+diffm], 
	icon_m3=icon_arr[iter-3]||icon_arr_left[2+diffm], 
	icon_m4=icon_arr[iter-4]||icon_arr_left[1+diffm];
//	icon_m5=icon_arr[iter-5]||icon_arr_left[0+diffm];

if (is_west){
	(icon_p1.style.fontSize=BASEWIDTH*far_fs+"px");
	(icon_p2.style.fontSize=BASEWIDTH*far_fs_2+"px");
	(icon_p3.style.fontSize=BASEWIDTH*far_fs_3+"px");
	(icon_p4.style.fontSize=BASEWIDTH*far_fs_4+"px");
//	(icon_p5.style.fontSize=BASEWIDTH*usebasesc+"px");

	(icon_m1.style.fontSize=BASEWIDTH*near_fs+"px");
	(icon_m2.style.fontSize=BASEWIDTH*near_fs_2+"px");
	(icon_m3.style.fontSize=BASEWIDTH*near_fs_3+"px");
	(icon_m4.style.fontSize=BASEWIDTH*near_fs_4+"px");
//	(icon_m5.style.fontSize=BASEWIDTH*usebasesc+"px");
}
else {
	(icon_p1.style.fontSize=BASEWIDTH*near_fs+"px");
	(icon_p2.style.fontSize=BASEWIDTH*near_fs_2+"px");
	(icon_p3.style.fontSize=BASEWIDTH*near_fs_3+"px");
	(icon_p4.style.fontSize=BASEWIDTH*near_fs_4+"px");
//	(icon_p5.style.fontSize=BASEWIDTH*usebasesc+"px");

	(icon_m1.style.fontSize=BASEWIDTH*far_fs+"px");
	(icon_m2.style.fontSize=BASEWIDTH*far_fs_2+"px");
	(icon_m3.style.fontSize=BASEWIDTH*far_fs_3+"px");
	(icon_m4.style.fontSize=BASEWIDTH*far_fs_4+"px");
//	(icon_m5.style.fontSize=BASEWIDTH*usebasesc+"px");
}
cur_elem = elem;
};//»
const check_active = () => {//«
//	if (dock_is_inactive) return false;
//	if (Desk.CDA) return false;
    for (let dv of icon_arr) {
        if (dv.active) return dv;
    }
    return false;
};//»
const reset_bar = (if_instant)=>{//«
	if (context_menu_active) return;
	const doit=()=>{
		for (let d of icon_arr) {
			delete d.active;
			if (d.is_app) d.style.transition=ICONMAXWIDTRANS;
			else {
				d.style.transition=ICONTRFORMTRANS;
				d.div.style.transition=ICONDIMTRANS;
			}
			(d.style.fontSize=BASEWIDTH+"px");
				d.name_span._dis="none";
				d.name_span._op=0;
				if (d.div) d.div._bor=BORWID+"px solid transparent";
				else d._bor=BORWID+"px solid transparent";
		}
		for (let d of icon_arr_left) d.style.fontSize=BASEWIDTH+"px";
		for (let d of icon_arr_right) d.style.fontSize=BASEWIDTH+"px";
	};
	if (if_instant)doit();
	else setTimeout(doit,MSDELAY);

	
	const doit2=()=>{
		launcher_is_active=false;
		sys_foot_center._op=use_opacity;
	};
	if (if_instant) doit2();
	else {
		setTimeout(()=>{
			if (check_active()) return;
			doit2();
		},MSDELAY+10);
	}
};//»
const update_num_icons=inc=>{//«
	num_icons+=inc;
	num_icons_min1 = num_icons-1;
	num_icons_min2 = num_icons-2;
	num_icons_min3 = num_icons-3;
	num_icons_min4 = num_icons-4;
	num_icons_min5 = num_icons-5;
};//»
const add_empty_icon=(where)=>{//«
	let dv = mkdv();
	dv._pos="relative";
//	dv.innerHTML="\u{1f3ff}";
	dv.style.fontSize=BASEWIDTH;
	dv.style.transition=ICONMAXWIDTRANS;
	if (SHOW_EMPTY_ICONS) dv._op=0.25;
	else dv._op=0;

	where._add(dv);
	if (where===sys_foot_left) icon_arr_left.push(dv);
	else icon_arr_right.push(dv);
	return dv;
};//»
const add_icon = (app_or_win,i)=>{//«

	return new Promise(async(Y,N)=>{
		let wrapdiv=mkdv();
//		wrapdiv._marb=-4;
//		wrapdiv._padb = 5;
		wrapdiv._pos="relative";
		let icondv = mkdv();
		icondv.app = app_or_win;
		let dv = icondv;
		let name;
		let is_app=false;
		let img;
		dv.is_icon = true;
		if (isstr(app_or_win)){
			is_app=true;
			name = app_or_win.split(".").pop();
			await igen.attach({PAR:icondv,APP:app_or_win});
			img = icondv.img;
			img.style.fontSize=BASEWIDTH;
			img.style.transition=ICONMAXWIDTRANS;
			img.is_app=true;
			img._bor=BORWID+"px solid transparent";
		}
		else{
			name = app_or_win.name;
			icondv._add(app_or_win);
			icondv.img=app_or_win.win;
			img=icondv.img;
			img.style.transition=ICONTRFORMTRANS;
			img.div.style.transition=ICONDIMTRANS;
			img.div._bor=BORWID+"px solid transparent";
		}
		const rm_icon=async()=>{//«
//			if (!is_chrome) return;
			let new_names = [];
			let new_arr=[];
			let iter=0;
			let have_icon;
			for (let icn of icon_arr){
				if (icn===img) {
					have_icon = wrapdiv;
//					dv._del();
				}
				else {
					icn.iter = iter;
					new_arr.push(icn);
					if (icn.is_app) new_names.push(icn.name);
					iter++;
				}
			}
			icon_arr=new_arr;
			update_num_icons(-1);
			return have_icon;
//			await fs.writeHtml5File(config_path,new_names.join("\n"),{ROOT:true});
		};//»
		img.wrapdiv=wrapdiv;
		img.iter=i;
//		dv._add(icondv);
		wrapdiv._add(icondv);
		wrapdiv.img = img;
		img.wrapdiv=wrapdiv;
		wrapdiv.onclick=e=>{//«
			reset_bar();
			dock_is_inactive = true;
			setTimeout(()=>{
				dock_is_inactive = false;
			},1000);

			if (is_app) {
				if (name==="Folder") Desk.open_file_by_path("/home/me/Desktop");
				else Desk.open_app(app_or_win,()=>{});
			}
			else{
				img.unminimize();
				let iter = 0;
				let new_arr=[];
				for (let icn of icon_arr){
					if (icn===img) wrapdiv._del();
					else {
						icn.iter = iter;
						new_arr.push(icn);
						iter++;
					}
				}
				icon_arr=new_arr;
				update_num_icons(-1);
			}
		};//»
//		img.onclick = wrapdiv.onclick;
		dv.oncontextmenu=e=>{//«
e.preventDefault();
e.stopPropagation();
//			if (!is_chrome) return;
			if (!is_app) return;
			let menu = Desk.set_context_menu({
				X: e.clientX,
				Y: e.clientY
			}, {
			items: [`Remove '${name}' from the Launcher`, async()=>{
//			context_menu_active = false;
//			reset_bar();
//log("REMOVE", wrapdiv);
let icn = await rm_icon();
//log(icn);
icn._del();
			}]
/*
			items: [`Remove '${name}' from the Launcher`, ()=>{
				rm_icon(dv,img);
				let new_names = [];
				let new_arr=[];
				let iter=0;
				for (let icn of icon_arr){
					if (icn===img) dv._del();
					else {
						icn.iter = iter;
						new_arr.push(icn);
						if (icn.is_app) new_names.push(icn.name);
						iter++;
					}
				}
				icon_arr=new_arr;
				update_num_icons(-1);
				await fs.writeHtml5File(config_path,new_names.join("\n"),{ROOT:true});
			}]
*/

		});
		context_menu_active = true;

//		Desk.desk_menu.kill_cb=()=>{
		menu.kill_cb=()=>{
//log("KILL");
			context_menu_active = false;
			reset_bar();
		};

		};//»
		dv.onmousemove=e=>{//«
//			e.stopPropagation();
			cur_evt=e;
			if(launcher_is_active) set_fs(img,e);
		};//»
		dv.onmouseenter=e=>{//«
			if (dock_is_inactive) return;
			cur_evt=e;


if (!launcher_is_active) {
	launcher_is_active = true;
	sys_foot_center._op=1;
}
set_fs(img,e,i);
img.active=true;

/*
			if (!check_active()) {
				setTimeout(()=>{
					let elem = check_active();
					if (!elem) return;
					launcher_is_active=true;
					sys_foot_center._op=1;
					set_fs(elem,cur_evt);
				},INITDELAY);
			}
			if (launcher_is_active) set_fs(img,e,i);
			img.active=true;
*/
		};//»
		dv.onmouseleave=e=>{//«
			cur_evt=e;
//			if (img.div) img.div._bor=BORWID+"px solid transparent";
//			else img._bor=BORWID+"px solid transparent";
/*
			setTimeout(()=>{
				if (context_menu_active) return;
				delete img.active;
				setTimeout(()=>{
					namesp._dis="none";
					if (img.div) img.div._bor=BORWID+"px solid transparent";
					else img._bor=BORWID+"px solid transparent";
				},MSDELAY);
			},0);
*/
//log("LEAVE");
			setTimeout(()=>{
//				namesp._dis="none";
				if (check_active()) return;
				reset_bar();
			},10);

		};//»
		dv.onmouseup=async e=>{//«
			let CDA = Desk.CDA;
			if (!CDA||dock_is_inactive) return;
			e.stopPropagation();
			sys_foot_center.style.cursor = "";
			let app = CDA.app;
//log(app);
			CDA._del();
			Desk.CDA = null;
//			Desk.clear_drag_img();
			for (let icn of icon_arr) {
				if (icn.name === app) return;
			}
			let r = dv.getBoundingClientRect();
			let is_before = e.clientX<((r.left+r.right)/2);
			await add_icon(app, num_icons);
			let newicon=icon_arr.pop();
//log(newicon);
			if(is_before){
//				sys_foot_center.insertBefore(newicon.div,wrapdiv);
				sys_foot_center.insertBefore(newicon.wrapdiv,wrapdiv);
				icon_arr.splice(img.iter,0,newicon);
			}
			else if (img.iter < num_icons-1){
//				sys_foot_center.insertBefore(newicon.div,wrapdiv.nextSibling);
				sys_foot_center.insertBefore(newicon.wrapdiv,wrapdiv.nextSibling);
				icon_arr.splice(img.iter+1,0,newicon);
			}
			else icon_arr.push(newicon);
			let names=[];
			for (let i=0; i <icon_arr.length; i++){
				let icn = icon_arr[i];
				icn.iter=i;
				if (icn.is_app) names.push(icn.name);
			}
			update_num_icons(1);
			set_fs(newicon, e);
			if (is_chrome) await fs.writeHtml5File(config_path, names.join("\n"), {
				ROOT: true
			});

		};//»
		icon_arr.push(img);
		let namesp = mkdv();//«
//		namesp.onmouseenter=()=>{
//			reset_bar();
//		}
		wrapdiv._add(namesp);
		namesp._ta="center";
		namesp.style.minWidth="100%";
		namesp._ff="sans-serif";
		namesp._mart=-(2*SYSICONNAMEFS)+"px";
		namesp._fs=SYSICONNAMEFS;
		namesp._bgcol="#000";
		namesp._fw="bold";
		namesp.style.borderRadius="10px";
		namesp._padb=namesp._padt="3px";
		namesp._padl=namesp._padr="5px";
		namesp._marl=namesp._marr="auto";
		namesp._pos="absolute";
//		namesp._loc(-5,0);
		namesp._x=0;
		namesp._y=0;
		namesp._dis="none";
		namesp._op=0;
		namesp.style.transition=ICONOPTRANS;
		namesp.innerHTML=name;
		dv.name_span = namesp;
//»
		img.name_span = namesp;
		if (is_app) img.name=app_or_win;
		sys_foot_center._add(wrapdiv);
//		if (is_chrome&&is_app) {
			dv.draggable=true;
			dv.ondragstart=async e=>{
				e.preventDefault();

let got = await rm_icon();
let icon=got.childNodes[0];
got.childNodes[1]._del();
reset_bar(true);
let r = icon.getBoundingClientRect();
//let offx = r.left - e.clientX;
let offx = 5;
icon._offx= offx;
//let offy = r.top - e.clientY;
let offy = 5;
icon._offy = offy;
icon._loc(e.clientX+(offx), e.clientY-(r.height+offy));
icon.style.transition="";
icon.style.fontSize=38;
icon._bgcol="#000";
icon._pos="fixed";
icon._pad=5;
icon._marb=0;
Desk.CDA = icon;
//icon.addEventListener('mouseup', sys_foot_center.onmousemove);
//dock_is_inactive = true;
//setTimeout(()=>{
//dock_is_inactive = false;
//},10);

//				popyesno(`Remove '${name}' from the launcher?`,ret=>{
//					if (ret) rm_icon();
//				});
			};
//		}
//log(wrapdiv);
		Y();
	});

};//»

//»

const init=async()=>{//«

/*«
	config_path = await configPath("desk/launcher.txt");
	let str = await fs.readHtml5File(config_path);
	if (str){
		let arr = str.split("\n");
		for (let i=0; i < arr.length; i++) arr[i]=arr[i].trim();
		icon_names=[];
		for (let nm of arr){
			if (nm) icon_names.push(nm);
		}

	}
	else{
		await fs.writeHtml5File(config_path,default_icon_names.join("\n"),{ROOT:true});
		icon_names = default_icon_names;
	}
»*/

	icon_names = default_icon_names;
	num_icons = icon_names.length;
	num_icons_min1 = num_icons-1;
	num_icons_min2 = num_icons-2;
	num_icons_min3 = num_icons-3;
	num_icons_min4 = num_icons-4;
	num_icons_min5 = num_icons-5;
	for (let i=0; i < 5; i++) {
		let d = add_empty_icon(sys_foot_left);
		d.innerHTML=EMPTY_SYMBOL_LEFT;
	}
	for (let i=0; i < num_icons; i++) {
		await add_icon(icon_names[i], i);
		if(i===0) sys_foot_center._op=use_opacity;
	}
	sys_foot_center.style.maxHeight=sys_foot_center.getBoundingClientRect().height;

	for (let i=0; i < 5; i++) {
		let d = add_empty_icon(sys_foot_right);
		d.innerHTML=EMPTY_SYMBOL_RIGHT;
	}


};//»

//Obj/CB«

this.onkill=()=>{};
this.onappinit = init;
this.click_icon=num=>{//«
let icn = icon_arr[num-1];
if (icn) {
if (icn.div) icn.div._bor=BORWID+"px solid "+BORCOL;
else icn._bor=BORWID+"px solid "+BORCOL;
    setTimeout(()=>{
if (icn.div) icn.div._bor=BORWID+"px solid transparent";
else icn._bor=BORWID+"px solid transparent";
    },333);
    icn.wrapdiv.click();
}
};//»
this.kill=()=>{};
this.key_handler=(sym,e,ispress)=>{
};

//»

/*Old Desktop integration«
this.get_base_size=()=>{
return BASEWIDTH;
};
this.next_loc=()=>{
let r = sys_foot_center.getBoundingClientRect();
return {x:r.right,y:r.top};
};
this.add_window=win=>{
add_icon(win, num_icons);
update_num_icons(1);
};

if (is_chrome) Desk.api.setLauncher(this);
»*/


}


