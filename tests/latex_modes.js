const fs = require('fs');
const code = fs.readFileSync('www/fsm.js', 'utf8');

global.document = {
	documentElement: {},
	body: {},
	getElementById: () => null,
	addEventListener: () => {},
	hasFocus: () => false,
};
global.window = global;
global.localStorage = {
	getItem: () => null,
	setItem: () => {},
	removeItem: () => {},
};
global.canvas = { getContext: () => ({ font: '', measureText: () => ({ width: 10 }) }) };

try { eval(code); } catch (e) {}

const ex = new ExportAsLaTeX();
const standalone = ex.toLaTeX('standalone');
const snippet = ex.toLaTeX('snippet');
const def = ex.toLaTeX();

const checks = [
	['standalone has documentclass', standalone.includes('\\documentclass')],
	['standalone has begin{document}', standalone.includes('\\begin{document}')],
	['standalone has begin{tikzpicture}', standalone.includes('\\begin{tikzpicture}')],
	['snippet omits documentclass', !snippet.includes('\\documentclass')],
	['snippet omits begin{document}', !snippet.includes('\\begin{document}')],
	['snippet has begin{tikzpicture}', snippet.includes('\\begin{tikzpicture}')],
	['no-arg defaults to standalone', def === standalone],
];

let fails = 0;
for (const [label, ok] of checks) {
	if (!ok) fails++;
	console.log(ok ? 'PASS' : 'FAIL', label);
}
process.exit(fails === 0 ? 0 : 1);
