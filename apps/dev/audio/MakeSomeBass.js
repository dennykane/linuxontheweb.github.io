import { util, api as capi } from "/sys/util.js";
import { globals } from "/sys/config.js";

const { log, cwarn, cerr, isnum, make, mkdv } = util;
const {NS} = globals;
const fsapi = NS.api.fs;

export const app=function(Win, Desk){

let ctx = globals.audioCtx || new AudioContext();
globals.audioCtx = ctx;

let NOTE_TO_MIDI={};
let MIDI_TO_NOTE=[];
const MIDINOTES=(()=>{//«
//const noteToFreq=note=>{
//    let a = 440; //frequency of A (common value is 440Hz)
//    return (a / 32) * (2 ** ((note - 9) / 12));
//} 
	let arr = [];
	for (let i=0; i < 128; i++) arr[i]=13.75*(2**((i-9)/12));
	return arr;
})();//»
const MIDICENTS=(()=>{//«
//const noteToFreq=note=>{
//    let a = 440; //frequency of A (common value is 440Hz)
//    return (a / 32) * (2 ** ((note - 9) / 12));
//} 
	let arr = [];
	for (let i=0; i < 12800; i++) arr[i]=1375*(2**((i-900)/1200));
	return arr;
})();//»
const NOTEMAP=(()=>{//«
	let notes=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
	let obj = {};
	let iter=0;
	OUTERLOOP: for (let j=-1; j <= 9; j++){
		for (let i=0; i < notes.length; i++){
			if (iter>127) break OUTERLOOP;
			let n = notes[i];
			let s = `${n}${j}`;
			let v = MIDINOTES[iter];
			obj[s] = v;
			MIDI_TO_NOTE[iter] = s;
			NOTE_TO_MIDI[s]=iter;
			if (n=="C#") {
				obj[`Db${j}`]=v;
				NOTE_TO_MIDI[`Db${j}`]=iter;
			}
			else if (n=="D#") {
				obj[`Eb${j}`]=v;
				NOTE_TO_MIDI[`Eb${j}`]=iter;
			}
			else if (n=="F#") {
				obj[`Gb${j}`]=v;
				NOTE_TO_MIDI[`Gb${j}`]=iter;
			}
			else if (n=="G#") {
				obj[`Ab${j}`]=v;
				NOTE_TO_MIDI[`Ab${j}`]=iter;
			}
			else if (n=="A#") {
				obj[`Bb${j}`]=v;
				NOTE_TO_MIDI[`Bb${j}`]=iter;
			}
			else if (n=="E") {
				obj[`Fb${j}`] = v;
				NOTE_TO_MIDI[`Fb${j}`]=iter;
			}
			else if (n=="F") {
				obj[`E#${j}`] = v;
				NOTE_TO_MIDI[`E#${j}`]=iter;
			}
			else if (n=="C") {
				obj[`B#${j}`] = MIDINOTES[iter+12];
				NOTE_TO_MIDI[`B#${j}`]=iter+12;
			}
			else if (n=="B") {
				obj[`Cb${j}`] = MIDINOTES[iter-12];
				NOTE_TO_MIDI[`Cb${j}`]=iter-12;
			}
			iter++;
		}
	}
	return obj;
})();//»

const dist = ctx.createWaveShaper();
let conv = ctx.createConvolver();

const makeDistortionCurve=(amount)=>{//«
	let k = typeof amount === "number" ? amount : 50;
	let n_samples = 44100;
	let curve = new Float32Array(n_samples);
	let deg = Math.PI / 180;

	for (let i = 0; i < n_samples; i++) {
		let x = (i * 2) / n_samples - 1;
		curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
	}
//log(curve);
	return curve;
}//»

dist.curve = makeDistortionCurve(5);
//distortion.oversample = "4x";


let bqf = ctx.createBiquadFilter();
bqf.type="lowpass";
bqf.frequency.value=300;
bqf.Q.value=1000;

//log(NOTE_TO_MIDI["C2"]);

//let f1 = NOTEMAP["C2"];
//let f2 = NOTEMAP["C3"];
//let f3 = NOTEMAP["G3"];
//let f4 = NOTEMAP["G4"];
//log(MIDINOTES[m1], f1);

let o1 = ctx.createOscillator();
let o2 = ctx.createOscillator();
let o3 = ctx.createOscillator();
let o4 = ctx.createOscillator();


let TYPE="sine";
o1.type=TYPE;
o2.type=TYPE;
o3.type=TYPE;
o4.type=TYPE;

let g1 = ctx.createGain();
let g2 = ctx.createGain();
let g3 = ctx.createGain();
let g4 = ctx.createGain();

g1.gain.value=0;
g2.gain.value=0;
g3.gain.value=0;
g4.gain.value=0;

o1.connect(g1);
o2.connect(g2);
o3.connect(g3);
o4.connect(g4);

o1.start();
o2.start();
o3.start();
o4.start();

let outGain = ctx.createGain();
/*
g1.connect(dist);
g2.connect(dist);
g3.connect(dist);
g4.connect(dist);
dist.connect(outGain);
*/
///*
g1.connect(outGain);
g2.connect(outGain);
g3.connect(outGain);
g4.connect(outGain);
//*/
//dist.connect(outGain);
outGain.connect(ctx.destination);
//g1.connect(bqf);
//g2.connect(bqf);
//g3.connect(bqf);
//g4.connect(bqf);

//bqf.connect(outGain);


//«
const init=async()=>{

let buff = (await fsapi.readFile("/home/me/Desktop/tenniscourt.wav")).buffer;
ctx.decodeAudioData(buff,rv=>{
conv.buffer = rv;
conv.loop = false;
conv.normalize = true;

dist.connect(conv);
conv.connect(outGain);
outGain.connect(ctx.destination);

});
//log(rv.buffer);
};
//»

const mult = (arr, val) => {//«
	let out = [];
	for (let num of arr) out.push(num*val);
//log(out);
	return out;
}//»
const play=(m1)=>{//«

//let bass_note = "C2";
//let m1 = NOTE_TO_MIDI[bass_note];
//log(m1);
let m2 = m1+12;
let m3 = m1+19
let m4 = m1+31;
let f1 = MIDICENTS[m1*100]/100;
let f2 = MIDICENTS[m2*100]/100;
let f3 = MIDICENTS[m3*100]/100;
let f4 = MIDICENTS[m4*100]/100;

o1.frequency.value=f1;
o2.frequency.value=f2;
o3.frequency.value=f3;
o4.frequency.value=f4;

let now = ctx.currentTime;

let ATTACK_FACTOR = 1/100;
let DECAY_FACTOR = 0.25;
let ADD_SECS = 0.1;

g1.gain.setTargetAtTime(0.33, now, ATTACK_FACTOR);
g2.gain.setTargetAtTime(0.33/2, now, ATTACK_FACTOR);
g3.gain.setTargetAtTime(0.33/3, now, ATTACK_FACTOR);
//g4.gain.setTargetAtTime(0.33/128, now, ATTACK_FACTOR);

g1.gain.setTargetAtTime(0, now+ADD_SECS, DECAY_FACTOR);
g2.gain.setTargetAtTime(0, now+ADD_SECS, DECAY_FACTOR);
g3.gain.setTargetAtTime(0, now+ADD_SECS, DECAY_FACTOR);
//g4.gain.setTargetAtTime(0, now+ADD_SECS, DECAY_FACTOR);



};//»

this.onkeydown=(e,k)=>{//«
let marr;
if (k==="SPACE_"){

play(50);

}
else if (marr = k.match(/(^[0-9])_/)){

//let bass_note = "C2";
//let m1 = NOTE_TO_MIDI[bass_note];
//log(m1);
let MAJOR=[2,2,1,2,2,2,1,2,2,1,2,2,2,1];
let bass_note = 30;
let donum=parseInt(marr[1]);
let n = bass_note;
for (let i=0; i < donum; i++) n+=MAJOR[i];
//log(n);
play(n);

}

}//»

this.onkill=()=>{//«
outGain.disconnect();
}//»
//this.onappinit=init;


}


