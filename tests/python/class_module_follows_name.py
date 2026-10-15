"""A class's __module__ is the module's __name__ when the class statement runs.

CPython opens every class body with ``__module__ = __name__``, an ordinary
global read.  _pydecimal rebinds ``__name__ = 'decimal'`` near its top, so its
classes are decimal.Decimal.  Grail compiled a module's __module__ in as a
literal and answered _pydecimal.Decimal, which statistics' doctests print.

Not checked here, a separate gap: a module-level FUNCTION reads __module__
live from the module's current __name__, where CPython stamps it when the def
runs, so after_function answers the restored name below and CPython the
rebound one.
"""

_own_name = __name__


class Before:
    pass


__name__ = 'renamed_by_the_module'


class After:
    pass


def after_function():
    pass


__name__ = _own_name


class Restored:
    pass


def a_class_before_keeps_the_original():
    return Before.__module__ == _own_name


def a_class_after_takes_the_new_name():
    return After.__module__ == 'renamed_by_the_module'


def a_class_after_the_restore_has_the_original():
    return Restored.__module__ == _own_name


def the_repr_names_the_new_module():
    return repr(After) == "<class 'renamed_by_the_module.After'>"


def pydecimal_classes_are_decimal():
    import decimal
    return decimal.Decimal.__module__ == 'decimal'


CHECKS = [
    a_class_before_keeps_the_original,
    a_class_after_takes_the_new_name,
    a_class_after_the_restore_has_the_original,
    the_repr_names_the_new_module,
    pydecimal_classes_are_decimal,
]

RESULTS = {}
for _fn in CHECKS:
    try:
        RESULTS[_fn.__name__] = _fn() is True
    except Exception as _exc:
        RESULTS[_fn.__name__] = type(_exc).__name__ + ': ' + str(_exc)


if __name__ == '__main__':
    for _fn in CHECKS:
        _got = RESULTS[_fn.__name__]
        print('%-4s %s' % ('OK' if _got is True else 'FAIL', _fn.__name__))
