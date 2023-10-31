

import { util, api as capi } from "util";
import { globals } from "config";

//export const app = function(arg) {
export const app = function(Win, Desk) {

//Imports«


const{fs}=globals;
const{log,cwarn,cerr, make,mkdv,mk,mksp}=util;
const Main = Win.main;
Win.makeScrollable();
//const Win = Main.top;

//»

//Var«

const BADTAGS = ["SCRIPT","IFRAME"];

//»

//DOM«

Main._over="auto";
//Main._bgcol="#fff";
Main.style.userSelect="text";

//»

//Funcs«

const init=()=>{//«
}//»

//»

//OBJ/CB«

this.onappinit=()=>{};

this.onloadfile=bytes=>{//«
	let text = capi.bytesToStr(bytes);
	let parser = new DOMParser();
	let doc = parser.parseFromString(text, "text/html");
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
	Main.innerHTML = doc.body.innerHTML;
	Win.status_bar.innerHTML = `${tot} nodes deleted`;
};//»

this.onkeydown = function(e,s) {//«
}//»
this.onkeyup=(e)=>{//«
};//»
this.onkeypress=e=>{//«
};//»
this.onkill = function() {//«
}//»
this.onresize = function() {//«
}//»
this.onfocus=()=>{//«
}//»

this.onblur=()=>{//«
}//»

//»

}

