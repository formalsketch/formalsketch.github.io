const { test, expect } = require('@playwright/test');
const fs = require('fs');

test('add a state, label it, export SVG, label appears in SVG', async ({
	page,
}) => {
	await page.goto('/');
	// Wait until the bundle has executed and the globals exist; window.onload
	// in fsm.js sets canvas + bootstraps Workspace before publishing them.
	await page.waitForFunction(
		() =>
			typeof window.Node === 'function' &&
			Array.isArray(window.nodes) &&
			window.canvas != null,
	);

	const label = 'qSMOKE';

	// Inject the state directly. The keyboard-driven path works in the browser
	// but is sensitive to focus / typing speed in headless Chromium; we just
	// want to verify the export path here.
	await page.evaluate((labelText) => {
		const n = new window.Node(400, 300);
		n.text = labelText;
		window.nodes.push(n);
		window.selectedObject = n;
		window.draw();
		window.commitHistory();
	}, label);

	const downloadPromise = page.waitForEvent('download');
	await page.click('#btn-svg');
	const download = await downloadPromise;
	const path = await download.path();
	const svg = fs.readFileSync(path, 'utf8');
	expect(svg).toContain('<svg');
	expect(svg).toContain(label);
});
