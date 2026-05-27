# Grail pprint stub.  Real CPython pprint has indent-aware
# pretty-printing of nested containers; werkzeug.routing uses only
# ``pformat'' for the repr of a Rule / Map.  Stub delegates to
# builtin repr.


def pformat(object, indent=1, width=80, depth=None,
            compact=False, sort_dicts=True):
    """Format ``object'' as a string.  Grail uses repr() directly —
    no indentation logic, no width wrapping."""
    return repr(object)


def pprint(object, stream=None, indent=1, width=80, depth=None,
           compact=False, sort_dicts=True):
    """Pretty-print to stream (or stdout)."""
    s = pformat(object, indent, width, depth, compact, sort_dicts)
    if stream is None:
        print(s)
    else:
        stream.write(s)
        stream.write('\n')


def isreadable(object):
    return True


def isrecursive(object):
    return False
