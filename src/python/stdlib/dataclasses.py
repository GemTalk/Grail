# GRAIL dataclasses — pragmatic stub.
#
# CPython implements @dataclass by introspecting the class's
# ``__annotations__'' at decoration time, generating ``__init__'' /
# ``__repr__'' / ``__eq__'' source via exec, and stamping them onto
# the class as real methods.  Grail can't do the same because:
#
#   (1) ``Cls.method = function'' doesn't descriptor-bind ``self''
#       at call time.
#   (2) ``__annotations__'' isn't exposed as a runtime class
#       attribute — Grail's ClassDefAst processes annotations at
#       parse time and surfaces them as ``_fields'' (bare annotations
#       only — annotated lines with a default value go to class-
#       attribute storage instead).
#   (3) ``cls.__new__(cls)'' descriptor read for built-in __new__
#       hits dispatch edge cases on Python user classes.
#
# Until those gaps are filled, this module ships the FULL API
# surface so ``import dataclasses'' / ``from dataclasses import
# dataclass, field, fields, …'' succeed, but @dataclass is a
# metadata-only decorator: it stamps ``__dataclass_fields__'' onto
# the class for introspection, doesn't synthesize ``__init__'' /
# ``__repr__'' / ``__eq__''.
#
# User code (or patched Werkzeug source) needs to supply its own
# ``__init__'' as it would for any non-dataclass.  ``fields()'',
# ``is_dataclass()'', ``asdict()'', ``astuple()'', ``replace()''
# work normally against decorated classes once the user-supplied
# __init__ has stored attribute values.
#
# Werkzeug 3.x usage will inform whether we need to go further:
#   * If Werkzeug's @dataclass uses are all "decorator only, with
#     explicit __init__", the stub is sufficient.
#   * If Werkzeug relies on dataclass-synthesized __init__, the
#     least-invasive workaround is to patch the affected classes
#     with explicit __init__.


from collections import OrderedDict


class _MissingType:
    """Sentinel singleton — has its own type so ``is MISSING''
    pattern matches CPython."""

    def __repr__(self):
        return 'MISSING'


MISSING = _MissingType()


class FrozenInstanceError(AttributeError):
    """Raised when trying to mutate a frozen dataclass instance.
    Grail doesn't enforce frozen, so this is mostly here for
    isinstance compatibility."""
    pass


class Field:
    """Field descriptor — what ``field()'' returns and what
    ``fields()'' enumerates."""

    def __init__(self, default=MISSING, default_factory=MISSING,
                 init=True, repr=True, hash=None, compare=True,
                 metadata=None, kw_only=False):
        self.name = None  # set when attached to a class
        self.type = None
        self.default = default
        self.default_factory = default_factory
        self.init = init
        self.repr = repr
        self.hash = hash
        self.compare = compare
        self.metadata = metadata if metadata is not None else {}
        self.kw_only = kw_only

    def __repr__(self):
        return (
            'Field(name=' + repr(self.name)
            + ', default=' + repr(self.default)
            + ', init=' + repr(self.init) + ')'
        )


def field(default=MISSING, default_factory=MISSING, init=True,
          repr=True, hash=None, compare=True, metadata=None,
          kw_only=False):
    """Build a Field descriptor."""
    if default is not MISSING and default_factory is not MISSING:
        raise ValueError("can't specify both default and default_factory")
    return Field(
        default=default,
        default_factory=default_factory,
        init=init,
        repr=repr,
        hash=hash,
        compare=compare,
        metadata=metadata,
        kw_only=kw_only,
    )


_DATACLASS_FIELDS = '__dataclass_fields__'
_DATACLASS_PARAMS = '__dataclass_params__'


