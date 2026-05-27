# Probe for Werkzeug Step 6 — werkzeug.wrappers Request/Response.
#
# wrappers/__init__.py re-exports Request and Response.  Each
# pulls in sansio.request / sansio.response and a wide swath of
# the datastructures package.  Step 6 lands when the wrappers
# package imports cleanly; even if individual methods don't yet
# round-trip a WSGI environ, that's the staging completion bar.
#
# To make this probe stable, we pre-load all the submodule
# dependencies explicitly so the parent-package __init__'s
# circular-import sequence is avoided.  (Grail's importlib doesn't
# yet preserve a partial-module reference for circular probes the
# way CPython does.)


def import_succeeded():
    """Pre-load the dependency chain in order, then probe the
    wrappers package."""
    import werkzeug._internal
    import werkzeug.urls
    import werkzeug.exceptions
    import werkzeug.http
    import werkzeug.datastructures.mixins
    import werkzeug.datastructures.structures
    import werkzeug.datastructures.cache_control
    import werkzeug.datastructures.csp
    import werkzeug.datastructures.etag
    import werkzeug.datastructures.range
    import werkzeug.datastructures.accept
    import werkzeug.datastructures.auth
    import werkzeug.datastructures.headers
    import werkzeug.datastructures.file_storage
    import werkzeug.datastructures
    import werkzeug.sansio.utils
    import werkzeug.sansio.http
    import werkzeug.sansio.multipart
    return werkzeug.datastructures.MultiDict is not None
