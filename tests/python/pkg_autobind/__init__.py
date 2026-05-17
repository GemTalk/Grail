# Fixture package for SubmoduleAutoBindTestCase.  Exercises the
# rule that loading a submodule (via any path, not just
# ``___import__:``) binds it as an attribute on the parent package.
#
# The package's __init__.py uses ``from . import _leaf`` — which
# only works if ``_leaf`` (already loaded by the test's setUp) is
# reachable as ``pkg_autobind._leaf`` attribute, not just as a
# sys.modules['pkg_autobind._leaf'] entry.

from . import _leaf

leaf_value = _leaf.VALUE