class _Params:
    """Captures the decorator's keyword arguments for introspection."""

    def __init__(self, init=True, repr=True, eq=True, order=False,
                 unsafe_hash=False, frozen=False, match_args=True,
                 kw_only=False, slots=False, weakref_slot=False):
        self.init = init
        self.repr = repr
        self.eq = eq
        self.order = order
        self.unsafe_hash = unsafe_hash
        self.frozen = frozen
        self.match_args = match_args
        self.kw_only = kw_only
        self.slots = slots
        self.weakref_slot = weakref_slot


def _is_class(obj):
    """True if obj is a class object (rather than an instance).
    CPython uses ``isinstance(obj, type)''; Grail's ``type'' isn't
    usable as a class argument to isinstance, so we sniff for a
    class-shaped marker (``__name__'' returns a string on both
    classes and modules, but only classes also have a metaclass-
    side ``mro'' equivalent).  Simpler proxy: check for the
    ``_fields'' classInstVar that ClassDefAst stamps on every
    Python user class."""
    # Cheap structural test: classes respond to type(...) returning
    # something that isn't themselves (their metaclass), instances
    # respond with their class.  Try-except around type() since
    # weird shim wrappers may not respond at all.
    try:
        return type(obj) is not obj and hasattr(obj, '_fields')
    except Exception:
        return False


def is_dataclass(obj):
    """True if obj is a dataclass or an instance of one."""
    if hasattr(obj, _DATACLASS_FIELDS):
        return True
    try:
        return hasattr(type(obj), _DATACLASS_FIELDS)
    except Exception:
        return False


def fields(class_or_instance):
    """Return the tuple of Field objects defined on the class."""
    raw = getattr(class_or_instance, _DATACLASS_FIELDS, None)
    if raw is None:
        try:
            raw = getattr(type(class_or_instance), _DATACLASS_FIELDS, None)
        except Exception:
            raw = None
    if raw is None:
        raise TypeError(
            'fields() called on non-dataclass: ' + str(class_or_instance))
    # __dataclass_fields__ is an ordered dict of {name: Field}.
    return tuple(raw[name] for name in raw)


def asdict(instance, dict_factory=dict):
    """Convert a dataclass instance to a dict.  Reads the value of
    each field via ``getattr'' — depends on the user's __init__
    having stored those attributes."""
    if not is_dataclass(instance):
        raise TypeError('asdict() should be called on dataclass instances')
    result = dict_factory()
    for f in fields(instance):
        value = getattr(instance, f.name, None)
        result[f.name] = _asdict_inner(value, dict_factory)
    return result


def _asdict_inner(value, dict_factory):
    # Only recurse if value is a dataclass *instance* — checking
    # via hasattr on the value itself.  Classes also have
    # __dataclass_fields__ but we don't want to recurse into them.
    if hasattr(value, _DATACLASS_FIELDS) and hasattr(type(value), _DATACLASS_FIELDS):
        return asdict(value, dict_factory)
    if isinstance(value, list):
        return [_asdict_inner(v, dict_factory) for v in value]
    if isinstance(value, tuple):
        return tuple(_asdict_inner(v, dict_factory) for v in value)
    if isinstance(value, dict):
        result = dict_factory()
        for k in value:
            result[_asdict_inner(k, dict_factory)] = _asdict_inner(value[k], dict_factory)
        return result
    return value


def astuple(instance, tuple_factory=tuple):
    """Convert a dataclass instance to a tuple of field values."""
    if not is_dataclass(instance):
        raise TypeError('astuple() should be called on dataclass instances')
    return tuple_factory(
        _astuple_inner(getattr(instance, f.name, None), tuple_factory)
        for f in fields(instance)
    )


def _astuple_inner(value, tuple_factory):
    if hasattr(value, _DATACLASS_FIELDS) and hasattr(type(value), _DATACLASS_FIELDS):
        return astuple(value, tuple_factory)
    if isinstance(value, list):
        return [_astuple_inner(v, tuple_factory) for v in value]
    if isinstance(value, tuple):
        return tuple(_astuple_inner(v, tuple_factory) for v in value)
    if isinstance(value, dict):
        result = {}
        for k in value:
            result[_astuple_inner(k, tuple_factory)] = _astuple_inner(value[k], tuple_factory)
        return result
    return value


