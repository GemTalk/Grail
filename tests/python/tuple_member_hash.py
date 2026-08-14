"""A tuple's hash must come from its members' PYTHON hashes.

Needs to be a module fixture rather than an eval: string because it defines a
class, and eval-path class statements are a known Grail limitation.
"""


class Custom:
    def __init__(self, v):
        self.v = v

    def __eq__(self, o):
        return isinstance(o, Custom) and self.v == o.v

    def __hash__(self):
        return hash(self.v)


def custom_member_hash_is_honoured():
    """The tell was the asymmetry: the BARE object worked as a dict key while a
    one-tuple of it did not.

    tuple.__hash__ answered the Smalltalk ``Array hash'', which hashes members
    with the Smalltalk hash -- and the Smalltalk hash of a PythonInstance is its
    IDENTITY hash, so the custom __hash__ never ran.  PyDict buckets keys by
    __hash__, so ``{(Custom(1),): 'y'}[(Custom(1),)]'' raised KeyError.
    """
    bare = {Custom(1): 'x'}[Custom(1)]
    wrapped = {(Custom(1),): 'y'}[(Custom(1),)]
    return (bare == 'x'
            and wrapped == 'y'
            and hash((Custom(1),)) == hash((Custom(1),))
            and (Custom(1),) == (Custom(1),))


def custom_member_in_a_set():
    """Same contract through the other hashed collection."""
    return len({(Custom(1),), (Custom(1),)}) == 1


# scripts/check_python_fixtures.sh runs this under CPython in CI.
if __name__ == '__main__':
    checks = [
        custom_member_hash_is_honoured,
        custom_member_in_a_set,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
