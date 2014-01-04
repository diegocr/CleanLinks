/* ***** BEGIN LICENSE BLOCK *****
 * Version: MIT/X11 License
 * 
 * Copyright (c) 2012 Diego Casorran
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * 
 * Contributor(s):
 *   Diego Casorran <dcasorran@gmail.com> (Original Author)
 * 
 * ***** END LICENSE BLOCK ***** */

var EXPORTED_SYMBOLS = ["_"];

const _ = (function(scope) {
	let bundle = {}, locale, lFile, aLocales, lDefault = 'en-US';
	
	function getBasename(file) file.replace(/^.*[\\\/]/,'');
	function getLangFromLocale(locale) locale.split('-').shift();
	function getLocaleFromFile(file) getBasename(file).split('.').shift();
	function URIToLocalFile(uri) Services.io.newURI(uri,null,null).QueryInterface(Ci.nsIFileURL).file;
	function getXPIFile() URIToLocalFile(scope.__SCRIPT_URI_SPEC__.replace(/^(?:jar:)?(.+[^!])!?\/.*$/,'$1'));
	
	function getLocaleFile(locale) {
		locale = scope.__SCRIPT_URI_SPEC__ + '/../locale/' + locale + '.txt';
		
		try {
			let file = URIToLocalFile(locale);
			return file.exists() ? file :null;
		} catch(e) {
			// packed? Oh, well...
			
			try {
				let jar = JAROpen();
				if(jar.hasEntry(locale=locale.replace(/^.*\/\.\.\//,'')))
					return jar.getInputStream(locale);
			} catch(e) {}
		}
		return false;
	}
	
	function getAlternateLocale(lang) {
		let path = scope.__SCRIPT_URI_SPEC__ + '/../locale/';
		
		if(!aLocales) try {
			aLocales = {};
			
			let d = URIToLocalFile(path).directoryEntries;
			
			while(d.hasMoreElements()) {
				let file = getLocaleFromFile(d.getNext().QueryInterface(Ci.nsIFile).path);
				aLocales[getLangFromLocale(file)] = file;
			}
		} catch(e) {
			// packed? ...
			
			try {
				let e = JAROpen().findEntries("locale/*.txt$");
				while(e.hasMore()) {
					let file = getLocaleFromFile(e.getNext());
					aLocales[getLangFromLocale(file)] = file;
				}
			} catch(e) {}
		}
		
		lang = getLangFromLocale(lang);
		return (lang in aLocales) ? getLocaleFile(aLocales[lang]) : null;
	}
	
	function parseLocaleFile(nsILocaleFile) {
		let is;
		
		if(nsILocaleFile instanceof Ci.nsILocalFile) {
			is = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);
			is.init(nsILocaleFile, -1, -1, false);
		} else {
			is = nsILocaleFile;
		}
		
		let cis = Cc["@mozilla.org/intl/converter-input-stream;1"].createInstance(Ci.nsIConverterInputStream);
		cis.init(is, "UTF-8", 1024, 0xFFFD);
		cis.QueryInterface(Ci.nsIUnicharLineInputStream);
		
		let data = {}, line, key, more;
		do {
			more = cis.readLine(data);
			line = data.value;
			if(line.length && line[0] != '#') {
				line = line.split(':');
				key = line.shift().trim();
				if(key.length)
					data[key] = line.join(':').replace(/^\s/,'');
			}
		} while(more);
		delete data.value;
		
		cis.close();
		return data;
	}
	
	let oJar;
	function JAROpen() {
		return oJar || let (zip = Cc["@mozilla.org/libjar/zip-reader;1"]
			.createInstance(Ci.nsIZipReader)) (zip.open(getXPIFile()), oJar = zip);
	}
	
	lFile = getLocaleFile(lDefault);
	bundle[lDefault] = lFile ? parseLocaleFile(lFile) : {};
	
	locale = Cc["@mozilla.org/chrome/chrome-registry;1"]
		.getService(Ci.nsIXULChromeRegistry).getSelectedLocale("global");
	
	if(locale != lDefault) {
		lFile = getLocaleFile(locale) || getAlternateLocale(locale)
		|| (locale = Cc["@mozilla.org/intl/nslocaleservice;1"]
			.getService(Ci.nsILocaleService).getSystemLocale()
			.getCategory("NSILOCALE_CTYPE"), getLocaleFile(locale)
				|| getAlternateLocale(locale));
	}
	
	if(!lFile || locale == lDefault) {
		locale = lDefault;
	} else {
		bundle[locale] = parseLocaleFile(lFile);
		
		if(bundle[locale]['addon.description']) try {
			let tmp = {}, setProperties = function(aAddon) {
				let defineProperty = function(aProperty) {
					let oldString = aAddon[aProperty];
					Object.defineProperty(aAddon,aProperty, {
						get: function() bundle[locale]['addon.'+aProperty] || oldString,
						set: function() {},
						enumerable: true,
						configurable: false
					});
				};
				defineProperty('description');
				defineProperty('fullDescription');
				tmp = null;
			};
			Cu.import("resource://gre/modules/AddonManager.jsm", tmp);
			if(oJar) {
				tmp.AddonManager.getInstallForFile(getXPIFile(),function(aInstall)
					tmp.AddonManager.getAddonByID(aInstall.addon.id,setProperties));
			} else {
				tmp.AddonManager.getAddonByID(getBasename(getXPIFile().path),setProperties);
			}
		} catch(e) {dump(e);}
	}
	
	if(oJar)oJar.close();
	lFile = oJar = null;
	
	let _ = function(aString,aLocale) bundle[aLocale || locale][aString] || bundle[lDefault][aString];
	_.locale = locale;
	
	return _;
})(this);
