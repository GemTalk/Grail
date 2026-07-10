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


def shadowed_nested():
    # ``global`` in a NESTED def must bypass the enclosing function's
    # same-named local: inner's store hits the module, outer's local is
    # untouched.  (Previously the store landed in outer's temp and the
    # module global never moved.)
    global _counter
    _counter = 0
    def run():
        _counter = 100      # outer's local (no global here)
        def inner():
            global _counter
            _counter = _counter + 1
            return _counter
        r = inner()
        return (r, _counter)
    return run()


class MethodBumper:
    # ``global`` store inside a class METHOD (previously a hard
    # CompileError: module-store routing was disabled in method context
    # and the bare temp had been stripped).
    def bump(self):
        global _counter
        _counter = _counter + 50
        return _counter


def method_bump():
    return MethodBumper().bump()
