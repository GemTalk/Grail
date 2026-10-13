# Regression fixture for #1458: inspect.ismethod / isfunction / isroutine
# answer CPython's question, not a question about Grail's type names.
#
# They classified by ``type(obj).__name__'', which does not line up with
# CPython's function/method split:
#
#  * a module-level def is a Grail BoundMethod bound to its module, so
#    ismethod() said True and isfunction() False;
#  * a decorated method read through an instance is a MethodBinding, so
#    ismethod() and isroutine() said False.
#
# Both break pluggy, which pytest is built on: its varnames() strips the first
# parameter of anything ismethod() accepts, and parse_hookimpl_opts() skips
# anything isroutine() rejects.  The two pluggy shapes are reproduced at the
# bottom.  Expected values are what CPython 3.14 answers.

import functools
import inspect

RESULTS = {}


def plain(config):
    pass


def mark(f):
    f.marked = True
    return f


def wraps_it(f):
    @functools.wraps(f)
    def wrapper(*args, **kwargs):
        return f(*args, **kwargs)
    return wrapper


class D:
    def meth(self, x):
        pass

    @mark
    def decorated(self, session):
        pass

    @wraps_it
    def wrapped(self):
        pass

    @classmethod
    def cm(cls):
        pass


def outer():
    def inner():
        pass
    return inner


lam = lambda: 0


def triple(obj):
    return (inspect.ismethod(obj), inspect.isfunction(obj), inspect.isroutine(obj))


RESULTS['module_function'] = triple(plain) == (False, True, True)
RESULTS['lambda'] = triple(lam) == (False, True, True)
RESULTS['nested_function'] = triple(outer()) == (False, True, True)
RESULTS['method_through_class'] = triple(D.meth) == (False, True, True)
RESULTS['method_through_instance'] = triple(D().meth) == (True, False, True)
RESULTS['decorated_method_through_instance'] = (
    triple(D().decorated) == (True, False, True))
RESULTS['wraps_method_through_instance'] = triple(D().wrapped) == (True, False, True)
RESULTS['classmethod_through_class'] = triple(D.cm) == (True, False, True)
RESULTS['builtin_type_method_is_routine'] = (
    inspect.isroutine(str.upper) and not inspect.isfunction(str.upper)
    and not inspect.ismethod(str.upper))
RESULTS['class_and_instance_are_not_routines'] = (
    triple(D) == (False, False, False) and triple(D()) == (False, False, False))


# pluggy._hooks.varnames, reduced to the part that reads ismethod().
def varnames(func):
    args = list(inspect.signature(func).parameters)
    if inspect.ismethod(func):
        args = args[1:]
    return tuple(args)


def pytest_configure(config):
    pass


RESULTS['pluggy_varnames_keeps_first_param'] = varnames(pytest_configure) == ('config',)


# pluggy.PluginManager.parse_hookimpl_opts, reduced to its routine filter.
def hookimpl(f):
    f.pytest_impl = {}
    return f


class Plugin:
    @hookimpl
    def pytest_sessionstart(self, session):
        pass

    not_a_hook = 3


def hookimpls(plugin):
    found = []
    for name in dir(plugin):
        method = getattr(plugin, name)
        if not inspect.isroutine(method):
            continue
        if hasattr(method, 'pytest_impl'):
            found.append(name)
    return found


RESULTS['pluggy_registers_decorated_hookimpl'] = (
    hookimpls(Plugin()) == ['pytest_sessionstart'])

if __name__ == '__main__':
    for _name, _ok in RESULTS.items():
        print('%-4s %s' % ('OK' if _ok is True else 'FAIL', _name))
