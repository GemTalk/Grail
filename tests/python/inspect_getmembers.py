# inspect.getmembers: the two things it does beyond walking dir().
#
# Grail's version was dir() + getattr(), dropping anything getattr refused.
# CPython's does two more things, and both exist for attributes dir() alone
# cannot reach:
#
#   * a name dir() offers but getattr() refuses is looked up in the MRO's
#     __dict__s rather than dropped.  A descriptor may decline to produce a
#     value while still being a real member -- CPython's own comment is "some
#     descriptors don't return meaningful values and are only implemented for
#     the sake of __dir__".
#
#   * every DynamicClassAttribute in a base's __dict__ is ADDED to the candidate
#     names.  Such a descriptor deliberately hides itself from the class -- it
#     routes class access to the metaclass -- so dir() never offers it.
#
# The second is what test_enum's test_inspect_getmembers is about: Enum.name and
# Enum.value are DynamicClassAttributes, which is why CPython reports them for
# any enum class.  See the note at the bottom for why that test is not closed by
# this file.

import inspect
import types


class Base:
    @types.DynamicClassAttribute
    def hidden(self):
        return 'from instance'


class Sub(Base):
    pass


def dynamic_class_attribute_is_reported():
    """A DynamicClassAttribute on a base is a member of the subclass even
    though dir() does not offer it."""
    return 'hidden' in dict(inspect.getmembers(Sub))


def the_descriptor_itself_is_reported():
    """Not the value it would compute -- getattr on the CLASS does not produce
    one, so the __dict__ entry is what is reported."""
    return dict(inspect.getmembers(Sub))['hidden'] is Base.__dict__['hidden']


class BogusDir:
    def __dir__(self):
        return ['nonexistent']


def a_name_nothing_backs_is_skipped():
    """A __dir__ offering a name with no attribute and no __dict__ entry is
    discarded rather than raising."""
    return 'nonexistent' not in dict(inspect.getmembers(BogusDir()))


def ordinary_members_are_unaffected():
    """The common path still answers what it always did."""
    members = dict(inspect.getmembers(Sub))
    return 'hidden' in members and '__class__' in members


def getmro_answers_the_mro():
    """inspect.getmro is CPython's public spelling of cls.__mro__."""
    mro = inspect.getmro(Sub)
    return mro[0] is Sub and mro[1] is Base and mro[-1] is object


def predicate_still_filters():
    names = [n for n, v in inspect.getmembers(Sub, callable)]
    return 'hidden' not in names


# NOT closed by this file: test_enum's test_inspect_getmembers also wants
# ``name`` and ``value`` reported for an enum class.  In CPython those are
# DynamicClassAttributes in Enum.__dict__; in Grail they are compiled Smalltalk
# accessors, so Enum.__dict__['name'] is an UnboundMethod and the sweep above
# finds nothing to add.  Closing it means giving Enum real descriptor instances,
# which is a change to enum's attribute machinery rather than to inspect.


# scripts/check_python_fixtures.sh runs this under CPython in CI.
if __name__ == '__main__':
    checks = [
        dynamic_class_attribute_is_reported,
        the_descriptor_itself_is_reported,
        a_name_nothing_backs_is_skipped,
        ordinary_members_are_unaffected,
        getmro_answers_the_mro,
        predicate_still_filters,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
