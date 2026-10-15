"""The real third-party package when one is installed, else Grail's stand-in.

Grail's vendored Flask needs ``click'' and its vendored twilio needs
``requests''.  Neither is ported: Grail ships small stand-ins,
``_grail_click'' and ``_grail_requests'', so those two run with nothing
installed.  The stand-ins used to be named ``click'' and ``requests'' in the
ported stdlib, which is searched before sys.path, so a project that
pip-installed the real package still imported the stand-in, and the
package census measured click's and requests' own test suites against it.
Worse, once Flask was deployed the stand-in was the deployed module of that
name, and an import that then found the real package was refused as a
different module under a deployed name.

Under private names nothing of Grail's is ever ``click'' or ``requests'':
whatever is installed is the only module by that name.  The vendored code
imports through installed_or_stand_in(), which falls back only when the
package itself is absent -- an installed one that fails to import raises,
rather than being silently replaced.
"""

import importlib


def installed_or_stand_in(name, stand_in):
    """Import ``name'' (``click'', ``click.testing''); if its top-level
    package is not installed, import ``stand_in'' instead."""
    try:
        return importlib.import_module(name)
    except ModuleNotFoundError as exc:
        top = name.partition('.')[0]
        if exc.name not in (name, top):
            raise
    return importlib.import_module(stand_in)
