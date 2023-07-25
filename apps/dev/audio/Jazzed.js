
//Imports«

import { util, api as capi } from "/sys/util.js";
import { globals } from "/sys/config.js";

const { log, cwarn, cerr, isnum, make, mkdv } = util;

//»

export const app = function(Win, Desk) {//«

//Var«

let rafId;
let paused = true;

let midi = globals.midi;

//How long before reset() is called, which changes tempo and beats/measure
//let TOTAL_TIME = 3*60*1000;
let TOTAL_TIME = 60*1000;

let NOTEDUR = 0.3;
let NOTEDUR_OFF = 0;
let NOTEDUR_MIN = 0.025;

//The gap between successive notes of a chord
let NOTE_OFFSET = 0.025;
let NOTE_OFFSET_OFF = 0;

let MEASURE_LENGTH;
let BEATS_PER_MEASURE_OFF = 0;

let BEATS_PER_MEASURE;
let BEATS_PER_MEASURE_OFF_RANGE;

//Each measure must have at least 1/3 of its slots filled with a note
let MEASURE_SPARCITY_FACTOR = 3;

//BPM Range: 80 <-> 480
//Raise or lower the BPM and tighten the spread to make the output
//generally faster or slower
let BPM = 280;

let BPS;
let SPB;
let BPM_SPREAD = 400;

let ADD_MS_FACTOR = 5000;

let measure = [];
let cur_measure;

let real_time_elapsed = 0;
let real_last_time = null;
let do_reset = false;

let last_real_make_measure;

let time_elapsed = 0;
let last_time;
let last_measure = -1;

let add_ms;
let did_add_ms;

let midi_key;

let NUM_OCTAVES = 3;

let MEASURE_NOTE_SPREAD = 20;
let MEASURE_NOTE_SPREAD_OFF_SPREAD = 30;

let KEY_START = 26;
let KEY_SPREAD = 30;

let CURVE_VALS = [0,0.25,0.20,0.20,0.20,0.10,0];
let DBL_CURVE_VALS = [0,0.25,0.20,0.20,0.20,0.10,0,0.25,0.20,0.20,0.20,0.10,0];

let CURVE_VALS_1;
let CURVE_VALS_2;
let CURVE_VALS_3;
let CURVE_VALS_4;

let DBL_CURVE_VALS_1;
let DBL_CURVE_VALS_2;
let DBL_CURVE_VALS_3;
let DBL_CURVE_VALS_4;

let MAJOR_SCALE = [2,2,1,2,2,2,1];
let NATURAL_MINOR_SCALE = [2,1,2,2,1,2,2];
let HARMONIC_MINOR_SCALE = [2,1,2,2,1,3,1];

let NOTES;
let num_notes;

let MIN_GAP_TO_INSERT = Infinity;
//let MIN_GAP_TO_INSERT = 5;
let total_note_inserts = 0;

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

let gain_queue = [];
let MAX_QUEUE_LENGTH = 60;
//WebAudio«

let ctx = globals.audioCtx || new AudioContext();
globals.audioCtx = ctx;

//let TYPE="sawtooth";
let TYPE="triangle";
//let TYPE="square";
//let TYPE="sine";

let outGain = ctx.createGain();
outGain.connect(ctx.destination);

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

//»

//»
//DOM«

let Main = Win.main;
let statbar = Win.status_bar;
Main._tcol="#ccc";

//»

//Funcs«

const main_loop = stamp => {//«

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

let overall_beatnum = Math.floor(time_elapsed/1000);
let measure_num = Math.floor(overall_beatnum / MEASURE_LENGTH);
let beat_num = overall_beatnum % MEASURE_LENGTH;

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
	BEATS_PER_MEASURE_OFF = Math.floor(BEATS_PER_MEASURE_OFF_RANGE*Math.random()) - Math.floor(BEATS_PER_MEASURE_OFF_RANGE/2);
}//»
if (!(measure_num % 13)){//«
	midi_key = KEY_START+Math.floor(KEY_SPREAD*Math.random());
	change_key();
}//»
if (!(measure_num % 3)) {//«
	let MIN_TIME_TO_MAKE_MEASURE = 10*1000;
	let use_last = last_real_make_measure || 0;
	let diff = real_time_elapsed - use_last;
	if (!real_time_elapsed || diff > MIN_TIME_TO_MAKE_MEASURE) {
		make_measure();
		last_real_make_measure = real_time_elapsed;
	}
	else{
//cwarn("CANNOT MAKE NEW MEASURE");
	}
}//»
if (!(measure_num % 4)){//«
	NOTEDUR_OFF = 0.003 * (-64 + Math.floor(128*Math.random()));
}//»
if (!(measure_num % 8)){//«
	NOTE_OFFSET_OFF = 0.0005 * (-64 + Math.floor(128*Math.random()));
}//»
	cur_measure = [];
	for (let i=0; i < MEASURE_LENGTH; i++) {
		cur_measure.push(0);
	}

}//»

