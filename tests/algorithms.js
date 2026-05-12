const fs = require('fs');
const code = fs.readFileSync('fsm.js', 'utf8');

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

function checkLang(json, accepts, rejects, label) {
	nodes.length = 0;
	links.length = 0;
	deserializeState(json);
	for (const s of accepts) {
		const r = simulate(nodes, links, s);
		if (!r.accepted) {
			console.log('FAIL', label, 'should accept', JSON.stringify(s), '->', r);
			return false;
		}
	}
	for (const s of rejects) {
		const r = simulate(nodes, links, s);
		if (r.accepted) {
			console.log('FAIL', label, 'should reject', JSON.stringify(s), '->', r);
			return false;
		}
	}
	console.log('PASS', label, '(' + json.nodes.length + ' states)');
	return true;
}

let fails = 0;

// 1. (a|b)*abb: NFA, then DFA via subset construction, then minimize.
const nfa = regexToNFA('(a|b)*abb');
const ABBA_ACCEPT = ['abb', 'aabb', 'babb', 'aaabb', 'ababb', 'bbabb'];
const ABBA_REJECT = ['', 'a', 'ab', 'abba', 'b'];
if (!checkLang(nfa, ABBA_ACCEPT, ABBA_REJECT, 'NFA (a|b)*abb')) fails++;

const dfa = nfaToDFA(nfa);
if (!checkLang(dfa, ABBA_ACCEPT, ABBA_REJECT, 'DFA of (a|b)*abb')) fails++;

const mdfa = minimize(dfa);
if (!checkLang(mdfa, ABBA_ACCEPT, ABBA_REJECT, 'min DFA of (a|b)*abb')) fails++;
if (mdfa.nodes.length > dfa.nodes.length) {
	console.log('FAIL: minimize grew state count (' + dfa.nodes.length + ' -> ' + mdfa.nodes.length + ')');
	fails++;
}

// 2. Idempotence: minimizing the minimum stays the same size.
const mdfa2 = minimize(mdfa);
if (mdfa2.nodes.length !== mdfa.nodes.length) {
	console.log('FAIL: minimize not idempotent (' + mdfa.nodes.length + ' -> ' + mdfa2.nodes.length + ')');
	fails++;
} else {
	console.log('PASS minimize is idempotent (' + mdfa.nodes.length + ' states)');
}

// 3. Tiny deliberately-redundant DFA: two accept states that recognize the
//    same language should collapse to one.
const redundant = {
	format: 'fsmStudio.v1',
	nodes: [
		{ x: 0, y: 0, text: 'q0', isAcceptState: false },
		{ x: 0, y: 0, text: 'q1', isAcceptState: true },
		{ x: 0, y: 0, text: 'q2', isAcceptState: true },
	],
	links: [
		{ type: 'StartLink', node: 0, text: '', deltaX: -50, deltaY: 0 },
		{ type: 'Link', nodeA: 0, nodeB: 1, text: 'a', lineAngleAdjust: 0, parallelPart: 0.5, perpendicularPart: 0 },
		{ type: 'Link', nodeA: 0, nodeB: 2, text: 'b', lineAngleAdjust: 0, parallelPart: 0.5, perpendicularPart: 0 },
		{ type: 'SelfLink', node: 1, text: 'a,b', anchorAngle: 0 },
		{ type: 'SelfLink', node: 2, text: 'a,b', anchorAngle: 0 },
	],
};
const collapsed = minimize(redundant);
if (collapsed.nodes.length !== 2) {
	console.log('FAIL: redundant 3-state DFA should minimize to 2 states, got ' + collapsed.nodes.length);
	fails++;
} else {
	console.log('PASS redundant 3-state DFA collapsed to 2 states');
}

process.exit(fails === 0 ? 0 : 1);
