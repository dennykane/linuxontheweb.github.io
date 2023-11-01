
/*«The moral: 0xFF is not a valid size!!!

https://matroska-org.github.io/libebml/specs.html

There is only one reserved word for Element Size encoding, which is an Element
Size encoded to all 1's. Such a coding indicates that the size of the Element
is unknown, which is a special case that we believe will be useful for live
streaming purposes. However, avoid using this reserved word unnecessarily,
because it makes parsing slower and more difficult to implement.



»*/
/*SimpleBlock«

129=Video
130=Audio

Cluster

Type  TmStmp  Key  Size
130   0   0   128
129   0   3   128  BIG ~20k-40x
130   0   3   128
...
129   0  45   0    BIG ~15k-25k
129   0  45   0
130   0  57   128
...
129   0  82   0
130   0  91   128
...

The first frame in a cluster is always a big keyframe, and the second is always
a big non-keyframe immediately followed by a small non-keyframe at the same
timestamp (a doublet).  There are doublets sprinkled throughout any given
cluster, and there never seem to be consecutive doublets.

»*/
/*@AHYBDHNT: Codecs«

const codecs = ['avc1.42001E', 'vp8', 'vp09.00.10.08', 'av01.0.04M.08'];
const accelerations = ['prefer-hardware', 'prefer-software']

const configs = [];
for (const codec of codecs) {
  for (const acceleration of accelerations) {
    configs.push({
      codec,
      hardwareAcceleration: acceleration,
      width: 1280,
      height: 720,
      bitrate: 2_000_000,
      bitrateMode: 'constant',
      framerate: 30,
      not_supported_field: 123
    });
  }
}
»*/

//Imports«
import { util, api as capi } from "util";
import { globals } from "config";

const{NS}=globals;
const fsapi = NS.api.fs;
const fs = fsapi;
const{strnum, isarr, isstr, isnum, isobj, log, jlog, cwarn, cerr}=util;
const {pathToNode}=fsapi;
const USECODEC = "vp9";
//»


