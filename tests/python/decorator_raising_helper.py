"""Helper for decorator_exceptions_propagate.py: a TOP-LEVEL decorated def
whose decorator raises.  Only a top-level def reaches the module-level
decorator emitter, so importing this module must raise ValueError, as it does
under CPython."""


def raising(f):
    raise ValueError('decorator raised')


@raising
def top():
    return 1
