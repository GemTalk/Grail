# GRAIL: a hand-trimmed stand-in for CPython's test.support package.
#
# CPython's real test/support/__init__.py is ~3200 lines and imports
# subprocess, socket, faulthandler, etc. -- most of which Grail does not
# have.  This file provides ONLY the names the curated starter set of
# vendored test modules imports (see scripts/cpython_suite_manifest.txt),
# so that `from test import support` / `from test.support import X`
# succeed.  It is the growth surface: when the scoreboard shows an
# IMPORTERROR naming a missing symbol, add it here.
#
# IMPORTANT Grail constraints honored below:
#   * Every context manager here is a plain class with __enter__/__exit__
#     rather than @contextlib.contextmanager.  That started as a hard
#     requirement -- contextmanager WAS a no-op passthrough in Grail -- and
#     is now only a convention: it runs the real single-yield protocol as of
#     the _GeneratorContextManager rewrite.  Kept because a plain class has
#     no generator dependence at all, which is what you want in the file
#     every other test module imports before anything else can run.
#   * The skip/requires/cpython_only family below is written as flexible
#     passthroughs so direct programmatic calls also no-op.  They ARE
#     executed as @-decorators: Grail used to drop a decorator built as a
#     class INSTANCE (silently, inside the decorator-application guard),
#     which is what these are -- fixed in PythonInstance>>___pyCallValue___:kw:.

import contextlib
import functools
import sys
import types
import unittest

# Re-exported so `from test.support import verbose`-style imports work and
# so tests can flip behavior without argv parsing.
verbose = False

# Platform / build flags the starter set probes.
is_wasi = False
is_emscripten = False
is_android = False
# From sys.platform rather than hardcoded False like the three above, because
# unlike wasi/emscripten/android this one is REAL here: the dev stones run on
# macOS and CI runs on Linux, so a test gated on is_apple must see the truth in
# both places.  Upstream's expressions, unchanged.
is_apple_mobile = sys.platform in {"ios", "tvos", "watchos"}
is_apple = is_apple_mobile or sys.platform == "darwin"
HAVE_PY_DOCSTRINGS = True
MISSING_C_DOCSTRINGS = False
# Upstream's expression over the two above.  test_generators' email doctest
# imports it by name.
HAVE_DOCSTRINGS = (HAVE_PY_DOCSTRINGS and not MISSING_C_DOCSTRINGS)
# CPython sets this from a --with-pydebug build; Grail is never one, and the
# tests that read it are asking about assertion-heavy C behaviour.
Py_DEBUG = False

# Size constants used by bigmem tests.
_1M = 1024 * 1024
_1G = 1024 * _1M
_2G = 2 * _1G
_4G = 4 * _1G
MAX_Py_ssize_t = sys.maxsize

# Timeouts (seconds) used by tests that would otherwise block forever.
# The timeout is long enough to prevent test failure: it takes into account
# that the client and the server can run in different threads or even different
# processes.
#
# The timeout should be long enough for connect(), recv() and send() methods
# of socket.socket.
LOOPBACK_TIMEOUT = 10.0
SHORT_TIMEOUT = 30.0
LONG_TIMEOUT = 300.0


class SkipTest(unittest.SkipTest):
    pass


def _is_decorating(args, kw):
    return len(args) == 1 and len(kw) == 0 and callable(args[0])


class _PassthroughDecorator:
    """Callable that works both as ``@dec`` and ``@dec(...)`` and simply
    returns the decorated object unchanged.  Grail drops method
    decorators anyway; this only matters for direct/programmatic use."""

    def __call__(self, *args, **kw):
        if _is_decorating(args, kw):
            return args[0]
        def _wrap(func):
            return func
        return _wrap


class _SkipDecorator:
    """Like _PassthroughDecorator, but marks what it decorates as skipped.

    Usable as ``@dec`` and as ``@dec(...)``, on a class or a function, and
    stamps the same ``__unittest_skip__`` markers unittest.skip does -- which
    unittest's TestCase.run now honours.
    """

    def __init__(self, reason):
        self.reason = reason

    def _mark(self, test_item):
        # Mirror CPython's unittest.skip: a non-class item is REPLACED by a
        # wrapper that raises SkipTest when CALLED, and only then stamped.
        # The markers alone are enough for a decorated test METHOD (TestCase
        # .run checks them before setUp), but not for a decorated HELPER --
        # test_traceback's CExcReportingTests puts @cpython_only on
        # get_report(), whose callers are inherited test methods carrying no
        # marker of their own.  There the skip has to happen at call time.
        if not isinstance(test_item, type):
            reason = self.reason

            def skip_wrapper(*args, **kwargs):
                raise unittest.SkipTest(reason)

            test_item = skip_wrapper
        test_item.__unittest_skip__ = True
        test_item.__unittest_skip_why__ = self.reason
        return test_item

    def __call__(self, *args, **kw):
        if _is_decorating(args, kw):
            return self._mark(args[0])
        def _wrap(test_item):
            return self._mark(test_item)
        return _wrap


# ``@cpython_only`` marks a test that reaches into CPython implementation
# detail -- almost always through _testcapi, which Grail does not have.  It
# used to be a passthrough no-op, so those tests RAN under Grail and failed
# with ModuleNotFoundError instead of being skipped: 142 of test_traceback's
# 250 errors were exactly that.  Grail is never CPython (sys.implementation
# .name == 'grail', so check_impl_detail(cpython=True) is already False), so
# an unconditional skip is the honest answer and matches what CPython's own
# suite does on any non-CPython implementation.
cpython_only = _SkipDecorator('cpython implementation detail')


# ``requires_zlib`` / ``requires_gzip`` / ``requires_bz2`` / ``requires_lzma``
# are CPython's OWN answer to "this test needs a compression module that may
# not be built", so they are copied verbatim rather than shimmed: each imports
# the module and hands unittest.skipUnless the result, which is already the
# right behaviour for Grail, where none of the four exists.  Without them
# ``from test.support import requires_zlib`` raises ImportError at module
# scope, and a whole test module scores IMPORTERROR over decorators whose
# entire purpose is to skip.
def requires_zlib(reason='requires zlib'):
    try:
        import zlib
    except ImportError:
        zlib = None
    return unittest.skipUnless(zlib, reason)


def requires_gzip(reason='requires gzip'):
    try:
        import gzip
    except ImportError:
        gzip = None
    return unittest.skipUnless(gzip, reason)


def requires_bz2(reason='requires bz2'):
    try:
        import bz2
    except ImportError:
        bz2 = None
    return unittest.skipUnless(bz2, reason)


def requires_lzma(reason='requires lzma'):
    try:
        import lzma
    except ImportError:
        lzma = None
    return unittest.skipUnless(lzma, reason)


requires_IEEE_754 = _PassthroughDecorator()
requires_docstrings = _PassthroughDecorator()
requires_resource = _PassthroughDecorator()
requires_mac_ver = _PassthroughDecorator()
run_with_locale = _PassthroughDecorator()
bigmemtest = _PassthroughDecorator()
bigaddrspacetest = _PassthroughDecorator()
thread_unsafe = _PassthroughDecorator()
skip_if_sanitizer = _PassthroughDecorator()
skip_if_unlimited_stack_size = _PassthroughDecorator()
# CPython 3.14.8's decorators for tests that exhaust the C stack with deep
# recursion: one skips when the stack is too big to overflow, the other runs
# the test in a thread with an 8 MiB stack.  Grail has no C stack to size --
# deep Python recursion stops at the recursion limit with RecursionError on
# every machine -- so neither has anything to do here, and the test runs as
# written.
skip_if_huge_c_stack = _PassthroughDecorator()
run_with_limited_c_stack = _PassthroughDecorator()
C_STACK_SIZE = 8 * 1024 * 1024
skip_on_s390x = _PassthroughDecorator()
skip_emscripten_stack_overflow = _PassthroughDecorator()
skip_wasi_stack_overflow = _PassthroughDecorator()

