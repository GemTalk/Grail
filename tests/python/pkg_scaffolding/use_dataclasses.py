import dataclasses
from dataclasses import (
    dataclass, field, fields, asdict, astuple,
    is_dataclass, make_dataclass, MISSING,
    FrozenInstanceError, Field,
)


@dataclass
class Point:
    """Plain dataclass — Grail's decorator synthesizes __init__,
    __repr__, __eq__ via setattr.  The descriptor binding in
    ___pyAttrLoad___ wraps the setattr'd functions as bound methods
    at attribute lookup time, and ClassDefAst's class-instantiation
    dispatch routes Cls(args) through the dyn __init__ override."""
    x: int
    y: int


@dataclass(frozen=True)
class Tag:
    """Decorator with kwargs form — frozen=True is recorded in
    __dataclass_params__ but not enforced by Grail."""
    value: str


def is_dataclass_recognises_class():
    return is_dataclass(Point)


def is_dataclass_recognises_instance():
    return is_dataclass(Point(0, 0))


def is_dataclass_rejects_plain_int():
    return is_dataclass(42)


def is_dataclass_rejects_plain_class():
    class Plain:
        pass
    return is_dataclass(Plain)


def fields_returns_descriptor_objects():
    fs = fields(Point)
    return [f.name for f in fs]


def fields_each_is_a_Field_instance():
    fs = fields(Point)
    return all(isinstance(f, Field) for f in fs)


def asdict_returns_field_value_dict():
    return asdict(Point(7, 8))


def astuple_returns_field_value_tuple():
    return astuple(Point(7, 8))


def replace_overrides_one_field():
    p = Point(1, 2)
    q = dataclasses.replace(p, y=99)
    return q.x, q.y


def replace_preserves_unchanged_fields():
    p = Point(5, 6)
    q = dataclasses.replace(p)
    return q.x, q.y


def field_factory_defaults():
    f = field(default=42)
    return f.default, f.init, f.repr


def field_factory_rejects_both_defaults():
    try:
        field(default=1, default_factory=list)
        return 'no-error'
    except ValueError:
        return 'caught'


def missing_sentinel_singleton():
    return repr(MISSING), MISSING is MISSING


def make_dataclass_is_stub():
    """make_dataclass requires 3-arg type(name, bases, ns) which
    Grail doesn't expose — should raise NotImplementedError so
    callers can fall back to a regular class statement."""
    try:
        make_dataclass('Cls', ['a', 'b'])
        return 'no-error'
    except NotImplementedError:
        return 'caught'


def frozen_error_is_attribute_error():
    return issubclass(FrozenInstanceError, AttributeError)


def decorator_kwargs_form():
    """@dataclass(frozen=True) — verifies the
    decorator-with-arguments form (the inner ``wrap'' branch)."""
    return is_dataclass(Tag) and Tag('hi').value == 'hi'


def dataclass_params_captured():
    """__dataclass_params__ holds the decorator kwargs (for
    introspection / CPython parity)."""
    params = Tag.__dataclass_params__
    return params.frozen, params.init, params.eq
