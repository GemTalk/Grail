"""Fixture: ``from X import *'' must work when it is not a top-level statement.

CPython allows a star import anywhere at MODULE SCOPE -- inside ``try'',
``if'', ``with'', ``for'', ``while'' -- and rejects it only inside a function
or class body (``SyntaxError: import * only allowed at module level'').  Every
expectation below was measured under CPython 3.14.6, not recalled.

Grail's importlib >> expandStarImports: used to scan only the module body's own
top-level statement list, so a nested star import was never expanded.  It kept
its lone ``*'' alias into codegen, where ImportFromAst emitted a per-name
binding for it -- a Smalltalk variable literally NAMED ``*'':

    * := ((((Python @env0:at: #builtins) instance) ___import__: ...

which is ``a CompileError occurred (error 1001), expected a right bracket'',
uncatchable, taking the session with it.  ``try: from ._speedups import * /
except ImportError: pass'' is the guarded-accelerator idiom; it is the first
import of pyyaml and appears five times in pydantic's __init__.py.

NOTE ON __all__: this fixture deliberately does NOT assert that a star import
honours the source module's ``__all__''.  Grail's runtime merge step copies
every public attribute regardless, at module level just as much as nested, so
asserting it here would fail under Grail for a reason that predates and is
independent of nesting.  See docs/Issues.md.
"""

import contextlib

RESULTS = {}


def check(name, fn, expected):
    try:
        RESULTS[name] = (fn() == expected)
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)


# --- the module-level control: this shape always worked -----------------
from json import *

check('toplevel_still_works', lambda: dumps({'a': 1}), '{"a": 1}')


# --- inside try/except: the pyyaml / pydantic shape ---------------------
try:
    from base64 import *
except ImportError:
    pass

check('try_body_binds', lambda: b64encode(b'ab').decode(), 'YWI=')

# The except branch of the same idiom: the fallback import must bind too.
try:
    from no_such_module_zzz import *
except ImportError:
    from math import *

check('except_branch_binds', lambda: floor(2.7), 2)
check('missing_module_is_catchable', lambda: 'ceil' in globals(), True)


# --- inside if / else ---------------------------------------------------
if 'sqrt' not in globals():
    raise AssertionError('math should already be starred in')

if len('ab') == 2:
    from string import *
else:
    pass

check('if_body_binds', lambda: capwords('a b'), 'A B')


# --- inside with --------------------------------------------------------
with contextlib.nullcontext():
    from stat import *

check('with_body_binds', lambda: S_ISDIR(0o040755), True)


# --- inside for and while ------------------------------------------------
for _i in range(1):
    from heapq import *



def _smallest():
    h = [3, 1, 2]
    heapify(h)
    return heappop(h)


check('for_body_binds', _smallest, 1)

while True:
    from bisect import *
    break

check('while_body_binds', lambda: bisect_left([1, 3, 5], 3), 1)


# --- two levels deep ------------------------------------------------------
if True:
    try:
        from copy import *
    except ImportError:
        pass

check('nested_two_deep_binds', lambda: deepcopy([1, [2]]), [1, [2]])


# --- an alias import beside the star, in the same nested block ------------
try:
    from math import *
    from math import pi as _the_pi
except ImportError:
    _the_pi = None

check('alias_beside_star', lambda: round(_the_pi, 5), 3.14159)


# --- CPython's scope rule is still enforced -------------------------------
def _compiles(src):
    try:
        compile(src, '<fixture>', 'exec')
        return 'compiled'
    except SyntaxError as exc:
        return 'SyntaxError: %s' % (exc.msg or exc)


check('star_in_def_is_syntaxerror',
      lambda: _compiles('def f():\n    from math import *\n'),
      'SyntaxError: import * only allowed at module level')
check('star_in_class_is_syntaxerror',
      lambda: _compiles('class C:\n    from math import *\n'),
      'SyntaxError: import * only allowed at module level')
check('star_in_module_try_compiles',
      lambda: _compiles('try:\n    from math import *\nexcept ImportError:\n    pass\n'),
      'compiled')


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
