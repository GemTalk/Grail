"""Fixture: a compile() inside an ``except SyntaxError:`` handler parses by its own mode.

Grail's eval rule (16a721d5) rode the session for the parse and was cleared by
an ensure:, which runs when the stack unwinds -- after a Python handler body has
run, not before.  So after a failed ``compile(src, f, 'eval')`` or ``eval()``,
every compile(), exec() and eval() inside the handler parsed by the eval rule,
and ``compile('x = 1', f, 'exec')`` there was ``invalid syntax``
(GemTalk/Grail#1883).  That is the eval-then-exec fallback CPython's REPL is
built on, and brain-freeze's tools/run_notebook.py uses it for a cell's last
statement.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def exec_after_failed_eval_compile():
    try:
        compile('for i in (1, 2):\n    pass', '<eval-attempt>', 'eval')
    except SyntaxError:
        ns = {}
        exec(compile('x = 1', '<other>', 'exec'), ns)
        return ns['x']
    return 'no SyntaxError'


def exec_after_failed_eval():
    try:
        eval('y = 2')
    except SyntaxError:
        ns = {}
        exec('y = 2', ns)
        return ns['y']
    return 'no SyntaxError'


def eval_rule_still_applies_in_handler():
    # A handler's own eval-mode compile keeps the eval rule.
    try:
        compile('x = 1', '<a>', 'eval')
    except SyntaxError:
        try:
            compile('x = 1', '<b>', 'eval')
        except SyntaxError as e:
            return (e.msg, e.filename, e.lineno, e.offset)
    return 'no SyntaxError'


def nested_fallbacks():
    out = []
    try:
        compile('a = 1', '<outer>', 'eval')
    except SyntaxError:
        out.append(eval(compile('1 + 1', '<outer-eval>', 'eval')))
        try:
            compile('del a', '<inner>', 'eval')
        except SyntaxError:
            ns = {}
            exec(compile('a = 3\ndel a\nb = 4', '<inner-exec>', 'exec'), ns)
            out.append(ns['b'])
        exec(compile('c = 5', '<outer-exec>', 'exec'), {})
        out.append('outer exec ok')
    return out


def run_cell_tail(tail, namespace):
    # brain-freeze tools/run_notebook.py, and CPython's REPL: evaluate the
    # last statement if it is an expression, else execute it.
    try:
        value = eval(compile(tail, '<cell>', 'eval'), namespace)
    except SyntaxError:
        exec(compile(tail, '<cell>', 'exec'), namespace)
        return ('exec', namespace.get('acc'))
    return ('eval', value)


def notebook_fallback():
    ns = {'acc': []}
    return [
        run_cell_tail('for i in (1, 2):\n    acc.append(i)', ns),
        run_cell_tail('len(acc) * 10', ns),
        run_cell_tail('acc = acc + [3]', ns),
    ]


def syntax_error_still_located_in_handler():
    try:
        compile('1 +', '<eval-attempt>', 'eval')
    except SyntaxError:
        try:
            compile('def f(:\n    pass', '<other>', 'exec')
        except SyntaxError as e:
            return (e.filename, e.lineno)
    return 'no SyntaxError'


for fn in (exec_after_failed_eval_compile, exec_after_failed_eval,
           eval_rule_still_applies_in_handler, nested_fallbacks,
           notebook_fallback, syntax_error_still_located_in_handler):
    try:
        r[fn.__name__] = fn()
    except Exception as e:
        r[fn.__name__] = '%s: %s' % (type(e).__name__, e)

EXPECTED = {
    'exec_after_failed_eval_compile': 1,
    'exec_after_failed_eval': 2,
    'eval_rule_still_applies_in_handler': ('invalid syntax', '<b>', 1, 3),
    'nested_fallbacks': [2, 4, 'outer exec ok'],
    'notebook_fallback': [('exec', [1, 2]), ('eval', 20), ('exec', [1, 2, 3])],
    'syntax_error_still_located_in_handler': ('<other>', 1),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-4s %s' % ('OK' if actual == EXPECTED[key] else 'FAIL', key))
        if actual != EXPECTED[key]:
            print('   got %r, want %r' % (actual, EXPECTED[key]))
    print(SUMMARY)