# CPython's requires_limited_api skips unless BOTH _testcapi and
# _testlimitedcapi import.  Grail has neither and never will -- these tests
# exercise the C stable ABI -- so the skip is unconditional, for the same
# reason cpython_only above is.  A passthrough would run them and score
# ModuleNotFoundError instead.
requires_limited_api = _SkipDecorator(
    'needs _testcapi and _testlimitedcapi modules')


def run_with_tz(tz):
    """CPython's run_with_tz: pin the timezone for the duration of the test.

    NOT a passthrough, unlike its neighbours above.  A passthrough here does
    not merely skip a check -- it silently changes what the test measures.
    These tests assert values that are only true in the zone they name
    (test_timestamp_naive asserts 18000.0 for the epoch, true in US/Eastern
    and nowhere else), so run unpinned they pass or fail according to where
    the machine is, and the scoreboard moves when a laptop changes zones.

    Same shape as CPython's: set os.environ['TZ'], call time.tzset(), restore
    both in a finally.  Grail's tzset raises ValueError for a zone it cannot
    resolve -- turned into a skip here, which is what CPython does on a
    platform without tzset at all.
    """
    def decorator(func):
        def inner(*args, **kwds):
            import os
            import time
            # CPython's own spelling.  NOT getattr(time, 'tzset', None):
            # Grail answers None for that even where the attribute exists
            # (a defaulted getattr misses a native module's methods), so the
            # probe skipped every one of these tests.
            try:
                tzset = time.tzset
            except AttributeError:
                raise unittest.SkipTest('tzset required')
            had_tz = 'TZ' in os.environ
            orig_tz = os.environ.get('TZ')
            os.environ['TZ'] = tz
            try:
                try:
                    tzset()
                except ValueError as e:
                    raise unittest.SkipTest(str(e))
                return func(*args, **kwds)
            finally:
                # Restoring matters more here than in CPython: the zone is
                # session state in the gem, so leaking it would silently
                # re-time every later test in the same run.
                if had_tz:
                    os.environ['TZ'] = orig_tz
                else:
                    os.environ['TZ'] = ''
                tzset()
        inner.__name__ = func.__name__
        inner.__doc__ = func.__doc__
        return inner
    return decorator


def run_with_locales(catstr, *locales):
    """CPython's run_with_locales: run the test once per locale that can be
    set, each as a subtest, and restore the original afterwards.

    Upstream's implementation, not a passthrough, for the reason run_with_tz
    above gives: a passthrough would run the body in whatever locale the
    session happens to be in.  Grail has no OS locales -- setlocale accepts
    only 'C'/'POSIX'/'' and raises locale.Error for the rest -- so a named
    locale becomes a skipped subtest, and '' in the list (which every caller
    in the tree includes as the fallback) is what the body actually runs
    under, as it is on a CPython machine with no such locale installed.
    """
    def deco(func):
        import functools

        @functools.wraps(func)
        def wrapper(self, /, *args, **kwargs):
            dry_run = '' in locales
            try:
                import locale
                category = getattr(locale, catstr)
                orig_locale = locale.setlocale(category)
            except AttributeError:
                # if the test author gives us an invalid category string
                raise
            except Exception:
                # cannot retrieve original locale, so do nothing
                pass
            else:
                try:
                    for loc in locales:
                        with self.subTest(locale=loc):
                            try:
                                locale.setlocale(category, loc)
                            except locale.Error:
                                self.skipTest(f'no locale {loc!r}')
                            else:
                                dry_run = False
                                func(self, *args, **kwargs)
                finally:
                    locale.setlocale(category, orig_locale)
            if dry_run:
                # no locales available, so just run the test
                # with the current locale
                with self.subTest(locale=None):
                    func(self, *args, **kwargs)
        return wrapper
    return deco


def check_sizeof(test, o, size):
    # sys.getsizeof has no meaning on GemStone objects
    raise unittest.SkipTest("sys.getsizeof unavailable under Grail")

skip_if_buildbot = _PassthroughDecorator()
skip_if_pgo_task = _PassthroughDecorator()
# requires_working_socket was a passthrough here too.  It now has upstream's
# real implementation further down -- sockets DO work in Grail, so the honest
# answer is "not skipped" rather than "not checked", and every caller in the
# tree uses the ``(module=True)'' form that implementation handles.


def check_impl_detail(**guards):
    """True iff the running implementation matches the guards.  Grail's
    sys.implementation.name is 'grail', so `check_impl_detail(cpython=True)`
    is False and CPython-only assertions are skipped."""
    if not guards:
        guards = {"cpython": True}
    name = sys.implementation.name
    if name in guards:
        return guards[name]
    # No guard names this implementation: match unless a positive guard
    # (e.g. cpython=True) was requested.
    for value in guards.values():
        if value:
            return False
    return True


def impl_detail(msg=None, **guards):
    # Decorator form; dropped on methods, no-op if called directly.
    return _PassthroughDecorator()


def gc_collect():
    # CPython's test hook to force a full garbage collection so weak
    # references to now-unreachable objects (including reference cycles) read
    # as dead immediately.  In Grail, gc.collect() is a documented no-op stub
    # (GemStone manages its own memory); the real in-memory collection --
    # generation scavenge + VM mark-sweep, which reclaims cycles and fires the
    # weakref ephemerons -- is driven by weakref._collect().  Route this hook
    # there so tests that assert post-collection weak behavior (e.g.
    # test_slice.test_cycle: an isolated o <-> slice(o) cycle) actually see the
    # collection they ask for.
    try:
        import gc
        gc.collect()
    except Exception:
        pass
    try:
        import weakref
        weakref._collect()
    except Exception:
        pass


def setswitchinterval(interval):
    try:
        sys.setswitchinterval(interval)
    except Exception:
        pass


def linked_to_musl():
    return False


def run_in_subinterp(code):
    raise unittest.SkipTest("subinterpreters unavailable in Grail")


def exceeds_recursion_limit():
    # A value comfortably above the recursion limit.  Kept modest so a
    # test that actually builds this many frames fails/crashes fast
    # (isolated to its own session) rather than hanging.
    try:
        return sys.getrecursionlimit() + 100
    except Exception:
        return 1100


# --- objects with unusual equality, used by a few tests ---------------

class _AlwaysEqual:
    def __eq__(self, other):
        return True

    def __ne__(self, other):
        return False

    def __hash__(self):
        return 1

    def __repr__(self):
        return "ALWAYS_EQ"


ALWAYS_EQ = _AlwaysEqual()


class _NeverEqual:
    def __eq__(self, other):
        return False

    def __ne__(self, other):
        return True

    def __hash__(self):
        return 2

    def __repr__(self):
        return "NEVER_EQ"


NEVER_EQ = _NeverEqual()


class _LARGEST:
    """Object greater than anything except itself (CPython support._LARGEST).

    CPython derives the remaining comparisons with @functools.total_ordering;
    they are spelled out here instead, which is equivalent and keeps the class
    independent of that decorator."""

    def __eq__(self, other):
        return isinstance(other, _LARGEST)

    def __ne__(self, other):
        return not isinstance(other, _LARGEST)

    def __lt__(self, other):
        return False

    def __le__(self, other):
        return isinstance(other, _LARGEST)

    def __gt__(self, other):
        return not isinstance(other, _LARGEST)

    def __ge__(self, other):
        return True

    def __hash__(self):
        return 3

    def __repr__(self):
        return "LARGEST"


LARGEST = _LARGEST()


