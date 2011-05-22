/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is CleanLinks Mozilla Extension.
 *
 * The Initial Developer of the Original Code is
 * Copyright (C)2011 Diego Casorran <dcasorran@gmail.com>
 * All Rights Reserved.
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

(function () {
	const Cc = Components.classes;
	const Ci = Components.interfaces;
	const cleanlinks = {
		pkg : 'CleanLinks v1.0',
		tag_b : '__cleaned_links',
		tag_t : "\n \n- CleanLinks Touch!",
		tag_l : 'CleanedLink',
		tag_h : '#cl-privacy',
		op : null,
		ps : null,
		a : function (ev) {
			window.removeEventListener(ev.type, arguments.callee, false);
			const t = cleanlinks;
			switch (ev.type) {
			case 'load':
				t.ps = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService).getBranch('extensions.cleanlinks.');
				t.ps.QueryInterface(Ci.nsIPrefBranch2);
				t.op = {};
				for each(var k in t.ps.getChildList("", {})) {
					t.op[k] = t.g(k);
				}
				if (t.l(!!t.op.enabled)) {
					gBrowser.addEventListener('DOMContentLoaded', t.b, false);
					gBrowser.tabContainer.addEventListener("TabSelect", t.b4, false);
				}
				t.ps.addObserver("", t, false);
				break;
			case 'unload':
				t.ps.removeObserver("", t);
				if (t.op.enabled) {
					gBrowser.tabContainer.removeEventListener("TabSelect", t.b4, false);
					gBrowser.removeEventListener('DOMContentLoaded', t.b, false);
				}
			default:
				break;
			}
		},
		b : function (ev) {
			if (!(ev.originalTarget instanceof HTMLDocument))
				return;
			cleanlinks.b2(ev.originalTarget);
		},
		b2 : function (d, x) {
			var a,
			b = 0,
			c,
			e = 7;
			if (!d)
				try {
					d = gBrowser.contentDocument;
				} catch (e) {
					d = this.wd() || window.content.document;
				}
			if (!d.body)
				return;
			while (--e && (a = this.c(d)))
				b += a;
			if (x) {
				e = d.getElementsByTagName('iframe');
				c = e.length;
				while (c--) {
					a = e[c].contentWindow.document;
					if (a instanceof HTMLDocument)
						b += this.b2(a, 2);
				}
				if (x == 2)
					return b;
			}
			while (d.defaultView.frameElement) {
				d = d.defaultView.top.document;
			}
			if (d.body) {
				if (d.body.hasAttribute(cleanlinks.tag_b))
					b += parseInt(d.body.getAttribute(cleanlinks.tag_b));
				d.body.setAttribute(cleanlinks.tag_b, b);
			}
			this.b5(d);
			return b;
		},
		b3 : function (d, x) {
			if (!d)
				try {
					d = gBrowser.contentDocument;
				} catch (e) {
					d = this.wd() || window.content.document;
				}
			if (!d.body)
				return;
			var l = d.getElementsByTagName('a'),
			c = l.length;
			while (c--) {
				if (l[c].hasAttribute(this.tag_l)) {
					l[c].setAttribute('href', l[c].getAttribute(this.tag_l));
					l[c].setAttribute('title', l[c].getAttribute('title').replace(this.tag_t, ''));
					l[c].style.setProperty('border-bottom', '0px', 'important');
				}
			}
			l = d.getElementsByTagName('iframe');
			c = l.length;
			while (c--) {
				var a = l[c].contentWindow.document;
				if (a instanceof HTMLDocument)
					this.b3(a, 2);
			}
			if (x)
				return;
			d.body.setAttribute(cleanlinks.tag_b, 0);
			this.b5(d);
		},
		b4 : function (ev) {
			if (!(ev.originalTarget instanceof XULElement))
				return;
			const t = cleanlinks;
			if (!t.op.enabled)
				t.b3();
			else
				t.b2();
		},
		b5 : function (d) {
			if (!d)
				try {
					d = gBrowser.contentDocument;
				} catch (e) {
					d = this.wd() || window.content.document;
				}
			var activeWin = Application.activeWindow;
			if (activeWin.activeTab.document != d) {
				return;
			}
			if (!(d = d.body))
				return;
			d = parseInt(d.getAttribute(this.tag_b));
			var ni = 'chrome://cleanlinks/skin/icon16' + (d ? '!' : '') + '.png';
			document.getElementById('cleanlinks-status-bar-icon').src = ni;
			try {
				document.getElementById('cleanlinks-toolbar-button').style.setProperty('list-style-image', 'url("' + ni + '")', 'important');
			} catch (e) {}

		},
		c : function (d) {
			var t = 0,
			l = d.getElementsByTagName('a'),
			c = l.length;
			while (c--) {
				var h = l[c].href,
				x = t;
				if (h.indexOf('share') != -1 || h.indexOf('translate') != -1)
					continue;
				if (/(aHR0[A-Z0-9+=/] + )
					 / gi.test(h))h = '=' + decodeURIComponent(atob(RegExp.$1));
				if (/[\/\?\=]([hft]+tps?)/gi.test(h)) {
					var p = decodeURIComponent(h).lastIndexOf('://');
					h = h.substr(++p);
					if (h.charAt(0) == '3')
						h = h.substr(2);
					if ((p = h.indexOf('&')) != -1)
						h = h.substr(0, p);
					h = RegExp.$1 + ':' + decodeURIComponent(h);
					if ((p = h.indexOf('html&')) != -1 || (p = h.indexOf('html%')) != -1)
						h = h.substr(0, p) + 'html';
					else if ((p = h.indexOf('/&')) != -1 || (p = h.indexOf('/%')) != -1)
						h = h.substr(0, p);
					if (h.indexOf('/', 8) == -1)
						h += '/';
					if (h.indexOf('#') == -1)
						h += this.tag_h;
					t++;
				}
				if (x != t) {
					h = h.replace(/&amp;/g, '&').replace(/ref=/g, 'ref=fail');
					if (!(l[c].hasAttribute(this.tag_l))) {
						l[c].setAttribute(this.tag_l, l[c].href);
						var m = l[c].hasAttribute('title') ? l[c].getAttribute('title') : '';
						m += this.tag_t;
						l[c].setAttribute('title', m);
					}
					l[c].setAttribute('href', h);
					l[c].style.setProperty('border-bottom', '1px dotted #9f9f8e', 'important');
				}
			}
			return t;
		},
		d : function (m) {
			Cc['@mozilla.org/consoleservice;1'].getService(Ci.nsIConsoleService).logStringMessage(this.pkg + ': ' + m);
		},
		g : function (n, v) {
			const p = this.ps;
			if (typeof v == 'undefined') {
				const s = Ci.nsIPrefBranch;
				n = n || 'enabled';
				try {
					switch (p.getPrefType(n)) {
					case s.PREF_STRING:
						return p.getCharPref(n);
					case s.PREF_INT:
						return p.getIntPref(n);
					case s.PREF_BOOL:
						return p.getBoolPref(n);
					}
				} catch (e) {}

			} else {
				try {
					switch (typeof(v)) {
					case "string":
						p.setCharPref(n, v);
						break;
					case "boolean":
						p.setBoolPref(n, v);
						break;
					case "number":
						p.setIntPref(n, v);
						break;
					}
				} catch (e) {}

			}
		},
		l : function (s) {
			if (typeof s == 'object') {
				const t = cleanlinks,
				e = s.target;
				if (e.hasChildNodes()) {
					var l = e.childNodes.length;
					while (l--)
						e.removeChild(e.childNodes[l]);
				}
				var re;
				try {
					re = parseInt(t.wd().body.getAttribute(cleanlinks.tag_b));
					if (isNaN(re))
						re = 0;
				} catch (e) {
					re = 0;
				}
				try {
					e.appendChild(t.oc('label', {
							value : t.pkg,
							style : 'text-align:center;color:red;font:italic 16px Serif,Georiga;font-weight:bold'
						}));
					e.appendChild(t.oc('separator', {
							height : 1,
							style : 'background-color:#333;margin-bottom:3px'
						}));
					e.appendChild(t.oc('label', {
							value : 'Status: ' + (t.g() ? 'Enabled' : 'Disabled')
						}));
					e.appendChild(t.oc('label', {
							value : 'Cleaned Links: ' + re
						}));
					e.appendChild(t.oc('separator', {
							height : 1,
							style : 'background-color:#333;margin-bottom:3px'
						}));
					e.appendChild(t.oc('label', {
							value : 'Click the icon to ' + (t.g() ? 'Disable' : 'Enable'),
							style : 'color:#8e9f9f;font:12px Georgia'
						}));
				} catch (e) {
					alert(e);
					return false;
				}
				return true;
			}
			this.g('enabled', s = (typeof s != 'undefined' ? !!s : !this.g()));
			var ni = 'chrome://cleanlinks/skin/icon16' + (s ? '' : '-') + '.png';
			document.getElementById('cleanlinks-status-bar-icon').src = ni;
			try {
				document.getElementById('cleanlinks-toolbar-button').style.setProperty('list-style-image', 'url("' + ni + '")', 'important');
			} catch (e) {}

			return s;
		},
		observe : function (s, t, d) {
			switch (t) {
			case 'nsPref:changed':
				this.op[d] = this.g(d);
				if (d == 'enabled') {
					if (this.l(!!this.op[d])) {
						gBrowser.addEventListener('DOMContentLoaded', this.b, false);
						gBrowser.tabContainer.addEventListener("TabSelect", this.b4, false);
						this.b2(0, 1);
					} else {
						gBrowser.removeEventListener('DOMContentLoaded', this.b, false);
						gBrowser.tabContainer.removeEventListener("TabSelect", this.b4, false);
						this.b3();
					}
				}
			default:
				break;
			}
		},
		oc : function (e, a) {
			const XUL_NS = 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul';
			e = document.createElementNS(XUL_NS, e);
			if (!e)
				return null;
			if (a)
				for (x in a) {
					e.setAttribute(x, a[x]);
				}
			return e;
		},
		w : function (m) {
			try {
				var wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator).getMostRecentWindow("navigator:browser");
				if (m)
					return wm;
				return wm.getBrowser();
			} catch (e) {
				return null;
			}
		},
		wd : function () {
			try {
				return this.w().mCurrentBrowser.contentDocument;
			} catch (e) {
				return null;
			}
		},
		wl : function () {
			try {
				return this.wd().location;
			} catch (e) {
				return null;
			}
		},
	};
	window.cleanlinks = cleanlinks;
	window.addEventListener('unload', cleanlinks.a, false);
	window.addEventListener('load', cleanlinks.a, false);
})();
