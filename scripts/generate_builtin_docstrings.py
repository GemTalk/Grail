#!/usr/bin/env python3
"""Generate builtins' docstring table from the host CPython, as the env-1 class method
``builtins class >> ___methodDocTable___'' in src/Grail-Python-Modules-PyEnv/builtins.extension.st.

Grail's builtin functions are Smalltalk methods, so no FunctionDefAst ever ran
for them and there is no docstring for ClassDefAst's ___methodDocTable___ to
capture.  A read therefore answered None, and functools.update_wrapper copied
that None onto any wrapper built around a builtin.

The text is CPython's own, transcribed rather than paraphrased -- these strings
are part of the observable behaviour (test_functools asserts
``wrapper.__doc__.startswith('max(')'' after wrapping ``max''), so writing our
own would be a different answer that merely looks similar.  Generating from the
running interpreter is also the only way to keep them honest as CPython edits
them between releases.

Usage:
    python3.14 scripts/generate_builtin_docstrings.py

Re-run after a CPython upgrade, or after adding a builtin to the builtins module (add
its name to NAMES below).  NAMES is the set of builtins Grail exposes as
callables -- derived from ``[n for n in dir(builtins)]`` inside Grail, keeping
those whose value is a BoundMethod.  It is spelled out rather than discovered
so that generating never invents a table entry for a builtin Grail does not
actually have.
"""

import builtins
import sys
from pathlib import Path

# Grail's builtins that are callables (BoundMethod), not types or constants.
# ``exit'' and ``quit'' are omitted: CPython gives them no docstring either.
NAMES = [
    'abs', 'all', 'any', 'ascii', 'bin', 'callable', 'chr', 'compile',
    'delattr', 'dir', 'divmod', 'enumerate', 'eval', 'exec', 'filter',
    'format', 'getattr', 'hasattr', 'hash', 'help', 'hex', 'id', 'input',
    'isinstance', 'issubclass', 'iter', 'len', 'map', 'max', 'min', 'next',
    'oct', 'open', 'ord', 'pow', 'print', 'repr', 'reversed', 'round',
    'setattr', 'sorted', 'sum', 'type', 'vars', 'zip',
]

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'scripts'))
from tonel_methods import Method, set_methods  # noqa: E402

# ``__doc__'' for the builtin FUNCTIONS. Grail implements them as Smalltalk methods, so no
# FunctionDefAst ran for them and ClassDefAst's ___methodDocTable___ -- which captures the
# docstring of a class-body def -- has nothing to capture; the read answered None, and
# functools.update_wrapper copied that None onto every wrapper built around a builtin. So the
# table is declared for the ``builtins'' module class (as functools hand-declares
# ___methodSignatureTable___ for cmp_to_key), and BoundMethod >> __doc__ finds it through the
# ordinary superclass walk. Builtin TYPES (dict, list, str, the exceptions) are not here; their
# __doc__ resolves through the class.
OUT = ROOT / 'src/Grail-Python-Modules-PyEnv/builtins.extension.st'

SOURCE_HEAD = """___methodDocTable___
	"CPython's ``__doc__'' for each builtin function, keyed by the name.
	Read by BoundMethod >> __doc__ through its superclass walk.  GENERATED --
	see the file header."

	^ ((KeyValueDictionary @env0:new)"""

SOURCE_TAIL = """
		@env0:yourself)
"""


def smalltalk_string(s):
    """A Smalltalk string literal: single quotes, doubled inside.

    Newlines stay literal -- a Smalltalk literal spans lines -- which keeps the
    generated file readable and the text byte-identical to CPython's.
    """
    return "'" + s.replace("'", "''") + "'"


def main():
    if sys.version_info[:2] < (3, 14):
        sys.exit(f'need CPython 3.14+ to match Grail\'s target, got {sys.version.split()[0]}')

    missing = [n for n in NAMES if not hasattr(builtins, n)]
    if missing:
        sys.exit(f'not builtins in this interpreter: {missing}')

    entries = []
    skipped = []
    for name in NAMES:
        doc = getattr(builtins, name).__doc__
        if not doc:
            skipped.append(name)
            continue
        entries.append(f"\n\t\t@env0:at: '{name}' put: {smalltalk_string(doc)};")

    set_methods(str(OUT), 'builtins', [
        Method(meta=True, category='Grail-Docstrings', source=SOURCE_HEAD + ''.join(entries) + SOURCE_TAIL)])
    print(f'wrote {OUT} with {len(entries)} docstrings'
          + (f' (no docstring in CPython, skipped: {skipped})' if skipped else ''))


if __name__ == '__main__':
    main()
