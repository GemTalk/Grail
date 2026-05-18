# GRAIL stub for the __future__ module.
#
# CPython's __future__ exposes feature flags that change how the
# compiler parses certain constructs in the module that imports them
# (e.g. `from __future__ import annotations` switches all annotations
# to lazy strings).  Grail's compiler already lazies annotations and
# doesn't have toggleable feature flags, so the imports are no-ops.
# Provide the flag names so `from __future__ import X` succeeds.

annotations = None
division = None
absolute_import = None
print_function = None
unicode_literals = None
generator_stop = None
nested_scopes = None
with_statement = None
generators = None
barry_as_FLUFL = None
