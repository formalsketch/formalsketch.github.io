#!/usr/bin/env python3

import os, sys, time

SRC = './src'
OUT = './fsm.js'

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
	encoded = data.encode('utf-8')
	with open(OUT, 'wb') as f:
		f.write(encoded)
	print('built %s (%u bytes)' % (OUT, len(encoded)))

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
