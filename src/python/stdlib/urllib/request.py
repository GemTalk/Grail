# Grail urllib.request — minimal stub.  Real CPython urllib.request
# is the URL-opening / HTTP-client subsystem; Werkzeug only imports
# one private helper (``parse_http_list'') for parsing HTTP list
# headers, so we ship just that.


def parse_http_list(value):
    """Parse a list of HTTP headers as defined in RFC 9110.

    The list elements MAY be quoted, with the quote being percent-
    escaped if needed.  Commas within quoted strings don't end an
    element.  Whitespace around elements is stripped.

    Werkzeug uses this for Accept-* / Cache-Control / Authorization
    parsing.  This is a faithful port of CPython 3.14's
    urllib.request.parse_http_list (a few dozen lines)."""
    res = []
    part = ''
    escape = quote = False
    for cur in value:
        if escape:
            part += cur
            escape = False
            continue
        if quote:
            if cur == '\\':
                escape = True
                continue
            elif cur == '"':
                quote = False
            part += cur
            continue
        if cur == ',':
            res.append(part)
            part = ''
            continue
        if cur == '"':
            quote = True
        part += cur
    if part:
        res.append(part)
    return [p.strip() for p in res]
