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

// Build the NFA, materialize as live Node/Link objects via deserializeState,
// then run simulate() on a few accept/reject inputs to verify the regex
// semantics survived round-tripping through Thompson + the schema.
function check(regex, accepts, rejects) {
	const json = regexToNFA(regex);
	nodes.length = 0;
	links.length = 0;
	deserializeState(json);
	for (const s of accepts) {
		const r = simulate(nodes, links, s);
		if (!r.accepted) {
			console.log('FAIL', regex, 'should accept', JSON.stringify(s), '->', r);
			return false;
		}
	}
	for (const s of rejects) {
		const r = simulate(nodes, links, s);
		if (r.accepted) {
			console.log('FAIL', regex, 'should reject', JSON.stringify(s), '->', r);
			return false;
		}
	}
	console.log('PASS', regex, '(' + json.nodes.length + ' states)');
	return true;
}

let fails = 0;
if (!check('a', ['a'], ['', 'b', 'aa'])) fails++;
if (!check('ab', ['ab'], ['', 'a', 'b', 'aba'])) fails++;
if (!check('a|b', ['a', 'b'], ['', 'ab', 'c'])) fails++;
if (!check('a*', ['', 'a', 'aa', 'aaa'], ['b', 'ab'])) fails++;
if (!check('a+', ['a', 'aa'], ['', 'b'])) fails++;
if (!check('a?', ['', 'a'], ['aa', 'b'])) fails++;
if (!check('(a|b)*abb', ['abb', 'aabb', 'babb', 'aaabb', 'ababb'], ['', 'a', 'ab', 'abba'])) fails++;
if (!check('(a|b)*', ['', 'a', 'b', 'ab', 'ba', 'bbaab'], ['c', 'aca'])) fails++;

// "a|" is well-formed: the right side of | is an empty term, i.e. epsilon.
if (!check('a|', ['', 'a'], ['b', 'aa'])) fails++;
try {
	parseRegex('(a');
	console.log('FAIL: unclosed paren should error');
	fails++;
} catch (e) {
	console.log('PASS rejects unclosed "(a":', e.message);
}

process.exit(fails === 0 ? 0 : 1);
