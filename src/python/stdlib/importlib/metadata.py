# Minimal ``importlib.metadata'' stub for Grail.
#
# CPython's importlib.metadata reads installed-package metadata
# (``version'', ``entry_points'', ``distributions'').  Flask uses
# only ``version('flask')'' / ``version('werkzeug')'' to print a
# banner in flask.cli, and ``entry_points()'' to discover
# user-registered CLI extensions (Grail has no entry-point
# registry — returns an empty group).
#
# Returning a stable string keeps the banner happy; real version
# discovery can wait for an extension-point registry.


_FAKE_VERSIONS = {
    'flask': '3.1.0+grail',
    'werkzeug': '3.1.5+grail',
    'jinja2': '3.1.0+grail',
    'click': '0+grail-stub',
    'itsdangerous': '2.0+grail',
    'blinker': '1.0+grail',
    'markupsafe': '2.0+grail',
}


class PackageNotFoundError(Exception):
    """Raised when a package's distribution metadata isn't installed."""


def version(distribution_name):
    """Return a stub version string for known distributions; raise
    PackageNotFoundError for unknown ones to match CPython."""
    name = distribution_name.lower().replace('-', '_').replace('.', '_')
    if name in _FAKE_VERSIONS:
        return _FAKE_VERSIONS[name]
    raise PackageNotFoundError(distribution_name)


def entry_points(group=None, name=None):
    """Return an empty group — Grail has no installed-package
    entry-point registry yet.  Returns a list of EntryPoint
    objects; group-filtered selection yields the empty list."""
    return []


class EntryPoint:
    """Stub click-EntryPoint shape — exposed so isinstance checks
    against ``entry_points()`` results don't blow up."""

    def __init__(self, name, value, group):
        self.name = name
        self.value = value
        self.group = group

    def load(self):
        raise PackageNotFoundError(self.value)


def distribution(name):
    raise PackageNotFoundError(name)


def distributions():
    return []
