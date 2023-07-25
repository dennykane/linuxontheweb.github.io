//Imports«


import { util, api as capi } from "/sys/util.js";
import { globals } from "/sys/config.js";
const {dist}=capi;
const{strnum, isarr, isstr, isnum, isobj, make, log, jlog, cwarn, cerr}=util;
const {NS} = globals;
//const {fs} = NS.api;

//»

export const app = function(Win, Desk) {

//Var«

let is_lifting = false;

//»

//DOM«
const mk=(which)=>{//«
	return document.createElementNS("http://www.w3.org/2000/svg", which);
}//»
const att=(nm,val,which)=>{//«
	(which||svg).setAttribute(nm,val);
};//»

let Main = Win.main;

let svg = mk('svg');
svg.style.cssText=`
background-color:#000;
`;
att("width", "100%");
att("height", "100%");
//att("viewBox","-50 -50 100 100");

Main._add(svg);
//log(svg);

//»

//Funcs«

const add_stroke = elem => {//«
	att("stroke","#ccc",elem);
	att("stroke-width","1",elem);
	att("stroke-linecap","round",elem);
};//»

const circle=(x,y,r, opts={})=>{//«
	let cir = mk('circle');
	att("cx",`${x}`,cir);
	att("cy",`${y}`,cir);
	att("r",`${r}`, cir);
	if (opts.stroke) {
		add_stroke(cir);
	}
	if (opts.fill) {
		att("fill",opts.fill,cir);
	}
//	svg.appendChild(cir);
	return cir;
};//»

const ellipse=(x,y,rx, ry, opts={})=>{//«
	let ell = mk('ellipse');
	att("cx",`${x}`,ell);
	att("cy",`${y}`,ell);
	att("rx",`${rx}`, ell);
	att("ry",`${ry}`, ell);
	if (opts.stroke) {
		add_stroke(ell);
	}
	if (opts.fill) {
		att("fill",opts.fill,ell);
	}
//	svg.appendChild(ell);
	return ell;
};//»

const line = (x1, y1, x2, y2)=>{//«
	let ln = mk('line');
	att("x1",`${x1}`,ln);
	att("y1",`${y1}`,ln);
	att("x2",`${x2}`,ln);
	att("y2",`${y2}`,ln);
	add_stroke(ln);
//	svg.appendChild(ln);
	return ln;
};//»
const polyline = (pts)=>{//«

	let ln = mk('polyline');
	att("points",`${pts.join(" ")}`,ln);
	add_stroke(ln);
//	svg.appendChild(ln);
	return ln;
};//»



const lift_leg = which=>{//«
	is_lifting = true;
	let iter = 0;
	const do_lift_leg=()=>{
		iter++;
		let use_iter;
		if (iter > 25) use_iter = 50 - iter;
		else use_iter = iter;
		bod1.lift_leg(which, use_iter);
		if (iter < 50){
			requestAnimationFrame(do_lift_leg);
		}
		else {
			is_lifting = false;
		}
	};
	requestAnimationFrame(do_lift_leg);
};//»


//»

const Body = function(){//«

let body = mk('g');

let torso = mk('g');

let head = mk("g");
let skull = ellipse(0, -33, 7.5, 10, {stroke: true});
let leye = circle(-3, -35, 1, {fill:"#fff"});
let reye = circle(3, -35, 1, {fill:"#fff"});
let mouth = line(-2, -28, 2, -28);
head.appendChild(skull);
head.appendChild(leye);
head.appendChild(reye);
head.appendChild(mouth);
torso.appendChild(head);
//svg.appendChild(head);

//					jawline   shoulders  hips
let trunk = polyline([0, -23,  0, -20,    0, 8]);
torso.appendChild(trunk);
//let body = line(0, -25, 0, 10);

//					  neck    shoulder  elbow    wrist    fingertips

let ctr = circle(0, 0, 2, {fill: "red", noStroke: true});

let larm = mk('g');
let llarm = mk('g');
let lsh = line(0, -20, -3, -17);
let lbic = line(-3, -17, -7, -5);
let lfor = line(-7, -5, -7, 10);
let lhnd = line(-7, 10, -6, 14);

llarm.appendChild(lfor);
llarm.appendChild(lhnd);

larm.appendChild(lsh);
larm.appendChild(lbic);
larm.appendChild(llarm);

torso.appendChild(larm);


let rarm = mk('g');
let rsh = line(0, -20, 3, -17);
let rbic = line(3, -17, 7, -5);

let rlarm = mk('g');
let rfor = line(7, -5, 7, 10);
let rhnd = line(7, 10, 6, 14);

rlarm.appendChild(rfor);
rlarm.appendChild(rhnd);

rarm.appendChild(rsh);
rarm.appendChild(rbic);
rarm.appendChild(rlarm);


//log(rarm);
torso.appendChild(rarm);

let lleg = mk('g');
let lthgh = line(0, 8, -4, 29);
let llleg = mk('g');
let lshin = line(-4, 29, -4, 45);
let lfoot = line(-4, 45, -6, 48);

llleg.appendChild(lshin);
llleg.appendChild(lfoot);
lleg.appendChild(lthgh);
lleg.appendChild(llleg);
//log(lleg);

let rleg = mk('g');
let rthgh = line(0, 8, 4, 29);
let rlleg = mk('g');
let rshin = line(4, 29, 4, 45);
let rfoot = line(4, 45, 6, 48);
rlleg.appendChild(rshin);
rlleg.appendChild(rfoot);
rleg.appendChild(rthgh);
rleg.appendChild(rlleg);

//body.appendChild(ctr);
body.appendChild(torso);
body.appendChild(lleg);
body.appendChild(rleg);

svg.append(body);

this.lift_leg=(which, amt)=>{//«
	let thigh;
	let lowleg;
	if (which=="left") {
		thigh = lthgh;
		lowleg = llleg;
	}
	else{
		thigh = rthgh;
		lowleg = rlleg;
	}
	att("y2", `${29-amt}`, thigh);
	att("transform", `translate(0 -${amt})`, lowleg);
};//»

this.resume_normal_pose = () => {//«
	att("transform", "", torso);
	att("transform", "", rleg);
	att("transform", "", rlleg);
	att("transform", "", rfoot);
	att("transform", "", lleg);
	att("transform", "", llleg);
	att("transform", "", lfoot);
};//»

this.half_turn_start=(which)=>{//«

	if (which == "right"){
		att("transform", "rotate(-9, 0, 8)", torso);
		att("transform", "rotate(12, 0, 8)", rleg);
		att("transform", "rotate(35, 4, 29)", rlleg);
		att("transform", "rotate(-75, 4, 45)", rfoot);
	}
	else{
		att("transform", "rotate(9, 0, 8)", torso);
		att("transform", "rotate(-12, 0, 8)", lleg);
		att("transform", "rotate(-35, -4, 29)", llleg);
		att("transform", "rotate(75, -4, 45)", lfoot);
	}

};//»
this.half_turn_middle=(which)=>{//«

	if (which == "right"){

		att("transform", "rotate(-4, 0, 8) translate(-5, 0)", torso);
		att("transform", "rotate(-6, 0, 8) translate(-5, 0)", lleg);
		att("transform", "rotate(12, 0, 8) translate(-5, 0)", rleg);
		att("transform", "rotate(15, 4, 29)", rlleg);
		att("transform", "rotate(-105, 4, 45)", rfoot);
		att("transform", "rotate(-90, -4, 45)", lfoot);

		att("x2", "-1", lsh);
		att("x1", "-1", lbic);
		att("x2", "-2", lbic);
		att("x1", "-2", lfor);
		att("x2", "-2", lfor);
		att("x1", "-2", lhnd);
		att("x2", "-1", lhnd);

		att("x2", "1", rsh);
		att("x1", "1", rbic);
		att("x2", "2", rbic);
		att("x1", "2", rfor);
		att("x2", "2", rfor);
		att("x1", "2", rhnd);
		att("x2", "1", rhnd);

		reye.style.display="none";
		att("cx","4", leye);
		head.removeChild(mouth);
		mouth = line(4, -28, 6, -28);
		head.appendChild(mouth);
	}
	else{

		att("transform", "rotate(4, 0, 8) translate(5, 0)", torso);
		att("transform", "rotate(6, 0, 8) translate(5, 0)", rleg);
		att("transform", "rotate(-12, 0, 8) translate(5, 0)", lleg);
		att("transform", "rotate(-15, -4, 29)", llleg);
		att("transform", "rotate(105, 4, 45)", rfoot);
		att("transform", "rotate(90, -4, 45)", lfoot);

		att("x2", "-1", lsh);
		att("x1", "-1", lbic);
		att("x2", "-2", lbic);
		att("x1", "-2", lfor);
		att("x2", "-2", lfor);
		att("x1", "-2", lhnd);
		att("x2", "-1", lhnd);

		att("x2", "1", rsh);
		att("x1", "1", rbic);
		att("x2", "2", rbic);
		att("x1", "2", rfor);
		att("x2", "2", rfor);
		att("x1", "2", rhnd);
		att("x2", "1", rhnd);

		leye.style.display="none";
		att("cx","-4", reye);
		head.removeChild(mouth);
		mouth = line(-4, -28, -6, -28);
		head.appendChild(mouth);

	}

};//»
this.half_turn_end = (which)=>{//«

	if (which == "right"){

		att("transform", "translate(-7, 0)", torso);

		att("transform", "translate(-7, 0)", lleg);
		att("transform", "translate(-7, 0)", rleg);
		att("transform", "", rlleg);
		att("transform", "rotate(225, 4, 45)", rfoot);
		att("transform", "rotate(-225, -4, 45)", lfoot);


		att("x2", "-3", lsh);
		att("x1", "-3", lbic);
		att("x2", "-7", lbic);
		att("x1", "-7", lfor);
		att("x2", "-7", lfor);
		att("x1", "-7", lhnd);
		att("x2", "-6", lhnd);

		att("x2", "3", rsh);
		att("x1", "3", rbic);
		att("x2", "7", rbic);
		att("x1", "7", rfor);
		att("x2", "7", rfor);
		att("x1", "7", rhnd);
		att("x2", "6", rhnd);
		leye.style.display="none";
		head.removeChild(mouth);

	}


	else{

		att("transform", "translate(7, 0)", torso);
		att("transform", "translate(7, 0)", lleg);
		att("transform", "translate(7, 0)", rleg);
//		att("transform", "translate(7, 0)", body);
		att("transform", "", llleg);
		att("transform", "rotate(225, 4, 45)", rfoot);
		att("transform", "rotate(-225, -4, 45)", lfoot);


		att("x2", "-3", lsh);
		att("x1", "-3", lbic);
		att("x2", "-7", lbic);
		att("x1", "-7", lfor);
		att("x2", "-7", lfor);
		att("x1", "-7", lhnd);
		att("x2", "-6", lhnd);

		att("x2", "3", rsh);
		att("x1", "3", rbic);
		att("x2", "7", rbic);
		att("x1", "7", rfor);
		att("x2", "7", rfor);
		att("x1", "7", rhnd);
		att("x2", "6", rhnd);
		reye.style.display="none";
		head.removeChild(mouth);


	}

};//»
this.rotate_arm_sideways=(which, amt)=>{//«
	let usearm;
	if (which=="left") usearm = larm;
	else usearm = rarm;
	att("transform", `rotate(${amt}, 0, -20)`, usearm);
};//»
this.flex_elbow = (which, amt)=>{//«
	let usearm;
	let usex;
	if (which=="left") {
		usearm = llarm;
		usex = -7;
	}
	else {
		usearm = rlarm;
		usex = 7;
	}
	att("transform", `rotate(${amt}, ${usex}, -5)`, usearm);
}//»
this.transform=(str)=>{//«
	att("transform", str, body);
}//»

this.del = ()=>{
	svg.removeChild(body);
};

}//»

//Init«

let killed = false;
const do_bodies=()=>{
if (killed) return;
let bod1 = new Body();
bod1.transform("translate(300 175) scale(3.5)");

let bod2 = new Body();
bod2.transform("translate(900 175) scale(3.5)");

let USE_TIMEOUT = 100;

setTimeout(()=>{
log(1);
	bod1.half_turn_start("left");
	bod2.half_turn_start("right");

	setTimeout(()=>{

		bod1.half_turn_middle("left");
		bod2.half_turn_middle("right");

		setTimeout(()=>{

			bod1.half_turn_end("left");
			bod2.half_turn_end("right");

			setTimeout(()=>{
				bod1.del();
				bod2.del();
				do_bodies();
			}, 500);

		},USE_TIMEOUT);

	},USE_TIMEOUT);

},1000);

}

do_bodies();

//»

//«

this.onresize=()=>{//«

};//»

this.onappinit=async()=>{//«

//await lift_leg("left");
//await lift_leg("right");


}//»
this.onkill=()=>{//«
killed = true;
};//»
//let is_posed = false;
let step_num = 0;
this.onkeydown=async(e,k)=>{//«
return;
	if (k=="SPACE_"){
		if (step_num == 0){
			bod1.half_turn_start("left");
			bod2.half_turn_start("right");
			step_num++;
		}
		else if (step_num == 1){
			bod1.half_turn_middle("left");
			bod2.half_turn_middle("right");
			step_num++;
		}
		else{
			bod1.half_turn_end("left");
			bod2.half_turn_end("right");
		}
	}
	else if (k=="r_"){
		if (is_lifting) return;
		lift_leg("right");
	}
	else if (k=="l_"){
		if (is_lifting) return;
		lift_leg("left");
	}
};//»
this.onkeyup=(e,k)=>{//«
	if (k=="SPACE_"){
	}
};//»

//»



}


