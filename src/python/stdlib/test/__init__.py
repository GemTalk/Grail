# GRAIL: trimmed test package.
#
# CPython's real Lib/test/__init__.py is nearly empty (it only sets a
# __path__ hint for the regression runner).  We keep it empty so that
# `import test` and `from test import support` resolve as a package
# without dragging in CPython's regrtest machinery, which Grail does
# not run (see docs/CPython_Suite_Scoreboard.md).
