"""Fixtures for overriding a base method with an EXTRA DEFAULTED parameter.

Driven by PythonTests>>OverrideDefaultArgTestCase.  Each check answers True when
the behaviour matches CPython, so a failure names the specific rule.

THE RULE: an override replaces the base method for every caller, including code
inside the base class.  Widening the signature with a defaulted parameter is
still an override; Python dispatches on the NAME.

This is the shape stdlib subclassing takes whenever CPython grows a keyword --
``def format_frame_summary(self, frame_summary, colorize=False)'' overriding a
base ``def format_frame_summary(self, frame_summary)'' is real code from
test_traceback's test_custom_format_frame.

WHERE GRAIL DIFFERED: a simple-positional def compiles to a FIXED-ARITY Smalltalk
selector (``m:''), while a def with a default compiles to the varargs form
(``_m:kw:'').  Base-class code calling ``self.m(x)'' emits a fixed-arity send, so
it found the BASE's ``m:'' and never reached the subclass's ``_m:kw:''.  Calls
from outside go through attribute lookup, which resolves by name and always
worked -- so the bug was invisible from the caller's side and showed up only for
calls made from within the base class.

FunctionDefAst>>needsFixedArityForwarders now emits a fixed-arity forwarder for
each arity a defaulted def accepts, so those sends land on the override.  The
arity-0 forwarder is the delicate one: ``m'' plus ``m:'' is the shape of a
property getter/setter pair, so the forwarders carry their own method category
and ___pyAttrLoad___'s pair test consults it.

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


class ZeroArgBase:
    def m(self):
        return 'BASE'

    def call_internally(self):
        return self.m()


class ZeroArgExtraDefault(ZeroArgBase):
    def m(self, flag=False):
        return 'SUB'


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


def a_zero_arg_override_still_wins_from_outside():
    """Attribute lookup resolves by name whatever the arities are."""
    return ZeroArgExtraDefault().m() == 'SUB'


def a_zero_arg_base_call_reaches_the_override():
    """The hardest shape, and the one that constrained the fix.

    The base method takes no argument beyond self, so reaching the override
    needs a UNARY forwarder -- and ``m'' plus ``m:'' is exactly the shape of a
    synthesized property getter/setter pair.  Grail's attribute path read the
    pair as a property and PERFORMED it, so ``obj.m'' answered the method's
    RESULT and ``obj.m(x)'' then tried to call that result.  It broke ``import
    werkzeug.local'' through re/_parser's ``State.opengroup(self, name=None)'',
    whose result is a group id.

    The forwarders now compile into their own method category and the pair test
    consults it, which tells a forwarder from a setter -- so every override
    shape dispatches, this one included."""
    return ZeroArgExtraDefault().call_internally() == 'SUB'


# scripts/check_python_fixtures.sh runs this under CPython in CI.
if __name__ == '__main__':
    checks = [
        a_same_arity_override_wins_from_outside,
        a_same_arity_override_wins_from_base_code,
        an_extra_default_override_wins_from_outside,
        an_extra_default_override_wins_from_base_code,
        the_default_is_applied_when_the_base_calls_it,
        the_override_still_accepts_the_extra_argument,
        a_zero_arg_override_still_wins_from_outside,
        a_zero_arg_base_call_reaches_the_override,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
