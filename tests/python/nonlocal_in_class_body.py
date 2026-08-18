"""Fixture: ``nonlocal`` inside a CLASS BODY writes the enclosing binding.

A class body is a scope, and ``nonlocal x`` in one means what it means anywhere
else: the assignment binds the ENCLOSING function's variable rather than
declaring anything locally.  CPython also keeps the name out of the class
__dict__ entirely -- it was never a class attribute.

Grail did neither.  The write was silently DROPPED and the name was bound as a
class attribute instead, so the statement was wrong in both directions at once
and nothing reported it:

    def outer():
        marker = 1
        class X:
            nonlocal marker
            marker = 42
        return marker          # Grail: 1.  CPython: 42.

The machinery to emit the write was already there; it was gated behind a test
for "is this name an assignable Smalltalk temp here", and that test rendered the
name as a READ.  Reading a plain local emits its unbound-local guard --
``(marker ifNil: [UnboundLocalError ___signalUnbound___: #marker])`` -- which is
not the bare identifier, so the test rejected exactly the temps it was meant to
accept.  Asking in a STORE context renders the assignment target instead, which
is the thing the question is actually about.

TWO KNOWN DIVERGENCES REMAIN, both recorded here with CPython's answer so they
stay visible:

  * ``read_inside_body`` -- the write is emitted after the class body's other
    statements rather than at its source position, so a read EARLIER in the same
    body still sees the pre-write value.  Only the in-body read is affected; the
    enclosing scope sees the write either way.
  * ``dunder_class`` -- ``nonlocal __class__`` is legal in CPython, which gives
    every class body an implicit __class__ cell.  Grail resolves ``__class__``
    lexically and has no assignable temp for it, so this write was dropped when
    this fixture was written; it now goes to the real class cell instead.  See
    nonlocal_dunder_class.py, which covers that behaviour on its own.
"""


def plain_assignment():
    marker = 1

    class X:
        nonlocal marker
        marker = 42
    return marker, hasattr(X, 'marker')


def augmented_assignment():
    count = 10

    class X:
        nonlocal count
        count += 5
    return count, hasattr(X, 'count')


class Host:
    def in_a_method(self):
        v = 1

        class X:
            nonlocal v
            v = 42
        return v


def through_a_nested_function():
    a = 1

    def mid():
        class X:
            nonlocal a
            a = 9
        return a
    return mid(), a


def read_inside_body():
    seen = []
    val = 'before'

    class X:
        nonlocal val
        val = 'after'
        seen.append(val)
    return val, seen


def global_sibling():
    # ``global`` in a class body is the same rule one scope further out, and
    # already worked -- kept as the guard that this change did not disturb it.
    class X:
        global _module_level
        _module_level = 13
    return _module_level, hasattr(X, '_module_level')


class DunderHost:
    def probe(self):
        # Legal only inside a METHOD: that is where CPython's implicit
        # ``__class__`` cell exists, so there is a binding for nonlocal to find.
        # (In a plain function it is a SyntaxError -- "no binding for nonlocal
        # '__class__' found" -- which is itself worth knowing.)
        class X:
            nonlocal __class__
            __class__ = 42
        return __class__


r = {}
r['plain'] = plain_assignment()
r['augmented'] = augmented_assignment()
r['method'] = Host().in_a_method()
r['nested'] = through_a_nested_function()
r['read_inside_body'] = read_inside_body()
r['global_sibling'] = global_sibling()
try:
    r['dunder_class'] = DunderHost().probe()
except BaseException as exc:
    r['dunder_class'] = 'RAISED ' + type(exc).__name__


EXPECTED = {
    # (enclosing value after the class body, is it a class attribute?)
    'plain': (42, False),
    'augmented': (15, False),
    'method': 42,
    'nested': (9, 9),
    'read_inside_body': ('after', ['after']),
    'global_sibling': (13, False),
    'dunder_class': 42,
}


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r[key]
        print('%-4s %s -> %r' % ('OK' if actual == expected else 'FAIL',
                                 key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-4s %s is not in EXPECTED' % ('FAIL', extra))
