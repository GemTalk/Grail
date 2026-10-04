"""What an enum class body makes a member, and the order it keeps them in.

CPython's EnumDict makes a member of every body value that is not a
descriptor (``hasattr __get__ / __set__ / __delete__``), and every function is
one.  Grail asked a narrower question and so made members of:

* a DECORATED def -- its result sits in the class-attribute holder, which the
  member build sweeps -- so ``Color.RED.m()`` raised "'Color' object is not
  callable";
* an assigned function, lambda, bound method, partial or lru_cache wrapper;
* every def, decorated or not, in the namespace a custom metaclass is handed.

A builtin has no __get__ and stays a member, in both.

The enum hook also never ran __set_name__, so a cached_property raised on its
first read; and __members__ / _member_map_ were hash-ordered rather than in
definition order, which @unique and verify(NAMED_FLAGS) worked around.

Every expectation was measured against CPython 3.14.6.
"""

import enum
import functools

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:200])


def attempt(fn):
    try:
        return ('ok', fn())
    except Exception as e:
        return (type(e).__name__, str(e))


def _plain(f):
    return f


def _wrapping(f):
    @functools.wraps(f)
    def wrapper(*args, **kwargs):
        return f(*args, **kwargs)
    return wrapper


def _module_function():
    return 'mf'


class _Holder:
    def method(self):
        return 'hm'


# ------------------------------------------------------------- decorated defs

class Color(enum.Enum):
    RED = 1

    @_plain
    def ident(self):
        return 'i:' + self.name

    GREEN = 2

    @_wrapping
    def wrapped(self):
        return 'w:' + self.name

    @functools.cache
    def cached_call(self):
        return self.value * 10


check('decorated_defs_are_not_members', list(Color.__members__), ['RED', 'GREEN'])
check('plain_decorated_def_is_callable', attempt(lambda: Color.RED.ident()), ('ok', 'i:RED'))
check('wrapping_decorated_def_is_callable', attempt(lambda: Color.GREEN.wrapped()),
      ('ok', 'w:GREEN'))
check('cache_decorated_def_is_callable', attempt(lambda: Color.GREEN.cached_call()),
      ('ok', 20))


# ---------------------------------------------------------- assigned callables

class Assigned(enum.Enum):
    A = 1
    func = _module_function
    lam = lambda self: 'lam'
    bound = _Holder().method
    part = functools.partial(_module_function)
    lru = functools.lru_cache(_module_function)
    builtin = len
    builtin_method = [].append
    B = 2


check('assigned_callables_are_not_members', list(Assigned.__members__),
      ['A', 'builtin', 'builtin_method', 'B'])
check('a_builtin_is_a_member', type(Assigned.builtin).__name__, 'Assigned')


# --------------------------------------------- the namespace a metaclass sees

class _SeeNames(enum.EnumType):
    seen = None

    def __new__(mcls, name, bases, classdict, **kw):
        _SeeNames.seen = list(classdict.member_names)
        return super().__new__(mcls, name, bases, classdict, **kw)


class Seen(enum.Enum, metaclass=_SeeNames):
    A = 1

    @_plain
    def decorated(self):
        return 'd'

    def undecorated(self):
        return 'u'

    B = 2


check('metaclass_member_names_exclude_defs', _SeeNames.seen, ['A', 'B'])
check('metaclass_enum_members', list(Seen.__members__), ['A', 'B'])


# ------------------------------------------------------------- __set_name__

class _Named:
    def __init__(self):
        self.name = None

    def __set_name__(self, owner, name):
        self.name = (owner.__name__, name)

    def __get__(self, obj, objtype=None):
        return self


def _twice(self):
    return self.name * 2


class WithDescriptors(enum.Enum):
    A = 1
    named = _Named()
    assigned_cp = functools.cached_property(_twice)

    @functools.cached_property
    def decorated_cp(self):
        return self.name * 3


check('set_name_runs_in_an_enum_body', WithDescriptors.A.named.name,
      ('WithDescriptors', 'named'))
check('assigned_cached_property', attempt(lambda: WithDescriptors.A.assigned_cp), ('ok', 'AA'))
check('decorated_cached_property', attempt(lambda: WithDescriptors.A.decorated_cp),
      ('ok', 'AAA'))
check('descriptors_are_not_members', list(WithDescriptors.__members__), ['A'])


# ------------------------------------------------------------------ order

class Ordered(enum.Enum):
    ZETA = 1
    alpha = 2
    MID = 3
    zz = 1
    b = 4
    a2 = 2


check('members_in_definition_order', list(Ordered.__members__),
      ['ZETA', 'alpha', 'MID', 'zz', 'b', 'a2'])
check('member_map_in_definition_order', list(Ordered._member_map_),
      ['ZETA', 'alpha', 'MID', 'zz', 'b', 'a2'])
check('unique_lists_aliases_in_definition_order', attempt(lambda: enum.unique(Ordered)),
      ('ValueError', "duplicate values found in <enum 'Ordered'>: zz -> ZETA, a2 -> alpha"))


def _named_flags():
    @enum.verify(enum.NAMED_FLAGS)
    class Bizarre(enum.Flag):
        c = 4
        dupe = 8
        b = 3
        e = 8
        d = 6
    return Bizarre


check('named_flags_lists_aliases_in_definition_order', attempt(_named_flags),
      ('ValueError', "invalid Flag 'Bizarre': aliases b and d are missing combined "
                     "values of 0x3 [use enum.show_flag_values(value) for details]"))

if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
