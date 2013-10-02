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

let {classes:Cc,interfaces:Ci,utils:Cu,results:Cr} = Components,addon;

Cu.import("resource://gre/modules/Services.jsm");

function rsc(n) 'resource://' + addon.tag + '/' + n;
function LOG(m) (m = addon.name + ' Message @ '
	+ (new Date()).toISOString() + "\n> "
	+ (Array.isArray(m) ? m.join("\n> "):m),
	dump(m + "\n"), Services.console.logStringMessage(m));

let ia = Services.appinfo.ID[3],
	wt = 5==ia?'mail:3pane'
		:'navigator:browser';

let i$ = {
	addHTTPObserver: function() {
		if(!addon.obson && addon.progltr && addon.enabled) {
			Services.obs.addObserver(i$, 'http-on-examine-response', false);
			addon.obson = !0;
		}
	},
	removeHTTPObserver: function() {
		if(addon.obson) {
			Services.obs.removeObserver(i$, 'http-on-examine-response', false);
			delete addon.obson;
		}
	},
	getLink: function(win,link,base) {
		win = win.QueryInterface(Ci.nsIInterfaceRequestor)
			.getInterface(Ci.nsIWebNavigation)
			.QueryInterface(Ci.nsIDocShell)
			.QueryInterface(Ci.nsIDocShellTreeItem).rootTreeItem
			.QueryInterface(Ci.nsIInterfaceRequestor)
			.getInterface(Ci.nsIDOMWindow)
			.window;
		
		let bro = win.diegocr[addon.tag],
			clt = bro.cl(link,base);
		
		// LOG(link+'\n> '+clt);
		return (clt != link) ? (bro.blink(win), clt) : null;
	},
	observe: function(s,t,d) {
		switch(t) {
			case 'nsPref:changed':
				switch(d) {
					case 'cbc':
					case 'enabled':
					case 'progltr':
						let v = addon.branch.getBoolPref(d);
						
						if(d === 'cbc') {
							this.wmForeach(function(w){
								if(addon.wms.has(w)) {
									let d = addon.wms.get(w);
									
									if(v === true) {
										d.controller=3==ia
											? new copyLinkMobile(w)
											: new copyLinkController(w);
									} else if(d.controller) {
										d.controller.shutdown();
										delete d.controller;
									}
								}
							});
							break;
						}
						
						addon[d] = v;
						if(v === true) {
							
							this.addHTTPObserver();
							
						} else {
							
							this.removeHTTPObserver();
						}
						if(d === 'enabled') {
							this.wmForeach(this[(v?'At':'De')+'tachDOMLoad']);
						}
						break;
				}
				break;
			
			case 'http-on-examine-response': {
				let c = s.QueryInterface(Ci.nsIHttpChannel);
				
				try {
					if(30 == parseInt(c.responseStatus/10) && 304 != c.responseStatus) {
						let l = c.getResponseHeader('Location');
						if(l) {
							try {
								var w = s.loadGroup.notificationCallbacks.getInterface(Ci.nsIDOMWindow);
							} catch(e) {}
							
							if(w && (l = this.getLink(w,l,c.URI))) {
								// Check for The page isn't redirecting properly...
								if(l !== c.URI.spec || !(c.loadFlags & Ci.nsIChannel.LOAD_REPLACE))
									c.setResponseHeader('Location', l, false);
							}
						}
					}
				} catch(e) {
					Cu.reportError(e);
				}
				
			}	break;
		}
	},
	wmForeach: function(callback) {
		let windows = Services.wm.getEnumerator(wt);
		while(windows.hasMoreElements()) {
			let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
			callback(domWindow);
		}
	},
	gBForeach: function(gBrowser,callback) {
		let wrapper = function(doc) {
			if(doc instanceof Ci.nsIDOMHTMLDocument) try {
				
				callback(doc);
				
				let l = doc.defaultView.frames,
					c = l.length;
				while(c--) {
					wrapper(l[c].document);
				}
			} catch(e) {
				Cu.reportError(e);
			}
		};
		
		if(typeof gBrowser.getBrowserAtIndex === 'function') {
			let l = gBrowser.browsers.length;
			
			while(l--) {
				wrapper(gBrowser.getBrowserAtIndex(l).contentDocument);
			}
		} else if(gBrowser.nodeName === 'deck') {
			let l = gBrowser.childNodes.length;
			
			while(l--) {
				wrapper(gBrowser.childNodes[l].contentDocument);
			}
		} else {
			throw new Error('Unknown gBrowser instance.');
		}
	},
	putc: function(doc,dsp) {
		doc.addEventListener('getCleanLink', dsp, true);
		loadSubScript(rsc('content.js'),doc.defaultView);
	},
	DetachDOMLoad: function(window,wmsData) {
		wmsData = wmsData || addon.wms.get(window);
		let gBrowser = getBrowser(window);
		gBrowser.removeEventListener('DOMContentLoaded', wmsData.domload, false);
		this.gBForeach(gBrowser,function(doc) {
			// LOG('detaching from ' + doc.location.href);
			doc.removeEventListener('getCleanLink',wmsData.getCleanLink,true);
		});
	},
	AttachDOMLoad: function(window,wmsData) {
		wmsData = wmsData || addon.wms.get(window);
		let gBrowser = getBrowser(window);
		gBrowser.addEventListener('DOMContentLoaded', wmsData.domload, false);
		this.gBForeach(gBrowser,function(doc) {
			// LOG('attaching to ' + doc.location.href);
			i$.putc(doc,wmsData.getCleanLink);
		});
	},
	onOpenWindow: function(aWindow) {
		let domWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindow);
		loadIntoWindowStub(domWindow);
	},
	onCloseWindow: function() {},
	onWindowTitleChange: function() {}
};

