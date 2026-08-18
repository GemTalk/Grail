"""Fixture: eval() with no globals sees the CALLER's namespace.

CPython: ``If the globals dictionary is omitted it defaults to the globals of
the calling frame'', and an explicit None means the same as omitted -- ``If the
globals dictionary is None, it defaults to the current globals.''  So

    def check(*args, **kwds):
        return eval(expr, globals, locals)     # both hold None

evaluates against the caller's names, and ``args'' resolves.  That is
test_decorators' dbcheck, and Grail raised ``name 'args' is not defined''.

TWO THINGS WERE WRONG AND THE FIRST HID THE SECOND.

Python's None is an OBJECT, not Smalltalk nil, so the ``was a namespace
supplied?'' test saw an explicit None as a supplied namespace and then seeded
nothing from it -- handing the expression an EMPTY scope.  An empty dictionary
is not a missing one: it says the expression may see nothing.

Under that, ``no namespace'' fell back to an empty dict rather than to the
caller.  Grail does rewrite the BARE one-argument ``eval(expr)'' at compile time
and hand the locals in, which is why that spelling always worked -- but the
rewrite is gated on the argument SHAPE, and ``eval(e, g, l)'' says nothing at
compile time about what g and l will hold at run time.  It has to be answered
where the values are, which is at the call.

THE CALLER'S FRAME IS FOUND BY MARKER.  Every method Grail's codegen emits
carries a ___curPos___ temp and no hand-written runtime method does, so the
innermost frame carrying one is the Python caller -- eval()'s own implementation
is skipped for free, and the answer does not move when the call path between
them changes.

BOTH HALVES OF THE NAMESPACE ARE THERE: the caller's locals, and its defining
module's globals with the locals laid over them (a local shadows a global, as it
must).  ``module_globals_from_a_method'' is the one that took a second route:
a class-body method's innermost generated frame is a BLOCK frame whose method
has no selector, so identifying the module by filename fails there and the
defining class's ``__module__'' answers it instead.  With only the first route,
module globals were visible from a top-level def, a lambda and a nested def but
not from a method -- an arbitrary-looking split, and exactly the sort of partial
behaviour that is worse than none.

The checks that must NOT change are here too: an explicit EMPTY globals dict
still hides the caller's names (``eval('secret', {})'' is a NameError, not a
peek at the frame), an unbound name still raises, and builtins still resolve.
"""

q = 'module-level'


def catch(fn):
    try:
        return ['ok', fn()]
    except BaseException as e:
        return type(e).__name__


def dbcheck(exprstr, globals=None, locals=None):
    """test_decorators' decorator, unchanged: the names hold None at run time."""
    def decorate(func):
        expr = compile(exprstr, "dbcheck-%s" % func.__name__, "eval")

        def check(*args, **kwds):
            if not eval(expr, globals, locals):
                raise ValueError('dbcheck failed')
            return func(*args, **kwds)
        return check
    return decorate


def the_dbcheck_shape():
    @dbcheck('args[1] is not None')
    def f(a, b):
        return a + b

    return [f(1, 2), catch(lambda: f(1, None))]


def names_holding_none(globals=None, locals=None):
    x = 5
    return eval('x + 1', globals, locals)


def literal_none():
    x = 5
    return eval('x + 1', None, None)


def bare_eval_is_unchanged():
    w = 3
    return eval('w * 3')


def module_globals_from_a_top_level_def():
    return eval('q', None, None)


def module_globals_from_a_lambda():
    return (lambda: eval('q', None, None))()


def module_globals_from_a_nested_def():
    def inner():
        return eval('q', None, None)
    return inner()


class Holder:
    def read_global(self):
        return eval('q', None, None)

    def read_local(self):
        loc = 5
        return eval('loc', None, None)


def module_globals_from_a_method():
    return Holder().read_global()


def locals_from_a_method():
    return Holder().read_local()


def a_local_shadows_a_module_global():
    q = 'shadowed'
    return eval('q', None, None)


def the_innermost_frame_wins():
    v = 'outer'

    def inner():
        v = 'inner'
        return eval('v', None, None)
    return inner()


def explicit_locals_are_used():
    secret = 42
    return eval('b * 2', None, {'b': 21})


def empty_globals_still_hides_the_caller():
    # The guard.  An empty dict is a namespace, not a missing one.
    secret = 42
    return catch(lambda: eval('secret', {}))


def explicit_globals_are_still_honoured():
    secret = 42
    return eval('a + 1', {'a': 10})


def an_unbound_name_still_raises():
    return catch(lambda: eval('definitely_not_bound', None, None))


def builtins_still_resolve():
    return [eval('len("abc")', {}), eval('len("abcd")', None, None)]


r = {
    'the_dbcheck_shape': the_dbcheck_shape(),
    'names_holding_none': names_holding_none(),
    'literal_none': literal_none(),
    'bare_eval_is_unchanged': bare_eval_is_unchanged(),
    'module_globals_from_a_top_level_def': module_globals_from_a_top_level_def(),
    'module_globals_from_a_lambda': module_globals_from_a_lambda(),
    'module_globals_from_a_nested_def': module_globals_from_a_nested_def(),
    'module_globals_from_a_method': module_globals_from_a_method(),
    'locals_from_a_method': locals_from_a_method(),
    'a_local_shadows_a_module_global': a_local_shadows_a_module_global(),
    'the_innermost_frame_wins': the_innermost_frame_wins(),
    'explicit_locals_are_used': explicit_locals_are_used(),
    'empty_globals_still_hides_the_caller': empty_globals_still_hides_the_caller(),
    'explicit_globals_are_still_honoured': explicit_globals_are_still_honoured(),
    'an_unbound_name_still_raises': an_unbound_name_still_raises(),
    'builtins_still_resolve': builtins_still_resolve(),
}


EXPECTED = {
    'the_dbcheck_shape': [3, 'ValueError'],
    'names_holding_none': 6,
    'literal_none': 6,
    'bare_eval_is_unchanged': 9,
    'module_globals_from_a_top_level_def': 'module-level',
    'module_globals_from_a_lambda': 'module-level',
    'module_globals_from_a_nested_def': 'module-level',
    'module_globals_from_a_method': 'module-level',
    'locals_from_a_method': 5,
    'a_local_shadows_a_module_global': 'shadowed',
    'the_innermost_frame_wins': 'inner',
    'explicit_locals_are_used': 42,
    'empty_globals_still_hides_the_caller': 'NameError',
    'explicit_globals_are_still_honoured': 11,
    'an_unbound_name_still_raises': 'NameError',
    'builtins_still_resolve': [3, 4],
}


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r[key]
        print('%-5s %-38s -> %r' % ('OK' if actual == expected else 'FAIL',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-38s is not in EXPECTED' % ('FAIL', extra))
