
/*Early OCTOBER 2023:«
Just switched this to the Origin Private File System format (instead of the old webkitRequestFileSystem way),
which uses navigator.storage.getDirectory(). 
Still need to implement command line append ">>", which would force us to do a writer.seek 
@YTGEOPIUNMH. Otherwise, we have seek working in append_slice @EOPKIMNHKJ.

The only other issue might be doing a truncate.

Now, want to work on more possibilities for the ways that data is stored inline, inside the indexedDB.

Per: https://developer.mozilla.org/en-US/docs/Web/API/FileSystemHandle

FileSystemFileHandle.remove's NOT SUPPORTED in Firefox (or Safari):
@DJUTYIO

FileSystemDirectoryHandle.remove's NOT SUPPORTED work in Firefox (or Safari):
@SLKIUNL

»*/
/*_TODO_: Tilde expansion, allowing for arbitrary relative paths in Link«
targets.
»*/

//Imports«

import { util, api as capi } from "./util.js";
import { globals } from "./config.js";

const{log,cwarn,cerr,strnum,isarr,isobj,isnum,isint,isstr}=util;
const{isEOF,isArr, getNameExt, getFullPath, normPath}=capi;

const sleep=()=>{return new Promise((Y,N)=>{});}

//»

//Var«

const DBNAME = "Filesystem";
const NODES_TABLE_NAME = "Nodes";
const DEF_BRANCH_NAME = "def";
const DEF_BRANCH_PATH = `0/${DEF_BRANCH_NAME}`;
const DEF_NODE_ID = 1;
const DBSIZE = 10*1024*1024;
const FIRST_BLOB_ID = 100;
const NULL_BLOB_FS_TYPE="n";
const DIRECTORY_FS_TYPE="d";
const LINK_FS_TYPE="l";
const FILE_FS_TYPE="f";

//»

const DB = function(){//«

let db;

const init_db=()=>{//«
	return new Promise((Y,N)=>{
		let req = indexedDB.open(DBNAME, 1);
		req.onerror=e=>{
cerr(e);
			Y();
		};
		req.onsuccess=e=>{
			db = e.target.result;
			Y(true);
		};
		req.onblocked=e=>{
cerr(e);
			Y();
		};
		req.onupgradeneeded=(e)=>{
//			let store = e.target.result.createObjectStore(NODES_TABLE_NAME, {keyPath: "nodeId"});
			let store = e.target.result.createObjectStore(NODES_TABLE_NAME, {autoIncrement: true});
			store.createIndex("parId", "parId", {unique: false});
			store.createIndex("value", "value", {unique: false});
			store.createIndex("path", "path", {unique: true});
//			store.add({nodeId: next_id, parentId: 0, fullPath: `0/${DEF_ROOT_NAME}`, content: `d${next_id}`});
			store.add({parId: 0, path: DEF_BRANCH_PATH, type: DIRECTORY_FS_TYPE});
		}
	});
};//»
const get_store=if_write=>{//«
	return db.transaction([NODES_TABLE_NAME],if_write?"readwrite":"readonly").objectStore(NODES_TABLE_NAME);
};//»
const get_by_path=(path, if_key_only)=>{//«
	return new Promise((Y,N)=>{
		let ind = get_store().index("path");
		let req;
		if (if_key_only) req = ind.getKey(path);
		else req = ind.get(path);
		req.onerror=(e)=>{
			cerr(e);
			Y();
		};
		req.onsuccess = e => {
			Y(e.target.result);
		};
	});
};//»
const get_by_id=(id)=>{//«
	return new Promise((Y,N)=>{
		let req = get_store().get(id);
		req.onerror=(e)=>{
			cerr(e);
			Y();
		};
		req.onsuccess = e => {
			Y(e.target.result);
		};
	});
};//»
const put_by_id=(id, node)=>{//«
	return new Promise((Y,N)=>{
		let req = get_store(true).put(node, id);
		req.onerror=(e)=>{
cerr(e);
			Y();
		};
		req.onsuccess = e => {
//			Y(e.target.result);
			Y(true);
		};
	});
};//»
const del_by_id=(id)=>{//«
	return new Promise((Y,N)=>{
		let req = get_store(true).delete(id);
		req.onerror=(e)=>{
cerr(e);
			Y();
		};
		req.onsuccess = e => {
			Y(true);
		};
	});
};//»
const get_dir_kids=(dirid)=>{//«
return new Promise((Y,N)=>{

	const doit=()=>{//«
		if (nodes==false||ids==false) return Y();
		if (nodes.length !== ids.length){
cerr(`nodes.length(${nodes.length}) !== ids.length(${ids.length})`);
log("NODES",nodes);
log("IDS",ids);
			return Y();
		}
		let out = [];
		for (let i=0; i < ids.length; i++){
			let n = nodes[i];
			let arr = n.path.split("/");
			out.push({id: ids[i], name: arr[1], parId: n.parId, type: n.type, value: n.value || n.type});
		}
		Y(out);
	};//»

	let ind = db.transaction([NODES_TABLE_NAME],"readonly").objectStore(NODES_TABLE_NAME).index("parId");
	let nodes, ids;
	let req1 = ind.getAll(dirid);
	req1.onerror=e=>{
cerr(e);
		nodes = false;
		if (ids || ids===false) doit();
	};
	req1.onsuccess=e=>{
		nodes = e.target.result;
		if (ids || ids===false) doit();
	};

	let req2 = ind.getAllKeys(dirid);
	req2.onerror=e=>{
cerr(e);
		ids = false;
		if (nodes || nodes===false) doit();
	};
	req2.onsuccess=e=>{
		ids = e.target.result;
		if (nodes || nodes===false) doit();
	};

});
};//»
const add_node=node=>{//«
	return new Promise((Y,N)=>{
		let store= db.transaction([NODES_TABLE_NAME],"readwrite").objectStore(NODES_TABLE_NAME);
		let req=store.add(node);
		req.onerror=(e)=>{
cerr(e);
			Y();
		};
		req.onsuccess = e => {
			Y(true);
		};
	});
};//»

this.init=async(root, dbname, dbsize, branch_name)=>{//«
	if (db) return;
	if (!await init_db()) return;
	let rootid = await get_by_path(`0/${branch_name}`, true);
	if (!rootid) return;
	root.id = rootid;
	return true;
}//»
this.getNodeByNameAndParId=async (name, parid)=>{//«
//rv = await this.createTable("Nodes",
//["value INTEGER", "parent INTEGER", "name VARCHAR(255)"],{primaryKey: true});
//parId, path, type, value
let path = `${parid}/${name}`;
let node = await get_by_path(path);
if (!node) return {rows:[]};
let id = await get_by_path(path, true);
if (!id){
}
else{
//log(node);

let obj = {rows:[{id, value: node.type}]}
//log(obj);
return obj;
//return;
}
//log(id);
//log("HI GDHWKEF", node);
await sleep();

/*
if (!db) return;
return new Promise((Y,N)=>{
	db.transaction(tx=>{ 
	let typs="";
	   tx.executeSql(`SELECT * FROM Nodes WHERE NAME in (?) AND PARENT in (${parid})`,[name],(tx, rv)=>{
			Y(rv);
		},(tx, err)=>{
Y(err);
		});
	});
});
*/

}//»
this.createNode=async(name, type, parId, value)=>{//«

if (type===DIRECTORY_FS_TYPE||type===NULL_BLOB_FS_TYPE||type==LINK_FS_TYPE) {
	let path = `${parId}/${name}`;
	let node = {parId, path, type: type};
	if (value) node.value = value;
	let rv = await add_node(node);
	if (!rv){
	}
	else{
		rv = await get_by_path(path, true);
		if (rv) return rv;
	}
cerr("TEOINMTV");
}

else{
cwarn("createNode: ADD TYPE", type);
}
await sleep();

};//»
this.getAll=async dirid=>{//«
	let rv = await get_dir_kids(dirid);
	return {rows: rv||[]};
};//»
this.setNodeValue=async(nodeid, blobid)=>{//«
	let node = await get_by_id(nodeid);
	if (!node) return;
	node.type=FILE_FS_TYPE;
	node.value=blobid;
	if (!await put_by_id(nodeid, node)) return;
	return true;
};//»
this.moveNode=async(id, fromId, toId, newName)=>{//«
	let node = await get_by_id(id);
	let parr = node.path.split("/");
	if (fromId !== toId) {
		node.parId = toId;
	}
	let usename = newName || parr[1];
	node.path=`${toId}/${usename}`;
	if (!await put_by_id(id, node)) return;
	return true;
};//»

this.removeNode=async(id, parId)=>{//«

//let node = await get_by_id(id);
//node.parId = null;


if (!await del_by_id(id)) return;

return true;

};//»
this.dropDatabase = () => {//«
	return new Promise((Y,N)=>{
		db.close();
		const req = window.indexedDB.deleteDatabase(DBNAME);
		req.onerror = (event) => {
cerr("Error deleting database.");
			Y();
		};
		req.onblocked = (e)=>{
cwarn("BLOCKED");
			Y();
		};
		req.onsuccess = (event) => {
			Y(true);
		};
	});
};//»

}//»

//FS«

