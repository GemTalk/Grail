# Probe for Werkzeug Step 1 — werkzeug._internal.
#
# Smoke-tests the smallest Werkzeug module (helpers + a few private
# WSGI utilities) to validate the staging mechanism.  Later steps
# layer datastructures, http, wsgi, etc. on top.


import werkzeug._internal as _i


def import_succeeded():
    return _i is not None


def missing_repr():
    """The _missing sentinel reprs as 'no value'."""
    return repr(_i._missing)


def wsgi_encoding_dance():
    """latin1-encode round-trip used to push str through WSGI."""
    return _i._wsgi_encoding_dance('hello')


def wsgi_decoding_dance():
    """Inverse direction — latin1 byte string back to str."""
    return _i._wsgi_decoding_dance('hello')
