"""The runtime gaps test_reprlib ran into, one check per gap.

test_reprlib is vendored CPython and its reprlib.py is too, so every failure it
reported was Grail underneath: an array type named ``_array``, math.log10 off
by an ulp, module reprs printed as dicts, ``from a.b import b`` never loading
a/b/b.py, a decorated ``__repr__`` that repr() never ran, class-body code
reading a sibling def's metadata before it existed, function attributes that
were equal but not identical on every read, ``f = m; m = deco(m)`` binding f to
the wrapper, no sys.stdin, and PEP 695 bounds dropped.  Each check below pins
one of those in a form test_reprlib does not happen to exercise twice.

Every expected value was produced by running this file under CPython 3.14.6.
"""

import math
import os
import sys
import tempfile
from array import array
from reprlib import recursive_repr
from functools import WRAPPER_ASSIGNMENTS

RESULTS = {}


def check(name, fn, expected):
    try:
        actual = fn()
    except BaseException as exc:
        actual = 'raised %s: %s' % (type(exc).__name__, exc)
    RESULTS[name] = True if actual == expected else actual


check('array_type_is_named_array',
      lambda: (type(array('i')).__name__, repr(array('i')), repr(array('b', [1]))),
      ('array', "array('i')", "array('b', [1])"))

check('log10_is_libm_accurate',
      lambda: (math.log10(1000.0), math.log10(1e300), math.log10(10 ** 400),
               int(math.log10(10 ** 4300))),
      (3.0, 300.0, 400.0, 4300))

check('module_repr_names_the_module',
      lambda: (repr(sys), repr(math).startswith("<module 'math'"),
               repr(math).endswith('>')),
      ("<module 'sys' (built-in)>", True, True))


def _from_package_import_same_name():
    root = tempfile.mkdtemp()
    pkg = os.path.join(root, 'rcpkg')
    sub = os.path.join(pkg, 'rcpkg')
    os.makedirs(sub)
    for d in (pkg, sub):
        open(os.path.join(d, '__init__.py'), 'w').close()
    with open(os.path.join(sub, 'rcpkg.py'), 'w') as f:
        f.write('VALUE = 7\n')
    sys.path.insert(0, root)
    try:
        from rcpkg.rcpkg import rcpkg
        return (rcpkg.__name__, rcpkg.VALUE)
    finally:
        sys.path.remove(root)


check('from_a_b_import_b_loads_the_submodule',
      _from_package_import_same_name, ('rcpkg.rcpkg.rcpkg', 7))


class _Container:
    def __init__(self, values):
        self.values = list(values)

    @recursive_repr()
    def __repr__(self):
        return '<' + ', '.join(map(str, self.values)) + '>'


def _decorated_dunder_runs():
    c = _Container('ab')
    c.values.append(c)
    return repr(c)


check('a_decorated_dunder_is_what_repr_runs',
      _decorated_dunder_runs, '<a, b, ...>')


class _Documented:
    def __repr__(self):
        'Test document content'
        pass
    wrapped = __repr__
    wrapper = recursive_repr()(wrapped)


def _metadata_copied_in_the_class_body():
    w, x = _Documented.wrapped, _Documented.wrapper
    return (x.__doc__, x.__module__ == w.__module__,
            [name for name in WRAPPER_ASSIGNMENTS
             if getattr(x, name) is not getattr(w, name)])


check('class_body_code_sees_sibling_metadata',
      _metadata_copied_in_the_class_body,
      ('Test document content', True, []))


class _Rebound:
    def __repr__(self):
        return 'R()'
    f = __repr__
    __repr__ = recursive_repr()(__repr__)


class _Aliased:
    def m(self, x):
        return ('m', x)
    alias = m


check('an_alias_keeps_the_def_a_later_line_rebinds',
      lambda: (_Rebound.f is _Rebound.__repr__.__wrapped__, repr(_Rebound()),
               _Aliased().alias(1), _Aliased.alias is _Aliased.m),
      (True, 'R()', ('m', 1), True))

check('sys_stdin_is_the_console_text_stream',
      lambda: (type(sys.__stdin__).__name__, sys.__stdin__.name,
               sys.__stdin__.mode, sys.__stdin__.readable(),
               sys.__stdin__.writable(), type(sys.__stdout__).__name__),
      ('TextIOWrapper', '<stdin>', 'r', True, False, 'TextIOWrapper'))


def _type_param_bounds():
    def f[T: str, U: (int, bytes), *Ts](x: T) -> T:
        return x

    class My:
        @recursive_repr()
        def __repr__[T: str](self, default: T = '') -> str:
            return default

    class G[K: float]:
        pass

    return ([(t.__name__, getattr(t, '__bound__', None),
              getattr(t, '__constraints__', None)) for t in f.__type_params__],
            My().__repr__.__type_params__[0].__bound__,
            G.__type_params__[0].__bound__)


check('pep695_bounds_and_constraints',
      _type_param_bounds,
      ([('T', str, ()), ('U', None, (int, bytes)), ('Ts', None, None)],
       str, float))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
