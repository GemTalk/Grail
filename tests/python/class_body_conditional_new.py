"""A `def __new__` under an `if` in a class body is a definition, not a call.

    class A:
        if True:
            def __new__(cls, *args, **kwargs):
                ...

That crashed the gem with an UNCATCHABLE `ExecBlock does not understand #new`.
A def at the top of a class body compiles to a method; a def inside an `if` is
a conditional binding and goes through a store instead -- and that store read
the pair (`__new__`, `__new__:`) as a getter and a setter, so instead of
storing the function it CALLED `object.__new__` with the function standing in
for the class.

The gate that says "`__new__` is not an accessor pair" already existed, and the
other two stores consulted it; this one did not.  Found through CPython's own
pathlib, whose `WindowsPath` defines `__new__` only off Windows.

The controls below pin the paths that share the gate, so a fix that broke the
accessor pair for ordinary data would not pass: `x = 1; if flag: x = 2` must
still answer 2.

Every expectation here was measured against CPython 3.14.
"""

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:120])


class Builds:
    if True:
        def __new__(cls, *args, **kwargs):
            instance = object.__new__(cls)
            instance.made_here = True
            return instance


class Refuses:
    if True:
        def __new__(cls, *args, **kwargs):
            raise RuntimeError('not on this platform')


class InTheElse:
    if False:
        pass
    else:
        def __new__(cls):
            instance = object.__new__(cls)
            instance.branch = 'else'
            return instance


def _refused():
    try:
        Refuses()
    except RuntimeError as error:
        return str(error)
    return 'built an instance'


check('a_conditional_new_builds_the_instance', Builds().made_here, True)

check('a_conditional_new_that_refuses_refuses', _refused(), 'not on this platform')

check('a_new_in_the_else_branch_is_used', InTheElse().branch, 'else')


# ------------------------------------------------ the paths that share the gate

class Unconditional:
    def __new__(cls):
        instance = object.__new__(cls)
        instance.plain = True
        return instance


check('an_unconditional_new_still_works', Unconditional().plain, True)


class ConditionalInit:
    if True:
        def __init__(self):
            self.value = 7


check('a_conditional_init_still_works', ConditionalInit().value, 7)


class Rebinds:
    x = 1
    if True:
        x = 2


check('a_conditional_rebind_of_a_class_attribute_still_wins', Rebinds.x, 2)


class Late:
    pass


def _late_new(cls):
    instance = object.__new__(cls)
    instance.late = True
    return instance


Late.__new__ = _late_new

check('assigning_new_after_the_class_exists_still_works', Late().late, True)


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