class _SMALLEST:
    """Object less than anything except itself (CPython support._SMALLEST)."""

    def __eq__(self, other):
        return isinstance(other, _SMALLEST)

    def __ne__(self, other):
        return not isinstance(other, _SMALLEST)

    def __gt__(self, other):
        return False

    def __ge__(self, other):
        return isinstance(other, _SMALLEST)

    def __lt__(self, other):
        return not isinstance(other, _SMALLEST)

    def __le__(self, other):
        return True

    def __hash__(self):
        return 4

    def __repr__(self):
        return "SMALLEST"


SMALLEST = _SMALLEST()


class BrokenIter:
    """Iterator whose __init__/__next__/__iter__ can be told to raise, used by
    test_iter to check the interpreter handles exceptions from the iterator
    protocol.  Verbatim from CPython's test.support."""

    def __init__(self, init_raises=False, next_raises=False, iter_raises=False):
        if init_raises:
            1 / 0
        self.next_raises = next_raises
        self.iter_raises = iter_raises

    def __next__(self):
        if self.next_raises:
            1 / 0

    def __iter__(self):
        if self.iter_raises:
            1 / 0
        return self


def check_free_after_iterating(test, iter, cls, args=()):
    """Assert that iterating ``cls`` frees the sequence right after iteration
    ends (CPython issue 26494).  Verbatim from CPython's test.support; relies
    on __del__ running deterministically."""
    done = False

    def wrapper():
        class A(cls):
            def __del__(self):
                nonlocal done
                done = True
                try:
                    next(it)
                except StopIteration:
                    pass

        it = iter(A(*args))
        # Issue 26494: Shouldn't crash
        test.assertRaises(StopIteration, next, it)

    wrapper()
    # The sequence should be deallocated just after the end of iterating
    gc_collect()
    test.assertTrue(done)


class EqualToForwardRef:
    """Minimal stand-in used by a few typing-adjacent tests."""

    def __init__(self, arg, is_class=False, module=None, owner=None):
        self.arg = arg
        self.is_class = is_class
        self.module = module
        self.owner = owner

    def __eq__(self, other):
        return getattr(other, "__forward_arg__", None) == self.arg

    def __hash__(self):
        return hash(self.arg)

    def __repr__(self):
        return "EqualToForwardRef(" + repr(self.arg) + ")"


# --- class-based context managers (NO @contextmanager in Grail) --------

class adjust_int_max_str_digits(contextlib.ContextDecorator):
    # GRAIL: upstream writes this as @contextlib.contextmanager, whose
    # _GeneratorContextManager inherits ContextDecorator -- so it is usable
    # as ``@name(...)`` as well as in a with-statement.  Grail writes these
    # as plain classes (see the header note), which gave them __enter__ and
    # __exit__ and no __call__, so the decorator form raised.  That raise was
    # invisible: applied to a method in a class body, Grail drops a decorator
    # whose application fails, so the guard silently never ran.
    def __init__(self, max_digits):
        self.max_digits = max_digits
        self.old = None

    def __enter__(self):
        try:
            self.old = sys.get_int_max_str_digits()
            sys.set_int_max_str_digits(self.max_digits)
        except Exception:
            self.old = None
        return self

    def __exit__(self, *exc):
        try:
            if self.old is not None:
                sys.set_int_max_str_digits(self.old)
        except Exception:
            pass
        return False


class swap_attr(contextlib.ContextDecorator):
    # GRAIL: upstream writes this as @contextlib.contextmanager, whose
    # _GeneratorContextManager inherits ContextDecorator -- so it is usable
    # as ``@name(...)`` as well as in a with-statement.  Grail writes these
    # as plain classes (see the header note), which gave them __enter__ and
    # __exit__ and no __call__, so the decorator form raised.  That raise was
    # invisible: applied to a method in a class body, Grail drops a decorator
    # whose application fails, so the guard silently never ran.
    """Temporarily set obj.attr = new_val, restoring on exit.  Depends on
    getattr/setattr, which are limited in Grail -- used only by a handful
    of tests; failures are recorded, not fatal."""

    def __init__(self, obj, attr, new_val):
        self.obj = obj
        self.attr = attr
        self.new_val = new_val
        self.existed = False
        self.old = None

    def __enter__(self):
        if hasattr(self.obj, self.attr):
            self.existed = True
            self.old = getattr(self.obj, self.attr)
        setattr(self.obj, self.attr, self.new_val)
        return self.old

    def __exit__(self, *exc):
        if self.existed:
            setattr(self.obj, self.attr, self.old)
        else:
            try:
                delattr(self.obj, self.attr)
            except Exception:
                pass
        return False


class swap_item(contextlib.ContextDecorator):
    # GRAIL: upstream writes this as @contextlib.contextmanager, whose
    # _GeneratorContextManager inherits ContextDecorator -- so it is usable
    # as ``@name(...)`` as well as in a with-statement.  Grail writes these
    # as plain classes (see the header note), which gave them __enter__ and
    # __exit__ and no __call__, so the decorator form raised.  That raise was
    # invisible: applied to a method in a class body, Grail drops a decorator
    # whose application fails, so the guard silently never ran.
    def __init__(self, obj, item, new_val):
        self.obj = obj
        self.item = item
        self.new_val = new_val
        self.existed = False
        self.old = None

    def __enter__(self):
        if self.item in self.obj:
            self.existed = True
            self.old = self.obj[self.item]
        self.obj[self.item] = self.new_val
        return self.old

    def __exit__(self, *exc):
        if self.existed:
            self.obj[self.item] = self.old
        else:
            try:
                del self.obj[self.item]
            except Exception:
                pass
        return False


class infinite_recursion(contextlib.ContextDecorator):
    # GRAIL: upstream writes this as @contextlib.contextmanager, whose
    # _GeneratorContextManager inherits ContextDecorator -- so it is usable
    # as ``@name(...)`` as well as in a with-statement.  Grail writes these
    # as plain classes (see the header note), which gave them __enter__ and
    # __exit__ and no __call__, so the decorator form raised.  That raise was
    # invisible: applied to a method in a class body, Grail drops a decorator
    # whose application fails, so the guard silently never ran.
    def __init__(self, max_depth=100):
        self.max_depth = max_depth

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


class set_recursion_limit(contextlib.ContextDecorator):
    # GRAIL: upstream writes this as @contextlib.contextmanager, whose
    # _GeneratorContextManager inherits ContextDecorator -- so it is usable
    # as ``@name(...)`` as well as in a with-statement.  Grail writes these
    # as plain classes (see the header note), which gave them __enter__ and
    # __exit__ and no __call__, so the decorator form raised.  That raise was
    # invisible: applied to a method in a class body, Grail drops a decorator
    # whose application fails, so the guard silently never ran.
    """CPython's set_recursion_limit: pin sys.setrecursionlimit for the
    block and restore it after.

    Written as a plain class rather than CPython's @contextlib.contextmanager
    to match the rest of this file (see the header note).  It is NOT a
    passthrough -- the tests using it drive recursion deliberately and read
    the limit they set, so a no-op would change what they measure."""

    def __init__(self, limit):
        self.limit = limit

    def __enter__(self):
        self.original_limit = sys.getrecursionlimit()
        sys.setrecursionlimit(self.limit)
        return self

    def __exit__(self, *exc):
        sys.setrecursionlimit(self.original_limit)
        return False


class captured_stdout(contextlib.ContextDecorator):
    # GRAIL: upstream writes this as @contextlib.contextmanager, whose
    # _GeneratorContextManager inherits ContextDecorator -- so it is usable
    # as ``@name(...)`` as well as in a with-statement.  Grail writes these
    # as plain classes (see the header note), which gave them __enter__ and
    # __exit__ and no __call__, so the decorator form raised.  That raise was
    # invisible: applied to a method in a class body, Grail drops a decorator
    # whose application fails, so the guard silently never ran.
    """Redirect sys.stdout to an io.StringIO for the duration of the
    block; the buffer is the value bound by ``as``."""

    def __enter__(self):
        import io
        self.buf = io.StringIO()
        self.old = sys.stdout
        sys.stdout = self.buf
        return self.buf

    def __exit__(self, *exc):
        sys.stdout = self.old
        return False


