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

const EXPORTED_SYMBOLS = ['Settings'];

const { Services } = Cu.import("resource://gre/modules/Services.jsm", {});
const { setTimeout, clearTimeout } = Cu.import("resource://gre/modules/Timer.jsm", {});


function CleanLinksSettings() {
    let branch = Services.prefs.getBranch('extensions.cleanlinks.');

    if ("nsIPrefBranch2" in Ci) {
        branch.QueryInterface(Ci.nsIPrefBranch2);
    }
    Object.defineProperty(this, 'branch', { value: branch });

    for(let k of branch.getChildList("", {})) {
        this[k] = this.get(k);
    }
    this.mvtype();

    Cu.reportError('CleanLinksSettings-setup');

    branch.addObserver("", this, false);
}

CleanLinksSettings.prototype = Object.freeze({
    constructor: CleanLinksSettings,

    timers: {},
    changeListeners: [],

    unload: function _unload() {
        while (this.changeListeners.length) {
            this.changeListeners.pop();
        }
        this.branch.removeObserver("", this);
        this.enabled = false;
    },

    observe: function _observe(aSubject, aTopic, aData) {
        if (aTopic === 'nsPref:changed') {
            let oldValue = this[aData];
            let newValue = this.get(aData);

            if (oldValue.sourceValue) {
                oldValue = oldValue.sourceValue;
            }

            this[aData] = newValue;
            this.mvtype();

            if (oldValue !== newValue) {
                clearTimeout(this.timers[aData]);
                this.timers[aData] = setTimeout(() => {
                    Services.obs.notifyObservers(this, 'cleanlinks-settings-change', aData);

                    if (this.changeListeners.length) {
                        this.changeListeners
                            .forEach(cb => cb(aData, this));
                    }
                }, 3600);
            }
        }
    },

    get: function _get(aKey) {
        aKey = aKey || 'enabled';

        try {
            switch (this.branch.getPrefType(aKey)) {

                case Ci.nsIPrefBranch.PREF_STRING:
                    return this.branch.getCharPref(aKey);

                case Ci.nsIPrefBranch.PREF_INT:
                    return this.branch.getIntPref(aKey);

                case Ci.nsIPrefBranch.PREF_BOOL:
                    return this.branch.getBoolPref(aKey);
            }
        }
        catch (ex) {
            Cu.reportError(ex);
        }

        return false;
    },

    set: function _set(aKey, aValue) {
        try {
            switch (typeof(aValue)) {

                case "string":
                    this.branch.setCharPref(aKey, aValue);
                    break;

                case "boolean":
                    this.branch.setBoolPref(aKey, aValue);
                    break;

                case "number":
                    this.branch.setIntPref(aKey, aValue);
                    break;
            }

            return true;
        }
        catch (ex) {
            Cu.reportError(ex);
        }

        return false;
    },

    onchange: function _onchange(aCallback) {
        return this.changeListeners.push(aCallback);
    },

    mvtype: function _mvtype() {
        let value;

        if (typeof this.skipwhen === 'string' && this.skipwhen) {
            try {
                value = this.skipwhen;
                this.skipwhen = new RegExp(this.skipwhen);
                this.skipwhen.sourceValue = value;
            }
            catch (ex) {
                Cu.reportError(ex);
                this.skipwhen = false;
            }
        }
        if (typeof this.skipdoms === 'string' && this.skipdoms) {
            try {
                value = this.skipdoms;
                this.skipdoms = this.skipdoms.split(",").map(String.trim).filter(String);
                this.skipdoms.sourceValue = value;
            }
            catch (ex) {
                Cu.reportError(ex);
                this.skipdoms = false;
            }
        }
        if (typeof this.remove === 'string' && this.remove) {
            try {
                value = this.remove;
                this.remove = new RegExp('\\b(?:'+this.remove+')=.+?(?:[&;]|$|(?=\\?))','gi');
                this.remove.sourceValue = value;
            }
            catch (ex) {
                Cu.reportError(ex);
                this.remove = false;
            }
        }
    }
});

const Settings = new CleanLinksSettings();
