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
const Ci = Components.interfaces;

const EXPORTED_SYMBOLS = ['watch'];

Cu.import("resource://gre/modules/XPCOMUtils.jsm");

XPCOMUtils.defineLazyModuleGetter(this, 'console', 'resource://gre/modules/Console.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'Services', 'resource://gre/modules/Services.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'Settings', 'resource://cleanlinks/modules/settings.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'cleanLink', 'resource://cleanlinks/modules/cleaner.jsm');

function handledElsewhere() {
    // TODO
    return false;
}

function ContentFrameHandler(aContentFrame, aFrameScriptID) {
    this.frame = aContentFrame;
    this.fsid = aFrameScriptID;

    this.messageName = 'cleanlinks:' + this.fsid;

    this.setup();
}

ContentFrameHandler.prototype = Object.freeze({
    constructor: ContentFrameHandler,

    setup: function _setup() {
        console.log('frame-script setup', this.fsid, this);

        this.enable();
        this.frame.addMessageListener(this.messageName, this);

        Settings.onchange(p => {
            console.log('settings-onchange event', p);

            if (p === 'enabled' || p === 'evdm') {
                this.enable();
            }
        });
    },

    unload: function _unload() {
        console.log('frame-script unload', this);

        this.disable();
        this.frame.removeMessageListener(this.messageName, this);

        Settings.unload();

        // this.sendMessage('unloaded');
        delete this.frame;

        // TODO: Check why we can't unload the modules from the frame-script,
        //       since it turns this restartless add-on requiring a restart..
        try {
            Cu.unload('resource://cleanlinks/modules/settings.jsm');
            Cu.unload('resource://cleanlinks/modules/cleaner.jsm');
        }
        catch (ex) {
            Cu.reportError(ex);
        }
    },

    enable: function _enable() {
        this.disable();

        if (Settings.enabled) {

            if (Settings.evdm) {
                this.evdm = true;

                this.frame.addEventListener("click", this, true);
            }
            else {
                this.domWay = true;

                this.frame.addEventListener("DOMContentLoaded", this, false);
            }
        }
    },

    disable: function _disable() {
        if (this.domWay) {
            delete this.domWay;
            this.frame.removeEventListener("DOMContentLoaded", this);
        }
        else if (this.evdm) {
            delete this.evdm;
            this.frame.removeEventListener("click", this);
        }
    },

    handleEvent: function _handleEvent(aEvent) {
        console.log('frame-script handleEvent', aEvent.type, aEvent);

        switch (aEvent.type) {

            case 'DOMContentLoaded':
                let doc = aEvent.originalTarget;

                if (String(doc) === '[object HTMLDocument]') {

                    this.onPageLoad(doc);
                }
                break;

            case 'click':
                if (String(aEvent.target.ownerDocument) === '[object HTMLDocument]') {
                    this.onClickHandler(aEvent);
                }
                break;

            default:
                console.error('Unexpected event.', aEvent.type, aEvent);
                break;
        }
    },

    onPageLoad: function _onPageLoad(aDocument) {

    },

    onClickHandler: function _onClickHandler(aEvent) {
        if (aEvent.button !== 2 && (!aEvent.altKey || aEvent.button !== 0)) {
            let n = aEvent.target, k;

            if (n.nodeName != 'A'
                    && (aEvent.altKey
                        || !Settings.textcl
                        || !(k=this.getSelection(n)))) {

                do {
                    n = n.parentNode;
                } while(n && !~['A','BODY','HTML'].indexOf(n.nodeName));
            }
            console.log('frame-script onclick handler.', n && n.href, n && n.nodeName);

            if (k || (n && n.nodeName == 'A' && !handledElsewhere(n))) {
                let z,x;
                switch(k || n.ownerDocument.location.hostname) {
                    case 'twitter.com':
                        if(n.hasAttribute('data-expanded-url'))
                            k = n.getAttribute('data-expanded-url');
                        break;
                    case 'www.facebook.com':
                        if(~(''+n.getAttribute('onmouseover')).indexOf('LinkshimAsyncLink'))
                            k = n.href;
                }
                z = k || n.href;
                x = cleanLink(z,n.baseURI);
                if (k || z != x) {
                    aEvent.stopPropagation();
                    aEvent.preventDefault();

                    console.debug('Redirct to cleaned...', x, z);
                    if (Settings.highlight) {
                        this.highlight(n);
                        this.sendMessage('blink', k && 217);
                    }
                    n.ownerDocument.location = x;
                }
            }
        }
    },

    getSelection: function _getSelection(n) {
        let c,p,t,s = n.ownerDocument && n.ownerDocument.defaultView.getSelection();

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
        }

        return t;
    },

    highlight: function _highlight(aDOMNode, aDisable) {
        if (Settings.highlight) {
            String(Settings.hlstyle).split(';')
                .forEach(function(r) {
                    let [k,v] = r.split(':').map(String.trim);
                    aDOMNode.style.setProperty(k, aDisable ? '' : v, 'important');
                });
        }
    },

    receiveMessage: function _receiveMessage(aEvent) {
        console.log('Received message on frame-script', aEvent);

        let frame = aEvent.target;
        let window = frame.content;
        let cmd = aEvent.data;
        if (typeof cmd === 'object') {
            cmd = cmd.cmd;
        }

        switch (cmd) {
            case 'unload':
                this.unload();
                break;
        }
    },

    sendMessage: function _sendMessage(aTopic, aData) {
        console.log('Sending message from frame-script.', aTopic, aData);

        let message = {
            cmd: aTopic,
            data: aData
        };
        this.frame.sendAsyncMessage(this.messageName, message);
    }
});

function watch(frame, id) {
    return new ContentFrameHandler(frame, id);
}
