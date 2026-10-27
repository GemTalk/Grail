"""Fixture: compile()'s filename is the one a SyntaxError reports.

CPython's compile(source, filename, mode) locates a SyntaxError in the file it
was given -- e.filename is 'mod.py' for compile(src, 'mod.py', 'exec') -- for
parser and tokenizer errors alike, and exec()/eval() of a str report
'<string>'.  Grail's parser locates an error knowing only the source, so every
one said '<string>'.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def filename_of(function, source):
    try:
        function(source)
    except SyntaxError as e:
        return type(e).__name__, e.filename, e.lineno


def compiled(filename):
    return lambda source: compile(source, filename, 'exec')


r['compile'] = [filename_of(compiled('mod.py'), s) for s in (
    '1 +', 'x = 1\n)', 'if True:\nx = 1', 'def f():\n  x = 1\n  global x')]
r['a_path_is_kept_whole'] = filename_of(compiled('some/dir/mod.py'), '1 +')
r['eval_mode'] = filename_of(lambda s: compile(s, 'expr.py', 'eval'), '1 +')
r['exec_and_eval_of_a_str'] = [filename_of(exec, '1 +'), filename_of(eval, '1 +')]

EXPECTED = {
    'compile': [('SyntaxError', 'mod.py', 1), ('SyntaxError', 'mod.py', 2),
                ('IndentationError', 'mod.py', 2), ('SyntaxError', 'mod.py', 3)],
    'a_path_is_kept_whole': ('SyntaxError', 'some/dir/mod.py', 1),
    'eval_mode': ('SyntaxError', 'expr.py', 1),
    'exec_and_eval_of_a_str': [('SyntaxError', '<string>', 1), ('SyntaxError', '<string>', 1)],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-5s %-24s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    print(SUMMARY)
