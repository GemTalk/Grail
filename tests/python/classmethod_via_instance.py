"""@classmethod reached through an INSTANCE, across base classes.

Codegen emits a direct instance-side send for ``self.cm(args)``, but
ClassDefAst compiles @classmethod defs onto the METACLASS.  The forward
that bridges the two lived only on PythonInstance, so subclasses of
KERNEL classes (str/bytes/tuple/list/dict) could not reach their own
class methods -- markupsafe's ``Markup.__add__`` calling
``self.escape(value)`` is the real-world case that broke.

A 0-arg class method (``self.cm0()``) missed the forward on EVERY class,
plain ones included, because the unary DNU branch never consulted the
metaclass.
"""


class Plain:
    @classmethod
    def cm(cls, x):
        return "cm:" + cls.__name__ + ":" + str(x)

    @classmethod
    def cm0(cls):
        return "cm0:" + cls.__name__

    @classmethod
    def cmv(cls, x, y=2, *rest):
        return "cmv:" + cls.__name__ + ":" + str(x) + ":" + str(y)

    @staticmethod
    def sm(x):
        return "sm:" + str(x)

    def go(self, x):
        return self.cm(x)

    def go0(self):
        return self.cm0()

    def gov(self, x):
        return self.cmv(x)

    def gos(self, x):
        return self.sm(x)


class StrSub(str):
    @classmethod
    def cm(cls, x):
        return "cm:" + cls.__name__ + ":" + str(x)

    @classmethod
    def cm0(cls):
        return "cm0:" + cls.__name__

    @classmethod
    def cmv(cls, x, y=2, *rest):
        return "cmv:" + cls.__name__ + ":" + str(x) + ":" + str(y)

    def go(self, x):
        return self.cm(x)

    def go0(self):
        return self.cm0()

    def gov(self, x):
        return self.cmv(x)


class BytesSub(bytes):
    @classmethod
    def cm(cls, x):
        return "cm:" + cls.__name__ + ":" + str(x)

    def go(self, x):
        return self.cm(x)


class ListSub(list):
    @classmethod
    def cm(cls, x):
        return "cm:" + cls.__name__ + ":" + str(x)

    def go(self, x):
        return self.cm(x)


class DictSub(dict):
    @classmethod
    def cm(cls, x):
        return "cm:" + cls.__name__ + ":" + str(x)

    def go(self, x):
        return self.cm(x)


class TupleSub(tuple):
    @classmethod
    def cm(cls, x):
        return "cm:" + cls.__name__ + ":" + str(x)

    def go(self, x):
        return self.cm(x)


class Derived(StrSub):
    """Inheriting subclass — `cls` must bind to the DERIVED class."""


# --- Guard: the forward must not swallow a real instance attribute -----------
class SetterStillWorks:
    @classmethod
    def value(cls, x):
        return "classmethod"

    def store(self, v):
        """Non-colliding name — must write an instance attribute."""
        self.stored = v
        return self.stored

    def store_colliding(self, v):
        """Colliding name: a class method ``value`` already exists.

        CPython stores an instance attribute (a classmethod is not a
        data descriptor, so it does not intercept assignment).
        """
        self.value = v
        return "stored"


def plain_cm():
    return Plain().go(1)


def plain_cm0():
    return Plain().go0()


def plain_varargs():
    return Plain().gov(7)


def plain_static():
    return Plain().gos(3)


def strsub_cm():
    return StrSub("a").go(1)


def strsub_cm0():
    return StrSub("a").go0()


def strsub_varargs():
    return StrSub("a").gov(7)


def bytessub_cm():
    return BytesSub(b"a").go(1)


def listsub_cm():
    return ListSub([1]).go(1)


def dictsub_cm():
    return DictSub().go(1)


def tuplesub_cm():
    return TupleSub([1]).go(1)


def derived_binds_derived():
    return Derived("a").go(1)


def setter_still_works():
    return SetterStillWorks().store(42)


def colliding_setter():
    """Returns the stored value, or a marker describing what happened."""
    o = SetterStillWorks()
    o.store_colliding(42)
    got = o.value
    if got == 42:
        return "stored"
    return "shadowed:" + str(type(got).__name__)
