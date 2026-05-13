module.exports = {
	testDir: 'tests/playwright',
	timeout: 30000,
	reporter: [['list'], ['html', { open: 'never' }]],
	use: {
		baseURL: 'http://localhost:8080',
		trace: 'retain-on-failure',
	},
	webServer: {
		// http-server via npx works on any runner with Node; avoids relying on
		// `python` vs `python3` aliasing in the GitHub Actions image.
		command: 'npx --yes http-server@14 -p 8080 -c-1 -s .',
		url: 'http://localhost:8080',
		reuseExistingServer: !process.env.CI,
		timeout: 60000,
	},
	projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
};
