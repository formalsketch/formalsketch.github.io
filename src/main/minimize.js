// DFA minimization via partition refinement (Moore's). For our typical sizes
// the n^2 inner loop is fine; if it ever bites we'd switch to Hopcroft.
//
// Steps:
//   1. Inflate the input as a DFA. Reject NFA-shaped inputs (nondeterministic
//      transitions, epsilon edges).
//   2. Initial partition = { accept states, non-accept states }.
//   3. Refine: two states are equivalent iff for every symbol c their
//      transitions land in the same partition. Keep splitting until stable.

function minimize(dfaJson) {
	var dfa = inflateFSM(dfaJson);
	var nodes = dfa.nodes;
	var links = dfa.links;
	var n = nodes.length;
	if (!n) return { format: SAVE_FORMAT, nodes: [], links: [] };

	var alphabet = fsmAlphabet(nodes, links);

	// Transition table indexed by [stateIdx][symbol]. Missing entries are -1.
	var trans = [];
	for (var i = 0; i < n; i++) trans.push({});
	for (var li = 0; li < links.length; li++) {
		var l = links[li];
		var src, dst;
		if (l instanceof Link) {
			src = nodes.indexOf(l.nodeA);
			dst = nodes.indexOf(l.nodeB);
		} else if (l instanceof SelfLink) {
			src = nodes.indexOf(l.node);
			dst = src;
		} else {
			continue;
		}
		var syms = parseSymbols(l.text);
		for (var k = 0; k < syms.length; k++) {
			var s = syms[k];
			if (s === '') {
				throw new Error('minimize requires a DFA; found an epsilon edge');
			}
			if (trans[src][s] !== undefined && trans[src][s] !== dst) {
				throw new Error(
					'minimize requires a DFA; state ' +
						src +
						' has two targets on ' +
						JSON.stringify(s),
				);
			}
			trans[src][s] = dst;
		}
	}

	var hasAccept = false;
	for (var i = 0; i < n; i++) if (nodes[i].isAcceptState) hasAccept = true;

	var partition = new Array(n);
	for (var i = 0; i < n; i++) {
		partition[i] = nodes[i].isAcceptState && hasAccept ? 1 : 0;
	}
	var numClasses = hasAccept ? 2 : 1;

	while (true) {
		var classOf = {};
		var nextClass = 0;
		var nextPartition = new Array(n);
		for (var i = 0; i < n; i++) {
			var sig = partition[i] + '|';
			for (var a = 0; a < alphabet.length; a++) {
				var t = trans[i][alphabet[a]];
				sig += (t === undefined ? '-' : partition[t]) + ',';
			}
			if (!(sig in classOf)) classOf[sig] = nextClass++;
			nextPartition[i] = classOf[sig];
		}
		if (nextClass === numClasses) {
			var same = true;
			for (var i = 0; i < n; i++) {
				if (nextPartition[i] !== partition[i]) {
					same = false;
					break;
				}
			}
			if (same) break;
		}
		partition = nextPartition;
		numClasses = nextClass;
	}

	var rep = {};
	for (var i = 0; i < n; i++) {
		if (rep[partition[i]] === undefined) rep[partition[i]] = i;
	}
	var starts = getStartStates(nodes, links);
	if (!starts.length) throw new Error('no start state to minimize from');

	var json = { format: SAVE_FORMAT, nodes: [], links: [] };
	for (var p = 0; p < numClasses; p++) {
		var r = rep[p];
		json.nodes.push({
			x: 0,
			y: 0,
			text: 'd' + p,
			isAcceptState: nodes[r].isAcceptState,
		});
	}
	json.links.push({
		type: 'StartLink',
		node: partition[starts[0]],
		text: '',
		deltaX: -50,
		deltaY: 0,
	});

	var grouped = {};
	for (var p = 0; p < numClasses; p++) {
		var r = rep[p];
		for (var a = 0; a < alphabet.length; a++) {
			var sym = alphabet[a];
			var t = trans[r][sym];
			if (t === undefined) continue;
			var to = partition[t];
			var gk = p + ',' + to;
			if (!grouped[gk]) grouped[gk] = { from: p, to: to, syms: [] };
			grouped[gk].syms.push(sym);
		}
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