/*
//Old«
const setd=()=>{
	curpath.setAttribute("d", curd);
}
const patt=(nm,val)=>{//«
	curpath.setAttribute(nm,val);
};//»

let curpath;
let curd;
let paths = [];
let numpts;
let timeout;
let sx, sy;
let TIMEOUT_MS = 300;
let MAX_DIST = 10;

const add_dot=(x,y)=>{//«
	let cir = mk('circle');
	att("cx",`${x}`,cir);
	att("cy",`${y}`,cir);
	att("r","5", cir);
	att("fill","#f00",cir);
	svg.appendChild(cir);
};//»
const add_closest_point=(which, tx, ty, if_get)=>{//«

let s = which.getAttribute("d");
let a = s.split(" ");
a.shift();
a.shift();
a.shift();
let low = Infinity;
let lox, loy;
for (let i=0; i < a.length; i+=3){
	let x = a[i+1];
	let y = a[i+2];
	let d = dist(x,y,tx,ty);
	if (d < low){
		low = d;
		lox = x;
		loy = y;
	}
}
if (if_get) return [low, lox, loy];

add_dot(lox, loy);

};//»

const try_add_closest_point=(x, y)=>{//«
let low = Infinity;
let lox, loy;

for (let p of paths){
	let [gotlow, gotlox, gotloy] = add_closest_point(p, x, y, true);
	if (gotlow < low){
		low = gotlow;
		lox = gotlox;
		loy = gotloy;
	}
}
if (low < 15) {
	add_dot(lox, loy);
}


};//»

const addtouch=()=>{//«
	curpath.addEventListener('touchstart',e =>{
		let t = e.touches[0];
		let r = Main.getBoundingClientRect();
		let tx = t.clientX - r.left;
		let ty = t.clientY - r.top;
		add_closest_point(e.target, tx, ty);
	});
};//»
Main.addEventListener('touchstart',e =>{//«

let t = e.touches[0];
let r = Main.getBoundingClientRect();
let x = t.clientX - r.left;
let y = t.clientY - r.top;
sx = x;
sy = y;
curd=`M ${x} ${y}`;
curpath = mk("path");
addtouch();
paths.push(curpath);
patt("fill","rgba(0,0,0,0)");
patt("id",`path${paths.length}`);
patt("stroke","#aaa");
patt("stroke-width","3");
numpts = 0;
svg.appendChild(curpath);
setd();

timeout = setTimeout(()=>{
	svg.removeChild(curpath);
	paths.splice(paths.indexOf(curpath), 1);
	try_add_closest_point(x, y);
}, TIMEOUT_MS);

});//»

Main.addEventListener('touchmove',e=>{//«
e.preventDefault();
let t = e.changedTouches[0];
let r = Main.getBoundingClientRect();
let x = t.clientX - r.left;
let y = t.clientY - r.top;
if (timeout && dist(sx, sy, x, y) > MAX_DIST){
	clearTimeout(timeout);
	timeout = null;
}
numpts++;
curd+=` L ${x} ${y}`
setd();
});//»

Main.addEventListener('touchend',e=>{//«
//log(numpts);
//curd+=" Z";
//setd();
//log(svg);

});//»




//»
*/


