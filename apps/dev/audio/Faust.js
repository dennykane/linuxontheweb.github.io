


//Imports«
import { util, api as capi } from "/sys/util.js";
import {globals} from "/sys/config.js";
const{ log, cwarn, cerr, isnum} = util;
const {NS} = globals;
const {fs:fsapi}=NS.api;
//»
//«

const FLUTE_STR=`
declare name "Flute";
declare description "Nonlinear WaveGuide Flute";
declare author "Romain Michon (rmichon@ccrma.stanford.edu)";
declare copyright "Romain Michon";
declare version "1.0";
declare licence "STK-4.3"; // Synthesis Tool Kit 4.3 (MIT style license);
declare description "A simple flute based on Smith algorythm: https://ccrma.stanford.edu/~jos/pasp/Flutes_Recorders_Pipe_Organs.html";

//Modifications GRAME July 2015

/* =========== DESCRITPION ===========

- Flute
- Turn ON flute (0=OFF, 1=ON)
- Head = High frequencies/ Silence
- Bottom = Low frequencies
- Left = No vibrato
- Right = Fast vibrato
- Front = Full sound
- Back = Breathy sound

*/

import("stdfaust.lib");
instrument = library("instruments.lib");

//==================== INSTRUMENT =======================

flute = (_ <: (flow + *(feedBack1) : embouchureDelay: poly) + *(feedBack2) : reflexionFilter)~(boreDelay) : NLFM : *(env2)*gain:_;

process = flute;

//==================== GUI SPECIFICATION ================

freq = hslider("[1]Frequency[acc:1 1 -10 0 10]", 440,247,1200,1):si.smooth(0.999);
pressure = hslider("[2]Pressure[style:knob][acc:1 0 -10 0 10]", 0.96, 0.2, 0.99, 0.01):si.smooth(0.999):min(0.99):max(0.2);
breathAmp = hslider("[3]Breath Noise[style:knob][acc:2 0 -10 0 10]", 0.02, 0.01, 0.2, 0.01):si.smooth(0.999):min(0.2):max(0.01);

gate = hslider("[0]ON/OFF (ASR Envelope)",1,0,1,1);
vibratoFreq = hslider("[4]Vibrato Freq (Vibrato Envelope)[style:knob][unit:Hz][acc:0 1 -10 0 10]", 4,0.5,8,0.1);
env1Attack = 0.1;//hslider("h:Parameters/Press_Env_Attack[unit:s][style:knob][acc:1 0 -10 0 10][tooltip:Pressure envelope attack duration]",0.05,0.05,0.2,0.01);

//-------------------- Non-Variable Parameters -----------

gain = 1;
typeModulation = 0;
nonLinearity = 0;
frequencyMod = 220;
nonLinAttack = 0.1;
vibratoGain = 0.05;
vibratoBegin = 0.1;
vibratoAttack = 0.5;
vibratoRelease = 0.2;
pressureEnvelope = 0;
env1Decay = 0.2;
env2Attack = 0.1;
env2Release = 0.1;
env1Release = 0.5;

//==================== SIGNAL PROCESSING ================

//----------------------- Nonlinear filter ----------------------------
//nonlinearities are created by the nonlinear passive allpass ladder filter declared in filter.lib

//nonlinear filter order
nlfOrder = 6;

//attack - sustain - release envelope for nonlinearity (declared in instrument.lib)
envelopeMod = en.asr(nonLinAttack,1,0.1,gate);

//nonLinearModultor is declared in instrument.lib, it adapts allpassnn from filter.lib
//for using it with waveguide instruments
NLFM =  instrument.nonLinearModulator((nonLinearity : si.smooth(0.999)),envelopeMod,freq,
     typeModulation,(frequencyMod : si.smooth(0.999)),nlfOrder);

//----------------------- Synthesis parameters computing and functions declaration ----------------------------

//Loops feedbacks gains
feedBack1 = 0.4;
feedBack2 = 0.4;

//Delay Lines
embouchureDelayLength = (ma.SR/freq)/2-2;
boreDelayLength = ma.SR/freq-2;
embouchureDelay = de.fdelay(4096,embouchureDelayLength);
boreDelay = de.fdelay(4096,boreDelayLength);

//Polinomial
poly = _ <: _ - _*_*_;

//jet filter is a lowwpass filter (declared in filter.lib)
reflexionFilter = fi.lowpass(1,2000);

//----------------------- Algorithm implementation ----------------------------

//Pressure envelope
env1 = en.adsr(env1Attack,env1Decay,0.9,env1Release,(gate | pressureEnvelope))*pressure*1.1;

//Global envelope
env2 = en.asr(env2Attack,1,env2Release,gate)*0.5;

//Vibrato Envelope
vibratoEnvelope = instrument.envVibrato(vibratoBegin,vibratoAttack,100,vibratoRelease,gate)*vibratoGain;

vibrato = os.osc(vibratoFreq)*vibratoEnvelope;

breath = no.noise*env1;

flow = env1 + breath*breathAmp + vibrato;
`;

