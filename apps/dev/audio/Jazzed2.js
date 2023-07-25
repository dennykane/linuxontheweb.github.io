
//Imports«

import { util, api as capi } from "/sys/util.js";
import { globals } from "/sys/config.js";
//import { mod as Tone } from "/node/tone/build/Tone.js";

const { log, cwarn, cerr, isnum, make, mkdv } = util;

//»

export const app = function(Win, Desk) {//«

//DOM«

let Main = Win.main;
let statbar = Win.status_bar;
Main._tcol="#ccc";

//»

//Global Var«

let instruments = [];

let ctx = globals.audioCtx || new AudioContext();
globals.audioCtx = ctx;
let outGain = ctx.createGain();
outGain.connect(ctx.destination);

let rafId;
let paused = true;

let midi = globals.midi;

//How long before reset() is called, which changes tempo and beats/measure
//let TOTAL_TIME = 3*60*1000;
let MINS_PER_SONG = 4;
let TOTAL_TIME = MINS_PER_SONG*60*1000;

let BPM = 280;

let BPS;
let SPB;
let BPM_SPREAD = 200;

let MIN_BPM = 60;
let MAX_BPM = 400;

let last_bpm_update;
let going_faster;
let did_reverse;

let BPM_INC = 10;
let MIN_SECS_TO_BPM_UPDATE = 10;
let BPM_CUTOFF = 300;

let real_time_elapsed = 0;
let real_last_time = null;
let do_reset = false;

let last_real_make_measure;

let time_elapsed = 0;
let last_time;
let last_measure = -1;

let add_ms;
let did_add_ms;

let ADD_MS_FACTOR = 2000;
let ADD_MS_THRESHHOLD = 0.975;
//2.5% of the time, add up to SPB * 2000 ms to the middle of a measure that 
//has not had anything added to it.

let MEASURE_LENGTH;
let MIN_MEASURE_LENGTH = 6;

//Maximum length is MIN_MEASURE_LENGTH + MEASURE_LENGTH_FACTOR - 1
let MEASURE_LENGTH_FACTOR = 12;


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

//let gain_queue = [];
let MAX_QUEUE_LENGTH = 60;

let MAJOR_SCALE = [2,2,1,2,2,2,1];
let NATURAL_MINOR_SCALE = [2,1,2,2,1,2,2];
let HARMONIC_MINOR_SCALE = [2,1,2,2,1,3,1];

//»
//Global Funcs«

//Midi«
const midi_handler = e => {//«


let dat = e.data;
let v1 = dat[0]
let v2 = dat[1]
let v3 = dat[2]
if (v1==128){
//	change_key(v2);
}
else if (v1==176){//Knob

if (v2==1){
	outGain.gain.value = v3/127;
}
else if (v2==2) {
//	filterGain.gain.value = v3/127;
}
else if (v2==3){
}
else if(v2 > 4){
//	let v = 6*(v3-63.5)/127;
//	let filt = filters[v2-5];
//	filt.Q.value = 10**v;
}

}

/*«
if (v1==176 && v2 <= 8){//Knob
	if (v2==1){
		gain.gain.value = v3/127;
	}
	else if (v2==2){
		vid.setTimeByPer(v3/127);
	}
	else if(v2 > 4){
		let v = 6*(v3-63.5)/127;
		let filt = filters[v2-5];
		filt.Q.value = 10**v;
	}
}
else{
	if (v1==176){//CC Red
		if (v2 == 24){//Bank A/B Green, pad 1
			if (v3==0){
				if (!vid.paused) vid.pause();
			}
			else {
				if (vid.paused) vid.play();
			}
		}
	}
}
»*/

};//»
const get_midi = () => {//«

let midi;
let midi_cbs=[];
let did_get_midi = false;
let num_midi_inputs = 0;
let did_get_inputs = false;

const Midi = function(){//«
	this.set_cb=(cb)=>{
		midi_cbs.push(cb);
	};
	this.rm_cb=cb=>{
		let ind = midi_cbs.indexOf(cb);
		if (ind < 0) return;
		midi_cbs.splice(cb, 1);
	};
}//»

return new Promise((Y,N)=>{

const midi_in=(mess)=>{//«
	if (!did_get_midi) {
cwarn("Midi UP!");
		did_get_midi = true;
	}
	for (let cb of midi_cbs) {
		cb(mess);
	}
}//»
navigator.requestMIDIAccess({sysex: false}).then(//«
	(midiarg)=>{//«
		function getinputs(e){//«
			if (e) {
				if (e instanceof MIDIConnectionEvent) {
					globals.midi = new Midi();
					Y(true);
				}
				else {
cwarn("WHAT MIDISTATECHANGE EVENT?");
log(e);
				}
			}
			let inputs = midi.inputs.values();
			num_midi_inputs = 0;
			for (let input = inputs.next(); input && !input.done; input = inputs.next()) {
				if (!input.value.name.match(/^Midi Through Port/)) {
					num_midi_inputs++;
					input.value.onmidimessage = midi_in;
				}
			}
			if (num_midi_inputs) {
				if (!did_get_inputs) {
cwarn("MIDI: connected ("+num_midi_inputs+")");
					did_get_inputs = true;
				}
			}
			else {
				for (let cb of midi_cbs) {
//					if (cb) cb({EOF: true});
				}
				midi_cbs = [];
				did_get_inputs = false;
			}
		}//»
		midi = midiarg;
		midi.onstatechange = getinputs;
		getinputs();
	},//»
	(err)=>{
cerr("navitagor.requestMIDIAccess():",err);
Y();
	});

//»

});
}//»
const do_get_midi = async () => {//«
//log("DOGETMIDI");
if (await get_midi()) {
	midi = globals.midi;
	midi.set_cb(midi_handler);
}
else{

cerr("NOPE");

}

};//»
//»

const main_loop = stamp => {//«

//Timing«
let real_diff;
if (real_last_time) {
	real_diff = stamp - real_last_time;
	real_time_elapsed += real_diff;
}

real_last_time = stamp;

if (add_ms){

if (!real_diff){
cerr("HAVE ADD_MS BUT NO REAL_DIFF???");
return;
}

	add_ms -= real_diff;
	if (add_ms > 0){
		rafId = requestAnimationFrame(main_loop);
		return;
	}
	add_ms = 0;
}

stamp *= BPS;

if (last_time) {
	let diff = stamp - last_time;
	time_elapsed += diff;
}
last_time = stamp;
//»

//Beats«
let overall_beatnum = Math.floor(time_elapsed/1000);
let measure_num = Math.floor(overall_beatnum / MEASURE_LENGTH);
let beat_num = overall_beatnum % MEASURE_LENGTH;
//»

if (do_reset || measure_num > last_measure){//«

	did_add_ms = false;

if (do_reset || (real_time_elapsed > TOTAL_TIME)){//«
	reset();
	setTimeout(()=>{
		if (paused) {
			cancelAnimationFrame(rafId);
			return;
		}
		rafId = requestAnimationFrame(main_loop);
//	}, do_reset?1500:3000);
	}, 500);
	do_reset = false;
	return;
}//»

if (!(measure_num % 7)){//«
	for (let inst of instruments){
		inst.update_beats_per_measure_off();
	}
}//»
if (!(measure_num % 13)){//«
	for (let inst of instruments){
		inst.change_key();
	}
}//»
if (!(measure_num % 3)) {//«
	let MIN_TIME_TO_MAKE_MEASURE = 10*1000;
	let use_last = last_real_make_measure || 0;
	let diff = real_time_elapsed - use_last;
	if (!real_time_elapsed || diff > MIN_TIME_TO_MAKE_MEASURE) {
for (let inst of instruments){
inst.make_measure();
}
//		make_measure();
		last_real_make_measure = real_time_elapsed;
	}
	else{
//cwarn("CANNOT MAKE NEW MEASURE");
	}
}//»

/*
if (!(measure_num % 4)){//«
	NOTEDUR_OFF = 0.003 * (-64 + Math.floor(128*Math.random()));
}//»
if (!(measure_num % 8)){//«
	NOTE_OFFSET_OFF = 0.0005 * (-64 + Math.floor(128*Math.random()));
}//»
*/
for (let inst of instruments){
inst.reset_cur_measure();
}
}//»

for (let inst of instruments){
	inst.try_play_beat(beat_num);
}

last_measure = measure_num;
rafId = requestAnimationFrame(main_loop);

};//»

const update_bpm = () => {//«

return;

let now = (new Date().getTime())/1000;

if (last_bpm_update && ((now  - last_bpm_update) < MIN_SECS_TO_BPM_UPDATE)) {
	return;
}
let bpm = 60*BPS;

if (going_faster == false){
	if (bpm < MIN_BPM){
		if (did_reverse){
			do_reset = true;
			return;
		}
		did_reverse = true;
		going_faster = true;
		bpm += BPM_INC;
	}
	else bpm -= BPM_INC;
}
else if (going_faster == true){
	if (bpm > MAX_BPM){
		if (did_reverse){
			do_reset = true;
			return;
		}
		did_reverse = true;
		going_faster = false;
		bpm -= BPM_INC;
	}
	else bpm += BPM_INC;
}
else if (bpm > BPM_CUTOFF){
	if (last_measure === -1) going_faster = false;
	bpm -= BPM_INC;
}
else{
	if (last_measure === -1) going_faster = true;
	bpm += BPM_INC;
}

BPS = bpm/60;
SPB = 1/BPS;

let diff = (real_last_time * BPS) - last_time;
time_elapsed -= diff;

last_bpm_update = now;

//let secs_per_measure = BEATS_PER_MEASURE * 1/BPS;
//log("BPM", bpm);
//log("SECS_PER_MEASURE",secs_per_measure);

};//»
const set_beats_per_sec = () => {//«

///*
	BPS = (BPM + (Math.floor(BPM_SPREAD*Math.random()) - BPM_SPREAD/2 ))/60;
	SPB = 1 / BPS;
//*/

//BPS = 1;
//SPB = 1;

//log(`Tempo: ${60*BPS} bpm`);
//60 s/m b/s
};//»
const mult = (arr, val) => {//«
	let out = [];
	for (let num of arr) out.push(num*val);
	return out;
}//»
const toggle_paused = () => {//«
	if (paused) {
		last_time = null;
		add_ms = 0;
		rafId = requestAnimationFrame(main_loop);
cwarn("!!!!!!!!!!     PLAYING     !!!!!!!!!!")
	}
	else {
		cancelAnimationFrame(rafId);

cwarn("!!!!!!!!!      PAUSED      !!!!!!!!!")
	}
	paused = !paused;
}//»
const reset = () => {//«
//cwarn(`*****     Resetting (${total_note_inserts})     *****`);
//	total_note_inserts = 0;
	real_time_elapsed = 0;
	real_last_time = null;
	time_elapsed = 0;
	last_time = null;
	last_measure = -1;
	did_reverse = false;
	going_faster = null;
	last_bpm_update = null;
//	set_beats_per_measure();
	for (let inst of instruments) {
		inst.set_beats_per_measure();
	}
	set_beats_per_sec();
};//»
const stat_memory = () => {//«
    let mem = window.performance.memory;
    let lim = mem.jsHeapSizeLimit;
    let used = mem.usedJSHeapSize;
    let per = Math.floor(100*used/lim);

    let limmb = Math.round(lim/1048576);
    let usedmb = Math.round(used/1048576);
    statbar.innerHTML=`Memory: ${usedmb}MB/${limmb}MB  (${per}%)`;
};//»
const rfloor=(num)=>{//«
	return Math.floor(num * Math.random());
};//»
const rceil=(num)=>{//«
	return Math.ceil(num * Math.random());
};//»
const init_midi=()=>{//«
	if (midi) midi.set_cb(midi_handler);
	else do_get_midi();
};//»
const init = () => {//«
	instruments.push(new Jazz());
	set_beats_per_sec();
	for (let inst of instruments) {
		inst.set_beats_per_measure();
		inst.make_curves();
	}
	if (window.location.hostname!=="localhost") toggle_paused();
}//»

//»

const Jazz = function() {//«

//Jazz Var«

let NOTEDUR = 0.5;
let NOTEDUR_OFF = 0;
let NOTEDUR_MIN = 0.025;

//The gap between successive notes of a chord
let NOTE_OFFSET = 0.025;
let NOTE_OFFSET_OFF = 0;

let DOUBLET_FACTOR = 0.9;

let BEATS_PER_MEASURE_OFF = 0;

let BEATS_PER_MEASURE;
let BEATS_PER_MEASURE_OFF_RANGE;

//Each measure must have at least 1/3 of its slots filled with a note
let MEASURE_SPARCITY_FACTOR = 2;

//BPM Range: 80 <-> 480
//Raise or lower the BPM and tighten the spread to make the output
//generally faster or slower

let measure = [];
let cur_measure;

let midi_key;

let NUM_OCTAVES = 3;

let MEASURE_NOTE_SPREAD = 20;
let MEASURE_NOTE_SPREAD_OFF_SPREAD = 30;

let KEY_START = 40;
//let KEY_SPREAD = 3;
let KEY_SPREAD = 12;

let CURVE_VALS = [0,0.25,0.20,0.20,0.20,0.10,0];
let DBL_CURVE_VALS = [0,0.25,0.20,0.20,0.20,0.10,0,0.25,0.20,0.20,0.20,0.10,0];

let NUM_EXP_RAMP_ITERS = 10;
let EXP_RAMP_CURVE_VALS=[];
{
	let last = 1;
	for (let i = 0; i < NUM_EXP_RAMP_ITERS; i++){
		EXP_RAMP_CURVE_VALS.unshift(last);
		last/=2;
	}
}

let CURVE_2_FAC = 0.95;
let CURVE_3_FAC = 0.9;
let CURVE_4_FAC = 0.85;
let CURVE_5_FAC = 0.8;

let DOUBLE_NOTE_THRESHHOLD = 0.66;
let TRIPLE_NOTE_THRESHHOLD = 0.8;
let QUAD_NOTE_THRESHHOLD = 0.93;

let CURVE_VALS_1;
let CURVE_VALS_2;
let CURVE_VALS_3;
let CURVE_VALS_4;
let CURVE_VALS_5;

let DBL_CURVE_VALS_1;
let DBL_CURVE_VALS_2;
let DBL_CURVE_VALS_3;
let DBL_CURVE_VALS_4;
let DBL_CURVE_VALS_5;

let which_scale;

let NOTES;
let num_notes;

//let MIN_GAP_TO_INSERT = Infinity;
//let MIN_GAP_TO_INSERT = 5;
let total_note_inserts = 0;

let MIDI_CENTS_FACTOR = 75;
let MIDI_CENTS_FACTOR_HALF = MIDI_CENTS_FACTOR/2;

//WebAudio«

//let TYPE="sawtooth";
let OSC_TYPE="triangle";
//let TYPE="square";
//let TYPE="sine";

let WAVE_GAIN_MULT = 0.33;
let TRI_GAIN_MULT = 0.66;

let wave_gain_mult_1=WAVE_GAIN_MULT,wave_gain_mult_2=WAVE_GAIN_MULT,wave_gain_mult_3=WAVE_GAIN_MULT,wave_gain_mult_4=WAVE_GAIN_MULT,wave_gain_mult_5=WAVE_GAIN_MULT;
let tri_gain_mult_1=TRI_GAIN_MULT,tri_gain_mult_2=TRI_GAIN_MULT,tri_gain_mult_3=TRI_GAIN_MULT,tri_gain_mult_4=TRI_GAIN_MULT,tri_gain_mult_5=TRI_GAIN_MULT;

let wave_gain_vals_1, wave_gain_vals_2, wave_gain_vals_3, wave_gain_vals_4, wave_gain_vals_5;
let tri_gain_vals_1, tri_gain_vals_2, tri_gain_vals_3, tri_gain_vals_4, tri_gain_vals_5;


/*«
let filterGain = ctx.createGain();
filterGain.gain.value = 1.0;
filterGain.connect(ctx.destination);

let filters=[];
let filter_freqs=[
    100,
    200, 
    400, 
    800 
]; 


for (let freq of filter_freqs){
	let filt = ctx.createBiquadFilter();
	filt.type="bandpass";
	filt.frequency.value = freq;
	filt.Q.value = 1;
	filterGain.connect(filt);
	filt.connect(ctx.destination);
	filters.push(filt);
}
»*/

let reals=[0,1];
let imags=[0,0];
//let if_even=true;
let if_even=false;
let if_odd=false;
//let if_odd=true;
//let if_even=true;
let NUM_PERIODIC_COEFS = 4;
for (let i=2; i <= NUM_PERIODIC_COEFS; i++){
	let val = 1/Math.pow((i-1),2);
	if (if_even) reals[i]=i%2?0:val;//Even (Ring)
	else if (if_odd) reals[i]=i%2?val:0;//Odd (Gong)
	else reals[i]=val;
//  reals[i]=1;
    imags[i]=Math.random();
}

//log(reals);
//let real = new Float32Array([0,1,0,0.66,0,0.33,0,0.166]);
//let imag = new Float32Array([0,0,0,0,0,0,0,0]);
let real = new Float32Array(reals);
let imag = new Float32Array(imags);

let WAVE = ctx.createPeriodicWave(real, imag, {disableNormalization: false});

//»

//»
//Nodes«

let o1_wave = ctx.createOscillator();
let o2_wave = ctx.createOscillator();
let o3_wave = ctx.createOscillator();
let o4_wave = ctx.createOscillator();
let o5_wave = ctx.createOscillator();

o1_wave.setPeriodicWave(WAVE);
o2_wave.setPeriodicWave(WAVE);
o3_wave.setPeriodicWave(WAVE);
o4_wave.setPeriodicWave(WAVE);
o5_wave.setPeriodicWave(WAVE);

let o1_tri = ctx.createOscillator();
let o2_tri = ctx.createOscillator();
let o3_tri = ctx.createOscillator();
let o4_tri = ctx.createOscillator();
let o5_tri = ctx.createOscillator();

o1_tri.type = OSC_TYPE;
o2_tri.type = OSC_TYPE;
o3_tri.type = OSC_TYPE;
o4_tri.type = OSC_TYPE;
o5_tri.type = OSC_TYPE;

let g1_wave = ctx.createGain();
let g2_wave = ctx.createGain();
let g3_wave = ctx.createGain();
let g4_wave = ctx.createGain();
let g5_wave = ctx.createGain();

let g1_tri = ctx.createGain();
let g2_tri = ctx.createGain();
let g3_tri = ctx.createGain();
let g4_tri = ctx.createGain();
let g5_tri = ctx.createGain();

o1_wave.start();
o2_wave.start();
o3_wave.start();
o4_wave.start();
o5_wave.start();

o1_tri.start();
o2_tri.start();
o3_tri.start();
o4_tri.start();
o5_tri.start();

/*
{
	let r = Math.random();
	if (r > 0.66) {
		o4_wave.start();
		o4_tri.start();
	}
}
{
	let r = Math.random();
	if (r > 0.9) {
		o5_wave.start();
		o5_tri.start();
	}
}
*/

g1_wave.connect(outGain);
g2_wave.connect(outGain);
g3_wave.connect(outGain);
g4_wave.connect(outGain);
g5_wave.connect(outGain);

o1_wave.connect(g1_wave);
o2_wave.connect(g2_wave);
o3_wave.connect(g3_wave);
o4_wave.connect(g4_wave);
o5_wave.connect(g5_wave);


g1_tri.connect(outGain);
g2_tri.connect(outGain);
g3_tri.connect(outGain);
g4_tri.connect(outGain);
g5_tri.connect(outGain);

o1_tri.connect(g1_tri);
o2_tri.connect(g2_tri);
o3_tri.connect(g3_tri);
o4_tri.connect(g4_tri);
o5_tri.connect(g5_tri);

g1_wave.gain.value=0;
g2_wave.gain.value=0;
g3_wave.gain.value=0;
g4_wave.gain.value=0;
g5_wave.gain.value=0;

g1_tri.gain.value=0;
g2_tri.gain.value=0;
g3_tri.gain.value=0;
g4_tri.gain.value=0;
g5_tri.gain.value=0;


//»

const CHECK_NOTE = use_note => {//«
	return (NOTES[use_note] && NOTES[use_note+2] && NOTES[use_note+4] && NOTES[use_note+6] && NOTES[use_note+8])
}//»
const log_measure = (say_beats) => {//«
	let use = [];
	let s='';
	for (let i=0; i < MEASURE_LENGTH; i++) {
		let n = measure[i];
		if (n === null) {
			use.push(`[${i+1}]`);
		}
		else if (n === "-") use.push(n);
		else {
			use.push(NOTES[parseInt(n)]);
		}
	}
log(`TimeSig: ${say_beats}/${MEASURE_LENGTH}`);
log(use.join("  "));
}//»

this.make_measure = () => {//«

//«

let got_beats = 0;

let use_beats_per_measure = BEATS_PER_MEASURE + BEATS_PER_MEASURE_OFF;
let min_beats = Math.ceil(MEASURE_LENGTH/MEASURE_SPARCITY_FACTOR);
if (use_beats_per_measure < min_beats) use_beats_per_measure = min_beats;

let measure_note_spread_off =  Math.floor(MEASURE_NOTE_SPREAD_OFF_SPREAD*Math.random()) - Math.round(MEASURE_NOTE_SPREAD_OFF_SPREAD/2);
let use_measure_note_spread = MEASURE_NOTE_SPREAD + measure_note_spread_off;

measure = [];
for (let i=0; i < MEASURE_LENGTH; i++) measure[i] = null;

//»

let skips = [];
while (got_beats < use_beats_per_measure){

	let n = Math.floor(MEASURE_LENGTH * Math.random());
	let fac = 4/(5+n);
//	if (Math.random() > fac) continue;
	if (measure[n] !== null || skips.includes(n)) continue;

	let try_note;
	do {
		try_note = Math.floor(Math.random() * use_measure_note_spread);
	}
	while (!CHECK_NOTE(try_note));

	{
		let r = Math.random();
		if (r > DOUBLE_NOTE_THRESHHOLD && n < MEASURE_LENGTH - 1 && measure[n+1] === null){
			got_beats++;
			measure[n] = `${try_note}.0`;
			measure[n+1] = "-";
			skips.push(n+1);
			if (r > TRIPLE_NOTE_THRESHHOLD && n < MEASURE_LENGTH - 2 && measure[n+2] === null){
				got_beats++;
				measure[n]+="0";
				measure[n+2] = "-";
				skips.push(n+2);
				if (r > QUAD_NOTE_THRESHHOLD && n < MEASURE_LENGTH - 3 && measure[n+3] === null){
					got_beats++;
					measure[n]+="0";
					measure[n+3] = "-";
					skips.push(n+3);
				}
			}
		}
		else measure[n] = `${try_note}`;
	}
	got_beats++;

}
//log(measure);
log_measure(got_beats);

};//»
this.set_beats_per_measure = () => {//«

	MEASURE_LENGTH = MIN_MEASURE_LENGTH + Math.floor(MEASURE_LENGTH_FACTOR*Math.random());
	BEATS_PER_MEASURE = Math.ceil(MEASURE_LENGTH/2);
	BEATS_PER_MEASURE_OFF_RANGE = Math.floor(0.75*MEASURE_LENGTH);

};//»
this.change_key=()=>{//«
	midi_key = KEY_START+Math.floor(KEY_SPREAD*Math.random());
	NOTES = [];
	let scale;
	let rand = Math.random();
	if (rand < 0.66) {
		scale = MAJOR_SCALE;
		which_scale = "Maj";
	}
	else if (rand < 0.92) {
		scale = NATURAL_MINOR_SCALE;
		which_scale = "Nat";
	}
	else {
		scale = HARMONIC_MINOR_SCALE;
		which_scale = "Harm";
	}
	let start = midi_key;
//log(`Scale: ${MIDI_TO_NOTE[start]} ${which_scale}`);

	for (let i=0; i < 7*NUM_OCTAVES; i++){
		NOTES.push(MIDI_TO_NOTE[start]);
		start+=scale[i%7];
	}
	num_notes = NOTES.length;
};//»
this.make_curves = () => {//«

	CURVE_VALS_1 = CURVE_VALS;
	CURVE_VALS_2 = mult(CURVE_VALS, CURVE_2_FAC);
	CURVE_VALS_3 = mult(CURVE_VALS, CURVE_3_FAC);
	CURVE_VALS_4 = mult(CURVE_VALS, CURVE_4_FAC);
	CURVE_VALS_5 = mult(CURVE_VALS, CURVE_5_FAC);
	
	DBL_CURVE_VALS_1 = DBL_CURVE_VALS;
	DBL_CURVE_VALS_2 = mult(DBL_CURVE_VALS, CURVE_2_FAC);
	DBL_CURVE_VALS_3 = mult(DBL_CURVE_VALS, CURVE_3_FAC);
	DBL_CURVE_VALS_4 = mult(DBL_CURVE_VALS, CURVE_4_FAC);
	DBL_CURVE_VALS_5 = mult(DBL_CURVE_VALS, CURVE_5_FAC);

};//»
this.update_beats_per_measure_off=()=>{//«
	BEATS_PER_MEASURE_OFF = Math.floor(BEATS_PER_MEASURE_OFF_RANGE*Math.random()) - Math.floor(BEATS_PER_MEASURE_OFF_RANGE/2);
};//»
this.reset_cur_measure=()=>{//«
	cur_measure = [];
	for (let i=0; i < MEASURE_LENGTH; i++) {
		cur_measure.push(0);
	}
};//»
this.try_play_beat=beat_num=>{//«


if (cur_measure[beat_num]){//«
//	last_measure = measure_num;
//	rafId = requestAnimationFrame(main_loop);
	return;
}//»

/*
if (measure_num > last_measure){//«
	update_bpm();
}//»
*/

let num = measure[beat_num];

if (num === null || num === "-"){//«
//	while (gain_queue.length > MAX_QUEUE_LENGTH){
//		let g = gain_queue.shift();
//		g.disconnect();
//	}
	cur_measure[beat_num] = 1;
//	last_measure = measure_num;
//	rafId = requestAnimationFrame(main_loop);
	return;
}//»

//Long notes are indicated by the number of trailing zeros«
let num_zeros = 0;
if (num.match(/\./)) {
	num_zeros = num.split(".")[1].length;
}
//»

num = parseInt(num);

/*
if (!did_add_ms && MEASURE_LENGTH > 4 && beat_num > 1 && beat_num < MEASURE_LENGTH - 2){//«
//If in the middle of a decent sized measure, and there hasn't already been a break...
	if (Math.random() > ADD_MS_THRESHHOLD){
		did_add_ms = true;
		add_ms = SPB * ADD_MS_FACTOR * Math.random();
//cwarn(`ADD_MS(${measure_num},${beat_num+1}/${MEASURE_LENGTH}): ${add_ms}`);
		rafId = requestAnimationFrame(main_loop);
		return;
	}
}//»
*/

//Note duration/Chord strum offset«

let usenotedur = SPB;
usenotedur *= num_zeros + 1;
let usenoteoff = NOTE_OFFSET + NOTE_OFFSET_OFF;
if (usenoteoff < 0) usenoteoff = 0;

//»

let n1 = NOTES[num];
let n2 = NOTES[num+2];
let n3 = NOTES[num+4];
let n4 = NOTES[num+6];
let n5 = NOTES[num+8];

let m1 = NOTE_TO_MIDI[n1];
let m2 = NOTE_TO_MIDI[n2];
let m3 = NOTE_TO_MIDI[n3];
let m4 = NOTE_TO_MIDI[n4];
let m5 = NOTE_TO_MIDI[n5];

//Chord changes«

{
	let r = Math.random();
	if (r > 0.5) {
		m5 -= 12;
		if (r > 0.75){
			m4-=12;
			if (r > 0.9) {
				m3-=12;
				if (r > 0.975) m2 -= 12;
			}
		}
	}
}
if (which_scale === "Maj"){
	let r = Math.random();
	if (r > 0.75) {
		m4-=1;
	}
}

{
	let r = Math.random();
	if (r > 0.975) m1+=1;
	else if (r < 0.025) m1-=1;
}

{
	let r = Math.random();
	if (r > 0.975) m2+=1;
	else if (r < 0.025) m2-=1;
}

{
	let r = Math.random();
	if (r > 0.99) {
		m3-=1;//Tritone
	}
}

{
	let r = Math.random();
	if (r > 0.95) {
		m1+=12;
	}
}
//»

//Get freqs from MIDICENTS«

let mc1 = m1*100;
let f1 = MIDICENTS[mc1]/100;
let mc2 = m2*100;
let f2 = MIDICENTS[mc2]/100;
let mc3 = m3*100;
let f3 = MIDICENTS[mc3]/100;
let mc4 = m4*100;
let f4 = MIDICENTS[mc4]/100;
let mc5 = m5*100;
let f5 = MIDICENTS[mc5]/100;

//»

//Set values and connect«

o1_wave.frequency.value = f1;
o2_wave.frequency.value = f2;
o3_wave.frequency.value = f3;
o4_wave.frequency.value = f4;
o5_wave.frequency.value = f5;

o1_tri.frequency.value = f1;
o2_tri.frequency.value = f2;
o3_tri.frequency.value = f3;
o4_tri.frequency.value = f4;
o5_tri.frequency.value = f5;

//»

let tm = ctx.currentTime+.017;

//Get/Set gain curves//«

if (usenotedur > 0.399 && Math.random() > DOUBLET_FACTOR){//«
///*
	wave_gain_vals_1 = mult(DBL_CURVE_VALS, wave_gain_mult_1);
	wave_gain_vals_2 = mult(DBL_CURVE_VALS, wave_gain_mult_2);
	wave_gain_vals_3 = mult(DBL_CURVE_VALS, wave_gain_mult_3);
	wave_gain_vals_4 = mult(DBL_CURVE_VALS, wave_gain_mult_4);
	wave_gain_vals_5 = mult(DBL_CURVE_VALS, wave_gain_mult_5);

	tri_gain_vals_1 = mult(DBL_CURVE_VALS, tri_gain_mult_1);
	tri_gain_vals_2 = mult(DBL_CURVE_VALS, tri_gain_mult_2);
	tri_gain_vals_3 = mult(DBL_CURVE_VALS, tri_gain_mult_3);
	tri_gain_vals_4 = mult(DBL_CURVE_VALS, tri_gain_mult_4);
	tri_gain_vals_5 = mult(DBL_CURVE_VALS, tri_gain_mult_5);
//*/
}//»
else{//«

//HRYKOPEMNH
//bend up/down
/*
//if (num_zeros > 1){
	if (true){//«

		let diff = 50;//Negative makes the bend downwards

		let f1_off = MIDICENTS[mc1+diff]/100;
		let f1_diff = f1_off - f1;
		let exp_curve_1 = mult(EXP_RAMP_CURVE_VALS, f1_diff);
		for (let i=0; i < exp_curve_1.length; i++) exp_curve_1[i]+=f1;
		o1_wave.frequency.setValueCurveAtTime(exp_curve_1, tm, usenotedur);
		o1_tri.frequency.setValueCurveAtTime(exp_curve_1, tm, usenotedur);

		let f2_off = MIDICENTS[mc2+diff]/100;
		let f2_diff = f2_off - f2;
		let exp_curve_2 = mult(EXP_RAMP_CURVE_VALS, f2_diff);
		for (let i=0; i < exp_curve_2.length; i++) exp_curve_2[i]+=f2;
		o2_wave.frequency.setValueCurveAtTime(exp_curve_2, tm, usenotedur);
		o2_tri.frequency.setValueCurveAtTime(exp_curve_2, tm, usenotedur);

		let f3_off = MIDICENTS[mc3+diff]/100;
		let f3_diff = f3_off - f3;
		let exp_curve_3 = mult(EXP_RAMP_CURVE_VALS, f3_diff);
		for (let i=0; i < exp_curve_3.length; i++) exp_curve_3[i]+=f3;
		o3_wave.frequency.setValueCurveAtTime(exp_curve_3, tm, usenotedur);
		o3_tri.frequency.setValueCurveAtTime(exp_curve_3, tm, usenotedur);

		let f4_off = MIDICENTS[mc4+diff]/100;
		let f4_diff = f4_off - f4;
		let exp_curve_4 = mult(EXP_RAMP_CURVE_VALS, f4_diff);
		for (let i=0; i < exp_curve_4.length; i++) exp_curve_4[i]+=f4;
		o4_wave.frequency.setValueCurveAtTime(exp_curve_4, tm, usenotedur);
		o4_tri.frequency.setValueCurveAtTime(exp_curve_4, tm, usenotedur);

		let f5_off = MIDICENTS[mc5+diff]/100;
		let f5_diff = f5_off - f5;
		let exp_curve_5 = mult(EXP_RAMP_CURVE_VALS, f5_diff);
		for (let i=0; i < exp_curve_5.length; i++) exp_curve_5[i]+=f5;
		o5_wave.frequency.setValueCurveAtTime(exp_curve_5, tm, usenotedur);
		o5_tri.frequency.setValueCurveAtTime(exp_curve_5, tm, usenotedur);

	}//»
*/

///*
	wave_gain_vals_1 = mult(CURVE_VALS, wave_gain_mult_1);
	wave_gain_vals_2 = mult(CURVE_VALS, wave_gain_mult_2);
	wave_gain_vals_3 = mult(CURVE_VALS, wave_gain_mult_3);
	wave_gain_vals_4 = mult(CURVE_VALS, wave_gain_mult_4);
	wave_gain_vals_5 = mult(CURVE_VALS, wave_gain_mult_5);

	tri_gain_vals_1 = mult(CURVE_VALS, tri_gain_mult_1);
	tri_gain_vals_2 = mult(CURVE_VALS, tri_gain_mult_2);
	tri_gain_vals_3 = mult(CURVE_VALS, tri_gain_mult_3);
	tri_gain_vals_4 = mult(CURVE_VALS, tri_gain_mult_4);
	tri_gain_vals_5 = mult(CURVE_VALS, tri_gain_mult_5);
//*/
}
//»

/*«
g1_wave.gain.cancelScheduledValues(tm);
g2_wave.gain.cancelScheduledValues(tm);
g3_wave.gain.cancelScheduledValues(tm);

g1_tri.gain.cancelScheduledValues(tm);
g2_tri.gain.cancelScheduledValues(tm);
g3_tri.gain.cancelScheduledValues(tm);
*/
/*
let use_att_fac = SPB/2;
let use_dec_fac = SPB/2;
let use_div = 2;

g1_wave.gain.setTargetAtTime(0.33/2, tm, use_att_fac);
g2_wave.gain.setTargetAtTime(0.25/2, tm, use_att_fac);
g3_wave.gain.setTargetAtTime(0.17/2, tm, use_att_fac);
//g4_wave.gain.setTargetAtTime(1, tm+3*usenoteoff, 0.1);
//g5_wave.gain.setTargetAtTime(1, tm+4*usenoteoff, 0.1);

g1_wave.gain.setTargetAtTime(0, tm+usenotedur/use_div, use_dec_fac);
g2_wave.gain.setTargetAtTime(0, tm+usenotedur/use_div, use_dec_fac);
g3_wave.gain.setTargetAtTime(0, tm+usenotedur/use_div, use_dec_fac);
//g4_wave.gain.setTargetAtTime(0, tm+3*usenoteoff+usenotedur, 0.1);
//g5_wave.gain.setTargetAtTime(0, tm+4*usenoteoff+usenotedur, 0.1);


g1_tri.gain.setTargetAtTime(0.33, tm, use_att_fac);
g2_tri.gain.setTargetAtTime(0.25, tm, use_att_fac);
g3_tri.gain.setTargetAtTime(0.17, tm, use_att_fac);
//g4_tri.gain.setTargetAtTime(1, tm+3*usenoteoff, 0.1);
//g5_tri.gain.setTargetAtTime(1, tm+4*usenoteoff, 0.1);

g1_tri.gain.setTargetAtTime(0, tm+usenotedur/use_div, use_dec_fac);
g2_tri.gain.setTargetAtTime(0, tm+usenotedur/use_div, use_dec_fac);
g3_tri.gain.setTargetAtTime(0, tm+usenotedur/use_div, use_dec_fac);

//g4_tri.gain.setTargetAtTime(0, tm+3*usenoteoff+usenotedur, 0.1);
//g5_tri.gain.setTargetAtTime(0, tm+4*usenoteoff+usenotedur, 0.1);
»*/

///*
/*
g1_wave.gain.setValueCurveAtTime(wave_gain_vals_1, tm, usenotedur);
g2_wave.gain.setValueCurveAtTime(wave_gain_vals_2, tm+usenoteoff, usenotedur);
g3_wave.gain.setValueCurveAtTime(wave_gain_vals_3, tm+2*usenoteoff, usenotedur);
g4_wave.gain.setValueCurveAtTime(wave_gain_vals_4, tm+3*usenoteoff, usenotedur);
g5_wave.gain.setValueCurveAtTime(wave_gain_vals_5, tm+4*usenoteoff, usenotedur);
*/

if (g1_tri._will_end) {
let diff = g1_tri._will_end - tm;
if (diff > 0){
//log(diff);
tm+=diff;
}
}
usenoteoff=0;
g1_tri._will_end = tm + usenotedur;
g1_tri.gain.setValueCurveAtTime(tri_gain_vals_1, tm, usenotedur);
g2_tri.gain.setValueCurveAtTime(tri_gain_vals_2, tm+usenoteoff, usenotedur);
g3_tri.gain.setValueCurveAtTime(tri_gain_vals_3, tm+2*usenoteoff, usenotedur);
g4_tri.gain.setValueCurveAtTime(tri_gain_vals_4, tm+3*usenoteoff, usenotedur);
g5_tri.gain.setValueCurveAtTime(tri_gain_vals_5, tm+4*usenoteoff, usenotedur);

//*/

//»

//Cleanup«

//gain_queue.push(g1_wave, g2_wave, g3_wave, g4_wave, g4_wave);
//gain_queue.push(g1_tri, g2_tri, g3_tri, g4_tri, g4_tri);

cur_measure[beat_num] = 1;

//»

};//»

}//»

//OBJ/CB«

this.onresize=()=>{//«
};//»
this.onappinit=()=>{//«
}//»
this.onkill=()=>{//«

//filterGain.disconnect();
cancelAnimationFrame(rafId);
outGain.disconnect();
midi && midi.rm_cb(midi_handler);

};//»
this.onkeydown=(e,k)=>{//«

if (k=="SPACE_"){
	toggle_paused();
}
else if(k=="n_"){
	do_reset = true;
}
else if (k=="m_"){
	init_midi();
}

};//»

//»

init();


}//»