//new FS(){«
export const FS = function() {
//»

//Imports«

const {
	NS,
	FS_PREF,
	FS_TYPE,
	USERNAME,
	HOME_PATH,
	DESK_PATH,
	FOLDER_APP,
	TEXT_EXTENSIONS,
	ALL_EXTENSIONS_RE
} = globals;

const ispos = arg=>{return isnum(arg,true);}

//»
//Var«

let rootId;

const root={name:"/",appName:FOLDER_APP,kids:{},treeroot:true,type:"root",sys:true,path:"/",fullpath:"/",done:true};
root.kids['..'] = root;
root.kids['.'] = root;
root.root = root;
this.root = root;
globals.root = root;
const db = new DB();


let VERNUM=1;

let BLOB_DIR;
const MB = 1024*1024;
const MAX_LOCAL_FILE_SIZE = MB;

let FILE_SAVER_SLICE_SZ = 1 * MB;
let MAX_REMOTE_SIZE = 1 * MB;
let MAX_FILE_SIZE = 256*MB;

let Desk;
const OK_WRITE_TYPES=[FS_TYPE];
//const root_dirs = ["tmp", "usr", "home", "etc", "var"];
const root_dirs = ["tmp", "home", "var"];

const MAX_DAYS = 90;//Used to determine how to format the date string for file listings
const MAX_LINK_ITERS = 8;

const sleep = ()=>{return new Promise((Y,N)=>{});};
const NOOP=()=>{};
const FATAL=s=>{throw new Error(s);};

let move_icon_by_path = NOOP;

String.prototype.regpath = function(if_full) {//«
    let str = this;
    if (if_full) str = "/" + str;
    str = str.replace(/\/+/g, "/");
    if (str == "/") return "/";
    return str.replace(/\/$/, "");
}//»

//»

//Node«
const Node = function(arg){
const {isDir} = arg;
	const okget=()=>{//«
		if (this.type=="loc") return true;
		let bid = this.blobId;
		if (!bid || bid < FIRST_BLOB_ID) return;
		return true;
	};//»
//log(arg);
	const setname=val=>{//«

		this._name = val;
		if (isDir){
			this.baseName = val;
			return;
		}
		let arr = getNameExt(val);
		if (arr[1]) {
			this.ext = arr[1];
			this.baseName = arr[0];
		}
		else {
			this.ext="";
			this.baseName = val;
		}
	};//»
	for (let k of Object.keys(arg)){
		this[k] = arg[k];
		if (k=="name") setname(arg[k]);
		if (k=="kids"){
			this.kids["."]=this; 
			this.kids[".."]=this.par;
		}
	}
	if (arg.treeroot) return;
	this.getValue = async opts=>{//«
		if (!okget()) return;
		return getBlob(this, opts);
	};//»
	Object.defineProperty(this,"buffer",{get:()=>{if(!okget())return;return getBlob(this,{buffer:true});}});
	Object.defineProperty(this,"bytes",{get:()=>{if(!okget())return;return getBlob(this,{bytes:true});}});
	Object.defineProperty(this, "text", {
		get: () => {
			if (!okget()) return;
			return getBlob(this, {
				text: true
			});
		}
	});
	Object.defineProperty(this, "_file", {
		get: () => {
			if (!okget()) return;
			return getBlob(this, {
				getFileOnly: true
			});
		}
	});

	Object.defineProperty(this, "fullpath", {//«
		get:()=>{
			let str = this.name;
			if (!str) return null;
			let curobj = this;
			let i = 0;
			while (true) {
				if (curobj && curobj.par) str = `${curobj.par.name}/${str}`;
				else break;
				curobj = curobj.par;
				i++;
			}
			let arr = str.split("/");
			while (!arr[0] && arr.length) {
				arr.shift();
				i++;
			}
			str = arr.join("/");
			return ("/" + str).regpath();
		}
	});//»
	Object.defineProperty(this, "type", {get:()=>this.root._type});
	Object.defineProperty(this, "name", {//«
		set: setname,
		get: ()=>this._name
	});//»
	Object.defineProperty(this, "path", {//«
		get:()=>{
			if (this._path) return this._path;
			return this.par.fullpath;
		}
	});//»
/*
	Object.defineProperty(this, "fullName", {//«
		get:()=>{
			if (this.ext) return `${this.baseName}.${this.ext}`;
			return this.baseName;
		}
	});//»
*/
}//»
//Filesystem ops«

const pathToNode = (path, if_link, if_retall) => {//«
	return new Promise((Y, N) => {
		__path_to_node(path, (ret,lastdir,usepath) => {
			if (ret) {
				if (if_retall) return Y([ret,lastdir,usepath]);
				return Y(ret);
			}
			if (if_retall) return Y([false,lastdir,usepath]);
			Y(false);
		}, if_link);
	})
};
String.prototype.toNode=function(if_link){
	if (!this.match(/^\x2f/)) return false;
	return pathToNode(this, if_link);
}
//»
const try_get_kid=(nm, curpar)=>{//«
	return new Promise(async(Y,N)=>{
		let rv = await db.getNodeByNameAndParId(nm, curpar.id);
		if (!check_db_rv(rv)) return Y();
		let gotrow = rv.rows[0];
		if (!gotrow) return Y();
		let kid = mk_dir_kid(curpar, nm,{
			isDir: gotrow.value==DIRECTORY_FS_TYPE,
			isLink: gotrow.value==LINK_FS_TYPE,
			path: curpar.fullpath
		});
		kid.blobId = gotrow.value;
		kid.id = gotrow.id;
		if (!kid.root) kid.root = curpar.root;
		Y(kid);
	});
};//»
const _path_to_node = (patharg, if_get_link, iter) =>{//«
	if (!iter) iter=0;
	const stop=()=>{return new Promise(()=>{});}
	return new Promise(async(Y,N)=>{//«
		
		const done=async()=>{//«

/*Return here if://«
1) There is not a node (this operation failed)
2) The node is NOT a link
3) We have a link, and want the link node iteself
»*/
			if (!node||node.appName!=="Link"||if_get_link) return Y([node, curpar, path]);
			if (iter > MAX_LINK_ITERS) return Y([null, curpar, path]);

//			Y(await _path_to_node(node.link, if_get_link, ++iter));

			if (node.type==FS_TYPE){
				if (!node.link){
cerr(`NO node.link WITH node.appName=="Link"!?!?, (VERIFY IT HERE: ${node.appName})`);
					Y();
					return;
				}
				Y(await _path_to_node(node.link, if_get_link, ++iter));
				return;
			}
//I don't understand what this is about
//How can it be a link, but not be type==FS_TYPE?
cwarn("HOW IS THIS POSSIBLE??? PLEBYTLNM");
			let rv = await get_data_from_fs_file(node.file,"text");
			Y(await _path_to_node(rv, if_get_link, ++iter));

		};//»
		let node;
		let path = normPath(patharg);
		if (path==="/") return Y([root,null,path]);
//		path = path.replace(`.${LINK_EXT}`,"");
		let parts = path.split("/");
		parts.shift();
		let topname = parts.shift();
		let curpar = root.kids[topname];
		if (!curpar) return Y([null, root, path]);
		if (!parts.length) return Y([curpar, root, path]);

		let curkids = curpar.kids;
		let curpath = curpar.fullpath;
		let fname = parts.pop();

		while(parts.length){//«
			let nm = parts.shift();
			let gotkid = curkids[nm];
			if (gotkid) curpar = gotkid;
			else {//«
				if (!curpar.done) {
					let rtype = curpar.type;
					if (rtype==FS_TYPE){
						let kid = await try_get_kid(nm, curpar);
						if (!kid) return done();
						curkids[nm] = kid;
					}
					else await popDir(curpar);
					gotkid = curkids[nm];
					if (!gotkid) return Y([null, curpar, path]);
					curpar = gotkid;
				}
				let newpar = curkids[nm];
				if (!(newpar&&newpar.appName===FOLDER_APP)) return Y([null, curpar, path]);
				curpar = newpar;
			}//»
			if (curpar.appName==="Link"){
				if (iter > MAX_LINK_ITERS) return Y([null, curpar, path]);
				if (curpar.type==FS_TYPE){
					let gotdir = curpar.ref;
					if (!(gotdir&&gotdir.appName===FOLDER_APP)) return Y([null, curpar, curpath]);
					curpar = gotdir;
				}
				else {
//I don't understand what this is about
//How can it be a link, but not be type==FS_TYPE?
cwarn("HOW IS THIS POSSIBLE??? HFBEHDKL");
					let rv = await get_data_from_fs_file(curpar.file,"text");
					let [gotdir, lastdir, gotpath] = await _path_to_node(rv, if_get_link, ++iter);
					if (!(gotdir&&gotdir.appName===FOLDER_APP)) return Y([null, curpar, gotpath]);
					curpar = gotdir;
				}
			}
			curpath = curpar.fullpath;
			curkids = curpar.kids;
		}//»

		if (!curkids&&!if_get_link&&curpar.ref&&curpar.ref.kids){
			curpar = curpar.ref;
			curpath = curpar.fullpath;
			curkids = curpar.kids;
		}
		if (!curkids) return done();
		node = curkids[`${fname}`];
		if (node||curpar.done) {
			if (node && !node.root) node.root = curpar.root;
			return done();
		}
		if (curpar.type!==FS_TYPE){//«
			await popDir(curpar);
			let gotnode = curkids[fname];
			if (!gotnode) return Y([null, curpar, path]);
			node = gotnode;
			if (!node.root) node.root = curpar.root;
			done();
			return;
		}//»
		let kid = await try_get_kid(fname, curpar);
		if (!kid) return done();
		node = kid;
		curkids[fname] = kid;
		done();

	});//»
};//»
const __path_to_node = async(str, allcb, if_get_link) => {//«
	let [node, lastdir, usepath] = await _path_to_node(str, if_get_link, 0);
	allcb(node, lastdir, usepath);
}//»

const doFsRm=(args, errcb, opts={})=>{//«
	return new Promise((Y,N)=>{
		do_fs_rm(args, errcb, Y, opts);
	});
};//»
const rmFile=(fobj, is_root)=>{//«
return new Promise(async(Y,N)=>{
	if (fobj.sys) return Y([null, "Not removing toplevel"]);
	const bad=(mess)=>{
		cerr(mess);
		Y([]);
	};
	let id = fobj.id;
	let parid = fobj.par.id;
if (!(id&&parid)) {
bad(`NO ID && PARID???`);
log(fobj);
log(fobj.par);
return;
}
	db.init();
	if (!await db.removeNode(id, parid)) return bad("FRYNBSJ");
	let blobId = fobj.blobId;
	if (blobId) {
		if (!BLOB_DIR) BLOB_DIR = await get_blob_dir();
		if (!BLOB_DIR) return Y();
		await BLOB_DIR.removeEntry(blobId);
	}

	return Y([true]);

});
};//»
const clearStorage =()=>{//«
	return new Promise(async(Y,N)=>{
		let opfs = await navigator.storage.getDirectory();
		await opfs.removeEntry("blobs", { recursive: true });
		let rv = await db.dropDatabase();
		localStorage.clear();
		Y(true);
	});
};//»
const check_ok_rm = (path, errcb, is_root, do_full_dirs)=>{//«
return new Promise(async(Y,N)=>{

		let obj = await pathToNode(path, true);
		if (!obj){
			errcb(`could not stat: ${path}`);
			Y();
			return;
		}
		let rtype = null;
		rtype = obj.type;
		if (obj.treeroot === true) {
			errcb("ignoring the request to remove root");
			Y();
			return;
		}
		if (obj.appName !== FOLDER_APP) {//«
			if (rtype!==FS_TYPE){
//if (rtype==FS_TYPE){
//Y(obj);
//return;
//}
				errcb(`${path}: not (currently) handling fs type: '${rtype}'`);
				Y();
				return;
			}

			if (!check_fs_dir_perm(obj.par, is_root)) errcb(`${path}: permission denied`);
			else if (obj.write_locked) errcb(`${path} is "write locked"`);
			else return Y(obj);
			Y();
			return;
		}//»
		if (rtype != FS_TYPE) {
			errcb(`not removing directory type: '${rtype}': ${path}`);
			Y();
			return;
		}
		if (Desk && (path == globals.desk_path)) {
			errcb(`not removing the working desktop path: ${path}`);
			Y();
			return;
		} 
		if (obj.par.treeroot) {
			errcb(`not removing toplevel directory: ${path}`);
			Y();
			return;
		} 
		if (obj.moveLocks.length){
			errcb(`${path}: is "move locked"`);
			Y();
			return;
		}
		if (!obj.done) obj.kids = await popDirByPath(obj.fullpath);
		let numkids = get_keys(obj.kids).length;
		if (!do_full_dirs && numkids > 2) {
			errcb(`${path}: not an empty folder`);
			Y();
			return;
		}
		if (!check_fs_dir_perm(obj, is_root)) {
			errcb(`${path}: permission denied`);
			Y();
			return;
		}
		Y(obj);
});
};//»
const delete_fobj = (node, is_root)=>{//«
return new Promise(async(Y,N)=>{
	const OK_TYPES=[FS_TYPE];
	if (!OK_TYPES.includes(node.type)) {
cerr("delete_fobjs:DELETE type:" + node.type + "!?!?!?!?!?");
		return Y();
	}
	let path = node.fullpath;
	let [delret, errmess] = await rmFile(node, is_root);
	if (!delret){
cerr(`Could not remove: ${node.fullpath} (${errmess})`);
		return Y();
	}
	delete node.par.kids[node.name];
	if (Desk) Desk.cleanup_deleted_wins_and_icons(path);
	Y(true);
});
};//»
const do_fs_rm = async(args, errcb, cb, opts={}) => {//«


	let cwd = opts.CWD;
	let is_root = opts.ROOT;
	let do_full_dirs = opts.FULLDIRS;
	let arr = [];
	let no_error = true;
	for (let path of args){
		let rv = await check_ok_rm(
			normPath(path, cwd), 
			errcb, 
			is_root, 
			do_full_dirs
		);
		if (!rv) {
			no_error = false;
			continue;
		}
		arr.push(rv);
	}
	for (let obj of arr) {
		if (!await delete_fobj(obj, is_root)) no_error = false;
	}
	cb(no_error);

}
//»

const comMv=(paths, opts={})=>{//«
	return new Promise((Y,N)=>{
		let shell_exports = opts.exports || {};
//		let cbok=
//		let cberr=()=>{Y();}
		shell_exports.cbok=()=>{Y(true);};
		shell_exports.cberr=()=>{Y();};
//		let {wout, werr, if_cp} = opts;
		com_mv(paths,{if_cp: opts.if_cp, shell_exports} );
	});
};//»
const com_mv = async(args, opts={}) => {//«
//const com_mv = async(shell_exports, args, if_cp, dom_objects, recur_opts) => {

let{
	shell_exports, if_cp, dom_objects, recur_opts
}=opts;

const no_move_all=()=>{//«
	if (no_move_cb){
		for (let arg of args){
			let path = getFullPath(arg, cur_dir);
			no_move_cb(icon_obj[path]);
		}
	}
}//»

//Init«

let errarr = [];
let mvarr = [];
let verb = "move";
let com = "mv";
if (if_cp) {
	verb = "copy";
	com = "cp";
}

//Imports from the calling environment (either the shell or desktop)«

let {
	wclerr,
	werr,
	wout,
	cbok,
	cberr,
	serr,
	cur_dir,
	failopts,
	is_root,
	get_var_str,
	termobj,
	kill_register,
	pathToNode,
	no_move_cb
} = shell_exports;

if (!wclerr) wclerr=NOOP;
if (!werr) werr=s=>{
log("ERR",s);
};
if (!wout) wout=s=>{
log("OUT",s);
};

if (!pathToNode) pathToNode = this.api.pathToNode;

if (recur_opts){
	cbok = recur_opts.cbok;
	cberr = recur_opts.cberr;
}

let icon_obj = {};
let towin = null;

if (dom_objects) {
	icon_obj = dom_objects.icons;
	towin = dom_objects.win;
}

//»

let killed = false;//«
if (kill_register){
	kill_register(cb=>{
		killed = true;
		cb&&cb();
	});
}
//»

let sws;
if(failopts) sws=failopts(args,{SHORT:{f:1}});
else sws = {};
if (!sws) return;
let gotfail = false;
let force = sws.f;
if (!args.length) return serr("missing file operand");
else if (args.length == 1) return serr(`missing destination file operand after ${args[0]}`);
if (args.length < 2) {
	serr("Too few args given");
	return;
}
let topatharg = getFullPath(args.pop(), cur_dir);
//»

let destret = await pathToNode(topatharg);
//Failure conditions...«

if (globals.read_only)return cberr("Read only");

if ((args.length > 1) && (!destret || (destret.appName != FOLDER_APP))) {
	cberr(`invalid destination path: ${topatharg}`);
	return;
}
else if (args.length===1){
//This allows a destination to be clobbered if the name is in the folder.
//Only if the file is explicitly named, does this error happen.
	if (!force && destret && destret.appName != FOLDER_APP) {
		cberr(`${topatharg}: the destination exists`);
		return;
	}
}
if (destret && destret.type == FS_TYPE) {
	if (!check_fs_dir_perm(destret, is_root)) {
		no_move_all();
		return cberr(`${topatharg}: permission denied`);
	}
}
//»

for (let arg of args){//«

	let path = getFullPath(arg, cur_dir);
	if (!path) {
		mvarr.push({ERR: `getFullPath: returned null for: ${arg}!!!`});
		continue;
	}

	let srcret = await pathToNode(path, true);
	if (!srcret) {
		if (no_move_cb) no_move_cb(icon_obj[path]);
		mvarr.push({ERR: `${com} : no such entry: ${path}`});
		continue;
	}
	let srctype = srcret.type;
	if (srcret.treeroot || (srcret.root == srcret && srcret.type!=="loc")) {
		if (no_move_cb) no_move_cb(icon_obj[path]);
		mvarr.push({ERR: `${com}: skipping top level directory: ${path}`});
	}
	else if (srctype == "loc" && !if_cp) {
		if (no_move_cb) no_move_cb(icon_obj[path]);
		mvarr.push({ERR: `${com}: ${path}: cannot move from the mounted directory`});
	}
	else if (!(srctype == FS_TYPE || srctype == "loc")) {
		if (no_move_cb) no_move_cb(icon_obj[path]);
		mvarr.push({ERR: `${com}: ${path}: cannot ${verb} from directory type: ${srctype}`});
	}
//No moving of files that are actively being edited
	else if (com==="mv"&&srcret.write_locked) {
		if (no_move_cb) no_move_cb(icon_obj[path]);
		mvarr.push({ERR: `${com}: ${path} is "write locked"`});
	}
//No moving of folders that contain files that are actively being edited
	else if (com==="mv"&&srcret.appName==FOLDER_APP&&srcret.moveLocks.length){
		if (no_move_cb) no_move_cb(icon_obj[path]);
		mvarr.push({ERR: `${com}: ${path} is "move locked"`});
	}
	else mvarr.push([path, srcret]);

}//»

//HYTEKLFHSN
if (destret && destret.appName == FOLDER_APP && destret.type === FS_TYPE){//«
//if (destret && destret.appName == FOLDER_APP && destret.type === "fs"){
	if (!destret.done) await popDir(destret);
	let kids = destret.kids;
	let okarr=[];
	for (let elm of mvarr){
		if (elm.ERR) {
			okarr.push(elm);
			continue;
		}
		let name = elm[1].name;
		let gotkid = kids[name];
		if (gotkid&&gotkid.appName==FOLDER_APP){
			okarr.push({ERR: `${destret.fullpath}: There is already a folder named '${name}'`});
		}
		else okarr.push(elm);
	}
	mvarr = okarr;
}//»

for (let arr of mvarr) {//«
	if (arr.ERR) {
		gotfail = true;
		werr(arr.ERR);
		continue;
	}
	let frompath = arr[0];
	let fromicon = icon_obj[frompath];
	let topath;
	let todir;
	let fent = arr[1];
	let type = fent.type;
	let app = fent.appName;
	let gotfrom, gotto;
	let savedirpath;
	let savename;
	if (killed) {
		werr("Killed!");
		break;
	}

	if (destret) {//«
		if (destret.appName == FOLDER_APP) {
			topath = topatharg.replace(/\/+$/, "") + "/" + fent.name;
			savedirpath = destret.fullpath;
			gotto = `${savedirpath}/${fent.name}`;
			savename = fent.name;
		} else {
			gotto = topath = topatharg;
			savedirpath = destret.par.fullpath;
			savename = destret.name;
		}
	}
	else {
		topath = topatharg;
		gotto = getFullPath(topath, cur_dir);
		let arr = gotto.split("/");
		savename = arr.pop();
		savedirpath = arr.join("/")
	}//»

	gotfrom = getFullPath(frompath, cur_dir);

	if (!(gotfrom && gotto)) {
		if (!gotfrom) {
			gotfail=true;
			werr(`could not resolve: ${frompath}`);
		}
		if (!gotto) {
			gotfail=true;
			werr(`could not resolve: ${topath}`);
		}
		continue;
	}

	let savedir = await pathToNode(savedirpath);
	if (!savedir) {
		werr(`${savedirpath}: no such directory`);
		continue;
	}
	let savetype = savedir.type;

	if (savetype !== FS_TYPE) {
		werr(`Not (yet) supporting ${verb} to type='${savetype}'`);
		continue;
	}

//"Manual recursion" needed for non HTML5FileSystem folders...

	if (!(type == FS_TYPE) && app === FOLDER_APP){//«
		let nm = savename;
		if (savedir.kids[nm]){
			gotfail=true;
			werr(`refusing to clobber: ${nm}`);
			continue;
		}
		if (dom_objects){
			gotfail=true;
			werr(`${nm}: please copy from the terminal`);
			continue;
		}
		let newpath = `${savedir.fullpath}/${nm}`;
//		if (savetype==FS_TYPE){
//			werr(`Implement recursively copy remote folder '${nm}' to (${FS_TYPE}) '${savedir.fullpath}/'`);
//			continue;
//		}
//		if (!await touchDirProm(newpath)){
		if (!await mkDir(newpath, null, {root: is_root})){
			gotfail=true;
			werr(`${newpath}: there was a problem creating the folder`);
			continue;
		}
		if (Desk) Desk.make_icon_if_new(await pathToNode(newpath));
		werr(`Created: ${newpath}`);
		if (!fent.done) await popDir(fent);
		let arr = [];	
		let kids=fent.kids;
		for (let k in kids){
			if (k=="."||k=="..") continue;
			arr.push(kids[k].fullpath);
		}
		arr.push(newpath);
		let obj = {
			cbok: () => {
			},
			cberr: () => {
				gotfail = true;
			}
		};
//		await this.com_mv(shell_exports, arr, true, null, obj);
		await this.com_mv(arr, {shell_exports, if_cp: true, recur_opts: obj});
		continue;
	}//»

	if (type=="loc"){//«
		let tofullpath = `${savedir.fullpath}/${savename}`;
//		werr(`Getting: ${savename}`)
		if (!await saveFsByPath(tofullpath, await fent.buffer)) {
			werr(`${tofullpath}: There was a problem saving to the file`);
		}
	}//»
	else if (type==FS_TYPE){//«
		if (savetype !== FS_TYPE) {
			werr(`not (yet) ${com}'ing from type="${FS_TYPE}"`);
			continue;
		}
		if (verb=="move"){
			if (!await move_node(fent, savename, savedir)){
				werr(`Could not move from ${frompath} to ${topath}`);
				continue;
			}
		}
		else{
			if (!await copy_node(fent, savename, savedir)){
				werr(`Could not copy from ${frompath} to ${topath}`);
				continue;
			}
		}
		if (if_cp) {
			gotfrom = null;
			fent = null;
		}
		await move_icon_by_path(gotfrom, gotto, app, {
			node: fent,
			icon: fromicon,
			win: towin
		});
	}//»
else{//«
	gotfail=true;
	werr(`Unknown type: ${type}`);
	continue;

}//»

}//»

if (Desk && !dom_objects) Desk.update_folder_statuses();
if (gotfail) return cberr();
cbok();


}
this.com_mv = com_mv;
//»
const copy_node=(node, newName, toNode)=>{//«
	return new Promise(async(Y,N)=>{
		let newpath = `${toNode.fullpath}/${newName}`;
		if (capi.newPathIsBad(node.fullpath, newpath)) return Y();
		let bytes = await getBlob(node, {binary: true});
		Y(await saveFsByPath(newpath, bytes));
	});
};//»
const move_node = (node, newName, toNode)=>{//«
return new Promise(async(Y,N)=>{
const bad=mess=>{
cerr(mess);
Y();
};
	if (capi.newPathIsBad(node.fullpath, `${toNode.fullpath}/${newName}`)) return Y();
	let id = node.id;
	let par = node.par;
	let parid = par.id;
	let saveid = toNode.id;
	db.init();
	let savename;
	if (newName && (newName !== node.name)){
		savename = newName;
	}
	if (!await db.moveNode(id, parid, saveid, savename)) return bad("WHYFBSJ");
	delete par.kids[node.name];
	node.name = newName;
	toNode.kids[newName] = node;
	node.par = toNode;
	Y(true);

});
};//»

const getBlob=(node, opts={})=>{//«
return new Promise(async(Y,N)=>{
	const bad=(mess)=>{
		cerr(mess);
		Y();
	}
	let istext = opts.text;
	let id = node.id;
	let file;
	if (node.type==="loc"){
		let arr = node.fullpath.split("/");
		arr.shift();
		arr.shift();
		let url = `/${arr.join("/")}`;
		if (Number.isFinite(opts.from) && Number.isFinite(opts.to)){
			url+=`?start=${opts.from}&end=${opts.to}`;
		}
		let rv = await fetch(url);
		if (!rv.ok){
			return Y();
		}
		file = await rv.blob();
	}
	else {
		let bid = node.blobId;
if (!bid){
cerr("No node.blobId!?!?!?", bid);
}
		if (!bid||(bid===NULL_BLOB_FS_TYPE && !opts.getFileOnly)) {
			if (!istext) return Y(new Uint8Array());
			return Y("");
		}
		if (bid===NULL_BLOB_FS_TYPE) {
			return Y("NULL");
		}
		let ent = await get_blob_entry(`${bid}`);
		if (!ent) return Y();
		file = await ent.getFile();
		if (opts.getFileOnly) return Y(file);
	}
	if (!file) return Y();
	let fmt;
	if (opts.buffer) fmt="arraybuffer";
	else if (istext) fmt = "text";
	else if (opts.blob) fmt="blob";
	else fmt = "bytes";
	let start=0;
	if (opts.start) start = parseInt(opts.start);
	let end;
	if (opts.end) end = parseInt(opts.end);
	Y(await get_data_from_fs_file(file, fmt, start, end));
});
};//»
const _read_file = async(fname, cb, opts = {}) => {//«
	let _;
	if (!opts) opts = {};
	const noop = () => {
		return "";
	};
	const exports = opts.exports || {};
	_ = exports;
	const is_root = _.is_root || opts.ROOT || opts.isRoot || opts.root || false;
	const get_var_str = _.get_var_str || noop;
	const tmp_env = _.tmp_env || {};
	const cur_dir = _.cur_dir || "/";
	const werr = _.werr || cerr;
	const EOF = opts.EOF || {
		EOF: true
	};
	if (!fname.match(/^\x2f/)) fname = (cur_dir + "/" + fname).regpath();
	let node = await pathToNode(fname);
	if (!(node&&node.fullpath)) return cb(null, null, `No such file:\x20${fname}`);
	if (node.appName == FOLDER_APP) return cb(null, null, `${fname}:\x20is a directory`);
	if (!get_var_str("DEV_DL_FNAME")) tmp_env.DEV_DL_FNAME = node.name;
	let path = node.fullpath;
	cb(null, path);
	let ext = path.split(".").pop();
	let is_blob = !TEXT_EXTENSIONS.includes(ext);
	let isbin = opts.binary||opts.BINARY;
	if (opts.text || opts.FORCETEXT || (get_var_str("FORCE_TEXT").match(/^t(rue)?$/i))) is_blob = false;
	let type = node.type;

	if (type==FS_TYPE){
		if (!check_fs_dir_perm(node.par, is_root, null, opts.user)) {
			return cb(null, null, `${fname}: permission denied`);
		}
//		let rv = await getBlob(node, {binary: isbin});
//log(node);
		let rv = await getBlob(node, opts);
		if (isstr(rv)) cb(rv.split("\n"));
		else if (rv) cb(rv);
		cb(EOF);
		return;
	}
	if (type == "local") {
		let fullpath = getFullPath(path);
		if (!fullpath) return cb();
		get_local_file(fullpath, async ret=>{
			if (isstr(ret)) {
				if (isbin) cb(new Uint8Array(await (new Blob([ret])).arrayBuffer()));
				else cb(ret.split("\n"));
			}
			else cb(ret);
			cb(EOF);
		}, {
			text: !is_blob
		});
		return;
	} 
	cb(EOF);
cwarn("read_file():Skipping type:" + type);
};
this._read_file=_read_file;
//»
const get_data_from_fs_file=(file,format,start,end)=>{//«
	return new Promise(async(Y,N)=>{
		const OK_FORMATS=["blob","bytes","text","binarystring","dataurl","arraybuffer"];
		const def_format="arraybuffer";
		if (!format) {
cwarn("Format not given, defaulting to 'arraybuffer'");
			format=def_format;
		}
		if (!OK_FORMATS.includes(format)) return N(`Unrecognized format: ${format}`);
		let reader = new FileReader();
		reader.onloadend = function(e) {
			let val = this.result;
			if (format==="blob") return Y(new Blob([val],{type: "blob"}));
			if (format==="bytes") return Y(new Uint8Array(val));
			return Y(val);
		};
		if (Number.isFinite(start)) {
			if (file.slice) {
				if (Number.isFinite(end)) {
					file = file.slice(start, end);
				}
				else file = file.slice(start);
			}
		}
		if (format==="text") reader.readAsText(file);
		else if (format=="binarystring") reader.readAsBinaryString(file);
		else if (format=="dataurl") reader.readAsDataURL(file);
		else reader.readAsArrayBuffer(file);
	});
};//»

const readFile = (path, opts = {}) => {//«
	return new Promise((Y, N) => {
		let buf = [];
		_read_file(path, (rv, pathret, err) => {
			if (err) {
				if (opts.reject) N(err);
				else Y(false);
				return;
			}
			if (!rv) return;
			if (isEOF(rv)) {
				if (buf.length === 1 && !isstr(buf[0])) Y(buf[0]);
				else Y(buf);
				return;
			}
			if (isArr(rv)) buf = buf.concat(rv);
			else buf.push(rv);
		}, opts);
	});
};//»
const _get_fs_file_from_fent = (fent, cb, if_blob, mimearg, start, end) => {//«
	fent.file(file => {

let getlen;
let sz = file.size;
if (Number.isFinite(start)){
	if (start < 0){
		cb(null, "A negative start value was given: "+start);
		return;
	}
	if (Number.isFinite(end)){
		if (end <= start){
			cb(null,`The end value (${end}) is <= start (${start})`);
			return;
		}
		sz = end - start;
	}
	else sz = file.size - start;
	
}
else if (Number.isFinite(end)){
cb(null, "No legal 'start' value was provided! (got a legal end value)");
log(file);
return;
}

		if (sz > MAX_FILE_SIZE) {
			let s = "The file's size is\x20>\x20MAX_FILE_SIZE=" + MAX_FILE_SIZE + ". Please use start and end options!";
			cwarn(s);
			cb(null,s);
			return;
		}
		let reader = new FileReader();
		reader.onloadend = function(e) {
			let val = this.result;
			if (if_blob) {
				if (mimearg) val = new Blob([val], {
					type: "blob"
				});
				else {
					cb(new Uint8Array(val), fent, true);
					return;
				}
			}
			cb(val, fent, true);
		};
//		if (pos_arr) file = file.slice(pos_arr[0], pos_arr[1]);
		if (Number.isFinite(start)) {
			if (file.slice) {
				if (Number.isFinite(end)) {
					file = file.slice(start, end);
				}
				else file = file.slice(start);
			}
		}
		if (if_blob) reader.readAsArrayBuffer(file);
		else reader.readAsText(file);
	}, () => {
		cb();
		cerr("FAIL:_get_fs_file_from_fent");
	});
}
//»
const get_blob_dir=async ()=>{//«
let opfs = await navigator.storage.getDirectory();
let blobDir = await opfs.getDirectoryHandle('blobs', {create: true});
return blobDir;
};//»
const get_blob_entry=(name, if_no_create)=>{//«
	return new Promise(async(Y,N)=>{
		if (!BLOB_DIR) BLOB_DIR = await get_blob_dir();
		let opts;
		if (if_no_create) opts={};
		else opts={create: true};
//		BLOB_DIR.getFile(name,opts,Y,()=>{Y()})
		let blob_ent = await BLOB_DIR.getFileHandle(name, opts);
		Y(blob_ent);
//log(blob_ent);
	});
};//»
//const get_fs_file_from_entry=async(ent)=>{//«
//	return await ent.getFile();
//	return new Promise((Y,N)=>{
//Y(ent.getFile());
//		ent.file(Y);
//	});
//};//»
const get_fs_file_from_fent = (fent, if_blob, mimearg, start, end) =>{//«
	return new Promise((Y,N)=>{
		_get_fs_file_from_fent(fent, Y, if_blob, mimearg, start, end)
	});
};//»

const writeFile = (path, val, opts = {}) => {//«
	return new Promise(async (Y, N) => {
		let err = (s) => {
			if (opts.reject) N(e);
			else Y(false);
		};
		let invalid = () => {
			err("Invalid path:\x20" + path);
		};
		let handle = which => {
			err("Implement handling root dir:\x20" + which);
		};
		if (!(path && path.match(/^\x2f/))) return invalid();
		let arr = path.split("/");
		arr.shift();
		let rootdir = arr.shift();
		if (!rootdir) return invalid();
		let exists = await pathToNode(path);
		if (root_dirs.includes(rootdir)){
			let node = await saveFsByPath(path, val, opts);
			if (!(exists || opts.noMakeIcon)) {
				move_icon_by_path(null, path, node.appName, {node});
			}
			Y(node);
		}
		else if (rootdir === "dev"){
			let name = arr.shift();
			if (name==="null"){}
			else if (name==="log") console.log(val);
			Y(true);
		}
		else {
cerr("Invalid or unsupported root dir:\x20" + rootdir);
			Y();
		}
	});
}//»
const saveFsByPath=(path, val, opts={})=>{//«
return new Promise(async(Y,N)=>{

if (globals.read_only)return Y();

let wasnull=false;
let blob;
let node = await pathToNode(path);
if (!node) {
	let patharr = path.split("/");
	let fname = patharr.pop();
	let parpath = patharr.join("/");
	let parobj = await pathToNode(parpath);
	if (!parobj) return Y([null, `${parpath}: Bad parent path`]);
	node = await touchFile(parobj, fname);
	let ext = capi.getNameExt(fname)[1];
	node.ext = ext;
	node.appName = capi.extToApp(ext);
//	add_lock_funcs(kid);

}

let nid = node.id;
let bid = node.blobId;
if (bid===NULL_BLOB_FS_TYPE){
	wasnull=true;
	let gotid = localStorage['nextBlobId'];
	if (gotid) gotid = parseInt(gotid);
	else gotid = FIRST_BLOB_ID;
	localStorage['nextBlobId'] = `${gotid+1}`;
	bid = gotid;
	node.blobId = bid;
}

let fent = await get_blob_entry(`${bid}`);
node.entry = fent;

if (wasnull) {//«
	if (!await db.setNodeValue(nid, bid)) {
cerr(`${path}(id=${nid}): Could not set the new node value (blobId=${bid})`);
		Y();
		return;
	}
}//»

if (opts.getEntry) {
	Y(node);
	return 
}

if (isstr(val)) blob = new Blob([val]);
else if (val instanceof Uint8Array) blob = new Blob([val.buffer]);
else if (val instanceof ArrayBuffer) blob = new Blob([val]);
else if (val instanceof Blob) blob = val;
else{
cerr(`${path}: Unknown type in saveFsByPath`);
log(val);
	Y();
	return;
}
let sz = await write_blob(fent, blob, opts);

node.size = sz;
if (opts.retArr) return Y([node, sz, sz]);
Y(node);


});
}//»
const touchFile = (parobj, name, opts={})=>{//«
return new Promise(async(Y,N)=>{
	const bad=(mess)=>{
cerr(mess);
		Y();
	};
	if (globals.read_only)return Y();

	if (!parobj.done) await popDir(parobj);
	let kids = parobj.kids;
	if (kids[name]) {
cwarn("GOTERMPT");
		return Y(kids[name]);
	}
	let parid = parobj.id;
	let rv;
	db.init();
	let id = await db.createNode(name, NULL_BLOB_FS_TYPE, parid);
	if (!id) return bad("ADBNYURL");

	let kid = mk_dir_kid(parobj, name);
//	kid.path = parobj.fullpath;
//	kid.appName = capi.extToApp(name);
//	kid.size = 0;

	kid.blobId = NULL_BLOB_FS_TYPE;
	kid.id = id;
	kids[name] = kid;
	Y(kid);
});

};//»
const write_blob = (fent, blob, opts={}) => {//«
return new Promise(async(Y,N)=>{
	if (globals.read_only)return Y();
	let{
		append,
		spliceStart,
		spliceEnd,
	} = opts;
	let realsize;
	if (Number.isFinite(spliceStart) && spliceEnd){
		let startblob = await get_fs_file_from_fent(fent, true, null, 0, spliceStart);
		let endblob = await get_fs_file_from_fent(fent, true, null, spliceEnd-1);
		realsize = blob.size;
		blob = new Blob([startblob, blob, endblob]);
	}
	else realsize = blob.size;
	let writer = await fent.createWritable();
//YTGEOPIUNMH
//	if (append) writer.seek(writer.length);
	await writer.write(blob);
	await writer.close();
	Y(blob.size);
/*«
	fent.createWriter(function(writer) {
		if (append) writer.seek(writer.length);
		let truncated = false;
		writer.onwriteend = async function(e) {//«
			let size = this.position;
			if (!truncated) {
				truncated = true;
				this.truncate(size);
				return;
			} 
			Y(this.position);
		};//»
		writer.onerror = function(e) {
cerr('WRITE ERR:' + fname + " " + val.length);
			Y();
		};
		writer.write(blob);
	}, ()=>{Y()});
»*/
});
}
//»

const mkDir=(parpatharg, name, opts={})=>{//«
//const MkTestDir=(parpatharg, name, is_root, if_no_make_icon)=>{
return new Promise(async(Y,N)=>{
	const bad=(mess)=>{
cerr(mess);
		Y();
	};
	if (globals.read_only)return Y();

let is_root = opts.root;
let if_no_make_icon = opts.noMakeIcon; 

let parpath;
if (isobj(parpatharg)) parpath = parpatharg.fullpath;
else parpath = parpatharg;

if (name===null){
	let arr = parpath.split("/");
	name = arr.pop();
	parpath = arr.join("/");
}

let fullpath = `${parpath}/${name}`.regpath();

let parobj = await pathToNode(parpath);
if (!parobj) return Y();
if (parobj.type!==FS_TYPE) return Y();
if (await pathToNode(fullpath)){
//HOW CAN PATHTONODE WORK, BUT NOT HAVE THE KID IN PAROBJ.KIDS?????
	let kid;
	if (!parobj.kids[name]){
cwarn(`WHY IS THERE NO PAROBJ.KIDS in mkDir AFTER SUCCESSFULLY GETTING PATHTONODE("${fullpath}") ???`);
		kid = await try_get_kid(name, parobj);
		if (!kid) {
cerr(`Got NO KID after try_get_kid in mkDir("${parpatharg}","${name}"), WITH ARGS BELOW`);
log("NAME", name);
log("PAROBJ",parobj);
			return Y();
		}
		parobj.kids[name] = kid;
	}
	Y(kid);
	return;
}

let parid = parobj.id;
if (!parid) return bad("GEJ76GF");

let id = await db.createNode(name, DIRECTORY_FS_TYPE, parid);
if (!id) return bad("DEYBGJTU");

/*«
await sleep();

rv = await db.insertRow("Nodes",["value","parent","name"],[DIRECTORY_FS_TYPE , parid, name]);
if (!check_db_rv(rv)) return bad("HG837JG");
let id = rv.insertId;
rv = await db.createTable(`d${id}`,[]);
if (!check_db_rv(rv)) return bad("HLK984FG");
rv = await db.insertRow(`d${parid}`,["id"],[id]);
if (!check_db_rv(rv)) return bad("JHYT65F");
»*/

let kid = mk_dir_kid(parobj, name, {isDir: true});
kid.id = id;
parobj.kids[name] = kid;

Y(kid);
if (Desk&&!if_no_make_icon) Desk.make_icon_if_new(kid);

});
};//»
const makeLink=(parobj, name, target)=>{//«
return new Promise(async(Y,N)=>{
	const bad=(mess)=>{
cerr(mess);
		Y();
	};

	if (globals.read_only)return Y();
	let parid = parobj.id;
	let rv;
	db.init();
	let id = await db.createNode(name, LINK_FS_TYPE, parid, target);
	if (!id) return bad("ENHYTDJ");
	let kid = mk_dir_kid(parobj, name, {
		isLink: true,
		size: target.length,
	});
	kid.link = target;
	kid.ref = await pathToNode(target);
	kid.id = id;
	parobj.kids[name]=kid;
	Y(kid);
	if (Desk) Desk.make_icon_if_new(kid);

});

};//»

const checkDirPerm=(path_or_obj,opts={})=>{//«
	return new Promise(async(Y,N)=>{
		let obj;
		if (isstr(path_or_obj)){
			obj = await pathToNode(path_or_obj);
			if (!obj) return Y(false);
		}
		else obj = path_or_obj;
		Y(check_fs_dir_perm(obj, opts.root, opts.sys, opts.user));
	});
};//»

//»
//Init/Populate/Mount Dirs«

const mountDir = async (name) => {//«
    let mntdir = root.kids.mnt;
    let mntkids = mntdir.kids
    if (!name) return "Mount name not given!";
    if (!name.match(/^[a-z][a-z0-9]*$/i)) return "Invalid mount name!";
	if (mntkids[name]) return `${name}: Already mounted`;
	let rv = await fetch(`/${name}/list.json`);
	if (!rv.ok){
		return `Could not get the listing for '${name}'`;
	}
	let list = await rv.json();
	const mount_dir=(name, list, par)=>{
		let kids = par.kids;
		for (let i=0; i < list.length; i++){
			let arr = list[i].split("/");
			let nm = arr[0];
			let sz = arr[1];
			if (sz){
				let node = mk_dir_kid(par, nm, {size: parseInt(sz)});
				kids[nm] = node;
			}
			else {
				let dir = mk_dir_kid(par, nm, {isDir: true});
				mount_dir(nm, list[i+1], dir);
				kids[nm] = dir;
				i++;
			}
		}
	}
	let mntroot = mk_dir_kid(mntdir, name, {isDir: true});
	mntroot.root = mntroot;
	mntroot._type = "loc";
	mntkids[name]=mntroot;
	mount_dir(name, list, mntroot);
	return true;
}//»

const init = async()=>{//«
	if (!await db.init(root, DBNAME, DBSIZE, DEF_BRANCH_NAME)) {
		console.error("Could not initialize the filesystem database");
	}

	rootId = root.id;
	mount_tree("mnt", "mount");
	await make_dev_tree();
	for (let name of root_dirs){
		let ret = await make_fs_tree(name);
		if (!ret) return;
		if (name == "tmp") ret.perm = true;
		else ret.perm = false;
		ret.kids['..'] = root;
		root.kids[name] = ret;
	}
	return true;
};//»
this.mk_user_dirs=()=>{//«
	return new Promise(async(y,n)=>{
		let home_path = `/home/${globals.CURRENT_USER}`;
		globals.home_path = home_path;
		globals.desk_path = `${home_path}/Desktop`.regpath();
		try{
			await mkDir(home_path, null, {root: true, noMakeIcon: true});
			await mkDir(globals.desk_path, null, {root: true, noMakeIcon: true});
			await popDirByPath('/home');
			await popDirByPath(home_path);
		} catch (e) {
console.error(e);
			y();
			return;
		}       
		y(true);
	});     
}           
//»

const mk_dir_kid = (par, name, opts={}) => {//«

	let is_dir = opts.isDir;
	let is_link = opts.isLink;
	let mod_time = opts.modTime;
	let path = opts.path;
	let fullpath = `${path}/${name}`;
	let file = opts.file;
	let ent = opts.entry;

	let kid;
	if (opts.useKid) kid = opts.useKid;
	else {
		kid = new Node({
			name: name,
			par: par,
			root: par.root,
			isDir: is_dir
//			path: path
		});
	}

	if (is_dir) {
		kid.appName = FOLDER_APP;
		if (par.par.treeroot == true) {
			if (par.name == "home") kid.perm = name;
			else if (par.name == "var" && name == "cache") kid.readonly = true;
		}
		let kidsobj = kid.kids || {'..': par};
		kidsobj['.'] = kid;
		kid.kids = kidsobj;
		kid.moveLocks=[];
		set_rm_move_lock(kid);
	}
	else if (is_link) kid.appName="Link";
	else {
		kid.ext = capi.getNameExt(name)[1];
		let app = capi.extToApp(name);
		kid.appName = app;
		add_lock_funcs(kid);
		kid.size = opts.size;
	}	
	
/*
	if (mod_time) {
		kid.MT = mod_time;
		kid.SZ = sz;
	}
*/
	kid.file = file;
	kid.entry = ent;
	return kid;
}
this.mk_dir_kid = mk_dir_kid;
//»

const popDir = (dirobj, opts = {}) => {//«
	return new Promise((y, n) => {
		populate_dirobj(dirobj, y, opts);
	});
};//»
const popDirByPath=(patharg, opts={})=>{//«
	return new Promise((Y,N)=>{
		let cb=(rv, e)=>{
			if (!rv){
				if (opts.reject) return N(e);
				Y();
				return;
			}
			Y(rv);
		};
		populate_dirobj_by_path(patharg, cb, opts);
	});
};//»
const mount_tree=(name, type, pararg)=>{//«
	let dir = new Node({
		name: name,
		_type: type,
		kids: {},
		appName: FOLDER_APP,
		isDir: true,
		sys: true,
//		fullpath: `/${name}`,
		par: pararg||root
	});
	if (!pararg) dir._path = "/";
	else dir._path = dir.par.fullpath;
if (pararg) pararg.kids[name]=dir;
else root.kids[name]=dir;
	dir.root=dir;
//	dir.kids['.']=dir;
	return dir;
}//»
const make_fs_tree = name => {//«
return new Promise(async(Y,N)=>{
	const new_root_tree = (name, type) => {//«
		return new Node({
			appName: FOLDER_APP,
			isDir: true,
			name: name,
			kids: {},
			_type: FS_TYPE,
			par: root
//			fullpath: `/${name}`
		});
//		return obj;
	};//»
	let dirstr = null;
	let tree = new_root_tree(name);
	let kids = tree.kids;
	tree.root = tree;
//	tree.par = root;
//	kids['.'] = tree;
	kids['..'] = root;
	root.kids[name] = tree;

	let rv = await db.getNodeByNameAndParId(name, rootId);
	if (!check_db_rv(rv)) return Y();
	let rows = rv.rows;
	if (rows.length){
		tree.id = rows[0].id;
		Y(tree);
		return;
	}
	rv = await db.createNode(name, DIRECTORY_FS_TYPE, rootId);
	if (!rv) return Y();
//	let nodeid = rv;
//	rv = await db.createTable(`d${nodeid}`,[]);
//	if (!check_db_rv(rv)) return Y();
	tree.id = rv;
	Y(tree);
});
};//»
const make_dev_tree = ()=>{//«
	return new Promise(async (Y,N)=>{
		let par = mount_tree("dev", "dev");
		let kids = par.kids;
		let arr = ["null", "log"];
		for (let name of arr){
			let kid = new Node({
				name: name,
				appName: "Device",
				par: par,
				root: par
			});
			kid.root = par;
			kids[name]=kid;
		}   
		par.done=true;
		par.longdone=true;
		Y();
	}); 
};//»

this.make_local_tree = (name, port) => {//«
	return new Promise(async(Y,N)=>{
		let rv;
		let err;
		try {
			rv = await fetch(capi.locUrl(port)+"/");
		}
		catch(e){
			err = e;
		}
		if (!(rv&&rv.ok&&await rv.text()==="HI")) {
			let mess = "Invalid response from server";
			if (err){
				if (err.message) mess = err.message;
				else mess = err;
			}
			return N(mess);
		}
		let tree = mount_tree(name, "local", root.kids.mnt);
		tree.port = port;
		tree.origin = capi.locUrl(port);
		Y(true);
	});
};//»

const populate_dirobj_by_path = async(patharg, cb, opts={}) => {//«
	let obj = await pathToNode(patharg);
	if (!obj) return cb(null, `${patharg}: not found`);
	if (obj.appName !== FOLDER_APP) return cb(null, `${patharg}: not a directory`);
	if (obj.done){
		if (opts.long && obj.longdone) return cb(obj.kids);
		else return cb(obj.kids);
	}
	populate_dirobj(obj, cb, opts);
};
//»
const populate_dirobj = (dirobj, cb = NOOP, opts = {}) => {//«
	let type = dirobj.type;
	let path = dirobj.fullpath;
	if (type == FS_TYPE) return populate_fs_dirobj(dirobj, cb, opts);
	if (type=="local") return populate_rem_dirobj(path, cb, dirobj, opts);
	cb(dirobj.kids);
}

//»
const populate_fs_dirobj = async(parobj, cb, opts={}) => {//«

let path = parobj.fullpath;
let kids = parobj.kids;
let rv;
db.init();
let dirid = parobj.id;
rv = await db.getAll(dirid);
if (!check_db_rv(rv)) {
cerr(`getAll failure for id: ${dirid}`);
	cb();
	return 
}
let rows = rv.rows;
for (let obj of rows){
	let {id, name, type, value} = obj;
	let islink = type == LINK_FS_TYPE;
	let kid = mk_dir_kid(parobj, name, {
		isDir: (type == DIRECTORY_FS_TYPE),
		isLink: islink,
	});
	kid.blobId = value;
	kid.id = id;
	if (islink){
		if (!value.match(/^\x2f/)){
			value = `${kid.path}/${value}`;
		}
		kid.link = value;
		kid.ref = await pathToNode(value);
	}
	kids[name] = kid;
	if (kid.appName==="Application") {
		let rv = await readFile(kid.fullpath,{text: true});
		if (rv && isarr(rv)) kid.appicon=rv.join("\n");
	}
}

parobj.done=true;
cb(kids);

}//»
const populate_rem_dirobj = async(patharg, cb, dirobj, opts = {}) => {//«
	let holdpath = patharg;
	let parts = patharg.split("/");
	parts.shift();
	parts.shift();
	let baseurl;
	if (patharg.match(/^\/www\/?/)){
		baseurl = "";
	}
	else if (patharg.match(/^\/mnt\/?/)) {
		parts.shift();
		baseurl = dirobj.root.origin;
	}
	else return cerr(`patharg must begin with '/mnt' or '/www' (got '${patharg}')`);

	let path = parts.join("/");
	if (!path) path="/";
	let rv;
	let url = `${baseurl}/_getdir?path=${path}`;
	try {
		rv = await fetch(url);
	}
	catch(e){
		cb(null, `could not fetch: ${url}`);
		return;
	}
	if (!rv.ok) return cb(null, `response not "ok": ${url}`);
	
	let ret;
	let text = await rv.text();
	try{
		ret = JSON.parse(text);
	}
	catch(e){
		cb(null, `JSON parse error in response from: ${url} (see console)`);
log(text);
		return;
	}
	let kids = dirobj.kids;
	let par = dirobj;
	dirobj.checked = true;
	dirobj.done = true;
	for (let k of ret) {
		if (k.match(/^total\x20+\d+/)) continue;
		let arr = k.split(" ");
		arr.shift(); /*permissions like drwxrwxrwx or-rw-rw-r--*/
		if (!arr[0]) arr.shift();
		arr.shift(); /*Some random number*/
		while (arr.length && !arr[0]) arr.shift();

		let sz_str = arr.shift();
		let sz = strnum(sz_str);
		let ctime;
		let mtime = arr.shift();
		let tm;
		if (mtime=="None"&&ctime) {
			mtime = ctime;
			tm = parseInt(mtime);
		}
		else tm  = parseInt(mtime);
		if (isNaN(tm)) {
cwarn(`populate_rem_dirobj(): skipping entry: ${k} (bad "mtime"=${mtime})`);
			continue;
		}
		let use_year_before_time = Date.now() / 1000 - (86400 * MAX_DAYS);
		let timearr = (new Date(tm * 1000) + "").split(" ");
		timearr.shift();
		timearr.pop();
		timearr.pop();
		let tmstr = timearr[0] + " " + timearr[1].replace(/^0/, " ") + " ";
		if (tm < use_year_before_time) tmstr += " " + timearr[2];
		else {
			let arr = timearr[3].split(":");
			arr.pop();
			tmstr += arr.join(":");
		}
		let fname = arr.join(" ");
		let isdir = false;
		if (fname.match(/\/$/)) {
			isdir = true;
			fname = fname.replace(/\/$/, "");
		}
		let kidobj = mk_dir_kid(dirobj, fname,{
			isDir: isdir,
			size: sz,
			modTime: tmstr,
//			path: holdpath
		});
		kidobj.modified = tm;
		kidobj.created = ctime;
		kids[fname] = kidobj;
	}
	cb(kids);
}
//»

//»
//External Blobs/Files«

const FileSaver=function(){//«

let cwd;
let fname;
let basename;
let fullpath;
let ext;
let file;
let fSize;
let fEnt; /*This is always what is being written to,and depends on the FileSystem API*/ 
let fObj;

let bytesWritten = 0;
let curpos = 0;
let update_cb, done_cb, error_cb;
let stream_started = false, stream_ended = false;
let saving_from_file = false;
let cancelled = false;
const cerr=str=>{if(error_cb)error_cb(str);else cerr(str);};
const get_new_fname = (cb, if_force) => {//«
	const check_fs_by_path = async(fullpath, cb) => {
		if (!fullpath.match(/^\x2f/)) {
cerr("NEED FULLPATH IN CHECK_FS_BY_PATH");
			cb();
			return;
		}
		if (await pathToNode(fullpath)) return cb(true);
		cb(false);
	}
	if (!basename) return cerr("basename is not set!");
	let iter = 0;
	const check_and_save = (namearg) => {
		if (iter > 10) return cerr("FileSaver:\x20Giving up after:\x20" + iter + " attempts");
		let patharg = (cwd + "/" + namearg).regpath();
		check_fs_by_path(patharg, name_is_taken => {
			if (name_is_taken && !if_force) return check_and_save((++iter) + "~" + basename);
			cb(namearg);
		});
	};
	check_and_save(basename);
};//»
const append_slice=(slice)=>{//«
return new Promise(async(Y,N)=>{

const err=(e)=>{Y();};

//	let writer = await fent.createWritable();
//	await writer.write(blob);
//	await writer.close();
//	Y(blob.size);

//fEnt.createWriter(function(writer) {
//This appends append
	let writer = await fEnt.createWritable();
//log(writer.length);
//log(writer.seek);
//EOPKIMNHKJ
	await writer.seek(curpos);
	await writer.write(slice);
	await writer.close();
//log(curpos, slice.size);
	Y(curpos+slice.size);
/*
	let truncated = false;
	writer.onwriteend = async function(e) {
		let size = this.position;
		if (!truncated) {
			truncated = true;
			this.truncate(size);
			return;
		} 
		Y(size);
	};
	writer.onerror = function(e) {
		Y();
	};
*/
//	writer.write(slice);
//}, err);

});
}//»
const save_file_chunk = async(blobarg, cbarg) => {//«

	if (cancelled) return cwarn("Cancelled!");
	let slice;
	if (blobarg) slice = blobarg;
	else if (file) slice = file.slice(curpos, curpos + FILE_SAVER_SLICE_SZ);
	else {
cerr("save_file_chunk():No blobarg or file!");
		return;
	}
//	let lenret = await append(fEnt, slice);
	let lenret = await append_slice(slice);
	if (blobarg) {
		bytesWritten += blobarg.size;
		if (update_cb) {
			if (fSize) update_cb(Math.floor(100 * bytesWritten / fSize));
			else update_cb(bytesWritten);
		}
		if (cbarg) cbarg();
		return;
	} 
	curpos += FILE_SAVER_SLICE_SZ;
//	if (thisobj.position < fSize) {
	if (lenret < fSize) {
//		if (update_cb) update_cb(Math.floor(100 * thisobj.position / fSize));
		if (update_cb) update_cb(Math.floor(100 * lenret / fSize));
		save_file_chunk();
	} 
	else {
		if (done_cb) done_cb();
	}
};//»

this.set_cb=(which,cb)=>{if(which=="update")update_cb=cb;else if(which=="done")done_cb=cb;else if(which=="error")error_cb=cb;else cerr("Unknown cb type in set_cb:"+which);};
this.set_cwd = (arg, cb) => {//«
return new Promise((Y,N)=>{
	if (arg && arg.match(/^\x2f/)) {
		__path_to_node(arg, ret => {
			if (!(ret && ret.appName == FOLDER_APP)) {
				Y();
cerr(`Invalid directory path: ${arg}`);
				return;
			}
			cwd = arg;
			Y(ret);
		});
	}
	else {
cerr(`Invalid cwd: ${arg} (must be a fullpath)"`);
	}
});
};//»
this.set_fsize=(arg)=>{if(!(isint(arg)&& ispos(arg)))return cerr("Need positive integer for fSize");fSize=arg;};
this.set_ext=(arg)=>{if(!(arg&&arg.match(/^[a-z0-9]+$/)))return cerr("Invalid extension given:need /^[a-z0-9]+$/");ext=arg;};
this.set_filename = (arg, if_force) => {//«
//this.set_filename = (arg, cb, if_force) => {
return new Promise((Y,N)=>{
	if (!cwd) {
		Y();
cerr("Missing cwd");
		return
	}
	if (!arg) arg = "New_File";
	arg = arg.replace(/[^-._~%+:a-zA-Z0-9 ]/g, "");
	arg = arg.replace(/\x20+/g, "_");
	if (!arg) arg = "New_File";
	basename = arg;
	get_new_fname(ret => {
		if (!ret) return Y();
		fname = ret;
		fullpath = (cwd + "/" + fname).regpath();
		Y(fname);
	}, if_force)
});
};//»
this.set_fent = async(cb) => {//«
let arr = fullpath.split("/");
let fname = arr.pop();
let parpath = arr.join("/");
let parobj = await pathToNode(parpath);
if (!parobj) return cb(null, "No parent object!");
if (parobj.kids[fname]) return cb(null,`${fname}: the name is already taken`);

//let node = await touchFile(parobj, fname);

let node = await saveFsByPath(fullpath, null, {getEntry: true});
if (!(node&&node.entry)) return cb(null, `${fullpath}, Could not get the file entry`);

fObj = node;
fEnt = node.entry;
fObj.lockFile();
cb(fObj);

};//»
this.save_from_file = (arg) => {//«
	if (saving_from_file) return cerr("Already saving from a File object");
	if (stream_started) return cerr("Already saving from a stream");
//	if (!writer) return cerr("No writer is set!");
	saving_from_file = true;
	fSize = arg.size;
	file = arg;
	if (!update_cb) cwarn("update_cb is NOT set!");
	if (!done_cb) cwarn("done_cb is NOT set!");
//	save_file_chunk();
	setTimeout(()=>{
		save_file_chunk();
	},0);
};//»
this.start_blob_stream=()=>{//«
	if(stream_started)return cerr("blob stream is already started!");
	if(saving_from_file)return cerr("Already saving from a File object");
//	if(!writer)return cerr("No writer is set!");
	if(!fEnt)return cerr("No file entry is set!");
//	if(!fSize)cwarn("fSize not set,so can't call update_cb with percent update,but with bytes written");
//	if(!update_cb)cwarn("update_cb is NOT set!");
//	if(!done_cb)cwarn("done_cb is NOT set!");
	stream_started=true;
};//»
this.append_blob = (arg, cb) => {//«
	/* If no fSize is set,we can call update_cb with the number of bytes written */
	if (stream_ended) return cerr("The stream is ended!");
	if (!stream_started) return cerr("Must call start_blob_stream first!");
	if (!(arg instanceof Blob)) return cerr("The first arg MUST be a Blob!");
	setTimeout(()=>{
		save_file_chunk(arg, cb);
	},0);
};//»
this.end_blob_stream = () => {//«
	stream_ended = true;
	if (fObj) fObj.unlockFile();
	if (done_cb) done_cb();
};//»
this.cancel = (cb) => {//«
//	cwarn("Cancelling... cleaning up!");
	cancelled = true;
	fEnt.remove(() => {
//		cwarn("fEnt.remove OK");
		cb();
	}, () => {
		cerr("fEnt.remove ERR");
		cb();
	});
};//»

}
this.FileSaver=FileSaver;
//»

const save_from_local = (savedirpath, savename, app, force, termobj, cbok, werr, wclerr, gotfrom, fromicon, towin)=>{//«

return new Promise(async(Y,N)=>{

const writer_func = async (kidobj, err)=>{//«

if (!kidobj) {
	werr(`Error: ${err}`);
	Y();
	return;
}

let killcb = cb => {//«
	if (cancelled) {
		cb && cb();
		return;
	}
	cancelled = true;
	kidobj.filesaver_cb = undefined;
	delete kidobj.filesaver_cb;
	saver.end_blob_stream();
	if (icons) {
		for (let icn of icons) icn.activate()
	};
	cb&&cb();
};//»
saver.set_cb("update", per => {//«
	if (done) return;
	let str = `${per}%`;
	wclerr(`${str} ${newname}`);
	if (icons) {
		for (let icn of icons) icn.overdiv.innerHTML = str;
	}
});//»
saver.set_cb("done", () => {//«
	done = true;
	termobj.kill_unregister(killcb);
	wclerr(`100% ${newname}`);
	if (icons) {
		for (let icn of icons) icn.activate()
	};
	Y();
});//»
kidobj.filesaver_cb=(icn)=>{//«
	if (!icons) return;
	icn.disabled = true;
//	Desk.add_drop_icon_overdiv(icn);
	icn.add_overlay();
	icn.cancel_func = killcb;
	icons.push(icn);
};//»
termobj.kill_register(killcb);

let cancelled = false;
let done = false;
let icons = null; 
let nBytes = null;
let next_cb = null;

werr(" ");
saver.start_blob_stream();

if (Desk) {//«
	icons  = await move_icon_by_path(null, `${savedirpath}/${newname}`, app, {
		icon: fromicon,
		win: towin
	});
	if (icons) {
		for (let icn of icons) {
			icn.disabled = true;
			icn.add_overlay();
//			Desk.add_drop_icon_overdiv(icn);
			icn.cancel_func = killcb;
		}
	}
}//»

read_file_stream(gotfrom, (ret, next_cb_ret, nBytesRet) => {//«
	if (cancelled) return;
	if (!ret) {
		if (next_cb_ret) {
			next_cb = next_cb_ret;
			return;
		}
		if (nBytesRet) {
			if (nBytes) {
cerr("Got nBytesRet while nBytes is already set!!!");
				return;
			}
			nBytes = nBytesRet;
			saver.set_fsize(nBytes);
			return;
		}
cerr("NOTHING FOUND");
		return;
	}
	if (ret === true) {
		kidobj.filesaver_cb = undefined;
		delete kidobj.filesaver_cb;
		saver.end_blob_stream();
		return;
	}
	if (ret instanceof Uint8Array) {
		nBytes = ret.length;
		ret=new Blob([ret],{type:"binary"});
	}
	saver.append_blob(ret, next_cb);
});//»

};//»

let saver = new FileSaver();
saver.set_cb("error", mess => {
	werr(mess);
	Y();
});
let parobj = await saver.set_cwd(savedirpath);
if (!parobj){
	werr(`Filesaver error: set_cwd("${savedirpath}")`);
	Y();
	return;
}
let newname = await saver.set_filename(savename, force);
if (!newname){
	werr(`Filesaver error: set_filename("${savename}")`);
	Y();
	return;
}

if (fromicon) {
	let namearr = capi.getNameExt(newname);
	let nm = namearr[0];
	fromicon.name = nm;
	fromicon.ext = namearr[1];
	fromicon.label.innerText = nm;
	fromicon.label.title = nm;
}

saver.set_fent(writer_func);

});
}//»
const event_to_files = (e) => {//«
	var dt = e.dataTransfer;
	var files = [];
	if (dt.items) {
		for (var i = 0; i < dt.items.length; i++) {
			if (dt.items[i].kind == "file") files.push(dt.items[i].getAsFile());
		}
	} else files = dt.files;
	return files;
}
this.event_to_files = event_to_files;
//»
this.drop_event_to_bytes = (e, cb) => {//«
	let file = event_to_files(e)[0];
	if (!file) return cb();
	let reader = new FileReader();
	reader.onerror = e => {
		cerr("There was a read error");
		log(e);
	};
	reader.onloadend = function(ret) {
		let buf = this.result;
		if (!(buf && buf.byteLength)) return cb();
		cb(new Uint8Array(buf), file.name);
	};
	reader.readAsArrayBuffer(file);
}//»

const read_file_stream = (fullpath, cb) => {//«
	get_local_file(fullpath, ret=>{
		if (ret) cb(ret);
		cb(true);
	}, {}, cb);
}//»
const get_local_file = async (patharg, cb, opts={}, stream_cb) => {//«

let done=false;
const getchunk=async()=>{
	if (done) return;
	let endbyte;
	if (!stream_cb) endbyte="end";
	else {
		endbyte = gotbytes + chunk_sz;
		if (endbyte >= sz) endbyte = sz;
	}
	rv = await fetch(`${url}&range=${gotbytes}-${endbyte}`);
	if (!rv.ok) return cb();
	let blob;
	if (opts.text) blob = await rv.text();
	else blob = await rv.blob();
	if (stream_cb) stream_cb(blob);
	else{
		cb(blob);
		return;
	}
	gotbytes+=blob.size;
	if (gotbytes>=sz) {
		done=true;
		cb();
	}
}
if (stream_cb) stream_cb(null, getchunk);

let fobj = await pathToNode(patharg);
let parts = fobj.fullpath.split("/");
parts.shift();
parts.shift();
parts.shift();

let url = capi.locUrl(fobj.root.port, parts.join("/"));
let rv = await fetch(`${url}&getsize=1`);
if (!rv.ok) return cb();
let sz = parseInt(await rv.text());
if (stream_cb) stream_cb(null,null, sz);
else if (sz > MAX_LOCAL_FILE_SIZE) return cb();
let chunk_sz = MB;
let gotbytes = 0;
getchunk();

}//»

//»
//Util«

const get_keys = obj => {//«
	var arr = Object.keys(obj);
	var ret = [];
	for (var i = 0; i < arr.length; i++) {
		if (obj.hasOwnProperty(arr[i])) ret.push(arr[i]);
	}
	return ret;
}//»
const check_db_rv = (rv, if_log)=>{//«
    if (!(rv.rows||rv.message)) {
cwarn(rv);
//        cberr("Unknown return value");
        return false;
    }   
    if (!rv.message) {
//log(rv);
let rows = rv.rows;
//log(rv); 
if (if_log) {
for (let row of rows){
log(row);
}
}
        return true;
    }   
cerr(rv.message)
//    cberr("FAIL");
    return false;
}//»

const check_fs_dir_perm = (obj, is_root, is_sys, userarg) => {//«
	if (is_sys) return true;
	let iter = 0;
	while (obj.treeroot !== true) {
		iter++;
		if (iter >= 10000) throw new Error("UMWUT");
		if (obj.readonly){
			if (is_sys) return true;
			return false;
		}
		if ("perm" in obj) {
			let perm = obj.perm;
			if (perm === true) return true;
			else if (perm === false) {
				if (is_root) return true;
				return false;
			}
			else if (isstr(perm)) {
				if (is_root) return true;
//				let checkname = userarg || Core.get_username();
				let checkname = userarg || globals.CURRENT_USER;
				return (checkname === perm);
//				return (Core.get_username() === perm);
			}
			else {
cerr("Unknown obj.perm field:", obj);
			}
		}
		obj = obj.par;
	}

	if (is_root) return true;
	return false;
};
this.check_fs_dir_perm=check_fs_dir_perm;
//»
const add_lock_funcs=kid=>{//«
	let lock = {};
	kid.unlockFile=()=>{
		delete kid.write_locked;
		let par = kid.par;
		while (par){
			if (par.type) break;
			par.rmMoveLock(lock);
			par = par.par;
		}
	};
	kid.lockFile=()=>{
		kid.write_locked = true;
		let par = kid.par;
		while (par){
			if (par.type) break;
			par.moveLocks.push(lock);
			par = par.par;
		}
	};
};//»
const set_rm_move_lock =obj=>{//«
	let locks = obj.moveLocks;
	obj.rmMoveLock=lockarg=>{
		for (let i=0; i < locks.length; i++){
			if (locks[i]===lockarg){
				locks.splice(i, 1);
				break;
			}
		}
	}
};//»

const get_time_str_from_file = file =>{//«
	let now = Date.now();
	let use_year_before_time = now - (1000 * 86400 * MAX_DAYS);
	let tm = file.lastModified;
	let timearr = file.lastModifiedDate.toString().split(" ");
	timearr.shift();
	timearr.pop();
	timearr.pop();
	let timestr = timearr[0] + " " + timearr[1].replace(/^0/, " ") + " ";
	if (file.lastModified < use_year_before_time) timestr += " " + timearr[2];
	else {
		let arr = timearr[3].split(":");
		arr.pop();
		timestr += arr.join(":");
	}
	return timestr;
};//»

const check_unique_path = (path, is_root) => {//«
	return new Promise(async(res, rej) => {
		path = path.replace(/\/+$/,"");
		let arr = path.split("/");
		let name = arr.pop();
		let parpath = arr.join("/");
		let fobj = await pathToNode(parpath);
		if (!fobj) return rej("No parent path:\x20" + parpath);
		if (fobj.appName != FOLDER_APP) return rej("Parent is not a Folder,(got" + fobj.appName + ")");
		if (fobj.kids[name]) return res("The name already exists:\x20" + name);
		res([fobj.fullpath + "/" + name, fobj.fullpath, name]);
	});
};//»

const path_to_par_and_name=(path)=>{//«
	let fullpath = getFullPath(path);
	let arr = fullpath.split("/");
	if (!arr[arr.length-1]) arr.pop();
	let name = arr.pop();
	if (arr.length==1 && arr[0]=="") return ["/", name];
	return [arr.join("/"), name];
}
this.path_to_par_and_name=path_to_par_and_name;
/*
const path_to_par_and_name = (path) => {
	let fullpath = getFullPath(path);
	let arr = fullpath.split("/");
	if (!arr[arr.length - 1]) arr.pop();
	let name = arr.pop();
	return [arr.join("/"), name];
}
*/
//»

this.set_desk = function(arg) {//«
	Desk = arg;
	move_icon_by_path = Desk.move_icon_by_path;
}//»

//»

this.api = {//«
	init,

	clearStorage,
	makeLink,
	touchFile,
	saveFsByPath,
	doFsRm,
	mkDir,

	writeFile,

	getBlob,
	readFile,
	comMv,

	popDir,
	popDirByPath,
	mountDir,

	pathToNode,

	checkDirPerm

}
NS.api.fs=this.api;
//»

//}; end FS«
  }
//»

//»



