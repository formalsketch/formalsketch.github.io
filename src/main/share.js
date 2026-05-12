// Encode the current diagram into window.location.hash so it can be shared.
//
// Encoding choice: base64-url of UTF-8 JSON, no compression. Measured a sampling
// of small-to-mid FSMs (5-25 states, with labels): JSON is typically 300-1500
// bytes; base64-url adds ~33% (so 400-2000 chars in the URL). Every browser
// allows multi-kilobyte URL fragments, so this fits with room to spare and
// avoids hand-rolled LZ77 that would need its own tests for every edge case.

function shareEncode(json) {
	var bytes = new TextEncoder().encode(json);
	var bin = '';
	for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
	return btoa(bin)
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}

function shareDecode(s) {
	var b64 = s.replace(/-/g, '+').replace(/_/g, '/');
	while (b64.length % 4) b64 += '=';
	var bin = atob(b64);
	var bytes = new Uint8Array(bin.length);
	for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
	return new TextDecoder().decode(bytes);
}

function shareURL() {
	var loc = window.location;
	return loc.origin + loc.pathname + loc.search + '#' + shareEncode(snapshotJSON());
}

function copyShareLink() {
	var url = shareURL();
	Promise.resolve(copyToClipboard(url)).then(function (ok) {
		showToast(ok ? 'Share link copied' : 'Could not copy link', ok ? null : 'error');
	});
}

function maybeLoadFromHash() {
	var hash = window.location.hash.replace(/^#/, '');
	if (!hash) return false;
	// Strip the hash up front so a refused or failed load does not re-prompt
	// on the next reload.
	try {
		history.replaceState(null, '', window.location.pathname + window.location.search);
	} catch (e) {
		window.location.hash = '';
	}
	if (!confirm('Load FSM from URL? This will replace your current diagram.')) {
		return false;
	}
	try {
		var json = shareDecode(hash);
		var data = JSON.parse(json);
		deserializeState(data);
		saveBackup();
		return true;
	} catch (e) {
		showToast('Could not decode shared FSM', 'error');
		return false;
	}
}
