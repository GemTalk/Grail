# Regression fixture for the setattr-precheck bug fixed during Phase A.
#
# A PythonInstance subclass with no static setter for a name still has
# its DNU handler route setter calls into the per-instance __dict__.
# An earlier `builtins>>setattr:` used `whichClassIncludesSelector:` to
# decide whether a static `name:` setter existed; that precheck saw
# nil, took the fallback branch, and stored the value via
# `dynamicInstVarAt:put:` on the receiver — bypassing __dict__
# entirely.  After the `on:do: MessageNotUnderstood` refactor, the
# perform: actually fires DNU, the handler captures the call, and the
# value lands where Python expects it.
#
# This fixture lays the trap: a class with no declared `extra` field,
# a setattr call from outside, and a getattr round-trip.  If setattr
# misroutes to dynamicInstVarAt, getattr (which goes through
# __pyAttrLoad__ → __dict__) will return None and the assertion fails.


class HasNoStaticExtra:
    """An empty class.  No `extra` instVar, no `extra:` setter
    synthesized by ClassDefAst because the source never assigns to
    self.extra in __init__ or class body."""

    def __init__(self):
        pass


_inst = HasNoStaticExtra()

# Bypass the synthesized setter chain entirely — call the builtin,
# which is the path that exhibited the bug.
setattr(_inst, 'extra', 42)

# Round-trip via getattr.  If setattr correctly went through the DNU
# handler, the value lives in __dict__ and getattr finds it.  If
# setattr misrouted to a Smalltalk dynamic instVar on the receiver,
# getattr returns None (or raises AttributeError, depending on the
# fallback chain).
extra_value = getattr(_inst, 'extra')
extra_present = hasattr(_inst, 'extra')
