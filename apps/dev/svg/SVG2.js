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

let FOOT_RX = 3;
let FOOT_RY = 10;
let FOOT_STANDING_Y = 231;
let FOOT_STANDING_X = 18;

let FOOT_STANDING_ANGLE = 30;
let STEP_UP_SCALE_PER = 0.75;
let USE_SCALE = 2.5;
let BOB_UP_DIST = 3;
let BOB_SIDE_DIST = 4;
let is_lifting = false;

//»

//DOM«

const mk=(which)=>{//«
	return document.createElementNS("http://www.w3.org/2000/svg", which);
}//»
const att=(nm,val,which)=>{//«
	(which||svg).setAttribute(nm,val);
};//»
const tform=(which, val)=>{
	which.setAttribute("transform", val);
};

let Main = Win.main;

let svg = mk('svg');
svg.style.cssText=`
background-color:#000;
`;
att("width", "100%");
att("height", "100%");

Main._add(svg);

//»

//Funcs«
const TWO_PI = Math.PI * 2;
const sin=deg=>{
	return Math.sin(TWO_PI*deg/360)
}
const cos=deg=>{

	return Math.cos(TWO_PI*deg/360)
}

const sleep = s =>{
return new Promise((Y,N)=>{setTimeout(Y,s*1000)});
};
const add_stroke = (elem, opts={}) => {//«
	let col = opts.color || "#ccc";
	let wid = opts.width || "3";
	let cap = opts.cap || "round";
	att("stroke", col,elem);
	att("stroke-width", wid,elem);
	if (cap !== "none") {
		att("stroke-linecap",cap,elem);
	}
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

const line = (x1, y1, x2, y2, opts)=>{//«
	let ln = mk('line');
	att("x1",`${x1}`,ln);
	att("y1",`${y1}`,ln);
	att("x2",`${x2}`,ln);
	att("y2",`${y2}`,ln);
	add_stroke(ln, opts);
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

//»

const Eye = function(){//«

let g = mk('g');
this.el = g;
/*
let cir = mk('path');
//att("d",`M -3 0 L 0 3 L 3 0 L 0 -3 Z`,cir);
let vx = 3;
let vy = 2.25;
att("d",`M -${vx} 0 Q -${vx} ${vy} 0 ${vy} Q ${vx} ${vy} ${vx} 0 Q ${vx} -${vy} 0 -${vy} Q -${vx} -${vy} -${vx} 0`,cir);
add_stroke(cir,{color: "#ccc", width: "1"});
//att("fill", "#ccc", cir);
let pupil = circle(0,0,1, {fill: "#ccc"});

g.appendChild(cir);
g.appendChild(pupil);
*/

let eye = circle(0,0,3, {fill: "#ccc"});
g.appendChild(eye);

};//»
const Mouth = function(wid){//«

let g = mk('g');
this.el = g;
let ln1 = line(-wid/2, 0, wid/2, 0, {width: "2.5"});
//let ln2 = line(0.75*-wid/2, 0, 0.75*wid/2, 0, {color:"#000", width: "0.5", cap: "none"});
g.appendChild(ln1);
//g.appendChild(ln2);
//let mouth = circle(0,0,2, {fill: "#ccc"});
//g.appendChild(mouth);

};//»
const Head = function(){//«
let g = mk('g');
let gr = mk('g');
this.el = g;
/*
skull
2 eyes
mouth
*/
let SKULL_X_RAD = 19;
let dot = circle(0,25,2, {fill:"#f00"});
let skull = ellipse(0,0,SKULL_X_RAD,25, {stroke:true});
let leye = new Eye();
let reye = new Eye();
let mth = new Mouth(10);
let mth_y = 13;
let eye_x = 7.5;
let eye_y = -4;
tform(mth.el, `translate(0,${mth_y})`);
tform(leye.el, `translate(${eye_x},${eye_y})`);
tform(reye.el, `translate(-${eye_x},${eye_y})`);
gr.appendChild(skull);
gr.appendChild(leye.el);
gr.appendChild(reye.el);
gr.appendChild(mth.el);
g.append(gr);
this.nod=depth=>{
	tform(mth.el, `translate(0,${mth_y+depth})`);
	tform(leye.el, `translate(${eye_x},${eye_y+depth})`);
	tform(reye.el, `translate(-${eye_x},${eye_y+depth})`);
	this.is_nodded = true;
};
let shake_dir = 1;
this.shake = (depth, dirarg) => {
	let use_l_x = shake_dir * depth + eye_x;
	let use_r_x = shake_dir * depth - eye_x;

tform(leye.el, `translate(${use_l_x}, ${eye_y})`);
if (use_l_x > SKULL_X_RAD){
//	leye.el.style.display="none";
}
tform(reye.el, `translate(${use_r_x}, ${eye_y})`);
if (use_r_x < -SKULL_X_RAD){
//reye.el.style.display="none";
}

	tform(mth.el, `translate(${shake_dir * depth},${mth_y})`);
	this.is_shaked = true;
	shake_dir = -shake_dir;
};
this.reset=()=>{
//	reye.el.style.display="inline";
//	leye.el.style.display="inline";
	tform(mth.el, `translate(0,${mth_y})`);
	tform(leye.el, `translate(${eye_x},${eye_y})`);
	tform(reye.el, `translate(-${eye_x},${eye_y})`);
	this.is_nodded = false;
	this.is_shaked = false;
};
let nod_interval;
let shake_interval;
this.start_nodding = (delay, depth)=>{
	nod_interval = setInterval(()=>{
		if (!this.is_nodded) this.nod(depth);
		else this.reset();
	}, delay);
};
this.stop_nodding = ()=>{
	this.reset();
	clearInterval(nod_interval);
};
this.start_shaking = (delay, depth)=>{
	shake_interval = setInterval(()=>{
		if (!this.is_shaked) this.shake(depth);
		else this.reset();
	}, delay);
};
this.stop_shaking = ()=>{
	clearInterval(shake_interval);
};
this.tilt = deg =>{
	tform(gr, `rotate(${deg}, 0, 25)`);
};
//log(g);
}//»

const Arm = function(sgn){//«

let scale_arm = (per, hand_per) => {//«
	let usex1 = sgn * x1 * per;
	let usex2 = sgn * x2 * per;
	let usex3 = sgn * x3 * per;
	let usex4 = sgn * x4 * per;
	let usex5 = x5 * hand_per;

	let user1 = r1 * per;
	let user2 = r2 * per;
	let user3 = r3 * per;
	let user4 = r4 * per;

	att("x2",`${usex1}`, shld);
	att("x1",`${usex1}`, bic);
	att("x2",`${usex2}`, bic);
	att("x1",`${usex2}`, fore);
	att("x2",`${usex3}`, fore);
	att("cx", `${usex4}`, hand);
	att("rx", `${usex5}`, hand);

	tform(rg, `rotate(${user1})`);
	tform(mn_r, `rotate(${user2}, ${usex1}, 0)`);
	tform(lw, `rotate(${user3}, ${usex2}, 0)`);
	tform(hand, `rotate(${user4}, ${usex4}, 0)`);

};//»
const rotate_all=()=>{//«
	tform(rg, `rotate(${r1})`);
	tform(mn_r, `rotate(${r2}, ${sgn*stop1}, 0)`);
	tform(lw, `rotate(${r3}, ${sgn*stop2}, 0)`);
	tform(hand, `rotate(${r4}, ${sgn*stop3}, 0)`);
};//»

let rg = mk('g');

let g = mk('g');
this.el = g;

/*
Shoulder
Bicep
Forearm
Hand
*/

//«

let mn_r = mk('g');//Main arm  rotating (minus shoulder)
let mn_s = mk('g');//Main arm scaling
let lw = mk('g');//Lower arm = forearm+hand
let stop1 = 20;
let stop2 = 53;
let stop3 = 86;
let stop4 = 91;

let x1 = stop1;//Shoulder point
let x2 = stop2;//Elbow
let x3 = stop3;//Wrist
let x4 = stop4;//Hand center
let x5 = 7;//Hand length (from wrist to fingertips)

let r1=0, r2=0, r3=0, r4=0;

let shld = line(0, 0, sgn*x1, 0);
let bic = line(sgn*x1, 0, sgn*x2, 0);
let fore = line(sgn*x2, 0, sgn*x3, 0);
let hand = ellipse(sgn*x4, 0, x5, 3,{fill: "#ccc"});

//»

//att("stroke","#aaa", shld);
//att("stroke","#aaa", fore);
rg.appendChild(shld);
mn_r.appendChild(bic);
lw.appendChild(fore);
lw.appendChild(hand);

mn_r.appendChild(lw);
mn_s.append(mn_r);
rg.appendChild(mn_s);
g.appendChild(rg);

this.relax=()=>{//«
	scale_arm(1, 1);
	r1 = sgn * 45;
	r2 = sgn * 40;
	r3 = sgn * 7;
	r4 = sgn * 3;
	rotate_all();
};//»
this.flex=()=>{//«
	r1 = sgn * 15;
	r2 = -sgn * 15;
	r3 = -sgn * 90;
	r4 = -sgn * 90;
	rotate_all();
};//»
this.raise=()=>{//«
	r1 = -sgn * 45;
	r2 = -sgn * 40;
	r3 = -sgn * 7;
	r4 = -sgn * 3;
	rotate_all();
};//»
this.point_forward=()=>{//«
/*

From some arbitrary arm rotation position, iterate to a pointing straight forward position.

*/
let USE_MS = 100;

setTimeout(()=>{
	scale_arm(0.75);
	setTimeout(()=>{
		scale_arm(0.5);
		setTimeout(()=>{
			scale_arm(0.25);
			setTimeout(()=>{
				scale_arm(0.125);
				att("rx", `3`, hand);
			},USE_MS);
		},USE_MS);
	},USE_MS);
},500);


};//»

this.swing_forward=()=>{//«
	let per = 0.6;
	scale_arm(per, 1);
	let usex1 = sgn * x1 * per;
	tform(mn_r, `rotate(${sgn*40}, ${usex1}, 0)`);
};//»
this.swing_back=()=>{//«
	let per = 0.5;
	scale_arm(per, 0.75);
	let usex1 = sgn * x1 * per;
	tform(mn_r, `rotate(${sgn*70}, ${usex1}, 0)`);
};//»

this.shrug=(depth)=>{

	let amt = Math.abs(r1) - depth;
	r1 = sgn * amt;
	tform(rg, `rotate(${r1})`);
	r2 = sgn*90-r1;
	tform(mn_r, `rotate(${r2}, ${sgn*stop1}, 0)`);
	r3 = 0;
	tform(lw, `rotate(${r3}, ${sgn*stop2}, 0)`);

};
}//»
const Torso = function(){//«
let g = mk('g');
this.el = g;
/*
head
neck

2 arms
chest 
belly
*/
let hd = new Head();
this.head = hd;
tform(hd.el, "translate(0, -10)");
g.appendChild(hd.el);

let nck = line(0, 17, 0, 27);
//att("stroke", "#aaa", nck);
g.appendChild(nck);

let chst = line(0, 27, 0, 80);
//att("stroke", "#faa", chst);
g.appendChild(chst);

let blly = line(0, 80, 0, 120);
//att("stroke", "#aaa", blly);
g.appendChild(blly);

let larm = new Arm(1);
tform(larm.el, "translate(0, 27)");
g.appendChild(larm.el);

let rarm = new Arm(-1);
tform(rarm.el, "translate(0, 27)");
g.appendChild(rarm.el);

this.relax_arms = ()=>{//«
	rarm.relax();
	larm.relax();
};//»
this.swing_arm=which=>{//«
	if (which=="left") larm.swing();
	else rarm.swing();
};//»
this.swing_arm_forward=which=>{//«
	if (which=="left") larm.swing_forward();
	else rarm.swing_forward();
};//»
this.swing_arm_back=which=>{//«
	if (which=="left") larm.swing_back();
	else rarm.swing_back();
};//»

this.relax_arm=which=>{//«
	if (which=="left") larm.relax();
	else rarm.relax();
};//»
this.shrug=(depth)=>{
	rarm.shrug(depth);
	larm.shrug(depth);
};

}//»
const Leg = function(sgn){//Leg«

let scale_leg = (per) => {//«
	let usex1 = sgn * x1 * per;
	let usex2 = sgn * x2 * per;
	let usex3 = sgn * x3 * per;
//	let usex4 = sgn * x4 * per;
//	let usex5 = x5 * per;


	att("x2",`${usex1}`, hip);
	att("x1",`${usex1}`, thgh);
	att("x2",`${usex2}`, thgh);
	att("x1",`${usex2}`, shin);
	att("x2",`${usex3}`, shin);
//	att("cx", `${usex4}`, foot);
//	att("rx", `${usex5}`, foot);

	let user1 = 1.25 * r1 * per;
	let user2 = 1.25 * r2 * per;
	let user3 = 1.25 * r3 * per;
//	let user4 = 1.25 * r4 * per;

	tform(rg, `rotate(${user1})`);
	tform(mn, `rotate(${user2}, ${usex1}, 0)`);
	tform(lw, `rotate(${user3}, ${usex2}, 0)`);
//	tform(foot, `rotate(${user4}, ${usex4}, 0)`);

};//»
const rotate_all=()=>{//«
	tform(rg, `rotate(${r1})`);
	tform(mn, `rotate(${r2}, ${sgn*stop1}, 0)`);
	tform(lw, `rotate(${r3}, ${sgn*stop2}, 0)`);
//	tform(foot, `rotate(${r4}, ${sgn*stop3}, 0)`);
};//»

let stop1=20;
let stop2=60;
let stop3=105;
let stop4=112;

let x1=stop1,x2=stop2,x3=stop3,x4=stop4,x5=10;
let r1, r2, r3, r4;
let rg = mk('g');
let g = mk('g');
this.el = g;
/*
Hip
Thigh
Shin
Foot
*/
let hip = line(0, 0, sgn*stop1, 0);

let mn = mk('g');
let mn_t = mk('g');

let thgh = line(sgn*stop1, 0, sgn*stop2, 0);
//att("stroke", "#aaa", thgh);

let lw = mk('g');
let shin = line(sgn*stop2, 0, sgn*stop3, 0);
rg.appendChild(hip);
mn_t.appendChild(thgh);
//lw.appendChild(foot_tg);
lw.appendChild(shin);

mn_t.appendChild(lw);
mn.appendChild(mn_t);
rg.appendChild(mn);
g.appendChild(rg);

this.stand=()=>{//«
	r1 = sgn*70;
	r2 = sgn * 17;
	r3 = sgn * 3;
	r4 = sgn * -25;
	rotate_all();
//	att("rx",`${foot_rx}`, foot);
//	att("ry",`${foot_ry}`, foot);
};//»
this.bend_ankle=(deg)=>{//«
//	tform(foot, `rotate(${sgn*deg}, ${sgn*stop3}, 0)`);
};//»
this.bend_knee=deg=>{//«
	tform(lw, `rotate(${sgn*deg}, ${sgn*stop2}, 0)`);
};//»
this.step_up=()=>{
//	let per = 0.75;
	scale_leg(STEP_UP_SCALE_PER);
//	tform(foot, `rotate(30)`);
//log(stop3, stop4);
//	tform(foot, `rotate(${user4}, ${usex4}, 0)`);
//	let usex4 = sgn * x4 * per;
//	tform(foot, `rotate(0, ${usex4}, 0) translate(${sgn*-5}, 0)`);
//	att("rx","2", foot);
//	att("ry","5", foot);
};
//this.ball_up=()=>{
//};
this.step_down=()=>{
	scale_leg(1);
	this.stand();
//	att("rx",`${1.125*foot_rx}`, foot);
//	att("ry",`${foot_ry}`, foot);
//	tform(foot, `rotate(0, ${sgn*x4}, 0)`);
//	tform(foot, `rotate(${-sgn*15}, ${sgn*x4}, 0)`);
};
this.scale = scale_leg;
this.stand_on_toetips=()=>{


/*
let r1 = foot.getBoundingClientRect();
let usex5=x5*1.25;
//let diff = usex5 - x5;
//log(diff);
let cx = sgn * (x4 - (usex5-x5)-1.5);
att("rx", `${usex5}`, foot);
att("cx", `${cx}`, foot);
let r = foot_rg.getBoundingClientRect();
let rotx = cx + sgn*usex5;
let roty = 0;
let rot_deg = sgn * 15;
tform(foot_rg, `rotate(${rot_deg}, ${rotx}, ${roty})`);
let r2 = foot.getBoundingClientRect();
let diff = r1.top - r2.top;
let trans_y = diff;
*/
//tform(this.body.tr_g,`translate(0, ${-trans_y})`);
//tform(foot_tg, `translate(${sgn*(diff-2)}, 0)`);

//tform(foot_rg, `rotate(${rot_deg}, ${rotx}, ${roty}) translate(${sgn*trans_y/2-sgn*USE_SCALE*5}, 0)`);
//tform(foot_rg, `rotate(${rot_deg}, ${rotx}, ${roty}) translate(${sgn*trans_y}, 0)`);
//*/

};
}//»
const Foot = function(sgn){//«

let foot = ellipse(0, 0, FOOT_RX, FOOT_RY,{fill: "#ccc"});
//let g = mk('g');
let foot_rg = mk('g');
let foot_tg = mk('g');
foot_tg.appendChild(foot_rg);
//g.appendChild(foot_rg);
foot_rg.appendChild(foot);
this.el = foot_tg;
//foot_tg.appendChild(foot_rg);
//g.appendChild(foot_tg);
this.tg = foot_tg;
this.rg = foot_rg;
this.foot = foot;

};//»
const Body = function(){//«
/*
2 legs
torso
*/
let g = mk('g');
let mn_g = mk('g');
let tr_g = mk('g');
let sc_g = mk('g');
this.el = g;
this.tr_g = tr_g;
let tor = new Torso();
//tform(hd.el, "translate(0, -20)");
//tor.head.nod();
this.torso = tor;
let cur_scale=1;
mn_g.appendChild(tor.el);

let lleg = new Leg(1);
lleg.body=this;
let rleg = new Leg(-1);
rleg.body=this;

let lfoot = new Foot();
let rfoot = new Foot();

this.leftLeg = lleg;
this.rightLeg = rleg;

this.leftFoot = lfoot;
this.rightFoot = rfoot;

tform(lleg.el, "translate(0, 120)");
tform(rleg.el, "translate(0, 120)");

//tform(lfoot.el, "translate(113, 120)");
//tform(rfoot.el, "translate(-113, 120)");
//log(lfoot.el);
sc_g.appendChild(lfoot.el);
sc_g.appendChild(rfoot.el);

mn_g.appendChild(lleg.el);
mn_g.appendChild(rleg.el);
sc_g.appendChild(mn_g);
tr_g.append(sc_g);
g.appendChild(tr_g);

let is_left = false;
let is_up = false;
let walk_interval;
let killed;
let stop_walking_promise;
this.start_walking=(ms, scale)=>{//«
	killed = false;
const walk = ()=>{//«

//let diff = 15;
//tform(lfoot.rg, `rotate(-${FOOT_STANDING_ANGLE-diff}, 0, ${FOOT_RY})`);
//tform(rfoot.rg, `rotate(${FOOT_STANDING_ANGLE-diff}, 0, ${FOOT_RY})`);

	let foot_angle_diff = 15;
	let useleg, usearm, stepfunc, swingfunc;
	let bobside_sgn;		
	let upft_tg, upft_rg;
	let dnft_tg, dnft_rg;
	let forward_arm;
	let back_arm;
	if (is_left) {
		useleg = lleg;
		forward_arm = "right";
		back_arm = "left";
		bobside_sgn = -1;
		upft_tg = lfoot.tg;
		upft_rg = lfoot.foot;
//		dnft_tg = rfoot.tg;
		dnft_rg = rfoot.foot;
	}
	else {
		forward_arm = "left";
		back_arm = "right";
		useleg = rleg;
		usearm = "left";
		bobside_sgn = 1;
		upft_tg = rfoot.tg;
		upft_rg = rfoot.foot;
//		dnft_tg = lfoot.tg;
		dnft_rg = lfoot.foot;
//		upfoot = rfoot.foot;
//		downfoot = lfoot.foot;
	}
	if (!is_up) {
		att("ry", "5",upft_rg);
//		att("rx", "12",downfoot);
		let h1 = useleg.el.getBoundingClientRect().height;
		useleg.step_up();
		let h2 = useleg.el.getBoundingClientRect().height;
		tor.swing_arm_forward(forward_arm);
		tor.swing_arm_back(back_arm);
//		tform(upft_rg, ``);
		tform(dnft_rg, `rotate(${bobside_sgn * (FOOT_STANDING_ANGLE-foot_angle_diff)}, 0, ${FOOT_RY})`);
		tform(mn_g,`translate(${bobside_sgn*BOB_SIDE_DIST}, -${BOB_UP_DIST})`);

//		tform(upft_tg, `translate(${bobside_sgn*BOB_SIDE_DIST}, -${FOOT_STANDING_Y*STEP_UP_SCALE_PER})`);

		tform(upft_tg, `translate(${-bobside_sgn*(FOOT_STANDING_X-1)}, ${-6 + FOOT_STANDING_Y - (h1-h2)/cur_scale})`);

//		tform(dnft_rg, `rotate(${bobside_sgn*30}, 1, 3)`);

	}
	else {
//		att("rx", "10", upfoot);

//		tform(upft_tg, ``);
		att("ry", `${FOOT_RY}`,upft_rg);
		tform(upft_tg, `translate(${-bobside_sgn*FOOT_STANDING_X}, ${FOOT_STANDING_Y})`);
//		tform(upft_tg, `translate(${-bobside_sgn*FOOT_STANDING_X}, ${-3 + FOOT_STANDING_Y - (h1-h2)/USE_SCALE})`);
		tform(dnft_rg, ``);
//		tform(upft_tg, `translate(${-bobside_sgn*FOOT_STANDING_X}, ${FOOT_STANDING_Y})`);
		useleg.step_down();
		tor.relax_arm("right");
		tor.relax_arm("left");
		is_left = !is_left;
		tform(mn_g,`translate(0, 0)`);
if (killed){
killed = false;
clearInterval(walk_interval);
stop_walking_promise();
}
	}
	is_up = !is_up;
	cur_scale*=scale;
//log(cur_scale);
	tform(sc_g, `scale(${cur_scale})`);
};//»
	walk_interval=setInterval(walk,ms);
	walk();
};//»
this.stop_walking=()=>{//«
	killed = true;
	return new Promise((Y,N)=>{
		stop_walking_promise = Y;
	});
};//»
this.stand=()=>{//«
	tor.relax_arms();
	lleg.stand();
	rleg.stand();
	tform(lfoot.tg, `translate(${FOOT_STANDING_X}, ${FOOT_STANDING_Y})`);
	tform(rfoot.tg, `translate(-${FOOT_STANDING_X}, ${FOOT_STANDING_Y})`);
	tform(lfoot.rg, `rotate(-${FOOT_STANDING_ANGLE}, 0, ${FOOT_RY})`);
	tform(rfoot.rg, `rotate(${FOOT_STANDING_ANGLE}, 0, ${FOOT_RY})`);
};//»
this.stand_on_toetips=()=>{//«
let diff = 15;
tform(lfoot.rg, `rotate(-${FOOT_STANDING_ANGLE-diff}, 0, ${FOOT_RY})`);
tform(rfoot.rg, `rotate(${FOOT_STANDING_ANGLE-diff}, 0, ${FOOT_RY})`);
};//»

this.scale=(val)=>{
	cur_scale = val;
	tform(sc_g, `scale(${val})`);
};

}//»
const Scene = function(){//«
let yoff;

//yoff = -3000;
//USE_SCALE = 15;

//yoff = -200;

yoff=100;
USE_SCALE = 0.43;
//USE_SCALE = 2.68;

let bod1 = new Body();
svg.appendChild(bod1.el);
bod1.scale(USE_SCALE);
tform(bod1.el, `translate(600, ${yoff})`);


/*
tor.head.tilt(-30);
setTimeout(()=>{
tor.head.start_shaking(100);
//tor.head.start_nodding(100);
setTimeout(()=>{
tor.head.stop_shaking();
//tor.head.stop_nodding();
tor.head.tilt(0);
},2000);
}, 500);
*/




(async()=>{
bod1.stand();
//return;
//await sleep(0.5);
//bod1.torso.head.start_shaking(50, 4);
//bod1.torso.head.start_shaking(37, 4);
//bod1.torso.head.start_shaking(100, 6);
//await sleep(1);
//bod1.torso.head.stop_shaking();

bod1.start_walking(100, 1.03);

await sleep(6);
await bod1.stop_walking();







//return;
await sleep(1);
bod1.torso.head.tilt(15);
await sleep(0.5);
bod1.torso.head.tilt(0);
await sleep(1);
bod1.torso.head.start_nodding(80, 1);
await sleep(0.6);
bod1.torso.head.stop_nodding();
await sleep(0.5);
bod1.torso.shrug(30);
await sleep(0.175);
bod1.torso.relax_arms();


})();


}//»

new Scene();

//«

this.onresize=()=>{//«

};//»
this.onappinit=async()=>{//«


}//»
this.onkill=()=>{//«
};//»
this.onkeydown=async(e,k)=>{//«
	if (k=="SPACE_"){
	}
	else if (k=="r_"){
	}
	else if (k=="l_"){
	}
};//»
this.onkeyup=(e,k)=>{//«
	if (k=="SPACE_"){
	}
};//»

//»


}




