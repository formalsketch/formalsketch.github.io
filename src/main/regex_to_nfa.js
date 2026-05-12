// Recursive-descent regex parser + Thompson construction.
// Grammar:
//   expr   = term ('|' term)*
//   term   = factor*
//   factor = atom ('*' | '+' | '?')?
//   atom   = '(' expr ')' | literal
// '(' ')' is an explicit epsilon. There is no escape syntax for v1 -- the
// special characters |*+?() can't appear as literals.

function parseRegex(input) {
	var pos = 0;
	var SPECIAL = '|*+?()';

	function peek() {
		return pos < input.length ? input.charAt(pos) : null;
	}
	function eat(c) {
		if (peek() === c) {
			pos++;
			return true;
		}
		return false;
	}

	function expr() {
		var first = term();
		if (peek() !== '|') return first;
		var arr = [first];
		while (eat('|')) arr.push(term());
		return { type: 'union', children: arr };
	}

	function term() {
		var arr = [];
		while (peek() != null && peek() !== '|' && peek() !== ')') {
			arr.push(factor());
		}
		if (!arr.length) return { type: 'eps' };
		if (arr.length === 1) return arr[0];
		return { type: 'concat', children: arr };
	}

	function factor() {
		var a = atom();
		while (true) {
			if (eat('*')) a = { type: 'star', child: a };
			else if (eat('+')) a = { type: 'plus', child: a };
			else if (eat('?')) a = { type: 'opt', child: a };
			else break;
		}
		return a;
	}

	function atom() {
		if (eat('(')) {
			var inner = expr();
			if (!eat(')')) {
				throw new Error('expected ) at position ' + pos);
			}
			return inner;
		}
		var c = peek();
		if (c == null || SPECIAL.indexOf(c) !== -1) {
			throw new Error(
				'unexpected ' + JSON.stringify(c) + ' at position ' + pos,
			);
		}
		pos++;
		return { type: 'lit', value: c };
	}

	var tree = expr();
	if (pos < input.length) {
		throw new Error(
			'unexpected ' + JSON.stringify(peek()) + ' at position ' + pos,
		);
	}
	return tree;
}

function thompson(ast) {
	var states = [];
	var trans = [];
	function newState() {
		states.push({});
		return states.length - 1;
	}
	function add(from, to, sym) {
		trans.push({ from: from, to: to, symbol: sym });
	}

	function build(node) {
		if (node.type === 'eps') {
			var s = newState(),
				e = newState();
			add(s, e, '');
			return { s: s, e: e };
		}
		if (node.type === 'lit') {
			var s2 = newState(),
				e2 = newState();
			add(s2, e2, node.value);
			return { s: s2, e: e2 };
		}
		if (node.type === 'concat') {
			if (!node.children.length) return build({ type: 'eps' });
			var first = build(node.children[0]);
			for (var i = 1; i < node.children.length; i++) {
				var next = build(node.children[i]);
				add(first.e, next.s, '');
				first.e = next.e;
			}
			return first;
		}
		if (node.type === 'union') {
			var us = newState(),
				ue = newState();
			for (var k = 0; k < node.children.length; k++) {
				var c = build(node.children[k]);
				add(us, c.s, '');
				add(c.e, ue, '');
			}
			return { s: us, e: ue };
		}
		if (node.type === 'star') {
			var ss = newState(),
				se = newState();
			var inner = build(node.child);
			add(ss, inner.s, '');
			add(ss, se, '');
			add(inner.e, inner.s, '');
			add(inner.e, se, '');
			return { s: ss, e: se };
		}
		if (node.type === 'plus') {
			return build({
				type: 'concat',
				children: [node.child, { type: 'star', child: node.child }],
			});
		}
		if (node.type === 'opt') {
			return build({
				type: 'union',
				children: [node.child, { type: 'eps' }],
			});
		}
		throw new Error('unknown ast node ' + node.type);
	}

	var frag = build(ast);
	return { states: states, trans: trans, start: frag.s, accept: frag.e };
}

function regexToNFA(regex) {
	var ast = parseRegex(regex);
	var nfa = thompson(ast);
	var json = { format: SAVE_FORMAT, nodes: [], links: [] };
	for (var i = 0; i < nfa.states.length; i++) {
		json.nodes.push({
			x: 0,
			y: 0,
			text: 'q' + i,
			isAcceptState: i === nfa.accept,
		});
	}
	json.links.push({
		type: 'StartLink',
		node: nfa.start,
		text: '',
		deltaX: -50,
		deltaY: 0,
	});
	for (var t = 0; t < nfa.trans.length; t++) {
		var tr = nfa.trans[t];
		if (tr.from === tr.to) {
			json.links.push({
				type: 'SelfLink',
				node: tr.from,
				text: tr.symbol,
				anchorAngle: -Math.PI / 2,
			});
		} else {
			json.links.push({
				type: 'Link',
				nodeA: tr.from,
				nodeB: tr.to,
				text: tr.symbol,
				lineAngleAdjust: 0,
				parallelPart: 0.5,
				perpendicularPart: 0,
			});
		}
	}
	return json;
}