//»
//«
const KISANA_STR=`
declare name  	"Kisana";
declare author  "Yann Orlarey";

//Modifications GRAME July 2015

/* ========= DESCRITPION =============

- Kisana : 3-loops string instrument (based on Karplus-Strong)
- Head = Silence
- Tilt = High frequencies 
- Front = High + Medium frequencies
- Bottom = High + Medium + Low frequencies
- Left = Minimum brightness
- Right = Maximum birghtness
- Front = Long notes
- Back = Short notes

*/

import("stdfaust.lib");

KEY = 60;	// basic midi key
NCY = 15; 	// note cycle length
CCY = 15;	// control cycle length
BPS = 360;	// general tempo (ba.beat per sec)

process = kisana;    

//-------------------------------kisana----------------------------------
// USAGE:  kisana : _,_;
// 		3-loops string instrument
//-----------------------------------------------------------------------

kisana = vgroup("Kisana",
			harpe(C,11,48),
			harpe(C,11,60),
			(harpe(C,11,72) : *(1.5), *(1.5)) 
		:>*(l))
	with {
		l = -20 : ba.db2linear;//hslider("[1]Volume",-20, -60, 0, 0.01) : ba.db2linear;
		C = hslider("[2]Brightness[acc:0 1 -10 0 10]", 0.2, 0, 1, 0.01) : ba.automat(BPS, CCY, 0.0);
	};

//----------------------------------Harpe--------------------------------
// USAGE:  harpe(C,10,60) : _,_;
//		C is the filter coefficient 0..1
// 		Build a N (10) strings harpe using a pentatonic scale 
//		based on midi key b (60)
//		Each string is triggered by a specific
//		position of the "hand"
//-----------------------------------------------------------------------
harpe(C,N,b) = 	hand(b) <: par(i, N, position(i+1)
							: string(C,Penta(b).degree2Hz(i), att, lvl)
							: pan((i+0.5)/N) )
				 	:> _,_
	with {
		att  = hslider("[3]Resonance[acc:2 1 -10 0 12]", 4, 0.1, 10, 0.01); 
		hand(48) = vslider("h:[1]Instrument Hands/1 (Note %b)[unit:pk][acc:1 0 -10 0 14]", 0, 0, N, 1) : int : ba.automat(120, CCY, 0.0);
		hand(60) = vslider("h:[1]Instrument Hands/2 (Note %b)[unit:pk][acc:1 0 -10 0 14]", 2, 0, N, 1) : int : ba.automat(240, CCY, 0.0);
		hand(72) = vslider("h:[1]Instrument Hands/3 (Note %b)[unit:pk][acc:1 0 -10 0 10]", 4, 0, N, 1) : int : ba.automat(480, CCY, 0.0);
		//lvl  = vslider("h:loop/level", 0, 0, 6, 1) : int : ba.automat(BPS, CCY, 0.0) : -(6) : ba.db2linear; 
		lvl = 1;
		pan(p) = _ <: *(sqrt(1-p)), *(sqrt(p));
		position(a,x) = abs(x - a) < 0.5;
	};

//----------------------------------Penta-------------------------------
// Pentatonic scale with degree to midi and degree to Hz conversion
// USAGE: Penta(60).degree2midi(3) ==> 67 midikey
//        Penta(60).degree2Hz(4)   ==> 440 Hz
//-----------------------------------------------------------------------

Penta(key) = environment {

	A4Hz = 110; 
	
	degree2midi(0) = key+0;
	degree2midi(1) = key+2;
	degree2midi(2) = key+4;
	degree2midi(3) = key+7;
	degree2midi(4) = key+9;
	degree2midi(d) = degree2midi(d-5)+12;
	
	degree2Hz(d) = A4Hz*semiton(degree2midi(d)-69) with { semiton(n) = 2.0^(n/12.0); };

}; 
 
//----------------------------------String-------------------------------
// A karplus-strong string.
//
// USAGE: string(440Hz, 4s, 1.0, button("play"))
// or	  button("play") : string(440Hz, 4s, 1.0)
//-----------------------------------------------------------------------

string(coef, freq, t60, level, trig) = no.noise*level
							: *(trig : trigger(freq2samples(freq)))
							: resonator(freq2samples(freq), att)
	with {
		resonator(d,a)	= (+ : @(d-1)) ~ (average : *(a));
		average(x)		= (x*(1+coef)+x'*(1-coef))/2;
		trigger(n) 		= upfront : + ~ decay(n) : >(0.0);
		upfront(x) 		= (x-x') > 0.0;
		decay(n,x)		= x - (x>0.0)/n;
		freq2samples(f) = 44100.0/f;
		att 			= pow(0.001,1.0/(freq*t60)); // attenuation coefficient
		random  		= +(12345)~*(1103515245);
		noise   		= random/2147483647.0;
	};
`;
//» 
//«

const COMB_FILT_STR=`
declare name "Comb Filter";

/* =========== DESCRIPTION ==============

- A comb filter creates interferences in a sound
- Rocking = to change the filtering frequency
- Head = no filter
- Bottom = maximum filtering

*/

import("stdfaust.lib");

process = fi.fb_fcomb(maxdel,del,b0,aN) 
	with {
		maxdel = 1<<16;
		freq = 1/(hslider("Frequency[acc:0 1 -10 0 10]", 2500,100,20000,0.001)):si.smooth(0.99);
		del = freq *(ma.SR) : si.smooth(0.99);
		b0 = 1;
		aN = hslider("Intensity[acc:1 0 -10 0 10]", 80,0,100,0.01)*(0.01):si.smooth(0.99):min(0.999):max(0);
	};
`;        

