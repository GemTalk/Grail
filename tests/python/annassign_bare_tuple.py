"""Fixture: an annotated or augmented assignment takes a bare tuple value.

CPython's grammar gives both the same right-hand side as a plain assignment:

    assignment: NAME ':' expression ['=' annotated_rhs]
              | single_target augassign ~ (yield_expr | star_expressions)
    annotated_rhs: yield_expr | star_expressions

so ``x: tuple = -1, None'' binds (-1, None) (valid since 3.8, bpo-34641),
``x: tuple = 1, *rest'' unpacks, and ``t += 1, 2'' extends t by a tuple.
Grail parsed both right-hand sides as a single expression, so each of these
was ``SyntaxError: invalid syntax'' at the comma (#1419) -- the first reason
pyparsing did not import (core.py: ``longest: tuple[...] = -1, None'').

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}

rest = [3, 4]

# --- annotated, at module scope ----------------------------------------------

a: tuple = -1, None
b: tuple = 1, *rest
c: tuple = 5,
r['module_scope'] = [a, b, c]


# --- annotated, in a function and a class body --------------------------------

def _in_a_function():
    longest: tuple[int, object] = -1, None
    return longest


class _InAClass:
    pair: tuple = 'x', 'y'


r['function_scope'] = _in_a_function()
r['class_scope'] = [_InAClass.pair, sorted(_InAClass.__annotations__)]


# --- yield as the value -------------------------------------------------------

def _yielding():
    got: tuple = yield 1, 2
    also: object = yield
    yield got, also


def _drive():
    g = _yielding()
    first = next(g)
    second = g.send('sent')
    third = g.send('again')
    return [first, second, third]


r['yield_values'] = _drive()


# --- augmented ------------------------------------------------------------------

t = (0,)
t += 1, 2
r['augmented_tuple'] = t

lst = [0]
lst += 1, *rest
r['augmented_starred'] = lst


def _aug_yield():
    total = 10
    total += yield
    yield total


g = _aug_yield()
next(g)
r['augmented_yield'] = g.send(5)



# --- ...but a LONE starred value is still refused, as for a plain '=' -----------

def _refusal(src):
    try:
        compile(src, '<s>', 'exec')
    except SyntaxError as e:
        return e.msg
    return 'compiled'


r['lone_starred_refused'] = [_refusal('x: int = *a'), _refusal('t += *a'),
                             _refusal('x = *a')]


EXPECTED = {
    'module_scope': [(-1, None), (1, 3, 4), (5,)],
    'function_scope': (-1, None),
    'class_scope': [('x', 'y'), ['pair']],
    'yield_values': [(1, 2), None, ('sent', 'again')],
    'augmented_tuple': (0, 1, 2),
    'augmented_starred': [0, 1, 3, 4],
    'augmented_yield': 15,
    'lone_starred_refused': ["can't use starred expression here"] * 3,
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-5s %-28s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    print(SUMMARY)
