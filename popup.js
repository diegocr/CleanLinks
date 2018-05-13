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


function add_option(orig, clean)
{
	var select = document.querySelector('select');

	var option = document.createElement('option');
	// value is -1 for title, otherwise id of elment in clean list
	option.setAttribute('value', '' + (select.querySelectorAll('option').length - 1));
	if (option.value == '-1') {
		option.disabled = true;
	}

	var span = document.createElement('span');
	span.append(document.createTextNode(orig))
	span.setAttribute('class', 'original');
	option.appendChild(span);

	span = document.createElement('span');
	span.append(document.createTextNode(clean))
	span.setAttribute('class', 'cleaned');
	option.appendChild(span);

	select.appendChild(option);
}


function set_toggle_text()
{
	if (prefValues.enabled) {
		document.querySelector('#status').textContent = _('browser_enabled')
		document.querySelector('#toggle').textContent = _('browser_disable')
	} else {
		document.querySelector('#status').textContent = _('browser_disabled')
		document.querySelector('#toggle').textContent = _('browser_enable')
	}
}


function populate_popup()
{
	var list = document.querySelectorAll('[i18n_text]');
	for (var n = 0; n < list.length; n++)
		list[n].prepend(document.createTextNode(_(list[n].getAttribute('i18n_text'))));

	document.querySelector('#title').prepend(document.createTextNode(title + ' v' + version));
	document.querySelector('#copyright').appendChild(document.createTextNode('\u00A9 '+copyright));

	var link = document.createElement('a');
	link.setAttribute('href', homepage);
	link.appendChild(document.createTextNode(homepage));
	document.querySelector('#homepage').appendChild(link);

	add_option(_('bootstrap_listheader_original'), _('bootstrap_listheader_cleaned'));

	browser.runtime.sendMessage('get_cleaned_list').then(response =>
	{
		response.forEach(clean => add_option(clean.orig, clean.url));
	});

	set_toggle_text();
	document.querySelector('#toggle').onclick = () =>
	{
		prefValues.enabled = !prefValues.enabled;
		set_toggle_text();
		browser.runtime.sendMessage('toggle');
	}

	document.querySelector('#whitelist').onclick = () =>
	{
		var select = document.querySelector('select');
		var id = parseInt(select.value);
		browser.runtime.sendMessage({whitelist: id}).then(() =>
			// remove selected element, and renumber higher-ordered ones
			select.querySelectorAll('option').forEach(opt =>
			{
				var opt_id = parseInt(opt.value);
				if (opt_id == id)
					opt.remove()
				else if (opt_id > id)
					opt.value = '' + (opt_id - 1);
			})
		);
	}
}

loadOptions().then(() => populate_popup());
