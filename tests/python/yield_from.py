# Fixture for YieldFromTestCase.
#
# Python's ``yield from <iterable>'' delegates iteration to the
# inner iterable, yielding each of its items from the outer
# generator.  Grail's YieldFromAst emits
# ``<iter> @env0:do: [:each | ___gen___ ___yield___: each]'' —
# so the receiver of ``do:'' can be ANY iterable: a Smalltalk
# Array, an OrderedCollection, OR a PythonGenerator.
#
# Pre-fix, PythonGenerator had no env-0 ``do:'' method, so
# delegating ``yield from'' to a generator MNU'd as soon as the
# inner generator yielded its first value.  The duplicate-class
# bug had hidden this in jinja2 because Node.iter_child_nodes'
# generator always finished empty before tripping the missing
# ``do:''.


def _producer():
    yield 1
    yield 2
    yield 3


def yield_from_generator():
    """yield from another generator function — Grail's
    YieldFromAst emits ``@env0:do:'' on the inner PythonGenerator."""
    def wrapper():
        yield from _producer()
        yield 99
    return list(wrapper())


def yield_from_list():
    """yield from a regular sequence — exercises the same do: path
    on a Smalltalk Array."""
    def wrapper():
        yield from [10, 20, 30]
    return list(wrapper())


def yield_from_empty_generator():
    """yield from an empty generator yields nothing then continues."""
    def empty():
        if False:
            yield
    def wrapper():
        yield from empty()
        yield 'done'
    return list(wrapper())


def yield_from_nested():
    """Nested yield from — outer delegates to middle delegates to inner."""
    def inner():
        yield 'a'
        yield 'b'
    def middle():
        yield from inner()
        yield 'c'
    def outer():
        yield from middle()
        yield 'd'
    return list(outer())
