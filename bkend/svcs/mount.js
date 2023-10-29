
//Imports«

const spawn = require('child_process').spawn;
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const https = require('https');
const http = require('http');

//»

//Var«

//We might want ../../usr/bin/ls for termux in Android, to avoid busybox ls
let use_ls = "ls";

//let use_ws = false;
//let ws;

let LOCAL_PATH;
//let hostname = "127.0.0.1";
let hostname = "localhost";
let portnum = 20001;
let log = function(arg){console.log(arg)}
let jobs = [];

const DIRNAME=".LOTW";

const ext_to_mime = {
	"js": "application/javascript",
	"json": "application/javascript",
	"html": "text/html",
	"txt": "text/plain",
	"sh": "text/plain",
	"gz": "application/gzip",
	"mp4": "video/mp4",
	"webm": "video/webm",
	"png":"image/png",
	"jpg":"image/jpeg",
	"jpeg":"image/jpeg",
	"gif":"image/gif"
//	"wav": "audio/wav"
}

let i, arg, marr;
//»

//Args«

try{
	LOCAL_PATH = process.argv[2];
	if (!LOCAL_PATH) throw "No path arg!"
	let stats = fs.statSync(LOCAL_PATH);
	if (!stats.isDirectory()) throw LOCAL_PATH+": not a directory!"
	LOCAL_PATH = path.resolve(LOCAL_PATH);
	let arg3 = process.argv[3];
	if (arg3){
		portnum = parseInt(arg3);
		if (isNaN(portnum)||portnum>65535) throw "Invalid port argument: " + arg3;
		else if (portnum < 1025) throw "Unsafe port argument: " + arg3;
	}
	if (process.argv[4]) throw "Too many arguments";
}
catch(e){
	log(e);
	return;
}

//»

//Funcs«

const allFilesSync = (dir, fileList = []) => {//«
	fs.readdirSync(dir).forEach(file => {
		let filePath = path.join(dir, file)
		let stats = fs.statSync(filePath);
		let isdir = stats.isDirectory();
		if (isdir) fileList.push({[file]: allFilesSync(filePath)});
		else {
			let ret = fs.readFileSync(filePath);
			let shasum = crypto.createHash('sha1');
			shasum.update(ret);
			let hexsum = shasum.digest('hex');
//			fileList.push([file,stats.size,hexsum]);
			fileList.push(file);
		}
	})
	return fileList;
}//»
const header=(res, code, mimearg)=>{//«
    let usemime = "text/plain";
    if (mimearg) usemime = mimearg;
    if (code == 200) {
        res.writeHead(200, {'Content-Type': usemime, 'Access-Control-Allow-Origin': "*"});
    }
    else res.writeHead(code, {'Content-Type': usemime, 'Access-Control-Allow-Origin': "*"});
}//»
const nogo=(res, mess)=>{//«
	header(res, 404);
	if (!mess) mess = "NO";
	res.end(mess+"\n");
}//»
const okay=(res, usemime)=>{//«
    header(res, 200, usemime);
}//»

//»

