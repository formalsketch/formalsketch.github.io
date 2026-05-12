// UI wiring: sidebar (FSM list), toolbar buttons, keyboard shortcuts beyond editor.
// Called from window.onload in fsm.js after Workspace.init() and History.reset().

function wireUI() {
	var sidebarList = document.getElementById('fsm-list');
	var newBtn = document.getElementById('btn-new-fsm');
	var undoBtn = document.getElementById('btn-undo');
	var redoBtn = document.getElementById('btn-redo');
	var clearBtn = document.getElementById('btn-clear');
	var pngBtn = document.getElementById('btn-png');
	var svgBtn = document.getElementById('btn-svg');
	var latexBtn = document.getElementById('btn-latex');
	var titleEl = document.getElementById('current-fsm-name');
	var themeBtn = document.getElementById('btn-theme');
	var shortcutsBtn = document.getElementById('btn-shortcuts');
	var shortcutsModal = document.getElementById('shortcuts-modal');
	var shortcutsClose = document.getElementById('btn-close-shortcuts');
	var shortcutsBody = document.getElementById('shortcuts-body');
	var latexModeSelect = document.getElementById('latex-mode');
	var arrowModeBtn = document.getElementById('btn-arrow-mode');
	var simBtn = document.getElementById('btn-simulate');
	var simPanel = document.getElementById('sim-panel');
	var simInput = document.getElementById('sim-input');
	var simRun = document.getElementById('sim-run');
	var simStep = document.getElementById('sim-step');
	var simReset = document.getElementById('sim-reset');
	var simStatus = document.getElementById('sim-status');

	function switchToFsm(id) {
		if (id === Workspace.getActiveId()) return;
		flushHistory();
		saveBackup();
		Workspace.switchTo(id);
		restoreBackup();
		History.reset(snapshotJSON());
		draw();
		updateTitle();
	}

	function promptRename(fsm) {
		var newName = prompt('Rename FSM:', fsm.name);
		if (newName == null) return;
		newName = newName.trim();
		if (!newName) return;
		Workspace.rename(fsm.id, newName);
		updateTitle();
	}

	function deleteFsm(fsm) {
		if (!confirm('Delete "' + fsm.name + '"? This cannot be undone.')) return;
		var wasActive = fsm.id === Workspace.getActiveId();
		Workspace.remove(fsm.id);
		if (wasActive) {
			restoreBackup();
			History.reset(snapshotJSON());
			draw();
		}
		updateTitle();
	}

	function renderSidebar() {
		var fsms = Workspace.list();
		var activeId = Workspace.getActiveId();

		// rebuild list
		while (sidebarList.firstChild)
			sidebarList.removeChild(sidebarList.firstChild);

		fsms.forEach(function (fsm) {
			var li = document.createElement('li');
			li.className = fsm.id === activeId ? 'active' : '';

			var name = document.createElement('span');
			name.className = 'name';
			name.textContent = fsm.name;
			name.title = fsm.name;
			name.onclick = function () {
				switchToFsm(fsm.id);
			};
			name.ondblclick = function (e) {
				e.stopPropagation();
				promptRename(fsm);
			};

			var renameBtn = document.createElement('button');
			renameBtn.className = 'icon';
			renameBtn.title = 'Rename';
			renameBtn.textContent = '✎'; // pencil
			renameBtn.onclick = function (e) {
				e.stopPropagation();
				promptRename(fsm);
			};

			var delBtn = document.createElement('button');
			delBtn.className = 'icon';
			delBtn.title = 'Delete';
			delBtn.textContent = '×'; // ×
			delBtn.onclick = function (e) {
				e.stopPropagation();
				deleteFsm(fsm);
			};

			li.appendChild(name);
			li.appendChild(renameBtn);
			li.appendChild(delBtn);
			sidebarList.appendChild(li);
		});
	}

	function updateTitle() {
		var active = Workspace.getActive();
		if (titleEl && active) titleEl.textContent = active.name;
	}

	function updateToolbar() {
		undoBtn.disabled = !History.canUndo();
		redoBtn.disabled = !History.canRedo();
	}

	newBtn.onclick = function () {
		flushHistory();
		saveBackup();
		var id = Workspace.create();
		Workspace.switchTo(id);
		restoreBackup();
		History.reset(snapshotJSON());
		draw();
		updateTitle();
	};

	undoBtn.onclick = function () {
		performUndo();
	};
	redoBtn.onclick = function () {
		performRedo();
	};
	clearBtn.onclick = function () {
		clearAll();
	};

	function bindExport(btn, fn) {
		if (!btn) return;
		btn.onclick = function (e) {
			e.preventDefault();
			fn();
		};
	}
	bindExport(pngBtn, saveAsPNG);
	bindExport(svgBtn, saveAsSVG);
	bindExport(latexBtn, saveAsLaTeX);

	function updateThemeButton() {
		if (!themeBtn) return;
		var mode = Theme.get();
		var label =
			mode === 'system' ? 'Auto' : mode === 'light' ? 'Light' : 'Dark';
		var icon = mode === 'system' ? '◐' : mode === 'light' ? '☀' : '☾';
		themeBtn.textContent = icon + ' ' + label;
		themeBtn.setAttribute(
			'aria-label',
			'Theme: ' + label + ' (click to change)',
		);
		themeBtn.title = 'Theme: ' + label + ' (click to cycle)';
	}

	if (themeBtn && typeof Theme !== 'undefined') {
		themeBtn.onclick = function () {
			Theme.cycle();
		};
		Theme.onChange(function () {
			updateThemeButton();
			draw(); // re-render canvas with new theme colors
		});
		updateThemeButton();
	}

	Workspace.onChange(function () {
		renderSidebar();
		updateTitle();
	});
	History.onChange(updateToolbar);

	// from upstream PR #39: shortcuts help modal, populated lazily from
	// LATEX_SHORTCUTS so the table stays the single source of truth. On mobile
	// the inline help block is hidden, so we also list canvas gestures here.
	function populateShortcuts() {
		if (!shortcutsBody || shortcutsBody.firstChild) return;

		var gestures = document.createElement('div');
		gestures.className = 'shortcut-cat';
		var gh = document.createElement('h3');
		gh.textContent = 'Canvas';
		gestures.appendChild(gh);
		var glist = document.createElement('ul');
		glist.style.margin = '0';
		glist.style.paddingLeft = '18px';
		var tips = [
			['Add a state', 'double-click empty canvas (or double-tap on touch)'],
			['Add an arrow', 'shift-drag, or use the arrow-mode toggle on touch'],
			['Move', 'drag any state or arrow'],
			['Delete', 'select then press Delete, or backspace when label is empty'],
			['Accept state', 'double-click an existing state'],
			['Undo / Redo', 'Cmd/Ctrl+Z and Shift+Cmd/Ctrl+Z'],
		];
		for (var g = 0; g < tips.length; g++) {
			var li = document.createElement('li');
			li.style.fontSize = '13px';
			li.style.margin = '4px 0';
			var b = document.createElement('b');
			b.textContent = tips[g][0] + ': ';
			li.appendChild(b);
			li.appendChild(document.createTextNode(tips[g][1]));
			glist.appendChild(li);
		}
		gestures.appendChild(glist);
		shortcutsBody.appendChild(gestures);

		for (var i = 0; i < LATEX_SHORTCUTS.length; i++) {
			var cat = LATEX_SHORTCUTS[i];
			var section = document.createElement('div');
			section.className = 'shortcut-cat';
			var h = document.createElement('h3');
			h.textContent = cat.name;
			section.appendChild(h);
			var grid = document.createElement('div');
			grid.className = 'shortcut-grid';
			for (var j = 0; j < cat.entries.length; j++) {
				var row = document.createElement('div');
				var kbd = document.createElement('kbd');
				kbd.textContent = cat.entries[j][0];
				row.appendChild(kbd);
				row.appendChild(document.createTextNode(cat.entries[j][1]));
				grid.appendChild(row);
			}
			section.appendChild(grid);
			shortcutsBody.appendChild(section);
		}
	}

	function openShortcuts() {
		if (!shortcutsModal) return;
		populateShortcuts();
		shortcutsModal.hidden = false;
		// focus the close button so canvasHasFocus() returns false and stray
		// keystrokes do not type into the selected node behind the modal.
		if (shortcutsClose) shortcutsClose.focus();
	}

	function closeShortcuts() {
		if (shortcutsModal) shortcutsModal.hidden = true;
	}

	// from upstream PR #23: persist standalone-vs-snippet choice across reloads
	if (latexModeSelect) {
		var LATEX_MODE_KEY = 'fsm_latex_mode';
		try {
			var saved = localStorage.getItem(LATEX_MODE_KEY);
			if (saved === 'snippet' || saved === 'standalone') {
				latexModeSelect.value = saved;
			}
		} catch (e) {}
		latexModeSelect.onchange = function () {
			try {
				localStorage.setItem(LATEX_MODE_KEY, latexModeSelect.value);
			} catch (e) {}
		};
	}

	// from upstream PR #44: touch arrow-mode toggle. Single-finger drag normally
	// moves; with arrow mode on, the touch handlers fake shift so it creates a link.
	if (arrowModeBtn) {
		arrowModeBtn.onclick = function () {
			touchArrowMode = !touchArrowMode;
			arrowModeBtn.classList.toggle('on', touchArrowMode);
			arrowModeBtn.setAttribute(
				'aria-pressed',
				touchArrowMode ? 'true' : 'false',
			);
			arrowModeBtn.textContent = touchArrowMode ? 'Arrow: on' : 'Arrow: off';
		};
	}

	// Simulation panel. Read-only over the current diagram; bypasses History.
	var stepIndex = 0;
	function setSimStatus(text, kind) {
		if (!simStatus) return;
		simStatus.textContent = text || '';
		simStatus.className = 'sim-status' + (kind ? ' ' + kind : '');
	}
	function resetSim() {
		stepIndex = 0;
		simulationState = null;
		setSimStatus('');
		draw();
	}
	function runSim() {
		var result = simulate(nodes, links, simInput ? simInput.value : '');
		var last = result.path.length ? result.path[result.path.length - 1] : [];
		simulationState = {
			active: last,
			lastLink: null,
			accepted: result.accepted,
			error: result.error || null,
		};
		if (result.error) {
			setSimStatus(result.error, 'reject');
		} else {
			setSimStatus(result.accepted ? 'Accepted' : 'Rejected',
				result.accepted ? 'accept' : 'reject');
		}
		stepIndex = result.path.length;
		draw();
	}
	function stepSim() {
		var input = simInput ? simInput.value : '';
		if (stepIndex === 0 || !simulationState) {
			var starts = getStartStates(nodes, links);
			if (starts.length !== 1) {
				simulationState = { active: [], lastLink: null, accepted: false, error: starts.length === 0 ? 'no start state' : 'multiple start states' };
				setSimStatus(simulationState.error, 'reject');
				draw();
				return;
			}
			simulationState = {
				active: epsilonClosure([starts[0]], nodes, links),
				lastLink: null,
				accepted: false,
				error: null,
			};
			stepIndex = 0;
			setSimStatus('step 0 of ' + input.length);
			draw();
			return;
		}
		if (stepIndex >= input.length) {
			var accepted = false;
			for (var i = 0; i < simulationState.active.length; i++) {
				var n = nodes[simulationState.active[i]];
				if (n && n.isAcceptState) accepted = true;
			}
			simulationState.accepted = accepted;
			setSimStatus(accepted ? 'Accepted' : 'Rejected', accepted ? 'accept' : 'reject');
			draw();
			return;
		}
		var sym = input.charAt(stepIndex);
		var step = simulateStep(simulationState.active, sym, nodes, links);
		if (step.states.length === 0) {
			simulationState.error = 'no transition for ' + JSON.stringify(sym) + ' at step ' + (stepIndex + 1);
			setSimStatus(simulationState.error, 'reject');
			draw();
			return;
		}
		simulationState.active = step.states;
		simulationState.lastLink = step.links[0] || null;
		stepIndex++;
		setSimStatus('step ' + stepIndex + ' of ' + input.length + ' (on ' + JSON.stringify(sym) + ')');
		draw();
		// fade the transition highlight after a moment
		setTimeout(function () {
			if (simulationState) {
				simulationState.lastLink = null;
				draw();
			}
		}, 350);
	}

	if (simBtn && simPanel) {
		simBtn.onclick = function () {
			simPanel.hidden = !simPanel.hidden;
			if (simPanel.hidden) resetSim();
			else if (simInput) simInput.focus();
		};
	}
	if (simRun) simRun.onclick = runSim;
	if (simStep) simStep.onclick = stepSim;
	if (simReset) simReset.onclick = resetSim;
	if (simInput) {
		simInput.onkeydown = function (e) {
			if (e.key === 'Enter') {
				e.preventDefault();
				runSim();
			}
		};
	}

	if (shortcutsBtn) shortcutsBtn.onclick = openShortcuts;
	if (shortcutsClose) shortcutsClose.onclick = closeShortcuts;
	if (shortcutsModal) {
		shortcutsModal.onclick = function (e) {
			if (e.target === shortcutsModal) closeShortcuts();
		};
	}
	document.addEventListener('keydown', function (e) {
		if (
			e.key === 'Escape' &&
			shortcutsModal &&
			shortcutsModal.hidden === false
		) {
			closeShortcuts();
		}
	});

	// from upstream PR #44: keep the canvas in sync with its parent on orientation
	// change / window resize. Drawing buffer stays 800x600; the CSS aspect-ratio
	// handles visual scaling, this just forces a repaint so theme transitions and
	// any in-flight selection redraw cleanly.
	if (typeof ResizeObserver !== 'undefined') {
		var wrap = document.querySelector('.canvas-wrap');
		if (wrap) {
			new ResizeObserver(function () {
				draw();
			}).observe(wrap);
		}
	}

	renderSidebar();
	updateTitle();
	updateToolbar();
}