class captured_stderr(contextlib.ContextDecorator):
    # GRAIL: upstream writes this as @contextlib.contextmanager, whose
    # _GeneratorContextManager inherits ContextDecorator -- so it is usable
    # as ``@name(...)`` as well as in a with-statement.  Grail writes these
    # as plain classes (see the header note), which gave them __enter__ and
    # __exit__ and no __call__, so the decorator form raised.  That raise was
    # invisible: applied to a method in a class body, Grail drops a decorator
    # whose application fails, so the guard silently never ran.
    def __enter__(self):
        import io
        self.buf = io.StringIO()
        self.old = sys.stderr
        sys.stderr = self.buf
        return self.buf

    def __exit__(self, *exc):
        sys.stderr = self.old
        return False


class captured_output(contextlib.ContextDecorator):
    # GRAIL: upstream writes this as @contextlib.contextmanager, whose
    # _GeneratorContextManager inherits ContextDecorator -- so it is usable
    # as ``@name(...)`` as well as in a with-statement.  Grail writes these
    # as plain classes (see the header note), which gave them __enter__ and
    # __exit__ and no __call__, so the decorator form raised.  That raise was
    # invisible: applied to a method in a class body, Grail drops a decorator
    # whose application fails, so the guard silently never ran.
    """Redirect sys.stdout or sys.stderr (by name) to an io.StringIO for
    the duration of the block; generalizes captured_stdout/captured_stderr
    to an arbitrary stream name (test_itertools.test_bug_7244:
    ``with support.captured_output('stdout'): ...``)."""

    def __init__(self, stream_name):
        self.stream_name = stream_name

    def __enter__(self):
        import io
        self.buf = io.StringIO()
        self.old = getattr(sys, self.stream_name)
        setattr(sys, self.stream_name, self.buf)
        return self.buf

    def __exit__(self, *exc):
        setattr(sys, self.stream_name, self.old)
        return False


class Stopwatch:
    """Minimal timing context manager."""

    def __enter__(self):
        import time
        self.start = time.monotonic()
        self.seconds = 0.0
        return self

    def __exit__(self, *exc):
        import time
        self.seconds = time.monotonic() - self.start
        return False


def check_disallow_instantiation(testcase, tp, *args, **kw):
    """Assert that type `tp` cannot be instantiated."""
    with testcase.assertRaises(TypeError):
        tp(*args, **kw)


# --- resource gating ---------------------------------------------------

# Resources that are "always on" without a network / display / subprocess.
_ENABLED_RESOURCES = ["cpu", "decimal"]


def is_resource_enabled(resource):
    return resource in _ENABLED_RESOURCES


class ResourceDenied(unittest.SkipTest):
    """Test skipped because it requested a disallowed resource.

    CPython's: requires() raises it, and socket_helper.transient_internet
    builds one, so test_ssl's NetworkedTests reach for the name.
    """


def requires(resource, msg=None):
    if not is_resource_enabled(resource):
        if msg is None:
            msg = "resource {!r} is not enabled".format(resource)
        raise ResourceDenied(msg)


def busy_retry(timeout, err_msg=None, /, *, error=True):
    """CPython 3.14's: yield until timeout seconds have passed, then raise
    AssertionError (or just stop, with error=False)."""
    import time
    if timeout <= 0:
        raise ValueError("timeout must be greater than zero")
    start_time = time.monotonic()
    deadline = start_time + timeout
    while True:
        yield
        if time.monotonic() >= deadline:
            break
    if error:
        dt = time.monotonic() - start_time
        msg = f"timeout ({dt:.1f} seconds)"
        if err_msg:
            msg = f"{msg}: {err_msg}"
        raise AssertionError(msg)


def sleeping_retry(timeout, err_msg=None, /,
                   *, init_delay=0.010, max_delay=1.0, error=True):
    """CPython 3.14's: busy_retry with an exponential sleep between tries."""
    import time
    delay = init_delay
    for _ in busy_retry(timeout, err_msg, error=error):
        yield
        time.sleep(delay)
        delay = min(delay * 2, max_delay)


def requires_resource(resource):
    # Decorator form (dropped on methods).
    return _PassthroughDecorator()


def subTests(arg_names, arg_values, /, *, _do_cleanups=False):
    """Run multiple subtests with different parameters.

    CPython 3.14's parameterising decorator, carried verbatim: it rewrites
    the method into a loop that calls the original once per parameter set
    inside self.subTest(), passing the values as KEYWORDS.

    Grail's test.support is a hand-written subset rather than a vendored
    copy, and this was simply absent -- so ``@support.subTests('content',
    [...])'' left the undecorated method in place and unittest called it
    with only self: "test_cdata_section_content() missing 1 required
    positional argument: 'content'", thirteen times over in
    test_htmlparser.
    """
    import functools

    single_param = False
    if isinstance(arg_names, str):
        arg_names = arg_names.replace(',', ' ').split()
        if len(arg_names) == 1:
            single_param = True
    arg_values = tuple(arg_values)

    def decorator(func):
        if isinstance(func, type):
            raise TypeError(
                'subTests() can only decorate methods, not classes')

        @functools.wraps(func)
        def wrapper(self, /, *args, **kwargs):
            for values in arg_values:
                if single_param:
                    values = (values,)
                subtest_kwargs = dict(zip(arg_names, values))
                with self.subTest(**subtest_kwargs):
                    func(self, *args, **kwargs, **subtest_kwargs)
                if _do_cleanups:
                    self.doCleanups()
        return wrapper
    return decorator


# --- legacy runners still called by some modules -----------------------

def run_unittest(*classes):
    """Run the given TestCase classes; raise AssertionError on failure.
    A shim for older modules that call test.support.run_unittest()
    instead of relying on discovery."""
    suite = unittest.TestSuite()
    loader = unittest.defaultTestLoader
    for cls in classes:
        suite.addTests(loader.loadTestsFromTestCase(cls))
    result = unittest.TestResult()
    suite.run(result)
    if not result.wasSuccessful():
        raise AssertionError(
            "run_unittest failed: " + repr(result))
    return result


def run_code(code: str, extra_names: dict[str, object] | None = None) -> dict[str, object]:
    """Run a piece of code after dedenting it, and return its global namespace."""
    # GRAIL: CPython 3.14's helper, verbatim; test_annotationlib's
    # test_stringized_annotation_permutations builds its cases with it.
    import textwrap
    ns = {}
    if extra_names:
        ns.update(extra_names)
    exec(textwrap.dedent(code), ns)
    return ns


def check_syntax_error(testcase, statement, errtext="", *, lineno=None, offset=None):
    with testcase.assertRaises(SyntaxError):
        compile(statement, "<test string>", "exec")


def check__all__(test_case, module, name_of_module=None, extra=(),
                 not_exported=()):
    """Assert that the __all__ variable of 'module' contains all public names.

    The module's public names (its API) are detected automatically based on
    whether they match the public name convention and were defined in
    'module'.

    The 'name_of_module' argument can specify (as a string or tuple thereof)
    what module(s) an API could be defined in order to be detected as a
    public API.  One case for this is when 'module' imports part of its public
    API from other modules, possibly a C backend.

    The 'extra' argument can be a set of names that wouldn't otherwise be
    automatically detected as "public", like objects without a proper
    '__module__' attribute.  If provided, it will be added to the
    automatically detected ones.

    The 'not_exported' argument can be a set of names that must not be treated
    as part of the public API even though their names indicate otherwise.
    """
    if name_of_module is None:
        name_of_module = (module.__name__,)
    elif isinstance(name_of_module, str):
        name_of_module = (name_of_module,)

    expected = set(extra)

    for name in dir(module):
        if name.startswith('_') or name in not_exported:
            continue
        obj = getattr(module, name)

        if (getattr(obj, '__module__', None) in name_of_module or
                (not hasattr(obj, '__module__') and
                 not _is_module_object(obj))):
            expected.add(name)
    test_case.assertCountEqual(module.__all__, expected)


