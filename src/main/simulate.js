// NFA simulation over the current diagram. Pure functions; the UI and the
// drawing layer do their own state management on top.

function parseSymbols(text) {
	if (text == null) return [''];
	var s = String(text);
	if (s.trim() === '') return [''];
	var parts = s.split(',');
	var out = [];
	for (var i = 0; i < parts.length; i++) out.push(parts[i].trim());
	return out;
}

function getStartStates(nodes, links) {
	var out = [];
	for (var i = 0; i < links.length; i++) {
		if (links[i] instanceof StartLink) {
			var idx = nodes.indexOf(links[i].node);
			if (idx !== -1) out.push(idx);
		}
	}
	return out;
}

function getOutgoing(nodeIndex, nodes, links) {
	var node = nodes[nodeIndex];
	var out = [];
	for (var i = 0; i < links.length; i++) {
		var l = links[i];
		if (l instanceof SelfLink && l.node === node) {
			out.push({ link: l, symbols: parseSymbols(l.text), target: nodeIndex });
		} else if (l instanceof Link && l.nodeA === node) {
			var t = nodes.indexOf(l.nodeB);
			if (t !== -1) {
				out.push({ link: l, symbols: parseSymbols(l.text), target: t });
			}
		}
	}
	return out;
}

function epsilonClosure(states, nodes, links) {
	var seen = {};
	var queue = [];
	for (var i = 0; i < states.length; i++) {
		seen[states[i]] = true;
		queue.push(states[i]);
	}
	while (queue.length) {
		var s = queue.shift();
		var outs = getOutgoing(s, nodes, links);
		for (var k = 0; k < outs.length; k++) {
			if (outs[k].symbols.indexOf('') === -1) continue;
			if (!seen[outs[k].target]) {
				seen[outs[k].target] = true;
				queue.push(outs[k].target);
			}
		}
	}
	var keys = Object.keys(seen);
	var result = [];
	for (var j = 0; j < keys.length; j++) result.push(+keys[j]);
	return result.sort(function (a, b) {
		return a - b;
	});
}

function simulateStep(activeStates, symbol, nodes, links) {
	var next = {};
	var taken = [];
	for (var i = 0; i < activeStates.length; i++) {
		var outs = getOutgoing(activeStates[i], nodes, links);
		for (var k = 0; k < outs.length; k++) {
			if (outs[k].symbols.indexOf(symbol) !== -1) {
				next[outs[k].target] = true;
				taken.push(outs[k].link);
			}
		}
	}
	var rawNext = Object.keys(next).map(Number);
	return { states: epsilonClosure(rawNext, nodes, links), links: taken };
}

function simulate(nodes, links, input) {
	var starts = getStartStates(nodes, links);
	if (starts.length === 0) {
		return { path: [], accepted: false, error: 'no start state' };
	}
	if (starts.length > 1) {
		return { path: [], accepted: false, error: 'multiple start states' };
	}

	var current = epsilonClosure([starts[0]], nodes, links);
	var path = [current.slice()];

	for (var i = 0; i < input.length; i++) {
		var sym = input.charAt(i);
		var step = simulateStep(current, sym, nodes, links);
		if (step.states.length === 0) {
			return {
				path: path,
				accepted: false,
				error:
					'no transition for ' + JSON.stringify(sym) + ' at step ' + (i + 1),
			};
		}
		current = step.states;
		path.push(current.slice());
	}

	var accepted = false;
	for (var j = 0; j < current.length; j++) {
		var n = nodes[current[j]];
		if (n && n.isAcceptState) {
			accepted = true;
			break;
		}
	}
	return { path: path, accepted: accepted };
}
