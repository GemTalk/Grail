# Minimal ``werkzeug.serving'' stub for Grail.
#
# Upstream werkzeug.serving wraps the stdlib ``http.server'' /
# ``socketserver'' / ``ssl'' modules into a development WSGI server
# (``run_simple''), plus an auto-reloader.  The dev server is out
# of scope for the M7 demo path — Flask apps are exercised through
# ``app.test_client()'' which calls the WSGI callable directly, no
# socket binding required.
#
# Flask.app imports two names from this module:
#   - ``is_running_from_reloader'' (used in __init__ logging guards)
#   - ``run_simple''               (lazily, only for ``app.run()'')
#
# Stubs cover both.  ``run_simple'' raises NotImplementedError at
# call time so the absent dev server is loud, not silent.


def is_running_from_reloader():
    """Whether the current process is the reloader child.  Grail
    has no auto-reloader, so always False."""
    return False


def run_simple(hostname, port, application, use_reloader=False,
               use_debugger=False, use_evalex=True,
               extra_files=None, exclude_patterns=None,
               reloader_interval=1, reloader_type='auto',
               threaded=False, processes=1, request_handler=None,
               static_files=None, passthrough_errors=False,
               ssl_context=None):
    """Stub — Grail doesn't ship a dev server.  Use
    ``app.test_client()'' for HTTP-level testing instead."""
    raise NotImplementedError(
        'werkzeug.serving.run_simple is not implemented in Grail.  '
        'Use app.test_client() for in-process WSGI testing.'
    )


class BaseWSGIServer:
    """Stub — only present so isinstance checks resolve."""

    def __init__(self, *args, **kwargs):
        raise NotImplementedError(
            'werkzeug.serving.BaseWSGIServer is not implemented in Grail.'
        )


class WSGIRequestHandler:
    """Stub — only present so subclassing / isinstance resolves."""
    pass


def make_server(host, port, app, threaded=False, processes=1,
                request_handler=None, passthrough_errors=False,
                ssl_context=None, fd=None):
    raise NotImplementedError(
        'werkzeug.serving.make_server is not implemented in Grail.'
    )
