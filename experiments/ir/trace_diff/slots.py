#!/usr/bin/env python3
"""String-literal slots per compiled method and per class build, from a
GRAIL_CODEGEN_TRACE_DIR dump.  A 'unit' is a method the image compiles: every
method in a .tpz, plus every method SOURCE the generated code compiles at run
time (the string argument of ___compileMethod: / ___irInstallDef:...or:),
recursively.  A string literal is a '...' token outside comments, symbols and
literal arrays.  A class build is a depth-0 statement of a unit that mints a
class (___canonicalSubclassOf: / ___subclass___:); nested builds count in it."""
import os, re, sys

def lex(src):
    """Yield (kind, start, end, text) for string literals and statement ends."""
    i, n, arr = 0, len(src), 0
    depth = 0
    while i < n:
        c = src[i]
        if c == '"':
            j = src.find('"', i + 1); i = (j if j >= 0 else n) + 1; continue
        if c == '$': i += 2; continue
        if c == '#' and i + 1 < n and src[i + 1] == '(':
            arr += 1; i += 2; continue
        if c == '(' and arr: arr += 1
        elif c == ')' and arr: arr -= 1
        elif c in '[(' : depth += 1
        elif c in '])' : depth -= 1
        elif c == '.' and depth == 0 and not arr: yield ('end', i, i, None)
        if c == "'":
            sym = i > 0 and src[i - 1] == '#'
            j = i + 1; buf = []
            while j < n:
                if src[j] == "'":
                    if j + 1 < n and src[j + 1] == "'": buf.append("'"); j += 2; continue
                    break
                buf.append(src[j]); j += 1
            if not sym and not arr: yield ('str', i, j, ''.join(buf))
            i = j + 1; continue
        i += 1

def analyse(src, name, out):
    toks = list(lex(src))
    strs = [t for t in toks if t[0] == 'str']
    out['units'].append((len(strs), name))
    # per depth-0 statement that builds a class
    start = 0
    for t in toks + [('end', len(src), len(src), None)]:
        if t[0] != 'end': continue
        stmt = src[start:t[1]]
        if '___canonicalSubclassOf:' in stmt or '___subclass___:' in stmt:
            k = sum(1 for s in strs if start <= s[1] < t[1])
            out['builds'].append((k, name, stmt.count('___canonicalSubclassOf:') + stmt.count('___subclass___:')))
        start = t[1] + 1
    # recurse into run-time compiled method sources
    for idx, s in enumerate(strs):
        pre = src[max(0, s[1] - 40):s[1]]
        if pre.rstrip().endswith(('___compileMethod:', ' or:')) and '\n' in s[3]:
            analyse(s[3], name + '>' + s[3].split('\n', 1)[0][:50], out)

def tpz_methods(text):
    for m in re.finditer(r'\n(?:class)?method: \S+\n(.*?)\n%\n', text, re.S):
        yield m.group(1)

out = {'units': [], 'builds': []}
for root, _, files in os.walk(sys.argv[1]):
    for f in files:
        if f.endswith('.tpz'):
            t = open(os.path.join(root, f), encoding='utf-8', errors='replace').read()
            for k, m in enumerate(tpz_methods(t)):
                analyse(m, f'{os.path.basename(root)}/{f}#{k}:{m.split(chr(10),1)[0][:30]}', out)
for key in ('units', 'builds'):
    rows = sorted(out[key], reverse=True)
    print(f'{key}: {len(rows)}; max {rows[0][0] if rows else 0}; over 8192: {sum(1 for r in rows if r[0] > 8192)}; over 4096: {sum(1 for r in rows if r[0] > 4096)}')
    for r in rows[:8]: print('   ', r)
