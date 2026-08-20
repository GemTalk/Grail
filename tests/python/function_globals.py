"""``func.__globals__'' -- the LIVE namespace of the module a callable was
defined in.

Driven by PythonTests>>FunctionGlobalsTestCase.  Each check answers True when
Grail agrees with CPython, so a failure names the exact rule.

IDENTITY IS THE WHOLE CONTRACT, which is why nearly every check below uses
``is'' rather than ``==''.  CPython's ``f.__globals__'' is the module's actual
namespace dict -- the same object ``globals()'' answers inside that module and
the same one ``mod.__dict__'' does -- so a name rebound through any of them is
visible through all of them.  A per-read copy would satisfy an equality check
and still be wrong: the whole use of __globals__ is to resolve a free name the
way the defining module would, and a snapshot stops tracking the module the
moment either side changes.

WHY IT WAS MISSING.  Grail's function objects are Smalltalk blocks and bound
methods; neither carries a namespace.  ``__globals__'' was already listed among
the read-only function attributes, so WRITING it raised correctly -- only the
READ was absent, which is an unusual shape for a gap and made it look
implemented from one side.

The subtler half was not the resolution but the ATTRIBUTE PROTOCOL.  Grail wraps
a dunder read as a bound method unless the class lists it as a value attribute,
so the first working version answered a BoundMethod object here rather than the
dict -- ``top.__globals__ is globals()'' was False and
``type(top.__globals__).__name__'' was 'BoundMethod'.  That reads as an identity
bug and is really an attribute that was never evaluated, which is what
a_module_level_function_sees_a_mapping pins.
"""

MODULE_MARKER = object()


def top_level():
    pass


def outer():
    def nested():
        pass
    return nested


_nested = outer()


class Holder:
    def meth(self):
        pass


def _other_top_level():
    pass


def a_module_level_function_sees_its_module_globals():
    return top_level.__globals__ is globals()


def a_nested_function_sees_the_same_globals():
    """A nested def is a different kind of object in Grail (a block rather than
    a bound method), and the two resolve their module by different routes, so
    this is not a restatement of the check above."""
    return _nested.__globals__ is globals()


def a_method_sees_its_defining_modules_globals():
    return Holder.meth.__globals__ is globals()


def a_bound_method_sees_them_too():
    return Holder().meth.__globals__ is globals()


def two_functions_in_one_module_share_one_globals():
    return top_level.__globals__ is _other_top_level.__globals__


def a_module_level_function_sees_a_mapping():
    """NOT a callable.  This is the check for the attribute-protocol half: the
    resolution can be perfectly correct and still be delivered wrapped."""
    g = top_level.__globals__
    return hasattr(g, 'keys') and not callable(g) and 'MODULE_MARKER' in g


def globals_are_live_not_a_snapshot():
    """The reason identity matters rather than equality.  A name bound through
    globals() after the function was defined must be visible through its
    __globals__, and vice versa."""
    g = top_level.__globals__
    globals()['_probe_planted'] = 41
    try:
        if g.get('_probe_planted') != 41:
            return 'a name planted in globals() was not visible via __globals__'
        g['_probe_planted'] = 42
        if globals().get('_probe_planted') != 42:
            return 'a name written via __globals__ was not visible in globals()'
        return True
    finally:
        del globals()['_probe_planted']


def globals_cannot_be_assigned():
    try:
        top_level.__globals__ = {}
    except (AttributeError, TypeError):
        return True
    return 'assigning __globals__ was accepted'


def globals_cannot_be_deleted():
    try:
        del top_level.__globals__
    except (AttributeError, TypeError):
        return True
    return 'deleting __globals__ was accepted'


if __name__ == '__main__':
    checks = [
        a_module_level_function_sees_its_module_globals,
        a_nested_function_sees_the_same_globals,
        a_method_sees_its_defining_modules_globals,
        a_bound_method_sees_them_too,
        two_functions_in_one_module_share_one_globals,
        a_module_level_function_sees_a_mapping,
        globals_are_live_not_a_snapshot,
        globals_cannot_be_assigned,
        globals_cannot_be_deleted,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
