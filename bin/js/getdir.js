const fs = require('fs');
const path = require('path');

const log=(...args)=>{console.log(...args)};

const allFilesSync = (dir, fileList = []) => {//«
	fs.readdirSync(dir).forEach(file => {
		if (!file.match(/^\./)) {
			try {
					let filePath = path.join(dir, file)
					let stats = fs.statSync(filePath);
					let isdir = stats.isDirectory();
					if (isdir) fileList.push(file, allFilesSync(filePath));
					else {
						fileList.push(`${file}/${stats.size}`);
					}
			}catch(e){}
		}		
	})
	return fileList;
}//»

let args = process.argv;
args.shift();
args.shift();
let gotpath = args.shift();
if (gotpath) log(JSON.stringify(allFilesSync(gotpath)));