def _module_base_types():
    """GRAIL: the types an imported module can actually have here.

    CPython's check__all__ excludes ``isinstance(obj, types.ModuleType)`` so a
    module's own imports do not count as its public API.  Grail's
    types.ModuleType is a deliberate STUB class that nothing inherits from
    (see src/python/stdlib/types.py), and Grail modules are instances of a
    Smalltalk class ``module`` instead -- so that test answers False for every
    module and ``wave.__all__`` gets compared against a set holding builtins,
    struct and sys.

    Every module shares that one base, reachable from any module's type, so
    take it from sys and keep types.ModuleType alongside for the day the stub
    becomes real.
    """
    bases = [types.ModuleType]
    try:
        bases.extend(type(sys).__mro__[1:2])
    except BaseException:
        pass
    return tuple(bases)


def _is_module_object(obj):
    try:
        return isinstance(obj, _module_base_types())
    except BaseException:
        return False


# --- misc paths --------------------------------------------------------

import os as _os
# CPython uses this to locate data files; point at the vendored stdlib root.
REPO_ROOT = _os.path.dirname(_os.path.dirname(_os.path.dirname(__file__)))
STDLIB_DIR = REPO_ROOT
# CPython: TEST_SUPPORT_DIR is test/support, TEST_HOME_DIR its parent test/.
# (This used to name the support/ directory, which findfile() would then search
# instead of the test tree where the data files actually live.)
TEST_SUPPORT_DIR = _os.path.dirname(_os.path.abspath(__file__))
TEST_HOME_DIR = _os.path.dirname(TEST_SUPPORT_DIR)


def findfile(filename, subdir=None):
    """Try to find a file on sys.path or in the test directory.

    If it is not found the argument passed to the function is returned (this
    does not necessarily signal failure; could still be the legitimate path).
    Setting *subdir* indicates a relative path to use to find the file rather
    than looking directly in the path directories.
    """
    if _os.path.isabs(filename):
        return filename
    if subdir is not None:
        filename = _os.path.join(subdir, filename)
    path = [TEST_HOME_DIR] + sys.path
    for dn in path:
        fn = _os.path.join(dn, filename)
        if _os.path.exists(fn):
            return fn
    return filename


def check_sanitizer(*, address=False, memory=False, ub=False, thread=False,
                    function=True):
    """Returns True if Python is compiled with sanitizer support.

    Grail runs on GemStone, not on a sanitizer-instrumented CPython build, so
    this is always False.  The argument check is CPython's and is kept: callers
    rely on the TypeError-ish guard to catch a mis-spelled keyword.
    """
    if not (address or memory or ub or thread):
        raise ValueError('At least one of address, memory, ub or thread must '
                         'be True')
    return False


def skip_if_sanitizer(reason=None, *, address=False, memory=False, ub=False,
                      thread=False, function=True):
    """Decorator that skips a test when the named sanitizer is enabled."""
    if reason is None:
        reason = 'not working with sanitizers active'
    skip = check_sanitizer(address=address, memory=memory, ub=ub,
                           thread=thread, function=function)
    return unittest.skipIf(skip, reason)


# --- driving a coroutine by hand ---------------------------------------
# These let a synchronous test step an ``async def`` without an event loop.

try:
    _coroutine_decorator = types.coroutine
except AttributeError:
    # Grail has no types.coroutine; a bare generator still yields and still
    # raises StopIteration(value), which is all the drivers below read.
    def _coroutine_decorator(func):
        return func


@_coroutine_decorator
def async_yield(v):
    return (yield v)


def run_yielding_async_fn(async_fn, /, *args, **kwargs):
    """Run an async function to completion, discarding what it yields."""
    coro = async_fn(*args, **kwargs)
    try:
        while True:
            try:
                coro.send(None)
            except StopIteration as e:
                return e.value
    finally:
        coro.close()


def run_no_yield_async_fn(async_fn, /, *args, **kwargs):
    """Run an async function that must complete without ever yielding."""
    coro = async_fn(*args, **kwargs)
    try:
        coro.send(None)
    except StopIteration as e:
        return e.value
    else:
        raise AssertionError("coroutine did not complete")
    finally:
        coro.close()

# TESTFN mirrors os_helper for the rare top-level reference.
TESTFN = "@grail_test_tmp"


# --- network-backed test data ------------------------------------------
# CPython keeps the downloaded mapping tables (unicode.org's CJK files, and
# similar) under test/data.  Nothing here fetches anything unless the
# 'urlfetch' resource is enabled, and Grail enables only 'cpu' and 'decimal' --
# so in practice requires() below raises SkipTest and the caller SKIPS rather
# than erroring, which is the same thing that happens in a CPython run without
# -u urlfetch.  test_codecmaps_* is entirely built on this.

TEST_DATA_DIR = _os.path.join(TEST_HOME_DIR, "data")

INTERNET_TIMEOUT = 60.0


def open_urlresource(url, *args, **kw):
    import urllib.parse
    from test.support.os_helper import unlink
    try:
        import gzip
    except ImportError:
        gzip = None

    check = kw.pop('check', None)

    filename = urllib.parse.urlparse(url)[2].split('/')[-1]  # '/': it's URL!

    fn = _os.path.join(TEST_DATA_DIR, filename)

    def check_valid_file(fn):
        f = open(fn, *args, **kw)
        if check is None:
            return f
        elif check(f):
            f.seek(0)
            return f
        f.close()

    if _os.path.exists(fn):
        f = check_valid_file(fn)
        if f is not None:
            return f
        unlink(fn)

    # Verify the requirement before downloading the file.  This is where a
    # Grail run stops: 'urlfetch' is not in _ENABLED_RESOURCES, so requires()
    # raises SkipTest.
    requires('urlfetch')

    import urllib.request
    if verbose:
        print('\tfetching %s ...' % url)
    opener = urllib.request.build_opener()
    if gzip:
        opener.addheaders.append(('Accept-Encoding', 'gzip'))
    f = opener.open(url, timeout=INTERNET_TIMEOUT)
    if gzip and f.headers.get('Content-Encoding') == 'gzip':
        f = gzip.GzipFile(fileobj=f)
    try:
        with open(fn, "wb") as out:
            s = f.read()
            while s:
                out.write(s)
                s = f.read()
    finally:
        f.close()

    f = check_valid_file(fn)
    if f is not None:
        return f
    raise TestFailed('invalid resource %r' % fn)


# --- unraisable exceptions ---------------------------------------------

class catch_unraisable_exception:
    """Context manager catching an unraisable exception via sys.unraisablehook.

    ``sys.unraisablehook = hook`` is an ordinary module-attribute assignment
    and takes, so the hook really is installed and cm.unraisable really is
    filled in -- for the paths Grail actually routes through the hook.

    GRAIL: what is narrow is not the assignment but the set of CALLERS.  CPython
    reaches sys.unraisablehook from every place an exception has nowhere to
    propagate to, most of them finalizers (__del__, GC, buffered-file close),
    and Grail has no finalizer machinery at all.  Today the one caller is
    PythonGenerator >> ___closeDelegate___:, CPython's gen_close_iter.  So a
    test wrapping code that raises in a __del__ will see cm.unraisable stay
    None and FAIL rather than error, which is the honest outcome; the try/except
    around the assignment is kept for the same reason.
    """

    def __init__(self):
        self.unraisable = None
        self._old_hook = None
        self._installed = False

    def _hook(self, unraisable):
        self.unraisable = unraisable

    def __enter__(self):
        try:
            self._old_hook = sys.unraisablehook
            sys.unraisablehook = self._hook
            self._installed = True
        except BaseException:
            self._installed = False
        return self

    def __exit__(self, *exc_info):
        if self._installed:
            try:
                sys.unraisablehook = self._old_hook
            except BaseException:
                pass
        try:
            del self.unraisable
        except BaseException:
            self.unraisable = None


