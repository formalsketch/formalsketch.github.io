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
	store: {},
	getItem(k) {
		return this.store[k] || null;
	},
	setItem(k, v) {
		this.store[k] = v;
	},
	removeItem(k) {
		delete this.store[k];
	},
};

try {
	eval(code);
} catch (e) {}

function build(label, setup) {
	const fsm = setup();
	const warnings = lint(fsm.nodes, fsm.links);
	const kinds = warnings.map((w) => w.kind).sort();
	console.log(label, '->', kinds.join(',') || '(none)');
	return { warnings, kinds };
}

// no start, no accept
build('empty', () => ({ nodes: [], links: [] }));

// single node with no start
build('one orphan node', () => {
	const n = new Node(100, 100);
	return { nodes: [n], links: [] };
});

// good DFA
const dfaResult = build('valid DFA on {0,1}', () => {
	const q0 = new Node(100, 100);
	const q1 = new Node(300, 100);
	q1.isAcceptState = true;
	return {
		nodes: [q0, q1],
		links: [
			new StartLink(q0, { x: 50, y: 100 }),
			Object.assign(new SelfLink(q0), { text: '0' }),
			Object.assign(new Link(q0, q1), { text: '1' }),
			Object.assign(new Link(q1, q0), { text: '0' }),
			Object.assign(new SelfLink(q1), { text: '1' }),
		],
	};
});
if (dfaResult.warnings.length !== 0) {
	console.log('  FAIL: valid DFA should have no warnings, got', dfaResult.warnings);
	process.exit(1);
}

// nondeterministic
const ndResult = build('nondeterministic on 0', () => {
	const q0 = new Node(100, 100);
	const q1 = new Node(300, 100);
	const q2 = new Node(300, 300);
	q2.isAcceptState = true;
	return {
		nodes: [q0, q1, q2],
		links: [
			new StartLink(q0, { x: 50, y: 100 }),
			Object.assign(new Link(q0, q1), { text: '0' }),
			Object.assign(new Link(q0, q2), { text: '0' }),
		],
	};
});
if (!ndResult.kinds.includes('nondet')) {
	console.log('  FAIL: expected nondet warning');
	process.exit(1);
}

// unreachable
const unreachable = build('unreachable q2', () => {
	const q0 = new Node(100, 100);
	const q1 = new Node(300, 100);
	const q2 = new Node(500, 100);
	q1.isAcceptState = true;
	return {
		nodes: [q0, q1, q2],
		links: [
			new StartLink(q0, { x: 50, y: 100 }),
			Object.assign(new Link(q0, q1), { text: 'a' }),
		],
	};
});
if (!unreachable.kinds.includes('unreachable')) {
	console.log('  FAIL: expected unreachable warning');
	process.exit(1);
}

console.log('all lint checks passed');
