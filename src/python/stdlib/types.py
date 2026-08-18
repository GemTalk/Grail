# Minimal `types` stub for Grail.  CPython's `types` exposes the
# concrete type objects for things like functions, methods, code
# objects, generators, modules, etc., for isinstance dispatch.
#
# Grail has its own internal representations for most of these and
# no public class object matching CPython's exactly.  Stub each
# name as an empty class so ``isinstance(obj, types.X)`` returns
# False (no real instance ever inherits from a stub), which matches
# the conservative branch downstream code (Jinja2 sandbox / utils,
# Werkzeug attribute filters) takes when introspection can't
# classify a value.  Expand individual types to real Grail classes
# as call sites need them.
#
# TracebackType is expanded (below).  The rest are still stubs, and the
# distinction is deliberate rather than alphabetical: a name is worth
# converting when Grail HAS the object and only the name was missing, so that
# `isinstance` stops lying about something real.  Converting one that has no
# Grail counterpart would replace a False that is honest with an error.


class FunctionType:
    pass


class LambdaType:
    pass


class MethodType:
    pass


class BuiltinFunctionType:
    pass


class BuiltinMethodType:
    pass


class WrapperDescriptorType:
    pass


class MethodWrapperType:
    pass


class MethodDescriptorType:
    pass


class ClassMethodDescriptorType:
    pass


class ModuleType:
    """CPython's module class — exposed for ``isinstance(x, ModuleType)``.
    Grail modules are Smalltalk class instances, not Python objects of
    this type, so the check returns False; downstream code generally
    has a hasattr-based fallback that still works."""

    pass


def _derive_traceback_type():
    """The REAL traceback class, taken from a real traceback.

    Grail has a genuine traceback object -- ``e.__traceback__`` is a linked
    list of nodes with tb_frame / tb_lineno / tb_next -- so the stub this
    replaces stood in for a missing NAME, not a missing feature.  The
    cost of the name being wrong was that ``isinstance(tb, TracebackType)``
    answered False about an object that was one, which is the check every
    traceback-handling library leads with.

    Derived rather than imported because the class lives in Grail's Smalltalk
    dictionary and has no Python-visible binding of its own; raising is how you
    ask for one.  The CALL form of the raise is deliberate: it is the path that
    arms the VM's stack capture, so this works even as the session's first
    raise.
    """
    try:
        raise ValueError()
    except ValueError as e:
        tb = e.__traceback__
        if tb is not None:
            return type(tb)
    return None


TracebackType = _derive_traceback_type()

if TracebackType is None:
    # No traceback was available at import time -- keep the old inert stub so
    # ``isinstance(x, TracebackType)`` is False rather than an error.  Nothing
    # is known to reach this, and a name that quietly became NoneType would be
    # far worse than one that is merely unhelpful.
    class TracebackType:
        pass

del _derive_traceback_type


class FrameType:
    pass


class GetSetDescriptorType:
    pass


class MemberDescriptorType:
    pass


class CodeType:
    pass


class CellType:
    pass


class GeneratorType:
    pass


class CoroutineType:
    pass


class AsyncGeneratorType:
    pass


class MappingProxyType:
    """``MappingProxyType(d)`` returns a read-only view of dict d.
    Stubbed to just return the dict — Grail's dispatch doesn't
    distinguish a read-only mapping from a regular one."""

    def __new__(cls, mapping):
        return mapping


class SimpleNamespace:
    """``SimpleNamespace(**kwargs)`` — attribute-bag CPython types
    helper.  Used by Werkzeug / Flask in a few places."""

    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)

    def __repr__(self):
        keys = sorted(self.__dict__)
        items = ("{}={!r}".format(k, self.__dict__[k]) for k in keys)
        return "{}({})".format(type(self).__name__, ", ".join(items))

    def __eq__(self, other):
        if isinstance(other, SimpleNamespace):
            return self.__dict__ == other.__dict__
        return NotImplemented


def new_class(name, bases=(), kwds=None, exec_body=None):
    """``types.new_class`` — dynamic class creation.  Returns the
    metaclass-default ``type(name, bases, ns)`` shape with no kwargs
    handling; Jinja2 / Flask rarely use this."""
    ns = {}
    if exec_body is not None:
        exec_body(ns)
    return type(name, bases, ns)


def prepare_class(name, bases=(), kwds=None):
    return (type, {}, kwds or {})


def resolve_bases(bases):
    return bases


# type(None) — Grail's None is a real singleton whose class the type()
# builtin reports; downstream isinstance(x, NoneType) then behaves
# exactly like ``x is None``.
NoneType = type(None)


class GenericAlias:
    """Stub — Grail evaluates ``list[int]`` via class-side
    __getitem__ returning the origin class, so no real GenericAlias
    instances exist; isinstance against this is always False."""
    pass


class UnionType:
    """Stub — ``int | str`` unions aren't materialised in Grail."""
    pass


class EllipsisType:
    pass


class NotImplementedType:
    pass


# ``types.DynamicClassAttribute`` is the descriptor CPython's enum builds its
# member ``property`` on -- routing attribute access on a class to the
# metaclass __getattr__ while giving instances the computed value.  Grail's
# ``enum.property`` is exactly that descriptor (PropertyDescriptor), and the
# enum machinery already treats it as a member-shadowing property, so alias it
# here rather than re-implementing.  Lets ``from types import
# DynamicClassAttribute`` resolve (test_enum test_subclass_duplicate_name_dynamic;
# django.db.models.enums imports it as ``enum_property``).
from enum import property as DynamicClassAttribute
