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
	// LATEX_SHORTCUTS so the table stays the single source of truth.
	function populateShortcuts() {
		if (!shortcutsBody || shortcutsBody.firstChild) return;
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

	renderSidebar();
	updateTitle();
	updateToolbar();
}
