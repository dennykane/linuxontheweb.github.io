//Imports«
import { util, api as capi } from "/sys/util.js";
import {globals} from "/sys/config.js";
const{ log, cwarn, cerr, isnum} = util;
//»

export const app = function(Win, Desk) {

//Var«

let Main = Win.main;
let midi;
let vid;
let synthNode;
let ctx = globals.audioCtx || new AudioContext();
globals.audioCtx = ctx;

let gain;
let filters=[];
let filter_freqs=[
	200,
	400,
	800,
	1600
];

//»

//Funcs«

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
const midi_cb = e => {//«

if (!gain) return;

let dat = e.data;
let v1 = dat[0]
let v2 = dat[1]
let v3 = dat[2]

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

};//»
const dogetmidi = async () => {//«

if (await get_midi()) {
	midi = globals.midi;
	midi.set_cb(midi_cb);
}
else{

cerr("NOPE");

}

};//»

//»

//«
this.onappinit=async()=>{//«

	let path = "/audio/noise.wasm";
//	let path = "/audio/saw.wasm";
	let rv = await fetch(path);
	let buf = await rv.arrayBuffer();
	midi = globals.midi;
/*«
	vid = globals.mediaNode;
//	ctx = globals.audioContext;
	if (vid&&ctx) {
		gain = ctx.createGain();
		for (let freq of filter_freqs){
			let filt = ctx.createBiquadFilter();
//			filt.type="peaking";
			filt.type="bandpass";
			filt.frequency.value = freq;
			filt.Q.value = 1;
//log(filt.Q);
			vid.node.connect(filt);
			filt.connect(gain);
			filters.push(filt);
		}
//		vid.node.connect(gain);
		gain.connect(ctx.destination);
	}
	else cwarn("No video input");
»*/
	if (midi) midi.set_cb(midi_cb);
	else cwarn("No midi (press 'm')");

	await ctx.audioWorklet.addModule('/audio/synth-processor.js');
    synthNode = new AudioWorkletNode(ctx, 'wasm-synth',{processorOptions: {buffer: buf}});
	synthNode.connect(ctx.destination);
}//»
this.onkill=()=>{//«
	gain && gain.disconnect();
	midi && midi.rm_cb(midi_cb);
};//»
this.onkeydown=(e,k)=>{//«
	if (k=="SPACE_"){
		synthNode.port.postMessage(true);
//		if (!vid) return;
//		if (vid.paused) vid.play()
//		else vid.pause();
	}
	else if (k=="m_"){
		if (midi) return;
		dogetmidi();
	}
	else if (k=="v_"){
		vid = globals.mediaElement;
	}
};//»
this.onkeyup=(e,k)=>{
if (k=="SPACE_"){
	synthNode.port.postMessage(false);
}
};

//»

}
