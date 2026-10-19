"""Write phase of tests/scripts/run_grail_upgrade_test.sh, run under Grail n:

    grail write_phase.py <expected.json>

Imports the app inside the transaction that commits it (so the app module is
deployed, as a real app's would be), stores upgrade_app.build() under
gemdb.root['upgrade'], and writes what an app observes about it to
<expected.json>, for the verify phase to compare against under Grail m.
"""
import json
import sys

import gemdb

with gemdb.transaction():
    import upgrade_app
    gemdb.root['upgrade'] = upgrade_app.build()

stored = gemdb.root['upgrade']
with open(sys.argv[1], 'w') as f:
    json.dump(upgrade_app.describe(stored), f, indent=1, sort_keys=True)
print('write phase: stored %d values' % len(stored))
