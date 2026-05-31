# Fixture for StarUnpackIteratorTestCase.
#
# ``*expr`` unpacking in a tuple / list literal or in call arguments
# where expr is a Python ITERATOR (not a list/tuple).  The splat codegen
# used a bare ``asArray``, which list/tuple (Smalltalk sequences) answer
# but a Python iterator (``reversed(...)`` / ``iter(...)`` /
# ``dict.keys()`` -> list_iterator, a generator, …) does not — it raised
# "list_iterator does not understand #asArray".  flask's
# ``preprocess_request`` builds ``(None, *reversed(request.blueprints))``.


def reversed_in_tuple():
    t = (0, *reversed([1, 2, 3]))
    return list(t)


def iter_in_list():
    it = iter([4, 5, 6])
    return [*it, 7]


def dict_keys_in_call():
    def f(*args):
        return list(args)

    d = {"a": 1, "b": 2}
    return f(*d.keys())


def generator_in_list():
    def gen():
        yield 1
        yield 2

    return [*gen(), 3]


def list_still_works():
    # The existing list/tuple splat fast path must be unaffected.
    a = [1, 2]
    return [0, *a, 3]
