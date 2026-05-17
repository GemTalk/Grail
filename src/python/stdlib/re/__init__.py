# GRAIL: minimal stub.
#
# CPython's re/__init__.py (428 lines, archived next to this file as
# __init__.cpython.py) defines a `Scanner` class whose methods reference
# module-level names (`_compiler`, `_parser`, `RegexFlag`).  In Python's
# LEGB resolution that works because class methods can see the enclosing
# module's globals; Grail translates each Python class into a real
# Smalltalk class with no implicit pointer back to its enclosing module
# instance, so a `_compiler` reference inside a class method resolves as
# a bare unknown identifier and fails at Smalltalk compile time.
#
# Until that wiring exists, this stub lets the `re` *package* load (so
# `re._constants` and `re._casefix` can be imported as submodules) while
# the public regex API (`re.compile`, `re.match`, etc.) is intentionally
# absent — those still need `_parser.py` and `_compiler.py` portable.
# See TODO.md > "Stdlib port deviations" for the revert condition.

_grail_stub = True
