# Fixture for ClassAttrDictSubclassTestCase.
#
# Class-body data attributes (``flag = False``) on a built-in subclass
# (``class Flags(dict): ...``) were invisible to instances: object's
# ``___pyAttrLoad___`` only consulted the metaclass-side ``Grail-Class
# Attrs`` accessors when the receiver was a PythonInstance, but a ``dict``
# subclass instance is a KeyValueDictionary (and a ``list`` subclass is an
# OrderedCollection) -- neither is a PythonInstance.  Reading the class
# attribute therefore raised ``AttributeError``.
#
# flask's ``SecureCookieSession(CallbackDict, SessionMixin)`` is a ``dict``
# subclass that reads ``session.accessed`` / ``session.modified`` -- both
# class-body defaults -- so the WSGI response path tripped over this.


class Flags(dict):
    flag = False
    accessed = True

    def __init__(self):
        super().__init__()


def instance_reads_own_class_attr():
    f = Flags()
    return [f.flag, f.accessed]


def class_reads_own_class_attr():
    return [Flags.flag, Flags.accessed]


def instance_attr_overrides_class_default():
    f = Flags()
    f.flag = True
    return [f.flag, f.accessed]


class ListFlags(list):
    marker = 42

    def __init__(self):
        super().__init__()


def list_subclass_instance_attr():
    lf = ListFlags()
    return lf.marker
