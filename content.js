/* ***** BEGIN LICENSE BLOCK *****
 * 
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/
 * 
 * Contributor(s):
 *   Diego Casorran <dcasorran@gmail.com> (Original Author)
 * 
 * ***** END LICENSE BLOCK ***** */

(function(scope) {
// Hmm, how lame this is?..
	
	let oOpen = scope.open,
		doc = scope.document;
	scope.open = (function() {
		
		if(typeof arguments[0] === 'string') {
			
			let node = doc.createElement('Dummy');
			node.setAttribute('url',arguments[0]);
			doc.documentElement.appendChild(node);
			
			let ev = doc.createEvent("Events");
			ev.initEvent('getCleanLink',!0,!1);
			node.dispatchEvent(ev);
			
			arguments[0] = node.getAttribute('url');
		}
		return oOpen.apply(this,arguments);
	}).bind(scope);
})(this);
