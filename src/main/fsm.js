// from upstream PR #39: expanded shortcut table covering ops, set theory, logic,
// arrows. Kept as a category-grouped list so ui.js can render the help modal
// straight from it without a second copy.
var LATEX_SHORTCUTS = [
	{
		name: 'Greek (lowercase)',
		entries: [
			['\\alpha', 'α'],
			['\\beta', 'β'],
			['\\gamma', 'γ'],
			['\\delta', 'δ'],
			['\\epsilon', 'ε'],
			['\\zeta', 'ζ'],
			['\\eta', 'η'],
			['\\theta', 'θ'],
			['\\iota', 'ι'],
			['\\kappa', 'κ'],
			['\\lambda', 'λ'],
			['\\mu', 'μ'],
			['\\nu', 'ν'],
			['\\xi', 'ξ'],
			['\\omicron', 'ο'],
			['\\pi', 'π'],
			['\\rho', 'ρ'],
			['\\sigma', 'σ'],
			['\\tau', 'τ'],
			['\\upsilon', 'υ'],
			['\\phi', 'φ'],
			['\\chi', 'χ'],
			['\\psi', 'ψ'],
			['\\omega', 'ω'],
		],
	},
	{
		name: 'Greek (uppercase)',
		entries: [
			['\\Alpha', 'Α'],
			['\\Beta', 'Β'],
			['\\Gamma', 'Γ'],
			['\\Delta', 'Δ'],
			['\\Epsilon', 'Ε'],
			['\\Zeta', 'Ζ'],
			['\\Eta', 'Η'],
			['\\Theta', 'Θ'],
			['\\Iota', 'Ι'],
			['\\Kappa', 'Κ'],
			['\\Lambda', 'Λ'],
			['\\Mu', 'Μ'],
			['\\Nu', 'Ν'],
			['\\Xi', 'Ξ'],
			['\\Omicron', 'Ο'],
			['\\Pi', 'Π'],
			['\\Rho', 'Ρ'],
			['\\Sigma', 'Σ'],
			['\\Tau', 'Τ'],
			['\\Upsilon', 'Υ'],
			['\\Phi', 'Φ'],
			['\\Chi', 'Χ'],
			['\\Psi', 'Ψ'],
			['\\Omega', 'Ω'],
		],
	},
	{
		name: 'Operators',
		entries: [
			['\\times', '×'],
			['\\div', '÷'],
			['\\pm', '±'],
			['\\leq', '≤'],
			['\\le', '≤'],
			['\\geq', '≥'],
			['\\ge', '≥'],
			['\\neq', '≠'],
			['\\ne', '≠'],
			['\\approx', '≈'],
			['\\infty', '∞'],
			['\\sum', '∑'],
			['\\prod', '∏'],
			['\\int', '∫'],
			['\\cdot', '·'],
		],
	},
	{
		name: 'Set theory',
		entries: [
			['\\cup', '∪'],
			['\\cap', '∩'],
			['\\subseteq', '⊆'],
			['\\subset', '⊂'],
			['\\supseteq', '⊇'],
			['\\supset', '⊃'],
			['\\notin', '∉'],
			['\\in', '∈'],
			['\\emptyset', '∅'],
		],
	},
	{
		name: 'Logic',
		entries: [
			['\\land', '∧'],
			['\\lor', '∨'],
			['\\neg', '¬'],
			['\\forall', '∀'],
			['\\exists', '∃'],
			['\\Rightarrow', '⇒'],
			['\\Leftrightarrow', '⇔'],
		],
	},
	{
		name: 'Arrows',
		entries: [
			['\\leftrightarrow', '↔'],
			['\\rightarrow', '→'],
			['\\leftarrow', '←'],
			['\\to', '→'],
			['\\gets', '←'],
		],
	},
	{
		name: 'Subscripts',
		entries: [
			['_0', '₀'],
			['_1', '₁'],
			['_2', '₂'],
			['_3', '₃'],
			['_4', '₄'],
			['_5', '₅'],
			['_6', '₆'],
			['_7', '₇'],
			['_8', '₈'],
			['_9', '₉'],
		],
	},
];

