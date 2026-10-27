"""Redeploy phase of tests/scripts/run_grail_upgrade_test.sh, run under Grail m
before the verify phase:

    grail redeploy_phase.py

What an application does after upgrading Grail: imports itself inside the
transaction that commits it. That import rebuilds the app's modules -- and the
stdlib's -- under m and commits them, so the verify phase's session warm-binds
what the rebuild committed rather than rebuilding again in its own transaction,
which would hide anything a rebuild fails to commit.
"""
import gemdb

with gemdb.transaction():
    import upgrade_app

print('redeploy phase: %s' % upgrade_app.__name__)
