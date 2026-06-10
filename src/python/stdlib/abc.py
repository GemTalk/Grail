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


class ABCMeta(type):
    pass


def get_cache_token():
    return 0
