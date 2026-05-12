#!/usr/bin/env python3

import os, sys, time

SRC = './src'
OUT = './www/fsm.js'

def sources():
	files = []
	for base, _, names in os.walk(SRC):
		for n in names:
			if n.endswith('.js'):
				files.append(os.path.join(base, n).replace('\\', '/'))
	files.sort()
	return files

def build():
	parts = []
	for path in sources():
		with open(path, 'r', encoding='utf-8') as f:
			parts.append(f.read())
	data = '\n'.join(parts)
	with open(OUT, 'w', encoding='utf-8', newline='') as f:
		f.write(data)
	print('built %s (%u bytes)' % (OUT, len(data)))

def stat():
	return [os.stat(f).st_mtime for f in sources()]

def monitor():
	a = stat()
	while True:
		time.sleep(0.5)
		b = stat()
		if a != b:
			a = b
			build()

if __name__ == '__main__':
	build()
	if '--watch' in sys.argv:
		monitor()
