# Grail contextvars stub.
#
# CPython contextvars implements PEP 567 — per-thread/per-task
# context-local variables.  Werkzeug.local uses ``ContextVar`` to
# back its request/app stacks: each WSGI request runs in a fresh
# context so the proxied current_app / request bindings don't
# leak across threads.
#
# Grail is single-threaded (one gem per session), so the stub
# implements ContextVar with a single shared slot.  Token is a
# trivial restore-value carrier.


_MISSING = object()


class Token:
    """Returned by ContextVar.set — passed back to .reset() to undo."""

    MISSING = _MISSING

    def __init__(self, var, old_value):
        self.var = var
        self.old_value = old_value


class ContextVar:
    """Single-slot context variable.  Grail's single-thread model
    means every read sees every write — sufficient for werkzeug.local
    which uses ContextVar only for proxy-storage indirection."""

    def __init__(self, name, default=_MISSING):
        self.name = name
        self._default = default
        self._value = _MISSING

    def get(self, *args):
        if self._value is not _MISSING:
            return self._value
        if self._default is not _MISSING:
            return self._default
        if len(args) > 0:
            return args[0]
        raise LookupError(self.name)

    def set(self, value):
        old = self._value
        self._value = value
        return Token(self, old)

    def reset(self, token):
        self._value = token.old_value

    def __repr__(self):
        return '<ContextVar name=' + repr(self.name) + '>'


class Context:
    """Stub Context — Grail does not run nested contexts.  Provided
    so ``copy_context()`` callers don't blow up at import time."""

    def __init__(self):
        pass

    def run(self, callable_obj, *args, **kwargs):
        return callable_obj(*args, **kwargs)


def copy_context():
    return Context()
