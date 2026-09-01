"""Helper for cross_module_frames.py -- the OTHER module in the test.

No ``__main__'' guard on purpose: check_python_fixtures.sh discovers fixtures by
that line, and this file is not one, it is the second file its neighbour needs.
"""


def raises():
    return 1 / 0


def raises_from_nested():
    def inner():
        return 1 / 0
    return inner()


def raises_from_lambda():
    return (lambda: 1 / 0)()
