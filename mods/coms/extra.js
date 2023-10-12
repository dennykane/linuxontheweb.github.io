import { util, api as capi } from "/sys/util.js";
import { globals } from "/sys/config.js";
const{strnum, isarr, isstr, isnum, isobj, log, jlog, cwarn, cerr}=util;
const{NS, fs}=globals;
const fsapi = fs.api;
const {pathToNode}=fsapi;
//const{log, jlog, cwarn, cerr}=util;

const TERM_OK = 0;
const TERM_ERR = 1;

//Util«

const term_error=(term, arg)=>{//«
    if (isstr(arg)) arg = term.fmt2(arg);
    term.response({ERR: arg, NOEND: true});
};//»
const term_out=(term, arg)=>{//«
    if (isstr(arg)) arg = term.fmt(arg);
    term.response({SUCC: arg, NOEND: true});
};//»

const validate_out_path = async(outpath)=>{//«
	if (await pathToNode(outpath)) return `${outpath}: the file exists`;
	let arr = outpath.split("/");
	arr.pop();
	let parpath = arr.join("/");
	let parnode = await pathToNode(parpath);
	if (!parnode) return `${parpath}: The directory doesn't exist`;
	if (! await fsapi.checkDirPerm(parnode)){
		return `${parpath}: permission denied`;
	}
	return true;
};//»
//»

