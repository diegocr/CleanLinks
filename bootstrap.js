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
function LOG(m) addon.debug && (m = addon.name + ' Message @ '
	+ (new Date()).toISOString() + "\n> " + (Array.isArray(m) ? m.join("\n> "):m)
	+ "\n" + new Error().stack.split("\n").map(s => s.replace(/^(.*@).+\//,'$1'))
	.join("\n"), dump(m + "\n"), Services.console.logStringMessage(m));

let ia = Services.appinfo.ID[3],
	wt = 5==ia?'mail:3pane'
		:'navigator:browser',
	cltrack = {};

let _ = (function(strings) {
	return function _(key) strings.GetStringFromName(key);
})(Services.strings.createBundle("chrome://cleanlinks/locale/browser.properties"));

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

		/**
		 * We might get a redirection from a non-browser window
		 * Eg, Chatzilla loading remote fonts from CSS motif
		 */
		if(!win.diegocr)
			return null;

		let bro = win.diegocr[addon.tag],
			clt = bro.cl(link,base);

		LOG([link,clt]);
		return (clt != link) ? (bro.blink(win), clt) : null;
	},
	observe: function(s,t,d) {
		switch(t) {
			case 'nsPref:changed':
				switch(d) {
					case 'cbc':
					case 'cltrack':
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

						if(d == 'cltrack') {
							if(v) {
								cltrack = {};
							} else {
								cltrack = undefined;
							}
							break;
						}

						if(v === true) {

							this.addHTTPObserver();

						} else {

							this.removeHTTPObserver();
						}
						if(d === 'enabled') {
							this.wmForeach(this[(v?'At':'De')+'tachDOMLoad']);
						}
					default:
						break;
				}
				break;

			case 'cleanlinks-resetoptions':
				return setOptions(!0);

			case 'cleanlinks-cltrack':
				d = JSON.parse(d);
				LOG([t].concat(d));
				return addon.cltrack && (cltrack[d[0]]=d[1]);

			case 'http-on-examine-response': {
				let c = s.QueryInterface(Ci.nsIHttpChannel);

				try {
					if(30 == parseInt(c.responseStatus/10) && 304 != c.responseStatus) {
						let l = c.getResponseHeader('Location');
						if(l) {
							try {
								var w = s.loadGroup.notificationCallbacks.getInterface(Ci.nsIDOMWindow);
							} catch(e) {}

							LOG([w&&w.location,c.originalURI.spec,c.URI.spec,l,
								c.loadFlags & Ci.nsIChannel.LOAD_REPLACE,
								c instanceof Ci.nsIWritablePropertyBag]);

							if(w && (l = this.getLink(w,l,c.URI))) {
								// Check for The page isn't redirecting properly...
								if(l !== c.URI.spec || !(c.loadFlags & Ci.nsIChannel.LOAD_REPLACE)) {

									if(c instanceof Ci.nsIWritablePropertyBag) try {

										let r = c.getProperty(addon.tag);
										if(r == l) break;

									} catch(e) {}

									c.setResponseHeader('Location', l, false);

									if(c instanceof Ci.nsIWritablePropertyBag)
										c.setProperty(addon.tag, l);
								}
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
		if(!wmsData) return;
		let gBrowser = getBrowser(window);
		gBrowser.removeEventListener('DOMContentLoaded', wmsData.domload, false);
		i$.gBForeach(gBrowser,function(doc) {
			// LOG('detaching from ' + doc.location.href);
			doc.removeEventListener('getCleanLink',wmsData.getCleanLink,true);
		});
	},
	AttachDOMLoad: function(window,wmsData) {
		wmsData = wmsData || addon.wms.get(window);
		if(!wmsData) return;
		let gBrowser = getBrowser(window);
		gBrowser.addEventListener('DOMContentLoaded', wmsData.domload, false);
		i$.gBForeach(gBrowser,function(doc) {
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
		if(aCommand === 'cmd_copyLink' && addon.enabled) try {

			let { gContextMenu } = window;
			if(gContextMenu && gContextMenu.onLink) {

				let link = i$.getLink(window,gContextMenu.linkURL);

				if(link) {
					clipboardHelper.copyString(link);
					return;
				}
			}
		} catch(e) {
			Cu.reportError(e);
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
		try {
			aLink = _getLinkURL.call(nwndcm,aLink);

			if(aLink) {
				aLink = i$.getLink(window,aLink) || aLink;
			}
		} catch(e) {
			Cu.reportError(e);
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
	function cLabel(i,u) {
		u = u || i;
		i = e('label',{value:i,tooltiptext:u,style
			:'cursor:pointer;text-decoration:underline'});
		if(i) i.addEventListener('click',function() {
			let b = getBrowser(window);
			b.selectedTab = b.addTab(u);
		}, false);
		return i;
	}

	loadSubScript(rsc('browser.js'), window);
	window.diegocr[addon.tag].mob = 3==ia;
	window.diegocr[addon.tag].addon = addon;
	window.diegocr[addon.tag].LOG = LOG;
	window.diegocr[addon.tag].rsc = rsc;

	let wmsData = {
		TBBHandler: function(ev) {
			ev.preventDefault();

			switch(ev.button) {
				case 0:
					try {
						window.diegocr[addon.tag].l()
					} catch(e) {
						Cu.reportError(e);
					}
					break;
				case 2: {
					let x = $(addon.tag+'-context');
					if(!x) break;

					while(x.firstChild)
						x.removeChild(x.firstChild);

					e('vbox',{style:'padding:4px;min-width:320px'},[
							e('hbox',{align:'baseline',flex:1},[
								e('image',{src:rsc('icon.png')}),
								e('vbox',{},[
									e('label',{value:addon.name+' v'+addon.version,style:'font:italic 16px Georgia'}),
									e('label',{value:'Copyright (c) 2014 Diego Casorran'}),
									cLabel('https://github.com/diegocr/cleanlinks')
								]),
							]),
							e('spacer',{minheight:9}),
							e('groupbox',0,[
								e('description',{ id:addon.tag+'-lbd' }),
								// e('separator'),
								e('listbox',{flex:1,id:addon.tag+'-listbox',rows:10,seltype:'multiple',minheight:280},[
									e('listhead',0,[
										e('listheader',{label:_('bootstrap.listheader.original')}),
										e('listheader',{label:_('bootstrap.listheader.cleaned')})
									]),
									e('listcols',0,[e('listcol'),e('listcol')])
								]),
								e('hbox',0,[
									e('spacer',{flex:1}),
									e('button',{label:_('bootstrap.whitelist.button'),id:addon.tag+'-applywl'}),
								])
							])
						],x);

					let t = $(addon.tag+'-listbox'), d = getSkipDomA(), cc = 0;
					for(let l in cltrack) {
						try {
							let u1 = Services.io.newURI(l,null,null);
								u2 = Services.io.newURI(cltrack[l],null,null);
							if(~d.indexOf(u1.host)) continue;
							e('listitem',{tooltiptext:l,maxheight:18},[
								e('listcell',{
									label:l,image:u1.prePath+'/favicon.ico',
									'class':'listcell-iconic',crop:'center',
									style:'max-width:310px'}),
								e('listcell',{
									label:u2.spec,image:u2.prePath+'/favicon.ico',
									'class':'listcell-iconic', crop:'right',
									style:'max-width:270px'})
							],t);
							++cc;
						} catch(e) {
							Cu.reportError(e);
						}
					}
					$(addon.tag+'-applywl').addEventListener('command', function() {
						d = getSkipDomA();
						while(1) {
							let i = t.getSelectedItem(0);
							i = i && t.removeItemAt(t.getIndexOfItem(i));
							if(!i) break;

							i = i.firstElementChild;
							let u = Services.io.newURI(i.getAttribute('label'),null,null);
							d.push(u.host);
						}
						addon.branch.setCharPref('skipdoms', d.join(","));
					}, !1);

					x._context = true;
					x.openPopup(ev.currentTarget);
					
					let s = $(addon.tag+'-lbd');
					s.style.maxWidth = Math.max(460,t.boxObject.width) + "px";
					s.textContent = _('bootstrap.whitelist.description');
					
					if(cc == 0) {
						t.lastChild.lastChild.flex = 1;
					}
				}
				default:break;
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

				i$.putc(doc,this.getCleanLink);
			}
		}
	};
	wmsData.domload = wmsData.domload.bind(wmsData);

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
		})).addEventListener('click', wmsData.TBBHandler, !1);

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
						let at = null, f = [],
						xul={spacer:1,spring:1,separator:1};
						cs.splice(bp).some(function(id)
							(at=$(id))?!0:(f.push(id),!1));
						at&&f.length&&f.forEach(function(n)xul[n]
							&&(at=at&&at.previousElementSibling));
						tb.insertItem(m, at, null, false);
						return true;
					}
				});
		}

		try {
			e('tooltip',{id:addon.tag+'-tooltip'},0,$('mainPopupSet'))
				.addEventListener('popupshowing',
				wmsData.popupshowing = function(ev) {
					try {
						return window.diegocr[addon.tag].l(ev);
					} catch(e) {
						Cu.reportError(e);
					}
				}, !0);
			e('panel',{id:addon.tag+'-context',backdrag:'true',
				position:'bottomcenter topright',type:'arrow',flip:'slide'},
				0, $('mainPopupSet'));

			let sTT = function() {
				let n = $(m);
				n&&n.setAttribute('tooltip',addon.tag+'-tooltip');
				n&&n.setAttribute('context',addon.tag+'-context');
				return !!n;
			};
			sTT() || window.addEventListener('aftercustomization',sTT,false);
		} catch(e) {
			Cu.reportError(e);
		}
	}

	i$.AttachDOMLoad(window,wmsData);

	addon.wms.set(window,wmsData);
	gNavToolbox=wmsData=undefined;
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
			btn.removeEventListener('click',wmsData.TBBHandler,!1);
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
	
	['popup','context'].forEach(function(n) {
		if((n = $(addon.tag+'-'+n)))
			n.parentNode.removeChild(n);
	});
}

function getSkipDomA() {
	return (addon.branch.getPrefType('skipdoms')
		&& addon.branch.getCharPref('skipdoms') || '')
			.split(',').map(String.trim).filter(String);
}

function setOptions(Reset) {
	let Options = {
		enabled   : !0,
		skipwhen  : 'ServiceLogin|imgres\\?|watch%3Fv|auth\\?client_id|signup|'
			+ 'oauth|openid\\.ns|\\.mcstatic\\.com|sVidLoc|[Ll]ogout|submit\\?url=|magnet:',
		remove    : '(?:ref|aff)\\w*|utm_\\w+|(?:merchant|programme|media)ID',
		skipdoms  : 'accounts.google.com,docs.google.com,translate.google.com,'
			+ 'login.live.com,plus.google.com,www.facebook.com,twitter.com,'
			+ 'static.ak.facebook.com,www.linkedin.com,www.virustotal.com,'
			+ 'account.live.com,admin.brightcove.com,www.mywot.com,'
			+ 'webcache.googleusercontent.com',
		highlight : !0,
		hlstyle   : 'background:rgba(252,252,0,0.6); color: #000',
		evdm      : !0,
		progltr   : !1,
		cbc       : !0,
		gotarget  : !1,
		repdelay  :  3,
		cltrack   : !0
	};
	for(let [k,v] in Iterator(Options)) {
		if(!addon.branch.getPrefType(k) || Reset) {
			switch(typeof v) {
				case 'boolean': addon.branch.setBoolPref (k,v); break;
				case 'number':  addon.branch.setIntPref  (k,v); break;
				case 'string':  addon.branch.setCharPref (k,v); break;
			}
		}
	}

	if(!Reset && VersionLTCheck(addon.version)) {
		LOG('Checking new domains...');

		let src = Options.skipdoms.split(',');
		let dst = getSkipDomA();

		src.forEach(function(d) {
			if(!~dst.indexOf(d)) {
				LOG('Adding domain '+d);
				dst.push(d);
			}
		});

		addon.branch.setCharPref('skipdoms', dst.join(","));
	}
}

function VersionLTCheck(v) {
	return !addon.branch.getPrefType('version')
		|| Services.vc.compare(addon.branch.getCharPref('version'),v) < 0;
}

let scope = this;
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

		addon.debug = 'a' === addon.version.replace(/[\d.]/g,'');

		let Reset = VersionLTCheck('2.4');

		setOptions(Reset);

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

		['enabled','progltr','cltrack'].forEach(function(p)
			addon[p] = addon.branch.getBoolPref(p));
		i$.addHTTPObserver();

		Services.obs.addObserver(i$,'cleanlinks-resetoptions', false);
		Services.obs.addObserver(i$,'cleanlinks-cltrack', false);

		// i$.startup();
		addon.branch.setCharPref('version', addon.version);
	});
}

function shutdown(data, reason) {

	if(reason == APP_SHUTDOWN)
		return;

	Services.obs.removeObserver(i$,'cleanlinks-resetoptions');
	addon.branch.removeObserver("", i$);

	i$.removeHTTPObserver();
	// i$.shutdown();

	Services.wm.removeListener(i$);
	i$.wmForeach(unloadFromWindow);

	Services.io.getProtocolHandler("resource")
		.QueryInterface(Ci.nsIResProtocolHandler)
		.setSubstitution(addon.tag,null);

	Services.strings.flushBundles();
}

function install(data, reason) {}
function uninstall(data, reason) {}
