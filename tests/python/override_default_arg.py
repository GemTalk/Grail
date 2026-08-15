"""Fixtures for overriding a base method with an EXTRA DEFAULTED parameter.

Driven by nothing yet -- see the KNOWN GRAIL GAP note below.  Each check answers
True when the behaviour matches CPython.

THE RULE: an override replaces the base method for every caller, including code
inside the base class.  Widening the signature with a defaulted parameter is
still an override; Python dispatches on the NAME.

This is the shape stdlib subclassing takes whenever CPython grows a keyword --
``def format_frame_summary(self, frame_summary, colorize=False)'' overriding a
base ``def format_frame_summary(self, frame_summary)'' is real code from
test_traceback's test_custom_format_frame.

WHERE GRAIL DIFFERS: a simple-positional def compiles to a FIXED-ARITY Smalltalk
selector (``m:''), while a def with a default compiles to the varargs form
(``_m:kw:'').  Base-class code calling ``self.m(x)'' emits a fixed-arity send, so
it finds the BASE's ``m:'' and never reaches the subclass's ``_m:kw:''.  Calls
from outside go through attribute lookup, which resolves by name and works -- so
the bug is invisible from the caller's side and only shows up for calls made
from within the base class.

Run this file under CPython (``python3 tests/python/override_default_arg.py'')
to see what it produces -- that is where the expectations come from.
"""


class Base:
    def m(self, x):
        return 'BASE'

    def call_internally(self, x):
        """The base calling its own overridable method -- the case that breaks."""
        return self.m(x)


class SameArity(Base):
    def m(self, x):
        return 'SUB'


class ExtraDefault(Base):
    def m(self, x, flag=False):
        return 'SUB'


class ExtraDefaultUsed(Base):
    def m(self, x, flag=False):
        return 'SUB-%s' % flag


def a_same_arity_override_wins_from_outside():
    return SameArity().m(1) == 'SUB'


def a_same_arity_override_wins_from_base_code():
    """The control: identical signatures already dispatch correctly."""
    return SameArity().call_internally(1) == 'SUB'


def an_extra_default_override_wins_from_outside():
    """Attribute lookup resolves by NAME, so this half already works."""
    return ExtraDefault().m(1) == 'SUB'


def an_extra_default_override_wins_from_base_code():
    """KNOWN GRAIL GAP -- answers 'BASE' there.

    The base's ``self.m(x)'' compiles to a fixed-arity send that the subclass's
    varargs selector does not answer, so the override is silently skipped.
    Silently is the problem: no DNU, no error, just the wrong method."""
    return ExtraDefault().call_internally(1) == 'SUB'


def the_default_is_applied_when_the_base_calls_it():
    """KNOWN GRAIL GAP.  Beyond picking the right method, the omitted argument
    has to take its default."""
    return ExtraDefaultUsed().call_internally(1) == 'SUB-False'


def the_override_still_accepts_the_extra_argument():
    return ExtraDefaultUsed().m(1, True) == 'SUB-True'


# scripts/check_python_fixtures.sh runs this under CPython in CI.
if __name__ == '__main__':
    checks = [
        a_same_arity_override_wins_from_outside,
        a_same_arity_override_wins_from_base_code,
        an_extra_default_override_wins_from_outside,
        an_extra_default_override_wins_from_base_code,
        the_default_is_applied_when_the_base_calls_it,
        the_override_still_accepts_the_extra_argument,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