// Sort longest-first so \leq beats \le, \rightarrow beats \to, etc.
var LATEX_SHORTCUT_RULES = (function () {
	var flat = [];
	for (var i = 0; i < LATEX_SHORTCUTS.length; i++) {
		var entries = LATEX_SHORTCUTS[i].entries;
		for (var j = 0; j < entries.length; j++) flat.push(entries[j]);
	}
	flat.sort(function (a, b) {
		return b[0].length - a[0].length;
	});
	return flat.map(function (e) {
		var pattern = e[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		return [new RegExp(pattern, 'g'), e[1]];
	});
})();

function convertLatexShortcuts(text) {
	for (var i = 0; i < LATEX_SHORTCUT_RULES.length; i++) {
		text = text.replace(LATEX_SHORTCUT_RULES[i][0], LATEX_SHORTCUT_RULES[i][1]);
	}
	return text;
}

function textToXML(text) {
	text = text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
	var result = '';
	for (var i = 0; i < text.length; i++) {
		var c = text.charCodeAt(i);
		if (c >= 0x20 && c <= 0x7e) {
			result += text[i];
		} else {
			result += '&#' + c + ';';
		}
	}
	return result;
}

function drawArrow(c, x, y, angle) {
	var dx = Math.cos(angle);
	var dy = Math.sin(angle);
	c.beginPath();
	c.moveTo(x, y);
	c.lineTo(x - 8 * dx + 5 * dy, y - 8 * dy - 5 * dx);
	c.lineTo(x - 8 * dx - 5 * dy, y - 8 * dy + 5 * dx);
	c.fill();
}

function canvasHasFocus() {
	var a = document.activeElement || document.body;
	return a === document.body || a === canvas;
}

function drawText(c, originalText, x, y, angleOrNull, isSelected) {
	text = convertLatexShortcuts(originalText);
	c.font = '20px "Times New Roman", serif';
	var width = c.measureText(text).width;

	// center the text
	x -= width / 2;

	// position the text intelligently if given an angle
	if (angleOrNull != null) {
		var cos = Math.cos(angleOrNull);
		var sin = Math.sin(angleOrNull);
		var cornerPointX = (width / 2 + 5) * (cos > 0 ? 1 : -1);
		var cornerPointY = (10 + 5) * (sin > 0 ? 1 : -1);
		var slide =
			sin * Math.pow(Math.abs(sin), 40) * cornerPointX -
			cos * Math.pow(Math.abs(cos), 10) * cornerPointY;
		x += cornerPointX - sin * slide;
		y += cornerPointY + cos * slide;
	}

	// draw text and caret (round the coordinates so the caret falls on a pixel)
	if ('advancedFillText' in c) {
		c.advancedFillText(text, originalText, x + width / 2, y, angleOrNull);
	} else {
		x = Math.round(x);
		y = Math.round(y);
		c.fillText(text, x, y + 6);
		if (isSelected && caretVisible && canvasHasFocus() && document.hasFocus()) {
			x += width;
			c.beginPath();
			c.moveTo(x, y - 10);
			c.lineTo(x, y + 10);
			c.stroke();
		}
	}
}

var caretTimer;
var caretVisible = true;

function resetCaret() {
	clearInterval(caretTimer);
	caretTimer = setInterval('caretVisible = !caretVisible; draw()', 500);
	caretVisible = true;
}

var canvas;
var nodeRadius = 30;
var nodes = [];
var links = [];

var cursorVisible = true;
var snapToPadding = 6; // pixels
var hitTargetPadding = 6; // pixels
var selectedObject = null; // either a Link or a Node
var currentLink = null; // a Link
var movingObject = false;
var originalClick;
// set by ui.js while a simulation panel is active. { active: [stateIdx...], lastLink, accepted, error }
var simulationState = null;

function getDrawColors() {
	try {
		var s = getComputedStyle(document.body);
		var fg = (s.getPropertyValue('--canvas-fg') || '').trim();
		var sel = (s.getPropertyValue('--canvas-selected') || '').trim();
		return { fg: fg || 'black', selected: sel || 'blue' };
	} catch (e) {
		return { fg: 'black', selected: 'blue' };
	}
}

var EXPORT_COLORS = { fg: 'black', selected: 'black' };

function drawUsing(c, colors) {
	colors = colors || getDrawColors();
	c.clearRect(0, 0, canvas.width, canvas.height);
	c.save();
	c.translate(0.5, 0.5);

	for (var i = 0; i < nodes.length; i++) {
		c.lineWidth = 1;
		c.fillStyle = c.strokeStyle =
			nodes[i] == selectedObject ? colors.selected : colors.fg;
		nodes[i].draw(c);
	}
	for (var i = 0; i < links.length; i++) {
		c.lineWidth = 1;
		c.fillStyle = c.strokeStyle =
			links[i] == selectedObject ? colors.selected : colors.fg;
		links[i].draw(c);
	}
	if (currentLink != null) {
		c.lineWidth = 1;
		c.fillStyle = c.strokeStyle = colors.fg;
		currentLink.draw(c);
	}

	c.restore();
}

function draw() {
	drawUsing(canvas.getContext('2d'));
	drawSimulationOverlay();
	saveBackup();
}

function drawSimulationOverlay() {
	if (!simulationState) return;
	var c = canvas.getContext('2d');
	c.save();
	c.translate(0.5, 0.5);
	c.lineWidth = 3;
	c.strokeStyle = simulationState.accepted
		? '#2ca44b'
		: simulationState.error
			? '#c0392b'
			: '#2c7be5';
	var active = simulationState.active || [];
	for (var i = 0; i < active.length; i++) {
		var n = nodes[active[i]];
		if (!n) continue;
		c.beginPath();
		c.arc(n.x, n.y, nodeRadius + 5, 0, 2 * Math.PI);
		c.stroke();
	}
	if (simulationState.lastLink) {
		c.lineWidth = 4;
		c.strokeStyle = '#f0a500';
		c.fillStyle = '#f0a500';
		simulationState.lastLink.draw(c);
	}
	c.restore();
}

function selectObject(x, y) {
	for (var i = 0; i < nodes.length; i++) {
		if (nodes[i].containsPoint(x, y)) {
			return nodes[i];
		}
	}
	for (var i = 0; i < links.length; i++) {
		if (links[i].containsPoint(x, y)) {
			return links[i];
		}
	}
	return null;
}

function snapNode(node) {
	for (var i = 0; i < nodes.length; i++) {
		if (nodes[i] == node) continue;

		if (Math.abs(node.x - nodes[i].x) < snapToPadding) {
			node.x = nodes[i].x;
		}

		if (Math.abs(node.y - nodes[i].y) < snapToPadding) {
			node.y = nodes[i].y;
		}
	}
}

window.onload = function () {
	canvas = document.getElementById('canvas');

	if (typeof Theme !== 'undefined') Theme.init();
	Workspace.init();
	restoreBackup();
	if (typeof maybeLoadFromHash === 'function') maybeLoadFromHash();
	History.reset(snapshotJSON());

	if (typeof wireUI === 'function') wireUI();

	draw();

	canvas.onmousedown = function (e) {
		var mouse = crossBrowserRelativeMousePos(e);
		flushHistory();
		selectedObject = selectObject(mouse.x, mouse.y);
		movingObject = false;
		originalClick = mouse;

		if (selectedObject != null) {
			if (shift && selectedObject instanceof Node) {
				currentLink = new SelfLink(selectedObject, mouse);
			} else {
				movingObject = true;
				deltaMouseX = deltaMouseY = 0;
				if (selectedObject.setMouseStart) {
					selectedObject.setMouseStart(mouse.x, mouse.y);
				}
			}
			resetCaret();
		} else if (shift) {
			currentLink = new TemporaryLink(mouse, mouse);
		}

		draw();

		if (canvasHasFocus()) {
			// disable drag-and-drop only if the canvas is already focused
			return false;
		} else {
			// otherwise, let the browser switch the focus away from wherever it was
			resetCaret();
			return true;
		}
	};

	canvas.ondblclick = function (e) {
		var mouse = crossBrowserRelativeMousePos(e);
		flushHistory();
		selectedObject = selectObject(mouse.x, mouse.y);

		if (selectedObject == null) {
			selectedObject = new Node(mouse.x, mouse.y);
			nodes.push(selectedObject);
			resetCaret();
			draw();
			commitHistory();
		} else if (selectedObject instanceof Node) {
			selectedObject.isAcceptState = !selectedObject.isAcceptState;
			draw();
			commitHistory();
		}
	};

	canvas.onmousemove = function (e) {
		var mouse = crossBrowserRelativeMousePos(e);

		if (currentLink != null) {
			var targetNode = selectObject(mouse.x, mouse.y);
			if (!(targetNode instanceof Node)) {
				targetNode = null;
			}

			if (selectedObject == null) {
				if (targetNode != null) {
					currentLink = new StartLink(targetNode, originalClick);
				} else {
					currentLink = new TemporaryLink(originalClick, mouse);
				}
			} else {
				if (targetNode == selectedObject) {
					currentLink = new SelfLink(selectedObject, mouse);
				} else if (targetNode != null) {
					currentLink = new Link(selectedObject, targetNode);
				} else {
					currentLink = new TemporaryLink(
						selectedObject.closestPointOnCircle(mouse.x, mouse.y),
						mouse,
					);
				}
			}
			draw();
		}

		if (movingObject) {
			selectedObject.setAnchorPoint(mouse.x, mouse.y);
			if (selectedObject instanceof Node) {
				snapNode(selectedObject);
			}
			draw();
		}
	};

	canvas.onmouseup = function (e) {
		var didChange = movingObject;
		movingObject = false;

		if (currentLink != null) {
			if (!(currentLink instanceof TemporaryLink)) {
				selectedObject = currentLink;
				links.push(currentLink);
				resetCaret();
				didChange = true;
			}
			currentLink = null;
			draw();
		}

		if (didChange) commitHistory();
	};

	// from upstream PR #44: touch -> mouse adapter. Single finger only; multi-touch
	// falls through to the browser (pinch-zoom etc). preventDefault stops the
	// 300ms ghost-click and page scrolling during canvas interaction.
	function touchPos(t) {
		return { clientX: t.clientX, clientY: t.clientY };
	}

	canvas.addEventListener(
		'touchstart',
		function (e) {
			if (e.touches.length !== 1) return;
			e.preventDefault();
			var t = e.touches[0];
			var now = Date.now();
			if (
				lastTap &&
				now - lastTap.t < 300 &&
				Math.abs(t.clientX - lastTap.x) < 30 &&
				Math.abs(t.clientY - lastTap.y) < 30
			) {
				lastTap = null;
				canvas.ondblclick(touchPos(t));
				return;
			}
			lastTap = { t: now, x: t.clientX, y: t.clientY };
			if (touchArrowMode) shift = true;
			canvas.onmousedown(touchPos(t));
		},
		{ passive: false },
	);

	canvas.addEventListener(
		'touchmove',
		function (e) {
			if (e.touches.length !== 1) return;
			e.preventDefault();
			canvas.onmousemove(touchPos(e.touches[0]));
		},
		{ passive: false },
	);

	canvas.addEventListener('touchend', function (e) {
		var t = e.changedTouches && e.changedTouches[0];
		if (t) canvas.onmouseup(touchPos(t));
		if (touchArrowMode) shift = false;
	});
};

var shift = false;
// from upstream PR #44: touch has no shift key, so a UI toggle promotes single-finger
// drag from "move" to "create arrow". Set by the arrow-mode button in ui.js.
var touchArrowMode = false;
var lastTap = null;
// Keyboard-only "link mode": L starts it from the selected node, Tab cycles
// through candidate targets, Enter confirms, Escape cancels.
var linkMode = false;

function selectionOrder() {
	var ns = nodes.slice().sort(function (a, b) {
		return (a.text || '').localeCompare(b.text || '');
	});
	var ls = links
		.slice()
		.filter(function (l) {
			return l instanceof Link || l instanceof SelfLink || l instanceof StartLink;
		})
		.sort(function (a, b) {
			return (a.text || '').localeCompare(b.text || '');
		});
	return ns.concat(ls);
}

function cycleSelection(direction) {
	var order = selectionOrder();
	if (!order.length) return;
	var idx = order.indexOf(selectedObject);
	if (idx === -1) idx = direction > 0 ? -1 : 0;
	idx = (idx + (direction > 0 ? 1 : -1) + order.length) % order.length;
	selectedObject = order[idx];
	resetCaret();
	draw();
}

function nodesSortedByLabel() {
	return nodes.slice().sort(function (a, b) {
		return (a.text || '').localeCompare(b.text || '');
	});
}

function startKeyboardLink() {
	if (!(selectedObject instanceof Node)) return;
	var from = selectedObject;
	var others = nodes.filter(function (n) {
		return n !== from;
	});
	if (others.length) {
		var sorted = others.sort(function (a, b) {
			return (a.text || '').localeCompare(b.text || '');
		});
		currentLink = new Link(from, sorted[0]);
	} else {
		currentLink = new SelfLink(from, { x: from.x, y: from.y - 60 });
	}
	linkMode = true;
	draw();
}

function cycleKeyboardLinkTarget(direction) {
	if (!linkMode || !currentLink) return;
	var from = selectedObject;
	var sorted = nodesSortedByLabel();
	var current;
	if (currentLink instanceof Link) current = currentLink.nodeB;
	else if (currentLink instanceof SelfLink) current = currentLink.node;
	var idx = sorted.indexOf(current);
	idx = (idx + (direction > 0 ? 1 : -1) + sorted.length) % sorted.length;
	var target = sorted[idx];
	if (target === from) {
		currentLink = new SelfLink(from, { x: from.x, y: from.y - 60 });
	} else {
		currentLink = new Link(from, target);
	}
	draw();
}

function confirmKeyboardLink() {
	if (!linkMode || !currentLink) return;
	flushHistory();
	links.push(currentLink);
	selectedObject = currentLink;
	currentLink = null;
	linkMode = false;
	commitHistory();
	draw();
}

function cancelKeyboardLink() {
	linkMode = false;
	currentLink = null;
	draw();
}

function createNodeAtCenter() {
	flushHistory();
	var node = new Node(canvas.width / 2, canvas.height / 2);
	nodes.push(node);
	selectedObject = node;
	resetCaret();
	draw();
	commitHistory();
}

function nudgeSelected(dx, dy) {
	if (!(selectedObject instanceof Node)) return;
	selectedObject.x += dx;
	selectedObject.y += dy;
	draw();
	commitHistoryDebounced();
}

function deleteSelected() {
	if (selectedObject == null) return;
	flushHistory();
	for (var i = 0; i < nodes.length; i++) {
		if (nodes[i] == selectedObject) {
			nodes.splice(i--, 1);
		}
	}
	for (var i = 0; i < links.length; i++) {
		if (
			links[i] == selectedObject ||
			links[i].node == selectedObject ||
			links[i].nodeA == selectedObject ||
			links[i].nodeB == selectedObject
		) {
			links.splice(i--, 1);
		}
	}
	selectedObject = null;
	commitHistory();
	draw();
}

function clearAll() {
	if (nodes.length === 0 && links.length === 0) return;
	if (!confirm('Clear all states and arrows in this FSM?')) return;
	flushHistory();
	nodes.length = 0;
	links.length = 0;
	selectedObject = null;
	commitHistory();
	draw();
}

function performUndo() {
	flushHistory();
	var snap = History.undo();
	if (snap == null) return;
	loadSnapshotJSON(snap);
	saveBackup();
	draw();
}

function performRedo() {
	flushHistory();
	var snap = History.redo();
	if (snap == null) return;
	loadSnapshotJSON(snap);
	saveBackup();
	draw();
}

function isEditableTarget(target) {
	if (!target) return false;
	var tag = target.tagName;
	if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable)
		return true;
	return false;
}

