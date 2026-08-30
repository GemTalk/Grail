"""``sys.meta_path`` -- PEP 302 / PEP 451 finders, and what they may shadow.

Grail let you install a finder into ``sys.meta_path`` and never asked it
anything.  That is the whole reason ``import six.moves.urllib.parse`` failed:
six installs a meta-path importer that FABRICATES its ``six.moves.*`` modules,
so with meta_path unread there is nothing on disk to find.

Grail now consults meta_path where CPython does -- after the ``sys.modules``
cache, before the filesystem search, which is itself just the last finder
(CPython's PathFinder).  The checks below split into two groups.

SHARED: everything a finder is entitled to do.  These are measured against
CPython 3.14 and pass there too.

GRAIL-ONLY (printed XFAIL when this file is run under CPython, because CPython
is expected to disagree):

  * Grail's OWN stdlib cannot be shadowed.  CPython's protection for its own
    modules is the cache plus BuiltinImporter at meta_path[0] -- measured: a spy
    finder at meta_path[0] is never asked for ``os`` (preloaded) but IS asked
    for ``json``, ``struct``, ``datetime``, ``threading``.  So under CPython a
    finder CAN shadow ``traceback``.  Grail pins a GrailBuiltinImporter serving
    the modules Grail ships, and asks it first whatever its index -- because
    ``meta_path.insert(0, f)`` is the ordinary spelling of "ask mine first" and
    must not silently displace the tree Grail's own runtime imports from.

  * The legacy ``find_module``/``load_module`` protocol still works.  CPython
    removed it in 3.12; Grail keeps it, because the third-party finders that
    matter (six's included) still ship it alongside ``find_spec``.
"""

import sys

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


class _Fabricated:
    """Stands in for a module a finder invents out of nothing."""

    def __init__(self, name, **attrs):
        self.__name__ = name
        self.__dict__.update(attrs)


class SpecFinder:
    """PEP 451: find_spec + a loader with create_module / exec_module."""

    def __init__(self, table):
        self.table = table
        self.asked = []

    def find_spec(self, fullname, path=None, target=None):
        self.asked.append(fullname)
        if fullname not in self.table:
            return None
        from importlib.util import spec_from_loader
        return spec_from_loader(fullname, self)

    def create_module(self, spec):
        return self.table[spec.name]

    def exec_module(self, module):
        return None


class LegacyFinder:
    """PEP 302 only: find_module answers a loader, load_module builds it."""

    def __init__(self, table):
        self.table = table

    def find_module(self, fullname, path=None):
        return self if fullname in self.table else None

    def load_module(self, fullname):
        mod = self.table[fullname]
        sys.modules[fullname] = mod
        return mod


class ExecOnlyFinder:
    """A loader whose create_module answers None: the machinery has to make
    the module object itself (CPython's importlib.util.module_from_spec).
    CPython requires the method to EXIST once exec_module does -- returning
    None is how a loader asks for the default module."""

    def __init__(self, name, value):
        self.name = name
        self.value = value

    def find_spec(self, fullname, path=None, target=None):
        if fullname != self.name:
            return None
        from importlib.util import spec_from_loader
        return spec_from_loader(fullname, self)

    def create_module(self, spec):
        return None

    def exec_module(self, module):
        module.answer = self.value


class _Guard:
    """Install finders for the duration of a block, then put meta_path back."""

    def __init__(self, *finders):
        self.finders = finders

    def __enter__(self):
        self.saved = list(sys.meta_path)
        for f in reversed(self.finders):
            sys.meta_path.insert(0, f)
        return self

    def __exit__(self, *exc):
        sys.meta_path[:] = self.saved
        return False


def _forget(*names):
    """Drop names from sys.modules and answer what was there, so a check can
    restore it.  Without this the cache -- not the finder -- decides."""
    return [(n, sys.modules.pop(n, None)) for n in names]


def _restore(saved):
    for name, mod in saved:
        if mod is None:
            sys.modules.pop(name, None)
        else:
            sys.modules[name] = mod


# --------------------------------------------------------------- shared

def finder_serves_unowned_module():
    """The point of the feature: a finder may invent a module."""
    made = _Fabricated('grail_mp_probe', answer=42)
    with _Guard(SpecFinder({'grail_mp_probe': made})):
        saved = _forget('grail_mp_probe')
        try:
            import grail_mp_probe
            return grail_mp_probe.answer == 42 and \
                sys.modules['grail_mp_probe'] is made
        finally:
            _restore(saved)


