#!/usr/bin/env python3
"""Compare two trace-dump roots (base vs after): every <arm>/<corpus-shard>/
<module>.tpz byte for byte, and <module>.ir with the per-session objIds
normalised away.  Exit 1 on any difference."""
import os, re, sys, hashlib
a, b = sys.argv[1], sys.argv[2]
OBJ = re.compile(r'objId: \d+')
def norm(data, root):
    if data[1:4] == b'\x00\x00\x00': t = data.decode('utf-32-le', 'surrogatepass')
    elif b'\x00' in data[:200]: t = data.decode('utf-16-le', 'surrogatepass')
    else: t = data.decode('latin-1')
    t = t.replace(os.path.abspath(root) + '/', '<ROOT>/')
    return OBJ.sub('objId: _', t).encode('utf-8', 'surrogatepass')
tot = {'tpz': [0, 0, 0], 'ir': [0, 0, 0]}   # files, bytes, differing
bad = []
for root, dirs, files in os.walk(a):
    rel = os.path.relpath(root, a)
    other = os.path.join(b, rel)
    for f in sorted(files):
        ext = f.rsplit('.', 1)[-1]
        if ext not in tot: continue
        pa, pb = os.path.join(root, f), os.path.join(other, f)
        da = open(pa, 'rb').read()
        if not os.path.exists(pb):
            bad.append(('missing-after', os.path.join(rel, f))); tot[ext][2] += 1; continue
        db = open(pb, 'rb').read()
        # The .tpz header names the dump file, so the two roots differ there;
        # the .ir objIds are per session; a .ir with wide characters is UTF-16.
        da, db = norm(da, a), norm(db, b)
        tot[ext][0] += 1; tot[ext][1] += len(da)
        if da != db:
            tot[ext][2] += 1; bad.append(('differs', os.path.join(rel, f)))
for root, dirs, files in os.walk(b):
    rel = os.path.relpath(root, b)
    for f in files:
        if f.rsplit('.', 1)[-1] in tot and not os.path.exists(os.path.join(a, rel, f)):
            bad.append(('missing-base', os.path.join(rel, f)))
for k, (n, by, d) in tot.items():
    print(f'{k}: {n} files, {by} bytes compared, {d} differing')
for kind, f in bad[:40]:
    print(kind, f)
print('RESULT', 'IDENTICAL' if not bad else f'{len(bad)} DIFFERENCES')
sys.exit(1 if bad else 0)