document.onkeydown = function (e) {
	var key = crossBrowserKey(e);
	var meta = e.metaKey || e.ctrlKey;
	var target = e.target || e.srcElement;

	// Global shortcuts (work regardless of focus, except in editable fields).
	if (meta && !isEditableTarget(target)) {
		if (key === 90 || key === 122) {
			// Z / z
			if (e.shiftKey) performRedo();
			else performUndo();
			e.preventDefault();
			return false;
		}
		if (key === 89 || key === 121) {
			// Y / y
			performRedo();
			e.preventDefault();
			return false;
		}
	}

	if (key == 16) {
		shift = true;
	} else if (!canvasHasFocus()) {
		// don't read keystrokes when other things have focus
		return true;
	} else if (key === 9) {
		// Tab: cycle selection, or cycle the link target while in link mode.
		e.preventDefault();
		if (linkMode) cycleKeyboardLinkTarget(e.shiftKey ? -1 : 1);
		else cycleSelection(e.shiftKey ? -1 : 1);
		return false;
	} else if (key === 27) {
		// Escape
		if (linkMode) cancelKeyboardLink();
		else {
			selectedObject = null;
			draw();
		}
		e.preventDefault();
		return false;
	} else if (key === 13) {
		// Enter: confirm a keyboard-built link, otherwise no-op.
		if (linkMode) {
			confirmKeyboardLink();
			e.preventDefault();
			return false;
		}
	} else if (key >= 37 && key <= 40 && !meta) {
		// Arrows nudge the selected node. Shift -> 1px, otherwise 5px.
		var step = e.shiftKey ? 1 : 5;
		var dx = 0,
			dy = 0;
		if (key === 37) dx = -step;
		else if (key === 39) dx = step;
		else if (key === 38) dy = -step;
		else dy = step;
		nudgeSelected(dx, dy);
		e.preventDefault();
		return false;
	} else if (key === 78 && !meta && !e.shiftKey && !e.altKey && selectedObject == null) {
		// N: create a state at viewport center. Only fires when no element is
		// selected so it doesn't fight typing 'n' into a label.
		createNodeAtCenter();
		e.preventDefault();
		return false;
	} else if (key === 76 && !meta && !e.shiftKey && !e.altKey && selectedObject instanceof Node) {
		// L: start a keyboard-driven link from the selected node.
		startKeyboardLink();
		e.preventDefault();
		return false;
	} else if (key == 8) {
		// from upstream PR #25: bare backspace on an empty-label selection deletes
		// the element. PR #25's keydown had two backspace branches and the second
		// was unreachable; keep this as one branch driven by whether text is empty.
		if (meta || (selectedObject != null && !selectedObject.text)) {
			deleteSelected();
		} else if (selectedObject != null) {
			selectedObject.text = selectedObject.text.substr(
				0,
				selectedObject.text.length - 1,
			);
			resetCaret();
			draw();
			commitHistoryDebounced();
		}

		// suppress the browser back-nav default regardless of which branch ran
		return false;
	} else if (key == 46) {
		// delete key
		deleteSelected();
	}
};