(function(global) global.loadSubScript = function(file,scope)
	Services.scriptloader.loadSubScript(file,scope||global))(this);

function copyLinkController(window) {
	let clipboardHelper = Cc["@mozilla.org/widget/clipboardhelper;1"]
		.getService(Ci.nsIClipboardHelper);
	
	let { goDoCommand } = window;
	window.goDoCommand = function(aCommand) {
		if(aCommand === 'cmd_copyLink' && addon.enabled) {
			
			let { gContextMenu } = window;
			if(gContextMenu && gContextMenu.onLink) {
				
				let link = i$.getLink(window,gContextMenu.linkURL);
				
				if(link) {
					clipboardHelper.copyString(link);
					return;
				}
			}
		}
		goDoCommand(aCommand);
	};
	
	this.shutdown = function() {
		window.goDoCommand = goDoCommand;
	};
}

function copyLinkMobile(window) {
	let nwndcm = window.NativeWindow.contextmenus;
	
	let { _getLinkURL } = nwndcm;
	nwndcm._getLinkURL = function(aLink) {
		aLink = _getLinkURL.call(nwndcm,aLink);
		
		if(aLink) {
			aLink = i$.getLink(window,aLink) || aLink;
		}
		
		return aLink;
	};
	
	this.shutdown = function() {
		nwndcm._getLinkURL = _getLinkURL;
	};
}

