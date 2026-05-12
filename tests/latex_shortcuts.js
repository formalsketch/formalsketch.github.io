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

try {
	eval(code);
} catch (e) {}

const cases = [
	['\\alpha', 'α'],
	['\\Omega', 'Ω'],
	['x \\leq 5', 'x ≤ 5'],
	['x \\le 5', 'x ≤ 5'],
	['\\theta_1', 'θ₁'],
	['A \\cup B', 'A ∪ B'],
	['\\forall x. \\exists y', '∀ x. ∃ y'],
	['\\rightarrow', '→'],
	['\\to', '→'],
	['\\Rightarrow', '⇒'],
	['\\notin S', '∉ S'],
	['\\subseteq', '⊆'],
	['\\neq', '≠'],
	['S_0 \\to S_1', 'S₀ → S₁'],
];

let fails = 0;
for (const [input, want] of cases) {
	const got = convertLatexShortcuts(input);
	const ok = got === want;
	if (!ok) fails++;
	console.log(
		ok ? 'PASS' : 'FAIL',
		JSON.stringify(input),
		'->',
		JSON.stringify(got),
		ok ? '' : 'want ' + JSON.stringify(want),
	);
}
process.exit(fails === 0 ? 0 : 1);