def replace(*args, **changes):
    """Return a fresh instance of the same class with the given
    field overrides.  Calls ``type(instance)(*new_args)'' in
    field declaration order.

    Notes for the Grail-specific signature:
      * ``*args'' rather than ``(instance, **changes)'' because
        Grail's varargs unpacker doesn't bind a required positional
        alongside **kwargs.
      * Local variable holding the constructor args is named
        ``new_args'' (not ``positional'') so it doesn't shadow the
        parameter name Grail uses in the generated unpack
        prologue."""
    if not args:
        raise TypeError('replace() requires a dataclass instance as the first argument')
    instance = args[0]
    if not is_dataclass(instance):
        raise TypeError('replace() should be called on dataclass instances')
    new_args = []
    for f in fields(instance):
        if f.init:
            if f.name in changes:
                new_args.append(changes[f.name])
            else:
                new_args.append(getattr(instance, f.name, None))
    cls = type(instance)
    return cls(*new_args)


def _collect_fields(cls):
    """Build the ``{name: Field}'' ordered dict for the class.

    Field order + the full name set come from ClassDefAst's
    ``___annotatedFields___'' (every annotated line, including those
    with a default), falling back to ``_fields'' (bare annotations
    only) for classes compiled before that accessor existed.

    ``_fields'' separately tells us which names are BARE annotations
    (``x: int'' — required, no default).  For every other annotated
    name the class attribute holds the default: a ``Field'' descriptor
    (from ``field(...)'') is used directly, anything else is the plain
    default value.  Splitting on ``_fields'' membership sidesteps the
    Smalltalk-nil-vs-Python-None ambiguity for unset bare slots."""
    order = getattr(cls, '___annotatedFields___', None)
    if order is None:
        order = getattr(cls, '_fields', None)
    if order is None:
        return OrderedDict()

    bare = set(getattr(cls, '_fields', ()) or ())
    # OrderedDict, not {} — Grail's plain dict is hash-ordered, but
    # dataclass field layout (and thus positional __init__ binding,
    # fields(), asdict, ...) must follow declaration order.
    result = OrderedDict()
    for name in order:
        if name in bare:
            # Bare annotation — required positional, no default.
            f = Field()
            f.name = name
        else:
            raw = getattr(cls, name, MISSING)
            if isinstance(raw, Field):
                f = raw
                f.name = name
            else:
                f = Field()
                f.name = name
                f.default = raw
        result[name] = f
    return result


def _make_synthesized_init(field_dict):
    """Build a synthesized ``__init__'' closure that binds fields in
    declaration order from positional args, then by keyword name, then
    by the field's default / default_factory.  Stored as a class-side
    callable via ``setattr(cls, '__init__', fn)'' — descriptor binding
    in ___pyAttrLoad___ prepends the instance at call time, and the
    class-instantiation dispatch (ClassDefAst's value:value:) routes
    Cls(args) through this override before falling back to the static
    __init__."""

    field_names = []
    for name in field_dict:
        field_names.append(name)

    def __init__(self, *args, **kwargs):
        for i, name in enumerate(field_names):
            if i < len(args):
                setattr(self, name, args[i])
            elif name in kwargs:
                setattr(self, name, kwargs[name])
            else:
                f = field_dict[name]
                if f.default is not MISSING:
                    setattr(self, name, f.default)
                elif f.default_factory is not MISSING:
                    setattr(self, name, f.default_factory())
                else:
                    raise TypeError(
                        '__init__() missing required argument: ' + name)

    return __init__


def _make_synthesized_repr(cls_name, field_dict):
    """``Cls(x=1, y=2)'' style repr for dataclasses."""

    field_names = []
    for name in field_dict:
        field_names.append(name)

    def __repr__(self):
        parts = []
        for name in field_names:
            parts.append(name + '=' + repr(getattr(self, name, None)))
        return cls_name + '(' + ', '.join(parts) + ')'

    return __repr__


