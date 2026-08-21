"""A user-defined ``__getattribute__`` intercepts EVERY attribute read.

CPython routes every attribute read through ``type(obj).__getattribute__`` --
tp_getattro IS that slot -- so a class that defines it sees reads of names that
exist as much as reads of names that do not, reads made by ``getattr()``, and
the read a method call performs.  Grail consulted ``__getattribute__`` nowhere,
so a user-defined one never ran: not for a missing name, not for a class
attribute, not for an instance attribute, and not through getattr().

Two shapes here are the ones that broke while fixing that, and both are the
reason the fix is narrow.  ``__getattribute__`` raising AttributeError to reach
``__getattr__`` is django's LazyObject, and it must not have its exception
rewritten in terms of the outer name.  A class attribute written over an
inherited method (``greet = Helper.greet``) compiles to a forwarder that asks
whether the attribute is really there -- an implementation question CPython
answers without calling __getattribute__ -- so that lookup has to step past the
hook, and past every hook in a hierarchy that has more than one, while leaving
a class with no hook alone.

Every expectation below was measured against CPython 3.14.6.
"""

RESULTS = {}
LOG = []


def check(name, fn, expected):
    # True, or a description of what happened instead -- the description is what
    # makes a FAIL line here readable without a second run to find the actual.
    try:
        actual = fn()
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)
        return
    RESULTS[name] = True if actual == expected else 'got %r, want %r' % (
        actual, expected)


# --------------------------------------------- the hook sees every kind of read

class Watched:
    kind = 'class-attr'

    def __init__(self, value):
        self.value = value

    def method(self):
        return 'method-result'

    def __getattribute__(self, name):
        LOG.append(name)
        return object.__getattribute__(self, name)


_w = Watched(7)

check('instance_attr_read', lambda: _w.value, 7)
check('class_attr_read', lambda: _w.kind, 'class-attr')
check('method_call', lambda: _w.method(), 'method-result')
check('getattr_builtin_read', lambda: getattr(_w, 'value'), 7)


def _missing_name():
    try:
        return _w.absent
    except AttributeError as exc:
        return 'AttributeError: %s' % exc


check('missing_name_raises', _missing_name,
      "AttributeError: 'Watched' object has no attribute 'absent'")

# The hook ran for each read above, in order -- and for nothing else, because
# ``self.value = value`` in __init__ is a STORE, which __getattribute__ never
# sees.
check('hook_saw_every_read', lambda: list(LOG),
      ['value', 'kind', 'method', 'value', 'absent'])


# ------------------------------------------------------ delegating with super()

class Shouting:
    def __init__(self):
        self.raw = 'quiet'

    def __getattribute__(self, name):
        value = super().__getattribute__(name)
        if isinstance(value, str):
            return value.upper()
        return value


check('super_delegation', lambda: Shouting().raw, 'QUIET')


# -------------------------- an AttributeError from the hook reaches __getattr__

class Lazy:
    def __getattribute__(self, name):
        if name == 'deferred':
            raise AttributeError(name)
        return object.__getattribute__(self, name)

    def __getattr__(self, name):
        return 'from __getattr__: %s' % name


check('hook_raise_reaches_getattr', lambda: Lazy().deferred,
      'from __getattr__: deferred')


# ------------------- an AttributeError raised INSIDE the hook travels untouched

class Inner:
    pass


class Outer:
    def __getattribute__(self, name):
        return Inner().blich


def _nested_error():
    try:
        return Outer().something
    except AttributeError as exc:
        return str(exc)


check('nested_error_keeps_its_own_message', _nested_error,
      "'Inner' object has no attribute 'blich'")


# -------------- a class attribute shadowing an inherited method, under the hook

class Base:
    def greet(self):
        return 'base'


class Helper:
    def greet(self):
        return 'helper'


class Shadowing(Base):
    greet = Helper.greet

    def __getattribute__(self, name):
        return object.__getattribute__(self, name)


check('shadowed_method_under_hook', lambda: Shadowing().greet(), 'helper')


# Two hook layers in one hierarchy: each class intercepts for its own
# instances, so the shadow lookup has to step past BOTH.
class ShadowingChild(Shadowing):
    greet = Helper.greet

    def __getattribute__(self, name):
        return super().__getattribute__(name)


check('shadowed_method_under_nested_hooks',
      lambda: ShadowingChild().greet(), 'helper')


# ...and a class with no hook anywhere keeps the plain behaviour.  This is the
# check that fails if the bypass is written too broadly.
class NoHook(Base):
    greet = Helper.greet


check('shadowed_method_without_hook', lambda: NoHook().greet(), 'helper')


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
