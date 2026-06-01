# Fixture for UnboundMethodTestCase.
#
# Calling an instance method via the class, passing the receiver explicitly
# -- ``ParentClass.method(self, *args, **kwargs)`` -- is the unbound-method /
# explicit-super-init pattern.  Grail used to dispatch it as a class-side
# (metaclass) send and raise MessageNotUnderstood; object>>___pyAttrLoad___
# now returns an UnboundMethod that runs the named class's own instance
# method on the explicitly-passed receiver.  flask's
# ``Environment.__init__`` calls ``BaseEnvironment.__init__(self, **options)``
# this way.


class VBase:
    def __init__(self, a=1, **kw):
        self.a = a
        self.extra = dict(kw)

    def label(self):
        return "vbase"


class VSub(VBase):
    def __init__(self, tag, **opts):
        # Explicit parent init of a VARARGS __init__ (has a default + **kw).
        VBase.__init__(self, **opts)
        self.tag = tag


class FBase:
    def __init__(self, a):
        self.a = a


class FSub(FBase):
    def __init__(self, tag, a):
        # Explicit parent init of a fixed-arity __init__.
        FBase.__init__(self, a)
        self.tag = tag


def varargs_parent_init():
    # The inherited no-op object.__init__ must NOT shadow VBase's own
    # ___init__:kw: — the resolver picks the closest class's form.
    s = VSub("t", x=9)
    return [s.a, s.tag, s.extra.get("x")]


def fixed_parent_init():
    s = FSub("t", 5)
    return [s.a, s.tag]


def explicit_parent_method():
    # A plain (non-__init__) instance method called unbound via the class.
    v = VSub("t")
    return VBase.label(v)
