"""A module of the app's own, imported by upgrade_app, for
tests/scripts/run_grail_upgrade_test.sh.

It sorts AFTER upgrade_app, so an install's redeploy (scripts/redeployModules.gs)
rebuilds upgrade_app first, while this one is still stale -- and the install's
sys.path does not have the app's directory, so that import is ``No module named
'upgrade_wire''' until a later pass has rebuilt this module.  GemDB 1.9.0's
routes_api and wire, measured (GemTalk/Grail#1884): the redeploy must report
upgrade_app rebuilt after a retry, not failed.
"""


def wired(x):
    return 'wired:%s' % (x,)
