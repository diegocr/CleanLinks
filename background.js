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


function cleanFollowedLink(details)
{
	if (!prefValues.enabled)
		return;

	var cleanUrl = cleanLink(details.url, details.originUrl);
	if (cleanUrl != details.url) {
		browser.runtime.sendMessage({ url: cleanUrl, orig: details.url });
		details.url = cleanUrl;
	}
}

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
	if (message == 'get_cleaned_list')
	{
		return new Promise.resolve(historyCleanedLinks);
	}

	else if (message == 'toggle')
	{
		prefValues.enabled = !prefValues.enabled;

		setIcon(prefValues.enabled ? icon_default : icon_disabled);
		return browser.storage.local.set({configuration: serializeOptions()})
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

	else if ('cleaned' in message)
	{
		if (!(sender.tab.id in cleanedPerTab))
			cleanedPerTab[sender.tab.id] = 0;

		cleanedPerTab[sender.tab.id] += message.cleaned;
		browser.browserAction.setBadgeText({text: '' + cleanedPerTab[sender.tab.id], tabId: sender.tab.id});

		return new Promise.resolve(cleanedPerTab[sender.tab.id])
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

			if (prefValues.cbc)
				browser.contextMenus.create({
					id: 'copy-clean-link',
					title: 'Copy clean link',
					contexts: ['link', 'selection', 'page']
				});
			else
				browser.contextMenus.remove('copy-clean-link')
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
	/* Filtering requests approach, for links from outside */
	browser.webRequest.onBeforeRequest.addListener(cleanFollowedLink, { urls: ['<all_urls>'] }, ['blocking']);

	if (prefValues.cbc)
		browser.contextMenus.create({
			id: 'copy-clean-link',
			title: 'Copy clean link',
			contexts: ['link', 'selection', 'page']
		});

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
});