document.onkeyup = function (e) {
	var key = crossBrowserKey(e);

	if (key == 16) {
		shift = false;
	}
};

document.onkeypress = function (e) {
	// don't read keystrokes when other things have focus
	var key = crossBrowserKey(e);
	if (!canvasHasFocus()) {
		// don't read keystrokes when other things have focus
		return true;
	} else if (
		key >= 0x20 &&
		key <= 0x7e &&
		!e.metaKey &&
		!e.altKey &&
		!e.ctrlKey &&
		selectedObject != null &&
		'text' in selectedObject
	) {
		selectedObject.text += String.fromCharCode(key);
		resetCaret();
		draw();
		commitHistoryDebounced();

		// don't let keys do their actions (like space scrolls down the page)
		return false;
	} else if (key == 8) {
		// backspace is a shortcut for the back button, but do NOT want to change pages
		return false;
	}
};

function crossBrowserKey(e) {
	e = e || window.event;
	return e.which || e.keyCode;
}

function crossBrowserRelativeMousePos(e) {
	// from upstream PR #44: use getBoundingClientRect so coords stay correct when
	// the canvas is CSS-scaled (width:100%, responsive layout, mobile zoom).
	var rect = canvas.getBoundingClientRect();
	var sx = rect.width ? canvas.width / rect.width : 1;
	var sy = rect.height ? canvas.height / rect.height : 1;
	return {
		x: (e.clientX - rect.left) * sx,
		y: (e.clientY - rect.top) * sy,
	};
}

