
let PARAGRAPH_SELECT_MODE = true; //Toggle with Ctrl+Alt+p«
/*
When using the text editor, we have to manually insert line breaks inside of paragraphs
at the end of every line:

-------------------------------------
These are a bunch of words that I'm   
writing, so I can seem very
literate, and this is a crazily-
hyphenated-word!

Here comes another paragraph...
-------------------------------------

With PARAGRAPH_SELECT_MODE turned on, the system clipboard will contain the following
text upon executing the do_copy_buffer command with Cltr+Alt+a (a_CA).

-------------------------------------
These are a bunch of words that I'm writing, so I can seem very literate, and this is a crazily-hyphenated-word!

Here comes another paragraph...
-------------------------------------

The actual line buffer in the editor is left unchanged. This is just a convenience function
to allow for seamless copying between the editor and web-like applications that handle their 
own formatting of paragraphs.

Toggling of PARAGRAPH_SELECT_MODE is now done with Ctrl+Alt+p (p_CA).

»*/

//Imports«

import { util, api as capi } from "/sys/util.js";
import { globals } from "/sys/config.js";
const{strnum, isarr, isstr, isnum, isobj, make, KC, kc, log, jlog, cwarn, cerr}=util;

const{NS, FOLDER_APP,FS_TYPE,fs, isMobile}=globals;
const fsapi = fs.api;
const widgets = NS.api.widgets;
const {normPath}=capi;
const {pathToNode}=fsapi;

//»

//Shell«

//Var«

//To allow writing of files even if there is an external lock on it, change this to true
const allow_write_locked = false;

const NOOP=()=>{return TERM_ERR;};
const TERM_OK = 0;
const TERM_ERR = 1;

//»

//Funcs«