/*Attempt to do "smoothing" between notes that have a gap between them«
	let use_note;
	if (Math.random() > 0.5 && got_beats > 1 && n > 0 && n < MEASURE_LENGTH-1){//«
		let got_prev=-1, got_next=-1;
		for (let i=n-1; i >= 0; i--){
			if (measure[i] !== null){
				got_prev = i;
				break;
			}
		}
		for (let i=n+1; i < MEASURE_LENGTH; i++){
			if (measure[i] !== null){
				got_next = i;
				break;
			}
		}
		if(got_prev > -1 && got_next > -1){
			let gap = got_next - got_prev;
			if (gap <= MIN_GAP_TO_INSERT){
				let prev_val = measure[got_prev];
				prev_val = parseInt(prev_val);
				let next_val = measure[got_next];
				next_val = parseInt(next_val);

				let n1 = NOTE_TO_MIDI[NOTES[prev_val]];
				let n2 = NOTE_TO_MIDI[NOTES[next_val]];
//				let midi_num = Math.floor(Math.random() * (n1+n2));
				let midi_num = Math.floor((n1+n2)/2);
				use_note = midi_num - midi_key;
			}
		}
	}//»
	if (use_note){//«
		if (CHECK(use_note)){
			measure[n] = `${use_note}`;
			got_beats++;
			total_note_inserts++;
			continue;
		}
	}//»
»*/

