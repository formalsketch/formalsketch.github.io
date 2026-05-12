// Subset construction. Takes an FSM JSON, returns a DFA JSON without
// coordinates (layout() positions them later).

function fsmAlphabet(nodes, links) {
	var set = {};
	for (var i = 0; i < links.length; i++) {
		var l = links[i];
		if (!(l instanceof Link) && !(l instanceof SelfLink)) continue;
		var syms = parseSymbols(l.text);
		for (var k = 0; k < syms.length; k++) {
			if (syms[k] !== '') set[syms[k]] = true;
		}
	}
	return Object.keys(set).sort();
}

function nfaToDFA(nfaJson) {
	var nfa = inflateFSM(nfaJson);
	var starts = getStartStates(nfa.nodes, nfa.links);
	if (starts.length !== 1) {
		throw new Error(
			'subset construction expects exactly one start state (got ' +
				starts.length +
				')',
		);
	}
	var alphabet = fsmAlphabet(nfa.nodes, nfa.links);
	var startClosure = epsilonClosure([starts[0]], nfa.nodes, nfa.links);

	function key(set) {
		return set
			.slice()
			.sort(function (a, b) {
				return a - b;
			})
			.join(',');
	}
	function isAccept(set) {
		for (var i = 0; i < set.length; i++) {
			if (nfa.nodes[set[i]].isAcceptState) return true;
		}
		return false;
	}

	var seen = {};
	var dfaStates = [];
	var dfaTransitions = [];

	function addState(set) {
		var k = key(set);
		if (k in seen) return seen[k];
		var idx = dfaStates.length;
		seen[k] = idx;
		dfaStates.push({ members: set, accept: isAccept(set) });
		return idx;
	}

	var startIdx = addState(startClosure);
	var queue = [startIdx];
	while (queue.length) {
		var s = queue.shift();
		var subset = dfaStates[s].members;
		for (var a = 0; a < alphabet.length; a++) {
			var sym = alphabet[a];
			var step = simulateStep(subset, sym, nfa.nodes, nfa.links);
			if (!step.states.length) continue;
			var k = key(step.states);
			var to;
			if (k in seen) {
				to = seen[k];
			} else {
				to = addState(step.states);
				queue.push(to);
			}
			dfaTransitions.push({ from: s, to: to, symbol: sym });
		}
	}

	var json = { format: SAVE_FORMAT, nodes: [], links: [] };
	for (var i = 0; i < dfaStates.length; i++) {
		json.nodes.push({
			x: 0,
			y: 0,
			text: 'd' + i,
			isAcceptState: dfaStates[i].accept,
		});
	}
	json.links.push({
		type: 'StartLink',
		node: startIdx,
		text: '',
		deltaX: -50,
		deltaY: 0,
	});

	// Combine multiple symbols between the same pair into one link with a
	// comma-separated label (matches what simulate.js parses).
	var grouped = {};
	for (var t = 0; t < dfaTransitions.length; t++) {
		var tr = dfaTransitions[t];
		var gk = tr.from + ',' + tr.to;
		if (!grouped[gk]) grouped[gk] = { from: tr.from, to: tr.to, syms: [] };
		grouped[gk].syms.push(tr.symbol);
	}
	for (var gk in grouped) {
		var g = grouped[gk];
		var label = g.syms.join(',');
		if (g.from === g.to) {
			json.links.push({
				type: 'SelfLink',
				node: g.from,
				text: label,
				anchorAngle: -Math.PI / 2,
			});
		} else {
			json.links.push({
				type: 'Link',
				nodeA: g.from,
				nodeB: g.to,
				text: label,
				lineAngleAdjust: 0,
				parallelPart: 0.5,
				perpendicularPart: 0,
			});
		}
	}
	return json;
}