function saveAsPNG() {
	// from upstream PR #34: route via downloadDataURL so Chromium fires the save dialog
	// instead of navigating to the data: URL (which the old `location.href = pngData` did).
	var prev = selectedObject;
	selectedObject = null;
	drawUsing(canvas.getContext('2d'), EXPORT_COLORS);
	selectedObject = prev;
	var pngData = canvas.toDataURL('image/png');
	draw();
	var ok = downloadDataURL(activeFSMFileName('png'), pngData);
	if (ok) showToast('PNG downloaded');
	else showToast('Could not download PNG', 'error');
}

function saveAsSVG() {
	var exporter = new ExportAsSVG();
	var oldSelectedObject = selectedObject;
	selectedObject = null;
	drawUsing(exporter, EXPORT_COLORS);
	selectedObject = oldSelectedObject;
	var svgData = exporter.toSVG();
	var ok = downloadBlob(
		activeFSMFileName('svg'),
		svgData,
		'image/svg+xml;charset=utf-8',
	);
	if (ok) showToast('SVG downloaded');
	else showToast('Could not download SVG', 'error');
}

function saveAsLaTeX() {
	var exporter = new ExportAsLaTeX();
	var oldSelectedObject = selectedObject;
	selectedObject = null;
	drawUsing(exporter, EXPORT_COLORS);
	selectedObject = oldSelectedObject;
	// from upstream PR #23: read the user's standalone-vs-snippet preference
	// at export time so changes take effect without a reload.
	var modeEl = document.getElementById('latex-mode');
	var mode = modeEl ? modeEl.value : 'standalone';
	var texData = exporter.toLaTeX(mode);
	Promise.resolve(copyToClipboard(texData)).then(function (ok) {
		if (ok) showToast('LaTeX copied to clipboard');
		else showToast('Could not copy - clipboard blocked', 'error');
	});
}