def finder_serves_dotted_submodule():
    """six.moves' actual shape: a fabricated package and a fabricated child,
    reached by a dotted import whose every component comes from the finder."""
    pkg = _Fabricated('grail_mp_pkg')
    # A package is a module with a __path__; the import machinery refuses to
    # look for a submodule of anything else.
    pkg.__path__ = []
    sub = _Fabricated('grail_mp_pkg.leaf', answer='leaf')
    pkg.leaf = sub
    with _Guard(SpecFinder({'grail_mp_pkg': pkg, 'grail_mp_pkg.leaf': sub})):
        saved = _forget('grail_mp_pkg', 'grail_mp_pkg.leaf')
        try:
            from grail_mp_pkg.leaf import answer
            return answer == 'leaf'
        finally:
            _restore(saved)


def finder_declining_falls_through():
    """A finder that answers None for everything must not break ordinary
    imports -- the filesystem search still gets its turn."""
    spy = SpecFinder({})
    with _Guard(spy):
        saved = _forget('grail_mp_absent')
        try:
            try:
                import grail_mp_absent  # noqa: F401
                found = True
            except ImportError:
                found = False
            return (found is False) and ('grail_mp_absent' in spy.asked)
        finally:
            _restore(saved)


def first_claiming_finder_wins():
    """Order among user finders is list order."""
    first = _Fabricated('grail_mp_order', answer='first')
    second = _Fabricated('grail_mp_order', answer='second')
    with _Guard(SpecFinder({'grail_mp_order': first}),
                SpecFinder({'grail_mp_order': second})):
        saved = _forget('grail_mp_order')
        try:
            import grail_mp_order
            return grail_mp_order.answer == 'first'
        finally:
            _restore(saved)


def cached_module_is_never_offered():
    """The sys.modules cache short-circuits meta_path -- this is CPython's
    real protection for its own modules, and Grail keeps it."""
    spy = SpecFinder({'sys': _Fabricated('sys')})
    with _Guard(spy):
        import sys as reimported
        return reimported is sys and 'sys' not in spy.asked


def exec_module_without_create_module():
    """A loader may define exec_module alone; the machinery supplies the
    module object (CPython's importlib.util.module_from_spec)."""
    with _Guard(ExecOnlyFinder('grail_mp_execonly', 7)):
        saved = _forget('grail_mp_execonly')
        try:
            import grail_mp_execonly
            return grail_mp_execonly.answer == 7
        finally:
            _restore(saved)


def namespace_spec_without_a_loader():
    """A spec with loader None is a NAMESPACE spec: its
    submodule_search_locations are the portions and there is no code to run.
    ``__file__`` is not asserted -- CPython omits it, Grail sets it to None."""

    class NamespaceFinder:
        def find_spec(self, fullname, path=None, target=None):
            if fullname != 'grail_mp_ns':
                return None
            from importlib.util import spec_from_loader
            return spec_from_loader(fullname, None, is_package=True)

    with _Guard(NamespaceFinder()):
        saved = _forget('grail_mp_ns')
        try:
            import grail_mp_ns as m
            return m.__name__ == 'grail_mp_ns' and list(m.__path__) == []
        finally:
            _restore(saved)


def invalidate_caches_reaches_finders():
    """importlib.invalidate_caches() fans out to every meta_path finder that
    implements the hook -- the only signal a finder gets that a tree it
    indexed has changed."""
    import importlib

    calls = []

    class Indexed:
        def find_spec(self, fullname, path=None, target=None):
            return None

        def invalidate_caches(self):
            calls.append(1)

    with _Guard(Indexed()):
        importlib.invalidate_caches()
    return calls == [1]


def machinery_sets_module_dunders():
    """The module the machinery builds for an exec_module-only loader carries
    the attributes CPython's module_from_spec sets: name, package (empty for a
    top-level module), loader, spec.  ``__file__`` is deliberately not asserted
    -- CPython omits it entirely for a spec with no location."""
    loader = ExecOnlyFinder('grail_mp_dunders', 1)
    with _Guard(loader):
        saved = _forget('grail_mp_dunders')
        try:
            import grail_mp_dunders as m
            return (m.__name__ == 'grail_mp_dunders'
                    and m.__package__ == ''
                    and m.__loader__ is loader
                    and m.__spec__.name == 'grail_mp_dunders')
        finally:
            _restore(saved)