function loadIntoWindow(window) {
	if(wt!=window.document.documentElement.getAttribute("windowtype"))
		return;
	
	function c(n) window.document.createElement(n);
	function $(n) window.document.getElementById(n);
	function e(n,a,e,p) {
		if(!(n = c(n)))
			return null;
		
		if(a)for(let x in a)n.setAttribute(x,''+a[x]);
		if(e)for(let i = 0, m = e.length ; i < m ; ++i ) {
			if(e[i]) n.appendChild(e[i]);
		}
		if(p)p.appendChild(n);
		return n;
	}
	
	loadSubScript(rsc('browser.js'), window);
	window.diegocr[addon.tag].mob = 3==ia;
	window.diegocr[addon.tag].addon = addon;
	window.diegocr[addon.tag].LOG = LOG;
	window.diegocr[addon.tag].rsc = rsc;
	
	let wmsData = {
		TBBHandler: function(ev) {
			
			try {
				window.diegocr[addon.tag].l()
			} catch(e) {
				Cu.reportError(e);
			}
		},
		getCleanLink: function(ev) {
			let node = ev.target,
				url = node.getAttribute('url');
			
			node.setAttribute('url', i$.getLink(window,url,node.baseURI) || url);
			ev.stopPropagation();
		},
		domload: function(ev) {
			let doc = ev.originalTarget;
			
			if(doc instanceof Ci.nsIDOMHTMLDocument) {
				
				i$.putc(doc,wmsData.getCleanLink);
			}
		}
	};
	
	if(addon.branch.getBoolPref('cbc')) {
		wmsData.controller=3==ia
			? new copyLinkMobile(window)
			: new copyLinkController(window);
	}
	
	let gNavToolbox = window.gNavToolbox || $("mail-toolbox");
	if(gNavToolbox && gNavToolbox.palette) {
		let m = addon.tag+'-toolbar-button';
		gNavToolbox.palette.appendChild(e('toolbarbutton',{
			id:m,label:addon.name,class:'toolbarbutton-1',
			image:rsc('icon16.png')
		})).addEventListener('command', wmsData.TBBHandler, !1);
		
		if(!addon.branch.getPrefType("version")) {
			let nv = $('nav-bar') || $('mail-bar3');
			if( nv ) {
				nv.insertItem(m, null, null, false);
				nv.setAttribute("currentset", nv.currentSet);
				window.document.persist(nv.id, "currentset");
			}
		} else {
			[].some.call(window.document.querySelectorAll("toolbar[currentset]"),
				function(tb) {
					let cs = tb.getAttribute("currentset").split(","),
						bp = cs.indexOf(m) + 1;
					
					if(bp) {
						let at = null;
						cs.splice(bp).some(function(id) at = $(id));
						tb.insertItem(m, at, null, false);
						return true;
					}
				});
		}
		
		try {
			e('tooltip',{id:addon.tag+'-tooltip'},0,$('mainPopupSet'))
				.addEventListener('popupshowing', wmsData.popupshowing = function(ev) {
					try {
						return window.diegocr[addon.tag].l(ev);
					} catch(e) {
						Cu.reportError(e);
					}
				}, !0);
			
			$(m).setAttribute('tooltip',addon.tag+'-tooltip');
		} catch(e) {
			Cu.reportError(e);
		}
	}
	
	i$.AttachDOMLoad(window,wmsData);
	
	addon.wms.set(window,wmsData);
	gNavToolbox = null;
}

function getBrowser(w) {
	
	if(typeof w.getBrowser === 'function')
		return w.getBrowser();
	
	if("gBrowser" in w)
		return w.gBrowser;
	
	return w.BrowserApp.deck;
}

function loadIntoWindowStub(domWindow) {
	
	if(domWindow.document.readyState == "complete") {
		loadIntoWindow(domWindow);
	} else {
		domWindow.addEventListener(3==ia? "UIReady":"load", function(ev) {
			domWindow.removeEventListener(ev.type, arguments.callee, false);
			loadIntoWindow(domWindow);
		}, false);
	}
}

function unloadFromWindow(window) {
	let $ = function(n) window.document.getElementById(n);
	let btnId = addon.tag+'-toolbar-button',btn= $(btnId);
	
	try {
		window.diegocr[addon.tag].handleEvent({type:'unload'});
		delete window.diegocr[addon.tag];
	} catch(e) {
		Cu.reportError(e);
	}
	
	if(addon.wms.has(window)) {
		let wmsData = addon.wms.get(window);
		
		if(wmsData.TBBHandler && btn) {
			btn.removeEventListener('command',wmsData.TBBHandler,!1);
		}
		if(wmsData.popupshowing) {
			let tt = $(addon.tag+'-tooltip');
			if(tt) tt.removeEventListener('popupshowing', wmsData.popupshowing, !1);
		}
		if(wmsData.controller) {
			wmsData.controller.shutdown();
		}
		if(wmsData.domload) {
			i$.DetachDOMLoad(window,wmsData);
		}
		addon.wms.delete(window);
	}
	
	if(btn) {
		btn.parentNode.removeChild(btn);
	} else {
		let gNavToolbox = window.gNavToolbox || $('mail-toolbox');
		if(gNavToolbox && gNavToolbox.palette) {
			for each(let node in gNavToolbox.palette) {
				if(node && node.id == btnId) {
					gNavToolbox.palette.removeChild(node);
					break;
				}
			}
		}
	}
	
	let n;
	if((n = $(addon.tag+'-tooltip')))
		n.parentNode.removeChild(n);
}

