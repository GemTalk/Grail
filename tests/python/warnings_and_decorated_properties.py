"""What test.test_warnings found missing, outside and inside warnings itself.

  * A bare exec() inside a FUNCTION could not import: its namespace is the
    module's globals, ``__builtins__'' included, so the import went through
    the builtins override with CPython's fromlist=None -- which Grail's
    __import__ refused with ``object of type 'NoneType' has no len()''.
  * A live frame of exec'd code (sys._getframe, and so every warning raised
    there) reported the filename ``<grail>'' instead of compile()'s.
  * warn_explicit(module_globals=...) never asked the loader for the source;
    CPython calls get_source and fails on what it answers.
  * A filename holding a lone surrogate made warn_explicit raise.
  * warnings had no __all__.
  * ``A.__init__ is object.__init__'' and ``A.__new__ is object.__new__''
    were False for a class defining neither, so @deprecated on such a class
    accepted arguments CPython rejects.
  * @property over another decorator ran the undecorated body: the
    @deprecated getter below never warned.
  * import_fresh_module('warnings', fresh=[...]) answered the module already
    imported instead of a new module object.

Every expectation was measured against CPython 3.14.
"""

import sys
import warnings

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:200])


def outcome(fn, *args):
    try:
        fn(*args)
    except Exception as exc:
        return '%s: %s' % (type(exc).__name__, exc)
    return 'ok'


# ------------------------------------------------ exec inside a function

def _exec_in_function():
    exec("import os")
    return (outcome(__import__, 'os', None, None, None, 0),
            outcome(__import__, 'os', {}, {}, None, 0))


check('a_bare_exec_in_a_function_can_import', _exec_in_function(),
      ('ok', 'ok'))


def _exec_frames():
    code = compile("import sys\nname = sys._getframe().f_code.co_filename\n"
                   "import warnings\nwarnings.warn('hello', UserWarning)",
                   "<warnings-test>", "exec")
    ns = {}
    with warnings.catch_warnings(record=True) as w:
        warnings.simplefilter("always", category=UserWarning)
        exec(code, ns)
    return (ns['name'], [x.filename for x in w])


check('exec_d_code_reports_compile_s_filename', _exec_frames(),
      ('<warnings-test>', ['<warnings-test>']))


# ------------------------------------------------ warn_explicit's loader

def _module_globals(source):
    import importlib.machinery

    class Loader:
        calls = []

        def get_source(self, fullname):
            Loader.calls.append(fullname)
            return source

    loader = Loader()
    return Loader.calls, {'__loader__': loader, '__name__': 'foobar',
                          '__spec__': importlib.machinery.ModuleSpec(
                              'foobar', loader)}


def _get_source():
    out = []
    with warnings.catch_warnings(record=True):
        warnings.simplefilter("always")
        for source, lineno in (('a\nb', 2), ('a\nb', 3), ('a\nb', 0),
                               (b'bytes', 1), (None, 1)):
            calls, g = _module_globals(source)
            out.append((outcome(warnings.warn_explicit, 'foo', UserWarning,
                                'bar', lineno, None, None, g), calls))
    return out


check('warn_explicit_asks_the_loader_for_the_source', _get_source(),
      [('ok', ['foobar']),
       ('IndexError: list index out of range', ['foobar']),
       ('IndexError: list index out of range', ['foobar']),
       ('TypeError: must be str, not bytes', ['foobar']),
       ('ok', ['foobar'])])


def _bad_splitlines():
    class BadSource(str):
        def splitlines(self):
            return 42

    calls, g = _module_globals(BadSource('spam'))
    with warnings.catch_warnings(record=True) as w:
        warnings.simplefilter("always")
        warnings.warn_explicit('foo', UserWarning, 'bar', 1,
                               module_globals=g)
    return (calls, [str(x.message) for x in w])


check('the_source_is_split_by_str_s_own_splitlines', _bad_splitlines(),
      (['foobar'], ['foo']))


def _surrogate_filename():
    with warnings.catch_warnings(record=True) as w:
        warnings.simplefilter("always")
        warnings.warn_explicit("text", UserWarning, "surrogate\udc80", 1)
    return [x.filename == "surrogate\udc80" for x in w]


check('a_lone_surrogate_filename_is_recorded', _surrogate_filename(), [True])


check('warnings_declares_its_public_api', sorted(warnings.__all__),
      ['catch_warnings', 'deprecated', 'filterwarnings', 'formatwarning',
       'resetwarnings', 'showwarning', 'simplefilter', 'warn',
       'warn_explicit'])


# ------------------------------------------------ methods inherited from object

def _inherited_identity():
    class A:
        pass

    class B:
        def __init__(self, x):
            self.x = x

        def __new__(cls, *args):
            return object.__new__(cls)

    return (A.__init__ is object.__init__, A.__new__ is object.__new__,
            B.__init__ is object.__init__, B.__new__ is object.__new__,
            B(3).x, type(A.__new__(A)).__name__)


check('a_method_inherited_from_object_is_object_s',
      _inherited_identity(), (True, True, False, False, 3, 'A'))


def _deprecated_class():
    @warnings.deprecated("D will go away")
    class D:
        pass

    with warnings.catch_warnings(record=True) as w:
        warnings.simplefilter("always")
        first = outcome(D)
        second = outcome(D, 42)
    return (first, second, [str(x.message) for x in w])


check('a_deprecated_class_without_init_rejects_arguments',
      _deprecated_class(),
      ('ok', 'TypeError: D() takes no arguments',
       ['D will go away', 'D will go away']))


# ------------------------------------------------ decorated properties

def _decorated_property():
    log = []

    def traced(f):
        def wrapper(*args):
            log.append(f.__name__)
            return f(*args)
        return wrapper

    class C:
        def __init__(self):
            self._v = 1

        @property
        @traced
        def b(self):
            return 2

        @property
        def s(self):
            return self._v

        @s.setter
        @traced
        def s(self, v):
            self._v = v

        def bump(self):
            self.s = self.s + 10
            return self.s

    c = C()
    got = [c.b, c.s]
    c.s = 7
    # The message names the class; only its tail is compared, because
    # CPython names it by __qualname__ and Grail by __name__ -- a difference
    # of its own, not the one pinned here.
    got += [c.s, c.bump(),
            outcome(setattr, c, 'b', 3).endswith("object has no setter"),
            isinstance(C.b, property), isinstance(C.s, property)]
    return (got, log)


check('a_property_over_a_decorator_runs_the_decorated_accessors',
      _decorated_property(),
      ([2, 1, 7, 17, True, True, True],
       ['b', 's', 's']))


def _deprecated_property():
    class Capybara:
        @property
        @warnings.deprecated("x will go away soon")
        def x(self):
            return 5

    with warnings.catch_warnings(record=True) as w:
        warnings.simplefilter("always")
        value = Capybara().x
    return (value, [str(x.message) for x in w])


check('a_deprecated_property_getter_warns', _deprecated_property(),
      (5, ['x will go away soon']))


# ------------------------------------------------ import_fresh_module

def _fresh_warnings():
    from test.support import import_helper
    fresh = import_helper.import_fresh_module(
        "warnings", fresh=["_warnings", "_py_warnings"])
    with fresh.catch_warnings(record=True) as w:
        fresh.simplefilter("always")
        fresh.warn("through the copy")
    return (fresh is not warnings, sys.modules['warnings'] is warnings,
            hasattr(fresh.warn, '__code__'), [str(x.message) for x in w])


check('a_fresh_warnings_is_a_new_working_module', _fresh_warnings(),
      (True, True, False, ['through the copy']))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
