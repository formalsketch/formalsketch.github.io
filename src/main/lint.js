// Diagram-level checks. Pure over (nodes, links); the UI decides what to show.

var LINT_KINDS = [
	{ id: 'no_start', label: 'No start state', severity: 'error' },
	{ id: 'multi_start', label: 'Multiple start states', severity: 'error' },
	{ id: 'no_accept', label: 'No accept state', severity: 'warning' },
	{ id: 'nondet', label: 'Nondeterministic transitions', severity: 'warning' },
	{ id: 'missing', label: 'Missing transitions', severity: 'warning' },
	{ id: 'unreachable', label: 'Unreachable states', severity: 'info' },
];

function lint(nodes, links) {
	var out = [];
	var starts = getStartStates(nodes, links);

	if (starts.length === 0) {
		out.push({
			kind: 'no_start',
			severity: 'error',
			element: null,
			message: 'no start state',
		});
	} else if (starts.length > 1) {
		for (var i = 0; i < links.length; i++) {
			if (links[i] instanceof StartLink) {
				out.push({
					kind: 'multi_start',
					severity: 'error',
					element: links[i],
					message: 'multiple start states',
				});
			}
		}
	}

	var hasAccept = false;
	for (var n = 0; n < nodes.length; n++) {
		if (nodes[n].isAcceptState) {
			hasAccept = true;
			break;
		}
	}
	if (!hasAccept) {
		out.push({
			kind: 'no_accept',
			severity: 'warning',
			element: null,
			message: 'no accept state',
		});
	}

	var alphabet = {};
	for (var li = 0; li < links.length; li++) {
		var l = links[li];
		if (!(l instanceof Link) && !(l instanceof SelfLink)) continue;
		var syms = parseSymbols(l.text);
		for (var k = 0; k < syms.length; k++) {
			if (syms[k] !== '') alphabet[syms[k]] = true;
		}
	}
	var alphabetList = Object.keys(alphabet);

	for (var ni = 0; ni < nodes.length; ni++) {
		var counts = {};
		var seen = {};
		for (var lj = 0; lj < links.length; lj++) {
			var lk = links[lj];
			var matches =
				(lk instanceof SelfLink && lk.node === nodes[ni]) ||
				(lk instanceof Link && lk.nodeA === nodes[ni]);
			if (!matches) continue;
			var sx = parseSymbols(lk.text);
			for (var s = 0; s < sx.length; s++) {
				var sym = sx[s];
				if (sym !== '') seen[sym] = true;
				counts[sym] = (counts[sym] || 0) + 1;
				if (counts[sym] === 2) {
					out.push({
						kind: 'nondet',
						severity: 'warning',
						element: nodes[ni],
						message:
							'nondeterministic on ' +
							(sym === '' ? 'epsilon' : JSON.stringify(sym)),
					});
				}
			}
		}
		for (var a = 0; a < alphabetList.length; a++) {
			if (!seen[alphabetList[a]]) {
				out.push({
					kind: 'missing',
					severity: 'warning',
					element: nodes[ni],
					message: 'missing transition for ' + JSON.stringify(alphabetList[a]),
				});
			}
		}
	}

	if (starts.length > 0) {
		var reach = {};
		var queue = starts.slice();
		for (var q = 0; q < queue.length; q++) reach[queue[q]] = true;
		while (queue.length) {
			var s = queue.shift();
			var outs = getOutgoing(s, nodes, links);
			for (var u = 0; u < outs.length; u++) {
				if (!reach[outs[u].target]) {
					reach[outs[u].target] = true;
					queue.push(outs[u].target);
				}
			}
		}
		for (var nj = 0; nj < nodes.length; nj++) {
			if (!reach[nj]) {
				out.push({
					kind: 'unreachable',
					severity: 'info',
					element: nodes[nj],
					message: 'unreachable from start',
				});
			}
		}
	}

	return out;
}

function lintEnabledFor(kind) {
	try {
		return localStorage.getItem('fsm_lint_off_' + kind) !== '1';
	} catch (e) {
		return true;
	}
}

function setLintEnabled(kind, on) {
	try {
		if (on) localStorage.removeItem('fsm_lint_off_' + kind);
		else localStorage.setItem('fsm_lint_off_' + kind, '1');
	} catch (e) {}
}
