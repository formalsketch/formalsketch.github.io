// Node-side test of simulate(). Builds the FSM directly with Node / Link / SelfLink
// / StartLink constructors and runs simulate() against it.

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

function dfa01plus() {
	// Two-state DFA accepting strings ending in 0 over {0,1}:
	//   q0 (accept) --0--> q0
	//   q0 --1--> q1
	//   q1 --0--> q0 (accept)
	//   q1 --1--> q1
	const q0 = new Node(100, 100);
	const q1 = new Node(300, 100);
	q0.isAcceptState = true;
	const ns = [q0, q1];
	const ls = [
		new StartLink(q0, { x: 50, y: 100 }),
		Object.assign(new SelfLink(q0), { text: '0' }),
		Object.assign(new Link(q0, q1), { text: '1' }),
		Object.assign(new Link(q1, q0), { text: '0' }),
		Object.assign(new SelfLink(q1), { text: '1' }),
	];
	return { nodes: ns, links: ls };
}

function nfaWithEpsilon() {
	// NFA: q0 --eps--> q1, q1 --a--> q2 (accept). On input 'a' should accept via epsilon.
	const q0 = new Node(100, 100);
	const q1 = new Node(200, 100);
	const q2 = new Node(300, 100);
	q2.isAcceptState = true;
	const ns = [q0, q1, q2];
	const ls = [
		new StartLink(q0, { x: 50, y: 100 }),
		Object.assign(new Link(q0, q1), { text: '' }),
		Object.assign(new Link(q1, q2), { text: 'a' }),
	];
	return { nodes: ns, links: ls };
}

const cases = [
	['DFA accepts "0"', dfa01plus(), '0', true],
	['DFA accepts "10"', dfa01plus(), '10', true],
	['DFA rejects "1"', dfa01plus(), '1', false],
	['DFA rejects "11"', dfa01plus(), '11', false],
	['DFA accepts empty string (start is accept)', dfa01plus(), '', true],
	['NFA epsilon-closes start', nfaWithEpsilon(), 'a', true],
	['NFA rejects on missing transition', nfaWithEpsilon(), 'b', false],
];

let fails = 0;
for (const [label, fsm, input, want] of cases) {
	const r = simulate(fsm.nodes, fsm.links, input);
	const ok = r.accepted === want;
	if (!ok) fails++;
	console.log(
		ok ? 'PASS' : 'FAIL',
		label,
		'input=' + JSON.stringify(input),
		'-> accepted=' + r.accepted,
		'(' + (r.error || 'no error') + ')',
	);
}

const fsm = dfa01plus();
const r = simulate(fsm.nodes, fsm.links, '0110');
console.log('path of "0110":', JSON.stringify(r.path), 'accepted=' + r.accepted);

const noStart = simulate(
	[new Node(100, 100)],
	[],
	'a',
);
console.log(
	'no-start case error:',
	noStart.error === 'no start state' ? 'PASS' : 'FAIL: ' + noStart.error,
);
process.exit(fails === 0 ? 0 : 1);
