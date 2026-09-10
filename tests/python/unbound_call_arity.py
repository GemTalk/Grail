"""`Base.method(instance, ...)` runs BASE's method, at every arity.

An unbound call names the implementation it wants. Grail resolves one by
building the fixed-arity Smalltalk selector for the argument count and
running it NON-virtually, and the table that built it stopped at three:

    nargs = 0 -> m        1 -> m:        2 -> m:_:        3 -> m:_:_:
    anything else -> nil

`nil` there means "no fixed form exists", so a call with FOUR OR MORE
arguments skipped to the varargs branch -- and the varargs form is the
keyword-binding entry, whose last act is a VIRTUAL self-send. A virtual
send goes back down to the subclass:

    Base.m4(sub, 1, 2, 3, 4)   answered 'S4', Sub's override
    Base.m3(sub, 1, 2, 3)      answered 'B3', correctly

The consequence is worse than a wrong answer, because the ordinary way to
call a parent explicitly is exactly that shape:

    class Sub(Base):
        def m4(self, a, b, c, d):
            return Base.m4(self, a, b, c, d)   # recursed until the stack died

which raised an uncatchable Smalltalk AlmostOutOfStackError at four
arguments while working at three.

The guard that skips fixed-arity FORWARDERS -- there precisely because a
forwarder re-sends virtually -- had been protecting arities 1..3 and
nothing else.

Every expectation was checked against CPython 3.14 first.
"""

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


def _outcome(fn):
    try:
        return ('ok', fn())
    except BaseException as exc:
        return (type(exc).__name__, str(exc)[:60])


class Base:
    def m0(self):
        return 'B0'

    def m1(self, a):
        return 'B1:%s' % a

    def m2(self, a, b):
        return 'B2:%s%s' % (a, b)

    def m3(self, a, b, c):
        return 'B3:%s%s%s' % (a, b, c)

    def m4(self, a, b, c, d):
        return 'B4:%s%s%s%s' % (a, b, c, d)

    def m6(self, a, b, c, d, e, f):
        return 'B6:%s%s%s%s%s%s' % (a, b, c, d, e, f)


class Sub(Base):
    def m0(self):
        return 'S0'

    def m1(self, a):
        return 'S1'

    def m2(self, a, b):
        return 'S2'

    def m3(self, a, b, c):
        return 'S3'

    def m4(self, a, b, c, d):
        return 'S4'

    def m6(self, a, b, c, d, e, f):
        return 'S6'


def _unbound_call_runs_the_named_class():
    """The defect: every arity must answer BASE's implementation, not the
    override on the instance's own class."""
    s = Sub()
    return (Base.m0(s), Base.m1(s, 1), Base.m2(s, 1, 2),
            Base.m3(s, 1, 2, 3), Base.m4(s, 1, 2, 3, 4))


def _the_subclass_form_still_names_the_subclass():
    s = Sub()
    return (Sub.m3(s, 1, 2, 3), Sub.m4(s, 1, 2, 3, 4))


def _an_ordinary_call_is_still_virtual():
    """The counterpart: a plain call through the instance must keep
    dispatching to the override."""
    s = Sub()
    return (s.m3(1, 2, 3), s.m4(1, 2, 3, 4))


def _explicit_parent_call_terminates():
    """The idiom the defect broke, stated as the recursion it caused."""

    class P:
        def m4(self, a, b, c, d):
            return 'P4'

    class C(P):
        def m4(self, a, b, c, d):
            return 'C4+' + P.m4(self, a, b, c, d)

    return _outcome(lambda: C().m4(1, 2, 3, 4))


check('unbound_call_runs_the_named_class',
      _unbound_call_runs_the_named_class(),
      ('B0', 'B1:1', 'B2:12', 'B3:123', 'B4:1234'))
check('the_subclass_form_still_names_the_subclass',
      _the_subclass_form_still_names_the_subclass(), ('S3', 'S4'))
check('an_ordinary_call_is_still_virtual',
      _an_ordinary_call_is_still_virtual(), ('S3', 'S4'))
check('explicit_parent_call_terminates', _explicit_parent_call_terminates(),
      ('ok', 'C4+P4'))


# --------------------------------------- a metaclass __new__ with an extra
# parameter, which is the same dispatch in its sharpest form

class Meta4(type):
    """`__new__` with a fifth parameter: four arguments after `cls`, which
    is exactly the arity the table stopped short of."""

    def __new__(cls, name, bases, ns, otherarg):
        self = super().__new__(cls, name, bases, ns)
        self.otherarg = otherarg
        return self


class Meta3(type):
    def __new__(cls, name, bases, ns):
        return super().__new__(cls, name, bases, ns)


def _a_metaclass_new_with_an_extra_parameter():
    class C(metaclass=Meta4, otherarg=1):
        pass

    return C.otherarg


def _a_plain_metaclass_new_still_works():
    class C(metaclass=Meta3):
        pass

    return C.__name__


def _calling_that_new_directly():
    return _outcome(lambda: Meta4.__new__(Meta4, 'X', (), {}, 7).__name__)


check('a_metaclass_new_with_an_extra_parameter',
      _a_metaclass_new_with_an_extra_parameter(), 1)
check('a_plain_metaclass_new_still_works',
      _a_plain_metaclass_new_still_works(), 'C')
check('calling_that_new_directly', _calling_that_new_directly(), ('ok', 'X'))


# ------------------------------------------- type.__new__ is positional-only

def _type_new_by_keyword_is_refused():
    """CPython takes the three arguments positionally ONLY; before PEP 487
    the keyword spelling appeared to work and silently built a class whose
    keywords went nowhere."""

    class MyMeta(type):
        def __new__(cls, name, bases, namespace):
            return super().__new__(cls, name=name, bases=bases,
                                   dict=namespace)

    def go():
        class C(metaclass=MyMeta):
            pass
        return C

    return _outcome(go)[0]


def _type_new_positionally_still_builds():
    return _outcome(lambda: type.__new__(type, 'X', (), {}).__name__)


check('type_new_by_keyword_is_refused', _type_new_by_keyword_is_refused(),
      'TypeError')
check('type_new_positionally_still_builds',
      _type_new_positionally_still_builds(), ('ok', 'X'))


# ------------------------------------------------ types.prepare_class

def _prepare_class_pops_the_metaclass():
    """It answers the metaclass and the REMAINING keywords, and must not
    raise for a keyword the metaclass could not accept -- that becomes an
    error only when new_class forwards it to the call."""
    import types as _types

    class MyMeta(type):
        pass

    meta, ns, kwds = _types.prepare_class(
        "C", (object,), dict(metaclass=MyMeta, otherarg=1))
    return (meta is MyMeta, dict(kwds), ns == {})


def _prepare_class_defaults_to_the_bases_metaclass():
    import types as _types

    class MyMeta(type):
        pass

    class WithMeta(metaclass=MyMeta):
        pass

    meta, _ns, kwds = _types.prepare_class("C", (WithMeta,), None)
    return (meta is MyMeta, dict(kwds))


def _prepare_class_with_no_bases_is_type():
    import types as _types
    meta, _ns, kwds = _types.prepare_class("C")
    return (meta is type, dict(kwds))


check('prepare_class_pops_the_metaclass',
      _prepare_class_pops_the_metaclass(), (True, {'otherarg': 1}, True))
check('prepare_class_defaults_to_the_bases_metaclass',
      _prepare_class_defaults_to_the_bases_metaclass(), (True, {}))
check('prepare_class_with_no_bases_is_type',
      _prepare_class_with_no_bases_is_type(), (True, {}))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
