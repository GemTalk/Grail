# Minimal ``abc`` for Grail — enough for libraries that decorate
# methods with @abstractmethod and subclass ABC.  No metaclass
# enforcement: instantiating an "abstract" class is not blocked
# (CPython raises TypeError); abstract methods typically raise
# NotImplementedError in their bodies anyway, which twilio's
# AuthStrategy / CredentialProvider do.


def abstractmethod(funcobj):
    """Mark funcobj abstract.  Identity decorator in Grail (no
    metaclass enforcement); the __isabstractmethod__ stamp matches
    CPython for introspection."""
    try:
        funcobj.__isabstractmethod__ = True
    except (AttributeError, TypeError):
        pass
    return funcobj


class ABC:
    """Inherit-from-me marker; no instantiation enforcement."""
    pass


# GRAIL: upstream ABCMeta subclasses ``type``; Grail doesn't expose
# ``type`` as a base class and honors no metaclasses, so a plain
# marker class keeps ``from abc import ABCMeta'' importable
# (email._policybase uses it as a metaclass= kwarg, which Grail's
# ClassDefAst ignores).
class ABCMeta:
    pass


_abc_invalidation_counter = 0


def get_cache_token():
    """CPython returns an opaque token that CHANGES whenever any ABC
    registration happens.  Anything caching a decision that depends on
    issubclass() must re-check it: functools.singledispatch caches a class ->
    implementation mapping, and registering a class on an ABC can make a
    previously-cached answer wrong without touching the dispatcher at all.

    Grail's ABC machinery lives in collections.abc rather than here (there is
    no real ABCMeta), so that module bumps the counter through
    _bump_invalidation_counter() below.  Returning a constant -- which this
    did -- makes every such cache silently stale."""
    return _abc_invalidation_counter


def _bump_invalidation_counter():
    """Called by collections.abc._ABCRoot.register() on every registration."""
    global _abc_invalidation_counter
    _abc_invalidation_counter += 1
    return _abc_invalidation_counter