def _make_synthesized_eq(field_dict):
    """Structural equality across all fields, gated on identical
    class.  CPython returns NotImplemented when types differ so the
    reflected __eq__ gets a chance; Grail has no NotImplemented
    singleton, and object>>__eq__ has no reflected-call fallback, so
    we return False directly on a type mismatch (correct for the
    equality result, only loses the reflected-dispatch nicety)."""

    field_names = []
    for name in field_dict:
        field_names.append(name)

    def __eq__(self, other):
        if type(self) is not type(other):
            return False
        for name in field_names:
            if getattr(self, name, None) != getattr(other, name, None):
                return False
        return True

    return __eq__


def dataclass(_cls=None, *, init=True, repr=True, eq=True, order=False,
              unsafe_hash=False, frozen=False, match_args=True,
              kw_only=False, slots=False, weakref_slot=False):
    """Tag a class as a dataclass.

    Synthesizes ``__init__'' as a setattr-installed closure: the
    descriptor binding in ___pyAttrLoad___ wraps it as a bound
    method at lookup time, and ClassDefAst's class-instantiation
    dispatch routes ``Cls(args)'' through the dyn-attr override
    before falling back to the static dispatch.

    __repr__ and __eq__ are also installed via setattr but Grail's
    ``repr()'' builtin and ``=='' operator dispatch statically (via
    env-1 method dictionary), so they do not reach setattr overrides
    today.  The functions are installed regardless so calls through
    direct attribute access (``inst.__repr__()'') resolve them, and
    so the precedence-fix follow-up (class dynInstVars before
    methodDict in ___pyAttrLoad___) lights them up without further
    changes here."""

    def wrap(cls):
        field_dict = _collect_fields(cls)
        setattr(cls, _DATACLASS_FIELDS, field_dict)
        setattr(cls, _DATACLASS_PARAMS, _Params(
            init=init, repr=repr, eq=eq, order=order,
            unsafe_hash=unsafe_hash, frozen=frozen,
            match_args=match_args, kw_only=kw_only,
            slots=slots, weakref_slot=weakref_slot))
        if init:
            setattr(cls, '__init__', _make_synthesized_init(field_dict))
        if repr:
            setattr(cls, '__repr__',
                    _make_synthesized_repr(cls.__name__, field_dict))
        if eq:
            setattr(cls, '__eq__', _make_synthesized_eq(field_dict))
        return cls

    # Support both ``@dataclass'' and ``@dataclass(frozen=True)''.
    if _cls is None:
        return wrap
    return wrap(_cls)


def make_dataclass(cls_name, fields_spec, bases=(), namespace=None,
                   **kwargs):
    """Dynamically build a dataclass.  Grail doesn't expose the
    3-arg ``type(name, bases, ns)'' class-creation primitive that
    CPython uses here — raise NotImplementedError so callers fall
    back to the regular ``class`` statement + decorator pattern."""
    raise NotImplementedError(
        'make_dataclass: Grail does not support dynamic class '
        'creation via type(name, bases, ns); use a regular class '
        'definition with the @dataclass decorator instead'
    )


# InitVar / KW_ONLY are typing markers; Grail surface needs them
# importable but doesn't do anything special with them.

class InitVar:
    """Marker class for init-only pseudo-fields (won't be stored)."""

    def __init__(self, type_):
        self.type = type_

    def __class_getitem__(cls, item):
        return cls(item)


KW_ONLY = object()  # Sentinel marking subsequent fields as keyword-only.


__all__ = [
    'MISSING', 'Field', 'field', 'fields', 'dataclass',
    'is_dataclass', 'asdict', 'astuple', 'replace',
    'make_dataclass', 'FrozenInstanceError',
    'InitVar', 'KW_ONLY',
]
