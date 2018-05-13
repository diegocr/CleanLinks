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


function setIcon(marker)
{
	if (marker == '~')
		marker = 0;

	browser.browserAction.setIcon(
	{
		path:
		{
			16: 'icons/16' + (marker || icon_default) + '.png',
			32: 'icons/32' + (marker || icon_default) + '.png'
		}
	})
}


// Count of clean links per page, reset it at every page load
var cleanedPerTab = {};
browser.tabs.onUpdated.addListener((id, changeInfo, tab) => {
	if ('status' in changeInfo && changeInfo.status === 'loading') {
		cleanedPerTab[tab.id] = 0;
	}
});


var historyCleanedLinks = [];
var lastRightClick = {textLink: null, reply: () => {}}

function handleMessage(message, sender)
{
	log('received message :', JSON.stringify(message))

	if (message == 'get_cleaned_list')
	{
		return Promise.resolve(historyCleanedLinks);
	}

	else if (message == 'toggle')
	{
		prefValues.enabled = !prefValues.enabled;

		setIcon(prefValues.enabled ? icon_default : icon_disabled);
		return browser.storage.local.set({configuration: serializeOptions()}).then(() => handleMessage({options: Date.now()}))
	}

	else if ('url' in message)
	{
		var p = browser.notifications.create(message.url,
		{
			type: 'basic',
			iconUrl: browser.extension.getURL('icon.png'),
			title: 'Link cleaned!',
			message: message.url
		});
		browser.alarms.create('clearNotification:' + message.url, {when: Date.now() + 800});

		if (prefValues.cltrack)
			historyCleanedLinks.push(Object.assign({}, message));

		return p;
	}

	else if ('openUrl' in message)
	{
		if (message.target == new_window)
			return browser.windows.create({ url: message.openUrl });
		else if (message.target == new_tab)
			return browser.tabs.create({ url: message.openUrl, active: prefValues.switchToTab, openerTabId: sender.tab.id });
		else
			return browser.tabs.update({ url: message.openUrl });
	}

	else if ('cleaned' in message)
	{
		if (!(sender.tab.id in cleanedPerTab))
			cleanedPerTab[sender.tab.id] = 0;

		cleanedPerTab[sender.tab.id] += message.cleaned;
		browser.browserAction.setBadgeText({text: '' + cleanedPerTab[sender.tab.id], tabId: sender.tab.id});

		return Promise.resolve(cleanedPerTab[sender.tab.id])
	}

	else if ('whitelist' in message)
	{
		var entry = historyCleanedLinks.splice(message.whitelist, 1)[0];
		var host = (new URL(entry.orig)).hostname;
		prefValues.skipdoms.push(host);
		return browser.storage.local.set({configuration: serializeOptions()})
	}

	else if ('options' in message)
	{
		return loadOptions().then(() =>
		{
			if (!prefValues.cltrack)
				historyCleanedLinks.splice(0, historyCleanedLinks.length);

			if (prefValues.enabled && prefValues.cbc)
				browser.contextMenus.create({
					id: 'copy-clean-link',
					title: 'Copy clean link',
					contexts: ['link', 'selection', 'page']
				});
			else
				browser.contextMenus.remove('copy-clean-link')

			if (prefValues.enabled && prefValues.progltr)
				browser.webRequest.onHeadersReceived.addListener(cleanRedirectHeaders, { urls: ['<all_urls>'] }, ['blocking', 'responseHeaders']);
			else
				browser.webRequest.onHeadersReceived.removeListener(cleanRedirectHeaders);

			if (prefValues.enabled && prefValues.httpomr)
				browser.webRequest.onBeforeRequest.addListener(onRequest, { urls: ['<all_urls>'] }, ['blocking']);
			else
				browser.webRequest.onBeforeRequest.removeListener(onRequest);

			browser.tabs.query({}).then(tabs => tabs.forEach(tab =>
				browser.tabs.sendMessage(tab.id, 'reloadOptions')
			));
		})
	}

	else if ('rightClickLink' in message)
	{
		return new Promise((resolve, rejecte) =>
		{
			lastRightClick = {
				textLink: message.rightClickLink,
				reply: resolve
			}
		})
	}
	else
		return Promise.reject('Unexpected message: ' + String(message));
}

function handleAlarm(alarm)
{
	if (alarm.name.startsWith('clearNotification:')) {
		var notif = alarm.name.substr('clearNotification:'.length);
		browser.notifications.clear(notif);
	}
}


browser.alarms.onAlarm.addListener(handleAlarm);
browser.runtime.onMessage.addListener(handleMessage);

loadOptions().then(() =>
{
	// Always add the listener, even if CleanLinks is disabled. Only add the menu item on enabled.
	browser.contextMenus.onClicked.addListener((info, tab) =>
	{
		var link;
		if ('linkUrl' in info && info.linkUrl)
			link = info.linkUrl;
		else if ('selectionText' in info && info.selectionText)
			link = info.selectionText;

		// WARNING: potential race condition here (?) on right click we send a message to background,
		// that populates rightClickLink[tab.id]. If the option (this listener) is triggered really fast,
		// maybe it can happen before the link message gets here.
		// In that case, we'll need to pre-make a promise, resolved by the message, and .then() it here.
		else
			link = lastRightClick.textLink;

		// Clean & copy
		lastRightClick.reply(cleanLink(link, tab.url))
	});

	if (!prefValues.enabled)
		return;

	if (prefValues.httpomr)
		browser.webRequest.onBeforeRequest.addListener(onRequest, { urls: ['<all_urls>'] }, ['blocking']);

	if (prefValues.progltr)
		browser.webRequest.onHeadersReceived.addListener(cleanRedirectHeaders, { urls: ['<all_urls>'] }, ['blocking', 'responseHeaders']);

	if (prefValues.cbc)
		browser.contextMenus.create({
			id: 'copy-clean-link',
			title: 'Copy clean link',
			contexts: ['link', 'selection', 'page']
		});
});
