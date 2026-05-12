// Serialization helpers for the active FSM.
// Reads/writes the active FSM via Workspace. See docs/format.md for the
// import/export envelope.

var SAVE_FORMAT = 'fsmStudio.v1';

function serializeState() {
	var data = { nodes: [], links: [] };
	for (var i = 0; i < nodes.length; i++) {
		var node = nodes[i];
		data.nodes.push({
			x: node.x,
			y: node.y,
			text: node.text,
			isAcceptState: node.isAcceptState,
		});
	}
	for (var i = 0; i < links.length; i++) {
		var link = links[i];
		var backupLink = null;
		if (link instanceof SelfLink) {
			backupLink = {
				type: 'SelfLink',
				node: nodes.indexOf(link.node),
				text: link.text,
				anchorAngle: link.anchorAngle,
			};
		} else if (link instanceof StartLink) {
			backupLink = {
				type: 'StartLink',
				node: nodes.indexOf(link.node),
				text: link.text,
				deltaX: link.deltaX,
				deltaY: link.deltaY,
			};
		} else if (link instanceof Link) {
			backupLink = {
				type: 'Link',
				nodeA: nodes.indexOf(link.nodeA),
				nodeB: nodes.indexOf(link.nodeB),
				text: link.text,
				lineAngleAdjust: link.lineAngleAdjust,
				parallelPart: link.parallelPart,
				perpendicularPart: link.perpendicularPart,
			};
		}
		if (backupLink) data.links.push(backupLink);
	}
	return data;
}

function deserializeState(data) {
	nodes.length = 0;
	links.length = 0;
	selectedObject = null;
	if (!data || !data.nodes) return;
	for (var i = 0; i < data.nodes.length; i++) {
		var bn = data.nodes[i];
		var node = new Node(bn.x, bn.y);
		node.isAcceptState = !!bn.isAcceptState;
		node.text = bn.text || '';
		nodes.push(node);
	}
	for (var i = 0; i < data.links.length; i++) {
		var bl = data.links[i];
		var link = null;
		if (bl.type === 'SelfLink') {
			link = new SelfLink(nodes[bl.node]);
			link.anchorAngle = bl.anchorAngle;
			link.text = bl.text;
		} else if (bl.type === 'StartLink') {
			link = new StartLink(nodes[bl.node]);
			link.deltaX = bl.deltaX;
			link.deltaY = bl.deltaY;
			link.text = bl.text;
		} else if (bl.type === 'Link') {
			link = new Link(nodes[bl.nodeA], nodes[bl.nodeB]);
			link.parallelPart = bl.parallelPart;
			link.perpendicularPart = bl.perpendicularPart;
			link.text = bl.text;
			link.lineAngleAdjust = bl.lineAngleAdjust;
		}
		if (link) links.push(link);
	}
}

function snapshotJSON() {
	return JSON.stringify(serializeState());
}

function loadSnapshotJSON(json) {
	if (!json) return;
	try {
		deserializeState(JSON.parse(json));
	} catch (e) {}
}

function saveBackup() {
	if (typeof localStorage === 'undefined' || !JSON) return;
	if (!Workspace.getActiveId()) return;
	Workspace.saveActive(serializeState());
}

function restoreBackup() {
	if (typeof localStorage === 'undefined' || !JSON) return;
	if (!Workspace.getActiveId()) return;
	deserializeState(Workspace.loadActive());
}

// History commit helpers — defined here so other files can call them after mutations.
var __historyTimer = null;

function commitHistory() {
	if (__historyTimer) {
		clearTimeout(__historyTimer);
		__historyTimer = null;
	}
	saveBackup();
	History.push(snapshotJSON());
}

function commitHistoryDebounced() {
	if (__historyTimer) clearTimeout(__historyTimer);
	saveBackup(); // persist data immediately; only history push is debounced
	__historyTimer = setTimeout(function () {
		History.push(snapshotJSON());
		__historyTimer = null;
	}, 400);
}

function flushHistory() {
	if (__historyTimer) {
		clearTimeout(__historyTimer);
		__historyTimer = null;
		History.push(snapshotJSON());
	}
}

function exportSnapshot() {
	var s = serializeState();
	return {
		format: SAVE_FORMAT,
		createdAt: new Date().toISOString(),
		nodes: s.nodes,
		links: s.links,
	};
}

// Build live-style Node / Link objects from FSM JSON without touching the
// global nodes / links arrays. Used by the algorithm modules that need to
// reuse simulate.js helpers (getOutgoing, epsilonClosure) on a temporary
// graph.
function inflateFSM(obj) {
	var ns = [];
	if (obj.nodes) {
		for (var i = 0; i < obj.nodes.length; i++) {
			var bn = obj.nodes[i];
			var node = new Node(bn.x, bn.y);
			node.isAcceptState = !!bn.isAcceptState;
			node.text = bn.text || '';
			ns.push(node);
		}
	}
	var ls = [];
	if (obj.links) {
		for (var j = 0; j < obj.links.length; j++) {
			var bl = obj.links[j];
			var link = null;
			if (bl.type === 'SelfLink') {
				link = new SelfLink(ns[bl.node]);
				link.anchorAngle = bl.anchorAngle;
				link.text = bl.text || '';
			} else if (bl.type === 'StartLink') {
				link = new StartLink(ns[bl.node]);
				link.deltaX = bl.deltaX;
				link.deltaY = bl.deltaY;
				link.text = bl.text || '';
			} else if (bl.type === 'Link') {
				link = new Link(ns[bl.nodeA], ns[bl.nodeB]);
				link.parallelPart = bl.parallelPart;
				link.perpendicularPart = bl.perpendicularPart;
				link.text = bl.text || '';
				link.lineAngleAdjust = bl.lineAngleAdjust;
			}
			if (link) ls.push(link);
		}
	}
	return { nodes: ns, links: ls };
}

function validateSnapshot(obj) {
	if (!obj || typeof obj !== 'object') return 'not an object';
	if (obj.format !== SAVE_FORMAT) {
		return 'unexpected format ' + JSON.stringify(obj.format);
	}
	if (!Array.isArray(obj.nodes)) return 'nodes must be an array';
	if (!Array.isArray(obj.links)) return 'links must be an array';
	for (var i = 0; i < obj.nodes.length; i++) {
		var n = obj.nodes[i];
		if (typeof n.x !== 'number' || typeof n.y !== 'number') {
			return 'node[' + i + '] missing numeric x/y';
		}
	}
	for (var j = 0; j < obj.links.length; j++) {
		var l = obj.links[j];
		if (l.type !== 'Link' && l.type !== 'SelfLink' && l.type !== 'StartLink') {
			return 'link[' + j + '] unknown type ' + JSON.stringify(l.type);
		}
	}
	return null;
}
