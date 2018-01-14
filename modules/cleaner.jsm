/* ***** BEGIN LICENSE BLOCK *****
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/
 *
 * The Original Code is CleanLinks Mozilla Extension.
 *
 * The Initial Developer of the Original Code is
 * Copyright (C)2012-2016 Diego Casorran <dcasorran@gmail.com>
 * All Rights Reserved.
 *
 * ***** END LICENSE BLOCK ***** */

"use strict";

const Cu = Components.utils;
const Cc = Components.classes;
const Cr = Components.results;
const Ci = Components.interfaces;

const EXPORTED_SYMBOLS = ['cleanLink'];

Cu.import("resource://gre/modules/XPCOMUtils.jsm");

XPCOMUtils.defineLazyModuleGetter(this, 'console', 'resource://gre/modules/Console.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'Services', 'resource://gre/modules/Services.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'Settings', 'resource://cleanlinks/modules/settings.jsm');


function newURI(aSpec, aBaseURI) {
    if (typeof aBaseURI === 'string') {
        aBaseURI = newURI(aBaseURI);
    }

    return Services.io.newURI(aSpec, null, aBaseURI || null);
}

function newChannel(aSpec, aBaseURI) {
    aBaseURI = aBaseURI || null;

    if (Services.io.newChannel2) {
        let ch = Services.io.newChannel2(aSpec,
                                         null,
                                         aBaseURI,
                                         null, null, null,
                                         Ci.nsILoadInfo.SEC_NORMAL,
                                         Ci.nsIContentPolicy.TYPE_OTHER);

        return ch;
    }

    return Services.io.newChannel(aSpec, null, aBaseURI);
}

function cleanLink(aLink, aBaseURI) {
    let h = aLink;
    let b = aBaseURI;

    if (!h || h.startsWith("view-source:") || (Settings.skipwhen && Settings.skipwhen.test(h))) {
        return h;
    }

    if (!b) {
        if (/^https?:/.test(h)) b = h;
        else b = false;
    }
    if (typeof b === 'string')
        b = newURI(b);

    let lu;
    if (Settings.skipdoms) try {
        lu = newURI(h,b);

        if (~Settings.skipdoms.indexOf(lu.host))
            return h;

    } catch(e) {}

    if (Settings.ignhttp && !/^https?:/.test(lu&&lu.spec||h)) {
        return h;
    }

    if (/\.google\.[a-z.]+\/search\?(?:.+&)?q=http/i.test(h)
            || /^https?:\/\/www\.amazon\.[\w.]+\/.*\/voting\/cast\//.test(h)) {

        return h;
    }

    let lmt = 4, s = 0, p, ht = null, rp = Settings.remove, l = h, Y = /\.yahoo.com$/.test(b.asciiHost);
    h.replace(/^javascript:.+(["'])(https?(?:\:|%3a).+?)\1/gi,function(a,b,c)(++s,h=c));

    if (/\b((?:aHR0|d3d3)[A-Z0-9+=\/]+)/gi.test(h)) try {
        let r = RegExp.$1;
        if (Y) r = r.replace(/\/RS.*$/,'');
        let d = decodeURIComponent(atob(r));
        if (d) h='='+d;
    }
    catch(e) {
        Cu.reportError('Invalid base64 data for "'+h+'" at "'+(b&&b.spec)+'"\n> '+e);
    }
    else {
        switch(b.asciiHost) {
            case 'www.tripadvisor.com':
              if (~h.indexOf('-a_urlKey'))
                h = '=' + decodeURIComponent(h.replace(/_+([a-f\d]{2})/gi, '%$1')
                    .replace(/_|%5f/ig,'')).split('-aurl.').pop().split('-aurlKey').shift();
                break;
            default:
                switch(lu&&lu.asciiHost||(h.match(/^\w+:\/\/([^/]+)/)||[]).pop()) {
                    case 'redirect.disqus.com':
                        if (~h.indexOf('/url?url='))
                            h = '=' + h.match(/url\?url=([^&]+)/).pop().split(/%3a[\w-]+$/i).shift();
                        break;
                }
        }
    }

    while(--lmt && (/(?:.\b|3D)([a-z]{2,}(?:\:|%3a)(?:\/|%2f){2}.+)$/i.test(h) || /(?:[?=]|[^\/]\/)(www\..+)$/i.test(h))) {
        h = RegExp.$1;
        if (~(p = h.indexOf('&')))
            h = h.substr(0,p);
        h = decodeURIComponent(h);

        if (~(p = h.indexOf('html&')) || ~(p = h.indexOf('html%')))
            h = h.substr(0,p+4);
        else if (~(p = h.indexOf('/&')))// || ~(p = h.indexOf('/%')))
            h = h.substr(0,p);
        if (h.indexOf('://') == -1)
            h = 'http://' + h;
        if (h.indexOf('/',h.indexOf(':')+2) == -1)
            h += '/';
        ++s;
    }

    h = h.replace(/^h[\w*]+(ps?):/i,'htt$1:');

    try {
        // Check if the protocol can be handled...
        newChannel(h, b||null);
    } catch(e) {
        if (e.result == Cr.NS_ERROR_UNKNOWN_PROTOCOL) {
            h = l;
        } else {
            if (h.split(':').pop().length < 3) h = l;
            else {
                Cu.reportError(e);
                console.log('^^ Unhandled error for "'+h+'" at "'+(b&&b.spec)+'"');
            }
        }
    }

    if (Y) h = h.replace(/\/R[KS]=\d.*$/,'');

    rp.lastIndex = 0;
    if ( s || rp.test(h)) {
        if (~(p = h.indexOf('#'))) (ht = h.substr(p), h = h.substr(0,p));

        h = h.replace(/&amp;/g, '&').replace(rp,'').replace(/[?&]$/,'')
            + (ht && /^[\w\/#!-]+$/.test(ht) ? ht : '');
    }

    if (l != h) console.log([l,h]);
    if (l != h) {
        Services.obs.notifyObservers(this,'cleanlinks-cltrack',JSON.stringify([lu&&lu.spec||l,h]));
    }

    return h;
}

