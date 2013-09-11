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

const Cc = Components.classes;
const Ci = Components.interfaces;

const cleanlinks = {
	pkg:'CleanLinks',
	tag_b:'data-cleanedlinks',
	tag_l:'data-cleanedlink',
	tag_t:"\n \n- CleanLinks Touch!",
	tag_h:'#',
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
	},
	b: function(ev) {
		if(ev.originalTarget instanceof HTMLDocument)
			cleanlinks.b2(ev.originalTarget);
	},
	b2: function(d,x) {
		let a,b = 0, c, e = 7;
		
		if(!d) d = this.gd();
		if(!d.body)
			return 0;
		
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
					l[c].style.background = l[c].style.color = null;
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
			
			let h1 = l[c].href, h2 = this.cl(h1);
			
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
		if(this.op.skipwhen && this.op.skipwhen.test(h))
			return h;
		
		if(this.op.skipdoms) try {
			let uri = this.nu(h,b);
			
			if(~this.op.skipdoms.indexOf(uri.host))
				return h;
			
		} catch(e) {
			this.d(e+' '+h+' '+b);
		}
		
		let lmt = 4, s = 0, p, ht = null, rp = this.op.remove;
		h.replace(/^javascript:.+(["'])(https?(?:\:|%3a).+?)\1/gi,function(a,b,c)(++s,h=c));
		
		if(/((?:aHR0|d3d3)[A-Z0-9+=\/]+)/gi.test(h)) try {
			let d = decodeURIComponent(atob(RegExp.$1));
			if(d) h='='+d;
		}catch(e){}
		
		while(--lmt && (/.\b([a-z]+(?:\:|%3a)(?:\/|%2f).+)$/i.test(h) || /(?:[?=]|[^\/]\/)(www\..+)$/i.test(h))) {
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
			if(h.indexOf('/',8) == -1)
				h += '/';
			++s;
		}
		
		rp.lastIndex = 0;
		if( s || rp.test(h)) {
			if(~(p = h.indexOf('#'))) (ht = h.substr(p), h = h.substr(0,p));
			
			h = h.replace('&amp;','&','g').replace(rp,'').replace(/[?&]$/,'')
				+ (ht && /^[\w\/#-]+$/.test(ht) ? ht : (this.evdm ? '':this.tag_h));
			
			// this.d('Cleaned link '+s+' "'+l[c].href+'" -> "'+h+'"');
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
			let tb = document.getElementById('cleanlinks-toolbar-button');
			if(tb) tb.setAttribute('image',this.rsc('icon16~.png'));
		} else {
			(this.mob ? BrowserApp.deck:gBrowser).addEventListener(this.mob?'load':'DOMContentLoaded', this.b, false);
			(this.mob ? BrowserApp.deck:gBrowser.tabContainer).addEventListener("TabSelect", this.b4, false);
			this.domWay = true;
			this.b5();
		}
	},
	
	dd: function() {
		if(this.domWay) {
			(this.mob ? BrowserApp.deck:gBrowser).removeEventListener(this.mob?'load':'DOMContentLoaded', this.b, false);
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
			} while(n && !~['A','DIV','BODY'].indexOf(n.nodeName));
			
			if(n&&n.nodeName == 'A') {
				let t = cleanlinks,z = n.href, x = t.cl(z);
				if(z != x) {
					if(t.op.highlight) {
						t.hl(n);
					}
					ev.stopPropagation();
					ev.preventDefault();
					
					switch(ev.button) {
						case 0:
							if(!(ev.ctrlKey || ev.metaKey)) {
								window.loadURI(x);
								break;
							}
						case 1:
							let bTab = Cc["@mozilla.org/preferences-service;1"]
								.getService(Ci.nsIPrefService)
								.getBoolPref('browser.tabs.loadInBackground');
							gBrowser.loadOneTab(x,null,null,null,bTab,true);
					}
					
				/*	if(ev.button == 0) {
						ev.stopPropagation();
						ev.preventDefault();
						window.content.location = x;
					} else {
						n.setAttribute('href',x);
						if(window.MutationObserver) {
							new MutationObserver(function(mns) {
								mns.forEach(function(m) (
									m.type == 'attributes' && m.attributeName == 'href'
										&& m.target.href != x && m.target.setAttribute('href',x)
								));
							}).observe(n,{attributes:true});
						}
						else n.addEventListener('DOMAttrModified',function(ev) (
							ev.attrName == 'href' && this.href != x && this.setAttribute('href',x)
						), false);
					}*/
					
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
	
	hl: function(o) {
		o.style.setProperty('background-color','rgba(252,252,0,0.7)','important');
		o.style.setProperty('color','#000','important');
	},
	
	l: function(s) {
		
		// ToolTip handler
		if(typeof s == 'object') {
			let t = cleanlinks,
				e = s.target,
				r = 0;
			
			while(e.firstChild)
				e.removeChild(e.firstChild);
			
			try {
				r = parseInt(t.wd().body.getAttribute(t.tag_b));
				if(isNaN(r))
					r = 0;
			} catch(e) {}
			
			try {
				e.appendChild(t.oc('label',{value:t.pkg,style:'text-align:center;color:red;font:italic 16px Serif,Georiga;font-weight:bold'}));
				e.appendChild(t.oc('separator',{height:1,style:'background-color:#333;margin-bottom:3px'}));
				e.appendChild(t.oc('label',{value:'Status: '+(t.g() ? 'Enabled':'Disabled')}));
				if(!t.evdm) e.appendChild(t.oc('label',{value:'Cleaned Links: '+r}));
				e.appendChild(t.oc('separator',{height:1,style:'background-color:#333;margin-bottom:3px'}));
				e.appendChild(t.oc('label',{value:'Click the icon to '+(t.g() ? 'Disable':'Enable'),style:'color:#8e9f9f;font:12px Georgia'}));
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
				alert('Error Processing CleanLinks Pattern "'+p+'": '+e.message);
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