export const mod = function(){//«

const NOOP=()=>{};

const PLAYMEDIA = async () => {//«

let rdr = get_reader();
if (rdr.is_terminal){
	let path = args.shift();
	if (!path) return cerr('No path given!');
	let node = await pathToNode(path);
	if (!node) return cerr(`${path}: not found`);
	Core.Desk.api.openApp("media.MediaPlayer", true, null, {file: node.fullpath});
	cbok();
	return;
}
//Fail on all file and heredoc redirections
if (!rdr.is_pipe) return cerr("Expected to receive terminal args or piped input");

read_stdin(rv=>{
	if (rv.EOF===true) return cbok();
	if (!(rv instanceof Blob && rv.type && rv.type.match(/^(audio|video)/))) return cerr("Unexpected value in pipe");
	Core.Desk.api.openApp("media.MediaPlayer", true, null, {blob: rv});
	cbok();
});

};//»
//const CUTWEBM = async (fullpath, start_time, end_time, vid_width, vid_height, vid_codec, vid_codec_desc) => {
const CUTWEBM = async (fullpath, start_time, end_time, opts={}) => {//«

let command_start = window.performance.now();

//Var«

const DECENT_INIT_CHUNK = 20000;

//let align_start_to_cluster = true;
let align_start_to_cluster = false;
let start_blocks;
let end_blocks = [];
let last_cluster_start;
let start_cluster;
//let all_clusters = [];
let cluster_sizes = [];
let cluster_times = [];
let all_cluster_data;
let c, rv;
//let start_time, end_time;
let timemult, duration, timecodescale;
//let opts, path, node;
//let path, node;
let ebml_bytes;
//, fullpath;
let tracks_bytes;
let new_duration;
let init_bytes;
let last_byte;
let orig_cues;
let start_diff, last_cluster_time, last_cluster, first_cluster, first_cluster_time;
let first_cue, second_cue, end_cue, pen_cue, final_cue;
let cues_arr, cues_start;
//»
//Init«

//opts = failopts(args,{s:{s:3,e:3},l:{start:3,end:3}});
//if (!opts) return;

//path = args.shift();
//if (!path) return cerr('No path given!');

//node = await pathToNode(path);
//if (!node) return cerr(`${path}: not found`);

//»
//EBML«

/*
Get a decent chunk of the file that certainly *should* have both the SeekHead
and Info elements in it. If they aren't fully contained in this amount of the
file, then something strange is going on (perhaps a very large Void (0xec)
section).
*/

//fullpath = node.fullpath;

init_bytes = await fs.readFile(fullpath,{binary:true, start: 0, end: DECENT_INIT_CHUNK});
if (!(init_bytes && init_bytes.length==DECENT_INIT_CHUNK)) return cerr(`Suspiciously small file < ${DECENT_INIT_CHUNK} bytes!`);

rv = ebml_sz(init_bytes, 4);
ebml_bytes = init_bytes.slice(0, rv[0]+rv[1])


//»
//New times -> Duration«

rv = get_timing_of_webm_file(init_bytes);
if (isstr(rv)) return cerr(rv);

timecodescale = rv.timeCodeScale;
timemult = timecodescale/NANOSECS_PER_SEC;
duration = rv.duration * timemult;

//log(`Original duration: ${duration} secs`);

/*
start_time = opts.start||opts.s;
end_time = opts.end||opts.e;
if (!(start_time || end_time)) return cerr("Nothing to do!");
if (start_time==="-") start_time=0;
else{
	start_time=parseFloat(start_time);
	if (!Number.isFinite(start_time) && start_time>=0) return cerr("Invalid start");
}

if (end_time==="-") end_time=duration;
else{
	end_time=parseFloat(end_time);
	if (!Number.isFinite(end_time) && end_time>=0) return cerr("Invalid end");
}
if (end_time <= start_time) return cerr("Invalid start/end times");
*/

if (end_time > duration) {
	cerr(`Truncating the "end time" to the duration`);
	end_time = duration;
}
new_duration = end_time - start_time;
if (new_duration === duration) return cerr("Nothing to do!");


//»
{//Tracks«

//const TRACKS_ID = "1654ae6b";
rv = get_section_pos_of_webm_file([0x16,0x54,0xae,0x6b], init_bytes);
let c = rv.offset + rv.value;

rv = await fs.readFile(fullpath, {binary: true, start: c+4, end: c+12});
if (!(rv && rv.length===8)) return cerr("Could not get the size of the Tracks");
rv = ebml_sz(rv, 0);
let tracks_id_length = 4;
let tracks_size_length = rv[1];
let tracks_size = rv[0];
tracks_bytes = await fs.readFile(fullpath, {binary: true, start: c, end: c + tracks_id_length + tracks_size_length + tracks_size});
}
//»
{//Cues«

rv = get_section_pos_of_webm_file([0x1c,0x53,0xbb,0x6b], init_bytes);
if (!rv) return cerr("Could not get the Cues position from the file");
if (isstr(rv)) return cerr(rv);

let segment_start = rv.offset;
c = segment_start + rv.value;

let cues_start = c;

rv = await fs.readFile(fullpath, {binary: true, start: c+4, end: c+12});
if (!(rv && rv.length===8)) return cerr("Could not get the size of the Cues");
rv = ebml_sz(rv, 0);

let cues_id_length = 4;
let cues_size_length = rv[1];
let cues_size = rv[0];

let cues_bytes = await fs.readFile(fullpath, {binary: true, start: c, end: c + cues_id_length + cues_size_length + cues_size});
let cues = parse_section(cues_bytes, SEGMENT)[1];
if (!(cues[1].length == 4 && cues[1][0].match(/^CUETIME/) && cues[1][2].match(/^CUETRACKPOSITION/) && cues[1][3][0].match(/^CUETRACK/) && cues[1][3][2].match(/^CUECLUSTERPOSITION/))) return cerr("Unknown Cues format");

cues_arr=[];
{
	let end = cues[cues.length-1];
	final_cue = {
		time: toint(end[1],true)*timemult,
		pos: toint(end[3][3],true)+segment_start
	};
}
let last_time, last_pos;
let add_last;
let tolen = cues.length-2;
for (let i=0; i < tolen; i+=2){
	let cue = cues[i+1];
	let cue2 = cues[i+3];
	let cue_time = toint(cue[1],true)*timemult;
	let cue2_time = toint(cue2[1],true)*timemult;
	let cue_pos = toint(cue[3][3], true)+segment_start;
	let cue2_pos = toint(cue2[3][3], true)+segment_start;
	if (!cues_arr.length){
		if (start_time >= cue_time && start_time < cue2_time) cues_arr.push({time: cue_time, pos: cue_pos})
		if (cue2_time > end_time){
			cues_arr.push({time: cue2_time, pos: cue2_pos})
			break;
		}
	}
	else if (cue2_time > end_time){
		cues_arr.push({time: cue_time, pos: cue_pos})
		cues_arr.push({time: cue2_time, pos: cue2_pos})
		break;
	}
	else{
		cues_arr.push({time: cue_time, pos: cue_pos})
	}

}
orig_cues = JSON.parse(JSON.stringify(cues_arr));
if (!cues_arr.length) {
	first_cue = final_cue;
}
else {
	first_cue = cues_arr.shift();
	second_cue = cues_arr[0];
	end_cue  = cues_arr.pop();

	if (!end_cue) end_cue = second_cue;
	if (!end_cue) end_cue = first_cue;

	if (second_cue) {
		last_byte = second_cue.pos;
	}
	else if (end_cue.pos < cues_start) {
		last_byte = cues_start;
	}
}

}

//»
{//Init Clusters«

rv = await fs.readFile(fullpath, {binary: true, start: first_cue.pos, end: last_byte});

first_cluster = parse_section(rv, SEGMENT)[1];
first_cluster.shift();

first_cluster_time = toint(first_cluster.shift())*timemult;

if (align_start_to_cluster) {
	start_time = first_cluster_time;
	log(`Setting start_time to first_cluster_time (${first_cluster_time})`);
}

//if (start_time) log(`New start point ${start_time} secs`);
new_duration = end_time - start_time;
//log(`New duration ${new_duration.toFixed(2)} secs`);

if (end_cue) {
	last_byte = end_cue.pos;
	if (final_cue.pos === end_cue.pos){
		if (final_cue.pos < cues_start) last_byte = cues_start;
		else last_byte = undefined;
	}
	pen_cue = cues_arr.pop();
	if (!pen_cue) {
		pen_cue = end_cue;
	}
	last_cluster_start = pen_cue.pos;
	if (last_cluster_start >= last_byte){
		last_byte = final_cue.pos;
		if (last_cluster_start >= last_byte) {
	return cerr(`INVALID LAST_CLUSTER_START(${last_cluster_start}) / LAST_BYTE(${last_byte})`);
		}
	}
}
else{
	last_cluster_start = first_cue.pos;
}


//log(last_cluster_start, last_byte);
rv = await fs.readFile(fullpath, {binary: true, start: last_cluster_start, end: last_byte});
if (rv) {
	last_cluster = parse_section(rv, SEGMENT)[1];
	last_cluster.shift();
	last_cluster_time = toint(last_cluster.shift())*timemult;
}
//log("START", start_time, "FIRST_CLUSTER_TIME", first_cluster_time);
start_diff = start_time - first_cluster_time;
}
//»
cwarn("DIFF", start_diff);
if (start_diff) {//Return to the caller for re-encoding«

let second_cluster_time;
if (second_cue) {
	second_cluster_time = second_cue.time;
	if (second_cluster_time > end_time) second_cluster_time = end_time;
}
else if (end_cue && end_cue.pos < cues_start) second_cluster_time = new_duration;
else if (end_cue){
	second_cluster_time = final_cue.time;
}
else {
	second_cluster_time = end_time;
}
let first_cluster_duration = second_cluster_time - start_time;
if (!Number.isFinite(first_cluster_duration)){
log(second_cluster_time, start_time);
return cerr("WHAT IS WRONG???????????");
}
//log(`Re-encoding ${first_cluster_duration.toFixed(2)} secs of the first cluster...`);


let video_blocks = [];
let audio_blocks = [];
let gotau = false;
for (let i=0; i < first_cluster.length; i+=2){
	if (!first_cluster[i].match(/^SIMPLEBLOCK/)) return cerr(`Found a non "Simple Block"!`);
	let block = first_cluster[i+1];
	let block_time = toint([block[1], block[2]])*timemult;
	let tm =  block_time + first_cluster_time;
//log(tm);
	if (tm > end_time) {
		break;
	}
	let au_adjust = 0;
	if (block[0]===129){
		if (tm > start_time) video_blocks.push(tm);
//		if (!opts.getDiff) video_blocks.push(block);
//		else if (tm > start_time) video_blocks.push(tm);
	}
	else if (block[0]===130) {
		if (tm >= start_time) {
			let new_time = (block_time - start_diff) / timemult;
			if (!gotau) {
				au_adjust = new_time;
			}
			let new_time_array = new Uint8Array((new Int16Array([new_time-au_adjust])).buffer);
			block[1] = new_time_array[1];
			block[2] = new_time_array[0];
			audio_blocks.push(block);
			gotau = true;
		}
	}
	else return cerr(`Found unknown block type: ${block[0]}`);
}

return {
	start: start_time,
	end: second_cluster_time,
	ebml: ebml_bytes,
	tracks: tracks_bytes,
	times: video_blocks,
	audioBlocks: audio_blocks
};

/*«
let vid_blocks = await get_cluster_from_video_blocks(video_blocks, start_diff*1000000, vid_width, vid_height, vid_codec, vid_codec_desc);
if (!vid_blocks) {
//cerr();
return;
}

let blocks;
if (audio_blocks.length) {
	blocks=[];
	let hash={};
	let tags = [];
	for (let bl of audio_blocks){
		let time1 = `${bl[1]}`.padStart(3, "0");
		let time0 = `${bl[2]}`.padStart(3, "0");
		let nm = `${time1}-${time0}-a`;
		tags.push(nm);
		hash[nm]=bl;
	}
	for (let bl of vid_blocks){
		let time1 = `${bl[1]}`.padStart(3, "0");
		let time0 = `${bl[2]}`.padStart(3, "0");
		let nm = `${time1}-${time0}-v`;
		tags.push(nm);
		hash[nm]=bl;
	}
	tags = tags.sort();
	for (let t of tags) blocks.push(hash[t]);
}
else blocks = vid_blocks;

start_blocks = blocks;
»*/

}//»

//Create a new file from start-aligned clusters

start_blocks = [];
for (let i=0; i < first_cluster.length; i+=2){//«
	if (!first_cluster[i].match(/^SIMPLEBLOCK/)) return cerr(`Found a non "Simple Block"!`);
	let block = first_cluster[i+1];
	let block_time = toint([block[1], block[2]])*timemult;
	let tm =  block_time + first_cluster_time;
	if (block[0]===129) start_blocks.push(block);
	else if (block[0]===130) start_blocks.push(block);
	else return cerr(`Found unknown block type: ${block[0]}`);
}//»
if (last_cluster){//Trim from the back if needed«

let blocks = [];
let len = last_cluster.length;
for (let i=0; i < len; i+=2){
	if (!last_cluster[i].match(/^SIMPLEBLOCK/)) return cerr(`Found a non "Simple Block"!`);
	let block = last_cluster[i+1];
	let block_time = toint([block[1], block[2]])*timemult;
	let tm =  block_time + last_cluster_time;
	if (tm > end_time) {
		break;
	}
	if (block[0]===129) blocks.push(block);
	else if (block[0]===130) blocks.push(block);
	else return cerr(`Found unknown block type: ${block[0]}`);
}

end_blocks = blocks;

}//»
{//Make new Clusters elements from blocks«

//log("Generating new clusters...");

let start_data = make_cluster_elem_from_blocks(0, start_blocks);
cluster_times.push(0);
cluster_sizes.push(start_data.length);

if (!cues_arr.length) {
	if (!end_blocks){/*Only 1 cluster*/
		all_cluster_data = new Uint8Array(start_data.length);
		all_cluster_data.set(start_data, 0);
	}
	else {/*Only 2 clusters*/
		let last_cluster_timestamp = (last_cluster_time - start_time) / timemult;
		let new_end_data = make_cluster_elem_from_blocks(last_cluster_timestamp, end_blocks);
		cluster_times.push(last_cluster_timestamp);
		cluster_sizes.push(new_end_data.length);
		all_cluster_data = new Uint8Array(start_data.length+new_end_data.length);
		all_cluster_data.set(start_data, 0);
		all_cluster_data.set(new_end_data, start_data.length);
	}
}
else {/*At least 3 clusters*/

	let middle_data = await fs.readFile(fullpath, {binary: true, start: cues_arr[0].pos, end: last_cluster_start});

	let rv = new_clusters_data(middle_data, start_time/timemult);
	if (isstr(rv)) return cerr(rv);
	cluster_times = cluster_times.concat(rv.times)
	cluster_sizes = cluster_sizes.concat(rv.sizes)

	let new_middle_data = rv.data;
	let last_cluster_timestamp = (last_cluster_time - start_time) / timemult;

	let new_end_data = make_cluster_elem_from_blocks(last_cluster_timestamp, end_blocks);
	cluster_times.push(last_cluster_timestamp);
	cluster_sizes.push(new_end_data.length);

	all_cluster_data = new Uint8Array(start_data.length+new_middle_data.length+new_end_data.length);
	all_cluster_data.set(start_data, 0);
	all_cluster_data.set(new_middle_data, start_data.length);
	all_cluster_data.set(new_end_data, new_middle_data.length+start_data.length);
}

}//»
//Make webm«
//log("Generating new webm file");
let f = new WebmFile();
f.ebml = ebml_bytes;
f.duration = new_duration/timemult;
f.timeCodeScale = timecodescale;
f.muxingApp = "Zgrancheed";
f.writingApp = "Sofflering";
f.tracks = tracks_bytes;
f.clusters = all_cluster_data;
f.clusterSizes = cluster_sizes;
f.clusterTimes = cluster_times;
f.makeInfo();
f.makeSeekHead();
f.makeCues();
f.makeSegment();
f.makeFile();
//»

//let blob = new Blob([f.file],{type:"video/webm"});
//return blob;
return f.file;

};//»

const REMUX = (term, bytes) => {//«

const err=(arg)=>{
	term.response({ERR: [arg], NOEND: true});
	term.refresh({noCursor: true});
};
return new Promise((Y,N)=>{
let rv = ebml_sz(bytes, 4);
let ebml_bytes = bytes.slice(0, rv[0]+rv[1])

let timing = get_timing_of_webm_file(bytes);
let timecodescale = timing.timeCodeScale;
let timemult = timecodescale/NANOSECS_PER_SEC;

let file = parse_section(bytes, WebmTags);
let seg = file[3];
seg.shift();
let info = seg.shift();
seg.shift();
let tracks = seg.shift();
let tr_bytes = tracks._bytes;
let tracks_len = num_to_ebml(tr_bytes.length);
let tracks_bytes = new Uint8Array(tr_bytes.length + tracks_len.length + 4);
tracks_bytes.set(new Uint8Array([0x16, 0x54, 0xae, 0x6b]),0);
tracks_bytes.set(tracks_len, 4);
tracks_bytes.set(tr_bytes, 4+tracks_len.length);

let cluster_times = [];
let clusters = [];
let tot_clusters_sz = 0;
let cluster_sizes = [];
for (let i=0; i < seg.length; i+=2){
	let clust = seg[i+1];
	let tcode = toint(clust[1], true);
	cluster_times.push(tcode);
	let blocks = [];
	for (let i=2; i < clust.length; i+=2){
		blocks.push(clust[i+1]);
	}
	let cluster = make_cluster_elem_from_blocks(tcode, blocks);
	cluster_sizes.push(cluster.length);
	tot_clusters_sz+=cluster.length;
	clusters.push(cluster);
}
let all_cluster_data = new Uint8Array(tot_clusters_sz);
let last = 0;
for (let clust of clusters){
	all_cluster_data.set(clust, last);
	last+=clust.length;
}


let last_cluster = seg[seg.length-1];
last_cluster.shift();
last_cluster.shift();
let last_block = last_cluster[last_cluster.length-1];
let last_time = toint([last_block[1], last_block[2]]);
let total_time = cluster_times[cluster_times.length-1]+last_time;
let new_duration = total_time;
let total_secs = total_time * timemult;


let f = new WebmFile();

f.duration = total_time;
f.timeCodeScale = timecodescale;
f.muxingApp = "Zgrancheed";
f.writingApp = "Sofflering";
f.makeInfo();
f.tracks = tracks_bytes;
f.clusters = all_cluster_data;
f.makeSeekHead();
f.clusterSizes = cluster_sizes;
f.clusterTimes = cluster_times;
f.makeCues();
f.makeSegment();
f.ebml = ebml_bytes;
f.makeFile();
let blob = new Blob([f.file],{type:"video/webm"});
Y(blob);

});
};//»
const PARSE = (term, bytes)=>{

return parse_section(bytes, WebmTags);

};

//Var«
const NANOSECS_PER_SEC = 10**9;

let no_error = false;
let debug_section = false;

const TRACK_TYPES={1:"video",2:"audio",3:"complex",16:"logo",17:"subtitle",18:"buttons",32:"control",33:"metadata"};
//Webm IDs«

const EBML_ID = "1a45dfa3";
const SEGMENT_ID = "18538067";

const SEEKHEAD_ID = "114d9b74";
const INFO_ID = "1549a966";
const TRACKS_ID = "1654ae6b";
const CUES_ID = "1c53bb6b";
const CLUSTER_ID = "1f43b675";
const TAGS_ID = "1254c367";
const ATTACHMENTS_ID = "1941a469";
const CHAPTERS_ID = "1043a770";
const VOID_ID = "ec";

const TOPLEVEL_IDS=[
	SEEKHEAD_ID,
	INFO_ID,
	TRACKS_ID,
	CUES_ID,
	CLUSTER_ID,
	TAGS_ID,
	ATTACHMENTS_ID,
	CHAPTERS_ID,
	VOID_ID
];

const TOPLEVEL_ID_MAP={
	[SEEKHEAD_ID]: "SEEKHEAD",
	[INFO_ID]: "INFO",
	[TRACKS_ID]: "TRACKS",
	[CUES_ID]: "CUES",
	[CLUSTER_ID]: "CLUSTER",
	[TAGS_ID]: "TAGS",
	[ATTACHMENTS_ID]: "ATTACHMENTS",
	[CHAPTERS_ID]: "CHAPTERS"
};


//»

const WebmTags = {//«
"id":"WebmTags",
"kids": {
	"1a45dfa3": {//HEADER«
		"id": "HEADER",
		"kids": {
			"4286": {"id": "EBMLVERSION"},
			"42f7": {"id": "EBMLREADVERSION"},
			"42f2": {"id": "EBMLMAXIDLENGTH"},
			"42f3": {"id": "EBMLMAXSIZELENGTH"},
			"4282": {"id": "DOCTYPE"},
			"4287": {"id": "DOCTYPEVERSION"},
			"4285": {"id": "DOCTYPEREADVERSION"}
		}
	},//»
	"18538067": {
		"id": "SEGMENT",
		"kids": {

			"114d9b74": {//SEEKHEAD«
				"id": "SEEKHEAD",
				"kids": {
					"4dbb": {
						"id": "SEEKENTRY", 		//MULT
						"out":[],
						"mult":true,
						"kids": {
							"53ab": {"id": "SEEKID"},
							"53ac": {"id": "SEEKPOSITION"}
						}
					}
				}
			},//»

			"1549a966": {//INFO 21«
				"id": "INFO",
				"kids": {
					"2ad7b1": {"id": "TIMECODESCALE"},
					"4489": {"id": "DURATION"},
					"7ba9": {"id": "TITLE"},
					"5741": {"id": "WRITINGAPP"},
					"4d80": {"id": "MUXINGAPP"},
					"4461": {"id": "DATEUTC"},
					"73a4": {"id": "SEGMENTUID"}
				}
			},//»
			"1654ae6b": {//TRACKS 22«
				"id": "TRACKS",
				"kids": {
					"ae": {
						"id": "TRACKENTRY",    //MULT
						"out":[],
						"mult": true,
						"kids": {
							"d7": {"id": "TRACKNUMBER"},
							"73c5": {"id": "TRACKUID"},
							"83": {"id": "TRACKTYPE"},
							"e0": {//Video«
								"id": "TRACKVIDEO",
								"kids": {
									"2383e3": {"id": "VIDEOFRAMERATE"},
									"54b0": {"id": "VIDEODISPLAYWIDTH"},
									"54ba": {"id": "VIDEODISPLAYHEIGHT"},
									"b0": {"id": "VIDEOPIXELWIDTH"},
									"ba": {"id": "VIDEOPIXELHEIGHT"},
									"54aa": {"id": "VIDEOPIXELCROPB"},
									"54bb": {"id": "VIDEOPIXELCROPT"},
									"54cc": {"id": "VIDEOPIXELCROPL"},
									"54dd": {"id": "VIDEOPIXELCROPR"},
									"54b2": {"id": "VIDEODISPLAYUNIT"},
									"9a": {"id": "VIDEOFLAGINTERLACED"},
									"9d": {"id": "VIDEOFIELDORDER"},
									"53b8": {"id": "VIDEOSTEREOMODE"},
									"53c0": {"id": "VIDEOALPHAMODE"},
									"54b3": {"id": "VIDEOASPECTRATIO"},
									"2eb524": {"id": "VIDEOCOLORSPACE"},
									"55b0": {"id": "VIDEOCOLOR"},
									"55b1": {"id": "VIDEOCOLORMATRIXCOEFF"},
									"55b2": {"id": "VIDEOCOLORBITSPERCHANNEL"},
									"55b3": {"id": "VIDEOCOLORCHROMASUBHORZ"},
									"55b4": {"id": "VIDEOCOLORCHROMASUBVERT"},
									"55b5": {"id": "VIDEOCOLORCBSUBHORZ"},
									"55b6": {"id": "VIDEOCOLORCBSUBVERT"},
									"55b7": {"id": "VIDEOCOLORCHROMASITINGHORZ"},
									"55b8": {"id": "VIDEOCOLORCHROMASITINGVERT"},
									"55b9": {"id": "VIDEOCOLORRANGE"},
									"55ba": {"id": "VIDEOCOLORTRANSFERCHARACTERISTICS"},
									"55bb": {"id": "VIDEOCOLORPRIMARIES"},
									"55bc": {"id": "VIDEOCOLORMAXCLL"},
									"55bd": {"id": "VIDEOCOLORMAXFALL"},
									"55d0": {"id": "VIDEOCOLORMASTERINGMETA"},
									"55d1": {"id": "VIDEOCOLORRX"},
									"55d2": {"id": "VIDEOCOLORRY"},
									"55d3": {"id": "VIDEOCOLORGX"},
									"55d4": {"id": "VIDEOCOLORGY"},
									"55d5": {"id": "VIDEOCOLORBX"},
									"55d6": {"id": "VIDEOCOLORBY"},
									"55d7": {"id": "VIDEOCOLORWHITEX"},
									"55d8": {"id": "VIDEOCOLORWHITEY"},
									"55d9": {"id": "VIDEOCOLORLUMINANCEMAX"},
									"55da": {"id": "VIDEOCOLORLUMINANCEMIN"},
									"7670": {"id": "VIDEOPROJECTION"},
									"7671": {"id": "VIDEOPROJECTIONTYPE"},
									"7672": {"id": "VIDEOPROJECTIONPRIVATE"},
									"7673": {"id": "VIDEOPROJECTIONPOSEYAW"},
									"7674": {"id": "VIDEOPROJECTIONPOSEPITCH"},
									"7675": {"id": "VIDEOPROJECTIONPOSEROLL"}
								}
							},//»
							"e1": {
								"id": "TRACKAUDIO",
								"kids": {
									"b5": {"id": "AUDIOSAMPLINGFREQ"},
									"78b5": {"id": "AUDIOOUTSAMPLINGFREQ"},
									"6264": {"id": "AUDIOBITDEPTH"},
									"9f": {"id": "AUDIOCHANNELS"}
								}
							},
							"e2": {"id": "TRACKOPERATION"},
							"e3": {"id": "TRACKCOMBINEPLANES"},
							"e4": {"id": "TRACKPLANE"},
							"e5": {"id": "TRACKPLANEUID"},
							"e6": {"id": "TRACKPLANETYPE"},
							"86": {"id": "CODECID"},
							"63a2": {"id": "CODECPRIVATE"},
							"258688": {"id": "CODECNAME"},
							"3b4040": {"id": "CODECINFOURL"},
							"26b240": {"id": "CODECDOWNLOADURL"},
							"aa": {"id": "CODECDECODEALL"},
							"56aa": {"id": "CODECDELAY"},
							"56bb": {"id": "SEEKPREROLL"},
							"536e": {"id": "TRACKNAME"},
							"22b59c": {"id": "TRACKLANGUAGE"},
							"b9": {"id": "TRACKFLAGENABLED"},
							"88": {"id": "TRACKFLAGDEFAULT"},
							"55aa": {"id": "TRACKFLAGFORCED"},
							"55ab": {"id": "TRACKFLAGHEARINGIMPAIRED"},
							"55ac": {"id": "TRACKFLAGVISUALIMPAIRED"},
							"55ad": {"id": "TRACKFLAGTEXTDESCRIPTIONS"},
							"55ae": {"id": "TRACKFLAGORIGINAL"},
							"55af": {"id": "TRACKFLAGCOMMENTARY"},
							"9c": {"id": "TRACKFLAGLACING"},
							"6de7": {"id": "TRACKMINCACHE"},
							"6df8": {"id": "TRACKMAXCACHE"},
							"23e383": {"id": "TRACKDEFAULTDURATION"},
							"6d80": {"id": "TRACKCONTENTENCODINGS"},
							"6240": {
								"id": "TRACKCONTENTENCODING",
								"kids": {
									"5031": {"id": "ENCODINGORDER"},
									"5032": {"id": "ENCODINGSCOPE"},
									"5033": {"id": "ENCODINGTYPE"},
									"5034": {"id": "ENCODINGCOMPRESSION"},
									"4254": {"id": "ENCODINGCOMPALGO"},
									"4255": {"id": "ENCODINGCOMPSETTINGS"},
									"5035": {"id": "ENCODINGENCRYPTION"},
									"47e7": {"id": "ENCODINGENCAESSETTINGS"},
									"47e1": {"id": "ENCODINGENCALGO"},
									"47e2": {"id": "ENCODINGENCKEYID"},
									"47e5": {"id": "ENCODINGSIGALGO"},
									"47e6": {"id": "ENCODINGSIGHASHALGO"},
									"47e4": {"id": "ENCODINGSIGKEYID"},
									"47e3": {"id": "ENCODINGSIGNATURE"}
								}
							},
							"23314f": {"id": "TRACKTIMECODESCALE"},
							"55ee": {"id": "TRACKMAXBLKADDID"}
						}
					}
				}
			},//»
			"1c53bb6b": {//CUES 28«
				"id": "CUES",
				"kids": {
					"bb": {
						"id": "POINTENTRY",		//MULT
						"out":[],
						"mult":true,
						"kids": {
							"b3": {"id": "CUETIME"},
							"b7": {
								"id": "CUETRACKPOSITION",
								"kids": {
									"f7": {"id": "CUETRACK"},
									"f1": {"id": "CUECLUSTERPOSITION"},
									"f0": {"id": "CUERELATIVEPOSITION"},
									"b2": {"id": "CUEDURATION"},
									"5378": {"id": "CUEBLOCKNUMBER"}
								}
							}	
						}
					}				
				}
			},//»
			"1f43b675": {//CLUSTER 31«
				"id": "CLUSTER",		// MULT
				"out":[],
				"mult":true,
				"kids": {
					"e7": {"id": "CLUSTERTIMECODE"},
					"a7": {"id": "CLUSTERPOSITION"},
					"ab": {"id": "CLUSTERPREVSIZE"},
					"a3": {"id": "SIMPLEBLOCK"},
					"a0": {
						"id": "BLOCKGROUP",
						"out":[],
						"mult":true,
						"kids": {
							"a1": {"id": "BLOCK"},
							"9b": {"id": "BLOCKDURATION"},
							"fb": {"id": "BLOCKREFERENCE"},
							"a4": {"id": "CODECSTATE"},
							"75a2": {"id": "DISCARDPADDING"},
							"75a1": {
								"id": "BLOCKADDITIONS",
								"kids": {
									"a6": {
										"id": "BLOCKMORE",
										"kids": {
											"ee": {"id": "BLOCKADDID"},
											"a5": {"id": "BLOCKADDITIONAL"}
										}
									}
								}
							}
						}
					}
				}
			},//»

			"1254c367": {//TAGS«
				"id": "TAGS",
				"kids": {
					"7373": {"id": "TAG"},
					"67c8": {"id": "SIMPLETAG"},
					"45a3": {"id": "TAGNAME"},
					"4487": {"id": "TAGSTRING"},
					"447a": {"id": "TAGLANG"},
					"4484": {"id": "TAGDEFAULT"},
					"44b4": {"id": "BUG"},
					"63c0": {"id": "TAGTARGETS"},
					"63ca": {"id": "TYPE"},
					"68ca": {"id": "TYPEVALUE"},
					"63c5": {"id": "TRACKUID"},
					"63c4": {"id": "CHAPTERUID"},
					"63c6": {"id": "ATTACHUID"}
				}
			},//»
			"1941a469": {//ATTACHMENTS«
				"id": "ATTACHMENTS",
				"kids": {
					"61a7": {"id": "ATTACHEDFILE"},
					"467e": {"id": "FILEDESC"},
					"466e": {"id": "FILENAME"},
					"4660": {"id": "FILEMIMETYPE"},
					"465c": {"id": "FILEDATA"},
					"46ae": {"id": "FILEUID"}
				}
			},//»
			"1043a770": {//CHAPTERS«
				"id": "CHAPTERS",
				"kids": {
					"45b9": {"id": "EDITIONENTRY"},
					"b6": {"id": "CHAPTERATOM"},
					"91": {"id": "CHAPTERTIMESTART"},
					"92": {"id": "CHAPTERTIMEEND"},
					"80": {"id": "CHAPTERDISPLAY"},
					"85": {"id": "CHAPSTRING"},
					"437c": {"id": "CHAPLANG"},
					"437e": {"id": "CHAPCOUNTRY"},
					"45bc": {"id": "EDITIONUID"},
					"45bd": {"id": "EDITIONFLAGHIDDEN"},
					"45db": {"id": "EDITIONFLAGDEFAULT"},
					"45dd": {"id": "EDITIONFLAGORDERED"},
					"73c4": {"id": "CHAPTERUID"},
					"98": {"id": "CHAPTERFLAGHIDDEN"},
					"4598": {"id": "CHAPTERFLAGENABLED"},
					"63c3": {"id": "CHAPTERPHYSEQUIV"}
				}
			}//»

		}
	}
}

};
//console.log(this);
this.WebmTags = WebmTags;

const SEGMENT = WebmTags.kids[SEGMENT_ID];
const SEGMENTKIDS = SEGMENT.kids;
const SEEKHEAD = SEGMENTKIDS[SEEKHEAD_ID];
const INFO = SEGMENTKIDS[INFO_ID];
const TRACKS = SEGMENTKIDS[TRACKS_ID];
const CUES = SEGMENTKIDS[CUES_ID];
const CLUSTERS = SEGMENTKIDS[CLUSTER_ID];

//»

//»
//Funcs«

const WebmFile = function(){//«

this.makeInfo=()=>{//«
	let _dur = this.duration;
	let _tcs = this.timeCodeScale;
	let _ma = this.muxingApp;
	let _wa = this.writingApp;
	if (!(_dur&&_tcs&&_ma&&_wa)) {
		cerr("Not all info are set");
		return;
	}
	let tcs = make_ebml_elem([0x2a, 0xd7, 0xb1], num_to_arr(_tcs));
	let durdat = new Uint8Array((new Float32Array([_dur])).buffer).reverse();
	let dur = make_ebml_elem([0x44, 0x89], durdat);
	let ma = make_ebml_elem([0x4d, 0x80], str_to_arr(_ma));
	let wa = make_ebml_elem([0x57, 0x41], str_to_arr(_wa));

	let info_arr = new Uint8Array(tcs.length+dur.length+ma.length+wa.length);
	let cur=0;
	info_arr.set(tcs,cur);cur+=tcs.length;
	info_arr.set(dur,cur);cur+=dur.length;
	info_arr.set(ma,cur);cur+=ma.length;
	info_arr.set(wa,cur);
	this.info = make_ebml_elem([0x15, 0x49, 0xa9, 0x66], info_arr);
};//»

this.makeClusters=async()=>{//«

let a = this.clusterData;
if (!a) return cerr("No cluster data");
let all_clusters = [];
let clust_tot = 0;
let cluster_sizes = [];
let cluster_times = [];
while (a.length){
	let clust = a.shift();
	let tm = clust.timestamp;
	let blocks = clust.blocks;
	let all=[];
	for (let b of blocks){
		all.push(make_ebml_elem([0xa3], b));
	}
	let tot=0;
	for (let bl of all) tot+=bl.length;
	let allblocks = new Uint8Array(tot);
	let cur=0
	for (let bl of all){
		allblocks.set(bl,cur);
		cur+=bl.length;
	}
	let clustertimecode_elem = make_ebml_elem([0xe7], num_to_arr(tm));
	let cluster_data = new Uint8Array(clustertimecode_elem.length+allblocks.length);
	cluster_data.set(clustertimecode_elem, 0);
	cluster_data.set(allblocks, clustertimecode_elem.length);

//	let clustelem = make_ebml_elem([0x1f, 0x43, 0xb6, 0x75], cluster_data);
	let clustelem = make_ebml_elem([0x1f, 0x43, 0xb6, 0x75], cluster_data);
//log(clustelem);
	clust_tot+=clustelem.length;
	all_clusters.push(clustelem);
	cluster_sizes.push(clustelem.length);
	cluster_times.push(tm);
}
//log(cluster_sizes);
//log(cluster_times);

let all = new Uint8Array(clust_tot);
let curpos = 0;
for (let cl of all_clusters){
	all.set(cl, curpos);
	curpos+=cl.length;
}
//log(all);
//this.clustersArray = all_clusters;
this.clusters = all;
this.clusterSizes = cluster_sizes;
this.clusterTimes = cluster_times;

};//»

this.makeSeekHead=()=>{//«


//"114d9b74":{"id":"SEEKHEAD","kids":{"4dbb":{"id":"SEEKENTRY",		//MULT "out":[],"mult":true,"kids":{"53ab":{"id":"SEEKID"},"53ac":{"id":"SEEKPOSITION"}}}}},
//const INFO_ID = "1549a966";
//const TRACKS_ID = "1654ae6b";
//const CLUSTER_ID = "1f43b675";
//const CUES_ID = "1c53bb6b";
//
//Each SEEKENTRY == 26 bytes???

//So, SEEKHEAD datlen = 4*26
//And, SEEKHEAD elemlen = 8 + datlen = 112


	let mk_seekent=(id, pos)=>{
		let entdat = new Uint8Array(20);
		let idelem = make_ebml_elem([0x53, 0xab], id);
		let poselem = make_ebml_elem([0x53, 0xac], new Uint8Array((new Uint32Array([pos])).buffer).reverse());
		entdat.set(idelem, 0);
		entdat.set(poselem, 10);
		return make_ebml_elem([0x4d, 0xbb], entdat);
	};

//112 is the preknown size of the SeekHead element (8 + 4*26; each entry is 26 bytes)
	let start_pos = 112;
	let info_ent = mk_seekent(new Uint8Array([0x15, 0x49, 0xa9, 0x66]), start_pos);
	start_pos+=this.info.length;
	let tracks_ent = mk_seekent(new Uint8Array([0x16, 0x54, 0xae, 0x6b]), start_pos);
	start_pos+=this.tracks.length;
	this.clusterStart = start_pos;
	let clusters_ent = mk_seekent(new Uint8Array([0x1f, 0x43, 0xb6, 0x75]), start_pos);
	start_pos+=this.clusters.length;
	let cues_ent = mk_seekent(new Uint8Array([0x1c, 0x53, 0xbb, 0x6b]), start_pos);

	let seekhead_dat = new Uint8Array(4*26);
	seekhead_dat.set(info_ent, 26*0);
	seekhead_dat.set(tracks_ent, 26*1);
	seekhead_dat.set(clusters_ent, 26*2);
	seekhead_dat.set(cues_ent, 26*3);

	this.seekhead = make_ebml_elem([0x11, 0x4d, 0x9b, 0x74], seekhead_dat);

};//»

this.makeCues = ()=>{//«

//"1c53bb6b":{//CUES 28 "id":"CUES","kids":{"bb":{"id":"POINTENTRY",		//MULT "out":[],"mult":true,"kids":{"b3":{"id":"CUETIME"},"b7":{"id":"CUETRACKPOSITION","kids":{"f7":{"id":"CUETRACK"},"f1":{"id":"CUECLUSTERPOSITION"},"f0":{"id":"CUERELATIVEPOSITION"},"b2":{"id":"CUEDURATION"},"5378":{"id":"CUEBLOCKNUMBER"}}}	}}				}}
	let st = this.clusterStart;
	let sizes = this.clusterSizes;
	let times = this.clusterTimes;

	//log("START",st);
	//log(sizes);
	//log(TRACK_ONE_ELEM);
	let curpos = st;
	//for (let sz of sizes){
	let entries = [];
	for (let i=0; i < sizes.length; i++){
	let sz = sizes[i];
	let tm = times[i];
	//log(curpos, sz);
	let cuecluspos_elem = make_ebml_elem([0xf1], num_to_arr(curpos));
	let cuetrackpos_dat = new Uint8Array(cuecluspos_elem.length + TRACK_ONE_ELEM.length);
	cuetrackpos_dat.set(TRACK_ONE_ELEM, 0);
	cuetrackpos_dat.set(cuecluspos_elem, TRACK_ONE_ELEM_LEN);

	let cuetrackpos_elem = make_ebml_elem([0xb7], cuetrackpos_dat);
	let cuetime_elem = make_ebml_elem([0xb3], num_to_arr(tm));

	let pntentry_dat = new Uint8Array(cuetrackpos_elem.length+cuetime_elem.length);
	pntentry_dat.set(cuetime_elem, 0);
	pntentry_dat.set(cuetrackpos_elem, cuetime_elem.length);

	let pntentry_elem = make_ebml_elem([0xbb], pntentry_dat);
	entries.push(pntentry_elem);

	curpos+=sz;
	//log(cluspos_elem);
	}
	let entslen=0;
	for (let ent of entries){
		entslen+=ent.length;
	}
	let cues_dat = new Uint8Array(entslen);
	curpos = 0;
	for (let ent of entries){
		cues_dat.set(ent, curpos);
		curpos+=ent.length;
	}
	let cues_elem = make_ebml_elem([0x1c, 0x53, 0xbb, 0x6b], cues_dat);
	this.cues = cues_elem;

};//»

this.makeSegment=()=>{//«
	let skhd = this.seekhead;
	let info = this.info;
	let trcks = this.tracks;
	let clstrs = this.clusters;
	let cues = this.cues;
	if (!(skhd&&info&&trcks&&clstrs&&cues)){
	cerr("Need all five sections!");
	return;
	}
	//const SEGMENT_ID = "18538067";
	let segment_len = skhd.length + info.length + trcks.length + clstrs.length + cues.length;
	let segment_dat = new Uint8Array(segment_len);
	let curpos=0;
	segment_dat.set(skhd, curpos);curpos+=skhd.length;
	segment_dat.set(info, curpos);curpos+=info.length;
	segment_dat.set(trcks, curpos);curpos+=trcks.length;
	segment_dat.set(clstrs, curpos);curpos+=clstrs.length;
	segment_dat.set(cues, curpos);

	this.segment = make_ebml_elem([0x18, 0x53, 0x80, 0x67], segment_dat);
}//»

this.makeFile = ()=>{//«
	let ebml = this.ebml;
	let seg = this.segment;
	if (!(ebml&&seg)){
		cerr("Need ebml and segment!");
		return;
	}
	let file = new Uint8Array(ebml.length+seg.length);
	file.set(ebml, 0);
	file.set(seg, ebml.length)

	this.file = file;
};//»


};//»
this.WebmFile = WebmFile;

const encode_image_data=(video_frames, codec, vid_width, vid_height, cutoff, Y)=>{//«
	let cutoff_ticks = cutoff / 1000;
	let blocks=[];
	let last_time = video_frames[video_frames.length-1].timestamp;
	const doencode=async()=>{//«
		let config={
			codec: codec,
			width: vid_width,
			height: vid_height,
			bitrate: 1_000_000,
			framerate: 30
		};
		let gotfirst = false;
		const encoder = new VideoEncoder({//«
			output:e=>{
				let a = new Uint8Array(e.byteLength);
				let tmstamp = e.timestamp;
				let tm = Math.round(tmstamp/10**3);
				let tmarr = new Uint8Array((new Uint16Array([tm-cutoff_ticks])).buffer);
				e.copyTo(a);
				let b = new Uint8Array(a.length+4);
				b[0] = 129;
				b[1] = tmarr[1];
				b[2] = tmarr[0];
				if (!gotfirst) {
					b[3]=128;
					gotfirst = true;
				}
				b.set(a, 4);
				blocks.push(b);
				if (tmstamp === last_time){
					Y&&Y(blocks);
					encoder.flush();
				}
			},
			error:e=>{
				cerr(e)
			},
		});//»
		let {supported} = await VideoEncoder.isConfigSupported(config);
		if (!supported) {
			cerr("UNSUPPORTED CONFIG!");
cerr("UNSUPPORTED CONFIG!");
			Y();
			return;
		}
		encoder.configure(config);
		let didone = false;
		for (let fr of video_frames) {
			if (fr.timestamp < cutoff) {
				fr.close();
				continue;
			}
			encoder.encode(fr, {keyFrame: !didone});
			didone = true;
			fr.close();
		}

	};//»
	doencode();
};//»
this.encode_image_data = encode_image_data;

const get_cluster_from_video_blocks=(blocks, cutoff, vid_width, vid_height, vid_codec, vid_codec_desc)=>{//«
return new Promise(async(Y,N)=>{

	let tmdiff;
	let chunks=[];
	let didone=false;
	for (let b of blocks){
		let t;
		let tm = toint([b[1],b[2]])*1000;
		if (!didone) {
			t = "key";
			tmdiff = tm;
		}
		else t = "delta";
		let ch = new EncodedVideoChunk({
			timestamp: tm,
			type: t,
//			duration: 1000,
			data: b.slice(4)
		});
		didone = true;
		chunks.push(ch);
	}

	let num = chunks.length;
	let lasttime = chunks[num-1].timestamp;
	let frames = [];
let didlog = false;
	const init = {//«
		output: async fr =>{
			let b = new Uint8Array(fr.allocationSize());
if (!didlog){
log(b);
didlog = true;
}
			fr.copyTo(b);
			fr.close();
	let imdat = new ImageData(vid_width, vid_height);
	imdat.data.set(b);
	let nfr = new VideoFrame(await createImageBitmap(imdat), {timestamp: fr.timestamp});
	frames.push(nfr);
	if (fr.timestamp>=lasttime) {
		encode_image_data(frames, vid_codec, vid_width, vid_height, cutoff, Y);
	}
		},
		error: (e) => {
			cerr(e.message);
		}
	};//»

//	const config={codec:vid_codec,codedWidth:vid_width,codedHeight:vid_height, description: vid_codec_desc};

	const config={codec:vid_codec,codedWidth:vid_width,codedHeight:vid_height};

try{
	const { supported } = await VideoDecoder.isConfigSupported(config);
if (!supported){
log(config);
cerr("Config not supported");
Y();
return;
}
}catch(e){
log(e);
log(config);
//cerr("Config not supported");
Y();
return;
};
//log("SUPPORTED", supported);
	const decoder = new VideoDecoder(init);
	decoder.configure(config);
	for (let ch of chunks) decoder.decode(ch);

});

};//»

const make_image_from_bytes=async bytes=>{//«
	let w = await Core.Desk.api.openApp("None");
	let m = w.main;
	let can = Core.api.mk('canvas');
	let ctx = can.getContext('2d');
	can.width=480;
	can.height=360;
	m.add(can);
	let imdat = ctx.createImageData(480, 360);
	imdat.data.set(bytes,0);
	ctx.putImageData(imdat,0,0);
};//»
const make_cluster_elem_from_blocks=(timestamp, blocks)=>{//«
	let all=[];
	for (let b of blocks){
		all.push(make_ebml_elem([0xa3], b));
	}
	let tot=0;
	for (let bl of all) tot+=bl.length;
	let allblocks = new Uint8Array(tot);
	let cur=0
	for (let bl of all){
		allblocks.set(bl,cur);
		cur+=bl.length;
	}

	let clustertimecode_elem = make_ebml_elem([0xe7], num_to_arr(timestamp));
	let cluster_data = new Uint8Array(clustertimecode_elem.length+allblocks.length);
	cluster_data.set(clustertimecode_elem, 0);
	cluster_data.set(allblocks, clustertimecode_elem.length);
	return make_ebml_elem([0x1f, 0x43, 0xb6, 0x75], cluster_data);
};

//»
this.make_cluster_elem_from_blocks = make_cluster_elem_from_blocks;
const new_clusters_data = (b, timestamp_diff)=>{//«
	let c=0;
	let iter=0;
	let sizes=[];
	let times=[];
	while (true) {
		if (iter > 1000000) return cerr("INFINITTEEEEE!!!!!");
		if (!(b[c]==0x1f&&b[c+1]==0x43&&b[c+2]==0xb6&&b[c+3]==0x75)) {
//Cues == 1c53bb6b
			if (b[c]==0x1c&&b[c+1]==0x53&&b[c+2]==0xbb&&b[c+3]==0x6b) {
				return {sizes: sizes, times: times, data:b};
			}

log(tohex(b.slice(c, c+20)));
			return `Cluster ID NOT found @${c} (iter=${iter})`;
		}
		let rv = ebml_sz(b, c+4);
		if (b[rv[1]]!==0xe7) return `Cluster Timecode NOT found @${rv[1]}`;
		let from=rv[1]+1;
		let r = ebml_sz(b, from);
//log(timemult*(toint(b.slice(r[1], r[0]+r[1])) - start_timestamp));
		let tm = toint(b.slice(r[1], r[0]+r[1])) - timestamp_diff;
		times.push(tm);
		let new_time_arr = num_to_arr(tm, r[0]);
		b.set(new_time_arr, r[1]);
		let new_c = rv[0]+rv[1];
		sizes.push(new_c - c);
		c=new_c;
		if (c >= b.length) break;
		iter++;
	}
	return {sizes: sizes, times: times, data:b};
};//»
const get_section_pos_of_webm_file=(id, bytes)=>{//«

	let a = bytes;
	if (!(a[0]==0x1a&&a[1]==0x45&&a[2]==0xdf&&a[3]==0xa3)) return "EBML header not found";

	let rv = ebml_sz(a, 4);

	let c = rv[0]+rv[1];
	if (!(a[c] == 0x18 && a[c+1] == 0x53 && a[c+2] == 0x80 && a[c+3] == 0x67)) return "Segment ID not found";
	c+=4;rv = ebml_sz(a, c);c = rv[1];
	let segment_start = c;
	//const SEEKHEAD_ID = "114d9b74";
	if (!(a[c] == 0x11 && a[c+1]==0x4d && a[c+2] == 0x9b && a[c+3] == 0x74)) {
		if (a[c] == id[0] && a[c+1]==id[1] && a[c+2] == id[2] && a[c+3] == id[3]) {
			return {
				offset: segment_start,
				value: 0
			};
		}
		return "SeekHead ID not found";
	}
	rv = ebml_sz(a, c+4);

	{//SeekHead
		let bytes = a.slice(c, rv[0]+rv[1]);
		let sect = parse_section(bytes, SEGMENT)[1];
		for (let i=0; i < sect.length; i+=2){
			let ent = sect[i+1];
			if (ent[1][0] == id[0] && ent[1][1] == id[1] && ent[1][2] == id[2] && ent[1][3] == id[3]){
				return {
					offset: segment_start,
					value: toint(ent[3])
				}
//				return toint(ent[3])+segment_start;
			}
		}
	}

};//»
const get_timing_of_webm_file=(bytes)=>{//«
	let duration = null; 
	let timecodescale = null;
	let a = bytes;
	let rv = get_section_pos_of_webm_file([0x15,0x49,0xa9,0x66], bytes);
	if (!rv) return "Could not get the Info position from the file";
	if (isstr(rv)) return rv;
	let c = rv.offset + rv.value;
	if (!(a[c] == 0x15 && a[c+1] == 0x49 && a[c+2]==0xa9 && a[c+3]==0x66)) return "Info ID not found";
	rv = ebml_sz(a, c+4);
	{//Info
		let bytes = a.slice(c, rv[0]+rv[1]);
		let sect = parse_section(bytes, SEGMENT)[1];
//log(sect);
//dump_hex_lines(bytes);
		for (let i=0; i < sect.length; i+=2){
			if (sect[i].match(/^DURATION/)) duration = tofloat(sect[i+1]);
			else if (sect[i].match(/^TIMECODESCALE/)) timecodescale = toint(sect[i+1]);
		}
	}
//log(timecodescale, duration);
//	if (!(duration && timecodescale)) return "duration/timecodescale not found";
	return {
		duration: duration,
		timeCodeScale: timecodescale
	}
};//»
const num_to_ebml=n=>{//«
	if (n > 260000000){
		cerr(`The number is out of range (want <= 260000000)`);
		return;
	}
	let a = Array.from(new Uint8Array((new Uint32Array([n])).buffer).reverse());
	a[0]|=0x10;
	return a;
};//»
const make_ebml_elem=(tag, dat)=>{//«
	let sz = num_to_ebml(dat.length);
	let elem = new Uint8Array(tag.length+sz.length+dat.length);
	elem.set(tag,0);
	elem.set(sz, tag.length);
	elem.set(dat, tag.length+sz.length);
	return elem;
};
this.make_ebml_elem = make_ebml_elem;
//»
const add_sz_marker=(a, l)=>{//«
	if (l==8) a[0]|=0x1;
	else if (l==7) a[0]|=0x2;
	else if (l==6) a[0]|=0x4;
	else if (l==5) a[0]|=0x8;
	else if (l==4) a[0]|=0x10;
	else if (l==3) a[0]|=0x20;
	else if (l==2) a[0]|=0x40;
	else if (l==1) a[0]|=0x80;
};//»
const path_to_val = (bytes, qstr, fmt)=> {//«

let qarr = qstr.split("\/");
if (!qarr[0]) qarr.shift();

let marr = [];
let curobj = WebmTags;
let curid;
let rv;

let subscript;
let getall=false;
let getlast=false;
let getfromend=null;
while (qarr.length) {
	let q1 = qarr.shift();
//log(q1);
	let arrnum=null;
	let bracks = q1.match(/^(.+)\[(\d*|f(\-\d+)?)\]$/);
//log(bracks);
	if (bracks){
//log(bracks);
		q1 = bracks[1];
		let br2 = bracks[2];
		let br3 = bracks[3];
		if (br3){
//log("BR3",br3);
			getfromend = parseInt(br3);
			getlast = false;
//log(getfromend);
		}
		else if (br2==="") getall=true;
		else if (br2==="f") {
			getlast = true;
		}
//		else 
		arrnum = parseInt(bracks[2]);
	}
	try {
	rv = parse_section_flat(bytes, curobj);
	}
	catch(e){
		return "Parse error";
	}
	let ids=[];
	for (let i=0; i < rv.length - 1; i+=2){
		if ((new RegExp("^.*"+q1+".*:","i")).test(rv[i])) {
			ids.push(rv[i]);
			curid = rv[i].split(":").pop();
			marr.push(rv[i+1]);
		}
	}
	if (!marr.length) return `No matches!`;
	subscript = 0;
	if (marr.length > 1) {
		if (arrnum===null) {
			return `Multiple matches(${marr.length}): ${q1}`;
		}

		if (arrnum >= marr.length) return `The requested array value(${arrnum}) is out of bounds [0-${marr.length-1}]`;
		if (getall) {
			if (qarr.length) return "Invalid query (all==true)";
			return marr;
		}
		if (getlast) subscript = marr.length - 1;
		else if (Number.isFinite(getfromend)){
subscript = marr.length - 1 + getfromend;
//log("SUBSCRIPT", subscript);
if (subscript < 0) {
cwarn("Subscript was negative", subscript);
	subscript = 0;
}
//log(s);
		}
		else subscript = arrnum;
	}

	if (qarr.length) {
		if (!curobj.kids) {
log(curobj);
			return "The current object has no kids!";
		}
		curobj = curobj.kids[curid];
		bytes = marr[subscript];
		marr=[];
	}
}

{

let val = marr[subscript];
//if (val.length > 8)
if (fmt==="int") {
	if (val.length > 8) return `Does not appear to be an 'int' (size==${val.length})`;
	return toint(val);
}
if (fmt=="float") {
	if (val.length > 8) return `Does not appear to be a 'float' (size==${val.length})`;
try {
	return tofloat(val);
}
catch(e){
return e.message;
}
}
if (fmt=="hex") return [tohex(val)];
if (fmt=="str") return [tostr(val)];
return val;

}

}//»
const tostr=(arr)=>{//«
	let s='';
	for (let code of arr) s+=String.fromCharCode(code);
	return s;
};//»
const tohex=(arr, line_w)=>{//«
	return to_hex_lines(arr, line_w);
};//»
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
}
this.toInt = toint;
//»
const to_hex_str=(arr, max_len)=>{//«
	let str = '';
	let len = arr.length;
	if (max_len) len = max_len;
	for (let i=0; i < len; i++) str = str + arr[i].toString(16).padStart(2, "0");
	return str;
};//»
const to_hex_lines=(arr, line_w)=>{//«
	if (!line_w) line_w = 20;
//	let line_w = 20;
	let str = '';
	for (let i=0; i < arr.length; i++) {
		str = str + arr[i].toString(16).padStart(2, "0") + " ";
		if (!((i+1)%line_w)) str+="\n";
	}
	return str;
}//»
const dump_hex_lines=(arr, line_w)=>{//«
log(to_hex_lines(arr));
}
this.dump_hex_lines = dump_hex_lines;
//»
const num_to_arr=(num, want_size)=>{//«
	let a = Array.from(new Uint8Array((new Uint32Array([num])).buffer).reverse());
	if (want_size && a.length === want_size) return a;
	if (!a[0]) a.shift();
	if (want_size && a.length === want_size) return a;
	if (!a[0]) a.shift();
	if (want_size && a.length === want_size) return a;
	if (!a[0]) a.shift();
	return a;
};
this.num_to_arr = num_to_arr;
//»
const str_to_arr = (s)=>{//«
	let out = new Uint8Array(s.length);
	for (let i=0; i < s.length; i++) out[i]= s[i].charCodeAt();
	return out;
};//»
const num_to_ebml_arr=(num, want_size)=>{//«
	let arr = num_to_arr(num, want_size);
	add_sz_marker(arr, want_size);
	return arr;
};//»
const int_to_ebml=num=>{//«
	let n;

	if (num < 0) throw new Error(`Invalid number`);
	if (num < 127) return [0x80 | num];
	else if (num < 256) return [ 0x40, num];
	if (num < 65536) n = 0x20;
	else if (num <16777216) n = 0x10;
	else if (num < 4294967296) n = 0x08;

	if (!n) throw new Error(`Invalid number`);

	let a = num_to_arr(num);
	a.unshift(n);

	return a;

};//»
const get_chunk=(arr, timemult, starttm)=>{//«

const set_len=()=>{
	let a = new Uint8Array((new Uint32Array([last-12])).buffer);
//log("LEN", a);
	out[8] = a[3];
	out[9] = a[2];
	out[10] = a[1];
	out[11] = a[0];
};
if (!arr.length) return;
//log(arr);
let out = new Uint8Array(200000);
out[0] = 0x1f;//CLUSTER_ID
out[1] = 0x43;//   |
out[2] = 0xb6;//   |
out[3] = 0x75;//   v
out[4] = 1;// 4->11 has the cluster length
out[12] = 0xe7;//CLUSTERTIMECODE
out[13] = 132;//Length = 4
//out[13]=1;//Use 8 bytes
{
//let a = new Uint8Array((new Uint32Array([starttm])).buffer);
let usetime;
if (!starttm) usetime=1;
else usetime = starttm;
//let a = new Uint8Array((new Uint32Array([starttm])).buffer);
let a = new Uint8Array((new Uint32Array([usetime])).buffer);
//log(a);
out[14] = a[3];
out[15] = a[2];
out[16] = a[1];
out[17] = a[0];
}
//log("Start", starttm);
let last=18;
//1f43b675
//a3
let curtm = 0;
for (let i=0; i < 1000; i+=2) {
	let tm = arr.shift();
	let dat = arr.shift();
	if (!tm) {
//log(i, curtm);
		set_len();
		return [out.slice(0, last), curtm];
	}
	let ln = dat.length;
	out.set([0xa3], last);
	last++;
	let a = int_to_ebml(ln);
try {
//log(a);
	out.set(a, last);
}
catch(e){
cerr("Out of bounds?", last);
return;
}
	last+=a.length;
//	let a = new Uint8Array((new Uint32Array([ln])).buffer)
//	out.set([0xa3, 1, 0, 0, 0, a[3], a[2], a[1], a[0]], last);
//	last+=9;
//log(curtm);
	let b = new Uint8Array((new Uint16Array([curtm])).buffer);
	dat.set([b[1], b[0]], 1);
try {
	out.set(dat, last);
}
catch(e){
cerr("Out of bounds?", last);
return;
}

//	out.set(dat, last);

	last+=ln;
	curtm+=Math.round(tm/timemult);
}
set_len();
return [out.slice(0, last), curtm];


};//»
const parse_section=(buf, par, iter, done, if_in_unknown, cur_rv_1)=>{//«
	if (!done) done = false;
	if (!iter) iter=0;
	if (done) return;
	iter++;
	if (iter>10000) {
		cerr("Inifite loop?");
		return;
	}
let c=0;
let flen = buf.length;
let rv;
let kids = [];
if (par.id === "TRACKS") kids._bytes = buf;
while(1){
	if (done) return kids;
	iter++;
	if (iter>10000) {
		cerr("Inifite loop?");
		return;
	}

	let s;
	try{
		s=buf[c].toString(16);
	}
	catch(e){
		if (if_in_unknown||(par.id=="WebmTags"&&c>=0xffffffffffffff)) {
			return kids;
		}
cerr(`Read error @${c} in ${par.id} (${if_in_unknown})`);
dump_hex_lines(buf);
		done=true;
		return;
	}
	let ch = s[0];
	let n;

	if (ch=="1"){n=4;}
	else if (ch.match(/[23]/)){n=3;}
	else if (ch.match(/[4-7]/)){n=2;}
	else n=1;
	rv=gethex(buf, c, n);
	let kid = par.kids[rv];
	if (rv=="ec"){
	}
	else if (!kid){
if (if_in_unknown){
if (par.id=="CLUSTER" && rv == "1f43b675") {
kids._nextByte = c;
}
return kids;
}
		if (!no_error) cerr(`Invalid id (${rv}) in ${par.id} @${c} (${if_in_unknown})`);
		return;
	}
	c+=n;
	let id = rv;
	if (!(rv = ebml_sz(buf,c))) return;
if (!rv[0]){
if (!no_error) cerr(`Got 0 length payload for id=${id}`);
return;
}
	let is_unknown = rv[0] == 0x100000000000000;
	let bytes = buf.slice(rv[1],rv[0]+rv[1]);
	if (kid) {//If not "Void" (0xec)
		kids.push(`${kid.id}:${id}`);
		if (kid.kids) {
			let sect = parse_section(bytes, kid, iter, done, is_unknown, rv[1]);
			if (!sect) return;
if (debug_section) {
log(sect);
}
			kids.push(sect);
			if (sect._nextByte){
				if (id == "1f43b675") {
					c = rv[1]+sect._nextByte;
					delete sect._nextByte;
					continue;
				}
			}
		}
		else {
			kids.push(bytes);
		}

	}
	c=rv[0]+rv[1];
	if (c==flen) break;
}	
return kids;
};
this.parse_section = parse_section;
//»
const parse_section_flat=(buf, par, iter, done)=>{//«
	if (!done) done = false;
	if (!iter) iter=0;
	if (done) return;
	iter++;
	if (iter>10000) {
		cerr("Inifite loop?");
		return;
	}
let c=0;
let flen = buf.length;
let rv;
let kids = [];
//log();
//if (par.id === "TRACKS") kids._bytes = buf;
while(1){
	if (done) return kids;
	iter++;
	if (iter>10000) {
		cerr("Inifite loop?");
		return;
	}

	let s;
	try{
		s=buf[c].toString(16);
	}
	catch(e){
		cerr(`Read error @${c} in ${par.id}`);
		done=true;
		return;
	}
	let ch = s[0];
	let n;

	if (ch=="1"){n=4;}
	else if (ch.match(/[23]/)){n=3;}
	else if (ch.match(/[4-7]/)){n=2;}
	else n=1;
	rv=gethex(buf, c, n);
	let kid = par.kids[rv];
	if (rv=="ec"){
	}
	else if (!kid){
		if (!no_error) cerr(`Invalid id (${rv}) in ${par.id} @${c}`);
		return;
	}
	c+=n;
	let id = rv;
	if (!(rv = ebml_sz(buf,c))) return;
	if (!rv[0]){
		if (!no_error) cerr(`Got 0 length payload for id=${id}`);
		return;
	}
	let bytes = buf.slice(rv[1],rv[0]+rv[1]);
	bytes._bytes = buf.slice(c-n, rv[0]+rv[1]);
	if (kid) {//If not "Void" (0xec)
		kids.push(`${kid.id}:${id}`);
		kids.push(bytes);
//		if (kid.kids) kids.push(bytes.length);
//		else kids.push(bytes);
	}
	c=rv[0]+rv[1];
	if (c==flen) break;
}	
return kids;
};
this.parse_section_flat = parse_section_flat;
//»
const ebml_sz = (buf, pos)=>{//«
	let nb;
	let b = buf[pos];

//xxxxxxxx
	if (b&128) {nb = 1; b^=128;}
	else if (b&64) {nb = 2;b^=64;}
	else if (b&32) {nb = 3;b^=32;}
	else if (b&16) {nb = 4;b^=16;}
	else if (b&8) {nb = 5;b^=8;}
	else if (b&4) {nb = 6;b^=4;}
	else if (b&2) {nb = 7;b^=2;}
	else if (b&1) {nb = 8;b^=1;}
	let str = "0x"+(b.toString(16));
	let end = pos+nb;
//	if (end>=buf.length) {
//		cerr(`Invalid ebml size @${pos}`);
//		return false;
//	}
	let ch; 
	for (let i=pos+1; i < end; i++) {
		ch = buf[i].toString(16);
		if (ch.length==1) ch = "0"+ch;
		str = str + ch;
	}   
	return [parseInt(str), end]
}
this.ebml_sz = ebml_sz;
//»
const arr2text=(arr)=>{//«
	let ret="";
	for (let i=0; i < arr.length; i++) {
		let code = arr[i];
		if (code===0) ret+=" ";
		else ret+=String.fromCharCode(code);
	}
	return ret;
}//»
const hex2text=(val)=>{//«
	let ret="";
	for (let j=0; j < val.length; j+=2) ret+=String.fromCharCode(parseInt("0x"+val.slice(j,j+2)));
	return ret;
}//»
const hexeq=(bufarg, start, offset, strarg, if_nowarn)=>{//«
	var arr =Array.prototype.slice.call(bufarg.slice(start,start+offset));
	var ret = arr.map(x=>{
		let s = ""+x.toString(16);
		if (s.length == 1) return "0"+s;
		return s;
	});
	var str = ret.toString().replace(/,/g,"");
	return (strarg===str);
}//»
const gethex=(bufarg, start, offset, if_fmt)=>{//«
	var arr =Array.prototype.slice.call(bufarg.slice(start,start+offset));
	var ret = arr.map(x=>{
		let s = ""+x.toString(16);
		if (s.length == 1) return "0"+s;
		return s;
	});
	let raw = ret.toString().replace(/,/g,"");
	let ret_str="";
	if (!if_fmt) ret_str = raw;
	else {
		for (let i=0; i < raw.length; i+=2) ret_str += raw[i]+raw[i+1]+" ";
	}
	return ret_str;
}//»
const read_1byte_int=(bufarg, offset)=>{return parseInt("0x"+gethex(bufarg, offset, 1));}
const read_2byte_int=(bufarg, offset)=>{return parseInt("0x"+gethex(bufarg, offset, 2));}
const read_4byte_int=(bufarg, offset)=>{return parseInt("0x"+gethex(bufarg, offset, 4));}
const read_8byte_int=(bufarg, offset)=>{return parseInt("0x"+gethex(bufarg, offset, 8));}
const read_nbyte_int=(n, bufarg, offset)=>{//«
	if (n===1) return read_1byte_int(bufarg, offset);
	if (n===2) return read_2byte_int(bufarg, offset);
	if (n===4) return read_4byte_int(bufarg, offset);
	if (n===8) return read_8byte_int(bufarg, offset);
};//»
//function read_4byte_float(bufarg, offset){return parseFloat("0x"+gethex(bufarg, offset, 4));}
//»

