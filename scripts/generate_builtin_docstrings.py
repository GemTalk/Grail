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
import re
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

# Grail's builtin TYPES: every name ``dir(builtins)'' binds to a type inside Grail
# (all of CPython's but ``__loader__'').  Kernel-backed and Smalltalk-defined
# types have no class statement, so nothing captured a docstring for them, and
# ``int.__doc__'' answered object's (#1724).  Spelled out for NAMES's reason.
TYPE_NAMES = [
    'ArithmeticError', 'AssertionError', 'AttributeError', 'BaseException',
    'BaseExceptionGroup', 'BlockingIOError', 'BrokenPipeError', 'BufferError', 'BytesWarning',
    'ChildProcessError', 'ConnectionAbortedError', 'ConnectionError', 'ConnectionRefusedError',
    'ConnectionResetError', 'DeprecationWarning', 'EOFError', 'EncodingWarning',
    'EnvironmentError', 'Exception', 'ExceptionGroup', 'FileExistsError', 'FileNotFoundError',
    'FloatingPointError', 'FutureWarning', 'GeneratorExit', 'IOError', 'ImportError',
    'ImportWarning', 'IndentationError', 'IndexError', 'InterruptedError', 'IsADirectoryError',
    'KeyError', 'KeyboardInterrupt', 'LookupError', 'MemoryError', 'ModuleNotFoundError',
    'NameError', 'NotADirectoryError', 'NotImplementedError', 'OSError', 'OverflowError',
    'PendingDeprecationWarning', 'PermissionError', 'ProcessLookupError',
    'PythonFinalizationError', 'RecursionError', 'ReferenceError', 'ResourceWarning',
    'RuntimeError', 'RuntimeWarning', 'StopAsyncIteration', 'StopIteration', 'SyntaxError',
    'SyntaxWarning', 'SystemError', 'SystemExit', 'TabError', 'TimeoutError', 'TypeError',
    'UnboundLocalError', 'UnicodeDecodeError', 'UnicodeEncodeError', 'UnicodeError',
    'UnicodeTranslateError', 'UnicodeWarning', 'UserWarning', 'ValueError', 'Warning',
    'ZeroDivisionError', '_IncompleteInputError', 'bool', 'bytearray', 'bytes', 'classmethod',
    'complex', 'dict', 'enumerate', 'filter', 'float', 'frozenset', 'int', 'list', 'map',
    'memoryview', 'object', 'property', 'range', 'reversed', 'set', 'slice', 'staticmethod',
    'str', 'super', 'tuple', 'type', 'zip',
]

# The types the ``types'' module names that builtins does not bind: the C types
# of code, frames, generators, modules, None and the rest.  Grail implements the
# kernel-backed ones in Smalltalk, so they had no docstring either.  Keyed by
# CPython's ``__name__'' for them (``code'', ``NoneType''), which is what the
# Smalltalk class answers; types whose CPython ``__doc__'' is a descriptor
# rather than a string (BuiltinFunctionType and the descriptor types) are left
# out, and CapsuleType, which Grail does not have.  Spelled out for NAMES's reason.
TYPES_MODULE_NAMES = [
    'AsyncGeneratorType', 'CellType', 'CodeType', 'CoroutineType', 'EllipsisType', 'FrameType',
    'FunctionType', 'GeneratorType', 'GenericAlias', 'MappingProxyType', 'MethodType', 'ModuleType',
    'NoneType', 'NotImplementedType', 'TracebackType', 'UnionType',
]

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'scripts'))
from tonel_methods import Method, remove_methods, set_methods  # noqa: E402

# ``__doc__'' for the builtin FUNCTIONS. Grail implements them as Smalltalk methods, so no
# FunctionDefAst ran for them and ClassDefAst's ___methodDocTable___ -- which captures the
# docstring of a class-body def -- has nothing to capture; the read answered None, and
# functools.update_wrapper copied that None onto every wrapper built around a builtin. So the
# table is declared for the ``builtins'' module class (as functools hand-declares
# ___methodSignatureTable___ for cmp_to_key), and BoundMethod >> __doc__ finds it through the
# ordinary superclass walk. Builtin TYPES (dict, list, str, the exceptions) are a table of their
# own, ___typeDocTable___, which Object >> __doc__ reads for a class with no docstring of its own.
OUT = ROOT / 'src/Grail-Python-Modules-PyEnv/builtins.extension.st'

SOURCE_HEAD = """___methodDocTable___
	"CPython's ``__doc__'' for each builtin function, keyed by the name.
	Read by BoundMethod >> __doc__ through its superclass walk.  GENERATED --
	see the file header."

	^ ((KeyValueDictionary @env0:new)"""

