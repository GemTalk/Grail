"""Fixture: an exception subclass's own __new__, and an explicit Exc.__new__.

test_exception_hierarchy's ExplicitSubclassingTest failed three ways:

* ``super().__new__(cls, m)'' and ``Exception.__new__(cls, m)'' put ``cls''
  into args.  A built-in exception's class-side ``__new__:'' family is the
  CONSTRUCTOR the class call compiles to -- its receiver is the class and
  every argument a constructor argument -- so the explicit, cls-first call
  reached it with cls as an ARGUMENT, and built the receiver's class instead
  of cls.  BaseException.__init__ resetting args hid it for most classes.
* OSError did not: CPython parses OSError's arguments in __new__ and makes
  its __init__ a no-op once a subclass overrides __new__ (oserror_use_init),
  so ``SubOSErrorWithNew('m', 'baz')'' has args ('m',) where Grail's
  __init__ re-read the whole call as (errno, strerror).  A subclass that
  overrides __init__ but not __new__ gets empty args from __new__ instead.
* ``class NewFirst(WithNew, WithInit)'' never ran WithInit.__init__: the
  merge of a secondary base's methods refused it because BaseException
  defines the same selector, though CPython's MRO puts BaseException after
  WithInit.

Every EXPECTED check holds under CPython 3.14, which is what makes it
evidence.
"""

r = {}


def _shape(thunk):
    try:
        e = thunk()
    except Exception as x:
        return ('raised', type(x).__name__, str(x))
    attrs = {k: getattr(e, k) for k in ('bar', 'baz') if hasattr(e, k)}
    return (type(e).__name__, e.args, attrs, str(e))


class WithInit(OSError):
    def __init__(self, message, bar):
        self.bar = bar
        super().__init__(message)


class WithNew(OSError):
    def __new__(cls, message, baz):
        self = super().__new__(cls, message)
        self.baz = baz
        return self


class InitFirst(WithInit, WithNew):
    pass


class NewFirst(WithNew, WithInit):
    pass


class ValueNew(ValueError):
    def __new__(cls, message, baz):
        self = super().__new__(cls, message)
        self.baz = baz
        return self


class Direct(Exception):
    def __new__(cls, m):
        return Exception.__new__(cls, m)


def _mixin_init(base):
    class Init(base):
        def __init__(self, message, bar):
            self.bar = bar
            super().__init__(message)

    class New(base):
        def __new__(cls, message, baz):
            self = super().__new__(cls)
            self.baz = baz
            return self

    class First(New, Init):
        pass

    return lambda: First('m', 'baz')


r['oserror_subclass_new'] = _shape(lambda: WithNew('m', 'baz'))
r['oserror_subclass_new_keyword'] = _shape(lambda: WithNew('m', baz='baz'))
r['oserror_init_then_new'] = _shape(lambda: InitFirst('m', 'baz'))
r['oserror_new_then_init'] = _shape(lambda: NewFirst('m', 'baz'))
r['valueerror_subclass_new'] = _shape(lambda: ValueNew('m', 'baz'))
r['valueerror_subclass_new_keyword'] = _shape(lambda: ValueNew('m', baz='baz'))
r['explicit_exception_new_builds_cls'] = _shape(lambda: Direct('m'))
r['explicit_oserror_new_maps_the_errno'] = _shape(lambda: OSError.__new__(OSError, 2, 'x'))
r['explicit_oserror_new_of_an_init_subclass'] = _shape(lambda: OSError.__new__(WithInit, 'a', 'b'))
r['explicit_new_keeps_every_argument'] = _shape(lambda: Exception.__new__(Exception, 1, 2))
r['explicit_new_runs_no_init'] = _shape(lambda: OSError.__new__(WithNew, 'm'))
r['explicit_new_needs_a_class'] = _shape(lambda: BaseException.__new__())
r['explicit_new_needs_a_subtype'] = _shape(lambda: Exception.__new__(int))
r['explicit_new_needs_a_type'] = _shape(lambda: Exception.__new__(5))
r['explicit_new_wrong_branch'] = _shape(lambda: OSError.__new__(ValueError, 1))
r['explicit_oserror_new_refuses_keywords'] = _shape(lambda: OSError.__new__(OSError, 2, 'x', kw=1))
r['exception_new_then_init_runs_both'] = _shape(_mixin_init(Exception))
r['oserror_new_then_init_runs_both'] = _shape(_mixin_init(OSError))

EXPECTED = {
    'oserror_subclass_new': ('WithNew', ('m',), {'baz': 'baz'}, 'm'),
    'oserror_subclass_new_keyword': ('WithNew', ('m',), {'baz': 'baz'}, 'm'),
    'oserror_init_then_new': ('InitFirst', ('m',), {'bar': 'baz', 'baz': 'baz'}, 'm'),
    'oserror_new_then_init': ('NewFirst', ('m',), {'bar': 'baz', 'baz': 'baz'}, 'm'),
    'valueerror_subclass_new': ('ValueNew', ('m', 'baz'), {'baz': 'baz'}, "('m', 'baz')"),
    'valueerror_subclass_new_keyword': ('raised', 'TypeError', 'ValueNew() takes no keyword arguments'),
    'explicit_exception_new_builds_cls': ('Direct', ('m',), {}, 'm'),
    'explicit_oserror_new_maps_the_errno': ('FileNotFoundError', (2, 'x'), {}, '[Errno 2] x'),
    'explicit_oserror_new_of_an_init_subclass': ('WithInit', (), {}, ''),
    'explicit_new_keeps_every_argument': ('Exception', (1, 2), {}, '(1, 2)'),
    'explicit_new_runs_no_init': ('WithNew', ('m',), {}, 'm'),
    'explicit_new_needs_a_class': ('raised', 'TypeError', 'BaseException.__new__(): not enough arguments'),
    'explicit_new_needs_a_subtype': ('raised', 'TypeError', 'Exception.__new__(int): int is not a subtype of Exception'),
    'explicit_new_needs_a_type': ('raised', 'TypeError', 'Exception.__new__(X): X is not a type object (int)'),
    'explicit_new_wrong_branch': ('raised', 'TypeError', 'OSError.__new__(ValueError): ValueError is not a subtype of OSError'),
    'explicit_oserror_new_refuses_keywords': ('raised', 'TypeError', 'OSError() takes no keyword arguments'),
    'exception_new_then_init_runs_both': ('First', ('m',), {'bar': 'baz', 'baz': 'baz'}, 'm'),
    'oserror_new_then_init_runs_both': ('First', (), {'bar': 'baz', 'baz': 'baz'}, ''),
}

KNOWN_DIVERGENCES = {}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS,
    sorted(r) == sorted(list(EXPECTED) + list(KNOWN_DIVERGENCES)))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        ok = actual == EXPECTED[key]
        print('%-5s %-42s -> %s' % ('OK' if ok else 'FAIL', key,
                                    'as expected' if ok else repr(actual)))
    print(SUMMARY)
