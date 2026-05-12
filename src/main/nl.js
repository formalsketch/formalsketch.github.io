// Natural-language helpers: turn a plain-English description into FSM JSON,
// or describe the current FSM in plain English. Talks to a remote model
// endpoint; the user supplies the key.
//
// The key lives in localStorage under fsm_model_key. This is a deliberate
// trade-off: the app works without a backend, but anyone with access to the
// browser can read the key, and embedding it in a share URL would leak it.
// The UI surfaces that warning near the key input.

var MODEL_KEY_STORAGE = 'fsm_model_key';
var MODEL_NAME = 'claude-haiku-4-5';
var MODEL_ENDPOINT = 'https://api.anthropic.com/v1/messages';

function getModelKey() {
	try {
		return localStorage.getItem(MODEL_KEY_STORAGE) || '';
	} catch (e) {
		return '';
	}
}

function setModelKey(k) {
	try {
		if (k) localStorage.setItem(MODEL_KEY_STORAGE, k);
		else localStorage.removeItem(MODEL_KEY_STORAGE);
	} catch (e) {}
}

var SYSTEM_GENERATE =
	'You are an FSM-design helper for an automata theory tool.\n' +
	'Output ONLY a single JSON object that conforms to this schema:\n' +
	'{\n' +
	'  "format": "fsmStudio.v1",\n' +
	'  "nodes": [{"x":0,"y":0,"text":"q0","isAcceptState":false}, ...],\n' +
	'  "links": [\n' +
	'    {"type":"StartLink","node":<idx>,"text":"","deltaX":-50,"deltaY":0},\n' +
	'    {"type":"Link","nodeA":<src>,"nodeB":<dst>,"text":"<sym>","lineAngleAdjust":0,"parallelPart":0.5,"perpendicularPart":0},\n' +
	'    {"type":"SelfLink","node":<idx>,"text":"<sym>","anchorAngle":0}\n' +
	'  ]\n' +
	'}\n' +
	'Rules:\n' +
	'- Exactly one StartLink.\n' +
	'- "text" on a transition is one symbol or comma-separated symbols ("a,b").\n' +
	'- An empty text on a Link/SelfLink is an epsilon transition.\n' +
	'- Always set node x=0, y=0; layout is computed by the editor.\n' +
	'- Do NOT wrap the JSON in markdown fences. Do NOT include any prose.\n' +
	'\n' +
	'Examples follow.\n' +
	'\n' +
	'# DFA accepting binary strings with at least one 1\n' +
	'{"format":"fsmStudio.v1","nodes":[{"x":0,"y":0,"text":"q0","isAcceptState":false},{"x":0,"y":0,"text":"q1","isAcceptState":true}],"links":[{"type":"StartLink","node":0,"text":"","deltaX":-50,"deltaY":0},{"type":"SelfLink","node":0,"text":"0","anchorAngle":0},{"type":"Link","nodeA":0,"nodeB":1,"text":"1","lineAngleAdjust":0,"parallelPart":0.5,"perpendicularPart":0},{"type":"SelfLink","node":1,"text":"0,1","anchorAngle":0}]}\n' +
	'\n' +
	'# DFA over {a} that accepts strings of even length\n' +
	'{"format":"fsmStudio.v1","nodes":[{"x":0,"y":0,"text":"even","isAcceptState":true},{"x":0,"y":0,"text":"odd","isAcceptState":false}],"links":[{"type":"StartLink","node":0,"text":"","deltaX":-50,"deltaY":0},{"type":"Link","nodeA":0,"nodeB":1,"text":"a","lineAngleAdjust":0,"parallelPart":0.5,"perpendicularPart":0},{"type":"Link","nodeA":1,"nodeB":0,"text":"a","lineAngleAdjust":0,"parallelPart":0.5,"perpendicularPart":0}]}\n' +
	'\n' +
	'# DFA over {0,1} for strings ending with "01"\n' +
	'{"format":"fsmStudio.v1","nodes":[{"x":0,"y":0,"text":"q0","isAcceptState":false},{"x":0,"y":0,"text":"q1","isAcceptState":false},{"x":0,"y":0,"text":"q2","isAcceptState":true}],"links":[{"type":"StartLink","node":0,"text":"","deltaX":-50,"deltaY":0},{"type":"SelfLink","node":0,"text":"1","anchorAngle":0},{"type":"Link","nodeA":0,"nodeB":1,"text":"0","lineAngleAdjust":0,"parallelPart":0.5,"perpendicularPart":0},{"type":"SelfLink","node":1,"text":"0","anchorAngle":0},{"type":"Link","nodeA":1,"nodeB":2,"text":"1","lineAngleAdjust":0,"parallelPart":0.5,"perpendicularPart":0},{"type":"Link","nodeA":2,"nodeB":0,"text":"1","lineAngleAdjust":0,"parallelPart":0.5,"perpendicularPart":0},{"type":"Link","nodeA":2,"nodeB":1,"text":"0","lineAngleAdjust":0,"parallelPart":0.5,"perpendicularPart":0}]}\n' +
	'\n' +
	'# NFA accepting strings containing "ab"\n' +
	'{"format":"fsmStudio.v1","nodes":[{"x":0,"y":0,"text":"q0","isAcceptState":false},{"x":0,"y":0,"text":"q1","isAcceptState":false},{"x":0,"y":0,"text":"q2","isAcceptState":true}],"links":[{"type":"StartLink","node":0,"text":"","deltaX":-50,"deltaY":0},{"type":"SelfLink","node":0,"text":"a,b","anchorAngle":0},{"type":"Link","nodeA":0,"nodeB":1,"text":"a","lineAngleAdjust":0,"parallelPart":0.5,"perpendicularPart":0},{"type":"Link","nodeA":1,"nodeB":2,"text":"b","lineAngleAdjust":0,"parallelPart":0.5,"perpendicularPart":0},{"type":"SelfLink","node":2,"text":"a,b","anchorAngle":0}]}\n';

