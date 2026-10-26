"""The namespaced application of tests/scripts/run_grail_upgrade_test.sh. Its
top file: one for every phase, because a namespace has exactly one top file.

    grail --namespace grail_upgrade_ns upgrade_ns_main.py write <expected.json>   (Grail n)
    grail --namespace grail_upgrade_ns upgrade_ns_main.py redeploy                (Grail m)
    grail --namespace grail_upgrade_ns upgrade_ns_main.py verify <expected.json>  (Grail m)

In a named namespace (docs/App_Namespaces_Design.md) this file's globals are
persistent and gemdb.root is a view of them, and the modules it imports that are
not Grail's -- upgrade_ns_app.py and upgrade_ns_phases.py -- are deployed in the
namespace, not the default one. The phases are in upgrade_ns_phases.py.

Two things this file avoids, each because it dirties EVERY re-run of a top file
in a namespace, upgrade or not (measured on 4.0.0.a5), which would fail
ns.runs.import_writes_nothing for a reason that has nothing to do with upgrading:

  * choosing the namespace with a gemdb.use_namespace() first statement -- the
    restart that call makes leaves the session dirty -- so the launcher's
    --namespace chooses it;
  * a top-level function with parameters -- the body's re-run drops and
    re-records the committed signature record (GrailCanonicalFunctionMeta) --
    so the phases' functions live in a module. A class's methods are fine.
"""
import gemdb
import gemstone
import upgrade_ns_app
import upgrade_ns_phases

# Session state only: never committed, so the verify phase's run writes nothing.
__transient__ = ['WRITES_AT_IMPORT', 'sys', 'phase']
# FIRST, before this file's later imports: running the top file and binding its
# modules after an upgrade must write nothing, or the session is dirty.
WRITES_AT_IMPORT = (gemstone.needs_commit, list(gemstone.uncommitted_imports))

import sys  # noqa: E402


class Note:
    """A class of the top file itself: the namespace's __main__ module."""

    def __init__(self, text):
        self.text = text

    def shout(self):
        return self.text.upper() + '!'


phase = sys.argv[1] if len(sys.argv) > 1 else None
if phase == 'write':
    upgrade_ns_phases.write(sys.argv[2], Note)
elif phase == 'redeploy':
    upgrade_ns_phases.redeploy()
elif phase == 'verify':
    sys.exit(upgrade_ns_phases.verify(sys.argv[2], Note, WRITES_AT_IMPORT))
else:
    # Run without a phase: by something other than this app.
    upgrade_ns_phases.ran_without_phase()
