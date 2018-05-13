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

function save_options()
{
	var prefs = Array.from(document.querySelectorAll('input, textarea')).reduce((prefs, field) =>
	{
		prefs[field.name] = field.value || field.checked;
		return prefs
	}, {})

	browser.storage.local.set({configuration: prefs})
	browser.runtime.sendMessage({ 'options': Date.now() })
}


// for onKeyUp: save after 400ms of inactivity
var delayed_save = (function()
{
	browser.alarms.onAlarm.addListener(save_options);
	return function()
	{
		browser.alarms.clear('save');
		browser.alarms.create('save', {when: Date.now() + 400});
	}
})();


function reset_options()
{
	// clear options storage, reload everything
	browser.storage.local.clear().then(() =>
		browser.runtime.getBackgroundPage().then(page =>
		{
			page.location.reload();
			window.location.reload();
		})
	)
}


function populate_option_page()
{
	var list = document.querySelectorAll('[i18n_text]');
	for (var n = 0; n < list.length; n++)
		list[n].prepend(document.createTextNode(_(list[n].getAttribute('i18n_text'))));

	list = document.querySelectorAll('[i18n_title]');
	for (var n = 0; n < list.length; n++)
		list[n].setAttribute('title', _(list[n].getAttribute('i18n_title')));

	var values = serializeOptions();
	for (var pref in values)
	{
		var input = document.querySelector('[name=' + pref + ']');
		if (!input)
			continue;

		var value = values[pref];
		if (typeof value == 'boolean')
			input.checked = value;
		else
			input.value = value;

		input.onchange = save_options
		input.onkeyup = delayed_save
	}

	document.querySelector('button[name="reset"]').onclick = reset_options
}

loadOptions().then(() => populate_option_page());