var SYSTEM_DESCRIBE =
	'You are an automata theory tutor. Given an FSM in fsmStudio.v1 JSON, ' +
	'describe in plain English what language it accepts. Be concise: 2-3 ' +
	'sentences, no JSON, no markdown.';

function callModel(system, userMsg, apiKey) {
	return fetch(MODEL_ENDPOINT, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'x-api-key': apiKey,
			'anthropic-version': '2023-06-01',
			'anthropic-dangerous-direct-browser-access': 'true',
		},
		body: JSON.stringify({
			model: MODEL_NAME,
			max_tokens: 2000,
			system: system,
			messages: [{ role: 'user', content: userMsg }],
		}),
	}).then(function (resp) {
		return resp.json().then(function (data) {
			if (!resp.ok) {
				var msg =
					data && data.error && data.error.message
						? data.error.message
						: 'API error ' + resp.status;
				throw new Error(msg);
			}
			if (!data.content || !data.content[0] || !data.content[0].text) {
				throw new Error('empty response');
			}
			return data.content[0].text;
		});
	});
}

function parseModelJSON(text) {
	try {
		return JSON.parse(text);
	} catch (e) {
		// Some replies wrap the JSON in prose or markdown fences; pull out
		// the outermost brace-balanced region and try again.
		var stripped = text
			.replace(/^[^{]*?(?=\{)/, '')
			.replace(/[^}]*$/, '')
			.trim();
		return JSON.parse(stripped);
	}
}

function generateFSMFromText(description) {
	var key = getModelKey();
	if (!key) return Promise.reject(new Error('no API key configured'));
	return callModel(SYSTEM_GENERATE, description, key).then(function (text) {
		var json = parseModelJSON(text);
		var err = validateSnapshot(json);
		if (err) throw new Error('model returned invalid JSON: ' + err);
		return json;
	});
}

function describeFSM(json) {
	var key = getModelKey();
	if (!key) return Promise.reject(new Error('no API key configured'));
	return callModel(SYSTEM_DESCRIBE, JSON.stringify(json), key);
}
