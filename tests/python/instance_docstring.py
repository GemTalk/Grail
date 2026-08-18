"""An instance's ``__doc__'' is its CLASS's docstring -- None when there is none.

CPython puts a ``__doc__'' entry in EVERY class's __dict__, holding the
docstring or None, so an instance's lookup stops at its own type and never
reaches object's.  ``class Plain: pass'' therefore gives
``Plain().__doc__ is None''.

Grail's ``object'' IS the kernel Object, so ``object >> __doc__'' sits at the
root of everything and used to answer object's own docstring unconditionally.
Every instance in the system claimed to be documented as ``The base class of the
class hierarchy'', and inspect.getdoc -- whose entire job is to find the nearest
REAL docstring -- could never answer None.  pydoc printed those four lines under
each member of an enum.

The second half covers the other way a docstring lookup went wrong.  Reading
metadata off an unbound method (``Cls.m.__module__'') answered Smalltalk NIL
when it could not find a string, on the reasoning that functools.wraps would
then skip the name.  It does not skip: nil is not an AttributeError, so getattr
handed it straight back and an object with no Python meaning escaped into Python
code.  pydoc's parentname does ``object.__module__ + '.' + name'' and received
it, raising ``UnboundLocalError: local variable referenced before assignment''
from inside docroutine -- naming neither the attribute nor the class.  These
checks are phrased as ``is it a string'' / ``does it read as a Python name''
rather than pinned to exact values, because the values legitimately differ
between the two implementations; what must not differ is that they are Python
values at all.
"""

import inspect
from enum import Enum


class Plain:
    pass


class Documented:
    """One line summary."""


class Sub(Documented):
    pass


class Meth:
    def m(self):
        """Method docstring."""


class Color(Enum):
    CYAN = 1


r = {}

# --- classes were already right; instances were not -------------------------------------
r['plain_class'] = repr(Plain.__doc__)
r['plain_instance'] = repr(Plain().__doc__)
r['documented_class'] = repr(Documented.__doc__)
r['documented_instance'] = repr(Documented().__doc__)
# A SUBCLASS does not inherit its base's docstring in CPython -- Sub's own
# __dict__ entry is None -- and neither does an instance of one.
r['sub_class'] = repr(Sub.__doc__)
r['sub_instance'] = repr(Sub().__doc__)
r['method'] = repr(Meth.m.__doc__)

# inspect.getdoc is the consumer that cannot work without the None: it exists to
# report "no docstring here", and every object answered object's instead.
r['getdoc_undocumented'] = repr(inspect.getdoc(Plain()))
r['getdoc_documented'] = repr(inspect.getdoc(Documented()))

# object itself keeps its docstring -- the fix is about where the lookup STOPS,
# not about removing it.
r['object_still_documented'] = repr(object.__doc__.splitlines()[0])

# An enum member is an instance, and this is the shape pydoc rendered wrongly.
r['enum_member'] = repr(Color.CYAN.__doc__)

# --- unbound-method metadata is a Python value, always -----------------------------------
_len = Color.__len__
_func = getattr(_len, '__func__', _len)
r['unbound_module_is_str'] = repr(isinstance(_func.__module__, str))
r['unbound_qualname_is_str'] = repr(isinstance(_func.__qualname__, str))
# A Smalltalk metaclass is spelled ``Color class'' -- two words.  A Python
# qualified name never contains a space, so this catches the metaclass leaking
# into the name without pinning which class Grail reports.
r['unbound_qualname_is_a_name'] = repr(' ' not in _func.__qualname__)
r['method_module_is_str'] = repr(isinstance(Meth.m.__module__, str))
r['method_qualname'] = repr(Meth.m.__qualname__)


EXPECTED = {
    'documented_class': "'One line summary.'",
    'documented_instance': "'One line summary.'",
    'enum_member': 'None',
    'getdoc_documented': "'One line summary.'",
    'getdoc_undocumented': 'None',
    'method': "'Method docstring.'",
    'method_module_is_str': 'True',
    'method_qualname': "'Meth.m'",
    'object_still_documented': "'The base class of the class hierarchy.'",
    'plain_class': 'None',
    'plain_instance': 'None',
    'sub_class': 'None',
    'sub_instance': 'None',
    'unbound_module_is_str': 'True',
    'unbound_qualname_is_a_name': 'True',
    'unbound_qualname_is_str': 'True',
}

GRAIL_ONLY = {}


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-28s %s %s' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
    for k in sorted(GRAIL_ONLY):
        actual = r[k]
        print('%-28s %s %s' % (k, 'XPASS' if actual == GRAIL_ONLY[k] else 'XFAIL', actual))