if (!cur_measure[beat_num]){
	let num = measure[beat_num];
	if (num === null){//«
		while (gain_queue.length > MAX_QUEUE_LENGTH){
			let g = gain_queue.shift();
			g.disconnect();
		}
		cur_measure[beat_num] = 1;
		last_measure = measure_num;
		rafId = requestAnimationFrame(main_loop);
		return;
	}//»
	
//If in the middle of a decent sized measure, and there hasn't already been a break...
	if (!did_add_ms && MEASURE_LENGTH > 4 && beat_num > 1 && beat_num < MEASURE_LENGTH - 2){
		if (Math.random() > 0.9){
			did_add_ms = true;
			add_ms = SPB * ADD_MS_FACTOR * Math.random();
//cwarn(`ADD_MS(${measure_num},${beat_num+1}/${MEASURE_LENGTH}): ${add_ms}`);
			rafId = requestAnimationFrame(main_loop);
			return;
		}
	}

//«
	let usenotedur = NOTEDUR_OFF + NOTEDUR;
/*
{

let r = Math.random();
if (r > 0.9) usenotedur *= 2;
else if (r > 0.1) usenotedur /= 2;

}
*/
	if (usenotedur < NOTEDUR_MIN) usenotedur = NOTEDUR_MIN;
	let usenoteoff = NOTE_OFFSET + NOTE_OFFSET_OFF;
	if (usenoteoff < 0) usenoteoff = 0;

	let o1 = ctx.createOscillator();
	let o2 = ctx.createOscillator();
	let o3 = ctx.createOscillator();
	let o4 = ctx.createOscillator();

	let g1 = ctx.createGain();
	let g2 = ctx.createGain();
	let g3 = ctx.createGain();
	let g4 = ctx.createGain();

	o1.type = TYPE;
	o2.type = TYPE;
	o3.type = TYPE;
	o4.type = TYPE;

	o1.frequency.value = NOTEMAP[NOTES[num]];
	o2.frequency.value = NOTEMAP[NOTES[num+2]];
	o3.frequency.value = NOTEMAP[NOTES[num+4]];
	o4.frequency.value = NOTEMAP[NOTES[num+6]];

	g1.gain.value=0;
	g2.gain.value=0;
	g3.gain.value=0;
	g4.gain.value=0;

	o1.start();
	o2.start();
	o3.start();
	o4.start();

	g1.connect(outGain);
	g2.connect(outGain);
	g3.connect(outGain);
	g4.connect(outGain);

	o1.connect(g1);
	o2.connect(g2);
	o3.connect(g3);
	o4.connect(g4);

	let tm = ctx.currentTime+1;
	let vals1, vals2, vals3, vals4;
	if (Math.random() > 0.8){
		vals1 = DBL_CURVE_VALS_1;
		vals2 = DBL_CURVE_VALS_2;
		vals3 = DBL_CURVE_VALS_3;
		vals4 = DBL_CURVE_VALS_4;
	}
	else{
		vals1 = CURVE_VALS_1;
		vals2 = CURVE_VALS_2;
		vals3 = CURVE_VALS_3;
		vals4 = CURVE_VALS_4;
	}

	g1.gain.setValueCurveAtTime(vals1, tm, usenotedur);
	g2.gain.setValueCurveAtTime(vals2, tm+usenoteoff, usenotedur);
	g3.gain.setValueCurveAtTime(vals3, tm+2*usenoteoff, usenotedur);
	g4.gain.setValueCurveAtTime(vals4, tm+3*usenoteoff, usenotedur);
	gain_queue.push(g1, g2, g3, g4);

//»

}

cur_measure[beat_num] = 1;
last_measure = measure_num;
rafId = requestAnimationFrame(main_loop);

};//»

const make_measure = () => {//«

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

while (got_beats < use_beats_per_measure){

	let n = Math.floor(MEASURE_LENGTH * Math.random());
	if (measure[n] !== null) continue;
	let use_note;
	if (got_beats > 1 && n > 0 && n < MEASURE_LENGTH-1){//«
		let got_prev=-1, got_next=-1;
		for (let i=n-1; i >= 0; i--){
			if (measure[i] !== null){
				got_prev=i;
				break;
			}
		}
		for (let i=n+1; i < MEASURE_LENGTH; i++){
			if (measure[i]>-1){
				got_next=i;
				break;
			}
		}
		if(got_prev > -1 && got_next > -1){
			let gap = got_next - got_prev;
			if (gap <= MIN_GAP_TO_INSERT){
				let n1 = NOTE_TO_MIDI[NOTES[measure[got_prev]]];
				let n2 = NOTE_TO_MIDI[NOTES[measure[got_next]]];
				let midi_num = Math.floor((n1+n2)/2);
				use_note = midi_num - midi_key;
			}
		}
	}//»
	if (use_note){//«
		if (CHECK(use_note)){
			measure[n] = use_note;
			got_beats++;
			total_note_inserts++;
			continue;
		}
	}//»

	let try_note;
	do {
		try_note = Math.floor(Math.random() * use_measure_note_spread);
	}
	while (!CHECK(try_note));

	measure[n] = try_note;
	got_beats++;

}
log_measure(got_beats);

};//»

