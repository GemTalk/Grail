# Probe for Werkzeug Step 8 — werkzeug.local.
#
# werkzeug.local provides ContextVar-backed Local / LocalStack
# storage and the LocalProxy used for `flask.current_app`,
# `flask.request`, etc.  Module-init depends on:
#   - contextvars.ContextVar (Grail stub provides single-slot version)
#   - operator.imatmul + companion in-place operators
#   - werkzeug.wsgi.ClosingIterator (Step 4)
#
# Patches applied to upstream source:
#   - `_ProxyDescriptor.__call__` signature simplified to (self, instance);
#     Grail codegen for ``def f(self, x, *args, **kwargs)`` paired with
#     ``g(*args, **kwargs)`` calls fails to declare arg/kwarg temps.
#   - `__call__ = _ProxyLookup(lambda self, *args, **kwargs: ...)` simplified
#     to single-arg lambda.


def import_succeeded():
    import werkzeug.local
    return werkzeug.local.Local is not None


def public_surface_present():
    import werkzeug.local as wl
    return (wl.Local is not None
            and wl.LocalStack is not None
            and wl.LocalManager is not None
            and wl.LocalProxy is not None
            and wl.release_local is not None)


def local_constructs():
    """Local() ctor runs — exercises ContextVar instantiation."""
    import werkzeug.local as wl
    local = wl.Local()
    return local is not None


def local_stack_constructs():
    import werkzeug.local as wl
    stack = wl.LocalStack()
    return stack is not None
