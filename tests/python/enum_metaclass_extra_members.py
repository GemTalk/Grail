# A metaclass that ADDS entries to the class body's mapping, and the enum
# members those entries have to become.
#
#     class IDEnumMeta(EnumMeta):
#         def __new__(metacls, cls, bases, classdict, **kwds):
#             for name in classdict.member_names:
#                 classdict[f'{name}_DESC'] = f'-{classdict[name]}'
#             return super().__new__(metacls, cls, bases, classdict, **kwds)
#
# CPython's ORDER is what makes this work: the metaclass mutates the classdict
# FIRST, and the members are built inside the ``super().__new__`` it delegates
# to -- that call reaches EnumType.__new__, which is the enum's builder.
# _EnumDict.__setitem__ has already appended each injected name to
# ``member_names``, so the builder sees four names, not two.
#
# Grail's order is inverted, and has to be: a class body is compiled onto a
# real Smalltalk class before any hook can run, so Grail's own
# ___pyClassDefined___: hook fires BEFORE the Python metaclass.  Members were
# therefore built from the class body alone and the injected names arrived
# after the enum was already final -- test_enum's
# TestSpecial.test_extra_member_creation got ['ID', 'NAME'].
#
# The build is now DEFERRED when a Python metaclass is going to run, and lands
# in Grail's ``super().__new__`` (type >> __new__:_:_:_:) -- the same point
# CPython builds at.  Re-running the build afterwards would not do: it opens
# with CPython's _check_for_existing_members_, so a second pass over a
# member-bearing class raises "cannot extend".  The order has to move, not the
# number of builds.

from enum import Enum, EnumMeta, IntEnum, StrEnum

r = {}


class IDEnumMeta(EnumMeta):
    def __new__(metacls, cls, bases, classdict, **kwds):
        for name in list(classdict.member_names):
            classdict[f'{name}_DESC'] = f'-{classdict[name]}'
        return super().__new__(metacls, cls, bases, classdict, **kwds)


class IDEnum(StrEnum, metaclass=IDEnumMeta):
    pass


class MyEnum(IDEnum):
    ID = 'id'
    NAME = 'name'


r['members'] = [m.name for m in MyEnum]
r['injected_is_a_member'] = MyEnum.ID_DESC is MyEnum['ID_DESC']
r['injected_value'] = MyEnum.ID_DESC.value
r['lookup_by_value'] = MyEnum('-name').name


# The trace CPython follows, made observable: the mapping must already hold
# the injected names when ``super().__new__`` runs, and the class must hold
# the members when it returns.
trace = []


class TracingMeta(EnumMeta):
    def __new__(metacls, cls, bases, classdict, **kwds):
        trace.append(('entered', list(classdict.member_names)))
        for name in list(classdict.member_names):
            classdict[f'{name}_X'] = classdict[name] + 100
        trace.append(('after_injection', list(classdict.member_names)))
        built = super().__new__(metacls, cls, bases, classdict, **kwds)
        trace.append(('after_super_new', [m.name for m in built]))
        return built


class Traced(IntEnum, metaclass=TracingMeta):
    A = 1
    B = 2


r['trace_entered'] = trace[-3][1]
r['trace_after_injection'] = trace[-2][1]
r['trace_after_super_new'] = trace[-1][1]
r['traced_x_value'] = Traced.A_X.value


# A metaclass that injects NOTHING must leave an ordinary enum alone -- the
# deferral changes WHEN the build happens, never WHAT it produces.
class QuietMeta(EnumMeta):
    def __new__(metacls, cls, bases, classdict, **kwds):
        return super().__new__(metacls, cls, bases, classdict, **kwds)


class Quiet(Enum, metaclass=QuietMeta):
    RED = 1
    GREEN = 2
    BLUE = 2          # an alias, which must stay an alias


r['quiet_members'] = [m.name for m in Quiet]
r['quiet_alias_is_canonical'] = Quiet.BLUE is Quiet.GREEN


# A metaclass __new__ that BYPASSES EnumMeta.__new__ -- calling type.__new__
# directly -- builds no members at all in CPython, because EnumMeta.__new__ IS
# the builder and it never ran.  The class is still an Enum subclass; it just
# has nothing in it.
#
# Grail cannot draw that line today: its member build hangs off
# ``type >> __new__:_:_:_:'', which is the very call this metaclass makes, so
# the deferral is fulfilled and the members appear.  A RECORDED DIVERGENCE,
# below in GRAIL_ONLY, rather than a silent one -- separating the two would
# mean giving EnumMeta its own construction entry point, which nothing in
# test_enum needs.
class NoSuperMeta(EnumMeta):
    def __new__(metacls, cls, bases, classdict, **kwds):
        return type.__new__(metacls, cls, bases, dict(classdict))


class Bypassing(Enum, metaclass=NoSuperMeta):
    ONE = 1


r['bypassing_members'] = [m.name for m in Bypassing]


EXPECTED = {
    'injected_is_a_member': 'True',
    'injected_value': "'-id'",
    'lookup_by_value': "'NAME_DESC'",
    'members': "['ID', 'NAME', 'ID_DESC', 'NAME_DESC']",
    'quiet_alias_is_canonical': 'True',
    'quiet_members': "['RED', 'GREEN']",
    'trace_after_injection': "['A', 'B', 'A_X', 'B_X']",
    'trace_after_super_new': "['A', 'B', 'A_X', 'B_X']",
    'trace_entered': "['A', 'B']",
    'traced_x_value': '101',
}

GRAIL_ONLY = {
    # CPython: [] -- EnumMeta.__new__ is the builder and was bypassed.
    'bypassing_members': "['ONE']",
}


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = repr(r[k])
        print('%-28s %s %s' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
    for k in sorted(GRAIL_ONLY):
        actual = repr(r[k])
        print('%-28s %s %s' % (k, 'XPASS' if actual == GRAIL_ONLY[k] else 'XFAIL', actual))
