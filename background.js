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
			16: 'icons/16' + (marker || '') + '.png',
			32: 'icons/32' + (marker || '') + '.png'
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

function handleMessage(message, sender)
{
	if ('url' in message)
	{
		browser.notifications.create(message.url,
		{
			type: 'basic',
			iconUrl: browser.extension.getURL('icon.png'),
			title: 'Link cleaned!',
			message: message.url
		});
		browser.alarms.create('clearNotification:' + message.url, {when: Date.now() + 800});

		if (prefValues.cltrack)
			// TODO: log message.orig => message.url in history, for whitelisting
	}

	else if ('cleaned' in message)
	{
		if (!(sender.tab.id in cleanedPerTab))
			cleanedPerTab[sender.tab.id] = 0;

		cleanedPerTab[sender.tab.id] += message.cleaned;
		browser.browserAction.setBadgeText({text: '' + cleanedPerTab[sender.tab.id], tabId: sender.tab.id});
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

/* Filtering requests approach, for links from outside */
browser.webRequest.onBeforeRequest.addListener(cleanFollowedLink, { urls: ['<all_urls>'] }, ['blocking']);
