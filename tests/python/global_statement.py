# Fixture for GlobalStatementTestCase.
#
# The ``global`` statement: a name declared global inside a function
# refers to the module-level binding for both reads and writes, instead
# of being treated as a function local.  Without it, a function that
# assigns the name anywhere would treat every reference as a local and
# raise UnboundLocalError on a read-before-assign.  This is the pattern
# flask.testing._get_werkzeug_version relies on (lazy-init a cached
# module global).

_counter = 0
_cached = ""


def bump():
    global _counter
    _counter += 1          # read-modify-write of an existing module global
    return _counter


def read_counter():
    return _counter         # plain module read (no global decl needed)


def lazy_init():
    # The flask pattern: read the global, assign it on first use.
    global _cached
    if not _cached:
        _cached = "computed"
    return _cached


def make_fresh():
    # ``global`` may create a module binding that has no module-level
    # assignment at all.
    global _fresh_global
    _fresh_global = 99


def read_fresh():
    return _fresh_global
