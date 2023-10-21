const PORT = 8000;
const HOST = "localhost";

//«
const fs = require('fs');
const fsprom = require('node:fs/promises');
const https = require('https');
const http = require('http');

const log=(...args)=>{console.log(...args);};
//»

const EXT_TO_MIME = {//«
	js: "application/javascript",
	json: "application/javascript",
	html: "text/html",
	css: "text/css",
	txt: "text/plain",
	mp4: "video/mp4",
	webm: "video/webm",
	png: "image/png",
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	gif: "image/gif",
	ico: "image/vnd",
	gz: "application/gzip",
	wav: "audio/wav"
}//»
const DEF_MIME = "application/octet-stream";

const handler = async(req, res) => {//«

	const ok = () => {res.writeHead(200, {'Content-Type': mime});};
	const no = arg => {//«
		res.writeHead(404, {'Content-Type': "text/plain"});
		if (arg) res.end(`Error: ${arg}\n`);
		else res.end("Error\n");
	};//»

	let url_parts = req.url.split("?");//«
	let url = url_parts[0];
	let path;
	let args={};
	if (url_parts[1]) {
		let args_arr = url_parts[1].split("&");
		for (let arg of args_arr){
			let ar = arg.split("=");
			args[ar[0]] = ar[1];
		}
	}
	if (url=="/") path = "./index.html";
	else path = `.${url}`;
	let ext = path.split(".").pop();
	let mime;
	if (!ext) mime = DEF_MIME;
	else mime = EXT_TO_MIME[ext.toLowerCase()];
	if (!mime) mime = DEF_MIME;
//»

	if (args.start && args.end) {//«
		let si = parseInt(args.start);
		let ei = parseInt(args.end);
		let diff = ei - si;
		if (Number.isFinite(diff) && diff > 0) {
			let buf = new Uint8Array(diff);
			let fd = await fsprom.open(path);
			let rv = await fd.read(buf, {position: si, length: diff});
			fd.close();
			ok();
			res.end(rv.buffer);
		}
		else{
			no("Bad range");
		}
	}//»
	else {//«
		ok();
		res.end(fs.readFileSync(path));
	}//»

};//»

http.createServer(handler).listen(PORT, HOST);
log(`Listening on ${HOST}:${PORT}`);