//«
const UINT_ONE = new Uint8Array([1]);
const TRACK_ONE_ELEM = make_ebml_elem([0xf7], UINT_ONE);
const TRACK_ONE_ELEM_LEN = TRACK_ONE_ELEM.length;
//»

this.coms={//«
	play: PLAYMEDIA,
	cut: CUTWEBM,
	remux: REMUX,
	parse: PARSE
};//»

//COMS[comarg](args);

}//»





/*«

const reencode_from_video_file = (path, start, end, shell_funcs={}) =>{//«
return new Promise(async(Y,N)=>{

	const canplay=()=>{return new Promise((Y,N)=>{video.oncanplay=Y;});};
	const drawingLoop = async(timestamp, frame) => {//«
		ctx.drawImage(await createImageBitmap(video), 0, 0);
		let tm = video.currentTime;
		if (start_time === null) start_time = tm;
		video_frames.push(new VideoFrame(canvas, { timestamp: 1000000 * (tm - start_time) }));
		wclerr(`Extracted ${video_frames.length} frames`);
		if(video.currentTime >= end) {
			video.pause();
			return doencode();
		}
		video.requestVideoFrameCallback(drawingLoop);
	};//»
	const doencode=async()=>{//«
//AHYBDHNT
		let config={
			codec: "vp8",
			width: w,
			height: h,
			bitrate: 1_000_000,
			framerate: 30
		};
		let gotfirst = false;
		const encoder = new VideoEncoder({//«
			output:e=>{
				let a = new Uint8Array(e.byteLength);
				let tm = Math.round(e.timestamp/10**3);
				let tmarr = new Uint8Array((new Uint16Array([tm])).buffer);
				e.copyTo(a);
				let b = new Uint8Array(a.length+4);
				b[0] = 129;
				b[1] = tmarr[1];
				b[2] = tmarr[0];
				if (!gotfirst) {
					b[3]=128;
					gotfirst = true;
				}
				b.set(a, 4);
				blocks.push(b);
				wclerr(`Encoded ${blocks.length}/${video_frames.length} frames (${Math.round(blocks.length/video_frames.length)}%)`);
				if (blocks.length === video_frames.length){
					wclerr(`Encoded ${blocks.length}/${video_frames.length} frames (100%)`);
					Y(blocks);
					encoder.flush();
				}
			},
			error:e=>{
				cerr(e)
			},
		});//»
		let {supported} = await VideoEncoder.isConfigSupported(config);
		if (!supported) {
			cerr("UNSUPPORTED CONFIG!");
cerr("UNSUPPORTED CONFIG!");
			Y();
			return;
		}
		encoder.configure(config);
		let iskey = true;
		cerr(" ");
		for (let fr of video_frames) {
			encoder.encode(fr, {keyFrame: iskey});
			fr.close();
			iskey=false;
		}

	};//»

	let start_time = null;
	let video_frames = [];
	let blocks = [];

	const{cerr,wclerr}=shell_funcs;
	if (!cerr) cerr=NOOP;
	if (!wclerr) wclerr=NOOP;

	let video = Core.api.mk('video');
	let canvas = Core.api.mk("canvas");
	let ctx = canvas.getContext('2d');;

	video.volume = 0;
	video.src = Core.fs_url(path);
	video.currentTime = start;
	await canplay();

	let w = video.videoWidth;
	let h = video.videoHeight;
	canvas.width = w;
	canvas.height = h;
	cerr(" ");

	video.play();
	video.requestVideoFrameCallback(drawingLoop);

});
};//»

const get_images_from_muxed_blocks=async blocks=>{//«

	let didone=false;
	let chunks=[];

	for (let b of blocks){
		if (b[0]===130) continue;
		let t;
		if (!didone) t = "key";
		else t = "delta";
		let tm = toint([b[1],b[2]])*1000;
		let ch = new EncodedVideoChunk({
			timestamp: tm,
			type: t,
			data: b.slice(4)
		});
		didone = true;
		chunks.push(ch);
	}

	let num = chunks.length;
	let lasttime = chunks[num-1].timestamp;
	let frames = [];
	const init = {
		output: async fr=>{
			let b = new Uint8Array(fr.allocationSize());
			fr.copyTo(b);
			let imdat = new ImageData(480, 360);
			imdat.data.set(b);
			let nfr = new VideoFrame(await createImageBitmap(imdat), {timestamp: fr.timestamp});
			frames.push(nfr);
			if (fr.timestamp===lasttime) encode_image_data(frames);
			fr.close();
		},
		error: (e) => {
			cerr(e.message);
		}
	};

	const config={codec:"vp8",codedWidth:480,codedHeight:360};

	const { supported } = 
	await VideoDecoder.isConfigSupported(config);
	const decoder = new VideoDecoder(init);
	decoder.configure(config);
	for (let ch of chunks) decoder.decode(ch);

};//»

let _;//«
let getkeys = Core.api.getKeys;
_=Core;
let log = _.log;
let cwarn = _.cwarn;
let cerr = _.cerr;
let xget = _.xget;

let globals = _.globals;
if (!globals.audio) Core.api.mkAudio();

let audio_ctx = globals.audio.ctx;
let util = globals.util;
_ = util;
let strnum = _.strnum;
let isnotneg = _.isnotneg;
let isnum = _.isnum;
let ispos = function(arg) {return isnum(arg,true);}
let isneg = function(arg) {return isnum(arg,false);}
let isid = _.isid;
let isarr = _.isarr;
let isobj = _.isobj;
let isint = _.isint;
let isstr = _.isstr;
let isnull = _.isnull;
let make = _.make;
let iseof=Core.api.isEOF;
//let fs = globals.fs;

let fs_url = Core.fs_url;
let aumod=null;
//»

const {NS}=Core;
const {jlog}=Core.api;

const fs = NS.api.fs;

const {//«
	pathToNode,
	wclerr,
	normpath,
	arg2con,
	get_reader,
	refresh,
	respbr,
	woutobj,
	read_stdin,
	cerr,
	failopts,
	cbok,
	termobj,
	cerr,
	wout,
	ptw,
	read_file_args_or_stdin,
	set_obj_val
} = Shell;//»
»*/

