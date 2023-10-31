import { util, api as capi } from "/sys/util.js";
import { globals } from "/sys/config.js";

const{log,cwarn,cerr, make}=util;

export const app = function(Win, Desk) {

const HELP_URL = '/www/docs/help.html';

const {main} = Win;

Win.makeScrollable();
main.style.userSelect="text";
main._fs=18;

const init=async()=>{//«
	let rv = await fetch(HELP_URL);
	if (!rv.ok){
cerr("Could not fetch the html!!!");
		return;
	}
	let parser = new DOMParser();
	let doc = parser.parseFromString(await rv.text(), "text/html");
/*This is what the HTML app does (if we ever put a script onto the help page)«
	const BADTAGS = ["SCRIPT","IFRAME"];
	let tot=0;
	for (let tag of BADTAGS){
		let arr = Array.from(doc.body.getElementsByTagName(tag));
		let iter=0;
		while (arr.length) {
			tot++;
			let node = arr.shift();
			node.parentNode.removeChild(node);
		}
	}
»*/
	main.innerHTML = doc.body.innerHTML;

};//»

this.onappinit = init;


}

