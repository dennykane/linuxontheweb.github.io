import { util, api as capi } from "/sys/util.js";
import { globals } from "/sys/config.js";

const{log,cwarn,cerr, make}=util;

export const app = function(Win, Desk) {

const {main} = Win;

main._tcol="#ccc";
main._overy="scroll";
main.style.userSelect="text";
main._fs=18;

const init=async()=>{//«
	let rv = await fetch('/www/docs/help.html');
	if (!rv.ok){
cerr("Could not fetch the html!!!");
		return;
	}
	let html = await rv.text();
	let arr = html.split("\n");
	let start = arr.shift();
	let end = arr.pop();
	if (!end) end = arr.pop();
	main.innerHTML = arr.join("\n");
};//»

this.onappinit = init;

Win.makeScrollable();

}

