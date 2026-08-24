"""PEP 702's @deprecated where it meets the rest of the class machinery.

Three seams, each of which broke differently:

THE METACLASS EATS ITS KEYWORDS FIRST.  CPython evaluates ``class
Foo(metaclass=MyMeta, cls='haha')`` as ``MyMeta('Foo', bases, ns,
cls='haha')`` -- the header keywords are the metaclass's to bind or forward,
and ``__init_subclass__`` receives only what the metaclass's ``__new__``
passes on to ``type.__new__``.  Grail had it upside down twice over: the
keywords never reached the metaclass (its ``__new__`` got defaults), and the
hook chain got all of them (object's terminal raised "takes no keyword
arguments").  The consumption is reproduced from the ``__new__``'s own
signature, following ``__wrapped__`` first so a decorated ``__new__`` --
@deprecated's own wrapper is the case in play -- reads the WRAPPED
function's parameters, exactly as ``inspect.signature`` would.

A SIBLING BASE'S HOOK GETS THE KEYWORDS.  ``class C(A, B, x=42)`` with
@deprecated on A and the x-taking hook on B: A's wrapper must warn and then
DELEGATE COOPERATIVELY -- ``super(A, cls).__init_subclass__(x=42)`` -- so the
keyword reaches B.  The vendored ``_py_warnings`` captured A's pre-wrap hook
(object's builtin) and forwarded the keywords into it, which raises; upstream
CPython fixed the wrapper after 3.14.0, and the vendored copy now carries
that fix.  NOTE: the sibling checks therefore FAIL under CPython 3.14.0
itself -- its stdlib predates the fix, and its own test suite has no
test_existing_init_subclass_in_sibling_base.  They sit in the XFAIL list not
as a Grail limitation but as the one case where the vendored corpus is AHEAD
of the reference interpreter.

Metaclass checks were validated against CPython 3.14.0; the
sibling checks against the upstream fix's own semantics, and under Grail.
"""

import warnings

RESULTS = {}


def check(name, fn, expected):
    try:
        got = fn()
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)
        return
    RESULTS[name] = True if got == expected else 'expected %r, got %r' % (
        expected, got)


# ------------------------------------------------- metaclass keywords

def _metaclass_receives_its_keyword():
    seen = {}

    class MyMeta(type):
        def __new__(mcs, name, bases, attrs, cls=None):
            seen['cls'] = cls
            return super().__new__(mcs, name, bases, attrs)

    class Foo(metaclass=MyMeta, cls='haha'):
        pass

    return seen


check('the_metaclass_receives_its_keyword', _metaclass_receives_its_keyword,
      {'cls': 'haha'})


def _a_deprecated_metaclass_still_receives_it():
    """The signature is read through __wrapped__: @deprecated's __new__
    wrapper is (cls, *args, **kwargs), which consumes nothing by name."""
    seen = {}

    @warnings.deprecated('MyMeta will go away soon')
    class DepMeta(type):
        def __new__(mcs, name, bases, attrs, cls=None):
            seen['cls'] = cls
            return super().__new__(mcs, name, bases, attrs)

    with warnings.catch_warnings(record=True) as log:
        warnings.simplefilter('always')

        class Foo(metaclass=DepMeta, cls='haha'):
            pass

    return (seen, [w.category.__name__ for w in log])


check('a_deprecated_metaclass_still_receives_it',
      _a_deprecated_metaclass_still_receives_it,
      ({'cls': 'haha'}, ['DeprecationWarning']))


def _a_kwargs_catchall_consumes_everything():
    """A **kwargs __new__ binds whatever is left, and what it forwards to
    super().__new__ is its own code -- the common shape forwards nothing, so
    the hook chain gets NO keywords and a hook requiring one raises.
    Measured against CPython 3.14.0; the first guess here ("unconsumed
    keywords flow through") was the plausible-and-wrong reading."""
    class Base:
        def __init_subclass__(cls, x):
            cls.inited = x

    class FwdMeta(type):
        def __new__(mcs, name, bases, attrs, **kwargs):
            return super().__new__(mcs, name, bases, attrs)

    try:
        class C(Base, metaclass=FwdMeta, x=42):
            pass
        return 'did not raise'
    except TypeError:
        return 'TypeError'


check('a_kwargs_catchall_consumes_everything',
      _a_kwargs_catchall_consumes_everything, 'TypeError')


# ------------------------------------------------- sibling delegation
# XFAIL under CPython 3.14.0 (see the module docstring): its _py_warnings
# predates the upstream fix the vendored copy carries.

def _sibling_hook_receives_the_keyword():
    @warnings.deprecated('A will go away soon')
    class A:
        pass

    class B:
        def __init_subclass__(cls, x):
            super().__init_subclass__()
            cls.inited = x

    with warnings.catch_warnings(record=True) as log:
        warnings.simplefilter('always')

        class C(A, B, x=42):
            pass

    return (C.inited, [w.category.__name__ for w in log])


check('the_sibling_hook_receives_the_keyword',
      _sibling_hook_receives_the_keyword, (42, ['DeprecationWarning']))


def _the_hooks_own_super_reaches_the_wrapper():
    """The other base order: B's hook runs first, and ITS zero-argument
    super().__init_subclass__() must find A's ASSIGNED wrapper on the MRO --
    a Python object in the attribute store, not a compiled method."""
    @warnings.deprecated('A will go away soon')
    class A:
        pass

    class B:
        def __init_subclass__(cls, x):
            super().__init_subclass__()
            cls.inited = x

    with warnings.catch_warnings(record=True) as log:
        warnings.simplefilter('always')

        class D(B, A, x=42):
            pass

    return (D.inited, [w.category.__name__ for w in log])


check('the_hooks_own_super_reaches_the_wrapper',
      _the_hooks_own_super_reaches_the_wrapper,
      (42, ['DeprecationWarning']))


def _stdlib_has_the_cooperative_fix():
    """Does the RUNNING interpreter's _py_warnings already delegate
    cooperatively?  Detected from the source, not from the check's outcome --
    classifying by result would relabel any real regression as expected.

    CPython 3.14.0 lacks the fix (the sibling check is an honest XFAIL
    there); 3.14.7, which CI runs, ships it (the check must PASS there, and
    a hardcoded XFAIL scored XPASS and failed the gate -- the fixture gate's
    one version-skew case so far).  Grail's vendored copy carries the fix,
    and any failure to introspect answers True for the same reason."""
    try:
        import inspect as _inspect
        import _py_warnings as _pw
        return 'super(arg, cls)' in _inspect.getsource(_pw.deprecated)
    except BaseException:
        return True


# Only the C-order case: the D order (hook first, wrapper via the hook's own
# super()) already worked on the unfixed _py_warnings, since the old wrapper
# handles a zero-argument delegation fine.
GRAIL_ONLY = ([] if _stdlib_has_the_cooperative_fix()
              else ['the_sibling_hook_receives_the_keyword'])


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        if _name in GRAIL_ONLY:
            continue
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
    # NOT a Grail limitation this time -- the vendored _py_warnings carries an
    # upstream fix CPython 3.14.0 predates, so 3.14.0 is the one expected to
    # differ.  XPASS here would mean the reference interpreter caught up.
    print('--- vendored fix is ahead of CPython 3.14.0: expected to differ ---')
    for _name in GRAIL_ONLY:
        _v = RESULTS[_name]
        print('%-5s %s' % ('XPASS' if _v is True else 'XFAIL', _name))
