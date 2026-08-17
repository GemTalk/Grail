"""Fixture: mock.patch may shadow a BUILTIN name on a module.

CPython's ``_patch.get_original`` has a deliberate special case:

    if name in _builtins and isinstance(target, ModuleType):
        self.create = True

-- so patching ``<module>.super'', a name no module defines, is allowed rather
than an AttributeError, and the name is REMOVED again on exit instead of being
restored to something.  Shadowing a builtin per module is a real thing to test,
which is what test_super's test_shadowed_dynamic does.

Grail's mock port raised AttributeError before the patch could be installed, so
the test failed in the harness rather than in the code under test.  Two things
had to change, and the second is the interesting one: the ``is it a module''
test cannot be ``isinstance(target, ModuleType)'' here, because every Grail
module is its OWN class (type(os) is the ``os'' class, deriving from ``module'')
and types.ModuleType is a separate stub that no real module inherits from -- so
that test answers False for every module there is.  sys.modules is asked
instead, which is exact and needs no type machinery.

Run under CPython this fixture measures CPython's own rule; run under Grail it
measures whether the port matches it.
"""

import sys

# ``unittest.mock'', not the top-level ``mock'': the implementation lives in
# Grail's top-level mock.py, but only the unittest.mock spelling exists in both
# CPython and Grail -- and this fixture has to run under CPython to be worth
# anything (scripts/check_python_fixtures.sh).
from unittest.mock import patch

r = {}

# A builtin name the module does not define: patchable, and gone afterwards.
r["before"] = hasattr(sys.modules[__name__], "super")
with patch(f"{__name__}.super", 42):
    r["during"] = getattr(sys.modules[__name__], "super")
r["after"] = hasattr(sys.modules[__name__], "super")

# A name the module DOES define is ordinary patch-and-restore, not create.
existing = "kept"
with patch(f"{__name__}.existing", "replaced"):
    r["existing_during"] = existing
r["existing_after"] = existing

# A name that is neither defined nor a builtin stays an error -- that is a typo,
# and widening create=True to everything would swallow it.
try:
    with patch(f"{__name__}.not_a_builtin_and_not_defined", 1):
        r["typo"] = "NOT RAISED"
except AttributeError:
    r["typo"] = "AttributeError"


EXPECTED = {
    "before": False,
    "during": 42,
    "after": False,
    "existing_during": "replaced",
    "existing_after": "kept",
    "typo": "AttributeError",
}


if __name__ == "__main__":
    for key, expected in EXPECTED.items():
        actual = r[key]
        print("%-4s %s -> %r" % ("OK" if actual == expected else "FAIL",
                                 key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print("%-4s %s is not in EXPECTED" % ("FAIL", extra))