//»
//«
const WOOD_KB_STR=`
declare name "Wooden Keyboard";
declare author "ER";

import("stdfaust.lib");
instrument = library("instruments.lib"); 

//d'apres les enveloppes de John Chowning utilisees dans Turenas

/* =============== DESCRIPTION ================= :

- Wooden keyboard
- Head = Echo/Silence
- Rocking = striking across the keyboard from low frequencies (Left) to high frequencies (Right)
- Back + Rotation = long notes
- Front + Rotation = short notes

*/

//--------------------------------- INSTRUMENT ---------------------------------

marimkey(n) = os.osc(octave(n)) * (0.1)
			  *(trigger(n+1) : enveloppe : fi.lowpass(1,500));

process = hand <: par(i, 10, marimkey(i)) :> echo *(3);

//---------------------------------- UI ----------------------------------------

hand = hslider("[1]Instrument Hand[acc:1 0 -10 0 10]", 5, 0, 10, 1);
hight = hslider("[2]Hight[acc:0 1 -10 0 30]", 5, 1, 10, 0.3) : si.smooth(0.99):min(12):max(1);				
envsize = hslider("[3]Note Duration (BPF Envelope) [unit:s][acc:2 0 -10 0 10]", 0.2, 0.1, 0.5, 0.01) * (ma.SR) : si.smooth(0.999): min(44100) : max(4410) : int;
feedback = hslider("[4]Echo Intensity[acc:1 1 -10 0 15]", 0.1, 0.01, 0.9, 0.01):si.smooth(0.999):min(0.9):max(0.01);
			
//---------------------------------- FREQUENCY TABLE ---------------------------
freq(0) = 164.81;
freq(1) = 174.61;
freq(d)	 = freq(d-2);	
	
octave(d) = freq(d)* hight;
							
//------------------------------------ TRIGGER ---------------------------------

upfront(x) 	= x>x';
counter(g)= (+(1):*(1-g))~_;
position(a,x) = abs(x - a) < 0.5;

trigger(p) = position(p) : upfront : counter; 	

//------------------------------------ ECHO ------------------------------------

echo = +~(@(echoDelay)*(feedback));
echoDelay = 8096;

//----------------------------------- ENVELOPPES ------------------------------

/* envelope */

enveloppe = tabchowning.f9;

/* Tables Chowning */

tabchowning = environment
{
corres(x) = int(x*envsize/1024);
// f9 0 1024 7 1 248 0.25 259 0.1 259 0.05 258 0 

f9 = ba.bpf.start(0, 0):
ba.bpf.point(corres(2), 0.25):
ba.bpf.point(corres(4), 0.5):
ba.bpf.point(corres(10), 0.9):
ba.bpf.point(corres(248), 0.25):
ba.bpf.point(corres(507), 0.1):
ba.bpf.point(corres(766), 0.05):
ba.bpf.end(corres(1024), 0);
};
`;

//»
//«
const BUZZER_STR=`
import("stdfaust.lib");

normMIDI(mv)  = mv/127.0;
vol  = normMIDI(hslider("Ctrl Value IN (Ctrl 1) [midi:ctrl 1]", 60, 0, 127, 1)) ;

f = nentry("freq",200,40,2000,0.01);
bend = nentry("bend",1,0,10,0.01) : si.polySmooth(t,0.999,1);
g = nentry("gain",1,0,1,0.01);
t = button("gate");
freq = f*bend;
envelope = t*g*vol : si.smoo;

process = os.sawtooth(freq)*envelope <: _,_;
`;
//»
//«
const GUITAR_STR=`
import("stdfaust.lib");
// standard parameters
f = hslider("freq",300,50,2000,0.01);
bend = hslider("bend[midi:pitchwheel]",1,0,10,0.01) : si.polySmooth(gate,0.999,1);
gain = hslider("gain",1,0,1,0.01);
s = hslider("sustain[midi:ctrl 64]",0,0,1,1); // for sustain pedal
t = button("gate");

// mapping params
gate = t+s : min(1);
freq = f*bend : max(50); // min freq is 50 Hz

stringLength = freq : pm.f2l;
pluckPosition = 0.8;
mute = gate : si.polySmooth(gate,0.999,1);

process = pm.elecGuitar(stringLength,pluckPosition,mute,gain,gate) <: _,_;
`;
//»
//«
const DRUM_STR=`
import("stdfaust.lib");
gate = button("gate");
x = hslider("x",1,0,1,0.001);
y = hslider("y",1,0,1,0.001);
keyboard = hslider("keyboard",0,0,1,1) : int;
key = hslider("key",0,0,1,1) : int;
drumModel = pm.djembe(rootFreq,exPos,strikeSharpness,gain,gate)
with{
    // frequency of the lowest drum
    bFreq = 60;
    // retrieving pad ID (0-2)
    padID = 2-(keyboard*2+key);
    // drum root freq is computed in function of pad number
    rootFreq = bFreq*(padID+1);
    // excitation position
    exPos = min((x*2-1 : abs),(y*2-1 : abs));
    strikeSharpness = 0.5;
    gain = 2;
};  
process = drumModel <: _,_;
`;
//»

