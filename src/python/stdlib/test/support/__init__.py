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
#   * NO @contextlib.contextmanager -- it is a no-op passthrough in Grail
#     (generators are not coroutine-backed for that pattern).  Every
#     context manager here is a plain class with __enter__/__exit__.
#   * Method @-decorators are dropped by Grail codegen, so the skip/
#     requires/cpython_only family below only has to EXIST as a name
#     (they are almost never actually executed).  They are written as
#     flexible passthroughs so direct programmatic calls also no-op.

import sys
import unittest

# Re-exported so `from test.support import verbose`-style imports work and
# so tests can flip behavior without argv parsing.
verbose = False

# Platform / build flags the starter set probes.
is_wasi = False
is_emscripten = False
is_android = False
HAVE_PY_DOCSTRINGS = True
MISSING_C_DOCSTRINGS = False

# Size constants used by bigmem tests.
_1M = 1024 * 1024
_1G = 1024 * _1M
_2G = 2 * _1G
_4G = 4 * _1G
MAX_Py_ssize_t = sys.maxsize

# Timeouts (seconds) used by tests that would otherwise block forever.
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
skip_on_s390x = _PassthroughDecorator()
skip_emscripten_stack_overflow = _PassthroughDecorator()
skip_wasi_stack_overflow = _PassthroughDecorator()


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


def check_sizeof(test, o, size):
    # sys.getsizeof has no meaning on GemStone objects
    raise unittest.SkipTest("sys.getsizeof unavailable under Grail")

skip_if_buildbot = _PassthroughDecorator()
skip_if_pgo_task = _PassthroughDecorator()
requires_working_socket = _PassthroughDecorator()


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

class adjust_int_max_str_digits:
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


class swap_attr:
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


class swap_item:
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


class infinite_recursion:
    def __init__(self, max_depth=100):
        self.max_depth = max_depth

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


class captured_stdout:
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


class captured_stderr:
    def __enter__(self):
        import io
        self.buf = io.StringIO()
        self.old = sys.stderr
        sys.stderr = self.buf
        return self.buf

    def __exit__(self, *exc):
        sys.stderr = self.old
        return False


class captured_output:
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


def requires(resource, msg=None):
    if not is_resource_enabled(resource):
        if msg is None:
            msg = "resource {!r} is not enabled".format(resource)
        raise unittest.SkipTest(msg)


def requires_resource(resource):
    # Decorator form (dropped on methods).
    return _PassthroughDecorator()


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


def check_syntax_error(testcase, statement, errtext="", *, lineno=None, offset=None):
    with testcase.assertRaises(SyntaxError):
        compile(statement, "<test string>", "exec")


# --- misc paths --------------------------------------------------------

import os as _os
# CPython uses this to locate data files; point at the vendored stdlib root.
REPO_ROOT = _os.path.dirname(_os.path.dirname(_os.path.dirname(__file__)))
STDLIB_DIR = REPO_ROOT
TEST_HOME_DIR = _os.path.dirname(__file__)

# TESTFN mirrors os_helper for the rare top-level reference.
TESTFN = "@grail_test_tmp"


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
