const fs = require('fs');
const code = fs.readFileSync('fsm.js', 'utf8');

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

try {
	eval(code);
} catch (e) {}

const want = { a: 1, b: [2, 3], c: 'x' };
const cases = [
	['raw json', JSON.stringify(want)],
	['code-fenced json', '```json\n' + JSON.stringify(want) + '\n```'],
	['unmarked fence', '```\n' + JSON.stringify(want) + '\n```'],
	['preamble + json', 'Sure! Here is the FSM:\n' + JSON.stringify(want) + '\n'],
	['trailing prose', JSON.stringify(want) + '\nLet me know if you need changes.'],
];

let fails = 0;
for (const [label, input] of cases) {
	try {
		const got = parseModelJSON(input);
		const ok = JSON.stringify(got) === JSON.stringify(want);
		console.log(ok ? 'PASS' : 'FAIL', label);
		if (!ok) {
			fails++;
			console.log('  got:', got);
		}
	} catch (e) {
		console.log('FAIL', label, '->', e.message);
		fails++;
	}
}

process.exit(fails === 0 ? 0 : 1);