const term_error=(term, arg)=>{//«
	if (isstr(arg)) arg = term.fmt2(arg);
	term.response({ERR: arg, NOEND: true});
};//»
const term_out=(term, arg)=>{//«
	if (isstr(arg)) arg = term.fmt(arg);
	term.response({SUCC: arg, NOEND: true});
};//»
const write_to_redir=async(term, str, redir)=>{//«
	const terr=(arg)=>{term_error(term, arg);return TERM_ERR;};
	const tout=(arg)=>{term_out(term, arg);return TERM_OK;};

	let op = redir.shift();
	if (op!==">") return terr(`Unknown redir op: '${op}'`);
	let fname = redir.shift();
	if (!fname) return terr(`Missing operand to the redirection operator`);
	let fullpath = normPath(fname, term.cur_dir);
	let node = await fsapi.pathToNode(fullpath);
	if (node && node.write_locked){
		return terr(`${fname}: the file is "write locked"`);
	}

	let patharr = fullpath.split("/");
	patharr.pop();
	let parpath = patharr.join("/");
	if (!parpath) return terr(`${fname}: Permission denied`);
	let parnode = await fsapi.pathToNode(parpath);
	let typ = parnode.type;
	if (!(parnode&&parnode.appName===FOLDER_APP&&(typ===FS_TYPE||typ=="dev"))) return terr(`${fname}: Invalid or unsupported path`);
	if (typ===FS_TYPE && !await fsapi.checkDirPerm(parnode)) {
		return terr(`${fname}: Permission denied`);
	}
	if (!await fsapi.writeFile(fullpath, str)) return terr(`${fname}: Could not write to the file`);
	return TERM_OK;
};//»
const validate_out_path = async(outpath)=>{//«

	if (await fsapi.pathToNode(outpath)) return `${outpath}: the file exists`;
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

//Commands«

//All commands«

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

const com_ls = async (term, args) => {//«
	const terr=(arg)=>{term_error(term, arg);return TERM_ERR;};
	const tout=(arg)=>{term_out(term, arg);return TERM_OK;};
	if (!args.length) args.push("./");
	while (args.length) {
		let path = args.shift();
		let regpath = normPath(path, term.cur_dir);
		let node = await fsapi.pathToNode(regpath);
		if (!node) return terr(`${regpath}: No such file or directory`);
		if (node.appName !== FOLDER_APP) {
			let file = await node._file;
			let sz;
			if (file) sz = file.size;
			if (!Number.isFinite(sz)) sz = "?";
			tout(`${node.name} ${sz}`);
			continue;
		}
		if (!node.done) await fsapi.popDir(node);
		let kids = node.kids;
		let arr = kids._keys;
		let out=[];
		let lens = [];
		let types = [];
		for (let nm of arr){
			if (nm=="."||nm=="..") continue;
			if (nm.match(/^\./)) continue;
			let n = kids[nm];
			let add=0;
			if (nm.match(/\x20/)){
				nm=`'${nm}'`;
			}
			out.push(nm);
			lens.push(nm.length);
			let app = n.appName;
			if (app===FOLDER_APP) types.push("d");
			else if (app=="Link") types.push("l");
			else types.push("-");
		}
		if (!out.length) return TERM_OK;
		let ret = [];
		let col_ret = [];
		term.fmt_ls(out, lens, ret, undefined, types, col_ret);
		term.response({SUCC: ret, COLORS: col_ret, NOEND: true});
	}
	return TERM_OK;
};//»
const com_cd = async (term, args) => {//«
	const terr=(arg)=>{term_error(term, arg);};
	let res;
	let got_dir, dir_str, dirobj;
	const cd_end = () => {
		if (!got_dir.match(/^\x2f/)) got_dir = `/${got_dir}`;
		term.response({
			CD: got_dir,
		}, {
			NOEND: true
		});
	};
	if (!args.length) {
		got_dir = term.get_homedir();
		cd_end();
		return TERM_OK;
	}
	let saypath = args[0];
	let regpath = normPath(saypath, term.cur_dir);
	let ret = await fsapi.pathToNode(regpath);
	if (!ret) {
		terr(`${saypath}: No such file or directory`);
		return TERM_ERR;
	}
	if (ret.appName != FOLDER_APP) {
		terr(`${saypath}: Not a directory`);
		return TERM_ERR;
	}
	got_dir = regpath;
	cd_end();
	return TERM_OK;
};//»
const com_touch = async (term, args) => {//«
	const terr=(arg)=>{term_error(term, arg);return TERM_ERR;};
	const tout=(arg)=>{term_out(term, arg);return TERM_OK;};
	const {make_icon_if_new} = term.Desk;
	if (!args.length) return terr("No path given");
	while (args.length) {
		let path = args.shift();
		let fullpath = normPath(path, term.cur_dir);
		let node = await fsapi.pathToNode(fullpath);
		if (node) {
			tout(`Touching: ${node.name}`);
			continue; 
		}
		let arr = fullpath.split("/");
		let fname = arr.pop();
		let parpath = arr.join("/");
		let parnode = await fsapi.pathToNode(parpath);
		if (!(parnode && parnode.appName === FOLDER_APP)) {
			terr(`${parpath}: Not a directory`);
			continue; 
		}
		if (parnode.type !== FS_TYPE) {
			terr(`${fullpath}: The parent directory is not of type '${FS_TYPE}'`);
			continue; 
		}
		if (!await fsapi.checkDirPerm(parnode)) {
 			terr(`${path}: Permission denied`);
			continue;
		}
		let newnode = await fsapi.touchFile(parnode, fname);
		if (!newnode) terr(`${fullpath}: The file could not be created`);
		else make_icon_if_new(newnode);
	}
	return TERM_OK;
};//»
const com_echo = async (term, args, redir) => {//«
	const terr=(arg)=>{term_error(term, arg);return TERM_ERR;};
	const tout=(arg)=>{term_out(term, arg);return TERM_OK;};
	let str = args.join(" ");
	if (!redir){
		let arr = str.split("\n");
		for (let ln of arr) term.response({SUCC: [term.fmt(ln)], NOEND: true});
		return TERM_OK;
	}
	return write_to_redir(term, str, redir);
};//»
const com_cat = async (term, args, redir) => {//«
	let fullpath;
	const terr=(arg)=>{term_error(term, arg);return TERM_ERR;};
	const fullterr=(arg)=>{term_error(term, `${fullpath}: ${arg}`);return TERM_ERR;};
	const tout=(arg)=>{term_out(term, arg);return TERM_OK;};
	if (!args.length) return terr("An argument is required");
	let out=[];
	while (args.length) {
		fullpath = normPath(args.shift(), term.cur_dir);
		let node = await fsapi.pathToNode(fullpath);
		if (!node) {
			fullterr(`No such file or directory`);
			continue;
		}
		let typ = node.type;
		if (typ==FS_TYPE) {
			if (!node.blobId) continue;
			if (node.appName === FOLDER_APP) return fullterr(`Is a directory`);
			if (node.type !== FS_TYPE) fullterr(`The file is not of type '${FS_TYPE}'`);
			let val = await node.getValue({text: true});
			if (!isstr(val)) fullterr("An unexpected value was returned");
			let arr = val.split("\n");
			for (let ln of arr) out.push(ln);
		}
//		else if (typ=="loc"){
//log(node);
//log(await node.getValue({start:10000, end: 11000}));
//		}
		else{
cwarn(`Skipping: ${fullpath} (type=${typ})`);
		}
	}
	if (!redir){
		for (let ln of out) {
			term.response({SUCC: term.fmt(ln)}, {NOEND: true});
		}
		return TERM_OK;
	}
	return write_to_redir(term, out.join("\n"), redir)
};//»
const com_env = async (term, args) => {//«
	const terr=(arg)=>{term_error(term, arg);return TERM_ERR;};
	const tout=(arg)=>{term_out(term, arg);return TERM_OK;};
	if (args.length) return terr("Arguments are not supported");
	let env = term.ENV;
	let keys = env._keys;
	for (let key of keys){
		let val = env[key];
		term.response({SUCC: [term.fmt(`${key}=${val}`)], NOEND: true});
	}
	return TERM_OK;
};//»
const com_mkdir = async (term, args) => {//«
	const {make_icon_if_new} = term.Desk;
	const terr=(arg)=>{term_error(term, arg);return TERM_ERR;};
	const tout=(arg)=>{term_out(term, arg);return TERM_OK;};
	const denied=()=>{
		term_error(term, `${fullpath}: Permission denied`);
		return TERM_ERR;
	};
	if (!args.length) return terr("mkdir: missing operand");
	while (args.length) {
		let path = args.shift();
		let fullpath = normPath(path, term.cur_dir);
		let node = await fsapi.pathToNode(fullpath);
		if (node) {
			terr(`${fullpath}: The file or directory exists`);
			continue;
		}
		let arr = fullpath.split("/");
		let fname = arr.pop();
		let parpath = arr.join("/");
		if (!parpath) {
			denied();
			continue;
		}
		let parnode = await fsapi.pathToNode(parpath);
		if (!(parnode && parnode.appName === FOLDER_APP)) {
			terr(`${parpath}: Not a directory`);
			continue; 
		}
		if (parnode.type !== FS_TYPE) {
			terr(`${fullpath}: The parent directory is not of type '${FS_TYPE}'`);
			continue; 
		}
		if (!await fsapi.checkDirPerm(parnode)) {
 			denied();
			continue;
		}
		let newdir = await fsapi.mkDir(parnode, fname);
		if (!newdir) terr(`${fullpath}: The directory could not be created`);
		else make_icon_if_new(newdir);
	}
	return TERM_OK;

};//»
const com_rmdir = async (term, args) => {//«
	const terr=(arg)=>{term_error(term, arg);return TERM_ERR;};
	const tout=(arg)=>{term_out(term, arg);return TERM_OK;};
	const denied=()=>{
		term_error(term, `${fullpath}: Permission denied`);
		return TERM_ERR;
	};
	if (!args.length) return terr("rmdir: missing operand");
	if (!await fsapi.doFsRm(args, terr, {CWD: term.cur_dir, FULLDIRS: false})){
		return TERM_ERR;
	}
	return TERM_OK;
};//»
const com_mv = async (term, args, if_cp) => {//«
	const terr=(arg)=>{
		term_error(term, arg);
		term.refresh();
		return TERM_ERR;
	};
	const tout=(arg)=>{term_out(term, arg);return TERM_OK;};
	let com;
	if (if_cp) com="cp";
	else com="mv";
	if (!args.length) return terr(`${com}: missing file operand`);
	let rv = await fsapi.comMv(args, {if_cp, exports: {wout: tout, werr: terr, cur_dir: term.cur_dir, termobj: term}});
	if (!rv) return TERM_ERR;
	return TERM_OK;
};//»
const com_cp=(term, args)=>{//«
	return com_mv(term, args, true);
};//»
const com_rm = async (term, args) => {//«
	const terr=(arg)=>{term_error(term, arg);return TERM_ERR;};
	const tout=(arg)=>{term_out(term, arg);return TERM_OK;};
	const denied=()=>{
		term_error(term, `${fullpath}: Permission denied`);
		return TERM_ERR;
	};
	if (!args.length) return terr("rmd: missing operand");
	let okargs=[];
	let cwd = term.cur_dir
	for (let path of args){
		let fullpath = normPath(path, cwd);
		let node = await fsapi.pathToNode(fullpath);
		if (!node) {
//			terr(`${fullpath}: not found`);
			terr(`rm: cannot remove '${path}': No such file or directory`);
			continue;
		}
		if (node.appName===FOLDER_APP){
			terr(`rm: cannot remove '${path}': Is a directory`);
			continue;
		}
		okargs.push(node.fullpath);
	}
	if (!await fsapi.doFsRm(okargs, terr, {CWD: cwd})){
		return TERM_ERR;
	}
	return TERM_OK;
};//»
const com_ln = async (term, args) => {//«
	const terr=(arg)=>{term_error(term, arg);return TERM_ERR;};
	const tout=(arg)=>{term_out(term, arg);return TERM_OK;};
	const {make_icon_if_new} = term.Desk;
	if (!args.length) return terr("ln: missing file operand");
	let target = args.shift();
	if (!args.length) return terr("ln: missing link name");


	let path = args.shift();
	if (args.length) return terr("ln: too many arguments");
	let fullpath = normPath(path, term.cur_dir);
	let node = await fsapi.pathToNode(fullpath);
	if (node) {
		return terr(`${path}: Already exists`);
	}
	let arr = fullpath.split("/");
	let fname = arr.pop();
	let parpath = arr.join("/");
	let parnode = await fsapi.pathToNode(parpath);
	if (!(parnode && parnode.appName === FOLDER_APP)) {
		return terr(`${parpath}: Not a directory`);
	}
	if (parnode.type !== FS_TYPE) {
		return terr(`${fullpath}: The parent directory is not of type '${FS_TYPE}'`);
	}
	if (!await fsapi.checkDirPerm(parnode)) {
		return terr(`${path}: Permission denied`);
	}
	let newnode = await fsapi.makeLink(parnode, fname, target);
	if (!newnode) terr(`${path}: The link could not be created`);

cwarn(`THE TARGET IS NOT VALIDATED OR EXPANDED: '${target}'`);

	return TERM_OK;
};//»
const com_open = async (term, args) => {//«
	const terr=(arg)=>{term_error(term, arg);return TERM_ERR;};
	const tout=(arg)=>{term_out(term, arg);return TERM_OK;};
	let path = args.shift();
	let fullpath = normPath(path, term.cur_dir);
	let node = await fsapi.pathToNode(fullpath);
	if (!node) return terr(`${path}: No such file or directory`);
    term.Desk.open_file_by_path(node.fullpath);
	return TERM_OK;
//	if (node.appName !== FOLDER_APP) return terr(`${fullpath}: List the non-directory`);
//	if (!node.done) await fsapi.popDir(node);

};//»
const com_app = async (term, args) => {//«
	const terr=(arg)=>{term_error(term, arg);return TERM_ERR;};
	const tout=(arg)=>{term_out(term, arg);return TERM_OK;};
	let appname = args.shift();
	if (!appname) return terr("Expected an application name");
	term.Desk.api.openApp(appname);
	return TERM_OK;
};//»
const com_less = async (term, args) => {//«
	const terr=(arg)=>{term_error(term, arg);return TERM_ERR;};
	const tout=(arg)=>{term_out(term, arg);return TERM_OK;};
//	const _wrap_line=(arg)=>{return term.wrap_line(term, arg);};
	let path = args.shift();
	if (!path) return terr("An argument is expected");
	let fullpath = normPath(path, term.cur_dir);
	let node = await fsapi.pathToNode(fullpath);
	if (!node) return terr(`${fullpath}: No such file or directory`);
	if (node.appName === FOLDER_APP) return terr(`${fullpath}: Is a directory`);
	let val = await node.getValue({text:true});
	if (!await capi.loadMod("pager")) return terr("Could not load the pager module");
//	let less = new NS.mods.pager({termobj: term, wrap_line: _wrap_line});
	let less = new NS.mods.pager(term);
	await less.init(val.split("\n"), node.name);
	return TERM_OK;

};//»
const com_vim = async (term, args) => {//«
	const terr=(arg)=>{term_error(term, arg);return TERM_ERR;};
	const tout=(arg)=>{term_out(term, arg);return TERM_OK;};
	const _wrap_line=(arg)=>{
		return term.wrap_line(term, arg);
	};
	let path = args.shift();
//	if (!path) return terr("An argument is expected");
	let val;
	let node;
	let parnode;
	let fullpath;
	let typ;
	if (path) {
		fullpath = normPath(path, term.cur_dir);
		node = await fsapi.pathToNode(fullpath);
//		if (!node) return terr(`${fullpath}: No such file or directory`);
		if (!node){
			let arr = fullpath.split("/");
			let nm = arr.pop();
			let path = arr.join("/");
			parnode = await fsapi.pathToNode(path);
			if (!parnode) return terr(`${path}: No such directory`);
			if (!await fsapi.checkDirPerm(path)) return terr(`${fullpath}: Permission denied`);
		}
		else {
			if (node.appName === FOLDER_APP) return terr(`${fullpath}: Is a directory`);
			if (!allow_write_locked && node.write_locked){
				return terr(`${path}: The file is "write locked"`);
			}
			val = await node.getValue({text:true});
			if (!isstr(val)){
				terr(`${path}: Could not get the contents (see console)`);
cwarn("Here are the contents...");
log(val);
				return;
			}
		}
	}
	if (!val) val = "";
//	else val="";
	if (!await capi.loadMod("editor")) return terr("Could not load the editor module");
//	let vim = new NS.mods.editor({termobj: term, is_root: false});
	let vim = new NS.mods.editor(term);
	if (node) typ = node.type;
	else if (parnode) typ = parnode.type;
	let mess = await vim.init( val, fullpath, {FOBJ: node, TYPE: typ});
	if (isstr(mess)){
		terr(mess);
		return TERM_ERR;
	}
	return TERM_OK;
};//»
const com_unmount = async (term, args) => {//«
	const terr=(arg)=>{term_error(term, arg);return TERM_ERR;};
    let mntdir = fs.root.kids.mnt;
    let mntkids = mntdir.kids
    let name = args.shift();
    if (!name) return terr("Mount name not given!");
	if (!mntkids[name]) return terr(`${name}: Not mounted`);
	delete mntkids[name];
	return TERM_OK;
};//»
const com_mount = async (term, args) => {//«
	const terr=(arg)=>{term_error(term, arg);return TERM_ERR;};
    let mntdir = fs.root.kids.mnt;
    let mntkids = mntdir.kids
    let name = args.shift();
    if (!name) return terr("Mount name not given!");
    if (!name.match(/^[a-z][a-z0-9]*$/i)) return terr("Invalid mount name!");
	if (mntkids[name]) return terr(`${name}: Already mounted`);
	let rv = await fetch(`/${name}/.list.json`);
	if (!rv.ok){
		terr(`Could not get the listing for '${name}'`);
		return TERM_ERR;
	}
	let list = await rv.json();
	const mount_dir=(name, list, par)=>{
		let kids = par.kids;
		for (let i=0; i < list.length; i++){
			let arr = list[i].split("/");
			let nm = arr[0];
			let sz = arr[1];
			if (sz){
				let node = fs.mk_dir_kid(par, nm, {size: parseInt(sz)});
				kids[nm] = node;
			}
			else {
				let dir = fs.mk_dir_kid(par, nm, {isDir: true});
				mount_dir(nm, list[i+1], dir);
				kids[nm] = dir;
				i++;
			}
		}
	}
	let root = fs.mk_dir_kid(mntdir, name, {isDir: true});
	root.root = root;
	root._type = "loc";
	mntkids[name]=root;
	mount_dir(name, list, root);
	return TERM_OK;
};//»
const com_clear=(term, args)=>{//«
term.clear();
return TERM_OK;
};//»
const com_pwd=(term, args)=>{//«
	term_out(term, term.cur_dir);
	return TERM_OK;
};//»
const com_dl=async(term, args)=>{//«
	const terr=(arg)=>{term_error(term, arg);return TERM_ERR;};
	if (!args.length) return terr("Need a filename to download");
	let path = args.shift();
	let rv = new Blob([await fsapi.readFile(normPath(path, term.cur_dir))]);
	if (!rv) return terr(`${path}: the file could not be found`);
	let name = path.split("/").pop();
	capi.download(rv, name);
	return TERM_OK;
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
const com_clearstorage = async(term, args)=>{//«
	const terr=(arg)=>{term_error(term, arg);return TERM_ERR;};
	if (globals.read_only) return terr("Read only");
    let ret = await widgets.popyesno(`Clear EVERYTHING in storage?`,{reverse: true});
	if (!ret) return terr("Not clearing");
    await fsapi.clearStorage();
	term.Desk.clear_desk_icons();
	return terr("Please resfresh the page");
};//»
const com_appicon=(term, args, redir)=>{//«
	const terr=(arg)=>{term_error(term, arg);return TERM_ERR;};
	let app = args.shift();
	if (!app) return terr("No appname given");
	let s = JSON.stringify({app});
	if (!redir){
		term.response({SUCC: [s], NOEND: true});
		return TERM_OK;
	}
	return write_to_redir(term, s, redir);
};//»

//»

const shell_commands={//«
//mkicon: com_mkicon,
webmcat: com_webmcat,
//cutwebm: com_cutwebm,
remux: com_remux,
record: com_record,
//parsewasm: com_parsewasm,
wasm: com_wasm,
walt: com_walt,
//faust: com_faust,

dl: com_dl,
pwd: com_pwd,
clear: com_clear,
cd:com_cd,
ls:com_ls,
touch:com_touch,
echo:com_echo,
cat:com_cat,
env:com_env,
mkdir: com_mkdir,
rmdir: com_rmdir,
mv:com_mv,
cp:com_cp,
rm:com_rm,
ln:com_ln,
app:com_app,
appicon:com_appicon,
open:com_open,
less:com_less,
vim:com_vim,
mount: com_mount,
unmount: com_unmount,
_clearstorage: com_clearstorage
//env: NOOP
};//»

const BUILTINS = shell_commands._keys;

//»

//Shell«

const Shell = function(term){

//Var«
const CONTROL_WORDS = ["if", "then", "elif", "else", "fi", "do", "while", "until", "for", "in", "done", "select", "case", "esac"];
const terr=(arg)=>{//«
	if (isstr(arg)) arg = term.fmt([arg]);
	term.response({ERR: arg});
	term.response({DONE: true});
};//»
//»

//Parse«

//Var«
const shell_metas = [" ", "\t", "|", "&", ";", "(", ")", "<", ">"];
const shell_c_op = [";;&", "||", "&&", ";;", ";&", "|&", "((", "&", ";", "|", "(", ")"];
const shell_r_op = ["<<<", "&>>", "<>", ">>", "<<", "<&", "&>", ">&", ">", "<"];
//»

const shell_escapes = line_arr => {//«
	for (let i = 0; i < line_arr.length; i++) {
		let arr = line_arr[i].split("");
		for (let j = 0; j < arr.length; j++) {
			if (arr[j] == "\\") {
				if (arr[j + 1]) {
					let obj = {
						"t": "esc",
						"esc": arr[j + 1]
					};
					arr[j] = obj;
					arr.splice(j + 1, 1);
					j--;
				}
			}
		}
		line_arr[i] = arr;
	}
	return line_arr;
};//»
const shell_quote_strings = (line_arr) => {//«
	let qtype = null;
	let qarr = [];
	let orig_line_num;
	let orig_pos;
	let ds = null;
	OUTERLOOP: for (let i = 0; i < line_arr.length; i++) {
		let arr = line_arr[i];
		for (let j = 0; j < arr.length; j++) {
			let chneg1 = arr[j - 1];
			let ch = arr[j];
			let ch2 = arr[j + 1];
			let ch3 = arr[j + 2];
			if (!qtype && ((((ch == '"' || ch == "'" || ch == "\x60") || (ch == "<" && ch2 == "<" && ch3 && ch3 != "<" && (j == 0 || (j > 0 && chneg1 != "<"))))))) {
				if (ch == "<") return "Heredocs are not implemented";
				qtype = ch;
				orig_line_num = i;
				if (arr[j - 1] == "$") {
					if (ch == "'") {
						arr.splice(j - 1, 1);
						ds = true;
						j--;
					} else if (ch == '"') {
						arr.splice(j - 1, 1);
						j--;
					}
				}
				orig_pos = j;
			} else if (qtype) {
				if (ch == qtype || (!ds && qtype == "'" && ch.esc == "'")) {
					if (ch.esc == "'") qarr.push("\\");
					else if (ch.esc === "\x60") qtype = "\x60";
					line_arr[orig_line_num].splice(orig_pos, 2, {
						t: 'quote',
						'$': ds,
						quote_t: qtype,
						quote: qarr
					});
					qtype = null;
					ds = null;
					qarr = [];
					if (i > orig_line_num) {
						let rem = arr.splice(j);
						for (let k = 1; k < rem.length; k++) line_arr[orig_line_num].push(rem[k]);
						line_arr.splice(i, 1);
						i = orig_line_num;
						arr = line_arr[i];
						j = orig_pos + j + 1;
					} else j -= 1;
				} else {
					if (!ds && qtype == "'" && ch.esc) {
						qarr.push("\\");
						qarr.push(ch.esc);
					} else if (ch.esc && (qtype == "\x60" || qtype == '"')) {
//There are no escapes in double quotes except $,\x60,and \
						if (ch.esc == "$" || ch.esc == "\x60" || ch.esc == "\\") qarr.push(ch);
						else {
							if (qtype == '"' && ch.esc != '"') {
								qarr.push("\\");
							} else if (qtype == "\x60" && ch.esc != "\x60") {
								qarr.push("\\");
							}
							qarr.push(ch.esc);
						}
					} else qarr.push(ch);
					arr.splice(j, 1);
					j--;
				}
			}
		}
		if (qtype) {
			qarr.push("\n");
			if (i > orig_line_num) {
				line_arr.splice(i, 1);
				i--;
			}
		}
	}
	if (qtype) return "Unterminated quote";
	else {
		let line = line_arr[line_arr.length - 1];
		let lasttok = line[line.length - 1];
		if (lasttok === "\\") return "Newline escapes are not implemented";
	}
	return line_arr;
};//»
const shell_tokify = line_arr => {//«
	let lnnum = 1;
	let wordnum = 0;
	const badtok=(tok)=>{
		return `Unsupported token: '${tok}'`;
	};
	let mkword = (str) => {
		return {
			t: "word",
			word: str,
			ln: lnnum,
			wn: (wordnum++)
		}
	};
	let mkrop = (str) => {
		return {
			t: "r_op",
			r_op: str,
			ln: lnnum
		}
	};

	let mkds = (str) => {
		return {
			t: "ds",
			ds: "$",
			ln: lnnum
		}
	};
	let mknl = () => {
		return {
			t: "c_op",
			c_op: "nl",
			nl: true,
			ln: lnnum
		};
	};
	if (line_arr == null) return null;
	let ret = [];
	let word = null;
	for (let i = 0; i < line_arr.length; i++) {
		let arr = line_arr[i];
		for (let j = 0; j < arr.length; j++) {
			let ch = arr[j];
			let ch1 = arr[j + 1];
			if (shell_metas.includes(ch)) {
				if (word) ret.push(mkword(word.join("")));
				if (ch == "\t" || ch == " ") {
					let usej = null;
					for (let k = j + 1;
						(arr[k] == " " || arr[k] == "\t"); k++) usej = k;
					if (usej) j = usej;
					ret.push(" ");
				} else {
					let next = arr[j + 1];
					if (next && shell_metas.includes(next)) {
						let comb = ch + next;
						if (shell_c_op.includes(comb)) {
//log(1, ch, comb);
							return badtok(comb);
						}
						else if (shell_r_op.includes(comb)) {
//log(2, ch, comb);
							return badtok(comb);
						}
						else {
							if (ch===">") ret.push(mkrop(ch));
							else return badtok(ch);
						}
						
					} 
					else {
//log(4, ch);
						return badtok(ch);
					}
				}
				word = null;
			} 
			else {
				if (!word) {
//A word array isn't in effect
					if (ch == "{" || ch == "}" || ch == ",") ret.push(mkword(ch));
					else if (ch == "\n") ret.push(ch);
					else if (ch == "$") ret.push(mkds());
					else if (typeof(ch) == "string") word = [ch];
					else if (typeof(ch) == "object") ret.push(ch);
				} else if (ch == "$") {
					ret.push(mkword(word.join("")));
					word = null;
					ret.push(mkds());
				} else {
					if (ch == "{" || ch == "}" || ch == ",") {
						ret.push(mkword(word.join("")));
						ret.push(mkword(ch));
						word = null;
					} else if (ch == "\n") {
						ret.push(mkword(word.join("")));
						ret.push(ch);
						word = null;
					} else if (ch.t == "esc") {
						if (ch.esc == "{" || ch.esc == "}" || ch.esc == ",") {
							ret.push(mkword(word.join("")));
							ret.push(ch);
							word = null;
						} else {
							ret.push(mkword(word.join("")));
							ret.push(ch);
							word = null;
						}
					} else if (typeof(ch) == "string" && ((ch != " " && ch != "(" && ch != ")"))) {
						word.push(ch);
					} else {
						ret.push(mkword(word.join("")));
						ret.push(ch);
						word = null;
					}
				}
			}
		}
		if (word) {
			let useword = word.join("");
			let pushnl = true;
			if (useword.match(/\\$/)) {
				useword = useword.replace(/\\$/, "");
				pushnl = null;
			}
			if (useword) ret.push(mkword(useword));
//			if (pushnl) ret.push(mknl());
		} else {
//			ret.push(mknl());
//			lnnum++;
		}
		word = null;
	}
	return ret;
};//»

//»

this.execute=async(str)=>{//«
	let redir;
	str = str.replace(/^ +/,"");
	let arr = shell_escapes([str]);
	arr = shell_quote_strings(arr);
	if (isstr(arr)) return terr(term.fmt(arr));
	arr = shell_tokify(arr);
	if (isstr(arr)) return terr(term.fmt(arr));

	let comobj = arr.shift();
	if (!(comobj && comobj.t==="word")) return terr("Unknown or missing command");
	let comword = comobj.word;
	let com = shell_commands[comword];
	if (!com) {
		if (CONTROL_WORDS.includes(comword)){
			return terr(`sh: Control structures are not implemented`);
		}
		return terr(`sh: ${comword}: unknown command`);
	}
	let out=[];
	for (let tok of arr){
		if (tok===" ") continue;
		out.push(tok);
	}
	arr = out;
	let args=[];
	for (let i=0; i < arr.length; i++){//«
//		if (tok===" ") continue;
		let tok = arr[i];
//		let tok2 = arr[i+1];
		let typ = tok.t;
		let val = tok[typ];
	//	if (typ==="quote" && tok.quote_t=="'" && tok['$']){
		if (typ==="quote") { 
			if (tok.quote_t=="'" && tok['$']){
				let outstr='';
				for (let ch of val){
					if (isobj(ch)&&ch.t=="esc"){
						if (ch.esc=="n") outstr+="\n";
						else outstr+=ch.esc;
					}
					else outstr+=ch;
				}
				val = outstr;
			}
			else val = val.join("");
		}
		else if (typ==="r_op"){
			if (tok.r_op !== ">"){
				return terr(`Unknown operator: '${tok.r_op}'`);
			}
			if (redir) return terr("Already have a redirect");
			let tok2 = arr[i+1];
			if (tok2.t == "quote") tok2={t: "word", word: tok2.quote.join("")}
			if (!(tok2 && tok2.t==="word")) return terr(`Invalid or missing redirection operand`);
			arr.splice(i+1, 1);
			val = null;
			redir = [tok.r_op, tok2.word];
		}
		if (val) {
			if (val.match(/^~/)){
				if (val==="~") val = globals.HOME_PATH;
				else if (val.match(/^~\x2f/)) val = globals.HOME_PATH+val.slice(1);
			}
			args.push(val);
		}
	}//»
	let rv = await com(term, args, redir);
	if (!Number.isFinite(rv)){
//cerr("Invalid return code returned");
//log(rv);
		term.ENV['?']=-1;
	}
	else{
		term.ENV['?']=rv;
	}
	term.response({DONE: true});
}//»
this.cancel = () => {};

};

//»

//»

//Terminal«

//Issues«
/*@GYWJNFGHXP: Just started on a "solution" to the issue referenced on the Bug below.«

For now, we are doing replacements for open paren, open square brace and plus sign.
What about period, asterisk and question mark?


We now allow for the tab completion like:

$ cat 'Some (weird) f<TAB>

to become:

$ cat 'Some (weird) filename.txt'

But this also actually works when we are at the beginning:

$ 'Some (weird) f<TAB>

becomes:

$ 'Some (weird) filename.txt'

...this is *really* only supposed to search in the command pathway.

»*/
/*Bug found on Feb. 14, 2023://«

There seems to be an issue with commands that wrap around that have long
arguments (like filenames) with embedded spaces that are escaped. Say
the terminal is only like 40 chars wide:

$ ls /home/me/videos/This\ is\ a\ video\
with\ embedded\ spaces.mp4

There was actually a line break inserted here in the command history, probably
related to doing a tab completion that had to wrap around.

I want to implement tab completions that are inside of quotes (like bash does).
Given a file named "file with spaces.txt", doing:

$ cat 'file w<TAB>

...should complete to:

$ cat 'file with spaces.txt'

There needs to be some basic parsing done to ensure that this does not work,
i.e. there should be an odd number of non-escaped quotes.

$ cat ' 'file w<TAB>

//»*/
//»
//Development mod deleting«

const DEL_MODS=[
//	"editor",
//	"webmparser"
//	"pager"
];

//»

export const app = function(Win) {

//Var«

const {main, Desk} = Win;
const topwin = Win;
const winid = topwin.id;
const termobj = this;

const ENV = {}


let did_init = false;
let global_winname = "";
this.Desk = Desk;
this.winid = winid;
this.topwin = topwin;

const SCISSORS_ICON = "\u2702";

let stat_lines;

let MIN_TERM_WID = 20;
let terminal_locked  = false;

let is_scrolling = false;
let wheel_iter;
let dblclick_timeout;
let downevt=null;

let MAX_TAB_SIZE=256;
let awaiting_remote_tab_completion = false;
const com_completers = ["app","lib","import"];

const STAT_OK=1;
const STAT_WARNING=2;
const STAT_ERROR=3;

let nrows, ncols;
let x=0, y=0;
let w,h;
let xhold,yhold;
let hold_x, hold_y;

let editor;
let pager;
let app_cb;
let app_prompt;

let num_ctrl_d = 0;
let CLEAN_COPIED_STRING_MODE = false;
let DO_EXTRACT_PROMPT = true;
const MAX_OVERLAY_LENGTH = 42;
let overlay_timer = null;
let TERMINAL_IS_LOCKED = false;
let buffer_scroll_num = null;
let buffer_hold;
let line_height;

let FF = "monospace";
let FW = "500";
let CURBG = "#00f";
let CURFG = "#fff";
let OVERLAYOP = "0.75";
let TCOL = "#e3e3e3";

let topwin_focused = true;
let no_prompt_mode = false;

let min_height;

let com_scroll_mode = false;

let num_stat_lines = 0;
let num_lines = 0;
let scroll_num = 0;
let scrollnum_hold;

let min_fs = 8;
let def_fs = 24;
let gr_fs;

this.scroll_num = scroll_num;
this.ENV = ENV;

let kill_funcs = [];
let max_scroll_num=50;
let max_fmt_len = 4997;

let last_com_str=null;
let last_mode;

let root_state = null;
let cur_shell = null;
let shell = null;
let ls_padding = 2;
let await_next_tab = null;

let cur_prompt_line = 0;
let line_continue_flag = false;
let cur_scroll_command;
let prompt_str;
let prompt_len;
let buf_lines = [];
let lines = [];
let line_colors = [];
let lines_hold_2;
let lines_hold;
let line_colors_hold;

let current_cut_str = "";

let buffer = [];

let command_hold = null;
let command_pos_hold = 0;
let bufpos = 0;

let sleeping = null;

let cur_ps1;
let cur_prompt="$";
//let cur_dir;

//»
//DOM«

let overdiv = make('div');//«
overdiv._pos="absolute";
overdiv._loc(0,0);
overdiv._w="100%";
overdiv._h="100%";
topwin.overdiv=overdiv;
//»
let wrapdiv = make('div');//«
wrapdiv.id="termwrapdiv_"+winid;
wrapdiv._bgcol="#000";
wrapdiv._pos="absolute";
wrapdiv._loc(0,0);
wrapdiv._tcol = TCOL;
wrapdiv._fw = FW;
wrapdiv._ff = FF;
wrapdiv.style.whiteSpace = "pre";
//»
let tabdiv = make('div');//«
tabdiv.id="termtabdiv_"+winid;
tabdiv._w="100%";
tabdiv.style.userSelect = "text"
tabdiv._pos="absolute";
tabdiv.onmousedown=(e)=>{downevt=e;};
tabdiv.onmouseup=e=>{//«
	if (!downevt) return;
	let d = capi.dist(e.clientX,e.clientY,downevt.clientX, downevt.clientY);
	if (d < 10) return;
	focus_or_copy();
};//»
tabdiv.onclick=e=>{//«
	e.stopPropagation();
	if (dblclick_timeout){
		clearTimeout(dblclick_timeout);
		dblclick_timeout=null;
		setTimeout(focus_or_copy,333);
		return;
	}
	setTimeout(focus_or_copy,500);
};//»
tabdiv.ondblclick=e=>{e.stopPropagation();dblclick_timeout=setTimeout(focus_or_copy,500);}
tabdiv._loc(0,0);
tabdiv.style.tabSize = 4;
this.tabsize = tabdiv.style.tabSize;
wrapdiv.tabdiv = tabdiv;
//»

let textarea;
let areadiv;
if (!isMobile) {
	textarea = make('textarea');
	textarea._noinput = true;
	textarea.width = 1;
	textarea.height = 1;
	textarea.style.opacity = 0;
	textarea.focus();
	this.textarea = textarea; 
}

	areadiv = make('div');
	areadiv._pos="absolute";
	areadiv._loc(0,0);
	areadiv._z=-1;
	if (textarea) {
		areadiv.appendChild(textarea);
	}
	this.areadiv = areadiv;
	main._tcol="black";
	main._bgcol="black";

//let overlay;«

let fakediv = make('div');
fakediv.innerHTML = '<div style="opacity: '+OVERLAYOP+';border-radius: 15px; font-size: xx-large; padding: 0.2em 0.5em; position: absolute; -webkit-user-select: none; transition: opacity 180ms ease-in; color: rgb(16, 16, 16); background-color: rgb(240, 240, 240); font-family: monospace;"></div>';
let overlay = fakediv.childNodes[0];
overlay.id = "overlay_"+winid;

//»

//Listeners«
const onpaste = e =>{//«
	if (pager) return;
	textarea.value="";
	setTimeout(()=>{
		let val = textarea.value;
		if (!(val&&val.length)) return;
		if (editor) {
			editor.check_paste(val);
		}
		else dopaste();
	}
	,25);

}//»
if (textarea) textarea.onpaste = onpaste;
main.onwheel=e=>{//«
	if (!sleeping){
		let dy = e.deltaY;
		if (!is_scrolling){
			if (!scroll_num) return;
			if (dy > 0) return;
			scrollnum_hold = scroll_num;
			is_scrolling = true;
			wheel_iter = 0;
		}
		let skip_factor = 10;
/*
		if (ENV.SCROLL_SKIP_FACTOR){
			let got = ENV.SCROLL_SKIP_FACTOR.ppi();
			if (!Number.isFinite(got)) cwarn(`Invalid SCROLL_SKIP_FACTOR: ${ENV.SCROLL_SKIP_FACTOR}`);
			else skip_factor = got;
		}
*/
		wheel_iter++;
		if (wheel_iter%skip_factor) return;
		if (dy < 0) dy = Math.ceil(4*dy);
		else dy = Math.floor(4*dy);
		if (!dy) return;
		scroll_num += dy;
		if (scroll_num < 0) scroll_num = 0;
		else if (scroll_num >= scrollnum_hold) {
			scroll_num = scrollnum_hold;
			is_scrolling = false;
		}
		render();
	}
};//»
main.onscroll=e=>{e.preventDefault();scroll_middle();};
main.onclick=()=>{
	textarea&&textarea.focus();
}
overdiv.onmousemove = e=>{//«
	e.stopPropagation();
	if (Desk) Desk.mousemove(e);
};//»
//»

wrapdiv.appendChild(tabdiv);
main.appendChild(wrapdiv);
main.appendChild(areadiv);

//»

//Util«

const dopaste=()=>{//«
	let val = textarea.value;
	if (val && val.length) {
		if (editor) {
			let arr = val.split("\n");
			if (arr.length>1 && arr[0]==="") arr.shift();
			editor.insert_lines(arr);
			render();
		}
		else {			
			handle_insert(val);
		}
	}
	textarea.value="";
}
//»
const check_scrolling=()=>{//«
	if (is_scrolling){
		scroll_num = scrollnum_hold;
		is_scrolling = false;
		render();
		return true;
	}
	return false;
}//»

const wrap_line = (str)=>{//«
	str = str.replace(/\t/g,"\x20".rep(this.tabsize));
	let out = '';
	let w = this.w;
	while (str.length > w){
		if (!out) out = str.slice(0,w);
		else out = out+"\n"+str.slice(0,w);
		str = str.slice(w);
	}
	if (str.length>0){
		if (!out) out = str;
		else out = out+"\n"+str;
	}
	return out;
};//»
const fmt_ls=(arr, lens, ret, col_arg, types, color_ret)=>{//«
	let pad = ls_padding;
	if (col_arg == 1) {
		for (let i=0; i < arr.length; i++) {
			if (w >= arr[i].length) ret.push(arr[i]);
			else {
				let iter = 0;
				let str = null;
				while(str != "") {
					str = arr[i].substr(iter, iter+w);
					ret.push(str);
					iter += w;
				}
			}
		}
		return;
	}
	const min_col_wid=(col_num, use_cols)=>{
		let max_len = 0;
		let got_len;
		let use_pad = pad;
		for (let i=col_num; i < num ; i+=use_cols) {
			if (i+1 == use_cols) use_pad = 0;
			got_len = lens[i]+use_pad;
			if (got_len > max_len) max_len = got_len;
		}
		return max_len;
	};
	let num = arr.length;
	let col_wids = [];
	let col_pos = [0];
	let max_cols = col_arg;
	if (!max_cols) {
		let min_wid = 1 + pad;
		max_cols = Math.floor(w/min_wid);
		if (arr.length < max_cols) max_cols = arr.length;
	}
	let num_rows = Math.floor(num/max_cols);
	let num_cols = max_cols;
	let rem = num%num_cols;
	let tot_wid = 0;
	let min_wid;
	for (let i=0; i < max_cols; i++) {
		min_wid = min_col_wid(i, num_cols);
		tot_wid += min_wid;
		if (tot_wid > w) {
			fmt_ls(arr, lens, ret, (num_cols - 1), types, color_ret);
			return;
		}
		col_wids.push(min_wid);
		col_pos.push(tot_wid);
	}
	col_pos.pop();
	let matrix = [];
	let row_num;
	let col_num;
	let cur_row = -1;
	let xpos;
	for (let i=0; i < num; i++) {
		let typ;
		if (types) typ = types[i];
		let color;
		if (typ=="d") color="#909fff";
		else if (typ=="l") color="#0cc";
		col_num = Math.floor(i%num_cols);
		row_num = Math.floor(i/num_cols);

		if (row_num != cur_row) {
			matrix.push([]);
			xpos=0;
		}
		let str = arr[i] + " ".rep(col_wids[col_num] - arr[i].length);
		matrix[row_num][col_num] = str;
		if (color_ret) {
			if (!color_ret[row_num]) color_ret[row_num] = {};
			let uselen = arr[i].length;
			if (arr[i].match(/\/$/)) uselen--;
			if (color) color_ret[row_num][xpos] = [uselen, color];
		}
		xpos += str.length;
		cur_row = row_num;
	}
	for (let i=0; i < matrix.length; i++) ret.push(matrix[i].join(""));
	return;
};//»
const fmt2=(str, type, maxlen)=>{//«
    if (type) str = type + ": " + str;
    let ret = [];
    let w = this.w;
    let dopad = 0;
    if (maxlen&&maxlen < w) {
        dopad = Math.floor((w - maxlen)/2);
        w = maxlen;
    }

    let wordarr = str.split(/\x20+/);
    let curln = "";
    for (let i=0; i < wordarr.length; i++){
        let w1 = wordarr[i];
        if (((curln + " " + w1).length) >= w){
            if (dopad) ret.push((" ".repeat(dopad))+curln);
            else ret.push(curln);
            curln = w1;
        }
        else {
            if (!curln) curln = w1;
            else curln += " " + w1;
        }
        if (i+1==wordarr.length) {
            if (dopad) ret.push((" ".repeat(dopad))+curln);
            else ret.push(curln);
        }
    }
//    return ret.join("\n");
    return ret;
}
//»
const fmt = (str, startx)=>{//«
	if (str === this.EOF) return [];
	let use_max_len = get_max_len();
	if (str instanceof Blob) str = "[Blob " + str.type + " ("+str.size+")]"
	else if (str.length > use_max_len) str = str.slice(0, use_max_len)+"...";
	
//	if (type) str = type + ": " + str;
	let ret = [];
	let iter =  0;
	let do_wide = null;
	let marr;
	if (str.match && str.match(/[\x80-\xFE]/)) {
		do_wide = true;
		let arr = str.split("");
		for (let i=0; i < arr.length; i++) {
			if (arr[i].match(/[\x80-\xFE]/)) {
				arr.splice(i+1, 0, "\x03");
				i++;
			}
		}
		str = arr.join("");
	}
	let doadd = 0;
	if (startx) doadd = startx;
	if (!str.split) str = str+"";
	let arr = str.split("\n");
	let ln;
	for (ln of arr) {
		while((ln.length+doadd) >= w) {
			iter++;
			let val = ln.slice(0,w-doadd);
			if (do_wide) val = val.replace(/\x03/g, "");
			ret.push(val);
			ln = ln.slice(w-doadd);
			str = ln;
			doadd = 0;
		}
	}
	if (do_wide) ret.push(ln.replace(/\x03/g, ""));
	else ret.push(ln);
	return ret;
};//»
const fmt_lines_sync=(arr, startx)=>{//«
    let all = [];
	let usestart = startx;
    for (let i=0; i < arr.length; i++) {
		all = all.concat(fmt(arr[i],usestart));
		usestart = 0;
	}
    return all;
};//»

const obj_to_string = obj =>{//«
	if (obj.id) return `[object ${obj.constructor.name}(${obj.id})]`;
	return `[object ${obj.constructor.name}]`;
};//»
const get_history_path=()=>{return `${globals.HOME_PATH}/.hist`;};
const save_history=async(val)=>{//«
	if (!await fsapi.writeFile(get_history_path(), val)) {
cwarn("Could not save the history");
	}
}//»
const get_history=async(val)=>{//«
	return await fsapi.readFile(get_history_path(),{text: true});
}//»
const scroll_middle=()=>{//«
	let y1 = main.scrollTop;
	main.scrollTop=(main.scrollHeight-main.clientHeight)/2;
	let y2 = main.scrollTop;
};//»
const focus_or_copy=()=>{//«
	let sel = window.getSelection();
	if (sel.isCollapsed)textarea&&textarea.focus();
	else do_clipboard_copy();
};//»

///*
const delete_mods=()=>{//«
	for (let m of DEL_MODS){
		let scr = document.getElementById(`script_mods.${m}`);
		if (scr) scr._del();
		delete NS.mods[m];
		NS.mods[m]=undefined;
	}
};//»
//*/
const get_homedir=()=>{//«
	if (root_state) return "/";
	return globals.HOME_PATH;
};//»
const get_buffer = (if_str, if_no_buf)=>{//«
	let ret=[];
	if (if_str) ret = "";
	let ln;
	if (!if_no_buf) {
		if (buf_lines) {
			for (let i=0; i < buf_lines.length; i++) {
				ln = buf_lines[i].join("").replace(/\u00a0/g, " ");
				if (if_str) ret +=  ln + "\n"
				else ret.push(ln);
			}
		}
	}
	for (let i=0; i < lines.length; i++) {
			ln = lines[i].join("").replace(/\u00a0/g, " ");
			if (if_str) ret +=  ln + "\n"
			else ret.push(ln);
	}

	if ((editor||pager) && PARAGRAPH_SELECT_MODE){
		if (if_str) ret = ret.split("\n");
		let paras = [];
		let curln = "";
		for (let ln of ret){
			if (ln.match(/^\s*$/)){
				if (curln) {
					paras.push(curln);
					curln = "";
				}
				paras.push("");
				continue;
			}
			if (ln.match(/-\s*$/)) ln = ln.replace(/-\s+$/,"-");
			else ln = ln.replace(/\s*$/," ");
			curln = curln + ln;
		}
		if (curln) paras.push(curln);
		if (if_str) ret = paras.join("\n");
		else ret = paras;
	}

	return ret;
};
this.real_get_buffer=get_buffer;
this.get_buffer=()=>{return get_buffer();}
//»
const cur_date_str=()=>{//«
	let d = new Date();
	return (d.getMonth()+1) + "/" + d.getDate() + "/" + d.getFullYear().toString().substr(2);
};//»
const extract_prompt_from_str=(str)=>{//«
	if (!DO_EXTRACT_PROMPT) return str;
	let prstr = get_prompt_str();
	let re = new RegExp("^"+prstr.replace("$","\\$"));
	if (re.test(str)) str = str.substr(prstr.length);
	return str;
};//»
const copy_text=(str, mess)=>{//«
	if (!textarea) return;
	if (!mess) mess = SCISSORS_ICON;
	textarea.focus();
	textarea.value = str;
	textarea.select();
	document.execCommand("copy")
	do_overlay(mess);
};//»
const do_clear_line=()=>{//«
	if (cur_shell) return;
	let str="";
	for (let i = lines.length; i > y+scroll_num+1; i--) str = lines.pop().join("") + str;
	let ln = lines[y+scroll_num];
	str = ln.slice(x).join("") + str;
	lines[y+scroll_num] = ln.slice(0, x);	
	if (cur_prompt_line < scroll_num) {
		scroll_num -= (scroll_num - cur_prompt_line);
		y=0;
	}
	current_cut_str = str;
	render();
};//»
const do_copy_buffer = () => { copy_text(get_buffer(true), "Copied: entire buffer"); };
const do_clipboard_copy=(if_buffer, strarg)=>{//«
const do_copy=str=>{//«
    if (!str) return;
    str = str.replace(/^[\/a-zA-Z]*[$#] /,"");
    let copySource = make("pre");
    copySource.textContent = str;
    copySource.style.cssText = "-webkit-user-select: text;position: absolute;top: -99px";
    document.body.appendChild(copySource);
    let selection = document.getSelection();
    let anchorNode = selection.anchorNode;
    let anchorOffset = selection.anchorOffset;
    let focusNode = selection.focusNode;
    let focusOffset = selection.focusOffset;
    selection.selectAllChildren(copySource);

    document.execCommand("copy")
    if (selection.extend) {
        selection.collapse(anchorNode, anchorOffset);
        selection.extend(focusNode, focusOffset)
    }
    copySource._del();
}//»
	let str;
	if (strarg) str = strarg;
	else if (if_buffer) str = get_buffer(true);
	else str = getSelection().toString()
	if (CLEAN_COPIED_STRING_MODE) {
		str = str.replace(/\n/g,"");
		str = extract_prompt_from_str(str);
	}
	else {
//cwarn("Do you really ever want this string to be stripped of newlines and the prompt? CLEAN_COPIED_STRING_MODE==false !!!");
	}

	do_copy(str);
	textarea&&textarea.focus();
	do_overlay(`Copied: ${str.slice(0,9)}...`);
};//»
const do_clipboard_paste=()=>{//«
	if (!textarea) return;
	textarea.value = "";
	document.execCommand("paste")
};//»
const do_overlay=(strarg)=>{//«
	let str;
	if (strarg) {
		str = strarg;
		if (str.length > MAX_OVERLAY_LENGTH) str = str.slice(0,MAX_OVERLAY_LENGTH)+"...";
	}
	else str = w+"x"+h;
	overlay.innerText = str;
	if (overlay_timer) clearTimeout(overlay_timer);
	else main.appendChild(overlay);
	capi.center(overlay, main);
	overlay_timer = setTimeout(()=>{
		overlay_timer = null;
		overlay._del();
	}, 1500);
};//»
const set_new_fs=(val)=>{//«
	gr_fs = val;
	localStorage.Terminal_fs = gr_fs;
	wrapdiv._fs = gr_fs;
	resize();
};//»
const get_max_len=()=>{//«
	let max_len = max_fmt_len;
	let maxlenarg = ENV['MAX_FMT_LEN'];
	if (maxlenarg && maxlenarg.match(/^[0-9]+$/)) max_len = parseInt(maxlenarg);
	return max_len;
};//»
const check_line_len=(dy)=>{//«
	if (!dy) dy = 0;
	if (lines[cy()+dy].length > w) {
		let diff = lines[cy()+dy].length-w;
		for (let i=0; i < diff; i++) lines[cy()+dy].pop();
	}
};//»
const cx=()=>{return x;}
const cy=()=>{return y + scroll_num;}
const trim_lines=()=>{while (cur_prompt_line+1 != lines.length) lines.pop();};

//»
//Render«

const render=(opts={})=>{

const diagnose=n=>{//«
/*
//let val = Math.floor(100*real_lines[scroll_num]/(real_lines[lines.length-1]||real_lines[lines.length-2]));
console.error(`NAN${n}`);
log("scroll", scroll_num);
log("usescroll", usescroll);
log("lines.length",lines.length);
log(real_lines);
*/
};//»
//Var«
	let actor = editor||pager;
	if (actor) ({x,y,scroll_num}=actor);
	let visual_line_mode;
	let visual_block_mode;
	let visual_mode;
	let macro_mode;
	let seltop;
	let selbot;
	let selleft;
	let selright;
	let selmark;
	let stat_input_mode;
	let stat_com_arr;
	let stat_message, stat_message_type;
	let error_cursor;
	let real_lines;
	let real_line_mode=false;
	let show_marks;
	let splice_mode;
//	let opts = {};
	if (actor) ({stat_input_mode,stat_com_arr,stat_message,stat_message_type,real_line_mode}=actor);
	if (!stat_input_mode) stat_input_mode="";
	if (editor) ({splice_mode, macro_mode,visual_block_mode,visual_line_mode,visual_mode,show_marks,seltop,selbot,selleft,selright,selmark,error_cursor,real_lines, opts}=editor);
	if (!(ncols&&nrows)) return;

	let docursor = false;
	if (opts.noCursor){}
	else if (!TERMINAL_IS_LOCKED) docursor = true;

	let usescroll = scroll_num;
	let is_buf_scroll = false;
	if (buffer_scroll_num!==null) {
		usescroll = buffer_scroll_num;
		is_buf_scroll = true;
	}
	let scry=usescroll;
	let slicefrom = scry;
	let sliceto = scry + nrows;
	let uselines=[];
	let is_str = false;
	let xoff = 0;
	if (editor) xoff = Math.floor(x/w)*w;
	let usex = x;
	let outarr = [];
	let donum;
	usex = x-xoff;
//»
	for (let i=slicefrom; i < sliceto; i++) {//«
		let ln = lines[i];
		if (!ln) {
			if (editor) uselines.push(['<span style="color: #6c97c4;">~</span>']);
			else uselines.push([""]);
		}
		else {
			let arr = ln.slice(xoff,xoff+w);
			let newln = arr;
			newln.tcolor = ln.tcolor;
			newln.marks = ln.marks;
			uselines.push(newln);
		}
	}//»
	let len = uselines.length;//«
	if (len + num_stat_lines != h) {
		donum = h - num_stat_lines;
	}
	else donum = len;//»
	for (let i = 0; i < donum; i++) {//«
		let ind;
		let arr = uselines[i];
		while((ind=arr.indexOf("&"))>-1) arr[ind] = "&amp;";
		while((ind=arr.indexOf("<"))>-1) arr[ind] = "&lt;";
		while((ind=arr.indexOf(">"))>-1) arr[ind] = "&gt;";

		let marks=null;
		if (!arr||(arr.length==1&&!arr.marks&&arr[0]=="")) arr = [" "];
		if (editor && show_marks && arr.marks) marks = arr.marks
		let gotit = arr.indexOf(null);
		if (gotit > -1) arr[gotit] = " ";
		let curnum = i+usescroll;
		let colobj = line_colors[curnum];
		if ((visual_line_mode||visual_mode||visual_block_mode)&&seltop<=curnum&&selbot>=curnum){//«
			if (visual_line_mode) {
				let ln_min1 = arr.length-1;
				if (ln_min1 == -1) ln_min1=0;
				arr[0] = '<span style="background-color:#aaa;color:#000;">'+(arr[0]||" ");
				arr[ln_min1] = (arr[ln_min1]||" ")+'</span>';
			}
			else if (visual_mode){
				let useleft, useright;
				if (seltop==curnum && selbot==curnum){
					useleft = selleft;
					useright = selright;
				}
				else if (curnum > seltop && curnum < selbot){
					useleft = 0;
					useright = arr.length-1;
				}
				else if (seltop===curnum){
					useright = arr.length-1;
					useleft = (curnum==cy())?x:selmark;
				}
				else if (selbot===curnum){
					useleft = 0;
					useright = (curnum==cy())?x:selmark;
				}
				else{
					throw new Error("WUTUTUTU");
				}
				let str = '<span style="color:#000;background-color:#aaa;">'+(arr[useleft]||" ");
				arr[useleft]=str;
				if (useright == -1) useright = 0;
				if (arr[useright]) arr[useright] = arr[useright]+"</span>";
				else arr[useright] = "</span>";
			}
			else {
				let str = '<span style="color:#000;background-color:#aaa;">'+(arr[selleft]||"");
				arr[selleft]=str;
				if (arr[selright]) arr[selright] = arr[selright]+"</span>";
				else arr[selright] = "</span>";
			}
		}//»
		else if (arr[0]=="\xd7"){
			arr[0]=`<span style="color:rgb(95,215,255);">${arr[0]}`
			arr[arr.length-1]=`${arr[arr.length-1]}</span>`;
		}
		else if (colobj){//«
			let nums = Object.keys(colobj);
			for (let numstr of nums) {
				if (numstr.match(/^_/)) continue;
				let num1 = parseInt(numstr)-xoff;
				let obj = colobj[numstr];
				let num2 = num1 + obj[0]-1;
				let col = obj[1];
				let bgcol = obj[2];
				let str = '<span style="color:'+col+";";
				if (bgcol) str += "background-color:"+bgcol+";"
				if (!arr[num1]) str += '"> ';
				else str += '">'+arr[num1];
				arr[num1] = str;
				if (arr[num2]) arr[num2] = arr[num2]+"</span>";
				else arr[num2] = "</span>";
if (num2 > w) {
//console.log("LONGLINE");
	break;
}
			}
		}//»
		if (marks){//«
			for (let s of marks){
				let pos = s.ln.indexOf(s);
//log(s,pos);
				if (pos >= 0) {
					let str=arr[pos];
					let tag1 = "";
					let tag2 = "";
					let marr;
					if (marr=str.match(/^(<.+>)(.)$/)) tag1 = marr[1];
					else if (marr=str.match(/^(.)(<.+>)$/)) tag2 = marr[2];
					let usebg = "#ccc";
					let usefg="#000";
					let usech = s.mark||" ";
					if (!(pos==usex&&i==y)) arr[pos] = tag1+'<span style="background-color:'+usebg+';color:'+usefg+';">'+usech+"</span>"+tag2;
				}
			}
		}//»

		if (!(pager||is_buf_scroll||stat_input_mode||is_scrolling)) {//«
//		if (!(pager||is_buf_scroll||stat_input_mode||scroll_cursor_mode)) {
//			if (docursor && i==y && topwin_focused) {
			if (docursor && i==y) {
				if (!arr[usex]||arr[usex]=="\x00") {
					arr[usex]=" ";
				}
				else if (arr[usex]=="\n") arr[usex] = " <br>";
				let usebg = CURBG;
//				if (ssh_mode) usebg = "red";
				let ch = arr[usex]||" ";
				let pre="";
				let usech;
				if (ch.match(/^</)&&!ch.match(/>$/)){
					let arr = ch.split(">");
					usech = arr.pop();
					pre = arr[0]+">";
				}
				else usech = ch;
				if (!usech.length) usech = " ";
				let sty;
				if (topwin_focused) sty = `background-color:${usebg}`;
				else sty=`border:1px solid ${usebg}`;
				arr[usex] = pre+`<span id="cursor_${winid}" style="${sty}">${usech}</span>`;
			}
		}//»
		else if (error_cursor) {//«
			if (i+usescroll == error_cursor[0]) {
				let str = '<span style="color:#fff;background-color:#f00;"';
				let num1 = error_cursor[1];
				if (!arr[num1]) str += '"> ';
				else str += '">'+arr[num1];
				arr[num1] = str+"</span>";
			}
		}//»

		outarr.push(arr.join(""));
	}//»
	if (actor) {//«
		let usestr;
		let recstr;
		if (stat_input_mode) {
			let arr,ind;
		
			if (!stat_com_arr.slice) arr = [];
			else arr = stat_com_arr.slice();
			while((ind=arr.indexOf("&"))>-1) arr[ind] = "&amp;";
			while((ind=arr.indexOf("<"))>-1) arr[ind] = "&lt;";
			while((ind=arr.indexOf(">"))>-1) arr[ind] = "&gt;";
			if (!arr[x]) arr[x] = " ";
			let arrstr=arr.join("");
			arr[x] = '<span style="background-color:'+CURBG+';color:'+CURFG+'">'+arr[x]+"</span>";
			if (visual_line_mode) {
				usestr = `${stat_input_mode}'&lt;,'&gt;${arr.join("")}`;
			}
			else {
				usestr = stat_input_mode + arr.join("");
			}
		}
		else if (editor) {//«
			let mess="", messtype, messln=0;
			let recmess="";
			if (stat_message) {
				mess = stat_message;
				messln = mess.length;
				mess = mess.replace(/&/g,"&amp;");
				mess = mess.replace(/</g,"&lt;");
				recmess = mess;
				let t = stat_message_type;
				let bgcol=null;
				let tcol="#000";
				if (macro_mode){
					bgcol="#551a8b";
					tcol="#fff";
				}
				else if (t==STAT_OK) bgcol="#090";
				else if (t==STAT_WARNING) bgcol="#dd6";
				else if (t==STAT_ERROR) {
					bgcol="#c44";
					tcol="#fff";
				}
				if (bgcol) mess = '<span style="color:'+tcol+';background-color:'+bgcol+'">'+mess+'</span>';
				editor.unset_stat_message();
			}
			else if (editor.insert) recmess = mess = "-- INSERT --";
			else if (visual_line_mode) recmess = mess = "-- VISUAL LINE --";
			else if (visual_mode) recmess = mess = "-- VISUAL --";
			else if (visual_block_mode) recmess = mess = "-- VISUAL BLOCK --";
			else if (splice_mode) mess="splice mode";

			if (mess && !messln) messln = mess.length-7;
			
			let per;
			let t,b;
			if (scroll_num==0) t = true;
			if (!lines[sliceto-1]) b=true;
			if (t&&b) per = "All";
			else if (t) per="Top";
			else if (b) per = "Bot";
			else {
				if (real_lines) {
					let val = Math.floor(100*real_lines[scroll_num]/(real_lines[lines.length-1]||real_lines[lines.length-2]));
					if (isNaN(val)) {
						diagnose(1);
					}
					per = (val)+"%";
				}
				else {
					let val = Math.floor(100*scroll_num/lines.length-1);
					if (isNaN(val)) {
						diagnose(2);
					}
					per = (val)+"%";
				}
			}
			let perln = per.length;
			let perx = w-5;
			try {
				if (perln > 4) per = "?%";
				per = "\x20".repeat(4-perln)+per;
			}
			catch(e){
//cerr("Bad perlen", perln);
//log("per", per);
//log("real_lines",real_lines);
//log("scroll_num",scroll_num);
//log(real_lines[scroll_num]);
//log("lines.length-1",lines.length-1);
//log(real_lines[lines.length-1]);
			}
			let add_one = 1;
			if (real_line_mode) add_one = 0;
			let lncol;
			if (real_lines) {
				let val = real_lines[y+usescroll]+add_one;
				if (isNaN(val)) diagnose(3);
				lncol = (val)+","+(x+add_one);
			}
			else lncol = (y+usescroll+add_one)+","+(x+add_one);
			let lncolln = lncol.length;
			let lncolx = w - 18;
			let diff = lncolx - messln;
			if (diff <= 0) diff = 1;
			let diff2 = (perx - lncolx - lncolln);
			if (diff2 <= 0) diff2 = 1;
			let spaces = "\x20".repeat(diff) + lncol + "\x20".repeat(diff2)+per;
			let str = mess + spaces;
			usestr = '<span>'+str+'</span>';

		}//»
		else if (stat_message) {
			recstr = usestr = stat_message;
			stat_message = null;
		}
		else if (pager) {
			let per = Math.floor(100*(usescroll+donum)/lines.length);
			if (per > 100) per = 100;
			recstr = usestr = `${pager.fname} ${per}% of ${lines.length} lines (press q to quit)`;
		}

		if (pager) {
			if (!stat_input_mode) usestr = '<span style=background-color:#aaa;color:#000>'+usestr+'</span>'
		}
		outarr.push(usestr);
	}//»
	if (stat_lines){//«
		for (let i=0; i < num_stat_lines; i++){
			let ln = stat_lines[i];
			if (!ln) ln = "";
			outarr.push(ln.replace(/&/g,"&amp;").replace(/<(?!\/?span)/ig,"&lt;"));
		}
	}
	if (min_height && h < min_height){
		tabdiv.innerHTML=`<center><span style="background-color:#f00;color:#fff;">Min height: ${min_height}</span></center>`;
	}
	else tabdiv.innerHTML = outarr.join("\n");
//»

};

//»
//Curses«

const getgrid=()=>{//«
	let tdiv = tabdiv;
	if (!(wrapdiv._w&&wrapdiv._h)) {
		if (topwin.killed) return;
cerr("DIMS NOT SET");
		return;
	}
	let usech = "X";

	let str = "";
	let iter = 0;
	wrapdiv._over="auto";
	while (true) {
		if (topwin.killed) return;
		str+=usech;
		tdiv.innerHTML = str;
		if (tdiv.scrollWidth > wrapdiv._w) {
			tdiv.innerHTML = usech.repeat(str.length-1);
			wrapdiv._w = tdiv.clientWidth;
			ncols = str.length - 1;
			break;
		}
		iter++;
		if (iter > 10000) {
log(wrapdiv);
			cwarn("INFINITE LOOP ALERT DOING WIDTH: " + tdiv.scrollWidth + " > " + w);
			return 
		}
	}
	str = usech;
	iter = 0;
	while (true) {
		tdiv.innerHTML = str;
		if (tdiv.scrollHeight > wrapdiv._h) {
			let newarr = str.split("\n");
			newarr.pop();
			tdiv.innerHTML = newarr.join("\n");
			wrapdiv._h = tdiv.clientHeight;
			nrows = newarr.length;
			break;
		}
		str+="\n"+usech;
		iter++;
		if (iter > 10000) {
log(wrapdiv);
			return cwarn("INFINITE LOOP ALERT DOING HEIGHT: " + tdiv.scrollHeight + " > " + h);
		}
	}
	tdiv.innerHTML="";
	wrapdiv._over="hidden";
};//»
const clear_table=(if_keep_buf)=>{//«
	if (if_keep_buf) {
		buf_lines = buf_lines.concat(lines.slice(0, scroll_num));
		lines =  lines.slice(scroll_num);
		line_colors =  line_colors.slice(scroll_num);
	}
	else {
		lines = [];
		line_colors = [];
	}
	scroll_num = 0;
	render();
};//»
const clear=(if_keep_buffer)=>{//«
	clear_table(if_keep_buffer);
	if (if_keep_buffer) cur_prompt_line = y;
};
//»
const shift_line=(x1, y1, x2, y2)=>{//«
	let uselines = lines;
	let str_arr = [];
	let start_len = 0;
	if (uselines[scroll_num + y1]) {
		str_arr = uselines[scroll_num + y1].slice(x1);
		start_len = uselines[scroll_num + y1].length;
	}
	if (y1 == (y2 + 1)) {
		if (uselines[scroll_num + y2]) uselines[scroll_num + y2] = uselines[scroll_num + y2].concat(str_arr);
		uselines.splice(y1 + scroll_num, 1);
	}
	return str_arr;
};//»
const scroll_into_view=(which)=>{//«
	if (!h) return;
	const doscroll=()=>{//«
		if (lines.length-scroll_num+num_stat_lines <= h) return false;
		else {
			if (y>=h) {
				scroll_num=lines.length-h+num_stat_lines;
				y=h-1;
			}
			else {
				scroll_num++;
				y--;
			}
			return true;
		}
	};//»
	let did_scroll = false;
	while (doscroll()) did_scroll = true;
	return did_scroll;
};//»
const resize = () => {//«
//respsucc(`????`);
//response_end();
//	do_overlay(`UMRESIZE`);
	if (topwin.killed) return;
	wrapdiv._w = main._w;
	wrapdiv._h = main._h;
	let oldw = w;
	let oldh = h;
	ncols=nrows=0;
	tabdiv._dis="";
	wrapdiv._bgcol="#000";
	main._bgcol="#000";
	getgrid();
	if (ncols < MIN_TERM_WID){
		tabdiv._dis="none";
		wrapdiv._bgcol="#400";
		main._bgcol="#400";
		terminal_locked = true;
		do_overlay(`Min\xa0width:\xa0${MIN_TERM_WID}`);
		return;
	}
	if (!(ncols&&nrows)) {
		terminal_locked = true;
		return;
	}
	terminal_locked = false;
	w = ncols;
	h = nrows;
	if (!(oldw==w&&oldh==h)) do_overlay();
	this.w = w;
	this.h = h;
	line_height = wrapdiv.clientHeight/h;
	scroll_into_view();
	scroll_middle();
	if (editor){
		if (editor.resize) editor.resize(w,h);
		return;
	}
	render();
};
//»

//»
//Parse/Prompt«

const get_com_pos=()=>{//«
	let add_x=0;
	if (cy() > cur_prompt_line) {
		add_x = w - prompt_len + x;
		for (let i=cur_prompt_line+1; i < cy(); i++) add_x+=w;
	}
	else add_x = x - prompt_len;
	return add_x;
};//»
const get_com_arr=(from_x)=>{//«
	let uselines = lines;
	let com_arr = [];
	let j, line;
	for (let i = cur_prompt_line; i < uselines.length; i++) {
		line = uselines[i];
		if (i==cur_prompt_line) j=prompt_len;
		else j=0;
		let len = line.length;
		for (; j < len; j++) com_arr.push(line[j]);
		if (len < w && i < uselines.length-1) com_arr.push("\n");
	}
	return com_arr;
};
//»
const get_command_arr=async (dir, pattern, cb)=>{//«
	const dokids = kids=>{
		if (!kids) return;
		let keys = Object.keys(kids);
		for (let k of keys){
			let app = kids[k].appName;
			if ((!app||app=="Com") && re.test(k)){
				match_arr.push([k, "Command"]);
			}
		}
	};
	let arr = BUILTINS;
	let match_arr = [];
	let re = new RegExp("^" + pattern);
	for (let i=0; i < arr.length; i++) {
		let com = arr[i];
		if (pattern == "") {
			if (com.match(/^_/)) continue
			match_arr.push([com, "Command"]);
		}
		else if (re.test(com)) match_arr.push([arr[i], "Command"]);
	}
	cb(match_arr);
};//»
const execute=(str, if_init, halt_on_fail)=>{//«
	ENV['USER'] = globals.CURRENT_USER;
	kill_funcs = [];
	cur_shell = shell;
	let gotstr = str.trim();

	str = str.replace(/\x7f/g, "");
	shell.execute(str);

	let ind = buffer.indexOf(gotstr);
	if (ind >= 0) buffer.splice(ind, 1);
	buffer.push(gotstr);

};
//»
const get_prompt_str=()=>{//«
	let goodch = ["u", "U", "h", "H", "d", "t", "w"];
	let gotps = ENV.PS1;
	let ds = "\$";
	if (root_state) {
		ds = "#"; 
		gotps = "\\w" + ds;
	}
	else if (!gotps) gotps = "\\w" + ds;
	if (gotps) {//«
		cur_ps1 = gotps;
		let arr = cur_ps1.split("");
		let str = "";
		for (let i=0; i < arr.length; i++) {
			let c = arr[i];
			let c1 = arr[i+1];
			if (c == "\\" && c1 && goodch.includes(c1)) {
				if (c1 == "w") str += this.cur_dir.replace(/^\/+/, "/");
				else if (c1 == "u" || c1 == "U") {
					if (ENV.USER) {
						if (c1 == "u") str += ENV.USER.toLowerCase();
						else str += ENV.USER;
					}
					else str += "user";
				}
				else if (c1 == "h" || c1 == "H") {
					if (ENV.HOSTNAME) {
						if (c1 == "h") str += ENV.HOSTNAME.toLowerCase();
						else  str += ENV.HOSTNAME;
					}
					else str += "home";
				}
				else if (c1 == "t") str += new Date().toTimeString().split(" ")[0];
				else if (c1 == "d") str += cur_date_str();
				i++;
			}
			else str += c;
		}
		cur_prompt = str;
	}//»
	if (ENV.USER) {
		if ((new RegExp("^/home/"+ENV.USER+"\\$$")).test(cur_prompt)) {
			cur_prompt = "~$";
		}
		else if ((new RegExp("^/home/"+ENV.USER+"/")).test(cur_prompt)) cur_prompt = cur_prompt.replace(/^\/home\/[^\/]+\x2f/,"~/");
	}
	cur_prompt=cur_prompt.replace(/ *$/, " ");
	return cur_prompt.replace(/ /g, "\xa0");
};//»
const set_prompt=(str_arg, opts={})=>{//«
	let if_force = opts.FORCEBR;
	let if_nopush = opts.NOPUSH;
	let if_noscroll = opts.NOSCROLL;
	let use_str;
	if (isstr(str_arg)) use_str = str_arg;
	else use_str = get_prompt_str();

	if (!opts.FROMCOM && !global_winname) topwin.title=use_str.replace(/..$/,"");
	
	let plines;
	if (use_str==="") plines = [[""]];
	else{
		if (opts.FROMCOM){
			let arr = fmt(use_str, 0);
			plines=[];
			for (let ln of arr) plines.push([...ln]);
		}
		else{
			if (use_str.length+1 >= w) use_str = "..."+use_str.substr(-(w-5));
			plines = [use_str.split("")];
		}
	}
	let line;
	let use_col = null;
	let len_min1;
	if (!lines.length) {
		lines = plines;
		len_min1 = lines.length-1;
		cur_prompt_line = 0;
	}
	else {
		len_min1 = lines.length-1;
		line = plines.shift();
		if (line_continue_flag) lines[len_min1] = lines[len_min1].concat(line);
		else if (if_force) {
			lines.push(line);
			len_min1++;
		}
		else {
			if (!lines[len_min1][0]) lines[len_min1] = line;
			else {
				lines.push(line);
				len_min1++;
			}
		}
		if (use_col) line_colors[len_min1] = {'0': [line.length, use_col]};
		while(plines.length) {
			line = plines.shift();
			lines.push(line);
			len_min1++;
			if (use_col) line_colors[len_min1] = {'0': [line.length, use_col]};
		}
		if (!if_noscroll) {
			cur_prompt_line = len_min1;
			scroll_into_view();
		}
	}
	prompt_len = lines[len_min1].length;
	if (prompt_len==1 && lines[len_min1][0]==="") prompt_len=0;
	x=prompt_len;
	y=lines.length - 1 - scroll_num;
	line_continue_flag = false;
};
//»
const insert_cur_scroll=()=>{//«
	com_scroll_mode = false;
	lines = lines_hold_2.slice(0, lines.length);
	let str = cur_scroll_command;
	let arr = fmt_lines_sync(str.split("\n"), prompt_len);
	let curarr = get_prompt_str().split("");
	for (let i=0; i < arr.length; i++) {
		let charr = arr[i].split("");
		for (let j=0; j < charr.length; j++) curarr.push(charr[j]);
		lines[cur_prompt_line + i] = curarr;
		y = cur_prompt_line + i - scroll_num;
		x = curarr.length;
		curarr = [];
	}
	if (x == w-1) {
		x=0;
		y++;
	}
	cur_scroll_command = null;
	return str;
};//»
const get_dir_contents=async(dir, pattern, cb, if_keep_ast)=>{//«
	const domatch=()=>{//«
		kids = ret.kids;
		keys = Object.keys(kids);
		let match_arr = [];
		if (!if_keep_ast) pattern = pattern.replace(/\*/g, "[a-zA-Z_]*");
		pattern = pattern.replace(/\xa0/g, " ");
		let re = new RegExp("^" + pattern.replace(/\./g,"\\."));
//log(re);
		for (let i=0; i < keys.length; i++) {
			let key = keys[i];
			if (key=="."||key=="..") continue;
			let kid = kids[key];
			if (!root_state){
				let cur = kid;
				while (cur.treeroot !== true) {
					if (cur.rootonly === true) {
						kid = null;
						break;
					}
					cur = cur.par;
				}
				if (!kid) continue;
			}
			let useapp = kid.appName;
			let ret = [keys[i], useapp];
			if (useapp == "Link") ret.push(kid.link);
			if (pattern == "" || re.test(keys[i])) match_arr.push(ret);
		}
		cb(match_arr);
	};//»
	if (dir===null) throw new Error("get_dir_contents() no dir!");
	let ret = await fsapi.pathToNode(dir);
	if (!(ret&&ret.appName==FOLDER_APP)) return cb([]);
	let type = ret.type;
	let kids=ret.kids;
	let keys=Object.keys(kids);
	if (type==FS_TYPE&&!ret.done) {
		let ret2 = await fsapi.popDir(ret,{});
		if (!ret2) return cb([]);
		ret.done = true;
		ret.kids = ret2;
		domatch();
	}
	else if (keys.length==2) {
		if (type=="remote"||type=="local") {
			if (!ret.checked) {
				if (awaiting_remote_tab_completion) {
cwarn("AWAITING REMOTE DIR LOOKUP: "+dir);
					return;
				}
				awaiting_remote_tab_completion = true;
//FS555
				let ret2 = await fsapi.popDir(ret,{});
				if (!ret2) {
					awaiting_remote_tab_completion = false;
					return cb([]);
				}
				ret.kids = ret2;
				domatch();
				awaiting_remote_tab_completion = false;
			}
			else cb([]);
		}
		else{
			let ret2 = await fsapi.popDir(ret);
			if (!ret2) return cb([]);
			ret.kids = ret2;
			domatch();
		}
	}
	else domatch();
};
//»

//»
//Response«

const resperrobj=()=>{resperr(obj.toString());};
const response_end=(if_nopush, which, if_force)=>{//«
	if (!did_init) return;
	if (pager) return;
	set_prompt(null, {FORCEBR: if_force});
	scroll_into_view();
	sleeping = null;
	bufpos = 0;
	setTimeout(()=>{cur_shell = null;},10);
	render();
};
//»
const resperrch=(str)=>{response({"CH": str}, {NOEND: true});};
const respsuccch=(str)=>{response({"CH": str}, {NOEND: true});};
const resperr=(str, if_no_cur, cb, opts={})=>{//«
	let out;
	if (!opts.CLEAR) out = fmt(str);
	else out = [str];
	response({"ERR": out}, {NOEND: true, NOCUR: if_no_cur, CLEAR: opts.CLEAR});
};//»
const respsucc=(str, if_no_cur, cb, opts={})=>{//«
	let out;
	if (!opts.CLEAR) out = fmt(str);
	else out = [str];
	response({"SUCC": out}, {NOEND: true, NOCUR: if_no_cur, CLEAR: opts.CLEAR, NONL: opts.NONL, FORCELINE: opts.FORCELINE});
	if (cb) cb(1);
};//»
const respsuccobj=(obj, if_no_cur, cb, if_clear, if_nonl)=>{//«
	response({"SUCC": [obj_to_string(obj)]}, {NOEND: true, NOCUR: if_no_cur, CLEAR: if_clear, NONL: if_nonl});
	if (cb) cb(1);
};//»
const respsucclines=(arr, colorargs, norowargs, usetimeout, cb, write_cb, if_clear)=>{//«
	response({"SUCC": arr, 'COLORS': colorargs}, {NOEND: true, NOCUR: true, CLEARONE: if_clear});
	if (cb) cb();
	if (write_cb) write_cb(1);
};//»
const resperrlines=(arr, colorargs, norowargs, usetimeout, cb, write_cb, if_clear)=>{//«
	response({"ERR": arr, 'COLORS': colorargs}, {NOEND: true, NOCUR: true, CLEARONE: if_clear});
	if (cb) cb();
	if (write_cb) write_cb(1);
};//»
const respsuccblob=(blob, if_no_cur, cb, if_clear, noarg, if_nonl)=>{//«
	response({"SUCC": [blob.toString()]}, {NOEND: true, NOCUR: if_no_cur, CLEAR: if_clear, NONL: if_nonl});
	if (cb) cb(1);
};//»
const response = (outarg, opts={})=>{//«

	const doend=(which)=>{//«
		use_cb();
		y=lines.length-1-scroll_num;
		x=lines[cy()].length;
		cur_prompt_line = lines.length - 1;
		if (!if_noend) response_end(null, 1);
	}//»

//Var«
	let if_noend = opts.NOEND;//1
	let next_cb = opts.NEXTCB;//3
	let if_nocur = opts.NOCUR;//4
	let if_clear = opts.CLEAR;//5
	let if_clear_one = opts.CLEARONE;//6
	let if_force_nl = opts.FORCELINE;
	let if_soft_break = opts.SOFTBREAK;
	let if_break = opts.BREAK;

	let do_append = false;
	let is_empty = null;

//This means that there is a "line continuation" flag for the next addition to 
//lines (usually in set_prompt?)
	let if_nonl = opts.NONL;
	if (if_nonl) line_continue_flag = true;
	if (!lines[0]) lines[0] = [];
	let out;
	let outi;
	let use_cb=()=>{};
	if (next_cb) use_cb = next_cb;
//»
	if (outarg['CD']) {//«
		this.cur_dir = outarg['CD'];
		if (!if_noend) response_end(null, 2);
		else get_prompt_str();
		return;
	}//»
	if (outarg.DONE===true) {//«
		response_end(null,3);
		return;
	}//»

	let colors = outarg['COLORS'];

	if (outarg['SUCC']) out = outarg['SUCC'];
	else if (outarg["ERR"]) out = outarg["ERR"];
	
	if (if_clear === false) do_append = true;
	
	let thisline = lines[lines.length-1];

	if (if_clear && thisline && !thisline.length && lines.length){
		lines.pop();
		thisline = lines[lines.length-1];
	}

	if (thisline) {
		if (if_clear) {
			thisline = [];
		}
		if (!thisline.length) is_empty = true;
	}
	let use_inc = 1;
	if (is_empty) use_inc = 0;
	if (colors) {
		for (let i=0; i < colors.length; i++) line_colors[scroll_num + y + i + use_inc] = colors[i];
	}
	let numlines = out.length;
	if (!if_break&&!if_force_nl&&out.length==1&&out[0]==="\x00") return;

	if (out.length==1&&out[0]==="") {//«
		if (if_force_nl) lines.push([""]);
		doend(1);
		return;
	}//»
	for (let i=0; i < out.length; i++) {//«
		outi = out[i];
		if(outi.EOF===true) continue;

		if (outi.toString instanceof Function) outi = outi.toString();//Coerce it into a string
		else outi+="";

		if (outi == "\x00") {//«
//If a null byte, push a Newline
//But we didn't do a formfeed, ie, increasing the cur_prompt_line
			if ((if_soft_break || !if_force_nl) && is_empty) {
				if (cur_shell){
					if (if_soft_break) return;
				}
				else return;
			}
			if (line_continue_flag) return doend(2);
			
			if (if_force_nl) lines.push([null]);
			else lines.push([]);
			
			scroll_into_view();
			y=lines.length-1-scroll_num;
			x=lines[cy()].length;
			cur_prompt_line = lines.length - 1;
			continue;
		}//»

		if (!thisline) {//«
//If no line, make a new one, if not a char, output an object type
			thisline = [];
			lines.push(thisline);
		}//»
		if (do_append) lines[lines.length-1] = lines[lines.length-1].concat(outi.split(""));//If there is just a space here, stick all the chars there
		else if (!if_force_nl && thisline.length == 1 && (thisline[0]==""||thisline[0]==" ")) lines[lines.length-1] = outi.split("");//GHTYEKS
		else {
			if (w-outi.length < 0) {//«
//Overflow marker
if (!if_clear) {
log(outi);
}
				outi = outi.slice(0,w-1)+"+";
				let col = {};
				col[w-1+""]=[1,"#000","#ccc"];
				let usenum = lines.length;
				if (is_empty){
					usenum--;
				}
				line_colors[usenum] = col;
			}//»
			if (is_empty) {
				lines[lines.length-1] = outi.split("");
				if (!if_clear) {
					lines.push([]);
				}
			}
			else {
				lines.push(outi.split(""));
			}			
			scroll_into_view();
		}
	}//»

};
this.response = response;
//»

//»
//Key handlers«

this.kill_register = (funcarg)=>{//«
	kill_funcs.push(funcarg);
}//»
this.kill_unregister = (funcarg)=>{//«
	let which = kill_funcs.indexOf(funcarg);
	if (which < 0) {
cwarn("Could not find the funcarg");
		return;
	}
	kill_funcs.splice(which, 1);
}//»
const execute_kill_funcs=(cb)=>{//«
	let iter = -1;
	let dokill=()=>{
		iter++;
		let fn = kill_funcs[iter];
		if (!fn) {
			kill_funcs = [];
			if (cb) cb();
			return
		}
		fn(dokill);
	}
	dokill();
};//»
const do_ctrl_C=()=>{//«
	if (cur_shell) {
		ENV['?'] = 0;
//		add_com = null;
		if (cur_shell.stdin) {
			cur_shell.stdin(null, true);
			delete cur_shell.stdin;
		}
		cur_shell.cancel();
		execute_kill_funcs(()=>{
			cur_shell = null;
			response_end(true);
		});
	}
	else if (term_mode != "shell") end_app_mode();
	else {
		handle_priv(null,"^".charCodeAt(), null, true);
		handle_priv(null,"C".charCodeAt(), null, true);
		if (root_state && cur_dir.match(/^\/cache/)) cur_dir = get_homedir();
		root_state = null;
		bufpos = 0;
		command_hold = null;
		ENV['?'] = 0;
//		add_com = null;
		response_end(null,null,true);
	}
};//»

const handle_insert=val=>{//«
	let arr = val.split("");
	let gotspace = false;
	for (let ch of arr) {
		let code = ch.charCodeAt();
		if (!(code >= 32 && code <= 126)) {
			if (code==10) continue;
			code = 32;
		}
		if (code==32) {
			if (gotspace) continue;
			gotspace = true;
		}
		else gotspace = false;
		handle_priv(null,code, null, true);
	}
};//»
const handle_line_str=(str, from_scroll, uselen, if_no_render)=>{//«
	let did_fail = false;
	const copy_lines=(arr, howmany)=>{//«
		let newarr = [];
		for (let i=0; i <= howmany; i++) {
			let ln = arr[i];
			if (!ln) {
				did_fail = true;
				ln = [" "];
			}
			newarr.push(ln);
		}
		return newarr;
	}//»
	if (str=="") {}
	else if (!str) return;
	let curnum = cur_prompt_line;
	let curx;
	if (typeof uselen=="number") curx=uselen;
	else curx = prompt_len;
	lines_hold_2 = lines;
	if (!com_scroll_mode) {
		lines = copy_lines(lines, cur_prompt_line)
		if (did_fail) {
			clear();
			return 
		}
	}
	lines[lines.length-1] = lines[lines.length-1].slice(0, prompt_len);
	let curpos = prompt_len;
	cur_scroll_command = str;
	let arr = str.split("\n");
	let addlines = 0;
	for (let lnstr of arr) {
		let i;
		if (!lnstr) lnstr = "";
		for (i=curnum;lnstr.length>0;i++) {
			let curln = lines[i];
			if (!curln) curln = [];
			let strbeg = lnstr.slice(0,w-curpos);
			curx = curpos + strbeg.length;
			curln.push(...strbeg);
			lines[i] = curln;
			lnstr = lnstr.slice(w-curpos);
			if (lnstr.length > 0) {
				curnum++;
				curx = 0;
			}
			curpos = 0;
			addlines++;
		}
		curnum++;
	}
	scroll_into_view();
	y = lines.length-1-scroll_num;
	x = curx;
	if (x==w) {
		y++;
		if (!lines[y+scroll_num]) lines.push([]);
		x=0;
		scroll_into_view();
	}
	if (!if_no_render) render();
};
//»
const handle_tab=async()=>{//«
	const docontents=async()=>{//«
		if (contents.length == 1) {//«

//METACHAR_ESCAPE

//\x22 -> "
//\x27 -> '
//\x60 -> `
//\x5b -> [
			let chars = contents[0][0].replace(/[ \x22\x27\x5b\x60#~{<>$|&!;()]/g, "\\$&").split("");
			let type = contents[0][1];
			tok = tok.replace(/\*$/,"");
			let str = tok;
			for (let i=tok.length; i < chars.length; i++) {
				let gotch = chars[i];
				str+=gotch;
				handle_letter_press(gotch);
			}
			if (type==FOLDER_APP) {
				handle_letter_press("/");//"/"
//FS777
				let rv = await fsapi.popDirByPath(use_dir+"/"+str,{root:root_state});
				if (!rv) return cerr("hdk76FH3");
			}
///*
			else if (type=="appDir"||type=="libDir"){
				handle_letter_press(".");//"/"
			}
			else if (type=="Link") {
				let link = contents[0][2];
				if (!link){
cwarn("WHAT DOES THIS MEAN: contents[0][2]?!?!?!?");
				}
				else if (!link.match(/^\x2f/)) {
cwarn("handle_tab():  GOWDA link YO NOT FULLPATH LALA");
				}
				else {
//FS888
//					let obj = await fsapi.pathToNode(link, {root:root_state});
					let obj = await fsapi.pathToNode(link);
					if (obj&&obj.appName==FOLDER_APP) handle_letter_press("/");
					else {
						if (!lines[cy()][cx()]) handle_letter_press(" ");
					}
				}
			}
			else {
				if (!lines[cy()][cx()]) handle_letter_press(" ");
			}
		}//»
		else if (contents.length > 1) {//«
			if (await_next_tab) {//«
				let last_line = lines[cy()];
				let repeat_arr = last_line.slice(prompt_len);
				let ret_arr = [];
				for (let i=0; i < contents.length; i++) {
					let arr = contents[i];
					let nm = arr[0];
					if (arr[1]===FOLDER_APP) nm+="/";
					ret_arr.push(nm);
				}
				let names_sorted = ret_arr.sort();
				let name_lens = [];
				for (let nm of names_sorted) name_lens.push(nm.length);
				let command_return = [];
				fmt_ls(names_sorted, name_lens, command_return);
//				let holdx = x;
				response({"SUCC": command_return}, {NOEND: true, NOCUR: true});
				response_end(null,4);
				for (let i=0; i < repeat_arr.length; i++) handle_letter_press(repeat_arr[i]);
//				x = holdx;
				x = arr_pos + prompt_len;
				render();
			}//»
			else {//«
				if (!tok.length) {await_next_tab = true;return;}
				let max_len = tok.length;
				let got_substr = "";
				let curstr = tok;
				let curpos = tok.length;
				TABLOOP: while(true) {
					let curch = null;
					for (let arr of contents) {
						let word = arr[0];
						if (curpos == word.length) break TABLOOP;
						if (!curch) curch = word[curpos];
						else if (curch!==word[curpos]) break TABLOOP;
					}
					curstr += curch;
					curpos++;
				}
				got_substr = curstr;

				let got_rest = got_substr.substr(tok.length);
				if (got_rest.length > 0) {
					if (contents.length > 1)await_next_tab = true;
					else await_next_tab = null;
					
					let chars = got_rest.split("");
					for (let i=0; i < chars.length; i++) {
						let gotch = chars[i];
						if (gotch == " ") gotch = "\xa0";
						handle_letter_press(gotch);
					}
				}
				else await_next_tab = true;
			}//»
		}//»
	};//»
	const do_gdc = () => {
		get_dir_contents(use_dir, tok, ret => {
			if (!ret.length) return;
			contents = ret;
			docontents();
		});
	};
	if (cur_scroll_command) insert_cur_scroll();
	let contents;
	let use_dir = this.cur_dir;
	if (cur_shell) return;
	let arr_pos = get_com_pos();
	let arr = get_com_arr();
	let tok = "";
	let new_arr = arr.slice(0, arr_pos);
	let rem_str = arr.slice(arr_pos).join("").replace(/\x20+/,"");
	let com_str = new_arr.join("");

//At the end of a string with exactly one non-backtick quote character...
//Just a quick and dirty way to do tab completion with quotes
//if (arr_pos == arr.length && (com_str.match(/[\x22\x27]/g)||[]).length===1 && !com_str.match(/\x60/)){
if ((com_str.match(/[\x22\x27]/g)||[]).length===1){//«


let have_quote;
let s="";

for (let i=arr_pos-1; i >=0; i--){
	let ch = arr[i];
	if (ch.match(/[\x22\x27]/)){
		have_quote = ch;
		break;
	}
	s=`${ch}${s}`;
}
if (s.match(/\x2f/)){
	if (s.match(/^\x2f/)) use_dir="";
	let ar = s.split("/");
	s = ar.pop();
	use_dir=`${use_dir}/${ar.join("/")}`;
}
//GYWJNFGHXP
let use_str= s.replace(/([\[(+*?])/g,"\\$1");

get_dir_contents(use_dir, use_str, async ret => {
	if (!ret.length) return;
	if(ret.length===1){
		let rem = ret[0][0].slice(s.length);
		for (let ch of rem) handle_letter_press(ch);
		if (ret[0][1]===FOLDER_APP){
			handle_letter_press("/");
			await_next_tab = true;
		}
		else if (ret[0][1]==="Link"){
			let obj = await fsapi.pathToNode(`${use_dir}/${use_str}${rem}`);
			if (obj && obj.appName===FOLDER_APP){
				handle_letter_press("/");
				await_next_tab = true;
			}
			else handle_letter_press(have_quote);
		}
		else handle_letter_press(have_quote);
		return;
	}
	if (await_next_tab){
		contents = ret;
		docontents();
		return;
	}
	let all=[];
	for (let ar of ret) all.push(ar[0]);
	let rem = capi.sharedStart(all).slice(s.length);
	for (let ch of rem) handle_letter_press(ch);
	await_next_tab = true;
}, true);

return;

}//»

	new_arr = com_str.split(/ +/);
	if (!new_arr[0] && new_arr[1]) new_arr.shift();
	let tokpos = new_arr.length;
	if (tokpos > 1) {
		if (new_arr[new_arr.length-2].match(/[\x60\(|;] *$/)) tokpos = 1;
	}

	let tok0 = new_arr[0];
	tok = new_arr.pop();
	tok = tok.replace(/^[^<>=]*[<>=]+/,"")
//log();
	if (tok.match(/^[^\x60;|&(]*[\x60;|&(][\/.a-zA-Z_]/)) {
		tok = tok.replace(/^[^\x60;|&(]*[\x60;|&(]/,"");
		tokpos = 1;
	}

	let got_path = null;

	if (tok.match(/\x2f/)) {//«
		tok = tok.replace(/^~\x2f/, "/home/"+ENV.USER+"/");
		got_path = true;
		let dir_arr = tok.split("/");
		tok = dir_arr.pop();
		let dir_str;
		let new_dir_str;
		if (dir_arr.length == 1 && dir_arr[0] == "") new_dir_str = "/";
		else {
			dir_str = dir_arr.join("/");
			let use_cur = this.cur_dir;
			if (dir_str.match(/^\x2f/)) use_cur = null;
//FS222
			new_dir_str = capi.getFullPath(dir_str, this.cur_dir);
		}
		use_dir = new_dir_str;
	}//»
	let nogood = null;
	if (!got_path && (tokpos==1||(tokpos==2 && com_completers.includes(tok0)))) {
		if (tokpos==1) {
			get_command_arr(use_dir, tok, rv=>{
				contents = rv;
				if (contents && contents.length) docontents();
				else do_gdc();
			});
		}
		else {
			if (tok0==="app"){
				if (tok.match(/\x2f/)) return do_gdc();
				let path="";
				if (tok) path=`?path=${tok}`;
				let rv = await fetch(`/_get${tok0}${path}`);
				let arr = await rv.json();
				let all = [];
				for (let n of arr) {
					if (n.match(/\.js$/)) all.push([n.replace(/\.js$/,""),"File"]);
					else all.push([n,`${tok0}Dir`]);
				}
				contents = all;
				if (tok.match(/\./)){
					let arr = tok.split(".");
					tok = arr.pop();
				}
				docontents();
			}

		}
	}
	else {
		do_gdc();
	}	
	
};//»
const handle_buffer_scroll=(if_up)=>{//«
	if (buffer_scroll_num===null) {
		buffer_scroll_num = scroll_num;
		scroll_cursor_y = y;
		hold_x = x;
		hold_y = y;
	}
	let n = buffer_scroll_num;
	if (if_up) {//«
		if (n == 0) return;
		let donum;
		if (n - h > 0) {
			donum = h;
			n -= h;
		}
		else n = 0;
		y=0;
	}//»
	else {//«
		let donum = h;
		if (n + donum >= lines.length) return;
		n += donum;
		if (n + h > lines.length) {
			n = lines.length - h;
			if (n < 0) n = 0;
		}
		y=0;
	}//»
	buffer_scroll_num = n;
	render();
};//»
const handle_arrow=(code, mod, sym)=>{//«

	if (mod == "") {//«
		if (code == KC['UP']) {//«
			if (cur_shell) return;
			if (bufpos < buffer.length) {
				if (command_hold == null && bufpos == 0) {
					command_hold = get_com_arr().join("");
					command_pos_hold = get_com_pos() + prompt_len;
				}
				bufpos++;
			}
			else return;
			let str = buffer[buffer.length - bufpos];
			if (str) {
				let diffy = scroll_num - cur_prompt_line;
				if (diffy > 0) {
					y=0;
					scroll_num -= diffy;
					cur_prompt_line = scroll_num;
					set_prompt(null,{NOPUSH:1, NOSCROLL:1});
				}
				else y = cur_prompt_line;
				while (cur_prompt_line+1 != lines.length) { 
if (!lines.length){
console.error("COULDA BEEN INFINITE LOOP: "+(cur_prompt_line+1) +" != "+lines.length);
break;
}
					lines.pop();
				}
				handle_line_str(str.trim(), true);
				com_scroll_mode = true;
			}
		}//»
		else if (code == KC['DOWN']) {//«
			if (cur_shell) return;
			if (bufpos > 0) bufpos--;
			else return;
			if (command_hold==null) return;
			let pos = buffer.length - bufpos;
			if (bufpos == 0) {
				trim_lines();
				handle_line_str(command_hold.replace(/\n$/,""),null,null,true);
				x = command_pos_hold;
				command_hold = null;
				render();
			}
			else {
				let str = buffer[buffer.length - bufpos];
				if (str) {
					let diffy = scroll_num - cur_prompt_line;
					if (diffy > 0) {
						y=0;
						scroll_num -= diffy;
						cur_prompt_line = scroll_num;
						set_prompt(null,{NOPUSH:1, NOSCROLL:1});
					}
					trim_lines();
					handle_line_str(str.trim(), true);
					com_scroll_mode = true;
				}
			}
		}//»
		else if (code == KC["LEFT"]) {//«
			if (cur_scroll_command) insert_cur_scroll();
			if (cx() == 0) {
				if (cy() == 0) return;
				if (cy() > cur_prompt_line) {
					if (y==0) {
						scroll_num--;
					}
					else y--;
					x = lines[cy()].length;
					if (x==w) x--;
					if (x<0) x = 0;
					render();
					return;
				}
				else return;
			}
			if (cy()==cur_prompt_line && x==prompt_len) return;
			x--;
			render();

		}//»
		else if (code == KC["RIGHT"]) {//«
			if (cur_scroll_command) insert_cur_scroll();
//Or if this is less than w-2 with a newline for a CONT like current CLI environment.
			let nextline = lines[cy()+1];
			let thisline = lines[cy()];
			let thisch = thisline[cx()];
			let thislinelen = thisline.length;

			if (x == w-1 || ((x < w-1) && nextline && ((x==0&&!thislinelen) || (x==lines[cy()].length)))) {//«
				if (x<w-1){
					if (!thisch) {
						if (!nextline) return;
					}
				}
				else if (!thisch) return;
				if (lines[cy() + 1]) {
					x=0;
					if (y+1==h) scroll_num++;
					else y++;
					render();
				}
				else { 
					lines.push([]);
					x=0;
					y++;
					if (!scroll_into_view(9)) render();
					return;
				}
			}//»
			else {
				if (x==thislinelen||!thisch) return;
				x++;
				render();
			}
		}//»
	}//»
	else if (mod=="C") {//«
		if (kc(code,"UP")) {//«
			if (bufpos < buffer.length) {
				if (command_hold == null && bufpos == 0) {
					command_hold = get_com_arr().join("");
					command_pos_hold = get_com_pos() + prompt_len;
				}
				bufpos++;
			}
			else return;

			let re = new RegExp("^" + command_hold);
			for (let i = buffer.length - bufpos; bufpos <= buffer.length; bufpos++) {
				let str = buffer[buffer.length - bufpos];
				if (re.test(str)) {
					trim_lines();
					handle_line_str(str.trim(), true);
					com_scroll_mode = true;
					break;
				}
			}
		}//»
		else if (kc(code,"DOWN")) {//«
			if (bufpos > 0 && command_hold) bufpos--;
			else return;
			let re = new RegExp("^" + command_hold);
			for (let i = buffer.length - bufpos; bufpos > 0; bufpos--) {
				let str = buffer[buffer.length - bufpos];
				if (re.test(str)) {
					trim_lines();
					handle_line_str(str.trim(), true);
					com_scroll_mode = true;
					return;
				}
			}
			if (command_hold) {
				trim_lines();
				handle_line_str(command_hold.trim(), true);
				com_scroll_mode = true;
				command_hold = null;
			}
			else {
			}
		}//»
		else if (kc(code,"LEFT")) {//«
			if (cur_scroll_command) insert_cur_scroll();
			let arr = get_com_arr();
			let pos;
			let start_x;
			let char_pos = null;
			let use_pos = null;
			let add_x = get_com_pos();
			if (add_x==0) return;
			start_x = add_x;
			if (arr[add_x] && arr[add_x] != " " && arr[add_x-1] == " ") add_x--;
			if (!arr[add_x] || arr[add_x] == " ") {
				add_x--;
				while(add_x > 0 && (!arr[add_x] || arr[add_x] == " ")) add_x--;
				char_pos = add_x;
			}
			else char_pos = add_x;
			if (char_pos > 0 && arr[char_pos-1] == " ") use_pos = char_pos;
			while(char_pos > 0 && arr[char_pos] != " ") char_pos--;
			if (char_pos == 0) use_pos = 0;
			else use_pos = char_pos+1;
			for (let i=0; i < start_x - use_pos; i++) handle_arrow(KC["LEFT"], "");
		}//»
		else if (kc(code,"RIGHT")) {//«
			if (cur_scroll_command) insert_cur_scroll();
			let arr;
			arr = get_com_arr();
			let pos;
			let start_x;
			let char_pos = null;
			let use_pos = null;
			let add_x = get_com_pos();
			if (add_x == arr.length) return;
			else if (!arr[add_x]) return;
			start_x = add_x;
			if (arr[add_x] != " ") {
				add_x++;
				while(add_x != arr.length && arr[add_x] != " ") add_x++;
				char_pos = add_x;
				if (char_pos == arr.length) use_pos = char_pos;
				else {
					char_pos++;
					while(char_pos != arr.length && arr[char_pos] == " ") char_pos++;
					use_pos = char_pos;
				}
			}
			else {
				add_x++;
				while(add_x != arr.length && arr[add_x] == " ") add_x++;
				use_pos = add_x;
			}
			for (let i=0; i < use_pos - start_x; i++) handle_arrow(KC["RIGHT"], "");
		}//»
	}//»

};//»
const handle_page=(sym)=>{//«
	if (sym=="HOME_") {//«
		if (cur_shell) return;
		if (bufpos < buffer.length) {
			if (command_hold == null && bufpos == 0) {
				command_hold = get_com_arr().join("");
				command_pos_hold = get_com_pos() + prompt_len;
			}
			bufpos = buffer.length;
			let str = buffer[0];
			if (str) {
				trim_lines();
				handle_line_str(str.trim(), true);
			}
		}
	}//»
	else if (sym=="END_") {//«
		if (cur_shell) return;
		if (bufpos > 0) {
			bufpos = 0;
			if (command_hold!=null) {
				trim_lines();
				handle_line_str(command_hold.trim(), true);
				command_hold = null;
			}
		}
	}//»
};//»
const handle_backspace=()=>{//«
	let prevch = lines[cy()][cx()-1];
	if (((y+scroll_num) ==  cur_prompt_line) && (x == prompt_len)) return;
	else {
		let do_check = true;
		let is_zero = null;
		if (cx()==0 && y==0) return;
		if (cx()==0 && (cy()-1) < cur_prompt_line) return;
		if (cur_scroll_command) insert_cur_scroll();

		if (cx()==0 && cy() > 0) {//«
			if (lines[cy()].length < w) {//«
				let char_arg = lines[cy()][0];
				if (char_arg) {
					check_line_len(-1);
					is_zero = true;
					lines[cy()].splice(x, 1);
					lines[cy()-1].pop();
					lines[cy()-1].push(char_arg);
					y--;
					x = lines[cy()].length - 1;
					render();
				}
				else {
					lines[cy()-1].pop();
					lines.splice(cy(), 1);
					y--;
					x=lines[cy()].length;
					check_line_len();
					render();
					return;
				}
			}//»
			else {//«
				y--;
				do_check = true;
				lines[cy()].pop();
				x = lines[cy()].length;
				render();
			}//»
		}//»
		else {//«
			x--;
			lines[cy()].splice(x, 1);
		}//»

		let usey=2;
		if (!is_zero) {
			usey = 1;
			do_check = true;
		}

		if (do_check && lines[cy()+usey] && lines[cy()].length == w-1) {//«
			let char_arg = lines[cy()+usey][0];
			if (char_arg) lines[cy()].push(char_arg);
			else lines.splice(cy()+usey, 1);
			if(lines[cy()+usey]) {//«
				lines[cy()+usey].splice(0, 1);
				let line;
				for (let i=usey+1; line = lines[cy()+i]; i++) {
					let char_arg = line[0];
					if (char_arg) {
						line.splice(0,1);
						lines[cy()+i-1].push(char_arg);
						if (!line.length) lines.splice(i+1, 1);
					}
				}
			}//»
		}//»

	}
	render();
};//»
const handle_delete=(mod)=>{//«
	if (mod == "") {
		if (lines[cy()+1]) {
			handle_arrow(KC.RIGHT, "");
			handle_backspace();
		}
		else {
			lines[cy()].splice(x, 1);
			render();
		}
	}
};
//»
const handle_enter=async(if_paste)=>{//«
	if (!sleeping){
		bufpos = 0;
		command_hold = null;
		let str;
		if (cur_shell) {//«
			let ret = get_com_arr(1);
			if (str == null) return response_end(null,5);
			str = ret.join("");
		}//»
		else {//«
			if (cur_scroll_command) str = insert_cur_scroll();
			else str = get_com_arr().join("");
			if (!str) {
				ENV['?']="0";
				response_end(null,6,true);
				return;
			}
		}//»
		x=0;
		y++;
		response({"SUCC":["\x00"]}, {BREAK: true, NOEND:true});
		render();

//		if (!(str || term_mode != "shell")) return response_end(null,7);
		if (!(str || false)) return response_end(null,7);
		if (str) {
			last_com_str = str;
		}
		if (!if_paste) sleeping = true;
		await execute(str);
		sleeping = null;
	}
};//»
const handle_letter_press=(char_arg, if_no_render)=>{//«
	const dounshift=(uselines)=>{//«
		if ((uselines[cy()].length) > w) {
			let use_char = uselines[cy()].pop()
			if (!uselines[cy()+1]) uselines[cy()+1] = [use_char];
			else uselines[cy()+1].unshift(use_char);
			if (x==w) {
				x=0;
				y++;
			}
			for (let i=1; line = uselines[cy()+i]; i++) {
				if (line.length > w) {
					if (uselines[cy()+i+1]) uselines[cy()+i+1].unshift(line.pop());
					else uselines[cy()+i+1] = [line.pop()];
				}
				else {
					if (uselines[cy()+i-1].length > w) {
						line.unshift(uselines[cy()+i-1].pop());
					}
				}
			}
		}
	};//»
	let line;
	if (lines && lines[scroll_num + y]) {
		if ((x) < lines[scroll_num + y].length && lines[scroll_num + y][0]) {
			lines[scroll_num + y].splice(x, 0, char_arg);
			shift_line(x-1, y, x, y);
		}
	}

	let usex = x+1;
	let usey = y;
	y = usey;

	let endch = null;
	let didinc = false;
	if (usex == w) {
		if (lines[cy()][cx()+1]) endch = lines[cy()].pop();
		didinc = true;
		usey++;
		usex=0;
	}
	if (!lines[cy()]) {//«
		lines[cy()] = [];
		lines[cy()][0] = char_arg;
	}//»
	else if (lines[cy()] && char_arg) {//«
		let do_line = null;
		if (lines[cy()][x]) do_line = true;
		lines[cy()][x] = char_arg;
	}//»
	let ln = lines[scroll_num+usey];
	if (ln && ln[usex]) {//«
		if (x+1==w) {
			if (!didinc) {
				usey++;
				usex=0;
			}
			if (endch) {
				if (!ln||!ln.length||ln[0]===null) lines[scroll_num+usey] = [endch];
				else ln.unshift(endch);	
			}
		}
		else usex = x+1;
	}//»
	else {//«
		if (!ln||!ln.length||ln[0]===null) {
			lines[scroll_num+usey] = [endch];
		}
	}//»
	x = usex;
	y = usey;
	dounshift(lines);
	scroll_into_view(8);
	if (!if_no_render) render();
	if (textarea) textarea.value = "";
};//»
const handle_priv=(sym, code, mod, ispress, e)=>{//«
	if (sleeping) {
		if (ispress || sym=="BACK_") return;
	}
	
	if (!lines[cy()]) {
		if (code == 75 && alt) return;
		else {
			if (cy() > 1 && !lines[cy()-1]) set_prompt();
			else lines[cy()] = [null];
		}
	}
	let ret = null;
 	if (ispress) {
		num_ctrl_d = 0;
		if (buffer_scroll_num!==null){
			buffer_scroll_num = null;
			x = hold_x;
			y = hold_y;
			render();
		}
		if (cur_scroll_command) insert_cur_scroll();
		if (code == 0) return;
		else if (code == 1 || code == 2) code = 32;
		else if (code == 8226 || code == 9633) code = "+".charCodeAt();
		else if (code == 8211) code = "-".charCodeAt();
		else if (code == 3) {}
		else if (code < 32) code = 127;
		ret = handle_letter_press(String.fromCharCode(code)); 
	}
	else {
		if (sym == "d_C") return do_ctrl_D();
		num_ctrl_d = 0;
		if (buffer_scroll_num!==null){
			buffer_scroll_num = null;
			x = hold_x;
			y = hold_y;
			render();
		}
		if (code >= 37 && code <= 40) handle_arrow(code, mod, sym);
		else if (sym=="HOME_"||sym=="END_") handle_page(sym);
		else if (code == KC['DEL']) handle_delete(mod);
		else if (sym=="TAB_") handle_tab();
		else if (sym=="BACK_")  handle_backspace();
		else if (sym=="ENTER_") handle_enter();
		else if (sym == "c_C") do_ctrl_C();
		else if (sym == "k_C") do_clear_line();
		else if (sym == "y_C") {
			for (let i=0; i < current_cut_str.length; i++) handle_letter_press(current_cut_str[i]);
		}
		else if (sym == "c_CAS") clear();
		else if (sym=="a_C") {//«
			e.preventDefault();
			if (cur_scroll_command) insert_cur_scroll();
			x=prompt_len;
			y=cur_prompt_line - scroll_num;
			if (y<0) {
				scroll_num+=y;
				y=0;
			}
			render();
		}//»
		else if (sym=="e_C") {//«
			if (cur_scroll_command) insert_cur_scroll();
			y=lines.length-scroll_num-1;
			if (y>=h){
				scroll_num+=y-h+1
				y=h-1;
			}
			if (lines[cy()].length == 1 && !lines[cy()][0]) x = 0;
			else x=lines[cy()].length;
			render();
		}//»
		else if (sym=="l_A") log(line_colors);
	}
	return ret;
};
//»
const handle=(sym, e, ispress, code, mod)=>{//«
	let marr;
	if (terminal_locked) return;
	if (is_scrolling){
		if (!ispress) {
			if (sym.match(/^[A-Z]+_$/)){
				if (sym==="SPACE_") return;
			}
			else return;
		}
		scroll_num = scrollnum_hold;
		is_scrolling = false;
		render();
		return;
	}
	if (e && sym=="d_C") e.preventDefault();
	if (!ispress) {//«
		if (sym == "=_C") {
			e.preventDefault();
			set_new_fs(gr_fs+1);
			return;
		}
		else if (sym == "-_C") {
			e.preventDefault();
			if (gr_fs-1 <= min_fs) return;
			set_new_fs(gr_fs-1);
			return;
		}
		else if (sym=="0_C") {
			gr_fs = def_fs;
			set_new_fs(gr_fs);
			return;
		}
		else if (sym=="c_CS") return do_clipboard_copy();
		else if (sym=="v_CS") return do_clipboard_paste();
		else if (sym=="a_CA") return do_copy_buffer();
		else if (sym=="p_CA"){
			PARAGRAPH_SELECT_MODE = !PARAGRAPH_SELECT_MODE;
			do_overlay(`Paragraph select: ${PARAGRAPH_SELECT_MODE}`);
			return;
		}
	}//»
	if (code == KC['TAB'] && e) e.preventDefault();
	else await_next_tab = null;
	if (e&&sym=="o_C") e.preventDefault();

	if (pager) {//«
		pager.key_handler(sym, e, ispress, code);
		return 
	}//»
	else if (editor) return editor.key_handler(sym, e, ispress, code);

	if (ispress){}
	else if (!sym) return;

	handle_priv(sym, code, mod, ispress, e);
};
//»

//»
//Init«

const init = async(appargs={})=>{

	ENV['USER'] = globals.CURRENT_USER;
	this.cur_dir = get_homedir();
	let gotfs = localStorage.Terminal_fs;
	if (gotfs) {
		let val = strnum(gotfs);
		if (isnum(val,true)) gr_fs = val;
		else {
			gr_fs = def_fs;
			delete localStorage.Terminal_fs;
		}
	}
	else gr_fs = def_fs;
	wrapdiv._fs = gr_fs;
	resize();

	let gotbuf = appargs.reInit && appargs.reInit.termBuffer;
	if (gotbuf) buffer = gotbuf;
	else {
		let arr = await get_history();
		if (!arr) buffer = [];
		else {
			buffer = capi.uniq(arr);
		}
	}

let version = isMobile?"mobile":"desktop";	
const init_prompt = `LOTW ${version} shell\x20(${winid.replace("_","#")})`;
	respsucclines(init_prompt.split("\n"));
	did_init = true;
	sleeping = false;
	shell = new Shell(this);
	set_prompt();
	render();

};
//»
//Obj/CB«


this.onappinit = init;
this.onescape=()=>{//«
textarea&&textarea.focus();
	if (check_scrolling()) return true;
	let dorender=false;
	if (buffer_scroll_num !== null) {
		buffer_scroll_num = null;
		x = hold_x;
		y = hold_y;
		dorender = true;
	}
	if (dorender) return true;
	return false;
}
//»
this.onsave=()=>{//«
	if (editor) editor.save();
}//»
this.onkill = (if_dev_reload)=>{//«

	if (!if_dev_reload){
		let uniq = capi.uniq(buffer);
		save_history(uniq.join("\n")+"\n");
		return;
	}

	this.reInit={
		termBuffer: buffer
	};

	let s="";
	if (DEL_MODS.length) s+=`Deleting mods: ${DEL_MODS.join(",")}`;
	if (!s) return;
	cwarn(`${s}`);
	delete_mods();

}//»
this.onfocus=()=>{//«
	topwin_focused=true;
	if (cur_scroll_command) insert_cur_scroll();
	render();
	textarea&&textarea.focus();
}//»
this.toggle_paste=()=>{//«
	if (textarea){
		textarea._del();
		textarea = null;	
		return "off";
	}
	textarea = make('textarea');
	textarea._noinput = true;
	textarea.width = 1;
	textarea.height = 1;
	textarea.style.opacity = 0;
	textarea.onpaste = onpaste;
	areadiv.appendChild(textarea);
	textarea.focus();
	return "on";
};//»
this.onblur=()=>{//«
	topwin_focused=false;
	render();
	if (cur_scroll_command) insert_cur_scroll();
	textarea && textarea.blur();
}//»
this.onresize = resize;
this.onkeydown=(e,sym,mod)=>{handle(sym,e,false,e.keyCode,mod);};
this.onkeypress=(e)=>{handle(e.key,e,true,e.charCode,"");};
this.onkeyup = (e,sym)=>{
	if (editor && editor.key_up_handler) editor.key_up_handler(sym,e);
};
this.overrides = {//«
	"UP_C": 1,
	"DOWN_C": 1,
	"LEFT_C": 1,
	"RIGHT_C": 1,
	"UP_CA": 1,
	"DOWN_CA": 1,
	"LEFT_CA": 1,
	"RIGHT_CA": 1,
	"h_CAS": 1,
	"d_CAS": 1,
	"c_CAS": 1,
	"o_CAS": 1,
	"l_C": 1,
	"k_C": 1,
	"l_A":1,
//	"c_A":1
};//»

//Terminal-specific methods

//Editor/Pager specific«

this.clipboard_copy=(s)=>{do_clipboard_copy(null,s);};
this.modequit=()=>{//«
	let actor = editor||pager;
	scroll_num = scrollnum_hold;
	lines = lines_hold;
	line_colors = line_colors_hold;
	y = yhold;
	x = xhold;
	num_stat_lines = 0;
	delete this.is_editing;
	if (app_cb) app_cb();
	editor=pager=null;
	app_cb=null;

	if (actor&&actor.cb) actor.cb();
};
//»
this.hold_lines = ()=>{
	lines_hold = lines;
	line_colors_hold = line_colors;
};
this.set_lines = (linesarg, colorsarg)=>{
	lines = linesarg;
	line_colors = colorsarg;
};
this.init_edit_mode=(ed, nstatlns)=>{
	yhold=y;
	xhold=x;
	scrollnum_hold = scroll_num;
	scroll_num=x=y=0;
	editor = ed;
	num_stat_lines=nstatlns;
};
this.init_pager_mode=(pg, nstatlns)=>{
	yhold=y;
	xhold=x;
	scrollnum_hold = scroll_num;
	scroll_num=x=y=0;
	pager = pg;
	num_stat_lines=nstatlns;
};
this.stat_render=(arr)=>{
	if (arr.length > num_stat_lines){
cerr(`the arr argument has length ${arr.length} (expected <= ${num_stat_lines})`);
		return;
	}
	stat_lines = arr;
	render();
};
this.compare_last_line=(str)=>{
log(lines);
cwarn("compare", str);

};
//»
this.wrap_line = wrap_line;
this.dopaste=dopaste;
this.refresh = render;
this.fmt = fmt;
this.fmt_ls = fmt_ls;
this.fmt2 = fmt2;
this.clear=clear;
this.get_dir_contents=get_dir_contents;
this.get_homedir = get_homedir;
this.set_tab_size = (s)=>{//«
	if (!s.match(/[0-9]+/)) return;
	let n = parseInt(s);
	if (n==0||n>MAX_TAB_SIZE) return;
	tabdiv.style.tabSize = n;
	this.tabsize = tabdiv.style.tabSize;
	return true;
};//»
this.try_kill=()=>{//«
	if (editor) {
		editor.set_stat_message("Really close the window? [y/N]");
		render();
		editor.set_ask_close_cb();
	}
}//»

/*«Unused
this.is_busy=()=>{return !!cur_shell;}
»*/

//»

}; 

//»

