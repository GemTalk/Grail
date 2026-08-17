"""Fixture: a name patched onto the module at RUN TIME shadows ``super'' too.

The companion to super_shadowing_static.py, and the harder half.  There the
binding is in the module body, so the parser sees it and Grail can suppress the
``super()'' rewrite at compile time.  Here the module body binds nothing: the
attribute is set AFTER the module has been compiled, which is what
``unittest.mock.patch(f'{__name__}.super', MySuper)'' does and what test_super's
test_shadowed_dynamic / test_shadowed_dynamic_two_arg require.

CPython needs no special handling for this at all -- it looks the name up on
every call -- so the fixture is really asking whether Grail's compile-time
rewrite can still be overridden at run time.  It can: the generated code probes
the module for a ``super'' attribute and falls back to the builtin proxy, which
is the case every ordinary call in the corpus takes.

setattr on the module is used directly rather than through mock, so the fixture
measures the LANGUAGE behaviour and not the mock port.  (mock's own part -- that
patching a builtin name a module does not define is allowed rather than an
AttributeError -- is covered by the SUnit tests.)
"""

import sys

_this = sys.modules[__name__]


class MySuper:
    msg = "super super"

    def __init__(self, *args):
        self.args = args


class C:
    def zero_arg(self):
        return super().msg

    def two_arg(self):
        return super(1, 2).args


class Base:
    def f(self):
        return "Base.f"


class Derived(Base):
    def f(self):
        return super().f()


def _install():
    setattr(_this, "super", MySuper)


def _remove():
    try:
        delattr(_this, "super")
    except AttributeError:
        pass


r = {}

# BEFORE the patch: the builtin is in force, so a cooperative chain works and
# a missing attribute on the proxy is an AttributeError.  This is the control --
# without it, a fixture that always answered the shadow would look identical.
r["unpatched_chain"] = Derived().f()
try:
    C().zero_arg()
    r["unpatched_missing_attr"] = "NOT RAISED"
except AttributeError:
    r["unpatched_missing_attr"] = "AttributeError"

# UNDER the patch: every ``super'' in the module resolves to the replacement.
_install()
try:
    r["patched_zero_arg"] = C().zero_arg()
    r["patched_two_arg"] = str(C().two_arg())
    # The replacement is in force for a COOPERATIVE class too, which is the
    # sharp edge of the real rule: Derived.f no longer reaches Base.f at all,
    # because ``super()'' is now MySuper() and MySuper has no ``f''.  Recorded
    # rather than assumed -- the first draft of this fixture predicted
    # ``Base.f'' and CPython raised.
    try:
        r["patched_derived"] = Derived().f()
    except AttributeError as exc:
        r["patched_derived"] = "AttributeError: " + str(exc)
finally:
    _remove()

# AFTER removing it: back to the builtin.  Cheap to check and worth checking --
# a shadow left installed would silently change every later class in the module.
r["restored_chain"] = Derived().f()


EXPECTED = {
    "unpatched_chain": "Base.f",
    "unpatched_missing_attr": "AttributeError",
    "patched_zero_arg": "super super",
    "patched_two_arg": "(1, 2)",
    "patched_derived": "AttributeError: 'MySuper' object has no attribute 'f'",
    "restored_chain": "Base.f",
}


if __name__ == "__main__":
    for key, expected in EXPECTED.items():
        actual = r[key]
        print("%-4s %s -> %r" % ("OK" if actual == expected else "FAIL",
                                 key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print("%-4s %s is not in EXPECTED" % ("FAIL", extra))