# --- submodule attributes (support.numbers / support.testcase) ---------
# Some modules access these as attributes of the package.  Import them
# defensively so a failure here never tanks the whole package import.
try:
    from test.support import numbers
except Exception:
    numbers = None
try:
    from test.support import testcase
except Exception:
    testcase = None


# --- added for test.test_traceback (vendored 2026-08-02) ---

class Error(Exception):
    """Base class for regression-test errors (CPython test.support.Error)."""


# --- added for test.test_format (vendored 2026-08-03) ---

class TestFailed(Error):
    """Test failed (CPython test.support.TestFailed)."""

    def __init__(self, msg, *args, stats=None):
        self.msg = msg
        self.stats = stats
        super().__init__(msg, *args)

    def __str__(self):
        return self.msg


# --- added for test.test_yield_from (vendored 2026-08-03) ---

class disable_gc:
    """Turn the collector off for the block (CPython test.support.disable_gc),
    written as a plain class -- NO @contextlib.contextmanager, see the module
    header.  Grail's gc is a stub, so isenabled/disable/enable may be absent;
    the guarded calls make this a no-op there rather than an ImportError."""

    def __enter__(self):
        import gc
        self._gc = gc
        try:
            self._had_gc = gc.isenabled()
            gc.disable()
        except Exception:
            self._had_gc = False
        return self

    def __exit__(self, *exc):
        if self._had_gc:
            try:
                self._gc.enable()
            except Exception:
                pass
        return False


# Grail has no subprocess / os.spawn support; tests that need one skip.
has_subprocess_support = False


def requires_subprocess():
    """Skip when subprocess support is unavailable (always so in Grail)."""
    return unittest.skipUnless(has_subprocess_support, "requires subprocess support")


# Grail has no os.fork; tests that need one skip.  Upstream's shape, so a
# ``@support.requires_fork()`` decorator skips instead of raising
# AttributeError -- which Grail's decorator handler used to swallow, leaving
# the test to RUN (issue #1369).
has_fork_support = False


def requires_fork():
    return unittest.skipUnless(has_fork_support, "requires working os.fork()")


# Sockets DO work here, unlike subprocesses.  CPython gates this on the two
# WASM platforms whose socket emulation is incomplete, and Grail is neither,
# so the expression is upstream's verbatim rather than a hardcoded True.
has_socket_support = not (
    is_emscripten
    or is_wasi
)


def requires_working_socket(*, module=False):
    """Skip tests or modules that require working sockets

    Can be used as a function/class decorator or to skip an entire module.
    """
    msg = "requires socket support"
    if module:
        if not has_socket_support:
            raise unittest.SkipTest(msg)
    else:
        return unittest.skipUnless(has_socket_support, msg)


def load_package_tests(pkg_dir, loader, standard_tests, pattern):
    """Generic load_tests implementation for simple test packages.

    Upstream verbatim, and needed because test/test_asyncio/__init__.py calls
    it from its ``load_tests``.  Nothing in Grail's harness DOES call it: the
    scoreboard driver discovers unittest.TestCase subclasses defined in one
    named module (test._grail_harness >> score), which is why the manifest
    names package submodules -- ``test.test_asyncio.test_context'' -- rather
    than the package.  So this exists to make the package importable.

    It is kept faithful rather than stubbed to a no-op on purpose.  Grail's
    unittest has no ``loader.discover``, so anything that really does route
    through here fails loudly and names the missing piece, where a stub would
    quietly collect nothing and report a package's worth of tests as passing.
    """
    if pattern is None:
        pattern = "test*"
    top_dir = STDLIB_DIR
    package_tests = loader.discover(start_dir=pkg_dir,
                                    top_level_dir=top_dir,
                                    pattern=pattern)
    standard_tests.addTests(package_tests)
    return standard_tests


def has_no_debug_ranges():
    # CPython gates this on _testcapi.config_get('code_debug_ranges').  Grail
    # has no _testcapi, so the ImportError -> SkipTest path fires (matching
    # CPython when _testcapi is absent).
    try:
        import _testcapi
    except ImportError:
        raise unittest.SkipTest("_testcapi required")
    return not _testcapi.config_get('code_debug_ranges')


def requires_debug_ranges(reason='requires co_positions / debug_ranges'):
    try:
        skip = has_no_debug_ranges()
    except unittest.SkipTest as e:
        skip = True
        reason = e.args[0] if e.args else reason
    return unittest.skipIf(skip, reason)


# Colorization: Grail renders tracebacks as plain text, so forcing "not
# colorized" is a no-op and forcing "colorized" is unsupported.  force_color is
# a plain-class context manager (NO @contextlib.contextmanager -- see the module
# header); the two decorators are identity passthroughs.
class force_color:
    def __init__(self, color):
        self.color = color

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


def force_not_colorized(func):
    return func


def force_not_colorized_test_class(cls):
    return cls


def darwin_malloc_err_warning(test_name):
    """Assure user that loud errors generated by macOS libc's malloc are
    expected."""
    if sys.platform != 'darwin':
        return

    import shutil
    msg = ' NOTICE '
    detail = (f'{test_name} may generate "malloc can\'t allocate region"\n'
              'warnings on macOS systems. This behavior is known. Do not\n'
              'report a bug unless tests are also failing.\n'
              'See https://github.com/python/cpython/issues/85100')

    padding, _ = shutil.get_terminal_size()
    print(msg.center(padding, '-'))
    print(detail)
    print('-' * padding)


# GRAIL: names the curated test modules read off ``support`` directly.
#
# Both were missing, and neither absence was visible: each is used only in a
# class-body decorator position, where a raising expression is silently
# dropped along with the rest of the stack -- so the tests they guard simply
# ran unguarded instead of announcing a missing symbol.

# Grail has one interpreter lock by construction (green threads on one gem),
# so the free-threading build's flag is False, as it is on a default CPython.
Py_GIL_DISABLED = False


def no_tracing(func):
    """Temporarily turn tracing off for the duration of a test.

    Upstream wraps only when ``sys.gettrace`` exists and otherwise returns the
    function unchanged; that fallback is the branch Grail takes when it does
    not, so the shape below is upstream's, not a stub.
    """
    if not hasattr(sys, 'gettrace'):
        return func

    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        original_trace = sys.gettrace()
        try:
            sys.settrace(None)
            return func(*args, **kwargs)
        finally:
            sys.settrace(original_trace)

    return wrapper


def refcount_test(test):
    """Decorator for tests which involve reference counting.

    Upstream verbatim: not run except on CPython, and any trace function is
    unset while it runs.  Grail is never CPython, so it always skips.
    """
    return no_tracing(cpython_only(test))


def nomemtest(f):
    """Check that we can use this test with ``_testcapi.set_nomemory``.

    Upstream wraps f to import _testcapi and skips Py_TRACE_REFS builds, then
    applies cpython_only -- which on Grail skips unconditionally, so that is
    all that is left of it here.
    """
    return cpython_only(f)


# GRAIL: verbatim from CPython 3.14.4 Lib/test/support/__init__.py, the names
# CPython test modules import that this trimmed copy lacked.

import os
import sysconfig
import time
try:
    import _opcode
except ImportError:
    # GRAIL: no _opcode module, and no specializing interpreter for
    # requires_specialization{,_ft} to wait for.
    class _opcode:
        ENABLE_SPECIALIZATION = False
        ENABLE_SPECIALIZATION_FT = False


