module.exports = {
	testDir: 'tests/playwright',
	timeout: 30000,
	reporter: [['list']],
	use: {
		baseURL: 'http://localhost:8080',
		trace: 'retain-on-failure',
	},
	webServer: {
		command: 'python -m http.server 8080',
		url: 'http://localhost:8080',
		reuseExistingServer: !process.env.CI,
		timeout: 20000,
	},
	projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
};
