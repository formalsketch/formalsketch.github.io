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
	var lintBtn = document.getElementById('btn-lint');
	var lintModal = document.getElementById('lint-modal');
	var lintClose = document.getElementById('btn-close-lint');
	var lintBody = document.getElementById('lint-body');
	var lintPrefs = document.getElementById('lint-prefs');
	var shareBtn = document.getElementById('btn-share');
	var importBtn = document.getElementById('btn-import');
	var importFile = document.getElementById('import-file');
	var exportJSONBtn = document.getElementById('btn-export-json');
	var layoutBtn = document.getElementById('btn-layout');
	var regexBtn = document.getElementById('btn-regex');
	var regexModal = document.getElementById('regex-modal');
	var regexClose = document.getElementById('btn-close-regex');
	var regexInput = document.getElementById('regex-input');
	var regexError = document.getElementById('regex-error');
	var regexPreview = document.getElementById('regex-preview');
	var regexInsertBtn = document.getElementById('regex-insert');
	var regexReplaceBtn = document.getElementById('regex-replace');
	var toDFABtn = document.getElementById('btn-to-dfa');
	var minimizeBtn = document.getElementById('btn-minimize');
	var nlBtn = document.getElementById('btn-nl');
	var nlModal = document.getElementById('nl-modal');
	var nlClose = document.getElementById('btn-close-nl');
	var nlKeyInput = document.getElementById('nl-key');
	var nlKeySave = document.getElementById('nl-key-save');
	var nlDesc = document.getElementById('nl-desc');
	var nlGenerateBtn = document.getElementById('nl-generate');
	var nlDescribeBtn = document.getElementById('nl-describe');
	var nlResponse = document.getElementById('nl-response');
	var examplesSelect = document.getElementById('examples-select');

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

	var summaryEl = document.getElementById('fsm-summary');
	function updateFSMSummary() {
		if (summaryEl) summaryEl.textContent = summarizeFSM(nodes, links);
	}

	Workspace.onChange(function () {
		renderSidebar();
		updateTitle();
		updateLintBadge();
		updateFSMSummary();
	});
	History.onChange(function () {
		updateToolbar();
		updateLintBadge();
		updateFSMSummary();
	});

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
			setSimStatus(
				result.accepted ? 'Accepted' : 'Rejected',
				result.accepted ? 'accept' : 'reject',
			);
		}
		stepIndex = result.path.length;
		draw();
	}
	function stepSim() {
		var input = simInput ? simInput.value : '';
		if (stepIndex === 0 || !simulationState) {
			var starts = getStartStates(nodes, links);
			if (starts.length !== 1) {
				simulationState = {
					active: [],
					lastLink: null,
					accepted: false,
					error:
						starts.length === 0 ? 'no start state' : 'multiple start states',
				};
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
			setSimStatus(
				accepted ? 'Accepted' : 'Rejected',
				accepted ? 'accept' : 'reject',
			);
			draw();
			return;
		}
		var sym = input.charAt(stepIndex);
		var step = simulateStep(simulationState.active, sym, nodes, links);
		if (step.states.length === 0) {
			simulationState.error =
				'no transition for ' +
				JSON.stringify(sym) +
				' at step ' +
				(stepIndex + 1);
			setSimStatus(simulationState.error, 'reject');
			draw();
			return;
		}
		simulationState.active = step.states;
		simulationState.lastLink = step.links[0] || null;
		stepIndex++;
		setSimStatus(
			'step ' +
				stepIndex +
				' of ' +
				input.length +
				' (on ' +
				JSON.stringify(sym) +
				')',
		);
		draw();
		var reduceMotion =
			window.matchMedia &&
			window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (reduceMotion) {
			simulationState.lastLink = null;
			draw();
		} else {
			setTimeout(function () {
				if (simulationState) {
					simulationState.lastLink = null;
					draw();
				}
			}, 350);
		}
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

	function activeLintWarnings() {
		var raw = lint(nodes, links);
		var out = [];
		for (var i = 0; i < raw.length; i++) {
			if (lintEnabledFor(raw[i].kind)) out.push(raw[i]);
		}
		return out;
	}

	function updateLintBadge() {
		if (!lintBtn) return;
		var warnings = activeLintWarnings();
		while (lintBtn.firstChild) lintBtn.removeChild(lintBtn.firstChild);
		lintBtn.appendChild(document.createTextNode('Lint'));
		if (!warnings.length) return;
		var sev = 'info';
		for (var i = 0; i < warnings.length; i++) {
			if (warnings[i].severity === 'error') {
				sev = 'error';
				break;
			}
			if (warnings[i].severity === 'warning') sev = 'warn';
		}
		var badge = document.createElement('span');
		badge.className = 'badge ' + sev;
		badge.textContent = warnings.length;
		lintBtn.appendChild(badge);
	}

	function renderLintList() {
		if (!lintBody) return;
		while (lintBody.firstChild) lintBody.removeChild(lintBody.firstChild);
		var warnings = activeLintWarnings();
		if (!warnings.length) {
			var empty = document.createElement('div');
			empty.className = 'lint-empty';
			empty.textContent = 'no issues';
			lintBody.appendChild(empty);
			return;
		}
		var list = document.createElement('ul');
		list.className = 'lint-list';
		for (var i = 0; i < warnings.length; i++) {
			(function (w) {
				var li = document.createElement('li');
				if (!w.element) li.className = 'no-target';
				var sev = document.createElement('span');
				sev.className = 'lint-sev ' + w.severity;
				sev.textContent = w.severity;
				li.appendChild(sev);
				li.appendChild(document.createTextNode(w.message));
				if (w.element) {
					li.onclick = function () {
						selectedObject = w.element;
						lintModal.hidden = true;
						draw();
					};
				}
				list.appendChild(li);
			})(warnings[i]);
		}
		lintBody.appendChild(list);
	}

	function renderLintPrefs() {
		if (!lintPrefs) return;
		while (lintPrefs.firstChild) lintPrefs.removeChild(lintPrefs.firstChild);
		var h = document.createElement('h3');
		h.textContent = 'Enabled checks';
		lintPrefs.appendChild(h);
		for (var i = 0; i < LINT_KINDS.length; i++) {
			(function (k) {
				var label = document.createElement('label');
				var cb = document.createElement('input');
				cb.type = 'checkbox';
				cb.checked = lintEnabledFor(k.id);
				cb.onchange = function () {
					setLintEnabled(k.id, cb.checked);
					renderLintList();
					updateLintBadge();
				};
				label.appendChild(cb);
				label.appendChild(document.createTextNode(' ' + k.label));
				lintPrefs.appendChild(label);
			})(LINT_KINDS[i]);
		}
	}

	if (lintBtn) {
		lintBtn.onclick = function () {
			if (!lintModal) return;
			renderLintList();
			renderLintPrefs();
			lintModal.hidden = false;
			if (lintClose) lintClose.focus();
		};
	}
	if (lintClose)
		lintClose.onclick = function () {
			lintModal.hidden = true;
		};
	if (lintModal) {
		lintModal.onclick = function (e) {
			if (e.target === lintModal) lintModal.hidden = true;
		};
	}
	document.addEventListener('keydown', function (e) {
		if (e.key === 'Escape' && lintModal && lintModal.hidden === false) {
			lintModal.hidden = true;
		}
	});

	if (shareBtn) shareBtn.onclick = copyShareLink;

	var regexPreviewTimer = null;
	function renderRegexPreview() {
		if (!regexPreview || !regexInput) return;
		var text = regexInput.value;
		if (!text) {
			regexError.textContent = '';
			regexPreview
				.getContext('2d')
				.clearRect(0, 0, regexPreview.width, regexPreview.height);
			return;
		}
		try {
			var json = regexToNFA(text);
			regexError.textContent = json.nodes.length + ' states';
			previewFSMJson(json, regexPreview);
		} catch (e) {
			regexError.textContent = e.message;
		}
	}
	if (regexBtn && regexModal) {
		regexBtn.onclick = function () {
			regexModal.hidden = false;
			if (regexInput) {
				regexInput.focus();
				renderRegexPreview();
			}
		};
	}
	if (regexClose)
		regexClose.onclick = function () {
			regexModal.hidden = true;
		};
	if (regexModal) {
		regexModal.onclick = function (e) {
			if (e.target === regexModal) regexModal.hidden = true;
		};
	}
	if (regexInput) {
		regexInput.oninput = function () {
			clearTimeout(regexPreviewTimer);
			regexPreviewTimer = setTimeout(renderRegexPreview, 150);
		};
	}
	if (regexInsertBtn) {
		regexInsertBtn.onclick = function () {
			try {
				var json = regexToNFA(regexInput.value);
				applyFSMJsonAsNew(json, 'Regex: ' + regexInput.value);
				regexModal.hidden = true;
			} catch (e) {
				regexError.textContent = e.message;
			}
		};
	}
	if (regexReplaceBtn) {
		regexReplaceBtn.onclick = function () {
			try {
				var json = regexToNFA(regexInput.value);
				applyFSMJsonInPlace(json);
				regexModal.hidden = true;
			} catch (e) {
				regexError.textContent = e.message;
			}
		};
	}

	function currentFSMAsJson() {
		var s = serializeState();
		return { format: SAVE_FORMAT, nodes: s.nodes, links: s.links };
	}

	if (toDFABtn) {
		toDFABtn.onclick = function () {
			try {
				var result = nfaToDFA(currentFSMAsJson());
				if (
					!confirm(
						'Convert: ' +
							nodes.length +
							' states -> ' +
							result.nodes.length +
							' states. Create as a new FSM in the workspace?',
					)
				)
					return;
				applyFSMJsonAsNew(
					result,
					'DFA of ' +
						(Workspace.getActive() ? Workspace.getActive().name : 'FSM'),
				);
			} catch (e) {
				showToast(e.message, 'error');
			}
		};
	}

	function setNLResponse(text, busy) {
		if (!nlResponse) return;
		nlResponse.textContent = text || 'Responses will appear here.';
		nlResponse.classList.toggle('empty', !text);
		var modal = nlModal && nlModal.querySelector('.modal');
		if (modal) modal.classList.toggle('nl-busy', !!busy);
	}

	function syncNLKey() {
		if (nlKeyInput) nlKeyInput.value = getModelKey();
	}

	if (nlBtn && nlModal) {
		nlBtn.onclick = function () {
			syncNLKey();
			nlModal.hidden = false;
			if (nlDesc) nlDesc.focus();
		};
	}
	if (nlClose)
		nlClose.onclick = function () {
			nlModal.hidden = true;
		};
	if (nlModal) {
		nlModal.onclick = function (e) {
			if (e.target === nlModal) nlModal.hidden = true;
		};
	}
	if (nlKeySave) {
		nlKeySave.onclick = function () {
			setModelKey(nlKeyInput.value.trim());
			showToast(nlKeyInput.value.trim() ? 'Key saved' : 'Key cleared');
		};
	}
	if (nlGenerateBtn) {
		nlGenerateBtn.onclick = function () {
			if (!getModelKey()) {
				setNLResponse(
					'Add your API key above to enable natural-language features.',
				);
				if (nlKeyInput) nlKeyInput.focus();
				return;
			}
			var desc = nlDesc ? nlDesc.value.trim() : '';
			if (!desc) {
				setNLResponse('Describe the FSM you want generated.');
				return;
			}
			setNLResponse('Generating...', true);
			generateFSMFromText(desc).then(
				function (json) {
					setNLResponse(
						'Generated ' +
							json.nodes.length +
							' states; inserted as a new FSM.',
					);
					applyFSMJsonAsNew(json, 'NL: ' + desc.slice(0, 40));
				},
				function (err) {
					setNLResponse(String(err.message || err));
				},
			);
		};
	}
	if (nlDescribeBtn) {
		nlDescribeBtn.onclick = function () {
			if (!getModelKey()) {
				setNLResponse(
					'Add your API key above to enable natural-language features.',
				);
				if (nlKeyInput) nlKeyInput.focus();
				return;
			}
			if (!nodes.length) {
				setNLResponse('Draw or load an FSM first.');
				return;
			}
			setNLResponse('Reading the diagram...', true);
			describeFSM(currentFSMAsJson()).then(
				function (text) {
					setNLResponse(text);
				},
				function (err) {
					setNLResponse(String(err.message || err));
				},
			);
		};
	}

	if (examplesSelect && typeof EXAMPLES !== 'undefined') {
		for (var ei = 0; ei < EXAMPLES.length; ei++) {
			var opt = document.createElement('option');
			opt.value = String(ei);
			opt.textContent = EXAMPLES[ei].name;
			examplesSelect.appendChild(opt);
		}
		examplesSelect.onchange = function () {
			var idx = parseInt(examplesSelect.value, 10);
			examplesSelect.value = '';
			if (isNaN(idx) || !EXAMPLES[idx]) return;
			try {
				applyFSMJsonAsNew(EXAMPLES[idx].build(), EXAMPLES[idx].name);
			} catch (e) {
				showToast('Could not load example: ' + e.message, 'error');
			}
		};
	}

	if (minimizeBtn) {
		minimizeBtn.onclick = function () {
			try {
				var result = minimize(currentFSMAsJson());
				if (
					!confirm(
						'Minimize: ' +
							nodes.length +
							' states -> ' +
							result.nodes.length +
							' states. Create as a new FSM?',
					)
				)
					return;
				applyFSMJsonAsNew(
					result,
					'Min of ' +
						(Workspace.getActive() ? Workspace.getActive().name : 'FSM'),
				);
			} catch (e) {
				showToast(e.message, 'error');
			}
		};
	}

	// Swap live nodes/links/canvas for a JSON-driven render onto a target
	// canvas, then restore. Used by the regex preview and would-be other
	// algorithm previews. The "live" arrays are mutated in place so the
	// rest of the editor doesn't see the swap.
	function previewFSMJson(json, target) {
		var savedNodes = nodes.slice();
		var savedLinks = links.slice();
		var savedSelected = selectedObject;
		var savedSim = simulationState;
		var savedCanvas = canvas;
		try {
			nodes.length = 0;
			links.length = 0;
			selectedObject = null;
			simulationState = null;
			canvas = target;
			deserializeState(json);
			layout(nodes, links);
			drawUsing(target.getContext('2d'), EXPORT_COLORS);
		} finally {
			nodes.length = 0;
			links.length = 0;
			for (var i = 0; i < savedNodes.length; i++) nodes.push(savedNodes[i]);
			for (var j = 0; j < savedLinks.length; j++) links.push(savedLinks[j]);
			canvas = savedCanvas;
			selectedObject = savedSelected;
			simulationState = savedSim;
		}
	}

	function applyFSMJsonAsNew(json, name) {
		flushHistory();
		saveBackup();
		var id = Workspace.create(name || 'FSM');
		Workspace.switchTo(id);
		deserializeState(json);
		layout(nodes, links);
		commitHistory();
		draw();
		updateTitle();
	}

	function applyFSMJsonInPlace(json) {
		flushHistory();
		deserializeState(json);
		layout(nodes, links);
		commitHistory();
		draw();
	}

	if (layoutBtn) {
		layoutBtn.onclick = function () {
			if (!nodes.length) return;
			flushHistory();
			layout(nodes, links);
			commitHistory();
			draw();
		};
	}

	if (exportJSONBtn) {
		exportJSONBtn.onclick = function () {
			var text = JSON.stringify(exportSnapshot(), null, 2);
			var ok = downloadBlob(
				activeFSMFileName('json'),
				text,
				'application/json',
			);
			showToast(
				ok ? 'JSON downloaded' : 'Could not download JSON',
				ok ? null : 'error',
			);
		};
	}

	if (importBtn && importFile) {
		importBtn.onclick = function () {
			importFile.click();
		};
		importFile.onchange = function () {
			var file = importFile.files && importFile.files[0];
			if (!file) return;
			var reader = new FileReader();
			reader.onload = function () {
				try {
					var obj = JSON.parse(reader.result);
					var err = validateSnapshot(obj);
					if (err) {
						showToast('Invalid: ' + err, 'error');
						return;
					}
					flushHistory();
					deserializeState(obj);
					commitHistory();
					draw();
					showToast('Imported');
				} catch (e) {
					showToast('Could not parse JSON', 'error');
				}
				importFile.value = '';
			};
			reader.onerror = function () {
				showToast('Could not read file', 'error');
				importFile.value = '';
			};
			reader.readAsText(file);
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
	updateLintBadge();
	updateFSMSummary();
}