def flush_std_streams():
    if sys.stdout is not None:
        sys.stdout.flush()
    if sys.stderr is not None:
        sys.stderr.flush()


def print_warning(msg):
    # bpo-45410: Explicitly flush stdout to keep logs in order
    flush_std_streams()
    stream = print_warning.orig_stderr
    for line in msg.splitlines():
        print(f"Warning -- {line}", file=stream)
    stream.flush()


print_warning.orig_stderr = sys.stderr


# Use is_wasm32 as a generic check for WebAssembly platforms.
is_wasm32 = is_emscripten or is_wasi

is_s390x = hasattr(os, 'uname') and os.uname().machine == 's390x'
skip_on_s390x = unittest.skipIf(is_s390x, 'skipped on s390x')


class SuppressCrashReport:
    """Try to prevent a crash report from popping up.

    On Windows, don't display the Windows Error Reporting dialog.  On UNIX,
    disable the creation of coredump file.
    """
    old_value = None
    old_modes = None

    def __enter__(self):
        """On Windows, disable Windows Error Reporting dialogs using
        SetErrorMode() and CrtSetReportMode().

        On UNIX, try to save the previous core file size limit, then set
        soft limit to 0.
        """
        if sys.platform.startswith('win'):
            # see http://msdn.microsoft.com/en-us/library/windows/desktop/ms680621.aspx
            try:
                import msvcrt
            except ImportError:
                return

            self.old_value = msvcrt.GetErrorMode()

            msvcrt.SetErrorMode(self.old_value | msvcrt.SEM_NOGPFAULTERRORBOX)

            # bpo-23314: Suppress assert dialogs in debug builds.
            # CrtSetReportMode() is only available in debug build.
            if hasattr(msvcrt, 'CrtSetReportMode'):
                self.old_modes = {}
                for report_type in [msvcrt.CRT_WARN,
                                    msvcrt.CRT_ERROR,
                                    msvcrt.CRT_ASSERT]:
                    old_mode = msvcrt.CrtSetReportMode(report_type,
                            msvcrt.CRTDBG_MODE_FILE)
                    old_file = msvcrt.CrtSetReportFile(report_type,
                            msvcrt.CRTDBG_FILE_STDERR)
                    self.old_modes[report_type] = old_mode, old_file

        else:
            try:
                import resource
                self.resource = resource
            except ImportError:
                self.resource = None
            if self.resource is not None:
                try:
                    self.old_value = self.resource.getrlimit(self.resource.RLIMIT_CORE)
                    self.resource.setrlimit(self.resource.RLIMIT_CORE,
                                            (0, self.old_value[1]))
                except (ValueError, OSError):
                    pass

            if sys.platform == 'darwin':
                import subprocess
                # Check if the 'Crash Reporter' on OSX was configured
                # in 'Developer' mode and warn that it will get triggered
                # when it is.
                #
                # This assumes that this context manager is used in tests
                # that might trigger the next manager.
                cmd = ['/usr/bin/defaults', 'read',
                       'com.apple.CrashReporter', 'DialogType']
                proc = subprocess.Popen(cmd,
                                        stdout=subprocess.PIPE,
                                        stderr=subprocess.PIPE)
                with proc:
                    stdout = proc.communicate()[0]
                if stdout.strip() == b'developer':
                    print("this test triggers the Crash Reporter, "
                          "that is intentional", end='', flush=True)

        return self

    def __exit__(self, *ignore_exc):
        """Restore Windows ErrorMode or core file behavior to initial value."""
        if self.old_value is None:
            return

        if sys.platform.startswith('win'):
            import msvcrt
            msvcrt.SetErrorMode(self.old_value)

            if self.old_modes:
                for report_type, (old_mode, old_file) in self.old_modes.items():
                    msvcrt.CrtSetReportMode(report_type, old_mode)
                    msvcrt.CrtSetReportFile(report_type, old_file)
        else:
            if self.resource is not None:
                try:
                    self.resource.setrlimit(self.resource.RLIMIT_CORE, self.old_value)
                except (ValueError, OSError):
                    pass


def requires_gil_enabled(msg="needs the GIL enabled"):
    """Decorator for skipping tests on the free-threaded build."""
    return unittest.skipIf(Py_GIL_DISABLED, msg)


# Use is_wasm32 as a generic check for WebAssembly platforms.
is_wasm32 = is_emscripten or is_wasi


def sortdict(dict):
    "Like repr(dict), but in sorted order."
    items = sorted(dict.items())
    reprpairs = ["%r: %r" % pair for pair in items]
    withcommas = ", ".join(reprpairs)
    return "{%s}" % withcommas


MS_WINDOWS = (sys.platform == 'win32')


def system_must_validate_cert(f):
    """Skip the test on TLS certificate validation failures."""
    @functools.wraps(f)
    def dec(*args, **kwargs):
        try:
            f(*args, **kwargs)
        except OSError as e:
            if "CERTIFICATE_VERIFY_FAILED" in str(e):
                raise unittest.SkipTest("system does not contain "
                                        "necessary certificates")
            raise
    return dec


def requires_specialization_ft(test):
    return unittest.skipUnless(
        _opcode.ENABLE_SPECIALIZATION_FT, "requires specialization")(test)


def requires_specialization(test):
    return unittest.skipUnless(
        _opcode.ENABLE_SPECIALIZATION, "requires specialization")(test)


def control_characters_c0() -> list[str]:
    """Returns a list of C0 control characters as strings.
    C0 control characters defined as the byte range 0x00-0x1F, and 0x7F.
    """
    return [chr(c) for c in range(0x00, 0x20)] + ["\x7F"]


@contextlib.contextmanager
def patch_list(orig):
    """Like unittest.mock.patch.dict, but for lists."""
    try:
        saved = orig[:]
        yield
    finally:
        orig[:] = saved


class SaveSignals:
    """
    Save and restore signal handlers.

    This class is only able to save/restore signal handlers registered
    by the Python signal module: see bpo-13285 for "external" signal
    handlers.
    """

    def __init__(self):
        import signal
        self.signal = signal
        self.signals = signal.valid_signals()
        # SIGKILL and SIGSTOP signals cannot be ignored nor caught
        for signame in ('SIGKILL', 'SIGSTOP'):
            try:
                signum = getattr(signal, signame)
            except AttributeError:
                continue
            self.signals.remove(signum)
        self.handlers = {}

    def save(self):
        for signum in self.signals:
            handler = self.signal.getsignal(signum)
            if handler is None:
                # getsignal() returns None if a signal handler was not
                # registered by the Python signal module,
                # and the handler is not SIG_DFL nor SIG_IGN.
                #
                # Ignore the signal: we cannot restore the handler.
                continue
            self.handlers[signum] = handler

    def restore(self):
        for signum, handler in self.handlers.items():
            self.signal.signal(signum, handler)


def get_pagesize():
    """Get size of a page in bytes."""
    try:
        page_size = os.sysconf('SC_PAGESIZE')
    except (ValueError, AttributeError):
        try:
            page_size = os.sysconf('SC_PAGE_SIZE')
        except (ValueError, AttributeError):
            page_size = 4096
    return page_size


def in_systemd_nspawn_sync_suppressed() -> bool:
    """
    Test whether the test suite is runing in systemd-nspawn
    with ``--suppress-sync=true``.

    This can be used to skip tests that rely on ``fsync()`` calls
    and similar not being intercepted.
    """

    if not hasattr(os, "O_SYNC"):
        return False

    try:
        with open("/run/systemd/container", "rb") as fp:
            if fp.read().rstrip() != b"systemd-nspawn":
                return False
    except FileNotFoundError:
        return False

    # If systemd-nspawn is used, O_SYNC flag will immediately
    # trigger EINVAL.  Otherwise, ENOENT will be given instead.
    import errno
    try:
        fd = os.open(__file__, os.O_RDONLY | os.O_SYNC)
    except OSError as err:
        if err.errno == errno.EINVAL:
            return True
    else:
        os.close(fd)

    return False


