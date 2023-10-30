
export const app = function(Win, Desk) {
const {main} = Win;

main._tcol="#ccc";
main._overy="scroll";
main.style.userSelect="text";
main._fs=18;

//Help <html>«
main.innerHTML=`
<div style="margin: 15px;">
<h3></h3>
<hr><hr>
<h2>System configuration</h2>
<hr>
<h3>Setting a solid background color</h3>
<p>
Append a css color "flag" to the url. If it is a hex value, it should be 3 or 6 characters long 
(leave off the initial '#'). So the url should look something like:
<ul>
<li>http://localhost:8000/?bgcol=112 
<li>https://linuxontheweb.github.io/?bgcol=black
</ul>
<br>
<hr>
<hr>
<h2>Keyboard shortcuts</h2>
<hr>
<h3>Show the desktop: Alt+d</h3>
<p>This toggles between the two desktop states such that the windows are either visible or temporarily hidden.
<hr>
<h3>Toggling taskbar hiding: Alt+b</h3>
<p>When the taskbar is hidden, it will "unhide" when the mouse is within a certain threshold of
the bottom of the screen (currently about 30 pixels).
<hr>
<h3>Switching workspaces: Ctrl+Alt+Shift+[1-9]</h3>
<p>You may also use the left or right arrow keys in place of the number keys in order to
cycle between the workspaces.
<hr>
<h3>Opening the context menu: Alt+c</h3>
<p>If nothing else is in focus, the desktop's menu will be opened. Otherwise, the context menus
of the "current" element (window or icon) should be opened.
<hr>
<h3>Toggling the icon cursor: c</h3>

<p>

If either a folder is in focus or no windows are in focus (effectively giving
the desktop the focus), then a "cursor" to be used for various icon operations
will be toggled (it will be shown or hidden). Using the cursor allows for
selecting icons, and for selected icons to be opened or to be moved in the
desktop environment via the keyboard. The arrow keys will move the cursor.
Whatever icon is indicated by the cursor will be called "the current icon."

<hr>

<h3>Opening icons: Enter</h3>
<p>If the current icon is not selected, pressing Enter will select it.
Pressing the enter key again will open it. If the Alt key is used along with Enter, the icon
will be immediately opened (without needing to select it first).
<hr>
<h3>Toggling icons: Space or Ctrl+Arrow</h3>
<p>The selection status of the current icon may be toggled with the space bar. Alternatively, 
the icon cursor may be "dragged" by holding the Ctrl key while moving it with the arrow keys.
In this case, the selection status of the current icon will be toggled when the cursor has 
moved away from it.
<hr>
<h3>Selecting all icons: Ctrl+a</h3>
<p>
If the desktop or a folder window is active, all of the relevant icons will be selected.
<hr>
<h3>Moving selected icons: m</h3>
<p>All selected icons may be moved between folders by pressing 'm'. Desktop icons may also be moved 
to different locations on the desktop in this way. If the current icon is a folder, this will attempt
to move the selected icons into the related folder. To move selected icons into a folder window, 
you must disable the cursor by toggling it with 'c'. The following shortcuts apply for when the selected
icons are on the desktop, and are to be used in place of 'm'.

<ul>
<li>'0' (zero) will move all selected icons to the upper right corner of the desktop.
<li>'s' will switch the places of two icons, in the case that one of the icons is in a 
selected state and one is the current icon.
</ul>
<h3></h3>
<hr>

<h3>Fullscreening windows: Alt+f</h3>
<p>This doesn't use the actual fullscreen api. It only maximizes the application's area 
within the browser's available dimensions (window.innerWidth x window.innerHeight). 
This shortcut toggles the fullscreen status.
<hr>
<h3>Maximizing windows: Alt+m</h3>

<p>This does the same thing as fullscreening, except the application's titlebar
and footer remain visible. Also, the taskbar will still remain showing (as long
as it isn't being auto-hidden). This shortcut toggles the maximization status.

<hr>
<h3>Minimizing windows: Alt+n</h3>
<p>The window is sent to the taskbar. It can be brought back into focus either by clicking
the iconified window or by cycling the window stack with the appropriate keyboard shortcut.
<hr>
<h3>Closing windows: Alt+x</h3>
<p>The window is "killed." If the window's application defines an 'onkill' method, it
will be called.
<hr>
<h3>Moving windows: Shift+arrow</h3>
<p>The focused window will be moved by a certain increment (currently 50 pixels).
<hr>
<h3>Resizing windows: Ctrl+Shift+arrow</h3>
<p>The focused window will be resized by a certain increment (currently 50 pixels). This method
only affects the bottom and right edges of the given window.
<hr>
<h3>Toggling "layout" mode: Ctrl+Alt+l</h3>
<p>This allows for the simple, fine grained positioning and resizing of windows via a translucent overlay
that gives easy to grasp "handles." The window geometries are prominently displayed. This mode 
is particularly useful for users with accessibility needs.
<hr>
<h3>Toggling "tiling" mode: ?</h3>
<p>If there are more than one non-overlapping windows, turning on this mode will attempt to "tile"
the windows, so that their application areas are maximized. There is not currently a dedicated 
shortcut for this mode, but it is currently invoked by the "test function" shorcut, which is
Ctrl+Alt+Shift+t.

<hr>

<h3>Cycling the window stack: Alt+\x60</h3>
<p>Since your OS probably already uses Alt+Tab to cycle through windows, LOTW uses
Alt+\x60 (the tilde key, above the Tab key). This cycles through the windows
in the current workspace. The full desktop will always be made visible during any given cycle
(the windows can be brought back into view via the "Show the desktop" shortcut).
 

<hr>

<h3>Reloading windows: Alt+r</h3>
<p>This feature is currently only applicable for application developers with a local instance of LOTW.
This will fetch the recent '.js' file for the given application window. The applications should report
all "major" errors (like SyntaxError and TypeError).

<hr>

<h3>Toggling "expert" mode: Ctrl+Alt+Shift+e</h3>
<p>This mode removes all interface elements from the taskbar, and the taskbar will not 
"auto unhide" when the mouse cursor is near the bottom of the screen. The taskbar will
only unhide when taskbar hiding is explicitly toggled via the keyboard. This mode only 
works in locally hosted instances of LOTW, or when an "expert flag" is appended to the url,
i.e. https://linuxontheweb.github.io/?expert=1.
<br>
<br>
<hr><hr>
<h2>Using the terminal</h2>
<hr>
<h3>Tab completion</h3>

<p>Pressing the Tab key while typing the first token will attempt to perform a
completion with the name of a command (if there are no tokens, all commands
will be shown). For every other token, a file path completion will be
attempted.

<hr>
<h3>Limited support for redirection</h3>
<p>The 'cat' and 'echo' commands currently allow for a '>' redirect token.
<hr>
<h3>Awareness of shell tokens</h3>
<p>While the LOTW shell is "aware" of the various kinds of tokens supported by
modern shells, they are not generally allowed, and an error message will be displayed if
they are used.
<hr>

<h3>Shell scripts</h3>
<p>The shell will attempt to execute all files that are entered as the first
token (i.e. in the place of a command), and that use a case-insensitive '.sh'
file extension. Each command must be contained on a single line (i.e. newlines
cannot be escaped and all quotes must be opened and closed on the same lines). 
Scripts are not aborted due to errors.

<hr>

<h3>Support for parsing optional arguments</h3>
<p>There is not currently any support for parsing optional arguments in the LOTW shell,
although previous versions have supported them (and should not be too difficult to 
re-implement).

<hr>

<h3>Editing files</h3>

<p>

Advanced users might be interested in LOTW's (javascript) implementation of the
vim editor. While there seem to be some WASM versions of "real" vim floating
around the web, the potential use cases of such a thing in LOTW do not
currently seem very overwhelming due to the difficulties inherent in modifying
the C source code and fully integrating it into the highly "quixotic" web platform.

<hr>

<h3>Features vs code maintainability</h3>

<p>Previous versions of this project attempted to maximize the number of
features available in the terminal application, to make the LOTW shell somewhat compatible
with "real" shells like bash.  But the code was not very understandable (it was
mostly developed in the years before Promises and async/await, with a tendency
towards "callback hellishness"). So the current philosophy is to be slower and
more circumspectful in order to maximize the longer-term prospects of the
project.



<h3></h3>
<hr>
<h3></h3>
<h3></h3>
<h3></h3>
</div>
`;
//»

Win.makeScrollable();

}
