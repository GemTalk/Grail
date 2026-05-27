# Probe for Werkzeug Step 3 — werkzeug.http.
#
# Step 3 lands the upstream http.py — HTTP date / cookie / Accept /
# Authorization / ETag / Range / If-Match parsing.  ~1400 LOC.
# This probe smoke-tests the import path and a couple of the simpler
# functions that don't pull in deeper dependencies.


import werkzeug.http as wh


def import_succeeded():
    return wh is not None


def quote_header_value_basic():
    """quote_header_value adds quotes around values containing
    special chars; bare tokens pass through."""
    return wh.quote_header_value('text/html')


def dump_header_simple():
    """dump_header serializes a mapping into ``key=value''
    semicolon-separated form."""
    return wh.dump_header({'charset': 'UTF-8'})