def skip_android_selinux(name):
    return unittest.skipIf(
        sys.platform == "android", f"Android blocks {name} with SELinux"
    )


def reap_children():
    """Use this function at the end of test_main() whenever sub-processes
    are started.  This will help ensure that no extra children (zombies)
    stick around to hog resources and create problems when looking
    for refleaks.
    """
    global environment_altered

    # Need os.waitpid(-1, os.WNOHANG): Windows is not supported
    if not (hasattr(os, 'waitpid') and hasattr(os, 'WNOHANG')):
        return
    elif not has_subprocess_support:
        return

    # Reap all our dead child processes so we don't leave zombies around.
    # These hog resources and might be causing some of the buildbots to die.
    while True:
        try:
            # Read the exit status of any child process which already completed
            pid, status = os.waitpid(-1, os.WNOHANG)
        except OSError:
            break

        if pid == 0:
            break

        print_warning(f"reap_children() reaped child process {pid}")
        environment_altered = True


def get_attribute(obj, name):
    """Get an attribute, raising SkipTest if AttributeError is raised."""
    try:
        attribute = getattr(obj, name)
    except AttributeError:
        raise unittest.SkipTest("object %r has no attribute %r" % (obj, name))
    else:
        return attribute


def skip_if_buggy_ucrt_strfptime(test):
    """
    Skip decorator for tests that use buggy strptime/strftime

    If the UCRT bugs are present time.localtime().tm_zone will be
    an empty string, otherwise we assume the UCRT bugs are fixed

    See bpo-37552 [Windows] strptime/strftime return invalid
    results with UCRT version 17763.615
    """
    import locale
    global _buggy_ucrt
    if _buggy_ucrt is None:
        if(sys.platform == 'win32' and
                locale.getencoding() == 'cp65001' and
                time.localtime().tm_zone == ''):
            _buggy_ucrt = True
        else:
            _buggy_ucrt = False
    return unittest.skip("buggy MSVC UCRT strptime/strftime")(test) if _buggy_ucrt else test


class PythonSymlink:
    """Creates a symlink for the current Python executable"""
    def __init__(self, link=None):
        from .os_helper import TESTFN

        self.link = link or os.path.abspath(TESTFN)
        self._linked = []
        self.real = os.path.realpath(sys.executable)
        self._also_link = []

        self._env = None

        self._platform_specific()

    if sys.platform == "win32":
        def _platform_specific(self):
            import glob
            import _winapi

            if os.path.lexists(self.real) and not os.path.exists(self.real):
                # App symlink appears to not exist, but we want the
                # real executable here anyway
                self.real = _winapi.GetModuleFileName(0)

            dll = _winapi.GetModuleFileName(sys.dllhandle)
            src_dir = os.path.dirname(dll)
            dest_dir = os.path.dirname(self.link)
            self._also_link.append((
                dll,
                os.path.join(dest_dir, os.path.basename(dll))
            ))
            for runtime in glob.glob(os.path.join(glob.escape(src_dir), "vcruntime*.dll")):
                self._also_link.append((
                    runtime,
                    os.path.join(dest_dir, os.path.basename(runtime))
                ))

            self._env = {k.upper(): os.getenv(k) for k in os.environ}
            self._env["PYTHONHOME"] = os.path.dirname(self.real)
            if sysconfig.is_python_build():
                self._env["PYTHONPATH"] = STDLIB_DIR
    else:
        def _platform_specific(self):
            pass

    def __enter__(self):
        os.symlink(self.real, self.link)
        self._linked.append(self.link)
        for real, link in self._also_link:
            os.symlink(real, link)
            self._linked.append(link)
        return self

    def __exit__(self, exc_type, exc_value, exc_tb):
        for link in self._linked:
            try:
                os.remove(link)
            except IOError as ex:
                if verbose:
                    print("failed to clean up {}: {}".format(link, ex))

    def _call(self, python, args, env, returncode):
        import subprocess
        cmd = [python, *args]
        p = subprocess.Popen(cmd, stdout=subprocess.PIPE,
                             stderr=subprocess.PIPE, env=env)
        r = p.communicate()
        if p.returncode != returncode:
            if verbose:
                print(repr(r[0]))
                print(repr(r[1]), file=sys.stderr)
            raise RuntimeError(
                'unexpected return code: {0} (0x{0:08X})'.format(p.returncode))
        return r

    def call_real(self, *args, returncode=0):
        return self._call(self.real, args, None, returncode)

    def call_link(self, *args, returncode=0):
        return self._call(self.link, args, self._env, returncode)


def no_rerun(reason):
    """Skip rerunning for a particular test.

    WARNING: Use this decorator with care; skipping rerunning makes it
    impossible to find reference leaks. Provide a clear reason for skipping the
    test using the 'reason' parameter.
    """
    def deco(func):
        assert not isinstance(func, type), func
        _has_run = False
        def wrapper(self):
            nonlocal _has_run
            if _has_run:
                self.skipTest(reason)
            func(self)
            _has_run = True
        return wrapper
    return deco


# Windows doesn't have os.uname() but it doesn't support s390x.
is_s390x = hasattr(os, 'uname') and os.uname().machine == 's390x'


def _id(obj):
    return obj


def _supports_remote_attaching():
    PROCESS_VM_READV_SUPPORTED = False

    try:
        from _remote_debugging import PROCESS_VM_READV_SUPPORTED
    except ImportError:
        pass

    return PROCESS_VM_READV_SUPPORTED


def _support_remote_exec_only_impl():
    if not sys.is_remote_debug_enabled():
        return unittest.skip("Remote debugging is not enabled")
    if sys.platform not in ("darwin", "linux", "win32"):
        return unittest.skip("Test only runs on Linux, Windows and macOS")
    if sys.platform == "linux" and not _supports_remote_attaching():
        return unittest.skip("Test only runs on Linux with process_vm_readv support")
    return _id


Py_TRACE_REFS = hasattr(sys, 'getobjects')


def force_colorized_test_class(cls):
    """Force the terminal to be colorized for the entire test class."""
    original_setUpClass = cls.setUpClass

    @classmethod
    @functools.wraps(cls.setUpClass)
    def new_setUpClass(cls):
        cls.enterClassContext(force_color(True))
        original_setUpClass()

    cls.setUpClass = new_setUpClass
    return cls


def force_colorized(func):
    """Force the terminal to be colorized."""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        with force_color(True):
            return func(*args, **kwargs)
    return wrapper


def support_remote_exec_only(test):
    return _support_remote_exec_only_impl()(test)


# GRAIL: CPython reads sys._jit.is_enabled(); Grail has no sys._jit, and no JIT.
try:
    _JIT_ENABLED = sys._jit.is_enabled()
except AttributeError:
    _JIT_ENABLED = False
requires_jit_enabled = unittest.skipUnless(_JIT_ENABLED, "requires JIT enabled")
requires_jit_disabled = unittest.skipIf(_JIT_ENABLED, "requires JIT disabled")


# Set by libregrtest/main.py so we can skip tests that are not
# useful for PGO
PGO = False


@contextlib.contextmanager
def gc_threshold(*args):
    import gc
    old_threshold = gc.get_threshold()
    gc.set_threshold(*args)
    try:
        yield
    finally:
        gc.set_threshold(*old_threshold)


def reset_code(f: types.FunctionType) -> types.FunctionType:
    """Clear all specializations, local instrumentation, and JIT code for the given function."""
    f.__code__ = f.__code__.replace()
    return f
