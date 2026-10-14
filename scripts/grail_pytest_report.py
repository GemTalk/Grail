"""pytest plugin for scripts/pypi_package_tests.py: one line per test outcome.

Loaded by name (``-p grail_pytest_report``) under BOTH interpreters, so the two
runs are compared on exactly the same report.  Each line is

    GRAIL_TEST|<outcome>|<nodeid>

printed and flushed as the test finishes, so a session that dies or hangs has
still reported everything before it.  ``GRAIL_START|<nodeid>'' as each test
begins names the one a dead or silent session was running, and
``GRAIL_COLLECTED|<n>'' says how many were selected; ``GRAIL_COLLECTING|<nodeid>''
as each file, class or directory finishes collecting shows a long collection
is still alive.  <outcome> is passed, failed, skipped,
xfailed, xpassed, error (a failing setup or teardown) or collecterror (a file
or directory that failed to collect; <nodeid> is the collector's).

GRAIL_TEST_DESELECT names a file of node ids to leave out: the runner resumes a
run that died on test N with everything up to and including N deselected.
"""

import os
import sys

_seen = {}


def _emit(outcome, nodeid):
    sys.__stdout__.write('\nGRAIL_TEST|%s|%s\n' % (outcome, nodeid))
    sys.__stdout__.flush()


def pytest_collection_modifyitems(config, items):
    path = os.environ.get('GRAIL_TEST_DESELECT')
    if not path or not os.path.exists(path):
        return
    with open(path, encoding='utf-8') as fh:
        drop = set(line.rstrip('\n') for line in fh if line.strip())
    keep = [item for item in items if item.nodeid not in drop]
    gone = [item for item in items if item.nodeid in drop]
    if gone:
        config.hook.pytest_deselected(items=gone)
        items[:] = keep


def pytest_collection_finish(session):
    sys.__stdout__.write('GRAIL_COLLECTED|%d\n' % len(session.items))
    sys.__stdout__.flush()


def pytest_runtest_logstart(nodeid, location):
    sys.__stdout__.write('\nGRAIL_START|%s\n' % nodeid)
    sys.__stdout__.flush()


def pytest_runtest_logreport(report):
    nodeid = report.nodeid
    if report.when == 'setup':
        if report.skipped:
            _seen[nodeid] = 'xfailed' if hasattr(report, 'wasxfail') else 'skipped'
            _emit(_seen[nodeid], nodeid)
        elif report.failed:
            _seen[nodeid] = 'error'
            _emit('error', nodeid)
    elif report.when == 'call':
        if hasattr(report, 'wasxfail'):
            outcome = 'xpassed' if report.passed else 'xfailed'
        elif report.passed:
            outcome = 'passed'
        elif report.skipped:
            outcome = 'skipped'
        else:
            outcome = 'failed'
        _seen[nodeid] = outcome
        _emit(outcome, nodeid)
    elif report.when == 'teardown' and report.failed:
        # A passing test whose teardown fails counts as an error, as pytest's
        # own summary does; report it again so the last word is the error.
        if _seen.get(nodeid) != 'error':
            _seen[nodeid] = 'error'
            _emit('error', nodeid)


def pytest_collectreport(report):
    # A line per collector finished, so a long collection is visibly alive:
    # the runner's watchdog kills a session that prints nothing for --timeout
    # seconds, and botocore's 80,000 tests take longer than that to collect.
    sys.__stdout__.write('GRAIL_COLLECTING|%s\n' % (report.nodeid or '<session>'))
    sys.__stdout__.flush()
    if report.failed:
        _emit('collecterror', report.nodeid or '<session>')
