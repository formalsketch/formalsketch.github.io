#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'src');
const OUT = path.join(__dirname, 'www', 'fsm.js');

function sources() {
	const out = [];
	(function walk(dir) {
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) walk(full);
			else if (entry.isFile() && entry.name.endsWith('.js')) out.push(full);
		}
	})(SRC);
	// Sort by forward-slash relative path so output is identical on every platform
	// and matches the Python builder.
	out.sort((a, b) => {
		const ra = path.relative(__dirname, a).split(path.sep).join('/');
		const rb = path.relative(__dirname, b).split(path.sep).join('/');
		return ra < rb ? -1 : ra > rb ? 1 : 0;
	});
	return out;
}

function build() {
	const files = sources();
	// Normalize CRLF -> LF on read so output is identical regardless of how
	// source files were checked out, and matches build.py's text-mode read.
	const data = files.map((f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')).join('\n');
	fs.mkdirSync(path.dirname(OUT), { recursive: true });
	fs.writeFileSync(OUT, data);
	const rel = path.relative(__dirname, OUT).split(path.sep).join('/');
	console.log(`built ./${rel} (${Buffer.byteLength(data, 'utf8')} bytes)`);
}

function watch() {
	let pending = null;
	const trigger = () => {
		clearTimeout(pending);
		pending = setTimeout(() => {
			try {
				build();
			} catch (err) {
				console.error('build failed:', err.message);
			}
		}, 100);
	};
	fs.watch(SRC, { recursive: true }, trigger);
	console.log('watching ./src for changes (Ctrl+C to stop)');
}

if (require.main === module) {
	build();
	if (process.argv.includes('--watch')) watch();
}
