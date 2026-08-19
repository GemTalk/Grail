"""Fixture: a DATA attribute read through ``super()''.

Some attributes are values, not callables.  A Smalltalk-backed Grail class says
so with the class-side ``___pythonValueAttrs___'' hook, and the ordinary read
path has always honoured it -- ``s.family'' answers 2, not a bound method.
``super().family'' did not: it answered a SuperBoundMethod, a callable proxy,
where a value was due.  Silently, because a proxy is a perfectly good object
right up to the moment something treats it as a number.

THIS IS NOT A CORNER.  It is the shape CPython's own socket.py uses to widen
the primitive layer's ints into IntEnums:

    @property
    def family(self):
        return _intenum_converter(super().family, AddressFamily)

so with the proxy, the facade's family/type came out as ``<SuperBoundMethod
object at 0x...>''.  The checks below are that code's shape exactly, over
_socket.socket -- a type whose family/type/proto/timeout ARE data attributes in
CPython too, which is what lets this fixture run on both.

WHY IT IS CALLED THROUGH THE PROXY rather than performed on the instance: the
property doing the super() call is itself the most derived ``family'', so
performing the name on the object would re-enter it.  The proxy resolves
against the parent chain, which is what super() means, so the fix builds the
proxy and invokes it with no arguments.

``method_via_super*'' are the controls that matter.  Only names the parent
advertises as VALUE attributes may be invoked on read; an ordinary method
reached through super() must still come back as something callable, and a
method taking arguments must still receive them.  A fix that eagerly invoked
everything would pass the first checks and break every ``super().m(...)'' in
the corpus.

STILL BROKEN, and recorded rather than hidden: a plain Python ``@property'' on
a parent, read through super(), also comes back as a proxy.  That is a
DIFFERENT mechanism -- Grail recognises such a property by a getter/setter
PAIR of compiled methods, a test that lives inline in object >>
___pyAttrLoad___ with several measured exclusions -- so reusing it here means
factoring that predicate out of the hottest path in the system, which deserves
its own change.  ``pure_python_property_via_super_is_a_proxy'' asserts the
limitation, so CPython is expected to DISAGREE with it (XFAIL); the day it
reads XPASS, the gap is closed and the check should be inverted.
"""

import _socket

RESULTS = {}
GRAIL_ONLY = ['pure_python_property_via_super_is_a_proxy']


def check(name, fn, expected):
    try:
        RESULTS[name] = (fn() == expected)
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)


# --------------------------------------------- socket.py's shape, exactly
class Sock(_socket.socket):
    """A subclass whose properties widen the parent's data attributes."""

    @property
    def family(self):
        return super().family

    @property
    def type(self):
        return super().type

    @property
    def proto(self):
        return super().proto

    @property
    def timeout(self):
        return super().timeout

    def fileno_via_super(self):
        return super().fileno()

    def settimeout_via_super(self, n):
        return super().settimeout(n)

    def gettimeout_via_super(self):
        return super().gettimeout()


def _with_sock(fn):
    s = Sock(_socket.AF_INET, _socket.SOCK_STREAM)
    try:
        return fn(s)
    finally:
        s.close()


check('value_attr_family', lambda: _with_sock(lambda s: s.family),
      _socket.AF_INET)
check('value_attr_type', lambda: _with_sock(lambda s: s.type),
      _socket.SOCK_STREAM)
check('value_attr_proto', lambda: _with_sock(lambda s: s.proto), 0)
check('value_attr_timeout_is_none', lambda: _with_sock(lambda s: s.timeout),
      None)
check('value_attr_is_an_int',
      lambda: _with_sock(lambda s: isinstance(s.family, int)), True)
def _agrees_with_a_plain_socket(s):
    """The super()-derived value must equal what an unsubclassed socket
    reports directly -- i.e. the proxy is not merely gone, the right value
    arrived."""
    plain = _socket.socket(_socket.AF_INET, _socket.SOCK_STREAM)
    try:
        return s.family == plain.family and s.type == plain.type
    finally:
        plain.close()


check('value_attr_agrees_with_a_plain_socket',
      lambda: _with_sock(_agrees_with_a_plain_socket), True)

# ------------------------------------------------------- the controls
check('method_via_super_is_still_callable',
      lambda: _with_sock(lambda s: s.fileno_via_super() > 0), True)
check('method_via_super_takes_arguments',
      lambda: _with_sock(
          lambda s: (s.settimeout_via_super(1.5), s.gettimeout_via_super())[1]),
      1.5)
check('ordinary_method_via_super_still_binds',
      lambda: _with_sock(lambda s: callable(s.fileno_via_super) ), True)


# A pure-Python method through super() must still chain, not be invoked early.
class Base:
    def m(self):
        return 'base'


class Derived(Base):
    def m(self):
        return 'derived+' + super().m()


check('pure_python_method_via_super', lambda: Derived().m(), 'derived+base')


# ---------------------------------------- the documented remaining gap
class PropBase:
    @property
    def x(self):
        return 7


class PropDerived(PropBase):
    def probe(self):
        return super().x


check('pure_python_property_via_super_is_a_proxy',
      lambda: not isinstance(PropDerived().probe(), int), True)


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        if _name in GRAIL_ONLY:
            continue
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
    # This asserts a Grail LIMITATION, so CPython is expected to disagree.
    # XFAIL is that expected disagreement and is not a failure; XPASS means
    # CPython now agrees and the check no longer documents anything.
    print('--- documented Grail limits: CPython is expected to differ ---')
    for _name in GRAIL_ONLY:
        _v = RESULTS[_name]
        print('%-5s %s' % ('XPASS' if _v is True else 'XFAIL', _name))
