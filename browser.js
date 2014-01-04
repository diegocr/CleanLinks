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

const cleanlinks = {
	pkg:'CleanLinks',
	tag_b:'data-cleanedlinks',
	tag_l:'data-cleanedlink',
	tag_t:"\n \n- " + _("browser.touch"),
	tag_h:_("browser.hashtag"),
	op:null,
	ps:null,
	handleEvent: function(ev) {
		let t = cleanlinks;
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
				t.edc = t.mob ? (function(a) window.content.location = a)
					: (typeof window.openUILink !== 'function')
					? function(a,b) (b.setAttribute('href', a), b.click())
					: function(a,b,c) {
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
									return;
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
					}.bind(t);
				break;
			case 'unload':
				t.ps.removeObserver("", t);
				if(t.op.enabled) {
					t.dd();
				}
				for(let m in t)
					delete t[m];
			default:break;
		}
		ev = t = undefined;
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
		tb.setAttribute('image',this.rsc('icon16'+(d?'!':'')+'.png'));
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
		
		if(typeof b === 'string')
			b = this.nu(b);
		
		if(this.op.skipdoms) try {
			let uri = this.nu(h,b);
			
			if(~this.op.skipdoms.indexOf(uri.host))
				return h;
			
		} catch(e) {}
		
		if(/\.google\.[a-z.]+\/search\?(?:.+&)?q=http/i.test(h))
			return h;
		
		let lmt = 4, s = 0, p, ht = null, rp = this.op.remove, l = h;
		h.replace(/^javascript:.+(["'])(https?(?:\:|%3a).+?)\1/gi,function(a,b,c)(++s,h=c));
		
		if(/((?:aHR0|d3d3)[A-Z0-9+=\/]+)/gi.test(h)) try {
			let r = RegExp.$1;
			if(/\.yahoo.com$/.test(b.asciiHost))
				r = r.replace(/\/RS.*$/,'');
			let d = decodeURIComponent(atob(r));
			if(d) h='='+d;
		} catch(e) {
			Cu.reportError('Invalid base64 data for "'+h+'" at "'+(b&&b.spec)+'"\n> '+e);
		}
		
		while(--lmt && (/.\b([a-z]{2,}(?:\:|%3a)(?:\/|%2f).+)$/i.test(h) || /(?:[?=]|[^\/]\/)(www\..+)$/i.test(h))) {
			h = RegExp.$1;
			if(~(p = h.indexOf('&')))
				h = h.substr(0,p);
			h = decodeURIComponent(h);
			
			if(~(p = h.indexOf('html&')) || ~(p = h.indexOf('html%')))
				h = h.substr(0,p+4);
			else if(~(p = h.indexOf('/&')) || ~(p = h.indexOf('/%')))
				h = h.substr(0,p);
			if(h.indexOf('://') == -1)
				h = 'http://' + h;
			if(h.indexOf('/',h.indexOf(':')+2) == -1)
				h += '/';
			++s;
		}
		
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
		
		rp.lastIndex = 0;
		if( s || rp.test(h)) {
			if(~(p = h.indexOf('#'))) (ht = h.substr(p), h = h.substr(0,p));
			
			h = h.replace('&amp;','&','g').replace(rp,'').replace(/[?&]$/,'')
				+ (ht && /^[\w\/#!-]+$/.test(ht) ? ht : (this.evdm ? '':this.tag_h));
		}
		
		// if(l != h) this.d([l,h]);
		
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
			let tb = document.getElementById('cleanlinks-toolbar-button');
			if(tb) tb.setAttribute('image',this.rsc('icon16~.png'));
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
	
	edl: function(ev) {
		if(ev.button != 2 && !(ev.target instanceof XULElement)) {
			let n = ev.target;
			
			if(n.nodeName != 'A') do {
				n = n.parentNode;
			} while(n && !~['A','BODY','HTML'].indexOf(n.nodeName));
			
			if(n&&n.nodeName == 'A') {
				let t = cleanlinks,z = n.href, x = t.cl(z,n.baseURI);
				if(z != x) {
					if(t.op.highlight) {
						t.hl(n);
					}
					ev.stopPropagation();
					ev.preventDefault();
					
					t.edc(x,n,ev);
					t.blink(window);
				}
			}
		}
		ev = null;
	},
	
	blink: function(window) {
		if(this.op.highlight) {
			if((n = window.document.getElementById('urlbar'))) {
				if(!("ubg" in this))
					this.ubg = n.style.background;
				let z = this.ubg;
				n.style.background = 'rgba(245,240,0,0.6)';
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
		let tb = document.getElementById('cleanlinks-toolbar-button');
		if(tb && (!s || this.evdm)) {
			tb.setAttribute('image',this.rsc('icon16'+(!s?'-':'~')+'.png'));
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
			    alert(_("browser.regexerr") + p + '": '+e.message);
				this.op[p] = null;
			}
		}
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