const handle_request=(req,res)=>{//«
"use strict";

const old_hard_spawn=(name, args, cb, send_json)=>{//«

//	spawn('sh', ['-c', 'unoconv -f pdf --stdout sample.doc | pdftotext -layout -enc UTF-8 - out.txt']);
//let arg_str = args

	let com = spawn(name, args);
    var str = '';
    com.on('error', function() {
        cb(null);
    }); 
    com.stdout.on('data', function(dat) {
        str += dat.toString();
    });
    com.on('close', function() {
		if (send_json) {
			let arr = str.split("\n");
			if (!arr.length) arr=[" "];
			if (arr.length && arr[arr.length-1]==="")  arr.pop();
			cb(JSON.stringify(arr));
		}
		else cb(str);
    }); 
}//»
const hard_spawn=(name, args, cb, send_json)=>{//«

//	spawn('sh', ['-c', 'unoconv -f pdf --stdout sample.doc | pdftotext -layout -enc UTF-8 - out.txt']);
//let arg_str = args
	let do_unescape = true;

	let com_args = args.join(" ");
	if (do_unescape) com_args = com_args.replace(/\\x27/g,"'").replace(/\\x22/g,'"');
	let com = spawn('sh', ['-c', name+" "+com_args]);
    var str = '';
    com.on('error', function() {
        cb(null);
    }); 
    com.stdout.on('data', function(dat) {
        str += dat.toString();
    });
    com.on('close', function() {
		if (send_json) {
			let arr = str.split("\n");
			if (!arr.length) arr=[" "];
			if (arr.length && arr[arr.length-1]==="")  arr.pop();
			cb(JSON.stringify(arr));
		}
		else cb(str);
    }); 
}//»

let meth = req.method;
let body, path, enc, pos;
let marr;
let url_arr = req.url.split("?");
let len = url_arr.length;
if (len==0||len>2) return nogo(res);
let url = url_arr[0];
let args = url_arr[1];
let arg_hash={};
if (args) {//«
	let args_arr = args.split("&");
	for (let i=0; i < args_arr.length; i++) {
		let argi = args_arr[i].split("=");
		let key = argi[0];
		let val = argi[1];
		if (!val) val = false;
		arg_hash[key] = val;
	}
}//»
if (meth=="GET"){
	if (url=="/") {//«
		if (arg_hash.path){//«
			let decpath = decodeURIComponent(arg_hash.path);
			let usemime=null;
            marr = decpath.match(/\.([a-z0-9]+)$/);
			if (marr&&marr[1]) usemime = ext_to_mime[marr[1]];
			if (!usemime) usemime = "application/octet-stream";
			let localpath = LOCAL_PATH+decpath;
//			let localpath = LOCAL_PATH+arg_hash.path;
			let str;
//			let esc_path = localpath.replace(/[ \x22\x27\x5b\x60#~{<>$|&!;()]/g, "\\$&");
			let esc_path = "'"+localpath.replace(/\x27/g, "\\$&")+"'";
log("Getting: "+localpath);
			let stats = null;
			try {
				stats = fs.statSync(localpath)
			}	
			catch(e){
log(e);
			}
			if (!stats) return nogo(res, decpath+": not found");
			
			if (!stats.isFile()) {
				if (stats.isDirectory()) return nogo(res, decpath+": is a directory");
				return nogo(res, decpath+": is not a regular file");
			}
			let nBytes = stats.size
			if (arg_hash.getsize) {
				okay(res);
				res.end(nBytes+"");
			}
			else if (arg_hash.getmfra) {//«
				fs.open(localpath, "r", (err,fd)=>{
					if (err) return nogo(res, "File open error");
					let mfrobuf = new Buffer(16);
					fs.read(fd, mfrobuf, 0, 16, nBytes-16, (err, nBytesRead, mfrobufret)=>{
						if (err) return nogo(res, "File read error (mfrobuf)");
						if (!(mfrobufret[4]==0x6d &&mfrobufret[5]==0x66 &&mfrobufret[6]==0x72 &&mfrobufret[7]==0x6f)) return nogo(res, "Did not get an 'mfro' magic number!");
						let mfra_off = mfrobufret.readUInt32BE(12);
						let mfrabuf = new Buffer(mfra_off);
						fs.read(fd, mfrabuf, 0, mfra_off, nBytes-mfra_off, (err, nBytesRead, mfrabufret)=>{
						if (err) return nogo(res, "File read error (mfrabuf)");
							okay(res, "application/octet-stream");
							res.end(mfrabufret);
						});
					});
				});
			}//»
			else if (arg_hash.range){//«
				let range = arg_hash.range
				let def_max = 1024*1024;
				if (range.match(/^[0-9]+-[0-9]+$/)) {}
				else if (range.match(/^[0-9]+-end$/)) {}
				else return nogo(res, "Invalid range request");

				let parts = range.split("-");
				let start = parseInt(parts[0], 10)

				let end;
				if (parts[1]==="end") end = start+def_max-1;
				else end = parseInt(parts[1], 10)-1;
				if (start >= end) return nogo(res, "start >= end in range request: start="+start+"  end="+end);

				let opts = {start: start, end: end}
				if (localpath.match(/\.(js|htm|html|json|txt|sh)$/)) opts.encoding = 'utf8';
				let readstream = fs.createReadStream(localpath, opts)
				okay(res, usemime);
				readstream.pipe(res);
			}//»
			else return nogo(res, "There are no plain GET requests: a range is required! ");
		}//»
		else {
			okay(res);
			res.end("HI");
		}
	}//»
	else if (url=="/_getdirobj"){//«
		let path = decodeURIComponent(arg_hash.path);
		if (path && !path.match(/\.\./)) {
			if (path == "/") path = LOCAL_PATH;
			else path = LOCAL_PATH + "/" + path;
			let ret = allFilesSync(path);
			okay(res,"application/javascript");
			res.end(JSON.stringify(ret));
		}   
		else nogo(res);
	}//»
	else if (url=="/_getfilehash"){//«
		let path = decodeURIComponent(arg_hash.path);
		let ret;
		try {
			ret = fs.readFileSync(LOCAL_PATH+"/"+path);
		}
		catch(e){
			nogo(res, "Trying to read directory?");
			return;
		}
		let shasum = crypto.createHash('sha1');
		shasum.update(ret);
		let hexsum = shasum.digest('hex');
		okay(res);
		res.end(hexsum);
	}//»
	else if (url=="/_getdir"){//«
		let path = decodeURIComponent(arg_hash.path);
		let recur = args['all'];
		let comarg = "-Lp";
		if (recur) comarg += "R";
		comarg += "gG";
		if (path && !path.match(/\.\./)) {
			if (path == "/") path = LOCAL_PATH;
			else path = LOCAL_PATH + "/" + path;
			hard_spawn(use_ls, [comarg, '--time-style=+%s' ,path], function(ret) {
				if (ret == null) nogo(res);
				else {
					okay(res);
					res.end(ret);
				}   
			}, true); 
		}   
		else nogo(res);
	}//»
	else nogo(res);
}
else if (meth=="POST") nogo(res);
else nogo(res);

}//»

