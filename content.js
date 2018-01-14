/* ***** BEGIN LICENSE BLOCK *****
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/
 *
 * Contributor(s):
 *   Diego Casorran <dcasorran@gmail.com> (Original Author)
 *
 * ***** END LICENSE BLOCK ***** */


Components.utils.import("resource://cleanlinks/modules/frame-script.jsm", {})
    .watch(this, String(Components.stack.filename).split("=").pop());
