# Fixture for StandInPackagesTestCase -- the Grail-only half.  (The half
# CPython can check, that an installed click or requests on sys.path is
# the one imported, is tests/python/installed_package_beats_stand_in.py.)
#
# Grail's stand-ins for click and requests are _grail_click and
# _grail_requests; its vendored Flask and twilio reach them through
# _grail_standins.installed_or_stand_in(), which falls back only when the
# package is not installed.

import importlib.util
import os
import sys
import tempfile

from _grail_standins import installed_or_stand_in

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:200])


check('grail_ships_no_click_or_requests',
      [importlib.util.find_spec(n) for n in ('click', 'requests')], [None, None])
check('the_stand_in_answers_when_nothing_is_installed',
      [installed_or_stand_in('click', '_grail_click').__name__,
       installed_or_stand_in('click.testing', '_grail_click.testing').__name__,
       installed_or_stand_in('requests.adapters', '_grail_requests.adapters').__name__],
      ['_grail_click', '_grail_click.testing', '_grail_requests.adapters'])

_root = tempfile.mkdtemp()
os.makedirs(os.path.join(_root, 'grail_broken_pkg'))
with open(os.path.join(_root, 'grail_broken_pkg', '__init__.py'), 'w') as _fh:
    _fh.write('import grail_missing_dependency\n')
sys.path.insert(0, _root)
try:
    try:
        installed_or_stand_in('grail_broken_pkg', '_grail_click')
        _got = 'fell back'
    except ModuleNotFoundError as exc:
        _got = exc.name
    check('an_installed_package_that_fails_to_import_raises', _got,
          'grail_missing_dependency')
finally:
    sys.path.remove(_root)
    sys.modules.pop('grail_broken_pkg', None)

import flask.cli
import twilio.http.http_client
check('flask_and_twilio_use_the_stand_ins',
      [flask.cli.click.__name__, twilio.http.http_client.Session.__module__],
      ['_grail_click', '_grail_requests.sessions'])
