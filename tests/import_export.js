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

try {
	eval(code);
} catch (e) {}

// Build a small DFA and round-trip through export -> validate -> deserialize.
const q0 = new Node(100, 100);
const q1 = new Node(300, 100);
q1.isAcceptState = true;
nodes.length = 0;
links.length = 0;
nodes.push(q0, q1);
links.push(
	new StartLink(q0, { x: 50, y: 100 }),
	Object.assign(new Link(q0, q1), { text: 'a' }),
	Object.assign(new SelfLink(q1), { text: 'b' }),
);

const snap = exportSnapshot();
const json = JSON.stringify(snap);
const parsed = JSON.parse(json);
const err = validateSnapshot(parsed);
console.log(err === null ? 'PASS valid snapshot' : 'FAIL validate: ' + err);

// Wipe and reimport
nodes.length = 0;
links.length = 0;
deserializeState(parsed);
console.log(
	nodes.length === 2 && links.length === 3
		? 'PASS round-trip restored 2 nodes / 3 links'
		: 'FAIL round-trip: nodes=' + nodes.length + ' links=' + links.length,
);

// Negative cases
const bad = [
	[null, 'not an object'],
	[{}, 'unexpected format undefined'],
	[{ format: 'fsmStudio.v999', nodes: [], links: [] }, 'unexpected format "fsmStudio.v999"'],
	[{ format: 'fsmStudio.v1', nodes: 'oops', links: [] }, 'nodes must be an array'],
	[{ format: 'fsmStudio.v1', nodes: [{ x: 'a', y: 1, text: '', isAcceptState: false }], links: [] }, 'node[0] missing numeric x/y'],
	[{ format: 'fsmStudio.v1', nodes: [], links: [{ type: 'Bogus' }] }, 'link[0] unknown type "Bogus"'],
];

for (const [obj, want] of bad) {
	const got = validateSnapshot(obj);
	console.log(got === want ? 'PASS reject' : 'FAIL reject (got "' + got + '" want "' + want + '")', JSON.stringify(obj));
}
