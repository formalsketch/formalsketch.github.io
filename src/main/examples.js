// Demo FSMs that show off the editor's algorithms. Each builder returns
// FSM JSON; coordinates default to 0,0 because applyFSMJsonAsNew() runs
// auto-layout before drawing.

function _link(from, to, sym) {
	if (from === to) {
		return {
			type: 'SelfLink',
			node: from,
			text: sym,
			anchorAngle: -Math.PI / 2,
		};
	}
	return {
		type: 'Link',
		nodeA: from,
		nodeB: to,
		text: sym,
		lineAngleAdjust: 0,
		parallelPart: 0.5,
		perpendicularPart: 0,
	};
}

function _node(text, isAccept) {
	return { x: 0, y: 0, text: text, isAcceptState: !!isAccept };
}

function _wrap(nodes, links, startIdx) {
	return {
		format: SAVE_FORMAT,
		nodes: nodes,
		links: [
			{
				type: 'StartLink',
				node: startIdx,
				text: '',
				deltaX: -50,
				deltaY: 0,
			},
		].concat(links),
	};
}

function exampleDivisibleBy3() {
	return _wrap(
		[_node('mod 0', true), _node('mod 1', false), _node('mod 2', false)],
		[
			_link(0, 0, '0'),
			_link(0, 1, '1'),
			_link(1, 2, '0'),
			_link(1, 0, '1'),
			_link(2, 1, '0'),
			_link(2, 2, '1'),
		],
		0,
	);
}

function exampleContainsAB() {
	return _wrap(
		[_node('q0', false), _node('q1 (saw a)', false), _node('q2', true)],
		[
			_link(0, 0, 'b'),
			_link(0, 1, 'a'),
			_link(1, 1, 'a'),
			_link(1, 2, 'b'),
			_link(2, 2, 'a,b'),
		],
		0,
	);
}

function exampleRegexAbb() {
	return regexToNFA('(a|b)*abb');
}

function exampleMod4Counter() {
	return _wrap(
		[_node('0', true), _node('1', false), _node('2', false), _node('3', false)],
		[
			_link(0, 1, 'tick'),
			_link(1, 2, 'tick'),
			_link(2, 3, 'tick'),
			_link(3, 0, 'tick'),
		],
		0,
	);
}

function exampleNFAEpsilon() {
	return _wrap(
		[
			_node('start', false),
			_node('branch a', false),
			_node('branch b', false),
			_node('a-seen', false),
			_node('b-seen', false),
			_node('accept', true),
		],
		[
			_link(0, 1, ''),
			_link(0, 2, ''),
			_link(1, 3, 'a'),
			_link(3, 5, ''),
			_link(2, 4, 'b'),
			_link(4, 5, ''),
		],
		0,
	);
}

function exampleNonMinimalDFA() {
	// Accepts strings ending in "01" but with two redundant accept paths.
	// q1 and q1' both behave identically: minimizing should merge them.
	return _wrap(
		[
			_node('q0', false),
			_node('q1', false),
			_node('q2', true),
			_node("q1'", false),
			_node("q2'", true),
		],
		[
			_link(0, 1, '0'),
			_link(0, 3, '1'),
			_link(1, 1, '0'),
			_link(1, 2, '1'),
			_link(2, 1, '0'),
			_link(2, 4, '1'),
			_link(3, 1, '0'),
			_link(3, 3, '1'),
			_link(4, 1, '0'),
			_link(4, 4, '1'),
		],
		0,
	);
}

var EXAMPLES = [
	{ name: 'Divisible by 3 (binary)', build: exampleDivisibleBy3 },
	{ name: 'Contains "ab"', build: exampleContainsAB },
	{ name: 'Regex (a|b)*abb', build: exampleRegexAbb },
	{ name: 'Mod-4 counter (Moore-style)', build: exampleMod4Counter },
	{ name: 'NFA with epsilon transitions', build: exampleNFAEpsilon },
	{ name: 'Non-minimal DFA (try Minimize)', build: exampleNonMinimalDFA },
];
