"""A package installed on sys.path beats Grail's stand-in of the same name.

Grail ships small stand-ins for click and requests so its bundled Flask and
the twilio demo run with nothing installed.  They sat in the ported stdlib,
which is searched before sys.path, so a project that pip-installed the real
package still imported the stand-in.  They now sit in a fallback root
searched after sys.path, and a real one there wins -- what CPython does,
where whatever sys.path finds is the package.

Every expectation was measured against CPython 3.14.  (That the stand-in
answers when nothing is installed is Grail-only, so the SUnit class checks it
directly.)
"""

import importlib
import os
import sys
import tempfile

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:200])


_root = tempfile.mkdtemp()
for _rel, _text in [('click/__init__.py', "MARK = 'installed click'\n"),
                    ('requests/__init__.py', "MARK = 'installed requests'\n"),
                    ('requests/models.py', "class Response:\n    MARK = 'installed models'\n")]:
    os.makedirs(os.path.dirname(os.path.join(_root, _rel)), exist_ok=True)
    with open(os.path.join(_root, _rel), 'w') as _fh:
        _fh.write(_text)

_names = ('click', 'requests', 'requests.models')
_saved = {n: sys.modules.pop(n) for n in _names if n in sys.modules}
sys.path.insert(0, _root)
try:
    import click
    import requests
    from requests.models import Response
    check('an_installed_click_wins',
          (click.MARK, os.path.dirname(os.path.dirname(click.__file__)) == _root),
          ('installed click', True))
    check('an_installed_requests_wins',
          (requests.MARK, os.path.dirname(os.path.dirname(requests.__file__)) == _root),
          ('installed requests', True))
    check('and_its_submodules_come_from_it', Response.MARK, 'installed models')
finally:
    sys.path.remove(_root)
    for _n in _names:
        sys.modules.pop(_n, None)
    sys.modules.update(_saved)

SUMMARY = '%d checks, %d disagreeing' % (len(RESULTS), sum(1 for v in RESULTS.values() if v is not True))

if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
