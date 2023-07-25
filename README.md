# Linux on the Web (LOTW)

## FYI

Since I am only one person, and I mainly like working with Chromebooks [1], 
this project is currently only very useful for Chromium-based browsers.

My next priority is to make this project also work well with Firefox browsers in 
various Linux distributions.

[1] Chromebooks are very cheap and easy to put into developer mode to install a working
Linux system, via [the crouton environment](https://github.com/dnschneid/crouton).

## Viewing and editing files

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

### Toggling folds
To quickly toggle between opened and closed row folds with the Enter key, add this line:

	nmap <enter> za