const com_record = (term,args)=>{//«
return new Promise(async(Y,N)=>{

const terr=(arg)=>{term_error(term, arg);Y();};
let outname = args.shift();
if (!outname) return terr("No outname given");
let out_path = normPath(outname, term.cur_dir);
let okay_rv = await validate_out_path(out_path);
if (isstr(okay_rv)) return terr(okay_rv);
outname = out_path.split("/").pop();

let interval;
let mediaRecorder;

term.kill_register(()=>{//«
	if (!mediaRecorder) return;
	clearInterval(interval);
	mediaRecorder.stop();
	setTimeout(async()=>{
		let blob = new Blob(recordedChunks, {
			type: "video/webm"
		});
		let mod = await capi.getMod("webmparser");
		let bytes = await capi.toBytes(blob);
		let rv = await mod.coms.remux(term, bytes);
		await fsapi.writeFile(out_path, rv);

//'V_MPEG4/ISO/AVC' == CODECID
//		let rv = mod.coms.parse(term, bytes);
//log(rv);
//		fsapi.writeFile(out_path, blob);
//		capi.download(blob, outname);
		Y();
	},500);
});//»

//let stream = await navigator.mediaDevices.getDisplayMedia({video: true, audio: true, preferCurrentTab: true, selfBrowserSurface: "include", systemAudio: "include" });
//let stream = await navigator.mediaDevices.getDisplayMedia({video: true, audio: false});
let stream = await navigator.mediaDevices.getDisplayMedia();

let recordedChunks = [];

//let options = { mimeType: "video/webm; codecs=vp9" };
let options = { mimeType: "video/webm; codecs=vp8" };
//mediaRecorder = new MediaRecorder(stream, options);
mediaRecorder = new MediaRecorder(stream, options);
mediaRecorder.ondataavailable =  (e)=>{
	if (e.data.size > 0) {
		recordedChunks.push(e.data);
log("Chunk",recordedChunks.length);
	} 
};
interval=setInterval(()=>{
	mediaRecorder.requestData();
},10000);
mediaRecorder.start();

});
};//»
const com_remux = async (term, args) => {//«

return new Promise(async(Y,N)=>{
const terr=(arg)=>{term_error(term, arg);Y();};

term.kill_register(Y);
let mod = await capi.getMod("webmparser");
if (!args.length) return terr("Need a filename");
let name = args.shift();
let node = await pathToNode(normPath(name, term.cur_dir));
if (!node) return terr(`${name}: not found`);

let outname = args.shift();
if (!outname) return terr("No outname given");
let outpath = normPath(outname, term.cur_dir);
let okay_path = await validate_out_path(outpath);
if (isstr(okay_path)) return terr(okay_path);

let bytes = await node.bytes;

let rv = await mod.coms.remux(term, bytes);
if (rv instanceof Blob){
if (!await fsapi.writeFile(outpath, rv)){
return terr("There was a problem writing the file");
}
terr("Done!");
}
else{
cwarn("OHNO");
}
//log(rv);
//log("OMMSED",rv);

Y();

});

//log(mod);

};//»
const com_webmcat = async (term, args, redir) => {//«
const tofloat = (arr) => {//«
	if (arr.length <= 4) return (new DataView(arr.buffer)).getFloat32();
	if (arr.length <= 8) return (new DataView(arr.buffer)).getFloat64();
}//»
const toint = (arr, if_cp) => {//«
	if (if_cp) arr = arr.slice().reverse();
	else arr = arr.reverse();
	let n = 0;
	for (let i = 0; i < arr.length; i++) n |= (arr[i] << (i * 8));
	return n;
}//»
	const terr=(arg)=>{term_error(term, arg);return TERM_ERR;};
	const tout=(arg)=>{term_out(term, arg);return TERM_OK;};
	let mod = await capi.getMod("webmparser");
	let tags = mod.WebmTags;
	let segtags = tags.kids["18538067"];
	let parse = mod.parse_section_flat;

let addTicks = 0;
let clusters = [];
let tracks;
let cluster_times=[];
let cluster_sizes=[];
let all_clusters_length = 0;
let cur_tracks_checksum;
let ebml;
while (args.length) {
	let path = args.shift();
	let fullpath = normPath(path, term.cur_dir);
	let node = await fsapi.pathToNode(fullpath);
	if (!node) return terr(`${fullpath}: No such file or directory`);
	let bytes = await node.bytes;
	let webm = parse(bytes, tags);
	if (!webm) return terr(`${fullpath}: Invalid webm`);
	if (!ebml) {
		ebml = webm[1]._bytes;
	}
	let seg = parse(webm[3], segtags);
	let info_bytes;
	let clustnum=0;
	for (let i=0; i < seg.length; i+=2){
		let which = seg[i];
		let bytes = seg[i+1];
		if (which.match(/^CLUSTER:/)) {
			if (!bytes[0]===231){
				return terr(`${fullpath}: ClusterTimeCode ID(0xe7) not found at first byte in cluster[${clustnum}]`);
			}
			let rv = mod.ebml_sz(bytes, 1);
			let tmval = addTicks + toint(bytes.slice(rv[1], rv[1]+rv[0]));
			cluster_times.push(tmval);
			let tmvalarr = mod.num_to_arr(tmval);

			let tmvalszarr = mod.num_to_arr(tmvalarr.length, 3);

			let blocks = bytes.slice(rv[0]+rv[1]);
			let newclustdat = new Uint8Array(blocks.length + 5 + tmvalarr.length);
			newclustdat[0] = 0xe7;
			newclustdat[1] = 0x10;
			newclustdat.set(tmvalszarr, 2);
			newclustdat.set(tmvalarr, 5);
			newclustdat.set(blocks, 5 + tmvalarr.length);
			let newclust = mod.make_ebml_elem([0x1f, 0x43, 0xb6, 0x75], newclustdat);
			all_clusters_length += newclust.length;
			cluster_sizes.push(newclust.length);
			clusters.push(newclust);
			clustnum++;
		}
		else if (which.match(/^INFO:/)) info_bytes = bytes;
		else if (which.match(/^TRACKS:/)) {
			let gottracks = bytes._bytes;
			let sum = await capi.sha1(gottracks);
			if (!cur_tracks_checksum) {
				cur_tracks_checksum = sum;
				tracks = gottracks;
			}
			else if (sum !== cur_tracks_checksum){
				return terr(`${fullpath}: The tracks section is different from a previous version`);
			}
		}
	}
	let info = mod.parse_section(info_bytes, segtags.kids["1549a966"]);
	for (let i=0; i < info.length; i+=2){
		if (info[i].match(/^DURATION:/)){
			addTicks += Math.round(tofloat(info[i+1]));
		}
	}
}

let last_block = mod.parse_section(clusters[clusters.length-1], segtags).pop().pop();
let last_block_time = toint(last_block.slice(1,3));
let total_ticks = last_block_time + cluster_times[cluster_times.length-1];

let all_clusters = new Uint8Array(all_clusters_length);
let curbyte=0;
for (let clust of clusters){
	all_clusters.set(clust, curbyte);
	curbyte+=clust.length;
}

let f = new mod.WebmFile();
f.duration = total_ticks;
f.timeCodeScale = 1_000_000;
f.muxingApp = "Zgrancheed";
f.writingApp = "Sofflering";
f.tracks = tracks;
f.clusters = all_clusters;
f.clusterSizes = cluster_sizes;
f.clusterTimes = cluster_times;
f.ebml = ebml;
f.makeInfo();
f.makeSeekHead();
f.makeCues();
f.makeSegment();
f.makeFile();

let blob =  new Blob([f.file]);
if (!redir){
return terr(`WebmFile(${blob.size})`);
}
return write_to_redir(term, blob, redir)



};//»
const com_walt = async (term, args) => {//«
	const terr=(arg)=>{term_error(term, arg);return TERM_ERR;};
	let walt = (await capi.getMod("walt")).Walt;
	let out;
	if (!args.length) return terr("Need a filename");
	let name = args.shift();
	let node = await pathToNode(normPath(name, term.cur_dir));
	if (!node) return terr(`${name}: not found`);
	try {
		out = walt.compile(await node.text);
	}
	catch(e){
log(e);
		return TERM_ERR;
	}
	if (!out) return terr("No compiler output!");
	let buf = out.buffer();
	fsapi.writeFile(`${term.cur_dir}/walt.wasm`, buf);
	return TERM_OK;
};//»
const com_wasm = async (term, args) => {//«
	const terr=(arg)=>{term_error(term, arg);return TERM_ERR;};
	const tout=(arg)=>{term_out(term, arg);return TERM_OK;};
	if (!args.length) return terr("Need a filename");
	let name = args.shift();
	let node = await pathToNode(normPath(name, term.cur_dir));
	let funcName = args.shift();
	if (!node) return terr(`${name}: not found`);
	if (!funcName) return terr("Need a function name");
try {
	let mod = await WebAssembly.instantiate(await node.buffer,{Math: Math});
	let exports = mod.instance.exports;
	let mem = exports.mem;
	let func = exports[funcName];
	if (!func) return terr(`${funcName}: not an exported function`);
let buf = new ArrayBuffer();
mem.grow(10);
log(mem);
log(func);
//log(mod);
////let rv = mod.instance.exports.getRem(12345678.0123456789);
//log("OUT",rv);
//log(mod);
}catch(e){
return terr(e.message);
}
//log(mod);
//log(await node.buffer);
return TERM_OK;
};//»

