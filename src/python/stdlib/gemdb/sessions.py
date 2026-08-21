"""Who is connected to the database.

Every session -- yours, other developers', and the system's own service
gems -- as plain dicts::

    import gemdb.sessions

    gemdb.sessions.current()
    # {"session_id": 5, "user": "DataCurator", "pid": 12345,
    #  "host": "mymac", "name": None, "current": True}

    for s in gemdb.sessions.all():
        print(s["session_id"], s["user"], s["name"] or "")

``name`` is set for the system's own gems (``"symbolgem"``,
``"gcadmin"``, ...) and ``None`` for ordinary logins, so it doubles as
the "is this a person?" test.  Listing sessions other than your own
requires the SessionAccess privilege; GemDB's own user has it.
"""

# Module-body import only -- see the import comment in gemdb/__init__.py.
import gemstone as _gemstone


def current():
    """This session's description dict."""
    return _gemstone.describe_session(_gemstone.session_serial)


def all():
    """Every current session, system gems included, as a list of dicts."""
    return [_gemstone.describe_session(sid) for sid in _gemstone.session_ids]


__all__ = ["current", "all"]

# Warm the function-attribute caches during the cold import (committed
# with the module -- same reasoning as gemdb/__init__.py).  The read of
# gemstone.describe_session matters most: it is an argument-taking
# method, so its BoundMethod is cached on the committed gemstone module
# instance, and an unwarmed first call per session would dirty the
# transaction.  session_serial / session_ids are accessors -- performed
# on read, never cached -- and need no warming.
import sys as _sys

_self = _sys.modules["gemdb.sessions"]
for _name in ("current", "all"):
    getattr(_self, _name)
_precached = _gemstone.describe_session
del _self, _name, _sys
