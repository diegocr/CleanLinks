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

(function(){

let {classes:Cc, interfaces:Ci, utils:Cu, results:Cr} = Components,
	{Services}=Cu.import("resource://gre/modules/Services.jsm",{});

let strings = Services.strings.createBundle("chrome://cleanlinks/locale/browser.properties");
function _(key) strings.GetStringFromName(key)

let handledElsewhere = function() !1;

try {
	let {XPIProvider:xS} = Cu.import('resource://gre/modules/'
	+(parseInt(Services.appinfo.version)>29?'addons/':'')+'XPIProvider.jsm', {});
	if((xS = xS.bootstrapScopes['{c9d31470-81c6-4e3e-9a37-46eb9237ed3a}'])) {
		if (typeof xS.getPrefs === 'function') {
			handledElsewhere = function(n) !!xS.getProvider(n,xS.getPrefs());
		}
	}
} catch(e) {
	Cu.reportError(e);
}

const cleanlinks = {
	pkg:'CleanLinks',
	tag_b:'data-cleanedlinks',
	tag_l:'data-cleanedlink',
	tag_t:"\n \n- " + _("browser.touch"),
	tag_h:_("browser.hashtag"),
	acev:'aftercustomization',
	op:null,
	ps:null,
	handleEvent: function(ev) {
		let t = cleanlinks;
		if(ev.type != t.acev)
			window.removeEventListener(ev.type, t, false);
		t.pkg = t.addon.name + ' v' + t.addon.version;
		switch(ev.type) {
			case 'load':
				t.ps = t.addon.branch;
				t.op = {};
				for each(let k in t.ps.getChildList("", {})) {
					t.op[k] = t.g(k);
				}
				t.pp();
				if(t.l(!!t.op.enabled)) {
					t.de();
				}
				t.ps.addObserver("", t, false);
				t.ios = Cc["@mozilla.org/network/io-service;1"]
					.getService(Ci.nsIIOService);
				t.observe(null,'nsPref:changed','skipdoms');
				window.addEventListener(t.acev, t, !1);
				t.edc = t.mob ? (function(a) window.content.location = a)
					: (typeof window.openUILink !== 'function')
					? function(a,b) (b.setAttribute('href', a), b.click())
					: function(a,b,c) {
						if (c.button == 0 && c.altKey) {
							return false; // alt+click, do nothing
						}
						if(this.op.gotarget && 0 == c.button && !(c.shiftKey || c.ctrlKey || c.metaKey || c.altKey)) {
							let t = b.hasAttribute('target') && b.getAttribute('target') || '_self';
							if("_blank" == t) c.button = 1;
							else {
								let wnd = b.ownerDocument.defaultView,
									wfr = content.frames;

								switch(t) {
									case '_top'    : wnd = wnd.top;    break;
									case '_parent' : wnd = wnd.parent; break;
									case '_self'   :
										if(!wfr.length)
											wnd = null;
										break;
									default:
										[].some.call(wfr,function(f) f.name == t && (wnd=f));
								}

								if(wnd) try {
									wnd.location = a;
									return true;
								} catch(e) {
									Cu.reportError(e);
								}
							}
						}
						openUILink(a,c,{
							relatedToCurrent: true,
							inBackground: (function(p,n) p.getPrefType(n)
							&&	p.getBoolPref(n))(Services.prefs,
								'browser.tabs.loadInBackground')});
						return true;
					}.bind(t);
				break;
			case t.acev:
				window.setTimeout(() => t.si(t.si.last), 400);
				break;
			case 'unload':
				t.ps.removeObserver("", t);
				if(t.op.enabled) t.dd();
				window.removeEventListener(t.acev, t, !1);
				for(let m in t)
					delete t[m];
			default:break;
		}
		ev = undefined;
	},
	b: function(ev) {
		if(ev.originalTarget instanceof HTMLDocument) {
			let doc = ev.originalTarget, t=cleanlinks;
			t.b2(doc);
			if(t.op.repdelay) {
				doc.defaultView.addEventListener('click', function(ev) {
					// Just the worst way ever to handle ajax...
					setTimeout(t.b2.bind(t,doc,0), t.op.repdelay*1000);
				}, true);
			}
		}
	},
	b2: function(d,x) {
		let a,b = 0, c, e = 7;

		if(!d) d = this.gd();
		try {
			if(!d.body)
				throw 0xBADF;
		} catch(e) {
			return 0;
		}

		// while(--e && (a=this.c(d))) b += a;
		b = this.c(d);

		if(x) {
			e = d.defaultView.frames;
			c = e.length;
			while(c--) {
				b += this.b2(e[c].document,2);
			}
			if(x==2)return b;
		}

		while(d.defaultView.frameElement) {
			d = d.defaultView.frameElement.ownerDocument;
		}
		if(d.body) {
			if(d.body.hasAttribute(this.tag_b))
				b += parseInt(d.body.getAttribute(this.tag_b));
			d.body.setAttribute(this.tag_b,b);
		}
		this.b5(d,b);
		return b;
	},
	b3: function(d,x) {
		if(!d) d = this.gd();
		if(!d.body)
			return;

		let l = d.getElementsByTagName('a'), c = l.length;

		while(c--) {
			if(l[c].hasAttribute(this.tag_l)) {
				l[c].setAttribute('href',l[c].getAttribute(this.tag_l));
				l[c].setAttribute('title',l[c].getAttribute('title').replace(this.tag_t.replace(/^\s+/,''),'').replace(/\s+$/,''));
				l[c].style.setProperty('border-bottom','0px','important');
				if(this.op.highlight)
					this.hl(l[c],1);
			}
		}

		l = d.defaultView.frames;
		c = l.length;
		while(c--) {
			this.b3(l[c].document,2);
		}
		if(x)return;
		d.body.setAttribute(this.tag_b,0);
		this.b5(d);
	},
	b4: function(ev) {
		if(!(ev.originalTarget instanceof XULElement))
			return;

		let t = cleanlinks;
		if(!t.op.enabled)
			t.b3();
		else
			t.b2();

		// t.b5();
	},
	b5: function(d,c) {
		let tb = document.getElementById('cleanlinks-toolbar-button');
		if(!tb) return;

		if(!d) d = this.gd();

		try {
			let activeWin = Application.activeWindow;
			if(activeWin.activeTab.document != d || !(d=d.body))
				return;
		} catch(e) {
			return;
		}

		d = c || parseInt(d.getAttribute(this.tag_b));
		this.si(d && '!', tb);
	},
	c: function(d) {
		let t = 0, l = d.getElementsByTagName('a'), c = l.length;

		while(c--) {

			let h1 = l[c].href, h2 = this.cl(h1,l[c].baseURI);

			if( h1 != h2 ) {
				++t;

				if(!(l[c].hasAttribute(this.tag_l))) {

					l[c].setAttribute(this.tag_l,l[c].href);

					let m = l[c].hasAttribute('title') ? l[c].getAttribute('title') : '';
					m += this.tag_t;
					l[c].setAttribute('title',m.replace(/^\s+/,''));
				}
				l[c].setAttribute('href',h2);
				l[c].style.setProperty('border-bottom','1px dotted #9f9f8e','important');
				if(this.op.highlight) {
					this.hl(l[c]);
				}
			}
		}
		return t;
	},

	cl: function(h,b) {
		if(!h || h.startsWith("view-source:")
		|| (this.op.skipwhen && this.op.skipwhen.test(h)))
			return h;

		if(!b) {
			if(/^https?:/.test(h)) b = h;
			else b = content.location.href;
		}
		if(typeof b === 'string')
			b = this.nu(b);

		let lu;
		if(this.op.skipdoms) try {
			lu = this.nu(h,b);

			if(~this.op.skipdoms.indexOf(lu.host))
				return h;

		} catch(e) {}

		if(this.op.ignhttp) {
			if(!/^https?:/.test(lu&&lu.spec||h)) return h;
		}

		if(/\.google\.[a-z.]+\/search\?(?:.+&)?q=http/i.test(h)
		|| /^https?:\/\/www\.amazon\.[\w.]+\/.*\/voting\/cast\//.test(h)
		  )	return h;

		let lmt = 4, s = 0, p, ht = null, rp = this.op.remove, l = h, Y = /\.yahoo.com$/.test(b.asciiHost);
		h.replace(/^javascript:.+(["'])(https?(?:\:|%3a).+?)\1/gi,function(a,b,c)(++s,h=c));

		if(/\b((?:aHR0|d3d3)[A-Z0-9+=\/]+)/gi.test(h)) try {
			let r = RegExp.$1;
			if(Y) r = r.replace(/\/RS.*$/,'');
			let d = decodeURIComponent(atob(r));
			if(d) h='='+d;
		} catch(e) {
			Cu.reportError('Invalid base64 data for "'+h+'" at "'+(b&&b.spec)+'"\n> '+e);
		} else {
			switch(b.asciiHost) {
				case 'www.tripadvisor.com':
				  if(~h.indexOf('-a_urlKey'))
					h = '=' + decodeURIComponent(h.replace(/_+([a-f\d]{2})/gi, '%$1')
						.replace(/_|%5f/ig,'')).split('-aurl.').pop().split('-aurlKey').shift();
					break;
				default:
					switch(lu&&lu.asciiHost||(h.match(/^\w+:\/\/([^/]+)/)||[]).pop()) {
						case 'redirect.disqus.com':
							if(~h.indexOf('/url?url='))
								h = '=' + h.match(/url\?url=([^&]+)/).pop().split(/%3a[\w-]+$/i).shift();
							break;
					}
			}
		}

		while(--lmt && (/(?:.\b|3D)([a-z]{2,}(?:\:|%3a)(?:\/|%2f){2}.+)$/i.test(h) || /(?:[?=]|[^\/]\/)(www\..+)$/i.test(h))) {
			h = RegExp.$1;
			if(~(p = h.indexOf('&')))
				h = h.substr(0,p);
			h = decodeURIComponent(h);

			if(~(p = h.indexOf('html&')) || ~(p = h.indexOf('html%')))
				h = h.substr(0,p+4);
			else if(~(p = h.indexOf('/&')))// || ~(p = h.indexOf('/%')))
				h = h.substr(0,p);
			if(h.indexOf('://') == -1)
				h = 'http://' + h;
			if(h.indexOf('/',h.indexOf(':')+2) == -1)
				h += '/';
			++s;
		}

		h = h.replace(/^h[\w*]+(ps?):/i,'htt$1:');

		try {
			// Check if the protocol can be handled...
			this.ios.newChannel(h,null,b||null);
		} catch(e) {
			if(e.result == Cr.NS_ERROR_UNKNOWN_PROTOCOL) {
				h = l;
			} else {
				if(h.split(':').pop().length < 3) h = l;
				else {
					Cu.reportError(e);
					this.d('^^ Unhandled error for "'+h+'" at "'+(b&&b.spec)+'"');
				}
			}
		}

	/*	if (l != h) {
			try {
				this.nu(h);
			} catch(e) {
				this.d('Got an invalid URL: ' + h);
				this.d(e);
				h = l;
			}
		}*/

		if(Y) h = h.replace(/\/R[KS]=\d.*$/,'');

		rp.lastIndex = 0;
		if( s || rp.test(h)) {
			if(~(p = h.indexOf('#'))) (ht = h.substr(p), h = h.substr(0,p));

			h = h.replace('&amp;','&','g').replace(rp,'').replace(/[?&]$/,'')
				+ (ht && /^[\w\/#!-]+$/.test(ht) ? ht : (this.evdm ? '':this.tag_h));
		}

		// if(l != h) this.d([l,h]);
		if(l != h) {
			Services.obs.notifyObservers(this,'cleanlinks-cltrack',JSON.stringify([lu&&lu.spec||l,h]));
		}

		return h;
	},

	d: function(m) {
		this.LOG(m);
	},

	de: function() {
		this.dd();

		if(this.op.evdm) {
			document.documentElement.addEventListener('click', this.edl, true);
			this.evdm = true;
			this.si('~');
		} else {
			(this.mob ? BrowserApp.deck:gBrowser).addEventListener('DOMContentLoaded', this.b, false);
			(this.mob ? BrowserApp.deck:gBrowser.tabContainer).addEventListener("TabSelect", this.b4, false);
			this.domWay = true;
			this.b5();
		}
	},

	dd: function() {
		if(this.domWay) {
			(this.mob ? BrowserApp.deck:gBrowser).removeEventListener('DOMContentLoaded', this.b, false);
			(this.mob ? BrowserApp.deck:gBrowser.tabContainer).removeEventListener("TabSelect", this.b4, false);
			delete this.domWay;
		} else if(this.evdm) {
			document.documentElement.removeEventListener('click', this.edl, true);
			delete this.evdm;
		}
	},

	tcl: function(n) {
		let c,p,t,s = n.ownerDocument && n.ownerDocument.defaultView.getSelection();

		// this.d(['SEL', s.isCollapsed, s.focusNode&&s.focusNode.data, s.focusOffset]);

		if(s && s.isCollapsed && s.focusNode && s.focusNode.data && (p=s.focusOffset)) {
			let zx = ' "\'<>\n\r\t()[]|';
			c = s.focusNode.data.substr(--p);
			t = n.innerHTML.replace(/<\/?wbr>/ig,'').replace(/<[^>]+?>/g,' ');
			p = t.indexOf(c)+1;
			if(p === 0) p=(t=n.textContent).indexOf(c)+1;
			while(p && !~zx.indexOf(t[p])) --p;
			if((t = (p&&t.substr(++p)||t).match(/^\s*(?:\w+:\/\/|www\.)[^\s">]{4,}/))) {
				t = t.shift().trim().replace(RegExp("["+zx.replace(/(.)/g,'\\$1')+"]+$"),'');
				if(!~t.indexOf('://')) t = 'http://'+t;
			}
			// this.d(['RES',p,t,c]);
		}

		// this.d(['TEXTCL ' + t]);

		return t;
	},

	edl: function(ev) {
		if(ev.button != 2 && !(ev.target.ownerDocument instanceof XULDocument)) {
			let n = ev.target, k, t = cleanlinks;

			if(n.nodeName != 'A' && (ev.altKey||!t.op.textcl||!(k=t.tcl(n)))) do {
				n = n.parentNode;
			} while(n && !~['A','BODY','HTML'].indexOf(n.nodeName));

			if(k||(n&&n.nodeName == 'A'&&!handledElsewhere(n))) {
				let z,x;
				switch(k||n.ownerDocument.location.hostname) {
					case 'twitter.com':
						if(n.hasAttribute('data-expanded-url'))
							k = n.getAttribute('data-expanded-url');
						break;
					case 'www.facebook.com':
						if(~(''+n.getAttribute('onmouseover')).indexOf('LinkshimAsyncLink'))
							k = n.href;
				}
				z = k || n.href;
				x = t.cl(z,n.baseURI);
				if(k || z != x) {
					ev.stopPropagation();
					ev.preventDefault();

					if (t.edc(x,n,ev)) {
						if (t.op.highlight) t.hl(n);
						t.blink(window,k && 217);
					}
				}
			}
		}
	},

	blink: function(window, c) {
		if(this.op.highlight) {
			let n;
			if((n = window.document.getElementById('urlbar'))) {
				if(!("ubg" in this))
					this.ubg = n.style.background;
				let z = this.ubg;
				n.style.background = 'rgba('+(c||245)+',240,0,0.6)';
				if(this.ubgt)
					window.clearTimeout(this.ubgt);
				this.ubgt = window.setTimeout(function() n.style.background = z,300);
			}
		}
	},

	g: function(n,v) {
		let p = this.ps;

		if(typeof v == 'undefined') {
			let s = Ci.nsIPrefBranch;
			n = n || 'enabled';
			try {
				switch (p.getPrefType(n)) {
					case s.PREF_STRING:	return p.getCharPref(n);
					case s.PREF_INT:	return p.getIntPref(n);
					case s.PREF_BOOL:	return p.getBoolPref(n);
				}
			} catch(e) {/* this.e('pGet: '+e); */}
		} else {
			try {
				switch(typeof(v)) {
					case "string":	p.setCharPref(n,v);	break;
					case "boolean":	p.setBoolPref(n,v);	break;
					case "number":	p.setIntPref(n,v);	break;
				}
			} catch(e) {/* this.e('pSet: '+e); */}
		}
		return null;
	},

	hl: function(o,d) {
		(''+this.op.hlstyle).split(';').forEach(function(r) {
			let [k,v] = r.split(':').map(String.trim);
			o.style.setProperty(k,d?'':v,'important');
		});
	},

	l: function(s) {

		// ToolTip handler
		if(typeof s == 'object') {
			let t = cleanlinks,
				e = s.target,
				r = 0,
				b = t.g();

			while(e.firstChild)
				e.removeChild(e.firstChild);

			try {
				r = parseInt(t.wd().body.getAttribute(t.tag_b));
				if(isNaN(r))
					r = 0;
			} catch(e) {}

			try {
				e = e.appendChild(t.oc('vbox',{style:'margin:3px 5px;padding:5px 9px;'
					+ 'border:1px solid rgba(20,20,30,0.4);box-shadow:inset 0 0 3px 0 rgba(0,0,0,0.6);'
					+ 'border-radius:6px;background-color:#e4e5e0;text-align:center'}));
				e.appendChild(t.oc('label',{value:t.pkg,style:'color:#00adef;font:11pt "message-box"'}));
				e.appendChild(t.oc('label',{value:_("browser.status")+(b ? _("browser.enabled"):_("browser.disabled"))}));
				if(!t.evdm && b) e.appendChild(t.oc('label',{value:_("browser.cleanedlinks")+r}));
				e.appendChild(t.oc('label',{value:_("browser.clicktheicon")
					+(b ? _("browser.disable"):_("browser.enable")),style:'color:#8e9f9f;font:12px Georgia'}));
			}catch(e){
				alert(e);
				return false;
			}

			return true;
		}

		// On/Off Handler
		this.g('enabled',s=(typeof s != 'undefined' ? !!s : !this.g()));
		if(!s || this.evdm) {
			this.si(s?'~':'-');
		}
		return s;
	},

	nu: function(u,b) {
		if(typeof b === 'string') {
			b = this.nu(b);
		}
		return this.ios.newURI(u,null,b||null);
	},

	observe: function(s, t, d) {
		switch(t) {
			case 'nsPref:changed':
				this.op[d] = this.g(d);
				switch(d) {
					case 'enabled':
						if(this.l(!!this.op[d])) {
							this.de();
							if(!this.op.evdm)
								this.b2(0,1);
						} else {
							this.dd();
							if(!this.op.evdm)
								this.b3();
						}
						break;
					case 'skipwhen':
					case 'remove':
						this.pp();
						break;
					case 'skipdoms':
						this.op[d] = this.op[d]
							&& this.op[d].split(",")
								.map(String.trim)
								.filter(String);
						break;
					case 'evdm':
						if(this.op.enabled)
							this.de();
						break;
				}
			default:break;
		}
	},

	oc: function(e,a) {
		const XUL_NS = 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul';
		e = document.createElementNS(XUL_NS,e);
		if(!e)return null;

		if( a ) for( let x in a) {
			e.setAttribute(x,a[x]);
		}
		return e;
	},

	pp: function() {
		for each(let p in ['skipwhen','remove']) {
			if(this.op[p] && typeof this.op[p] == 'string') try {
				if(p == 'remove')
					this.op[p] = new RegExp('\\b(?:'+this.op[p]+')=.+?(?:[&;]|$|(?=\\?))','gi');
				else
					this.op[p] = new RegExp(this.op[p]);
			} catch(e) {
				alert(_("browser.regexerr") + ' "' + p + '": '+e.message);
				this.op[p] = null;
			}
		}
	},

	si: function(i, tb) {
		if(!tb) tb = document.getElementById('cleanlinks-toolbar-button');;
		if(!tb) return;

		this.si.last = i;
		if(i == '~' && this.op.evdmki) i = 0;

		let s=tb.getAttribute('cui-areatype')=='menu-panel'? 32:16;
		tb.setAttribute('image',this.rsc('icons/'+s+(i||'')+'.png'));
	},

	gd: function() {
		try {
			return gBrowser.contentDocument;
		} catch(e) {
			return this.wd() || window.content.document;
		}
	},

	w: function(m) {
		try {
			let wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator)
				.getMostRecentWindow("navigator:browser");
			if(m)
				return wm;
			return wm.getBrowser();
		} catch(e) {return null;}
	},
	wd: function() {
		try {
			return this.w().mCurrentBrowser.contentDocument;
		} catch(e){return null;}
	},
	wl: function() {
		try {
			return this.wd().location;
		} catch(e){return null;}
	}
};
if(!("diegocr" in window))
	window.diegocr = {};
window.diegocr.cleanlinks = cleanlinks;
window.addEventListener('unload', cleanlinks, false);
// window.addEventListener(  'load', cleanlinks, false);
window.setTimeout(function() {
		cleanlinks.handleEvent({type:'load'});
	}, 911);
})();
