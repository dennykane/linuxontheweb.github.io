/*


Starting the process of getting a media player app that supports streaming with
fully integrated/encapsulated webm parsing.


*/
import { util, api as capi } from "/sys/util.js";
import { globals } from "/sys/config.js";
const { isarr, isstr, isnum, isobj, make, log, jlog, cwarn, cerr } = util;
const { fs } = globals;
const fsapi = fs.api;

let YT_IDS = [
	"1yKx_BzhA1M.webm",
	"xoKsQjGRy04.webm"
];
let USE_NUM = 1;
export const app = function(Win){

const { main, winElem: win } = Win;

let WEBM;
let ebml_sz, toInt;

const init = async()=>{//«

let id = YT_IDS[USE_NUM];
let node = await fsapi.pathToNode(`/mnt/vids/${id}`);
if (!node) return cerr("BARFFF", id);

WEBM = await capi.getMod("webmparser");
ebml_sz = WEBM.ebml_sz;
toInt = WEBM.toInt;

let hash = await get_hash(await node.getValue({from: 0, to: 4999}));

log(hash);

};//»

/*
Offsets for: segment, cues, tracks, and info
*/
const get_hash = async(buf)=>{//«

let b = buf;
let rv = ebml_sz(b, 4);
let c = rv[0]+rv[1];
let seg_off;
let hash={};
//ebml = b.slice(0, c);

if (!(b[c]==0x18&&b[c+1]==0x53&&b[c+2]==0x80&&b[c+3]==0x67)) return cerr("Segment ID not found");
c+=4;
rv = ebml_sz(b, c);
seg_off = c = rv[1];
hash.segment = seg_off;

if (!(b[c]==0x11&&b[c+1]==0x4d&&b[c+2]==0x9b&&b[c+3]==0x74)) {
	WEBM.dump_hex_lines(b.slice(0, 100));
	return cerr("Seekhead ID not found at expected position");
}
c+=4;
rv = ebml_sz(b, c);
c = rv[1];
let skhd = WEBM.parse_section(b.slice(c,c+rv[0]), WEBM.WebmTags.kids["18538067"].kids["114d9b74"]);
for (let i=0; i < skhd.length; i+=2){
	let ent = skhd[i+1];
	let id = ent[1];
	let v;
	if (id[0]==0x1c && id[1]==0x53 && id[2]==0xbb && id[3]==0x6b){
		hash.cues = seg_off + toInt(ent[3]);
	}
	else if (id[0]==0x16 && id[1]==0x54 && id[2]==0xae && id[3]==0x6b){
		hash.tracks = seg_off + toInt(ent[3]);
	}
	else if (id[0]==0x15 && id[1]==0x49 && id[2]==0xa9 && id[3]==0x66){
		hash.info = seg_off + toInt(ent[3]);
	}
//const CLUSTER_ID = "1f43b675";
//	else if (id[0]==0x1f && id[1]==0x43 && id[2]==0xb6 && id[3]==0x75){
//		hash.cluster = seg_off + toInt(ent[3]);
//	}

}


return hash;

};//»

this.onappinit=init;


}

