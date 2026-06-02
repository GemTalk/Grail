# Grail in-process auto-reloader.
#
# CPython's werkzeug reloader spawns a CHILD PROCESS that re-executes the whole
# program on every source change.  Grail has no such subprocess -- and doesn't
# need one: the persistent image keeps every unmodified module warm, so the
# reloader only has to (a) notice which watched source files changed and
# (b) reload just those modules and rebuild the app from an application factory.
# That is strictly less work than CPython's full cold re-import.
#
# No background thread is used either -- the change check runs in the serve loop
# between requests, which fits the cooperative GsProcess model (a watcher thread
# would only get to run when the acceptor blocks anyway).
#
# Because reloading a module does NOT retroactively update an already-built
# Flask app (its url_map holds the OLD view-function objects), the unit of reload
# here is an application FACTORY: on change we reload the changed modules and
# re-run the factory to get a fresh app -- the standard Flask ``create_app``
# pattern, so no Flask code is modified.

import importlib
import os
import sys


class StatReloader:
    """Polls the mtimes of a set of watched files and reports / reloads the
    modules whose source changed."""

    def __init__(self, watch=None):
        # watch: iterable of (filepath, module_name) pairs.
        self._watch = list(watch or [])
        self._mtimes = {}
        self._snapshot()  # establish the baseline

    def add(self, filepath, module_name):
        self._watch.append((filepath, module_name))
        self._mtimes[filepath] = self._mtime(filepath)

    def _mtime(self, path):
        try:
            return os.path.getmtime(path)
        except OSError:
            return None

    def _snapshot(self):
        for filepath, _ in self._watch:
            self._mtimes[filepath] = self._mtime(filepath)

    def changed_modules(self):
        """Return the module names whose source file changed since the last
        call, updating the baseline."""
        changed = []
        for filepath, module_name in self._watch:
            m = self._mtime(filepath)
            if self._mtimes.get(filepath) != m:
                changed.append(module_name)
            self._mtimes[filepath] = m
        return changed

    def reload_changed(self):
        """Reload (in place) every module whose source changed; return their
        names.  Empty when nothing changed."""
        names = self.changed_modules()
        for name in names:
            mod = sys.modules.get(name)
            if mod is not None:
                importlib.reload(mod)
        return names


def _resolve_factory(factory):
    """Return a zero-arg callable that builds a fresh WSGI app.

    ``factory`` may be the callable itself, or a ``"module:attr"`` spec (the
    Flask ``--app`` convention).  For the spec form the attribute is re-fetched
    from ``sys.modules`` on every call, so it always reflects the most recently
    reloaded module (a direct callable reference would go stale after reload)."""
    if callable(factory):
        return factory

    modname, _, attr = factory.partition(":")
    attr = attr or "create_app"

    def build():
        mod = importlib.import_module(modname)
        target = getattr(mod, attr)
        return target() if callable(target) else target

    return build


def run_with_reloader(factory, watch, host="127.0.0.1", port=5000,
                      interval=1, max_cycles=None, on_serving=None):
    """Serve ``factory()``'s WSGI app, rebuilding it when a watched file changes.

    factory     : a ``"module:attr"`` spec or a zero-arg callable returning a
                  fresh WSGI app (an application factory, e.g. ``create_app``).
    watch       : list of ``(filepath, module_name)`` to watch and reload.
    interval    : seconds to wait for a request before re-checking for changes.
    max_cycles  : stop after this many (re)builds (for tests); None = forever.
    on_serving  : optional callback(server, cycle) invoked right after each
                  (re)build -- lets a caller learn the bound port / drive a
                  client in a test.

    Returns the number of build cycles performed (only meaningful when
    ``max_cycles`` bounds the loop)."""
    build = _resolve_factory(factory)
    reloader = StatReloader(watch)
    cycles = 0
    while True:
        app = build()
        server = make_server_for(host, port, app)
        server.timeout = interval
        cycles += 1
        if on_serving is not None:
            on_serving(server, cycles)
        # Serve until a watched file changes (or the cycle budget is spent).
        while True:
            if reloader.reload_changed():
                break  # rebuild from the reloaded code
            if max_cycles is not None and cycles >= max_cycles:
                server.server_close()
                return cycles
            server.handle_request()  # one request, or a timeout after `interval`
        server.server_close()
        if max_cycles is not None and cycles >= max_cycles:
            return cycles


def make_server_for(host, port, app):
    # Imported lazily so this module has no import-time dependency on the
    # serving stack (and to avoid a circular import with werkzeug.serving).
    from werkzeug.serving import make_server
    return make_server(host, port, app)