/*//«
let SEQUENCE_FACTOR = 100;
let do_sequence = 100*Math.random() > SEQUENCE_FACTOR;
let num_seq_notes = null;
if (do_sequence){//«
log("***     Sequence     ***");
let KEY;

if (Math.random() > 0.75 && CHECK(18)) KEY = 14;
else if (CHECK(11)) KEY = 7;
else KEY = 0;

let last;
let POSKEY = KEY > 0;
let DBLPOSKEY = KEY > 7;

num_seq_notes = 0;
for (let i=0; i < MEASURE_LENGTH; i++){
	let r = Math.random();
	let note = null;

	if (!(i%2)) {//«
		if (i===0 || (r > 0.5)) {
			if (POSKEY && r > 0.75) {
				if (DBLPOSKEY && r > 0.92) note = KEY - 14;
				else note = KEY - 7;
			}
			else note = KEY;
		}
		else if (r > 0.25) {
			if (r > 0.225 && CHECK(KEY+14)) note = KEY + 14;
			else if (CHECK(KEY+7)) {
				note = KEY+7;
			}
		}
		else {
			if (r > 0.125){
				if (r > 0.20 && CHECK(KEY+9)) note = KEY + 9;
				else if (POSKEY) note = KEY - 5;
			}
			else {
				if (r > 0.085 && CHECK(KEY+11)) note = KEY + 11;
				else if (POSKEY) note = KEY - 3;
			}
		}
	}//»

	else if (i==1){//«
		if (r > 0.8) note = KEY+3;
		else if (r > 0.5 && POSKEY) note = KEY - 4;
	}//»
	else if (i==MEASURE_LENGTH-1){//«
		if (r > 0.75 && CHECK(KEY+6)) {
			measure [i] = KEY+6;
		}
		else if (POSKEY) note = KEY - 1;
	}//»

	else if (!(i%3)) {//«
		if (r > 0.5) {
			if (r > 0.8) note = KEY+4;
			else if (POSKEY) note = KEY - 3;
		}
		else note = KEY+2;
	}//»
	else if (!(i%4)){//«
		if (r > 0.75) {
			if (CHECK(KEY+6)) note = KEY+6;
		}
		else if (r > 0.6) note = KEY+1;
		else if (POSKEY) note = KEY-6;
	}//»

	if (note != null) num_seq_notes++;
	last = note;
	measure[i] = note;
	
}
log_measure(num_seq_notes);
//«Scales: Up then down
//while (got_beats < use_beats_per_measure){
//	let n = got_beats;
//	let try_note = n;
//	measure[n] = try_note;
//	got_beats++;
//}
//let got_end_beats = 0;
//let first_beats = got_beats;
//while (got_beats < MEASURE_LENGTH){
//	measure[got_beats] = first_beats - got_end_beats;
//	got_end_beats++;
//	got_beats++;
//
//}
//»
}//»

»*/

