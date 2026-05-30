# Fixture for DataclassesTestCase.
#
# Exercises the stdlib ``dataclasses'' module end-to-end.  Classes
# must be defined in a loaded module (not at eval scope), so the
# test case loads this file via importlib and calls each function.
# Every function returns the boolean test condition so the Smalltalk
# side can assert ``equals: true''.

from dataclasses import (
    dataclass, field, fields, is_dataclass, asdict, astuple, replace,
)


@dataclass
class Point:
    x: int
    y: int


@dataclass
class Config:
    name: str
    debug: bool = False
    tags: list = field(default_factory=list)


# --- construction + introspection -----------------------------------

def construct_sets_attrs():
    p = Point(1, 2)
    return p.x == 1 and p.y == 2


def construct_by_keyword():
    p = Point(y=20, x=10)
    return p.x == 10 and p.y == 20


def is_dataclass_class():
    return is_dataclass(Point)


def is_dataclass_instance():
    return is_dataclass(Point(1, 2))


def fields_names():
    return [f.name for f in fields(Point)] == ['x', 'y']


def missing_required_arg_raises():
    try:
        Point(1)
    except TypeError:
        return True
    return False


# --- synthesized __repr__ (reached via repr() after the object>>
#     __repr__ dynamic-dunder fix) --------------------------------

def repr_is_synthesized():
    return repr(Point(1, 2)) == 'Point(x=1, y=2)'


# --- synthesized __eq__ / __ne__ (reached via == / != after the
#     object>>__eq__ / __ne__ dynamic-dunder fix) ------------------

def eq_equal_instances():
    return Point(1, 2) == Point(1, 2)


def eq_unequal_instances():
    return not (Point(1, 2) == Point(3, 4))


def ne_unequal_instances():
    return Point(1, 2) != Point(3, 4)


def ne_equal_instances():
    return not (Point(1, 2) != Point(1, 2))


# --- asdict / astuple / replace -------------------------------------

def asdict_roundtrip():
    return asdict(Point(1, 2)) == {'x': 1, 'y': 2}


def astuple_roundtrip():
    return astuple(Point(1, 2)) == (1, 2)


def replace_overrides_one_field():
    return replace(Point(1, 2), y=9) == Point(1, 9)


# --- fields with defaults / default_factory (Phase 2: needs the
#     ClassDefAst ___annotatedFields___ accessor) --------------------

def defaults_field_order():
    # All three annotated fields, in declaration order — including the
    # two that carry a default (which _fields alone would drop).
    return [f.name for f in fields(Config)] == ['name', 'debug', 'tags']


def default_simple_value():
    return Config('app').debug == False


def default_factory_produces_value():
    return Config('app').tags == []


def default_factory_per_instance():
    a = Config('a')
    b = Config('b')
    a.tags.append(1)
    # Each instance gets a fresh list from the factory, not a shared one.
    return a.tags == [1] and b.tags == []


def defaults_are_overridable():
    c = Config('app', debug=True, tags=[1, 2])
    return c.debug == True and c.tags == [1, 2]


def required_field_still_required():
    try:
        Config()
    except TypeError:
        return True
    return False
