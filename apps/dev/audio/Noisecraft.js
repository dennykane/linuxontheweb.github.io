//Imports«

import { util, api as capi } from "/sys/util.js";
import {globals} from "/sys/config.js";
const{ log, cwarn, cerr, isnum, make, mkdv} = util;
import { Model, Paste, Play, Stop } from '/new/noisecraft/model.js';
import { compile } from '/new/noisecraft/compiler.js';
import { AudioView } from '/new/noisecraft/audioview.js';
import { Editor } from '/new/noisecraft/editor.js';
import { assert, anyInputActive, makeSvg, setSvg, getBrightColor } from '/new/noisecraft/utils.js';

const {NS} = globals;
const {fs} = NS.api;

//»
export const app = function(Win, Desk) {

//Var«

let Main = Win.main;
let midi;
let synthNode;
let worklet;
let ctx = globals.audioCtx || new AudioContext({latencyHint: 'interactive',sampleRate: 44100});
globals.audioCtx = ctx;

let gain = ctx.createGain();
gain.connect(ctx.destination);
let model = new Model();
new AudioView(model, ctx, gain);

let midiIn;
let f64View;
//Need ints for adsr.state, midi.gate
let i64View;

//»

//Dom«


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

const start = async b => {//«

	let szsz = parseInt(String.fromCharCode(b[0])+String.fromCharCode(b[1]));
	let szstr='';
	let i;
	for (i=0; i < szsz; i++){
		szstr += String.fromCharCode(b[i+2]);
	}
	let sz = parseInt(szstr);
	let bytes = b.slice(i+2, i+2+sz);
	let rest = b.slice(i+2+sz);
	let obj = JSON.parse(await capi.toStr(rest));

	await ctx.audioWorklet.addModule('/new/noisecraft/audioworklet.js');
	worklet = new AudioWorkletNode(
		ctx,
		'noisecraft-generator',
		{ outputChannelCount: [2] }
	);
	worklet.port.postMessage({buffer: bytes.buffer, nodeObj: obj});
	worklet.connect(gain);

//log("OK!");

/*
	this.audioWorklet = new AudioWorkletNode(
		this.audioCtx,
		'sample-generator',
		{ outputChannelCount: [2] }
	);

	// Callback to receive messages from the audioworklet
	this.audioWorklet.port.onmessage = this.onmessage.bind(this);
    
        this.audioWorklet.connect(this.audioCtx.destination);
log(obj);
log(bytes);

*/

};//»

const do_load = text => {//«
	let o = JSON.parse(text);
	if (typeof o.data == "string"){
		text = o.data;
	}
	model.deserialize(text);
//	let maxWidth = editor_div.scrollWidth;
//	let maxHeight = editor_div.scrollHeight;
//	graph_div.style.width = maxWidth;
//	graph_div.style.height = maxHeight;
	model.update(new Play());
};//»

//«
this.onresize=()=>{
};
this.onappinit=async()=>{//«

}//»
this.onloadfile = async arg => {//«
	do_load(await capi.toStr(arg));
};//»
this.onkill=()=>{//«
	gain && gain.disconnect();
	midi && midi.rm_cb(midi_cb);
};//»
this.onkeydown=(e,k)=>{//«
	let marr;
	if (k=="SPACE_"){
	}
	else if (marr = k.match(/(^[0-9])/)){
//		if (midiIn) {
//			f64View[midiIn] = 440+(25*parseInt(marr[1]));
//			i64View[midiIn+1] = 1n;
//		}
	}
	else if (k=="m_"){
		if (midi) return;
		dogetmidi();
	}
	else if (k=="v_"){
	}
};//»
this.onkeyup=(e,k)=>{

if (k=="SPACE_"){
	e.preventDefault();
	e.stopPropagation();
	if (gain.gain.value) gain.gain.value=0;
	else gain.gain.value=1;

}
else if (k=="a_"){
}
else if (k.match(/^[0-9]/)){
	if (midiIn) {
		f64View[midiIn] = 0;
		i64View[midiIn+1] = 0n;
	}
}

};

//»

}


