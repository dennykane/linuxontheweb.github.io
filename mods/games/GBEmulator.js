import { util, api as capi } from "/sys/util.js";
import {globals} from "/sys/config.js";
const{ log, jlog, cwarn, cerr, isstr, isnum, make, mk, mkdv} = util;

export const mod = function(Core) {

let silent_mode = false;
//var globals = Core.globals;
var audio_ctx = globals.audio_ctx;

var fs = globals.fs;

function GBEmulator(arcade_obj, romArrayBuffer, mod, canvasEl, outgain, maincb) {//«
"use strict";
var keymap = {};
var BUT_A = "A";
var BUT_B = "B";
var BUT_SEL = "Select";
var BUT_START = "Start";
var BUT_UP = "U";
var BUT_LEFT = "L";
var BUT_DOWN = "D";
var BUT_RIGHT = "R";

//«
// * Copyright (C) 2017 Ben Smith
// *
// * This software may be modified and distributed under the terms
// * of the MIT license.  See the LICENSE file for details.
//»

//Var«

//var mod = wasm_mod;

var failed = false;
var funcs = mod.asm;
var HEAPU8 = mod.HEAPU8;

const SCREEN_WIDTH = 160;
const SCREEN_HEIGHT = 144;
const ASPECT = SCREEN_WIDTH/SCREEN_HEIGHT;
const AUDIO_FRAMES = 4096;
const AUDIO_LATENCY_SEC = 0.1;
const MAX_UPDATE_SEC = 5 / 60;
const CPU_CYCLES_PER_SECOND = 4194304;
const EVENT_NEW_FRAME = 1;
const EVENT_AUDIO_BUFFER_FULL = 2;
const EVENT_UNTIL_CYCLES = 4;

var emulator = null;
var _emul;

//var canvasEl = make("canvas");
//canvasEl.width=SCREEN_WIDTH;
//canvasEl.height=SCREEN_HEIGHT;
//canvasEl.style.margin="auto";
//main.innerHTML="";
//main.add(canvasEl);

//»

//Util«
function lerp(from, to, alpha){return (alpha * from) + (1 - alpha) * to;}

function set_keymap() {//«
	keymap[BUT_A] = funcs._set_joyp_A;
	keymap[BUT_B] = funcs._set_joyp_B;
	keymap[BUT_SEL] = funcs._set_joyp_select;
	keymap[BUT_START] = funcs._set_joyp_start;
	keymap[BUT_UP] = funcs._set_joyp_up;
	keymap[BUT_DOWN] = funcs._set_joyp_down;
	keymap[BUT_LEFT] = funcs._set_joyp_left;
	keymap[BUT_RIGHT] = funcs._set_joyp_right;
}//»
function fire(which, is_down) {//«
	if (!_emul) return;
	var func = keymap[which];
	if (!func) return;
	func(_emul, is_down);
}//»


function startEmulator() {//«
  if (emulator) {
    emulator.cleanup();
  }
  emulator = new Emulator();
  emulator.run();
}//»

//»

//Emulator«
function Emulator() {//«
  this.cleanupFuncs = [];
  this.renderer = new WebGLRenderer(canvasEl);
//  this.renderer = new Canvas2DRenderer(canvasEl);
//  this.audio = new AudioContext();
  this.audio = audio_ctx;
  this.defer(function() { this.audio.close(); });

  var romData = funcs._malloc(romArrayBuffer.byteLength);
  HEAPU8.set(new Uint8Array(romArrayBuffer), romData, romArrayBuffer.byteLength);
  _emul = funcs._emulator_new_simple(romData, romArrayBuffer.byteLength, this.audio.sampleRate, AUDIO_FRAMES);
  this.e = _emul;
  if (this.e == 0) {
//    throw Error('Invalid ROM.');
	return maincb(null, "Invalid ROM");

  }

var kill=()=>{
//log("KILL!");
funcs._emulator_delete(this.e);
}
this.kill=kill;
this.defer(kill);

  this.frameBuffer = new Uint8Array(mod.buffer,funcs._get_frame_buffer_ptr(this.e),funcs._get_frame_buffer_size(this.e));
//  this.audioBuffer = new Uint8Array(Module.buffer,_get_audio_buffer_ptr(this.e),_get_audio_buffer_capacity(this.e));
  this.audioBuffer = new Int8Array(mod.buffer,funcs._get_audio_buffer_ptr(this.e),funcs._get_audio_buffer_capacity(this.e));

  this.lastSec = null;
  this.startAudioSec = null;
  this.leftoverCycles = 0;
  this.fps = 60;

  maincb(true);

}//»

Emulator.prototype.defer=function(f) {this.cleanupFuncs.push(f);};
Emulator.prototype.cleanup=function(){for (var i = 0; i < this.cleanupFuncs.length; ++i) {this.cleanupFuncs[i].call(this);}};
Emulator.prototype.pause=function(){
	cancelAnimationFrame(this.rafCancelToken);
};
Emulator.prototype.resume=function(){
	this.rafCancelToken = requestAnimationFrame(this.renderVideo.bind(this));
//    this.defer(function() { cancelAnimationFrame(this.rafCancelToken); });
};

Emulator.prototype.run=function(){//«
  this.rafCancelToken = requestAnimationFrame(this.renderVideo.bind(this));
  this.defer(function() { cancelAnimationFrame(this.rafCancelToken); });
};//»
Emulator.prototype.getCycles = function(){return funcs._emulator_get_cycles(this.e)>>>0;};
Emulator.prototype.renderVideo = function(startMs) {//«
//We should only do this if there is not an interval
//  fs.get_all_gp_events(true);
  arcade_obj.poll_gp();

  this.rafCancelToken = requestAnimationFrame(this.renderVideo.bind(this));

  var startSec = startMs / 1000;
  var deltaSec = Math.max(startSec - (this.lastSec || startSec), 0);
  var startCycles = this.getCycles();
  var deltaCycles = Math.min(deltaSec, MAX_UPDATE_SEC) * CPU_CYCLES_PER_SECOND;
  var runUntilCycles = (startCycles + deltaCycles - this.leftoverCycles) >>> 0;
  while (true) {//«
	try {
		var event = funcs._emulator_run_until(this.e, runUntilCycles);
	}catch(e) {
		emulator.pause();
	return;
	}
    if (event & EVENT_NEW_FRAME) {
      this.renderer.uploadTexture(this.frameBuffer);
    }
    if (!silent_mode && event & EVENT_AUDIO_BUFFER_FULL) {
      var nowAudioSec = this.audio.currentTime;
      var nowPlusLatency = nowAudioSec + AUDIO_LATENCY_SEC;
      this.startAudioSec = (this.startAudioSec || nowPlusLatency);
      if (this.startAudioSec >= nowAudioSec) {
        var buffer =
            this.audio.createBuffer(2, AUDIO_FRAMES, this.audio.sampleRate);
        var channel0 = buffer.getChannelData(0);
        var channel1 = buffer.getChannelData(1);
        var outPos = 0;
        var inPos = 0;
        for (var i = 0; i < AUDIO_FRAMES; i++) {
          channel0[outPos] = this.audioBuffer[inPos]/128;
          channel1[outPos] = this.audioBuffer[inPos + 1]/128;
          outPos++;
          inPos += 2;
        }
        var bufferSource = this.audio.createBufferSource();
        bufferSource.buffer = buffer;
        bufferSource.connect(outgain);
        bufferSource.start(this.startAudioSec);
        var bufferSec = AUDIO_FRAMES / this.audio.sampleRate;
        this.startAudioSec += bufferSec;
      } 
	else this.startAudioSec = nowPlusLatency;
      
    }
    if (event & EVENT_UNTIL_CYCLES) {
      break;
    }
  }//»
  this.leftoverCycles = (this.getCycles() - runUntilCycles) | 0;
  this.lastSec = startSec;
  this.fps = lerp(this.fps, Math.min(1 / deltaSec, 10000), 0.3);
  this.renderer.renderTexture();
};//»
//»

//Canvas2DRenderer«
//function Canvas2DRenderer(el){this.ctx = el.getContext('2d');this.imageData = this.ctx.createImageData(el.width, el.height);}
//Canvas2DRenderer.prototype.renderTexture=function(){this.ctx.putImageData(this.imageData, 0, 0);};
//Canvas2DRenderer.prototype.uploadTexture = function(buffer){this.imageData.data.set(buffer);};
//»

//WebGLRenderer«

function WebGLRenderer(el) {//«
  var gl = this.gl = el.getContext('webgl');

  var w = SCREEN_WIDTH / 256;
  var h = SCREEN_HEIGHT / 256;
  var buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,  0, h,
    +1, -1,  w, h,
    -1, +1,  0, 0,
    +1, +1,  w, 0,
  ]), gl.STATIC_DRAW);

  var texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA, 256, 256, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

  var compileShader = function(type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.log('compileShader failed: ' + gl.getShaderInfoLog(shader));
    }
    return shader;
  };

  var vertexShader = compileShader(gl.VERTEX_SHADER,
    'attribute vec2 aPos;' +
    'attribute vec2 aTexCoord;' +
    'varying highp vec2 vTexCoord;' +
    'void main(void) {' +
    '  gl_Position = vec4(aPos, 0.0, 1.0);' +
    '  vTexCoord = aTexCoord;' +
    '}'
  );
  var fragmentShader = compileShader(gl.FRAGMENT_SHADER,
      'varying highp vec2 vTexCoord;' +
      'uniform sampler2D uSampler;' +
      'void main(void) {' +
      '  gl_FragColor = texture2D(uSampler, vTexCoord);' +
      '}'
  );

  var program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.log('program link failed: ' + gl.getProgramInfoLog(program));
  }
  gl.useProgram(program);

  var aPos = gl.getAttribLocation(program, 'aPos');
  var aTexCoord = gl.getAttribLocation(program, 'aTexCoord');
  var uSampler = gl.getUniformLocation(program, 'uSampler');

  gl.enableVertexAttribArray(aPos);
  gl.enableVertexAttribArray(aTexCoord);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, gl.FALSE, 16, 0);
  gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, gl.FALSE, 16, 8);
  gl.uniform1i(uSampler, 0);
}//»

WebGLRenderer.prototype.renderTexture = function() {//«
  this.gl.clearColor(0.5, 0.5, 0.5, 1.0);
  this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
};//»
WebGLRenderer.prototype.uploadTexture = function(buffer) {//«
  this.gl.texSubImage2D(
      this.gl.TEXTURE_2D, 0, 0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, this.gl.RGBA,
      this.gl.UNSIGNED_BYTE, buffer);
};//»

//»

	emulator = new Emulator();

//	emulator.resize = resize;
	emulator.fire = fire;
	emulator.set_keymap = set_keymap;
//	resize();
	set_keymap();
	emulator.run();
emulator.toggleSilentMode=()=>{
	silent_mode = !silent_mode;
};
	return emulator;

}//»

this.init = function(appobj, bytes, canvas, gain, cb, wasm){
	return GBEmulator(appobj, bytes.buffer, wasm, canvas, gain, cb);
}

}

