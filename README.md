**Mozilla Firefox Extension designed to convert "obfuscated" and/or nested links to genuine/normal plain clean links.**

_Eg:_

- <http://www.foobar.com/goto=https://www.yoursite.com> ➠ <https://www.yoursite.com/>

- <http://example.com/aHR0cDovL3d3dy5nb29nbGUuY29t> ➠ <http://www.google.com>

- <http://www3.dumbsite.com/external/hit/to/www.foobar.com> ➠ <http://www.foobar.com/>

- javascript:window.open('http://somesite.com') ➠ <http://somesite.com/>


You can disable the add-on at anytime by clicking the toolbar icon, which will become black/greyed when it's turned off. When some links are converted, the icon will change and you'll be able to mouse-over to open its popup where you can see the number of fixed links on the current website.

Version 2.0+ released on July 2012 includes some configuration options where you'll be able to define which urls to skip (ie, links to sharing platforms and such) or what tracking tags to remove (ie, utm, affiliate IDs, referer, etc)

Version 2.1 Implemented Event Delegation mode, which needs opt-in. Once enabled, rather than scanning the whole DOM document on page load it'll listen for click events instead.


###✔ TODO:###

<ol>
<li> Convert the add-on to restartless.</li>
<li> Once it's restartless, make it compatible with Android Devices.</li>
<li> Implement a "linkify text links and then clean" feature.</li>
<li> Work over the address bar for pasted links rather than just clicked ones (?)</li>
<li> Unshorting links feature (?) </li>
</ol>


䷴䷄䷢