/*«

<div id="editor_div" style="flex-grow: 1; padding:0; margin:0; overflow: scroll;">
	<div id="graph_div"></div>

	<svg id="graph_svg" version="1.1">
	</svg>

	<div id="graph_bg_text">
		Click the empty space to create a new node
	</div>

	<input type="text" id="project_title" size=50 maxlength=50 value="">
</div>

»*/
/*«
Main._tcol="#ccc";
Main._dis="flex";
Main.style.flexFlow="column";

let editor_div = mkdv();
editor_div._w="100%";
editor_div._h="100%";
model.editorDiv = editor_div;
editor_div.style.cssText=`
flex-grow: 1;
padding:0;
margin:0;
overflow: scroll;
font-family: monospace;
position: relative;
top: 0px;
left: 0px;
`;
let graph_div = mkdv();
graph_div.style.cssText=`
    position: absolute;
    top: 0px;
    left: 0px;
`;
model.graphDiv = graph_div;
editor_div._add(graph_div);
let graph_svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
//let graph_svg = make('svg');
//graph_svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
//graph_svg.setAttribute("version", "1.1");

//    z-index: -2;
graph_svg.style.cssText=`
    position: absolute;
    top: 0px;
    left: 0px;
`;

model.svg = graph_svg;
editor_div._add(graph_svg);
let graph_bg_text = mkdv();
model.bgText = graph_bg_text;
graph_bg_text.style.cssText=`
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);

    user-select: none;

    color: rgb(150, 150, 150);
    font-weight: bold;
    font-family: sans-serif;
    font-size: 20;
    margin: 0;
	display: block;
`;
graph_bg_text.innerText=`
Click the empty space to create a new node
`;
editor_div._add(graph_bg_text);
let inp = make('input');
model.title = inp;
inp.type="text";
inp.size="50";
inp.maxlength="50";
inp.style.cssText=`
    position: absolute;
    bottom: 18;
    right: 18;
    font-family: monospace;
    font-size: 16;
    font-weight: normal;
    text-align: right;
    color: #777;

    border: none;
    border-color: transparent;
    outline: none;
    background: none;
`;
inp.value="What?";
editor_div._add(inp);

let editor = new Editor(model);
editor.isActive = false;
if (editor.isActive) {
	Main._add(editor_div);
}
»*/
/*«
const do_play=async()=>{//«
	let rv = await fs.pathToNode("/home/me/Desktop/ncrft.bin");
	if (!rv) return;
//	bytes_to_audio(await rv.bytes);
	start(await rv.bytes);
};//»
const json_to_buf = async(jsonText, if_compile_only)=>{//«
const funcs = {
	toInt:(val) => {
		return (new Int32Array([val]))[0];
	},
	toFloat:(val) => {
		return (new Float64Array([val]))[0];
	},
	toDouble:(val) => {
		return (new Float64Array([val]))[0];
	}
};

model.deserialize(jsonText);
let state = compile(model.state);
if (!(state && state.waltSrc)){
cerr("Nothing returned from the noisecraft compiler");
return;
}
//log(state.src);
//log(state.waltSrc);
if (if_compile_only){
let genSample = new Function(
	'time',
	'nodes',
	state.src
);
log(genSample);
return;
}
let walt = (await capi.getMod("walt")).Walt;
let out;
try {
	out = walt.compile(await state.waltSrc);
}
catch(e){
cerr(e);
	return;
}
if (!out) {
cerr("Nothing returned from Walter's compiler");
	return;
}
let code = new Uint8Array(out.buffer());

	try {
		await WebAssembly.instantiate(code.buffer,{Math: Math, Funcs: funcs, console: {log1: console.log, log2: console.log, log3: console.log, log4: console.log}});
//		mod	= await WebAssembly.instantiateStreaming(resp,{Math: Math, Funcs: funcs, console: {log1: console.log, log2: console.log, log3: console.log, log4: console.log}});
	}catch(e){
cerr("WASM INSTANTIATE FAILURE");
log(e);
//return;
	}

let o = state.nodeObj;

let codelenstr = code.length+"";
let codelenlenstr = (codelenstr.length+"").padStart(2, "0");
let lenbytes = await capi.toBytes(`${codelenlenstr}${codelenstr}`);
let obytes = await capi.toBytes(JSON.stringify(o));
out = new Uint8Array(lenbytes.length + code.length + obytes.length);
out.set(lenbytes, 0);
out.set(code, lenbytes.length);
out.set(obytes, lenbytes.length+code.length);
fs.writeFile("/home/me/Desktop/ncrft.bin", out);
//log("DONE!", out);

};//»
const bytes_to_audio = async(b)=>{//«
const funcs = {
	toInt:(val) => {
		return (new Int32Array([val]))[0];
	},
	toFloat:(val) => {
		return (new Float64Array([val]))[0];
	},
	toDouble:(val) => {
		return (new Float64Array([val]))[0];
	}
};
	let szsz = parseInt(String.fromCharCode(b[0])+String.fromCharCode(b[1]));
	let szstr='';
	let i;
	for (i=0; i < szsz; i++){
		szstr += String.fromCharCode(b[i+2]);
	}
	let sz = parseInt(szstr);
	let bytes = b.slice(i+2, i+2+sz);
	let rest = b.slice(i+2+sz);
	let obj = JSON.parse(await capi.toStr(rest));
log(obj);
	let mod;
log(bytes);
//	let resp = new Response(new Blob([bytes.buffer],{type:"application/wasm"}));

	try {
mod	= await WebAssembly.instantiate(bytes.buffer,{Math: Math, Funcs: funcs, 
console: {log1: console.log, log2: console.log, log3: console.log, log4: console.log}});
//		mod	= await WebAssembly.instantiateStreaming(resp,{Math: Math, Funcs: funcs, console: {log1: console.log, log2: console.log, log3: console.log, log4: console.log}});
	}catch(e){

log(e);
return;
	}
log(mod);
	let exports = mod.instance.exports;
	let mem = exports.mem;
	let func = exports.genSamples;
//	if (!func) return terr(`${funcName}: not an exported function`);
//	let buf = new ArrayBuffer();
	mem.grow(1000);
let buf = mem.buffer;
f64View = new Float64Array(buf);
//Need ints for adsr.state, midi.gate
i64View = new BigInt64Array(buf);
let i32View = new Int32Array(buf);
//log(obj);
let keys = obj._keys;
let output;
for (let k of keys){
	let n = obj[k];
	let p = n.ptr/8;
	let intp = n.ptr/4;
	if (k.match(/^(knob|const)/)){
		let val = n.params.value;
		f64View[p] = val;
	}
	else if (k.match(/^midiin/)){
		midiIn = p;
	}
	else if (k.match(/^clock/)){
		let val = n.params.value;
		f64View[p+1] = val;
	}
	else if (k.match(/^(saw|sine|tri|noise|pulse)/)){
		f64View[p+1] = n.params.minVal;
		f64View[p+2] = n.params.maxVal;
	}
	else if (k==="output"){
		output = n/8;
	}
	else if(k.match(/^delaybuffer/)){
//		delaybuffer = n/8;
	}
	else if(k.match(/^delay/)){
		i32View[intp+2] = 48000*2;
	}
	else if (!k.match(/^(slide|adsr|filter)/)){
cerr("WUTNODE");
log(n);
	}
}
f64View[0]=0.3;
f64View[1]=0.3;

let sp = ctx.createScriptProcessor(512, 0, 2);
sp.onaudioprocess=(e)=>{
	func();
	let ch0 = f64View.slice(output, output+512);
	let ch1 = f64View.slice(output+512, output+1024);
	let out0 = e.outputBuffer.getChannelData(0);
	let out1 = e.outputBuffer.getChannelData(1);
	out0.set(ch0);
	out1.set(ch1);
};
sp.connect(gain);

}//»
const do_compile=async()=>{//«
	let rv = await fs.pathToNode("/home/me/Desktop/harm_hold.ncft");
	if (!rv) return;
	json_to_buf(await rv.text, true);
};//»
»*/

