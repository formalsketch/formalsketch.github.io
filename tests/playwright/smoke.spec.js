const { test, expect } = require('@playwright/test');
const fs = require('fs');

test('add a state, label it, export SVG, label appears in SVG', async ({
	page,
}) => {
	await page.goto('/');
	await page.waitForFunction(() => typeof window.nodes !== 'undefined');

	const box = await page.locator('#canvas').boundingBox();
	const cx = box.x + box.width / 2;
	const cy = box.y + box.height / 2;

	await page.mouse.dblclick(cx, cy);
	await page.waitForFunction(() => window.nodes && window.nodes.length === 1);

	const label = 'qSMOKE';
	for (const ch of label) {
		await page.keyboard.press(ch.match(/[A-Z]/) ? 'Shift+' + ch.toLowerCase() : ch);
	}
	await page.waitForFunction(
		(want) => window.nodes[0] && window.nodes[0].text === want,
		label,
	);

	const downloadPromise = page.waitForEvent('download');
	await page.click('#btn-svg');
	const download = await downloadPromise;
	const path = await download.path();
	const svg = fs.readFileSync(path, 'utf8');
	expect(svg).toContain('<svg');
	expect(svg).toContain(label);
});
