# Linux on the Web (LOTW)

Linux used to be fun because expectations were low and possibilities were high. 
The online communities that gathered around it were truly pleasurable to be a part of.
I hope to bring those same feelings back in the context of web development.

Although this project includes a desktop environment, it is not primarily
"about" that.  It is mainly about the idea that modern browsers now offer a
programmatically accessible file system that exists within a domain-specific
sandbox. 
<a href="https://linuxontheweb.github.io/docs/what-it-is.html">Go here</a> to read
more.

Try out the current version at 
<a href="https://linuxontheweb.github.io">linuxontheweb.github.io</a>.

## Local deployment

Locally deploying LOTW is as simple as simple can be. All you need to do is run
a web server in the root of the project directory. On Linux, this command
should suffice for most people:

	python3 -m http.server

You should then be able to visit the site at http://localhost:8000.

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