const com_parsewasm = async (term, args) => {//«
	const terr=(arg)=>{term_error(term, arg);return TERM_ERR;};
	const tout=(arg)=>{term_out(term, arg);return TERM_OK;};
	let out;
	if (!args.length) return terr("Need a filename");
	let name = args.shift();
	let node = await pathToNode(normPath(name, term.cur_dir));
	if (!node) return terr(`${name}: not found`);
	let bytes;
	if (name.match(/\.wasm$/)) bytes = await node.bytes;
	else {
		let b = await node.bytes;
		let szsz = parseInt(String.fromCharCode(b[0])+String.fromCharCode(b[1]));
		let szstr='';
		let i;
		for (i=0; i < szsz; i++){
			szstr += String.fromCharCode(b[i+2]);
		}
		let sz = parseInt(szstr);
		bytes = b.slice(i+2, i+2+sz);
	}

//log(bytes);


const OUT = (arg)=>{
//log(arg);
};
let wout = OUT;
let werr = OUT;
let woutarr = (arg)=>{
log(arg.join("\n"));
};
let mod = await capi.getMod("wasmparser");
log(mod);
let parser = new mod.parser(bytes, {termobj: term, wout, werr, woutarr});
log(parser);
//parser.dump_globals();
//log("???");
//let rv = parser.dump_elements();
//let rv = parser.dump_toplevel();
let rv;
try{
//rv = parser.dump_code(15);
rv = parser.dump_code(0);
}catch(e){
return terr(e.message);
}
//log(rv);
//log(bytes);
//log(node);
	return TERM_OK;
};//»


export const coms = {//«
	webmcat: com_webmcat,
	remux: com_remux,
	record: com_record,
	wasm: com_wasm,
	walt: com_walt,
//	food:(term, args)=>{
//		const terr=(arg)=>{term_error(term, arg);};
//		terr(`nargs: ${args.length}`);
//	}
};//»


