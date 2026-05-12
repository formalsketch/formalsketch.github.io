// Sugiyama-style layered layout. BFS from the start state assigns each node
// a layer index; nodes inside a layer are spaced evenly. Back-edges (target
// layer <= source layer) get a perpendicular bow so they don't cross through
// the source node.

var LAYOUT_MARGIN_X = 110;
var LAYOUT_MARGIN_Y = 80;
var LAYOUT_STEP_X = 170;
var LAYOUT_STEP_Y = 110;

function layout(nodes, links) {
	if (!nodes.length) return;

	var start = -1;
	for (var i = 0; i < links.length; i++) {
		if (links[i] instanceof StartLink) {
			var idx = nodes.indexOf(links[i].node);
			if (idx !== -1) {
				start = idx;
				break;
			}
		}
	}
	if (start === -1) start = 0;

	var layer = new Array(nodes.length);
	for (var z = 0; z < nodes.length; z++) layer[z] = -1;
	layer[start] = 0;
	var queue = [start];
	while (queue.length) {
		var u = queue.shift();
		var outs = getOutgoing(u, nodes, links);
		for (var k = 0; k < outs.length; k++) {
			if (layer[outs[k].target] === -1) {
				layer[outs[k].target] = layer[u] + 1;
				queue.push(outs[k].target);
			}
		}
	}
	// Park unreachable nodes one layer past the farthest reachable one.
	var maxL = 0;
	for (var n = 0; n < nodes.length; n++) {
		if (layer[n] > maxL) maxL = layer[n];
	}
	for (var n = 0; n < nodes.length; n++) {
		if (layer[n] === -1) layer[n] = maxL + 1;
	}

	var byLayer = {};
	for (var i = 0; i < nodes.length; i++) {
		if (!byLayer[layer[i]]) byLayer[layer[i]] = [];
		byLayer[layer[i]].push(i);
	}
	var layerKeys = Object.keys(byLayer)
		.map(Number)
		.sort(function (a, b) {
			return a - b;
		});

	for (var l = 0; l < layerKeys.length; l++) {
		var members = byLayer[layerKeys[l]];
		var rowHeight = (members.length - 1) * LAYOUT_STEP_Y;
		// Centre each layer's column vertically around the canvas mid line.
		var yOffset = 240 - rowHeight / 2;
		for (var m = 0; m < members.length; m++) {
			nodes[members[m]].x = LAYOUT_MARGIN_X + l * LAYOUT_STEP_X;
			nodes[members[m]].y = LAYOUT_MARGIN_Y + yOffset + m * LAYOUT_STEP_Y;
		}
	}

	for (var li = 0; li < links.length; li++) {
		var lk = links[li];
		if (!(lk instanceof Link)) continue;
		var a = nodes.indexOf(lk.nodeA);
		var b = nodes.indexOf(lk.nodeB);
		if (a === -1 || b === -1) continue;
		if (layer[b] <= layer[a] && b !== a) {
			// back-edge: bow upward so the arrow stays clear of the row.
			lk.perpendicularPart = -50;
			lk.parallelPart = 0.5;
			lk.lineAngleAdjust = 0;
		} else {
			lk.perpendicularPart = 0;
			lk.parallelPart = 0.5;
			lk.lineAngleAdjust = 0;
		}
	}

	for (var sl = 0; sl < links.length; sl++) {
		var L = links[sl];
		if (L instanceof StartLink) {
			L.deltaX = -50;
			L.deltaY = 0;
		} else if (L instanceof SelfLink) {
			L.anchorAngle = -Math.PI / 2;
		}
	}
}
