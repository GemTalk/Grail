# Grail binascii stub.
#
# Werkzeug uses this only for the ``binascii.Error'' exception class
# (caught alongside UnicodeError when base64-decoding the
# ``Authorization: Basic …'' header).  Real CPython binascii also
# exposes ``b2a_base64'' / ``a2b_base64'' / ``hexlify'' / ``unhexlify''
# / CRCs — add as callers surface.


class Error(ValueError):
    """Raised on a malformed base64 / hex input.  Subclasses
    ValueError to match CPython."""
    pass


Incomplete = Error
