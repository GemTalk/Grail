"""Fixture for FunctionScopeImportTestCase.

An import is a BINDING, so it has to agree with how the name is later read.
Grail's import codegen decided "does this write go to the module instance or
to a Smalltalk temp?" by asking only whether the name is a module variable --
which is true of a function-local import whenever the module ALSO imports
that name.  So the write went to the module while the read looked at the
function's local, and the name came back unbound:

    import os.path
    def f():
        import os.path      # stored on the module...
        return os.path.sep  # ...read as a local -> UnboundLocalError

All three import forms were affected -- plain, dotted, and from-import --
whenever the bound name was also bound at module scope.  Every other binding
statement (assignment, augmented assignment, for-target, del) already applied
the local-shadow rule; the two import statements did not.

Names imported at module scope here are deliberately re-imported inside the
functions below; that collision IS the bug.
"""

import os.path
import json
from math import floor

MODULE_LEVEL_SENTINEL = object()


def dotted_shadow():
    import os.path

    return os.path.sep


def plain_shadow():
    import json

    return json.dumps([1])


def from_shadow():
    from math import floor

    return floor(2.7)


def aliased_shadow():
    import os.path as json  # alias collides with a module-level name

    return json.sep


def nested_shadow():
    def inner():
        import json

        return json.dumps([2])

    return inner()


def no_shadow_dotted():
    import html.entities

    return html.entities.__name__


def no_shadow_plain():
    import struct

    return struct.calcsize("b")


def no_shadow_from():
    from math import ceil

    return ceil(2.1)


class Holder:
    def method_shadow(self):
        import json

        return json.dumps([3])


_global_import_ran = False


def global_declared_import():
    """``global`` forces the module binding even for an import."""
    global _global_import_ran
    global json
    import json

    _global_import_ran = True
    return json.dumps([4])


def module_scope_still_works():
    """The module-level imports must still resolve from a function that does
    NOT re-import them."""
    return (os.path.sep, json.dumps([5]), floor(3.7))


def _call(fn):
    """Never raises, so one broken case cannot hide the verdict on the rest."""
    try:
        return fn()
    except Exception as e:
        return "FAILED:%s" % type(e).__name__


def probe():
    results = {
        "dotted_shadow": _call(dotted_shadow),
        "plain_shadow": _call(plain_shadow),
        "from_shadow": _call(from_shadow),
        "aliased_shadow": _call(aliased_shadow),
        "nested_shadow": _call(nested_shadow),
        "no_shadow_dotted": _call(no_shadow_dotted),
        "no_shadow_plain": _call(no_shadow_plain),
        "no_shadow_from": _call(no_shadow_from),
        "method_shadow": _call(Holder().method_shadow),
        "global_declared_import": _call(global_declared_import),
    }
    # After a ``global json; import json`` the module binding must still be
    # the json module, not a leftover local.
    results["module_scope_still_works"] = _call(module_scope_still_works) == (
        os.path.sep,
        '[5]',
        3,
    )
    return results
