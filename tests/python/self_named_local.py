"""Fixture: a module whose functions bind a LOCAL with the module's own name.

CPython's random.py does this -- ``random = self.random'' in Random._gauss,
_choices and _randbelow_without_getrandbits -- and locale.py has
``def setlocale(category, locale=None)''.

Grail's text codegen spells every Python local as a Smalltalk temp of the same
name, and it spells the module singleton by its backing class's bare name
(``random @env0:___instance___ ...''), so the temp captured every module-global
read in that scope: random.Random(1).gauss() died with

    a BoundMethod does not understand #'___instance___'

The IR arm binds the module class by association and was never affected, so
only CI's text shards failed.  Load this file under its own name
(SelfNamedClassTestCase) with each arm; run as __main__ it proves nothing,
because the module is then called __main__.

Each check binds ``self_named_local'' in a different way (parameter, assigned
local, lambda parameter, comprehension target, with-as, except-as, for target)
and then reads the module global ``_SCALE'' in the same scope.
"""

_SCALE = 10


def _identity(x):
    return x


class _Ctx:
    def __enter__(self):
        return 3

    def __exit__(self, *exc):
        return False


def as_parameter(self_named_local):
    return self_named_local * _SCALE


def as_assigned_local():
    self_named_local = 2
    return _identity(self_named_local) * _SCALE


def as_method_local():
    class Sampler:
        def value(self):
            return 4

        def scaled(self):
            self_named_local = self.value
            return self_named_local() * _SCALE
    return Sampler().scaled()


def as_lambda_parameter():
    f = lambda self_named_local: self_named_local * _SCALE
    return f(5)


def as_comprehension_target():
    return [self_named_local * _SCALE for self_named_local in (6, 7)]


def as_with_target():
    with _Ctx() as self_named_local:
        return self_named_local * _SCALE


def as_except_name():
    try:
        raise ValueError(8)
    except ValueError as self_named_local:
        return self_named_local.args[0] * _SCALE


def as_for_target():
    total = 0
    for self_named_local in (1, 2):
        total += self_named_local * _SCALE
    return total


RESULTS = {}


def check(name, fn, expected):
    try:
        RESULTS[name] = (fn() == expected)
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)


check('as_parameter', lambda: as_parameter(1), 10)
check('as_assigned_local', as_assigned_local, 20)
check('as_method_local', as_method_local, 40)
check('as_lambda_parameter', as_lambda_parameter, 50)
check('as_comprehension_target', as_comprehension_target, [60, 70])
check('as_with_target', as_with_target, 30)
check('as_except_name', as_except_name, 80)
check('as_for_target', as_for_target, 30)


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
