/* ***** BEGIN LICENSE BLOCK *****
 * 
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/
 * 
 * The Original Code is CleanLinks Mozilla Extension.
 * 
 * The Initial Developer of the Original Code is
 * Copyright (C)2012 Diego Casorran <dcasorran@gmail.com>
 * All Rights Reserved.
 *
 * ***** END LICENSE BLOCK ***** */

(function () {
	const Cc = Components.classes;
	const Ci = Components.interfaces;
	const cleanlinks = {
		pkg : 'CleanLinks v2.0',
		tag_b : 'data-cleanedlinks',
		tag_l : 'data-cleanedlink',
		tag_t : "\n \n- CleanLinks Touch!",
		tag_h : '#',
		op : null,
		ps : null,
		handleEvent : function (ev) {
			window.removeEventListener(ev.type, arguments.callee, false);
			let t = cleanlinks;
			switch (ev.type) {
			case 'load':
				t.ps = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService).getBranch('extensions.cleanlinks.');
				if ("nsIPrefBranch2" in Ci)
					t.ps.QueryInterface(Ci.nsIPrefBranch2);
				t.op = {};
				for each(let k in t.ps.getChildList("", {})) {
					t.op[k] = t.g(k);
				}
				t.pp();
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
			if (ev.originalTarget instanceof HTMLDocument) {
				cleanlinks.b2(ev.originalTarget);
			}
		},
		b2 : function (d, x) {
			let a,
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
			b = this.c(d);
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
				if (d.body.hasAttribute(this.tag_b))
					b += parseInt(d.body.getAttribute(this.tag_b));
				d.body.setAttribute(this.tag_b, b);
			}
			this.b5(d, b);
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
			let l = d.getElementsByTagName('a'),
			c = l.length;
			while (c--) {
				if (l[c].hasAttribute(this.tag_l)) {
					l[c].setAttribute('href', l[c].getAttribute(this.tag_l));
					l[c].setAttribute('title', l[c].getAttribute('title').replace(this.tag_t.replace(/^\s+/, ''), '').replace(/\s+$/, ''));
					l[c].style.setProperty('border-bottom', '0px', 'important');
					if (this.op.highlight)
						l[c].style.background = l[c].style.color = null;
				}
			}
			l = d.getElementsByTagName('iframe');
			c = l.length;
			while (c--) {
				let a = l[c].contentWindow.document;
				if (a instanceof HTMLDocument)
					this.b3(a, 2);
			}
			if (x)
				return;
			d.body.setAttribute(this.tag_b, 0);
			this.b5(d);
		},
		b4 : function (ev) {
			if (!(ev.originalTarget instanceof XULElement))
				return;
			let t = cleanlinks;
			if (!t.op.enabled)
				t.b3();
			else
				t.b2();
		},
		b5 : function (d, c) {
			if (!d)
				try {
					d = gBrowser.contentDocument;
				} catch (e) {
					d = this.wd() || window.content.document;
				}
			let activeWin = Application.activeWindow;
			if (activeWin.activeTab.document != d) {
				return;
			}
			if (!(d = d.body))
				return;
			d = c || parseInt(d.getAttribute(this.tag_b));
			let ni = 'chrome://cleanlinks/skin/icon16' + (d ? '!' : '') + '.png';
			try {
				document.getElementById('cleanlinks-toolbar-button').style.setProperty('list-style-image', 'url("' + ni + '")', 'important');
			} catch (e) {}
			
		},
		c : function (d) {
			let t = 0,
			l = d.getElementsByTagName('a'),
			c = l.length,
			skipwhen = this.op.skipwhen,
			removem = this.op.remove;
			while (c--) {
				let h = l[c].href,
				lmt = 4,
				s = 0,
				p,
				ht = null;
				if (skipwhen && skipwhen.test(h))
					continue;
				h.replace(/^javascript:.+(["'])(https?(?:\:|%3a).+?)\1/gi, function (a, b, c)(++s, h = c));
					if (/((?:aHR0|d3d3)[A-Z0-9+=\/]+)/gi.test(h))
						try {
							h = '=' + decodeURIComponent(atob(RegExp.$1));
						} catch (e) {}
						
					while (--lmt && (/[\/\?\=\(]([hft]+tps?(?:\:|%3a).+)$/i.test(h) || /(?:[\?\=]|[^\/]\/)(www\..+)$/i.test(h))) {
						h = RegExp.$1;
						if (~(p = h.indexOf('&')))
							h = h.substr(0, p);
						h = decodeURIComponent(h);
						if (~(p = h.indexOf('html&')) || ~(p = h.indexOf('html%')))
							h = h.substr(0, p + 4);
						else if (~(p = h.indexOf('/&')) || ~(p = h.indexOf('/%')))
							h = h.substr(0, p);
						if (!/^http/.test(h))
							h = 'http://' + h;
						if (h.indexOf('/', 8) == -1)
							h += '/';
						++s;
					}
					if (s || removem.test(h)) {
						++t;
						if (~(p = h.indexOf('#')))
							(ht = h.substr(p), h = h.substr(0, p));
						h = h.replace('&amp;', '&', 'g').replace(removem, '').replace(/[?&]$/, '') + (ht || this.tag_h);
						if (!(l[c].hasAttribute(this.tag_l))) {
							l[c].setAttribute(this.tag_l, l[c].href);
							let m = l[c].hasAttribute('title') ? l[c].getAttribute('title') : '';
							m += this.tag_t;
							l[c].setAttribute('title', m.replace(/^\s+/, ''));
						}
						l[c].setAttribute('href', h);
						l[c].style.setProperty('border-bottom', '1px dotted #9f9f8e', 'important');
						if (this.op.highlight) {
							l[c].style.setProperty('background', 'rgba(255,255,0,0.7)', 'important');
							l[c].style.setProperty('color', '#000', 'important');
						}
					}
			}
			return t;
		},
		d : function (m) {
			Cc['@mozilla.org/consoleservice;1'].getService(Ci.nsIConsoleService).logStringMessage(this.pkg + ': ' + m);
		},
		g : function (n, v) {
			let p = this.ps;
			if (typeof v == 'undefined') {
				let s = Ci.nsIPrefBranch;
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
				let t = cleanlinks,
				e = s.target;
				if (e.hasChildNodes()) {
					let l = e.childNodes.length;
					while (l--)
						e.removeChild(e.childNodes[l]);
				}
				let re;
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
			if (!s) {
				let ni = 'chrome://cleanlinks/skin/icon16-.png';
				try {
					document.getElementById('cleanlinks-toolbar-button').style.setProperty('list-style-image', 'url("' + ni + '")', 'important');
				} catch (e) {}
				
			}
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
				} else if (~['skipwhen', 'remove'].indexOf(d)) {
					this.pp();
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
				for (let x in a) {
					e.setAttribute(x, a[x]);
				}
			return e;
		},
		pp : function () {
			for each(let p in['skipwhen', 'remove']) {
				if (this.op[p] && typeof this.op[p] == 'string')
					try {
						if (p == 'remove')
							this.op[p] = new RegExp('\\b(' + this.op[p] + ')=.+?(&|$)', 'g');
						else
							this.op[p] = new RegExp(this.op[p]);
					} catch (e) {
						alert('Error Processing CleanLinks Pattern "' + p + '": ' + e.message);
						this.op[p] = null;
					}
			}
		},
		w : function (m) {
			try {
				let wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator).getMostRecentWindow("navigator:browser");
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
	if (!("diegocr" in window))
		window.diegocr = {};
	window.diegocr.cleanlinks = cleanlinks;
	window.addEventListener('unload', cleanlinks, false);
	window.addEventListener('load', cleanlinks, false);
})();
