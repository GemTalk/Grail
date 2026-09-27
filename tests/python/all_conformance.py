"""The runtime gaps test___all__ ran into, one check per gap.

test___all__ imports every stdlib module that defines ``__all__`` and runs
``exec("from %s import *" % modname, names)`` on each.  None of what stopped it
was in the modules themselves:

* a class-body name that only a bare annotation mentions (``bytes: int``) was
  resolved against the class, which has no such attribute -- an uncatchable
  doesNotUnderstand on importing asgiref.typing;
* the escape for the OTHER quote character (``\\'`` inside ``"..."``) kept its
  backslash and warned that it was invalid;
* a star import inside exec() bound only what a literal ``__all__`` spelled out:
  nothing for a module whose ``__all__`` is computed, and every public name --
  including ones ``__all__`` leaves out -- when it fell back.

(The fourth, an AlmostOutOfMemory notification that made importlib abandon a
module body in silence, is Smalltalk-side and is pinned by the SUnit class.)

Every expected value was produced by running this file under CPython 3.14.6.
"""

import os
import sys
import tempfile
import warnings

RESULTS = {}


def check(name, fn, expected):
    try:
        actual = fn()
    except BaseException as exc:
        actual = 'raised %s: %s' % (type(exc).__name__, exc)
    RESULTS[name] = True if actual == expected else actual


def _bare_annotation_is_not_a_class_attribute():
    class C:
        bytes: int
        x: bytes

    class F:
        acz: int
        y = acz
        acz = 9
        w: acz

    return (C.__annotations__, F.y, F.__annotations__, hasattr(C, 'bytes'))


acz = 'module global'

check('bare_annotation_is_not_a_class_attribute',
      _bare_annotation_is_not_a_class_attribute,
      ({'bytes': int, 'x': bytes}, 'module global', {'acz': int, 'w': 9}, False))


def _both_quote_escapes_decode():
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter('always')
        values = eval(r'''("it\'s", 'say \"hi\"', """a\'b""", b"x\'y", f"{1}\'", rb"a\'b")''')
    return values, [str(w.message) for w in caught]


check('both_quote_escapes_decode', _both_quote_escapes_decode,
      (("it's", 'say "hi"', "a'b", b"x'y", "1'", b"a\\'b"), []))


def _package(files):
    """A throwaway package on sys.path; answers (root, cleanup)."""
    root = tempfile.mkdtemp()
    for rel, text in files.items():
        path = os.path.join(root, rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'w') as f:
            f.write(text)
    sys.path.insert(0, root)
    return root


def _exec_star(modname):
    ns = {}
    exec('from %s import *' % modname, ns)
    ns.pop('__builtins__', None)
    return sorted(ns)


def _star_honours_a_computed_all():
    root = _package({
        'acstar_src.py': "__all__ = ['one', 'two']\none = 1\ntwo = 2\n",
        'acstar.py': ("from acstar_src import *\n"
                      "from acstar_src import __all__ as _src_all\n"
                      "__all__ = _src_all + ['three']\n"
                      "three = 3\nhelper = 'not exported'\n"),
    })
    try:
        return _exec_star('acstar')
    finally:
        sys.path.remove(root)


check('exec_star_honours_a_computed_all', _star_honours_a_computed_all,
      ['one', 'three', 'two'])


def _star_imports_a_listed_submodule():
    root = _package({
        'acpkg/__init__.py': "__all__ = ['VALUE', 'sub']\nVALUE = 1\n",
        'acpkg/sub.py': "X = 2\n",
    })
    try:
        ns = {}
        exec('from acpkg import *', ns)
        return (sorted(k for k in ns if k != '__builtins__'), ns['sub'].X)
    finally:
        sys.path.remove(root)


check('exec_star_imports_a_listed_submodule', _star_imports_a_listed_submodule,
      (['VALUE', 'sub'], 2))


def _star_without_all_takes_public_names():
    root = _package({'acplain.py': "a = 1\n_b = 2\nc = 3\n"})
    try:
        return _exec_star('acplain')
    finally:
        sys.path.remove(root)


check('exec_star_without_all_takes_public_names',
      _star_without_all_takes_public_names, ['a', 'c'])


def _star_names_are_readable_in_the_same_exec():
    ns = {}
    exec('from bisect import *\nout = bisect_left([1, 2, 3], 2)', ns)
    return ns['out']


check('exec_star_names_are_readable_in_the_same_exec',
      _star_names_are_readable_in_the_same_exec, 1)


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