const set_beats_per_measure = () => {//«
	MEASURE_LENGTH = 4 + Math.floor(15*Math.random());
	BEATS_PER_MEASURE = Math.ceil(MEASURE_LENGTH/2);
	BEATS_PER_MEASURE_OFF_RANGE = Math.floor(0.75*MEASURE_LENGTH);
};//»
const set_beats_per_sec = () => {//«
	BPS = (BPM + (-BPM_SPREAD/2 + Math.floor(BPM_SPREAD*Math.random())))/60;
	SPB = 1 / BPS;
log(`Tempo: ${60*BPS} bpm`);
//60 s/m b/s
};//»
const change_key = () => {//«
	NOTES = [];
	let scale;
	let rand = Math.random();
	let which;
	if (rand < 0.66) {
		scale = MAJOR_SCALE;
		which = "Maj";
	}
	else if (rand < 0.92) {
		scale = NATURAL_MINOR_SCALE;
		which = "Nat";
	}
	else {
		scale = HARMONIC_MINOR_SCALE;
		which = "Harm";
	}
	let start = midi_key;
log(`Scale: ${MIDI_TO_NOTE[start]} ${which}`);

	for (let i=0; i < 7*NUM_OCTAVES; i++){
		NOTES.push(MIDI_TO_NOTE[start]);
		start+=scale[i%7];
	}
	num_notes = NOTES.length;
};//»

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

if (await get_midi()) {
	midi = globals.midi;
	midi.set_cb(midi_handler);
}
else{

cerr("NOPE");

}

};//»

const CHECK = use_note => {//«
	return (NOTES[use_note] && NOTES[use_note+2] && NOTES[use_note+4] && NOTES[use_note+6])
}//»

const reset = () => {//«
cwarn(`*****     Resetting (${total_note_inserts})     *****`);
	total_note_inserts = 0;
	real_time_elapsed = 0;
	real_last_time = null;
	time_elapsed = 0;
	last_time = null;
	last_measure = -1;
	set_beats_per_measure();
	set_beats_per_sec();
};//»
const mult = (arr, val) => {//«
	let out = [];
	for (let num of arr) out.push(num*val);
	return out;
}//»
const disconnect_all_gains = () => {//«
	for (let gn of gain_queue) gn.disconnect();
};//»
const toggle_paused = () => {//«
	if (paused) {
		last_time = null;
		add_ms = 0;
		rafId = requestAnimationFrame(main_loop);
cwarn("!!!!!!!!!!     PLAYING     !!!!!!!!!!")
	}
	else {
		disconnect_all_gains();
		cancelAnimationFrame(rafId);

cwarn("!!!!!!!!!      PAUSED      !!!!!!!!!")
	}
	paused = !paused;
}//»
const make_curves = () => {//«

	CURVE_VALS_1 = CURVE_VALS;
	CURVE_VALS_2 = mult(CURVE_VALS, 0.8);
	CURVE_VALS_3 = mult(CURVE_VALS, 0.55);
	CURVE_VALS_4 = mult(CURVE_VALS, 0.25);
	
	DBL_CURVE_VALS_1 = DBL_CURVE_VALS;
	DBL_CURVE_VALS_2 = mult(DBL_CURVE_VALS, 0.8);
	DBL_CURVE_VALS_3 = mult(DBL_CURVE_VALS, 0.55);
	DBL_CURVE_VALS_4 = mult(DBL_CURVE_VALS, 0.25);

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
const log_measure = (say_beats) => {//«
	let use = [];
	let s='';
	for (let i=0; i < MEASURE_LENGTH; i++) {
		let n = measure[i];
		if (n === null) {
			use.push(`[${i+1}]`);
		}
		else {
			use.push(NOTES[n]);
		}
	}
log(`TimeSig: ${say_beats}/${MEASURE_LENGTH}`);
log(use.join("  "));
}//»
const rfloor=(num)=>{//«
	return Math.floor(num * Math.random());
};//»
const rceil=(num)=>{//«
	return Math.ceil(num * Math.random());
};//»

const init = () => {//«
	if (midi) midi.set_cb(midi_handler);
	else do_get_midi();
	set_beats_per_sec();
	set_beats_per_measure();
	make_curves();
}//»

//»
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
	disconnect_all_gains();
	do_reset = true;
}


};//»

//»

init();

}//»







/*//««
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