function startup(data) {
	let tmp = {};
	Cu.import("resource://gre/modules/AddonManager.jsm", tmp);
	tmp.AddonManager.getAddonByID(data.id,function(data) {
		let io = Services.io;
		
		addon = {
			id: data.id,
			name: data.name,
			version: data.version,
			tag: data.name.toLowerCase().replace(/[^\w]/g,''),
			wms: new WeakMap()
		};
		addon.branch = Services.prefs.getBranch('extensions.'+addon.tag+'.');
		if("nsIPrefBranch2" in Ci)
			addon.branch.QueryInterface(Ci.nsIPrefBranch2);
		
		let Reset = !addon.branch.getPrefType('version')
			|| Services.vc.compare(addon.branch.getCharPref('version'),'2.4') < 0;
		
		for(let [k,v] in Iterator({
			enabled   : !0,
			skipwhen  : 'ServiceLogin|imgres\\?|watch%3Fv|auth\\?client_id|signup|'
				+ 'oauth|openid\\.ns|\\.mcstatic\\.com|sVidLoc|[Ll]ogout|submit\\?url=',
			remove    : '(?:ref|aff)\\w*|utm_\\w+|(?:merchant|programme|media)ID',
			skipdoms  : 'accounts.google.com,docs.google.com,translate.google.com,'
				+ 'login.live.com,plus.google.com,www.facebook.com,twitter.com,'
				+ 'static.ak.facebook.com,www.linkedin.com',
			highlight : !0,
			hlstyle   : 'background:rgba(252,252,0,0.6); color: #000',
			evdm      : !0,
			progltr   : !1,
			cbc       : !0
		})) {
			if(!addon.branch.getPrefType(k) || Reset) {
				switch(typeof v) {
					case 'boolean': addon.branch.setBoolPref (k,v); break;
					case 'number':  addon.branch.setIntPref  (k,v); break;
					case 'string':  addon.branch.setCharPref (k,v); break;
				}
			}
		}
		if(5!=ia) {
			addon.branch.addObserver("", i$, false);
		} else {
			['At','De'].forEach(function(i)i$[i+'tachDOMLoad']=rsc);
		}
		
		io.getProtocolHandler("resource")
			.QueryInterface(Ci.nsIResProtocolHandler)
			.setSubstitution(addon.tag,
				io.newURI(__SCRIPT_URI_SPEC__+'/../',null,null));
		
		i$.wmForeach(loadIntoWindowStub);
		Services.wm.addListener(i$);
		
		['enabled','progltr'].forEach(function(p)
			addon[p] = addon.branch.getBoolPref(p));
		i$.addHTTPObserver();
		
		// i$.startup();
		addon.branch.setCharPref('version', addon.version);
	});
}

function shutdown(data, reason) {
	
	if(reason == APP_SHUTDOWN)
		return;
	
	addon.branch.removeObserver("", i$);
	
	i$.removeHTTPObserver();
	// i$.shutdown();
	
	Services.wm.removeListener(i$);
	i$.wmForeach(unloadFromWindow);
	
	Services.io.getProtocolHandler("resource")
		.QueryInterface(Ci.nsIResProtocolHandler)
		.setSubstitution(addon.tag,null);
}

function install(data, reason) {}
function uninstall(data, reason) {}