//«
const HARP_STR=`

declare name "Bouncy Harp";
declare author "ER"; //From Nonlinear EKS by Julius Smith and Romain Michon;

import("stdfaust.lib");

/* =============== DESCRIPTION ================= :

Do not hesitate to make swift and abrupt gestures.
- Head : Silence/reverb.
- Swing :  To pluck the strings of the harp.
- Fishing rod with abrupt stop in Head position : bouncing string effect.
- Frying Pan and Tennis Racket : to pluck a single bouncing string.
- LOOPING MODE : 
==> Bottom position/Rotation around Bottom = record loop
==> Head = listen to loop
==> Swift mouvements around head = siren/scratched record effect

*/

//==================== INSTRUMENT =======================

process = par(i, N, NFLeks(i)):>_<: select2(byPass,capture,_) <: instrReverbHarp;

NFLeks(n) = filtered_excitation(n,P(octave(n)),octave(n)) : stringloop(octave(n));
 
capture = _<:capt,_ : select2(B)
		with{
		B = hand > (0.5);		// Capture sound while hand plays
		I = int(B);				// convert button signal from float to integer
		R = (I-I') <= 0;		// Reset capture when button is pressed
		D = (+(I):*(R))~_;		// Compute capture duration while button is pressed: 0..NNNN0..MMM

		capt = *(B) : (+ : de.delay(1048576, D-1)) ~ *(1.0-B) ;
		};															

//==================== GUI SPECIFICATION ================

N = 15;
hand = hslider("[1]Instrument Hand (Loop mode: hand>0 = recording, 0 = playback)[acc:1 0 -8 0 11]", 0, 0, N, 1);// => gate
gain = 1;
byPass = checkbox("[7]Loop Mode ON/OFF (max 20s)") : reverse;//In loop capture mode : hand>0 = recording, 0 = stop recording/playback (Y axis upward)
reverse = select2(_, 1, 0);
pickangle = 0.9 * hslider("[3]Dry/Soft Strings[acc:2 1 -10 0 10]", 0.45,0,0.9,0.1);

beta = hslider("[4]Picking Position [acc:2 1 -10 0 10]", 0.13, 0.02, 0.5, 0.01);
t60 = hslider("[5]Resonance (InstrReverb)[acc:1 1 -10 0 10]", 5, 0.5, 10, 0.01);  // -60db decay time (sec)

B = 0.5;
L = -10 : ba.db2linear;

//---------------------------------- FREQUENCY TABLE ---------------------------
freq(0) = 115;
freq(1) = 130;
freq(2) = 145;
freq(3) = 160;
freq(4) = 175;

freq(d)	 = freq(d-5)*(2);
octave(d) = freq(d) * hslider("[2]Hight[acc:0 0 -10 0 10]", 3, 1, 6, 0.1) : si.smooth(0.999);	
	

//==================== SIGNAL PROCESSING ================

//----------------------- noiseburst -------------------------
// White no.noise burst (adapted from Faust's karplus.dsp example)
// Requires music.lib (for no.noise)
noiseburst(d,e) = no.noise : *(trigger(d,e))
    with {
        upfront(x) = (x-x') > 0;
        decay(n,x) = x - (x>0)/n;
        release(n) = + ~ decay(n);
        position(d) = abs(hand - d) < 0.5;
        trigger(d,n) = position(d) : upfront : release(n) : > (0.0);
    };

P(f) = ma.SR/f ; // fundamental period in samples
Pmax = 4096; // maximum P (for de.delay-line allocation)

ppdel(f) = beta*P(f); // pick position de.delay
pickposfilter(f) = fi.ffcombfilter(Pmax,ppdel(f),-1); // defined in filter.lib

excitation(d,e) = noiseburst(d,e) : *(gain); // defined in signal.lib

rho(f) = pow(0.001,1.0/(f*t60)); // multiplies loop-gain

// Original EKS damping filter:
b1 = 0.5*B; b0 = 1.0-b1; // S and 1-S
dampingfilter1(f,x) = rho(f) * ((b0 * x) + (b1 * x'));

// Linear phase FIR3 damping filter:
h0 = (1.0 + B)/2; h1 = (1.0 - B)/4;
dampingfilter2(f,x) = rho(f) * (h0 * x' + h1*(x+x''));

loopfilter(f) = dampingfilter2(f); // or dampingfilter1

filtered_excitation(d,e,f) = excitation(d,e) : si.smooth(pickangle) 
		    : pickposfilter(f) : fi.levelfilter(L,f); // see filter.lib

stringloop(f) = (+ : de.fdelay4(Pmax, P(f)-2)) ~ (loopfilter(f));

instrReverbHarp = _,_ <: *(reverbGain),*(reverbGain),*(1 - reverbGain),*(1 - reverbGain) : 
re.zita_rev1_stereo(rdel,f1,f2,t60dc,t60m,fsmax),_,_ <: _,!,_,!,!,_,!,_ : +,+
    with {
       reverbGain = hslider("v:[8]Reverb/ Reverberation Volume (InstrReverb)[acc:1 1 -10 20 0 0.5] ",0.5,0.1,1,0.01) : si.smooth(0.999);
       roomSize = hslider("v:[8]Reverb/ÒReverberation Room Size (InstrReverb)[acc:1 1 -10 0 25]", 0.72,0.01,2,0.01);
       rdel = 20;
       f1 = 200;
       f2 = 6000;
       t60dc = roomSize*3;
       t60m = roomSize*2;
       fsmax = 48000;
    };
`;


