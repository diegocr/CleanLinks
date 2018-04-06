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

(function ()
{

	let { classes: Cc, interfaces: Ci, utils: Cu, results: Cr } = Components,
		{ Services } = Cu.import("resource://gre/modules/Services.jsm", {});

	let _ = (function (strings)
	{
		return function _(key) strings.GetStringFromName(key);
	})(Services.strings.createBundle("chrome://cleanlinks/locale/browser.properties"));

	let handledElsewhere = function () false;

	try
	{
		let { XPIProvider: xS } = Cu.import((
			parseInt(Services.appinfo.version) > 29 ? 'resource://gre/modules/addons/XPIProvider.jsm' : 'resource://gre/modules/XPIProvider.jsm'
		), {});
		if ((xS = xS.bootstrapScopes['{c9d31470-81c6-4e3e-9a37-46eb9237ed3a}']))
		{
			if (typeof xS.getPrefs === 'function')
				handledElsewhere = function (node) Boolean(xS.getProvider(node, xS.getPrefs()));
		}
	}
	catch (e)
	{
		Cu.reportError(e);
	}

	const cleanlinks = {
		pkg: 'CleanLinks',                              // {addon.name} v{addon.version}
		attr_cleaned_count: 'data-cleanedlinks',
		attr_cleaned_link: 'data-cleanedlink',
		str_cleanlink_touch: "\n \n- " + _("browser.touch"), // "\n\n- CleanLinks Touch!"
		str_hashtag: _("browser.hashtag"),                   // "#"
		afterCustimizationEvent: 'aftercustomization',
		prefValues: null,
		prefBranch: null,

		handleEvent: function (evt)
		{
			if (evt.type != cleanlinks.afterCustimizationEvent)
				window.removeEventListener(evt.type, cleanlinks, false);

			cleanlinks.pkg = cleanlinks.addon.name + ' v' + cleanlinks.addon.version;
			switch (evt.type)
			{
				case 'load':
					cleanlinks.prefBranch = cleanlinks.addon.branch;
					cleanlinks.prefValues = {};
					for each(let prefName in cleanlinks.prefBranch.getChildList("", {}))
						cleanlinks.prefValues[prefName] = cleanlinks.getPref(prefName);

					cleanlinks.loadRegexPrefs();
					if (cleanlinks.load(Boolean(cleanlinks.prefValues.enabled)))
						cleanlinks.enableEvents();

					cleanlinks.prefBranch.addObserver("", cleanlinks, false);
					cleanlinks.IOService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
					cleanlinks.observe(null, 'nsPref:changed', 'skipdoms');
					if (cleanlinks.IOService.newChannel !== 'function')
					{
						cleanlinks.newChannel = function (aSpec, aBaseURI)
						{
							return this.IOService.newChannel2(aSpec,
								null,
								aBaseURI,
								null, null, null,
								Ci.nsILoadInfo.SEC_NORMAL,
								Ci.nsIContentPolicy.TYPE_OTHER);
						};
					}
					window.addEventListener(cleanlinks.afterCustimizationEvent, cleanlinks, false);
					cleanlinks.eventDoClick = cleanlinks.mob ? (function (a) window.content.location = a)
						: (typeof window.openUILink !== 'function')
						? function (a, b)(b.setAttribute('href', a), b.click())
						: function (a, b, c)
						{
							if (c.button == 0 && c.altKey)
							{
								return false; // alt+click, do nothing
							}
							if (this.prefValues.gotarget && 0 == c.button && !(c.shiftKey || c.ctrlKey || c.metaKey || c.altKey))
							{
								let target = b.hasAttribute('target') && b.getAttribute('target') || '_self';
								if ("_blank" == target)
									c.button = 1;
								else
								{
									let wnd = b.ownerDocument.defaultView,
										wfr = content.frames;

									switch (target)
									{
										case '_top':
											wnd = wnd.top;
											break;
										case '_parent':
											wnd = wnd.parent;
											break;
										case '_self':
											if (!wfr.length)
												wnd = null;
											break;
										default:
											[].some.call(wfr, function (f) f.name == target && (wnd = f));
									}

									if (wnd)
									{
										try
										{
											wnd.location = a;
											return true;
										}
										catch (e) { Cu.reportError(e); }
									}
								}
							}
							openUILink(a, c,
							{
								relatedToCurrent: true,
								inBackground: (function (p, n) p.getPrefType(n)
									&& p.getBoolPref(n))(Services.prefs,
									'browser.tabs.loadInBackground')
							});
							return true;
						}.bind(cleanlinks);
					break;

				case cleanlinks.afterCustimizationEvent:
					window.setTimeout(() => cleanlinks.setIcon(cleanlinks.setIcon.last), 400);
					break;

				case 'unload':
					cleanlinks.prefBranch.removeObserver("", cleanlinks);
					if (cleanlinks.prefValues.enabled)
						cleanlinks.disableEvents();

					window.removeEventListener(cleanlinks.afterCustimizationEvent, cleanlinks, false);
					for (let m in cleanlinks)
						delete cleanlinks[m];
			}

			evt = undefined;
		},

		onDocumentLoaded: function (evt)
		{
			if (evt.originalTarget instanceof HTMLDocument)
			{
				let doc = evt.originalTarget;
				cleanlinks.recursiveCleanLinksInDoc(doc);
				if (cleanlinks.prefValues.repdelay)
				{
					doc.defaultView.addEventListener('click', function (evt)
					{
						// Just the worst way ever to handle ajax...
						setTimeout(cleanlinks.recursiveCleanLinksInDoc.bind(cleanlinks, doc, 0), cleanlinks.prefValues.repdelay * 1000);
					}, true);
				}
			}
		},

		recursiveCleanLinksInDoc: function (doc, isInnerDoc)
		{
			if (!doc) doc = this.getDocument();
			if (!doc.body) return 0;

			let nCleanedLinks = this.cleanLinksInDoc(doc), c;
			// let a, e=7; while(--e && (a=this.cleanLinksInDoc(doc))) nCleanedLinks += a;

			if (isInnerDoc)
			{
				let frames = doc.defaultView.frames;
				c = frames.length;
				while (c--)
					nCleanedLinks += this.recursiveCleanLinksInDoc(frames[c].document, 2);

				if (isInnerDoc == 2) return nCleanedLinks;
			}

			while (doc.defaultView.frameElement)
				doc = doc.defaultView.frameElement.ownerDocument;

			if (doc.body)
			{
				if (doc.body.hasAttribute(this.attr_cleaned_count))
					nCleanedLinks += parseInt(doc.body.getAttribute(this.attr_cleaned_count));
				doc.body.setAttribute(this.attr_cleaned_count, nCleanedLinks);
			}
			this.updateToolbarCleanCount(doc, nCleanedLinks);
			return nCleanedLinks;
		},

		recursiveUndoCleanLinksInDoc: function (doc, isInnerDoc)
		{
			if (!doc) doc = this.getDocument();
			if (!doc.body) return;

			let links = doc.getElementsByTagName('a'),
				c = links.length;

			while (c--)
			{
				if (links[c].hasAttribute(this.attr_cleaned_link))
				{
					links[c].setAttribute('href', links[c].getAttribute(this.attr_cleaned_link));
					links[c].setAttribute('title', links[c].getAttribute('title')
							.replace(this.str_cleanlink_touch.replace(/^\s+/, ''), '').replace(/\s+$/, ''));
					links[c].style.setProperty('border-bottom', '0px', 'important');

					// remove highlight styling
					if (this.prefValues.highlight)
						this.highlightLink(links[c], true);
				}
			}

			let frames = doc.defaultView.frames;
			c = frames.length;
			while (c--)
				this.recursiveUndoCleanLinksInDoc(frames[c].document, 2);

			if (isInnerDoc) return;

			doc.body.setAttribute(this.attr_cleaned_count, 0);
			this.updateToolbarCleanCount(doc);
		},

		onTabSelected: function (evt)
		{
			if (!(evt.originalTarget instanceof XULElement))
				return;

			if (!cleanlinks.prefValues.enabled)
				cleanlinks.recursiveUndoCleanLinksInDoc();
			else
				cleanlinks.recursiveCleanLinksInDoc();

			// cleanlinks.updateToolbarCleanCount();
		},

		updateToolbarCleanCount: function (doc, count)
		{
			let toolbar = document.getElementById('cleanlinks-toolbar-button');
			if (!toolbar) return;

			if (!doc)
				doc = this.getDocument();

			try
			{
				let activeWin = Application.activeWindow;
				if (activeWin.activeTab.document != doc || !(doc = doc.body))
					return;
			}
			catch (e)
			{
				return;
			}

			this.setIcon((count || parseInt(doc.getAttribute(this.attr_cleaned_count))) && '!', toolbar);
		},

		cleanLinksInDoc: function (doc)
		{
			let links = doc.getElementsByTagName('a'),
				nLinks = links.length, nCleanedLinks = 0;

			while (nLinks--)
			{
				let href = links[nLinks].href,
					cleanedHref = this.cleanLink(href, links[nLinks].baseURI);

				if (href != cleanedHref)
				{
					++nCleanedLinks;

					if (!(links[nLinks].hasAttribute(this.attr_cleaned_link)))
					{
						links[nLinks].setAttribute(this.attr_cleaned_link, links[nLinks].href);

						let m = links[nLinks].hasAttribute('title') ? links[nLinks].getAttribute('title') : '';
						m += this.str_cleanlink_touch;
						links[nLinks].setAttribute('title', m.replace(/^\s+/, ''));
					}
					links[nLinks].setAttribute('href', cleanedHref);
					links[nLinks].style.setProperty('border-bottom', '1px dotted #9f9f8e', 'important');

					if (this.prefValues.highlight)
						this.highlightLink(links[nLinks]);
				}
			}
			return nCleanedLinks;
		},

		cleanLink: function (link, base)
		{
			if (!link || link.startsWith("view-source:") || (this.prefValues.skipwhen && this.prefValues.skipwhen.test(link)))
				return link;

			if (!base)
			{
				if (/^https?:/.test(link))
					base = link;
				else
					base = content.location.href;
			}

			if (typeof base === 'string')
				base = this.newURI(base);

			let linkURI;
			if (this.prefValues.skipdoms)
			{
				try
				{
					linkURI = this.newURI(link, base);

					if (this.prefValues.skipdoms.indexOf(linkURI.host)) !== -1
						return link;
				}
				catch (e) {}
			}

			if (this.prefValues.ignhttp && !(/^https?:/.test(typeof linkURI !) 'undefined' ? linkURI.spec : link)))
				return link;

			if (/\.google\.[a-z.]+\/search\?(?:.+&)?q=http/i.test(link)
				|| /^https?:\/\/www\.amazon\.[\w.]+\/.*\/voting\/cast\//.test(link)
			) return link;

			let s = 0,
				origLink = link,
				isYahooLink = /\.yahoo.com$/.test(base.asciiHost);
			link.replace(/^javascript:.+(["'])(https?(?:\:|%3a).+?)\1/gi, function (a, base, c)(++s, link = c));

			if (/\b((?:aHR0|d3d3)[A-Z0-9+=\/]+)/gi.test(link))
			{
				try
				{
					let r = RegExp.$1;
					if (isYahooLink)
						r = r.replace(/\/RS.*$/, '');

					let decoded = decodeURIComponent(atob(r));
					if (decoded)
						link = '=' + decoded;
				}
				catch (e)
				{
					Cu.reportError('Invalid base64 data for "' + link + '" at "' + (base && base.spec) + '"\n> ' + e);
				}
			}
			else
			{
				switch (base.asciiHost)
				{
					case 'www.tripadvisor.com':
						if (link.indexOf('-a_urlKey') !== -1)
							link = '=' + decodeURIComponent(link.replace(/_+([a-f\d]{2})/gi, '%$1')
								.replace(/_|%5f/ig, '')).split('-aurl.').pop().split('-aurlKey').shift();
						break;
					default:
						switch (linkURI && linkURI.asciiHost || (link.match(/^\w+:\/\/([^/]+)/) || []).pop())
						{
							case 'redirect.disqus.com':
								if (link.indexOf('/url?url=') !== -1)
									link = '=' + link.match(/url\?url=([^&]+)/).pop().split(/%3a[\w-]+$/i).shift();
								break;
						}
				}
			}

			let lmt = 4;
			while (--lmt && (/(?:.\b|3D)([a-z]{2,}(?:\:|%3a)(?:\/|%2f){2}.+)$/i.test(link) || /(?:[?=]|[^\/]\/)(www\..+)$/i.test(link)))
			{
				let pos;
				link = RegExp.$1;
				if ((pos = link.indexOf('&')) !== -1)
					link = link.substr(0, pos);
				link = decodeURIComponent(link);

				if ((pos = link.indexOf('html&')) !== -1 || (pos = link.indexOf('html%')) !== -1)
					link = link.substr(0, pos + 4);
				else if ((pos = link.indexOf('/&')) !== -1) // || (pos = link.indexOf('/%')) !== -1)
					link = link.substr(0, pos);
				if (link.indexOf('://') == -1)
					link = 'http://' + link;
				if (link.indexOf('/', link.indexOf(':') + 2) == -1)
					link += '/';
				++s;
			}

			link = link.replace(/^h[\w*]+(ps?):/i, 'htt$1:');

			try
			{
				// Check if the protocol can be handled...
				this.newChannel(link, base || null);
			}
			catch (e)
			{
				if (e.result == Cr.NS_ERROR_UNKNOWN_PROTOCOL)
					link = origLink;
				else
				{
					if (link.split(':').pop().length < 3)
						link = origLink;
					else
					{
						Cu.reportError(e);
						this.debugLog('^^ Unhandled error for "' + link + '" at "' + (base && base.spec) + '"');
					}
				}
			}

			/*	if (origLink != link) {
					try {
						this.newURI(link);
					} catch(e) {
						this.debugLog('Got an invalid URL: ' + link);
						this.debugLog(e);
						link = origLink;
					}
				}*/

			if (isYahooLink)
				link = link.replace(/\/R[KS]=\d.*$/, '');

			this.prefValues.remove.lastIndex = 0;
			if (s || this.prefValues.remove.test(link))
			{
				let pos, ht = null;
				if ((pos = link.indexOf('#')) !== -1)
					ht = link.substr(pos), link = link.substr(0, pos);

				link = link.replace(/&amp;/g, '&').replace(this.prefValues.remove, '').replace(/[?&]$/, '')
					+ (ht && /^[\w\/#!-]+$/.test(ht) ? ht : (this.cleanOnClick ? '' : this.str_hashtag));
			}

			// if(origLink != link) this.debugLog([l,link]);
			if (origLink != link)
				Services.obs.notifyObservers(this, 'cleanlinks-cltrack', JSON.stringify([linkURI && linkURI.spec || origLink, link]));

			return link;
		},

		debugLog: function (msg)
		{
			this.LOG(msg);
		},

		enableEvents: function ()
		{
			this.disableEvents();

			if (this.prefValues.evdm)
			{
				document.documentElement.addEventListener('click', this.onClickListener, true);
				this.cleanOnClick = true;
				this.setIcon('~');
			}
			else
			{
				(this.mob ? BrowserApp.deck : gBrowser).addEventListener('DOMContentLoaded', this.onDocumentLoaded, false);
				(this.mob ? BrowserApp.deck : gBrowser.tabContainer).addEventListener("TabSelect", this.onTabSelected, false);
				this.cleanOnDOMLoad = true;
				this.updateToolbarCleanCount();
			}
		},

		disableEvents: function ()
		{
			if (this.cleanOnDOMLoad)
			{
				(this.mob ? BrowserApp.deck : gBrowser).removeEventListener('DOMContentLoaded', this.onDocumentLoaded, false);
				(this.mob ? BrowserApp.deck : gBrowser.tabContainer).removeEventListener("TabSelect", this.onTabSelected, false);
				delete this.cleanOnDOMLoad;
			}
			else if (this.cleanOnClick)
			{
				document.documentElement.removeEventListener('click', this.onClickListener, true);
				delete this.cleanOnClick;
			}
		},

		textFindLink: function (node)
		{
			let pos, selection = node.ownerDocument && node.ownerDocument.defaultView.getSelection();

			// this.debugLog(['SEL', selection.isCollapsed, selection.focusNode&&selection.focusNode.data, selection.focusOffset]);

			// if selection has a node with data, and we can get the offset in that data
			if (selection && selection.isCollapsed && selection.focusNode && selection.focusNode.data && (pos = selection.focusOffset))
			{
				// unsanitized content of selection
				let content = selection.focusNode.data.substr(--pos);

				// sanitize selection: remove 0-space tags, replace other tags with spaces
				let text = node.innerHTML.replace(/<\/?wbr>/ig, '').replace(/<[^>]+?>/g, ' ');

				// recover position of selection in sanitized text
				pos = text.indexOf(content) + 1;
				if (pos === 0)
				{
					text = node.textContent;
					pos = text.indexOf(content) + 1;
				}

				// tools to modify boundaries of selection, until a reasonable url
				let boundaryChars = ' "\'<>\n\r\t()[]|',
					protectedBoundaryChars = boundaryChars.replace(/(.)/g, '\\$1'),
					trimEndRegex = RegExp("[" + protectedBoundaryChars + "]+$");

				// move start of selection backwards until start of data or a boundary character
				while (pos && boundaryChars.indexOf(text[pos]) === -1)
					--pos;

				text = (pos && text.substr(++pos) || text)
				text = text.match(/^\s*(?:\w+:\/\/|www\.)[^\s">]{4,}/);

				if (text)
				{
					text = text.shift().trim().replace(trimEndRegex, '');
					if (text.indexOf('://') === -1)
						text = 'http://' + text;
				}
				// this.debugLog(['RES',pos,text,content]);

				return text;
			}

			// this.debugLog(['TEXTCL ' + text]);
			return undefined;
		},

		onClickListener: function (evt)
		{
			if (evt.button != 2 && !(evt.target.ownerDocument instanceof XULDocument))
			{
				let node = evt.target, textLink = null;

				if (node.nodeName != 'A' && !evt.altKey && cleanlinks.prefValues.textcl)
					textLink = cleanlinks.textFindLink(node);

				if (node.nodeName != 'A' && !textLink)
					do {
						node = node.parentNode;
					} while (node && ['A', 'BODY', 'HTML'].indexOf(node.nodeName) === -1);

				if (textLink || (node && node.nodeName == 'A' && !handledElsewhere(node)))
				{
					switch (textLink || node.ownerDocument.location.hostname)
					{
						case 'twitter.com':
							if (node.hasAttribute('data-expanded-url'))
								textLink = node.getAttribute('data-expanded-url');
							break;
						case 'www.facebook.com':
							if (('' + node.getAttribute('onmouseover')).indexOf('LinkshimAsyncLink') !== -1)
								textLink = node.href;
					}
					// clean text on pre-clean for a tratement with baseUI
					let link = textLink || node.href;
					let cleanedLink = cleanlinks.cleanLink(link, node.baseURI);
					if (textLink || link != cleanedLink)
					{
						evt.stopPropagation();
						evt.preventDefault();

						if (cleanlinks.eventDoClick(cleanedLink, node, evt))
						{
							if (cleanlinks.prefValues.highlight)
								cleanlinks.highlightLink(node);

							// different color based on text or node lnik
							cleanlinks.blink(window, textLink ? 0 : 217);
						}
					}
				}
			}
		},

		blink: function (window, red) // visually display that the link was cleaned, red allows to vary from green to yellow
		{
			if (this.prefValues.highlight)
			{
				let node;
				if ((node = window.document.getElementById('urlbar')))
				{
					// ubg = Undo BackGround (?)
					if (!("ubg" in this))
						this.ubg = node.style.background;
					let originalBackground = this.ubg;

					node.style.background = 'rgba(' + (red || 245) + ',240,0,0.6)';

					// Reset after 300ms
					if (this.ubgt)
						window.clearTimeout(this.ubgt);
					this.ubgt = window.setTimeout(function () node.style.background = originalBackground, 300);
				}
			}
		},

		getPref: function (name)
		{
			// by default, check if enabled
			if (typeof name == 'undefined')
				name = 'enabled';

			try
			{
				switch (this.prefBranch.getPrefType(name))
				{
					case Ci.nsIPrefBranch.PREF_STRING:
						return this.prefBranch.getCharPref(name);
					case Ci.nsIPrefBranch.PREF_INT:
						return this.prefBranch.getIntPref(name);
					case Ci.nsIPrefBranch.PREF_BOOL:
						return this.prefBranch.getBoolPref(name);
				}
			}
			catch (e) { /* this.e('pGet: '+e); */ }
			return null;
		},

		setPref: function (name, value)
		{
			try
			{
				switch (typeof (value))
				{
					case "string":
						this.prefBranch.setCharPref(name, value);
						break;
					case "boolean":
						this.prefBranch.setBoolPref(name, value);
						break;
					case "number":
						this.prefBranch.setIntPref(name, value);
						break;
				}
			}
			catch (e) { /* this.e('pSet: '+e); */ }
		},

		highlightLink: function (node, remove)
		{
			// parse and apply ;-separated list of key:val style properties
			('' + this.prefValues.hlstyle).split(';').forEach(function (r)
			{
				let [prop, val] = r.split(':').map(String.trim);
				node.style.setProperty(prop, remove ? '' : val, 'important');
			});
		},

		load: function (s)
		{
			// ToolTip handler: s is a tooltip event
			if (typeof s == 'object')
			{
				let toolTip = s.target,
					cleanedCount = 0,
					isOn = cleanlinks.getPref('enabled');

				while (toolTip.firstChild)
					toolTip.removeChild(toolTip.firstChild);

				try
				{
					cleanedCount = parseInt(cleanlinks.getWinDocument().body.getAttribute(cleanlinks.attr_cleaned_count));
					if (isNaN(cleanedCount))
						cleanedCount = 0;
				}
				catch (e) {}

				try
				{
					toolTip = toolTip.appendChild(cleanlinks.objectCreate('vbox',
					{
						style: 'margin:3px 5px;padding:5px 9px;'
							+ 'border:1px solid rgba(20,20,30,0.4);box-shadow:inset 0 0 3px 0 rgba(0,0,0,0.6);'
							+ 'border-radius:6px;background-color:#e4e5e0;text-align:center'
					}));
					toolTip.appendChild(cleanlinks.objectCreate('label',
					{
						value: cleanlinks.pkg, style: 'color:#00adef;font:11pt "message-box"'
					}));

					toolTip.appendChild(cleanlinks.objectCreate('label',
					{
						value: _("browser.status") + (isOn ? _("browser.enabled") : _("browser.disabled"))
					}));

					if (!cleanlinks.cleanOnClick && isOn)
						toolTip.appendChild(cleanlinks.objectCreate('label', { value: _("browser.cleanedlinks") + cleanedCount }));

					toolTip.appendChild(cleanlinks.objectCreate('label',
					{
						value: _("browser.clicktheicon") + (isOn ? _("browser.disable") : _("browser.enable")),
						style: 'color:#8e9f9f;font:12px Georgia'
					}));
				}
				catch (e)
				{
					alert(e);
					return false;
				}

				return true;
			}

			// Otherwise s is a boolean for enabling/disabling, defaults to toggling
			// On/Off Handler
			if (typeof s == 'undefined')
				s = Boolean(!this.getPref('enabled'))

			this.setPref('enabled', s)

			if (!s)
				this.setIcon('-');
			else if (this.cleanOnClick)
				this.setIcon('~');

			return s;
		},

		newURI: function (uriStr, baseUrlStr)
		{
			if (typeof baseUrlStr === 'string')
				baseUrlStr = this.newURI(baseUrlStr);

			return this.IOService.newURI(uriStr, null, baseUrlStr || null);
		},

		newChannel: function (aSpec, aBaseURI)
		{
			return this.IOService.newChannel(aSpec, null, aBaseURI);
		},

		observe: function (maybeEvent, eventType, prefName) // called on settings change
		{
			switch (eventType)
			{
				case 'nsPref:changed':
					this.prefValues[prefName] = this.getPref(prefName);
					switch (prefName)
					{
						case 'enabled':
							if (this.load(Boolean(this.prefValues[prefName])))
							{
								this.enableEvents();
								if (!this.prefValues.evdm)
									this.recursiveCleanLinksInDoc(0, 1);
							}
							else
							{
								this.disableEvents();
								if (!this.prefValues.evdm)
									this.recursiveUndoCleanLinksInDoc();
							}
							break;
						case 'skipwhen':
						case 'remove':
							this.loadRegexPrefs();
							break;
						case 'skipdoms':
							this.prefValues[prefName] = this.prefValues[prefName]
								&& this.prefValues[prefName].split(",")
								.map(String.trim)
								.filter(String);
							break;
						case 'evdm':
							if (this.prefValues.enabled)
								this.enableEvents();
							break;
					}
				default:
					break;
			}
		},

		objectCreate: function (xulElementName, attributes)
		{
			const XUL_NS = 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul';
			let xulElement = document.createElementNS(XUL_NS, xulElementName);
			if (!xulElement) return null;

			if (attributes)
				for (let attrName in attributes)
					xulElement.setAttribute(attrName, attributes[attrName]);

			return xulElement;
		},

		loadRegexPrefs: function ()
		{
			try
			{
				if (this.prefValues['skipwhen'] && typeof this.prefValues['skipwhen'] == 'string')
					this.prefValues['skipwhen'] = new RegExp(this.prefValues['skipwhen']);
			}
			catch (e)
			{
				alert(_("browser.regexerr") + ' "skipwhen": ' + e.message);
				this.prefValues['skipwhen'] = null;
			}

			try
			{
				if (this.prefValues['remove'] && typeof this.prefValues['remove'] == 'string')
					this.prefValues['remove'] = new RegExp('\\b(?:' + this.prefValues['remove'] + ')=.+?(?:[&;]|$|(?=\\?))', 'gi');
			}
			catch (e)
			{
				alert(_("browser.regexerr") + ' "remove": ' + e.message);
				this.prefValues['remove'] = null;
			}
		},

		setIcon: function (marker, toolbar)
		{
			if (!toolbar) toolbar = document.getElementById('cleanlinks-toolbar-button');
			if (!toolbar) return;

			this.setIcon.last = marker;
			if (marker == '~' && this.prefValues.evdmki)
				marker = 0;

			let size = toolbar.getAttribute('cui-areatype') == 'menu-panel' ? 32 : 16;
			toolbar.setAttribute('image', this.rsc('icons/' + size + (marker || '') + '.png'));
		},

		getDocument: function ()
		{
			try
			{
				return gBrowser.contentDocument;
			}
			catch (e)
			{
				return this.getWinDocument() || window.content.document;
			}
		},

		getWindow: function (m)
		{
			try
			{
				let wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator)
					.getMostRecentWindow("navigator:browser");

				return m ? wm : wm.getBrowser();
			}
			catch (e) { return null; }
		},

		getWinDocument: function ()
		{
			try
			{
				return this.getWindow().mCurrentBrowser.contentDocument;
			}
			catch (e) { return null; }
		},

		winLocation: function ()
		{
			try
			{
				return this.getWinDocument().location;
			}
			catch (e) { return null; }
		}
	};
	if (!("diegocr" in window))
		window.diegocr = {};
	window.diegocr.cleanlinks = cleanlinks;
	window.addEventListener('unload', cleanlinks, false);

	// window.addEventListener(  'load', cleanlinks, false);
	window.setTimeout(function ()
	{
		cleanlinks.handleEvent({ type: 'load' });
	}, 911);
})();
