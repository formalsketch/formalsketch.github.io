const fs = require('fs');
const code = fs.readFileSync('www/fsm.js', 'utf8');

global.document = {
	documentElement: {},
	body: {},
	getElementById: () => null,
	addEventListener: () => {},
	hasFocus: () => false,
};
global.window = global;
global.localStorage = {
	getItem: () => null,
	setItem: () => {},
	removeItem: () => {},
};
// btoa/atob via Buffer, available in Node since 16.
global.btoa = (s) => Buffer.from(s, 'binary').toString('base64');
global.atob = (s) => Buffer.from(s, 'base64').toString('binary');
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

try {
	eval(code);
} catch (e) {}

const cases = [
	'{"nodes":[],"links":[]}',
	'{"nodes":[{"x":100,"y":100,"text":"q0","isAcceptState":false}],"links":[]}',
	'{"nodes":[{"x":100,"y":100,"text":"α","isAcceptState":true}],"links":[]}',
	'{"nodes":[{"x":100,"y":100,"text":"q_0 ✓","isAcceptState":false},{"x":300,"y":100,"text":"q\\\\beta","isAcceptState":true}],"links":[]}',
];

let fails = 0;
for (const original of cases) {
	const encoded = shareEncode(original);
	const decoded = shareDecode(encoded);
	const ok = decoded === original;
	if (!ok) fails++;
	console.log(
		ok ? 'PASS' : 'FAIL',
		'round-trip',
		'orig=' + original.length + 'B',
		'b64u=' + encoded.length + 'B',
		'(ratio ' + (encoded.length / original.length).toFixed(2) + 'x)',
	);
	if (!ok) console.log('  got:', decoded);
}

// Make sure the encoding stays URL-safe.
const e = shareEncode('{"a":"b/c+d="}');
if (/[^A-Za-z0-9_-]/.test(e)) {
	console.log('FAIL: encoded string contains URL-unsafe chars:', e);
	process.exit(1);
}
console.log('PASS: encoded is URL-safe');

process.exit(fails === 0 ? 0 : 1);