SOURCE_TAIL = """
		@env0:yourself)
"""

TYPE_SOURCE_HEAD = """___typeDocTable___
	"CPython's ``__doc__'' for each builtin type, keyed by the name, and None
	for a type CPython gives none.  Read by Object >> ___builtinTypeDocstring___.
	GENERATED -- see the file header."

	^ ((KeyValueDictionary @env0:new)"""


TYPES_MODULE_SOURCE_HEAD = """___typesModuleDocTable___
	"CPython's ``__doc__'' for each type the types module names that builtins
	does not bind, keyed by the type's ``__name__'', and None for a type CPython
	gives none.  Read by Object >> ___typesModuleTypeDocstringNamed:in:.
	GENERATED -- see the file header."

	^ ((KeyValueDictionary @env0:new)"""

METHOD_SOURCE_HEAD = """___methodDocTableFor_%s___
	"CPython's ``__doc__'' for each public method the builtin type %s defines,
	keyed by the method's name.  Read by Object >> ___builtinMethodDocstringFor:,
	which walks the type's MRO for inherited ones.  GENERATED -- see the file
	header."

	^ ((KeyValueDictionary @env0:new)"""

METHOD_TABLE = re.compile(r'___methodDocTableFor_([A-Za-z_][A-Za-z0-9_]*?)___')


def method_docs(cls):
    """The documented public methods cls itself defines: its own, not its bases',
    since the reader walks the MRO.  Class and static methods count; data
    descriptors (int.real) do not, as they are not callable."""
    docs = []
    for name, value in vars(cls).items():
        if name.startswith('_'):
            continue
        attribute = getattr(cls, name)
        if callable(attribute) and attribute.__doc__:
            docs.append((name, attribute.__doc__))
    return sorted(docs)


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

    missing = [n for n in TYPE_NAMES if not isinstance(getattr(builtins, n, None), type)]
    if missing:
        sys.exit(f'not builtin types in this interpreter: {missing}')
    type_entries = []
    for name in TYPE_NAMES:
        doc = getattr(builtins, name).__doc__
        value = smalltalk_string(doc) if doc else 'None'
        type_entries.append(f"\n\t\t@env0:at: '{name}' put: {value};")

    import types
    types_module_entries = []
    for name in TYPES_MODULE_NAMES:
        cls = getattr(types, name)
        if isinstance(getattr(builtins, cls.__name__, None), type):
            sys.exit(f'types.{name} is bound in builtins; it belongs in TYPE_NAMES')
        doc = cls.__doc__
        if doc is not None and not isinstance(doc, str):
            sys.exit(f'types.{name}.__doc__ is a {type(doc).__name__}, not a docstring')
        value = smalltalk_string(doc) if doc else 'None'
        types_module_entries.append(f"\n\t\t@env0:at: '{cls.__name__}' put: {value};")

    method_tables = []
    for name in TYPE_NAMES:
        docs = method_docs(getattr(builtins, name))
        if docs:
            body = ''.join(f"\n\t\t@env0:at: '{method}' put: {smalltalk_string(doc)};" for method, doc in docs)
            method_tables.append((name, len(docs), METHOD_SOURCE_HEAD % (name, name) + body + SOURCE_TAIL))

    # A type that no longer documents a method loses its table rather than keep a stale one.
    tabled = {name for name, _, _ in method_tables}
    remove_methods(str(OUT), lambda meta, selector: not (
        meta and METHOD_TABLE.fullmatch(selector) and METHOD_TABLE.fullmatch(selector).group(1) not in tabled))
    set_methods(str(OUT), 'builtins', [
        Method(meta=True, category='Grail-Docstrings', source=SOURCE_HEAD + ''.join(entries) + SOURCE_TAIL),
        Method(meta=True, category='Grail-Docstrings',
               source=TYPE_SOURCE_HEAD + ''.join(type_entries) + SOURCE_TAIL),
        Method(meta=True, category='Grail-Docstrings',
               source=TYPES_MODULE_SOURCE_HEAD + ''.join(types_module_entries) + SOURCE_TAIL)]
        + [Method(meta=True, category='Grail-Docstrings', source=source) for _, _, source in method_tables])
    print(f'wrote {OUT} with {len(entries)} function, {len(type_entries)} type and '
          f'{len(types_module_entries)} types-module docstrings, '
          f'and {sum(count for _, count, _ in method_tables)} method docstrings for {len(method_tables)} types'
          + (f' (no docstring in CPython, skipped: {skipped})' if skipped else ''))


if __name__ == '__main__':
    main()
