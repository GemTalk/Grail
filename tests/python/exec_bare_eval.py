"""A bare eval() / exec() in a function or method of exec'd source.

Grail compiles a bare one-argument ``eval(src)'' or ``exec(src)'' in a
function so the evaluated code sees the function's locals AND the globals,
and named the globals by the module the code belongs to.  An exec'd source
has none: in a class method the compile died with an uncatchable
``UndefinedObject does not understand #name'' -- pytest's and pyparsing's own
test suites stopped there, mid-collection, because pytest imports test modules
through exec -- and in a plain function the evaluated code could not see the
exec's globals.

Every expectation was measured against CPython 3.14.
"""

import ast

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:200])


SOURCE = '''
class K:
    def evaluates(self):
        local = 3
        return eval('local + GLOBAL')

    def executes(self):
        exec('made = GLOBAL * 2')
        return 'ran'


def evaluates():
    local = 4
    return eval('local + GLOBAL')


def comprehends():
    return [eval('x + GLOBAL') for x in range(2)]


results = (K().evaluates(), K().executes(), evaluates(), comprehends())
'''


def _run(code):
    ns = {'GLOBAL': 10}
    try:
        exec(code, ns)
        return ns['results']
    except BaseException as exc:
        return '%s: %s' % (type(exc).__name__, str(exc)[:150])


WANT = (13, 'ran', 14, [10, 11])
check('exec_of_source_text', _run(compile(SOURCE, '<exec>', 'exec')), WANT)
check('exec_of_a_parsed_tree', _run(compile(ast.parse(SOURCE), '<exec>', 'exec')), WANT)

GLOBAL = 20


class Here:
    def evaluates(self):
        local = 1
        return eval('local + GLOBAL')


def here():
    local = 2
    return eval('local + GLOBAL')


check('the_same_in_a_module', (Here().evaluates(), here()), (21, 22))

SUMMARY = '%d checks, %d disagreeing' % (len(RESULTS), sum(1 for v in RESULTS.values() if v is not True))

if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
