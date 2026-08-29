"""Grail's minimal ``site`` module.

CPython's site module is what makes ``pip install X; import X`` work: at
interpreter startup it puts the site-packages directories on ``sys.path`` and
then reports where they are.  Grail does the same job, but the WORK happens in
Smalltalk, in ``sys >> initialize_path_info`` (src/smalltalk/Python/sys.gs),
because sys.path has to be populated before any Python module -- this one
included -- can be imported.

So this module REPORTS what sys already computed rather than computing the same
rules a second time; ``sys.__grail_site_packages__`` and
``sys.__grail_user_site__`` are the single source of truth, and a change to the
bootstrap rules is made in one place.

What Grail deliberately does NOT do is adopt the HOST CPython's site-packages
-- neither ``site.getsitepackages()`` nor ``site.getusersitepackages()`` of the
python3 on $PATH.  Those trees are full of wheels carrying compiled extensions
Grail cannot load, so adopting them would turn a clean ModuleNotFoundError into
a confusing dlopen/ABI failure.  The directories reported here are Grail's own:
an active $VIRTUAL_ENV's site-packages, and $GRAIL_SITE_PACKAGES (default
~/.grail/site-packages).

NOT covered, because nothing in Grail can honour them: sitecustomize /
usercustomize hooks, ``python -S``, the ``site`` command-line interface, and
the ``import`` lines inside .pth files (see addpackage below).
"""

import os
import sys

__all__ = [
    "addsitedir",
    "addpackage",
    "getsitepackages",
    "getusersitepackages",
    "getuserbase",
    "ENABLE_USER_SITE",
    "USER_SITE",
    "USER_BASE",
]


def _reported_user_site():
    """Where sys decided Grail's user site directory is, or None."""
    d = getattr(sys, "__grail_user_site__", None)
    if d is None:
        return None
    return str(d)


def _reported_site_packages():
    """The site-packages directories sys put on the path, as a plain list."""
    dirs = getattr(sys, "__grail_site_packages__", None)
    if dirs is None:
        return []
    return list(dirs)


#: Grail's per-user site directory.  Reported even when it does not exist yet,
#: because the useful question this answers is "where do I install to?", which
#: a caller asks BEFORE creating the directory.  (sys.path only gains it once
#: it exists.)
USER_SITE = _reported_user_site()

#: The parent of USER_SITE, matching CPython's USER_BASE/USER_SITE relationship.
USER_BASE = os.path.dirname(USER_SITE) if USER_SITE else None

#: True when Grail has a user site directory to report at all.  It is False
#: only when $HOME is unset, since that is the one case where no default path
#: can be formed -- Grail has no ``python -s`` switch to turn it off.
ENABLE_USER_SITE = USER_SITE is not None


def getusersitepackages():
    """The path to Grail's user site-packages directory.

    ``pip install --target $(grail -c 'import site; print(site.getusersitepackages())') X``
    is the Grail equivalent of ``pip install --user X``.
    """
    return USER_SITE


def getuserbase():
    """The base directory Grail's user site lives under."""
    return USER_BASE


def getsitepackages(prefixes=None):
    """Grail's site-packages directories -- an active virtualenv's, if any.

    ``prefixes`` is accepted for signature compatibility and ignored: Grail has
    no installation prefix of its own to enumerate, and answering the host
    CPython's prefixes is exactly the thing this module refuses to do.
    """
    return _reported_site_packages()


def addsitedir(sitedir, known_paths=None):
    """Append ``sitedir`` to sys.path, then process any .pth files in it.

    Appending is idempotent, unlike CPython's, where a fresh process makes the
    question moot; a Grail session is long-lived and a caller may reasonably
    call this twice.
    """
    if sitedir not in sys.path:
        sys.path.append(sitedir)
    try:
        names = os.listdir(sitedir)
    except OSError:
        return known_paths
    pth = [n for n in names if n.endswith(".pth")]
    pth.sort()
    for name in pth:
        addpackage(sitedir, name, known_paths)
    return known_paths


def addpackage(sitedir, name, known_paths=None):
    """Add the directories named by one .pth file to sys.path.

    Deviation from CPython, deliberate: a line beginning with ``import`` is
    SKIPPED rather than executed.  CPython runs those lines as code at startup,
    which is how tooling like virtualenv's ``_virtualenv.pth`` patches the
    interpreter -- patches aimed at CPython internals Grail does not have, so
    running them would fail loudly at import time for no benefit.  Every other
    line is treated as a directory, relative to sitedir unless absolute, and is
    added only if it exists.
    """
    fullname = os.path.join(sitedir, name)
    try:
        f = open(fullname, "r")
    except OSError:
        return known_paths
    try:
        lines = f.readlines()
    finally:
        f.close()
    for line in lines:
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("import ") or line.startswith("import\t"):
            continue
        d = line if os.path.isabs(line) else os.path.join(sitedir, line)
        if d not in sys.path and os.path.isdir(d):
            sys.path.append(d)
    return known_paths


def main():
    """A no-op.

    CPython calls this at startup to build sys.path; Grail has already done
    that work in ``sys >> initialize_path_info`` before this module could be
    imported, so re-running it here would only duplicate entries.
    """
    return None