//»

const createDSPInstance = async function (factory, context, buffer_size, callback) {//«
/**
 * Create a ScriptProcessorNode Web Audio object from a factory
 *
 * @param factory - the DSP factory
 * @param context - the Web Audio context
 * @param buffer_size - the buffer_size in frames
 * @param callback - a callback taking the created ScriptProcessorNode as parameter, or null in case of error
 */
const remap = (v, mn0, mx0, mn1, mx1)=>{
	return (1.0 * (v - mn0) / (mx0 - mn0)) * (mx1 - mn1) + mn1;
}
	// Resume audio context each time...
	context.resume();

	var importObject = {//«
		env: {
			memoryBase: 0,
			tableBase: 0,

			// Integer version
			_abs: Math.abs,

			// Float version
			_acosf: Math.acos,
			_asinf: Math.asin,
			_atanf: Math.atan,
			_atan2f: Math.atan2,
			_ceilf: Math.ceil,
			_cosf: Math.cos,
			_expf: Math.exp,
			_floorf: Math.floor,
			_fmodf: function (x, y) { return x % y; },
			_logf: Math.log,
			_log10f: Math.log10,
			_max_f: Math.max,
			_min_f: Math.min,
			_remainderf: function (x, y) { return x - Math.round(x / y) * y; },
			_powf: Math.pow,
			_roundf: Math.fround,
			_sinf: Math.sin,
			_sqrtf: Math.sqrt,
			_tanf: Math.tan,
			_acoshf: Math.acosh,
			_asinhf: Math.asinh,
			_atanhf: Math.atanh,
			_coshf: Math.cosh,
			_sinhf: Math.sinh,
			_tanhf: Math.tanh,
			_isnanf: Number.isNaN,
			_isinff: function (x) { return !isFinite(x); },
			_copysignf: function (x, y) { return Math.sign(x) === Math.sign(y) ? x : -x; },

			// Double version
			_acos: Math.acos,
			_asin: Math.asin,
			_atan: Math.atan,
			_atan2: Math.atan2,
			_ceil: Math.ceil,
			_cos: Math.cos,
			_exp: Math.exp,
			_floor: Math.floor,
			_fmod: function (x, y) { return x % y; },
			_log: Math.log,
			_log10: Math.log10,
			_max_: Math.max,
			_min_: Math.min,
			_remainder: function (x, y) { return x - Math.round(x / y) * y; },
			_pow: Math.pow,
			_round: Math.fround,
			_sin: Math.sin,
			_sqrt: Math.sqrt,
			_tan: Math.tan,
			_acosh: Math.acosh,
			_asinh: Math.asinh,
			_atanh: Math.atanh,
			_cosh: Math.cosh,
			_sinh: Math.sinh,
			_tanh: Math.tanh,
			_isnan: Number.isNaN,
			_isinf: function (x) { return !isFinite(x); },
			_copysign: function (x, y) { return Math.sign(x) === Math.sign(y) ? x : -x; },

			table: new WebAssembly.Table({ initial: 0, element: 'anyfunc' })
		}
	};//»

	var time1 = performance.now();

	let dsp_instance = await WebAssembly.instantiate(factory.module, importObject);
	var time2 = performance.now();
	console.log("Instantiation duration : " + (time2 - time1));

	var sp={};
	let node;
	try {
		node = context.createScriptProcessor(
			buffer_size, 
			dsp_instance.exports.getNumInputs(0), 
			dsp_instance.exports.getNumOutputs(0)
		);
	}
	catch (e) {
cerr("Error in createScriptProcessor: " + e);
		callback(null);
		return;
	}
	sp.node = node;
	sp.output_handler = null;
	sp.ins = null;
	sp.outs = null;
	sp.compute_handler = null;

	sp.dspInChannnels = [];
	sp.dspOutChannnels = [];

	sp.fPitchwheelLabel = [];
	sp.fCtrlLabel = new Array(128);
	for (var i = 0; i < sp.fCtrlLabel.length; i++) { sp.fCtrlLabel[i] = []; }

	// bargraph
	sp.outputs_timer = 5;
	sp.outputs_items = [];

	// input items
	sp.inputs_items = [];

	// Memory allocator
	sp.ptr_size = 4;
	sp.sample_size = 4;

	// Start of DSP memory: DSP is placed first with index 0
	sp.dsp = 0;

	sp.pathTable = [];

	sp.factory = dsp_instance.exports;
	sp.HEAP = dsp_instance.exports.memory.buffer;
	sp.HEAP32 = new Int32Array(sp.HEAP);
	sp.HEAPF32 = new Float32Array(sp.HEAP);

	// Start of HEAP index

	sp.numIn = sp.factory.getNumInputs(sp.dsp);
	sp.numOut = sp.factory.getNumOutputs(sp.dsp);

	// DSP is placed first with index 0. Audio buffer starts at the end of DSP.
	sp.audio_heap_ptr = parseInt(factory.json_object.size);

	// Setup pointers offset
	sp.audio_heap_ptr_inputs = sp.audio_heap_ptr;
	sp.audio_heap_ptr_outputs = sp.audio_heap_ptr_inputs + (sp.numIn * sp.ptr_size);

	// Setup buffer offset
	sp.audio_heap_inputs = sp.audio_heap_ptr_outputs + (sp.numOut * sp.ptr_size);
	sp.audio_heap_outputs = sp.audio_heap_inputs + (sp.numIn * buffer_size * sp.sample_size);

	sp.update_outputs = function () {//«
		if (sp.outputs_items.length > 0 && sp.output_handler && sp.outputs_timer-- === 0) {
			sp.outputs_timer = 5;
			for (var i = 0; i < sp.outputs_items.length; i++) {
				sp.output_handler(sp.outputs_items[i], sp.factory.getParamValue(sp.dsp, sp.pathTable[sp.outputs_items[i]]));
			}
		}
	}//»
	sp.compute = function (e) {//«
		var i, j;

		// Read inputs
		for (i = 0; i < sp.numIn; i++) {
			var input = e.inputBuffer.getChannelData(i);
			var dspInput = sp.dspInChannnels[i];
			dspInput.set(input);
		}

		// Possibly call an externally given callback (for instance to synchronize playing a MIDIFile...)
		if (sp.compute_handler) {
			sp.compute_handler(buffer_size);
		}

		// Compute
		sp.factory.compute(sp.dsp, buffer_size, sp.ins, sp.outs);

		// Update bargraph
		sp.update_outputs();

		// Write outputs
		for (i = 0; i < sp.numOut; i++) {
			var output = e.outputBuffer.getChannelData(i);
			var dspOutput = sp.dspOutChannnels[i];
			output.set(dspOutput);
		}
	}//»

	// JSON parsing
	sp.parse_ui = function (ui) {//«
		for (var i = 0; i < ui.length; i++) {
		sp.parse_group(ui[i]);
		}
	}//»
	sp.parse_group = function (group) {//«
		if (group.items) {
			sp.parse_items(group.items);
		}
	}//»
	sp.parse_items = function (items) {//«
		for (var i = 0; i < items.length; i++) {
			sp.parse_item(items[i]);
		}
	}//»
	sp.parse_item = function (item) {//«
		if (item.type === "vgroup" || item.type === "hgroup" || item.type === "tgroup") {
			sp.parse_items(item.items);
		} 
		else if (item.type === "hbargraph" || item.type === "vbargraph") {
			// Keep bargraph adresses
			sp.outputs_items.push(item.address);
			sp.pathTable[item.address] = parseInt(item.index);
		} 
		else if (item.type === "vslider" || item.type === "hslider" || item.type === "button" || item.type === "checkbox" || item.type === "nentry") {
			// Keep inputs adresses
			sp.inputs_items.push(item.address);
			sp.pathTable[item.address] = parseInt(item.index);
			if (item.meta !== undefined) {
				for (var i = 0; i < item.meta.length; i++) {
					if (item.meta[i].midi !== undefined) {
						if (item.meta[i].midi.trim() === "pitchwheel") {
							sp.fPitchwheelLabel.push({
							path: item.address,
							min: parseFloat(item.min),
							max: parseFloat(item.max)
							});
						} 
						else if (item.meta[i].midi.trim().split(" ")[0] === "ctrl") {
							sp.fCtrlLabel[parseInt(item.meta[i].midi.trim().split(" ")[1])]
							.push({
								path: item.address,
								min: parseFloat(item.min),
								max: parseFloat(item.max)
							});
						}
					}
				}
			}
		}
	}//»
	sp.initAux = function () {//«
		// Setup web audio context
		var i;

		// Setup web audio context
		console.log("buffer_size " + buffer_size);
		node.onaudioprocess = sp.compute;

		if (sp.numIn > 0) {
			sp.ins = sp.audio_heap_ptr_inputs;
			for (i = 0; i < sp.numIn; i++) {
				sp.HEAP32[(sp.ins >> 2) + i] = sp.audio_heap_inputs + ((buffer_size * sp.sample_size) * i);
			}

			// Prepare Ins buffer tables
			var dspInChans = sp.HEAP32.subarray(sp.ins >> 2, (sp.ins + sp.numIn * sp.ptr_size) >> 2);
			for (i = 0; i < sp.numIn; i++) {
				sp.dspInChannnels[i] = sp.HEAPF32.subarray(dspInChans[i] >> 2, (dspInChans[i] + buffer_size * sp.sample_size) >> 2);
			}
		}

		if (sp.numOut > 0) {
			sp.outs = sp.audio_heap_ptr_outputs;
			for (i = 0; i < sp.numOut; i++) {
				sp.HEAP32[(sp.outs >> 2) + i] = sp.audio_heap_outputs + ((buffer_size * sp.sample_size) * i);
			}

			// Prepare Out buffer tables
			var dspOutChans = sp.HEAP32.subarray(sp.outs >> 2, (sp.outs + sp.numOut * sp.ptr_size) >> 2);
			for (i = 0; i < sp.numOut; i++) {
				sp.dspOutChannnels[i] = sp.HEAPF32.subarray(dspOutChans[i] >> 2, (dspOutChans[i] + buffer_size * sp.sample_size) >> 2);
			}
		}
		sp.parse_ui(factory.json_object.ui);
		sp.factory.init(sp.dsp, context.sampleRate);
	}//»

	// Public API//«

	/**
	* Destroy the node, deallocate resources.
	*/
	sp.destroy = function () { }

	/* Return current sample rate */
	sp.getSampleRate = function () {
		return context.sampleRate;
	}

	/* Return instance number of audio inputs. */
	sp.getNumInputs = function () {
		return sp.factory.getNumInputs(sp.dsp);
	}

	/* Return instance number of audio outputs. */
	sp.getNumOutputs = function () {
		return sp.factory.getNumOutputs(sp.dsp);
	}

	/**
	* Global init, doing the following initialization:
	* - static tables initialization
	* - call 'instanceInit': constants and instance state initialisation
	*
	* @param sample_rate - the sampling rate in Hertz
	*/
	sp.init = function (sample_rate) {
		sp.factory.init(sp.dsp, sample_rate);
	}

	/**
	* Init instance state.
	*
	* @param sample_rate - the sampling rate in Hertz
	*/
	sp.instanceInit = function (sample_rate) {
		sp.factory.instanceInit(sp.dsp, sample_rate);
	}

	/**
	* Init instance constant state.
	*
	* @param sample_rate - the sampling rate in Hertz
	*/
	sp.instanceConstants = function (sample_rate) {
		sp.factory.instanceConstants(sp.dsp, sample_rate);
	}

	/* Init default control parameters values. */
	sp.instanceResetUserInterface = function () {
		sp.factory.instanceResetUserInterface(sp.dsp);
	}

	/* Init instance state (delay lines...).*/
	sp.instanceClear = function () {
		sp.factory.instanceClear(sp.dsp);
	}

	/**
	* Trigger the Meta handler with instance specific calls to 'declare' (key, value) metadata.
	*
	* @param handler - the Meta handler as a 'declare' function of type (key, value)
	*/
	sp.metadata = function (handler) {
		if (factory.json_object.meta) {
			factory.json_object.meta.forEach(function (meta) {
				handler.declare(Object.keys(meta)[0], Object.values(meta)[0]);
			});
		}
	}

	/**
	* Setup a control output handler with a function of type (path, value)
	* to be used on each generated output value. This handler will be called
	* each audio cycle at the end of the 'compute' method.
	*
	* @param handler - a function of type function(path, value)
	*/
	sp.setOutputParamHandler = function (handler) {
		sp.output_handler = handler;
	}

	/**
	* Get the current output handler.
	*/
	sp.getOutputParamHandler = function () {
		return sp.output_handler;
	}

	/**
	* Controller
	*
	* @param channel - the MIDI channel (0..15, not used for now)
	* @param ctrl - the MIDI controller number (0..127)
	* @param value - the MIDI controller value (0..127)
	*/
	sp.ctrlChange = function (channel, ctrl, value) {
		if (sp.fCtrlLabel[ctrl] !== []) {
			for (var i = 0; i < sp.fCtrlLabel[ctrl].length; i++) {
				var path = sp.fCtrlLabel[ctrl][i].path;
				sp.setParamValue(path, remap(value, 0, 127, sp.fCtrlLabel[ctrl][i].min, sp.fCtrlLabel[ctrl][i].max));
				if (sp.output_handler) {
					sp.output_handler(path, sp.getParamValue(path));
				}
			}
		}
	}

	/**
	* PitchWeel
	*
	* @param channel - the MIDI channel (0..15, not used for now)
	* @param value - the MIDI controller value (0..16383)
	*/
	sp.pitchWheel = function (channel, wheel) {
		for (var i = 0; i < sp.fPitchwheelLabel.length; i++) {
			var pw = sp.fPitchwheelLabel[i];
			sp.setParamValue(pw.path, remap(wheel, 0, 16383, pw.min, pw.max));
			if (sp.output_handler) {
				sp.output_handler(pw.path, sp.getParamValue(pw.path));
			}
		}
	}

	/**
	* Set parameter value.
	*
	* @param path - the path to the wanted parameter (retrieved using 'getParams' method)
	* @param val - the float value for the wanted control
	*/
	sp.setParamValue = function (path, val) {
		return sp.factory.setParamValue(sp.dsp, sp.pathTable[path], val);
	}

	/**
	* Get parameter value.
	*
	* @param path - the path to the wanted parameter (retrieved using 'getParams' method)
	*
	* @return the float value
	*/
	sp.getParamValue = function (path) {
		return sp.factory.getParamValue(sp.dsp, sp.pathTable[path]);
	}

	/**
	* Get the table of all control paths.
	*
	* @return the table of all input parameters paths
	*/
	sp.getParams = function () {
		return sp.inputs_items;
	}

	/**
	* Get DSP JSON description with its UI and metadata
	*
	* @return DSP JSON description
	*/
	sp.getJSON = function () {
		return factory.getJSON();
	}

	//»

	// Init resulting DSP
	sp.initAux();

	// Call continuation
	callback(sp);

//   });

//        .catch(function (error) { console.log(error); faust.error_msg = "Faust DSP cannot be instantiated"; callback(null); });
}//»