http.createServer(handle_request).listen(portnum, hostname);

log("Path: "+LOCAL_PATH);
log(`File server listening at http://${hostname}:${portnum}`);

















/*Old«


if (arg_hash.is_remote){//«
	let usemod;
	if (decpath.match(/^http:\/\//)) usemod = http;
	else if (decpath.match(/^https:\/\//)) usemod = https;
	else return nogo(res, "Invalid protocol given");
log("GETTING: " + decpath);
	let http_req = usemod.get(decpath,http_res=>{
		okay(res, usemime);
		let dat = [];
		let tot = 0;
		let num = 0;
		const MAX_SIZE = 1024*1024;
		let aborted = false;
		http_res.on('data', (chunk) => {
			dat.push(chunk);
			tot+=chunk.length;
			if (tot > MAX_SIZE) {
				aborted = true;
				http_req.abort();
				nogo(res, "The requested file exceeded the maximum size: " + MAX_SIZE);
				return;
			}
			num++;
		});
		http_res.on('end', () => {
			if (aborted) return;
			res.end(Buffer.concat(dat));
		});
	}).on('error', (err) => {
		nogo(res,err.message);
	});

	return;
}//»



	else if (url=="/_wget"){//«
		let path = decodeURIComponent(arg_hash.path);
//		old_hard_spawn("wget", ["-O","-", "-U", "Mozilla/5.0 (MSIE; Windows 10)", "'"+path+"'"], (rv)=>{
		old_hard_spawn("wget", ["-O","-", "-U", "Mozilla/5.0 (MSIE; Windows 10)", path], (rv)=>{
			okay(res);
			res.end(rv);
		});
	}//»
	else if (url=="/_com"){//«
		let com = decodeURIComponent(arg_hash.arg);
		let arr = com.split(" ");
		let comname = arr.shift();
		hard_spawn(comname, arr, rv=>{
			okay(res);
			res.end(rv);
		});
	}//»

	if (url=="/_email"){//«
		const bad = s=>{
			nogo(res,s);
		};
		let toarg =  arg_hash.to;
		if (!toarg) return bad("No toarg");
		let to = decodeURIComponent(toarg);
		let s='';
		req.on('data',dat=>{
			s+=dat.toString();
		});
		req.on('end',()=>{
			let OUTFILE = "/tmp/SSMTPOUT.txt";
			fs.writeFileSync(OUTFILE, s,{encoding:"utf8"});
			let comstr=`/usr/sbin/ssmtp <${OUTFILE} ${to} && echo -n OK || echo -n ERR`;
			let com = spawn('sh', ['-c', comstr]);
			let str = '';
			com.on('error', ()=>{
				nogo(res,"ssmtp command error");
				fs.unlinkSync(OUTFILE);
			}); 
			com.stdout.on('data', dat=>{
				str += dat.toString();
			});
			com.on('close', ()=>{
				okay(res);
				res.end(`${str}: ${to}`);
				fs.unlinkSync(OUTFILE);
			}); 
		});
	}//»


//Websockets«
function Response(size, id, value){//«
	let buf = new ArrayBuffer(size);
	let view = new DataView(buf);
	view.setUint32(0, id);
	view.setUint32(4, value);
	return view;
}//»
function WSError(id, str){//«
	var out = new ArrayBuffer(8+str.length);
	var view = new DataView(out);
	view.setUint32(0, id);
	view.setUint32(4, 0x45525220);//"ERR "
	for (let i=0; i < str.length; i++) view.setUint8(8+i, str.charCodeAt(i));
	ws.send(out);
	return false;
}//»
if (use_ws){
log("Using websockets...");
function Job(id){//«
	var lens = [];
	var filenames = [];
	var files = [];
	var started = false;
	var done = false;
	var killed = false;
	var kid_process;
	var outname;
	function hard_spawn(name, args, cb) {//«
		var com = spawn(name, args);
		kid_process = com;
		started = true;
		com.on('error', function() {
			done = true;
			WSError(id, "Spawn error");
		});
		com.stderr.on('data', function(dat) {
			var view = Response(8+dat.length, id, 0x53455252);//"SERR"
			var u8arr = new Uint8Array(view.buffer);
			u8arr.set(dat, 8);
			ws.send(view.buffer);
		});
		com.stdout.on('data', function(dat) {
			var view = Response(8+dat.length, id, 0x534f5554);//"SOUT"
			var u8arr = new Uint8Array(view.buffer);
			u8arr.set(dat, 8);
			ws.send(view.buffer);
		});
		com.on('close', function() {
			done = true;
			cb();
		});
	}//»

	this.init=function(dat){//«
		var iter=0;
		var view = new Response(12, id, 0x54494e49);//TINI
		var nfiles = dat.getUint8(0);
		if (nfiles==0){
			filenames = [];
			ws.send(view.buffer);
			return true;
		}

		var i=1;
		for (let iter=0; iter<nfiles; iter++,i+=4){
			let num = dat.getUint32(i);
			lens.push(num);
		}

		var curname = "";
		for (;i<dat.byteLength;i++){
			let code = dat.getUint8(i);
			if (code===0){
				filenames.push(curname);
				curname="";
			}
			else curname+=String.fromCharCode(code);
		}

		filenames = filenames.slice(0,nfiles);

//		view = new Response(12, id, 0x54494e49);//TINI
		view.setUint32(8, lens.length);
		ws.send(view.buffer);
		return true;
	}//»

	this.setfile=(num,bufarg)=>{//«
		if (bufarg.byteLength !== lens[num]) return WSError(id, "Length doesn't match for file["+num+"]: " + buf.byteLength+"!="+lens[num]);
		var buf = new Buffer(new Uint8Array(bufarg));
		files[num] = buf;
		fs.writeFileSync("/dev/shm/"+DIRNAME+"/"+id+"_input_"+filenames[num], buf,{encoding:null});
		let view = new Response(13, id, 0x454c4946);//ELIF
		view.setUint8(8, num);
		view.setUint32(9, bufarg.byteLength);
		ws.send(view.buffer);
		return true;
	}//»

	this.char_in=(bufarg)=>{//«
		var arr = new DataView(bufarg);
		var code = arr.getUint8(0);
		var  ch=String.fromCharCode(code);
		if (ch) {
			kid_process.stdin.write(ch);
		}
		else log("char_in(): Got no character for code:" + code);
	}//»

	this.process=(bufarg)=>{//«
		var out = [];
		var outname;
		var arr = new DataView(bufarg);
		var str = "";
		var args = [];
		var com = null;
		var args_done = false;
		for (let i=0; i < arr.byteLength; i++){
			let code = arr.getUint8(i);
			if (code===0){
				if (com==null) com = str;
				else if (args_done) {
					if (!str) return WSError(id, "Got no extension!!!");
					outname = "/dev/shm/"+DIRNAME+"/job_"+id+"_outfile."+str;
				}
				else {
					args.push(str);
					if ((i+1 < arr.byteLength) && (arr.getUint8(i+1)===0)){
						i++;
						args_done = true;
					}
				}
				str="";
			}
			else str+=String.fromCharCode(code);
		}
		if (!args.length) return WSError(id, "Bad arguments!");

		for (let i=0; i < args.length; i++){
			if (args[i]=="-i"){
				let name = args[i+1];
				args[i+1]="/dev/shm/"+DIRNAME+"/"+id+"_input_"+name;
				i++;
			}
		}
		if (com=="ffmpeg"){
			if (!outname) return WSError(id, "No output file");
			args.push(outname);
		}
		hard_spawn(com, args, function(){
			if (killed) return;
			if (com=="ffmpeg") {
				if (!fs.existsSync(outname)) return WSError(id, "No output file: " + outname);
				let outbuf = fs.readFileSync(outname);
				if (!(outbuf&&outbuf.length)) return WSError(id, "No output file returned!");
				let view = new Response(8+outbuf.length, id, 0x67798280);//CORP
				let u8arr = new Uint8Array(view.buffer);
				u8arr.set(outbuf, 8);
				ws.send(view.buffer);
				fs.unlinkSync(outname);
			}
			else {
				let view = new Response(8, id, 0x67798280);//CORP
				ws.send(view.buffer);
			}
		});

		return true;

	}//»

	this.kill = function(){//«
		if (kid_process && !done) {
			killed = true;
			kid_process.kill();
			if (outname) fs.unlinkSync(outname);
		}
		for (let i=0; i < filenames.length; i++) fs.unlinkSync("/dev/shm/"+DIRNAME+"/"+id+"_input_"+filenames[i]);
	}//»

}//»
let WebSocketServer = require('./nodejs/ws').Server;//«
let wss = new WebSocketServer({server: server});
wss.on('connection', function(wsarg) {//«
	ws = wsarg;
	ws.binaryType="arraybuffer";
	ws.on('message', function(mess) {
		var buf = new Uint8Array(mess).buffer;
		var view = new DataView(buf);
		var id = view.getUint32(0);
		var com = view.getUint32(4);
		if (com==0x494e4954){//INIT
			let job = new Job(id);
			jobs[id]=job;
			job.init(new DataView(buf,8));
			return;
		}
		var job = jobs[id];
		if (!job) return WSError(id, "No job exists for id: " + id);
		if (com==0x46494c45){//FILE
			let num = view.getUint8(8);
			job.setfile(num, buf.slice(9));
		}
		else if (com==0x80827967){//PROC
			job.process(buf.slice(8));
		}//
		else if (com==0x4348494e){//CHIN
			job.char_in(buf.slice(8));
		}//
		else if (com==0x4b494c4c){//KILL
			job.kill();
			jobs[id]=null;
//log("Job killed: " + id);
		}
		else {
			log("Unknown com: 0x"+com.toString(16));
		}
	});
});//»
//»`
if (!fs.existsSync("/dev/shm")) init_err("/dev/shm: Not found!");
if (!fs.existsSync("/dev/shm/"+DIRNAME)) fs.mkdirSync("/dev/shm/"+DIRNAME);

let wait_on_pipe=_=>{
log("Waiting on pipein...");
fs.readFile('/home/munt/lotw/pipein',(err,dat)=>{
if (err) return wait_on_pipe();
if (ws) ws.send(dat);
wait_on_pipe();
});
}
wait_on_pipe();
}
//»

»*/





