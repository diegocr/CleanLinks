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
	details.url = cleanLink(details.url, details.originUrl);
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


/* Filtering requests approach, for links from outside */
browser.webRequest.onBeforeRequest.addListener(cleanFollowedLink, { urls: ['<all_urls>'] }, ['blocking']);