def finder_gets_parent_path_argument():
    """PEP 302: the second argument is the parent package's __path__."""
    seen = []

    class PathSpy(SpecFinder):
        def find_spec(self, fullname, path=None, target=None):
            if fullname.startswith('grail_mp_parent'):
                seen.append((fullname, path))
            return SpecFinder.find_spec(self, fullname, path, target)

    pkg = _Fabricated('grail_mp_parent')
    pkg.__path__ = ['/nowhere']
    sub = _Fabricated('grail_mp_parent.kid', answer=1)
    pkg.kid = sub
    with _Guard(PathSpy({'grail_mp_parent': pkg,
                         'grail_mp_parent.kid': sub})):
        saved = _forget('grail_mp_parent', 'grail_mp_parent.kid')
        try:
            import grail_mp_parent.kid  # noqa: F401
            return ('grail_mp_parent.kid', ['/nowhere']) in seen
        finally:
            _restore(saved)


# ------------------------------------------------------------ grail-only

def grail_stdlib_module_is_not_shadowable():
    """``traceback`` is a module GRAIL SHIPS (src/python/stdlib/traceback.py).
    A finder inserted at meta_path[0] claiming it must lose, even with the
    cache emptied first.  Under CPython traceback is not preloaded and the
    finder wins, which is what makes this check Grail-only."""
    fake = _Fabricated('traceback', format_exc=lambda: 'FAKE')
    with _Guard(SpecFinder({'traceback': fake})):
        saved = _forget('traceback')
        try:
            import traceback
            return traceback is not fake and hasattr(traceback, 'TracebackException')
        finally:
            _restore(saved)


def grail_native_module_is_not_shadowable():
    """``os`` is a Smalltalk-native module in Grail.  Same test, and under
    CPython it passes only while os stays cached -- so the cache is emptied
    first, which is what makes this Grail-only there too."""
    fake = _Fabricated('os', sep='!')
    with _Guard(SpecFinder({'os': fake})):
        saved = _forget('os')
        try:
            import os
            return os is not fake and os.sep == '/'
        finally:
            _restore(saved)


def legacy_find_module_protocol():
    """PEP 302's find_module/load_module, removed from CPython in 3.12."""
    made = _Fabricated('grail_mp_legacy', answer='legacy')
    with _Guard(LegacyFinder({'grail_mp_legacy': made})):
        saved = _forget('grail_mp_legacy')
        try:
            import grail_mp_legacy
            return grail_mp_legacy.answer == 'legacy'
        finally:
            _restore(saved)


SHARED = [finder_serves_unowned_module,
          finder_serves_dotted_submodule,
          finder_declining_falls_through,
          first_claiming_finder_wins,
          cached_module_is_never_offered,
          exec_module_without_create_module,
          machinery_sets_module_dunders,
          invalidate_caches_reaches_finders,
          namespace_spec_without_a_loader,
          finder_gets_parent_path_argument]

GRAIL_ONLY = [grail_stdlib_module_is_not_shadowable,
              grail_native_module_is_not_shadowable,
              legacy_find_module_protocol]


def run():
    """Fill RESULTS; the Smalltalk driver reads it."""
    for fn in SHARED + GRAIL_ONLY:
        try:
            check(fn.__name__, fn(), True)
        except BaseException as exc:            # noqa: BLE001
            RESULTS[fn.__name__] = 'raised: %s: %s' % (type(exc).__name__, exc)
    return RESULTS


if __name__ == '__main__':
    for _fn in SHARED:
        try:
            _v = _fn() is True
        except BaseException as _exc:           # noqa: BLE001
            _v = '%s: %s' % (type(_exc).__name__, _exc)
        print('%-5s %s' % ('OK' if _v is True else 'FAIL', _fn.__name__),
              '' if _v is True else _v)
    # CPython is EXPECTED to disagree with these; XFAIL is that expected
    # disagreement and is not a failure.  XPASS means the difference the check
    # documents no longer exists and the check is stale.
    for _fn in GRAIL_ONLY:
        try:
            _v = _fn() is True
        except BaseException:                   # noqa: BLE001
            _v = False
        print('%-5s %s' % ('XPASS' if _v is True else 'XFAIL', _fn.__name__))
