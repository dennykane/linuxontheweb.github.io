# Linux on the Web (LOTW)

<p align="center">
<img src="https://raw.githubusercontent.com/linuxontheweb/linuxontheweb.github.io/main/www/lotw256.png">
</p>

Linux used to be fun because expectations were low and possibilities were high. 
The online communities that gathered around it were truly pleasurable to be a part of.
I hope to bring those same feelings back in the context of web development.

Although this project includes a desktop environment, it is not primarily
about that.  It is mainly about the idea that modern browsers now offer a
programmatically accessible file system that exists within domain-specific
"sandboxes."
<a href="https://linuxontheweb.github.io/docs/what-it-is.html">Go here</a> to read
more.

<a href="https://linuxontheweb.github.io/docs/help.html">Here</a> is the 
official help page for using the system.


Try out the current version at 
<a href="https://linuxontheweb.github.io">linuxontheweb.github.io</a>.

## Local deployment

Locally deploying LOTW is as simple as simple can be. All you need to do is run
a web server in the root of the project directory. On Linux, this command
should suffice for most people:

	python3 -m http.server

You should then be able to visit the site at http://localhost:8000.
You can optionally specify a custom port number like so:

	python3 -m http.server 12345

The site should then be live at http://localhost:12345.

## Viewing and editing source files

vim is the recommended text editor, mainly because of the ability to 
enable row folding via the manual insertion of markers. The instructions below 
are specific to vim's runtime configuration file, .vimrc.

### Enabling row folding

Since the files in this repository can be quite large, row folding is an
essential feature of the development side of LOTW. So, to browse the source code
as intended, the following lines must be included in your .vimrc:

	set foldmethod=marker
	set foldmarker=«,»
	set foldlevelstart=0

To quickly toggle between opened and closed row folds with the Enter key, add this line:

	nmap <enter> za


### Inserting fold markers
These are for easily inserting fold markers into the code file (from both normal and insert mode).

To insert an open fold marker, invoked with Alt+o, add these lines:

	execute "set <M-o>=\eo"
	nnoremap <M-o> a//«<esc>
	inoremap <M-o> //«

To insert a close fold marker, invoked with Alt+c, add these lines:

	execute "set <M-c>=\ec"
	nnoremap <M-c> a//»<esc>
	inoremap <M-c> //»

To insert both an open and close fold marker, with a space in between,
invoked with Alt+f, add these lines:

	execute "set <M-f>=\ef"
	nnoremap <M-f> a//«<enter><enter>//»<esc>
	inoremap <M-f> //«<enter><enter>//»

