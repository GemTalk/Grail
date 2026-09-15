"""Fixture: a parameter DEFAULT that names one of the def's own locals.

A default expression is evaluated ONCE, at def time, in the scope ENCLOSING the
def -- so a name in it never sees the parameter or body local it collides with.
The idiom that depends on this is pinning a global into a fast local:

    def __getattr__(self, name, getattr=getattr):
        return getattr(self.stream, name)

which `codecs` uses four times.  The `getattr` inside the default is the
builtin; the `getattr` inside the body is the parameter that was just bound
from it.

Grail's text path already emits exactly that -- a class-body default becomes
``___grailClassDefaultPut___: ... compute: [builtins ___globalAt___: #getattr]''
evaluated while the class body runs, a module-level one becomes
``___moduleDefaultAt:compute: [self ___moduleAttrLoad___: #LIMIT]'' -- because
it generates the default expression with MODULE name resolution, not the
method's.  So the shapes below are about the IR path reproducing that rather
than resolving the name to the method temp it would otherwise find.

ONE SHAPE IS AN XFAIL, and it is not this cut's.  ``rebinding_the_global_afterwards''
pins that a default is evaluated at DEF time: rebinding the global afterwards
must not change it.  Grail evaluates a module-level default LAZILY instead, in
``___moduleDefaultAt:compute:'', on the first call that needs it -- so it answers
the rebound value.  Measured identically on the text path and the IR path, since
the IR emit reproduces the text's memo send for send; it is the deferred half of
the ``defaults are recreated per call'' family, not something either path in
this cut introduced.  It stays in the fixture as the tripwire for the cut that
fixes it -- XPASS is a gate failure, so it retires itself.

Everything here is verified against real CPython by running the file directly.
"""

r = {}

LIMIT = 3


class Stream:
    def __init__(self):
        self.stream = 'abc'

    def __getattr__(self, name, getattr=getattr):
        return getattr(self.stream, name)


r['the_codecs_getattr_idiom'] = Stream().upper()


def top(a, LIMIT=LIMIT):
    return a, LIMIT


r['a_module_def_shadowing_a_global'] = (top(1), top(1, 9))


def shadows_a_body_local(x=LIMIT):
    LIMIT = 'local'
    return x, LIMIT


r['a_default_naming_a_body_local'] = shadows_a_body_local()


def kwonly(*, LIMIT=LIMIT):
    return LIMIT


r['a_keyword_only_default_shadowing'] = (kwonly(), kwonly(LIMIT=8))


REBOUND = 'first'


def reads_rebound(v=REBOUND):
    return v


REBOUND = 'second'

r['rebinding_the_global_afterwards'] = (reads_rebound(), REBOUND)


class Statics:
    @staticmethod
    def s(seq, sorted=sorted):
        return sorted(seq)

    @classmethod
    def c(cls, seq, len=len):
        return len(seq)


r['a_staticmethod_with_a_shadowing_default'] = Statics.s([3, 1, 2])
r['a_classmethod_with_a_shadowing_default'] = Statics.c([3, 1, 2])


def two_shadowed(seq, len=len, sorted=sorted):
    return len(seq), sorted(seq)


r['two_shadowed_defaults_in_one_signature'] = two_shadowed([2, 1])


def call_in_the_default(n, pair=divmod(7, 2)):
    return n, pair


r['a_call_expression_in_the_default'] = call_in_the_default(1)


class Mixed:
    SIZE = 'class attr, not visible to the default'

    def m(self, LIMIT=LIMIT):
        return LIMIT


r['a_method_default_sees_the_module_not_the_class'] = Mixed().m()


# Grail answers ('second', 'second'): its module-level default memo computes on
# first call rather than at def time.  See the module docstring.
XFAIL = {'rebinding_the_global_afterwards'}


EXPECTED = {
    'the_codecs_getattr_idiom': 'ABC',
    'a_module_def_shadowing_a_global': ((1, 3), (1, 9)),
    'a_default_naming_a_body_local': (3, 'local'),
    'a_keyword_only_default_shadowing': (3, 8),
    'rebinding_the_global_afterwards': ('first', 'second'),
    'a_staticmethod_with_a_shadowing_default': [1, 2, 3],
    'a_classmethod_with_a_shadowing_default': 3,
    'two_shadowed_defaults_in_one_signature': (2, [1, 2]),
    'a_call_expression_in_the_default': (1, (3, 1)),
    'a_method_default_sees_the_module_not_the_class': 3,
}


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r[key]
        if key in XFAIL:
            # Run under CPython this always agrees; the disagreement is Grail's,
            # so the line is XFAIL either way and never XPASS.  What would make
            # it fail here is the EXPECTED value drifting from CPython.
            status = 'XFAIL' if actual == expected else 'FAIL'
        else:
            status = 'OK' if actual == expected else 'FAIL'
        print('%-5s %-48s -> %r' % (status, key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-48s is not in EXPECTED' % ('FAIL', extra))