export const app = function(Win, Desk) {

//Var«

let Main = Win.main;
let midi;
let node;
let ctx = globals.audioCtx || new AudioContext();
globals.audioCtx = ctx;

let gain = ctx.createGain();
gain.connect(ctx.destination);

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

const saveFactory=async (factory, path) => {//«
	let o = {};
	let b64 = bufToBase64(factory.code);
	o.base64_code = b64;
	o.code_source = factory.code_source;
	o.helpers = factory.helpers;
	o.json_object = factory.json_object;
	o.name = factory.name;
	o.sha_key = factory.sha_key;
	o.polyphony = [];
log(`Saving to: ${path}`);
	let rv = await fsapi.writeFile(path, await capi.compress(JSON.stringify(o)));
log("Done", rv);
};//»

const bufToBase64=(buf)=>{//«
	let binary = '';
	let bytes = new Uint8Array(buf);
	let len = bytes.byteLength;
	for (let i = 0; i < len; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return window.btoa(binary);
}//»

let FNAME = 'bouncy_harp';
let BASEPATH = '/home/me/Desktop';
let PATH = `${BASEPATH}/${FNAME}.gz`;

const loadFromString=(str, save_path)=>{//«
	return new Promise(async (Y,N)=>{
		faust.createDSPFactory(str, ["-I", "libraries", "-ftz", "2"], async factory => {
if (!factory){
log("NO FACTORY");
return;
}
			if (save_path) saveFactory(factory,save_path);
			faust.createDSPWorkletInstance(factory, ctx, Y);
		})
	})
};//»
const loadFromDisk = (path) => {//«
	return new Promise(async(Y,N)=>{
		let rv = await fsapi.readFile(path);
		let szlenstr = String.fromCharCode(rv[0]) + String.fromCharCode(rv[1]);
		let szlen = parseInt(szlenstr);
		let szstr = '';
		for (let i=2; i < 2+szlen; i++) szstr += String.fromCharCode(rv[i]);
		let code_sz = parseInt(szstr);
		let code = rv.slice(2+szlen, 2+szlen+code_sz);
		let obj = JSON.parse(await capi.toStr(rv.slice(2+szlen+code_sz)));
		createDSPInstance({
			json_object: obj,
			module: await WebAssembly.compile(code)
		}, ctx, 1024, Y);
		return;
	});
};//»

//»

//«
//let node;

this.onappinit=async(args={})=>{//«

/*
// $ mount faust
let FULLPATH = '/mnt/faust/physicalModeling/violinMIDI.dsp';

let rv = await fsapi.pathToNode(FULLPATH);
if (!rv) return;
let str = await rv.text;
log(str);

//log(appargs);
//node = await loadFromString(`import("stdfaust.lib");
//process = pm.${FNAME}  <: _,_;`);

//PATH = `${BASEPATH}/bouncy_harp.gz`;
//node = await loadFromString(HARP_STR, PATH);

//log(node);

//return;
*/

node = args.reInit && args.reInit.node || await loadFromDisk("/home/me/sine.faust");
//log(node);
let items = node.inputs_items;
log(items);

node.node.connect(gain);

//node.node.connect(gain);
log(node.getParamValue(items[0]));
//node.setParamValue(items[0], 2);
setTimeout(()=>{
node.setParamValue(items[0], 330);
setTimeout(()=>{
//node.setParamValue(items[3], 0);
},500);
},500);


//log(node.getParam('/vocal/vowel'));

//log(node);

/*

let items = node.inputs_items;
log(items);
node.connect(gain);
//node.setParamValue(items[0], 100);
//node.setParamValue(items[5], 1);
//node.setParamValue(items[3], 1);
setTimeout(()=>{
//log(node.getParamValue(items[0]));
//node.setParamValue(items[0], 0);
},1000);
*/
//log(key, val);
//log(knode);
//log(items[0]);

/*
let knode = await loadFromString(BUZZER_STR);
let knode = await loadFromDisk("/home/me/Desktop/YIB.gz");
let keynum = 4;
let key = items[keynum];
let val = knode.getParamValue(key);
knode.setParamValue(key, 1);
knode.connect(gain);
*/

}//»
this.onkill=()=>{//«
	this.reInit={
		node: node
	};
	gain && gain.disconnect();
	midi && midi.rm_cb(midi_cb);
};//»
this.onkeydown=(e,k)=>{//«
	if (k=="SPACE_"){

if (!gain.gain.value) gain.gain.value=1;
else gain.gain.value=0;

/*
let items = node.inputs_items;
let keynum = 3;
let key = items[keynum];
let val = node.getParamValue(key);
node.setParamValue(key, 1);
setTimeout(()=>{
node.setParamValue(key, 0);
},1000);
*/
	}
	else if (k=="m_"){
		if (midi) return;
		dogetmidi();
	}
	else if (k=="v_"){
	}
};//»
this.onkeyup=(e,k)=>{//«
	if (k=="SPACE_"){
//		if (gain.gain.value) gain.gain.value=0;
//		else gain.gain.value=1;
	}
};//»

//»

}

