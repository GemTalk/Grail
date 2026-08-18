"""Fixture: the order in which a decorator CHAIN is evaluated and applied.

Decorating a function is two phases, not one.  CPython evaluates every
decorator EXPRESSION first, top-down in source order, and only then APPLIES the
resulting decorators, bottom-up.  For

    @c1.make_decorator(c1.arg)
    @c2.make_decorator(c2.arg)
    def foo(): ...

that means: look up ``c1.make_decorator'', evaluate ``c1.arg'', call the maker;
then the same for c2; and only after both makers have run does the decorator
nearest the def get called, then the one above it.

The two phases are easy to fuse by accident, because for a SINGLE decorator the
fused and split orders are identical -- ``evalname/evalargs/makedec/calldec''
either way.  It takes a chain of two to tell them apart, and the difference is
invisible unless the decorator expression has an observable side effect, which
is why the checks below thread a log through attribute lookup (__getattr__) as
well as through the maker and the decorator.

Grail emitted one ``foo := <deco> value: { foo }'' statement per decorator for
a def inside a function or method, which evaluates AND applies each decorator
before looking at the next -- makedec2/calldec2/makedec1/calldec1 where CPython
gives makedec1/makedec2/calldec2/calldec1.  Module-level defs took a different
emitter that already nested the whole chain into one expression, so they were
correct all along; that asymmetry is why ``module_level'' and ``nested'' are
both here, and why a fixture written only at module level would have reported
this as working.  See test_decorators' test_eval_order, whose class and defs
live inside the test METHOD.

``manual'' is the equivalence claim from chapter 7 of the language reference:
the decorated form must behave exactly like the hand-written nesting.
"""


class Tracer:
    """Reports every name lookup and argument evaluation into a shared log."""

    def __init__(self, index, log, maker):
        # Bypass __getattr__ for our own state.
        object.__setattr__(self, 'index', index)
        object.__setattr__(self, 'log', log)
        object.__setattr__(self, 'maker', maker)

    def __getattr__(self, fname):
        if fname == 'make_decorator':
            opname, res = ('evalname', self.maker)
        elif fname == 'arg':
            opname, res = ('evalargs', str(self.index))
        else:
            raise AssertionError('unknown attrname %s' % fname)
        self.log.append('%s%d' % (opname, self.index))
        return res


def _tracers(log):
    def make_decorator(tag):
        log.append('makedec' + tag)

        def decorate(func):
            log.append('calldec' + tag)
            return func

        return decorate

    return [Tracer(i, log, make_decorator) for i in (1, 2, 3)]


CHAINED = ['evalname1', 'evalargs1', 'makedec1',
           'evalname2', 'evalargs2', 'makedec2',
           'evalname3', 'evalargs3', 'makedec3',
           'calldec3', 'calldec2', 'calldec1']

_mod_log = []
_c1, _c2, _c3 = _tracers(_mod_log)


@_c1.make_decorator(_c1.arg)
@_c2.make_decorator(_c2.arg)
@_c3.make_decorator(_c3.arg)
def _mod_foo():
    return 42


def module_level():
    # The path that was already correct -- kept so a regression there is caught.
    return [_mod_foo(), _mod_log]


def nested():
    # The upstream shape: everything inside a function body.
    log = []
    c1, c2, c3 = _tracers(log)

    @c1.make_decorator(c1.arg)
    @c2.make_decorator(c2.arg)
    @c3.make_decorator(c3.arg)
    def foo():
        return 42

    return [foo(), log]


def nested_in_method():
    # test_decorators' own nesting: inside a METHOD of a class.
    class Runner:
        def go(self):
            log = []
            c1, c2, c3 = _tracers(log)

            @c1.make_decorator(c1.arg)
            @c2.make_decorator(c2.arg)
            @c3.make_decorator(c3.arg)
            def foo():
                return 42

            return [foo(), log]

    return Runner().go()


def nested_pair():
    # Two decorators are the shortest chain that distinguishes the orders.
    log = []
    c1, c2, c3 = _tracers(log)

    @c1.make_decorator(c1.arg)
    @c2.make_decorator(c2.arg)
    def foo():
        return 7

    return [foo(), log]


def nested_single():
    # One decorator: fused and split orders agree, so this pins that the
    # single-decorator path is left alone.
    log = []
    c1, c2, c3 = _tracers(log)

    @c2.make_decorator(c2.arg)
    def foo():
        return 9

    return [foo(), log]


def manual():
    # Chapter 7's equivalence claim: the sugar must match the nesting.
    log = []
    c1, c2, c3 = _tracers(log)

    def bar():
        return 42

    bar = c1.make_decorator(c1.arg)(
        c2.make_decorator(c2.arg)(c3.make_decorator(c3.arg)(bar)))
    return [bar(), log]


def in_class_body():
    # A method decorated in a class BODY -- a third emitter again.
    log = []
    c1, c2, c3 = _tracers(log)

    class K:
        @c1.make_decorator(c1.arg)
        @c3.make_decorator(c3.arg)
        def m(self):
            return 3

    return [K().m(), log]


def decorators_actually_wrap():
    # The order checks would all pass if the decorators were applied and their
    # results thrown away, since these decorators return func unchanged.  This
    # one returns a WRAPPER, so it fails unless the chain really threads.
    def tag(name):
        def deco(func):
            def wrapper():
                return name + '(' + func() + ')'
            return wrapper
        return deco

    @tag('outer')
    @tag('inner')
    def foo():
        return 'f'

    return foo()


r = {
    'module_level': module_level(),
    'nested': nested(),
    'nested_in_method': nested_in_method(),
    'nested_pair': nested_pair(),
    'nested_single': nested_single(),
    'manual': manual(),
    'in_class_body': in_class_body(),
    'decorators_actually_wrap': decorators_actually_wrap(),
}


EXPECTED = {
    'module_level': [42, CHAINED],
    'nested': [42, CHAINED],
    'nested_in_method': [42, CHAINED],
    'nested_pair': [7, ['evalname1', 'evalargs1', 'makedec1',
                        'evalname2', 'evalargs2', 'makedec2',
                        'calldec2', 'calldec1']],
    'nested_single': [9, ['evalname2', 'evalargs2', 'makedec2', 'calldec2']],
    'manual': [42, CHAINED],
    'in_class_body': [3, ['evalname1', 'evalargs1', 'makedec1',
                          'evalname3', 'evalargs3', 'makedec3',
                          'calldec3', 'calldec1']],
    'decorators_actually_wrap': 'outer(inner(f))',
}


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r[key]
        print('%-5s %-26s -> %r' % ('OK' if actual == expected else 'FAIL',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-26s is not in EXPECTED' % ('FAIL', extra))
