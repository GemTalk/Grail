# Fixture for DunderClassTestCase.
#
# Python: ``obj.__class__'' is a value attribute — reading it
# returns the actual class object, NOT a callable that yields the
# class.  Pre-fix, Grail's ``___pyAttrLoad___'' wrapped any unary
# selector in a BoundMethod (the ``f = obj.method'' first-class
# function pattern); ``__class__'' got caught by that branch and
# downstream code (``object.__new__(self.__class__)'',
# ``isinstance(x, type(y))'', ``type(node).__name__'') sent
# unwanted messages to the wrapper.
#
# Surfaced as the M4 ``{% if %}'' compile blocker — jinja2's
# ``Symbols.copy()'' does ``object.__new__(self.__class__)'' and
# ``new'' MNU'd on a BoundMethod receiver.


class Thing:
    pass


t = Thing()
cls = t.__class__               # the class itself, not a BoundMethod
cls_is_thing = cls is Thing
fresh = object.__new__(t.__class__)  # MNU'd pre-fix
fresh_is_thing = isinstance(fresh, Thing)
fresh_is_not_t = fresh is not t


class Sub(Thing):
    pass


s = Sub()
sub_cls = s.__class__           # Sub (not Thing)
sub_is_sub = sub_cls is Sub
sub_not_thing = sub_cls is not Thing


# __doc__ is also a value attribute (same dunder-whitelist branch).
class Documented:
    """a docstring"""


doc = Documented.__doc__
# (Could be either 'a docstring' or None depending on whether
# class docstrings are wired up; the important assertion is that
# .__doc__ isn't a BoundMethod.)
doc_not_callable = not callable(doc)
