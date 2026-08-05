"""Function objects carry real Python metadata, and functools copies it.

Two coupled gaps used to make ``functools.wraps`` a no-op:

  1. Grail closures (ExecBlock) had no ``__dict__``, ``__doc__`` or
     ``__type_params__``, could not have an attribute DELETED, and
     answered ``object``'s own docstring for ``__doc__`` -- so even a
     ``setattr(f, '__doc__', ...)`` did not round-trip.
  2. ``update_wrapper`` / ``wraps`` were identity stubs that copied
     nothing, with the comment that Grail's closures "don't honour
     user-stamped __name__ / __doc__ anyway".

Every assertion here is a relationship CPython guarantees, and several are
IDENTITY (``is``) rather than equality, because that is what
``functools.update_wrapper``'s contract actually promises.
"""

import functools


# --- what a bare function exposes -------------------------------------------

def undocumented_function_doc_is_none():
    """CPython: an undocumented function's __doc__ is None.

    It used to be object's docstring, inherited through Object>>__doc__ --
    so every Grail function claimed to be "The base class of the class
    hierarchy".
    """
    def f():
        pass
    return f.__doc__ is None


def docstring_is_captured():
    """A leading string literal becomes __doc__, as CPython's compiler does."""
    def f():
        """This is a test"""
        pass
    return f.__doc__ == 'This is a test'


def annotated_def_keeps_its_docstring():
    """__annotations__ and __doc__ are stamped together, not either/or.

    The def-time stamp is a SINGLE Smalltalk keyword send, so the
    annotations-plus-docstring combination is its own selector shape and
    can regress independently of the other three.
    """
    def f(x: int):
        """Documented and annotated"""
        pass
    return f.__doc__ == 'Documented and annotated' and 'x' in f.__annotations__


def fresh_function_dict_is_empty():
    """func.__dict__ starts EMPTY.

    Grail stamps __name__ (and __annotations__) at def time; those live in a
    separate slot namespace precisely so they do not show up here.  If they
    leaked in, update_wrapper's __dict__ merge would copy them onto every
    wrapper.
    """
    def f():
        pass
    return f.__dict__ == {}


def type_params_is_the_empty_tuple():
    """PEP 695 type params aren't modelled, but the attribute must exist:
    it is named in WRAPPER_ASSIGNMENTS, and a wrapper that raises
    AttributeError for a name on that list breaks update_wrapper's callers.
    """
    def f():
        pass
    return f.__type_params__ == ()


def annotations_and_type_params_are_stable():
    """Repeated reads answer the SAME object, not an equal one.

    update_wrapper's contract is identity-based (check_wrapper asserts
    ``wrapper.__annotations__ is wrapped.__annotations__``), so a fresh
    empty dict per read would silently break the copy.
    """
    def f():
        pass
    return (f.__annotations__ is f.__annotations__
            and f.__type_params__ is f.__type_params__)


def setattr_and_dict_agree():
    """An attribute set on a function is visible in its __dict__, live."""
    def f():
        pass
    f.attr = 'AV'
    return f.__dict__ == {'attr': 'AV'} and f.attr == 'AV'


def dunder_setattr_round_trips():
    """setattr of a SLOT name has to be readable back.

    A compiled Smalltalk method outranks the side-table __getattr__ read,
    so before __doc__ became slot-backed this write was silently lost.
    """
    def f():
        pass
    f.__doc__ = 'DOC'
    f.__qualname__ = 'QN'
    return f.__doc__ == 'DOC' and f.__qualname__ == 'QN'


def delattr_removes_then_raises():
    """del f.attr works, and deleting it twice raises AttributeError."""
    def f():
        pass
    f.attr = 1
    del f.attr
    if hasattr(f, 'attr'):
        return 'still there'
    try:
        del f.attr
    except AttributeError:
        return 'ok'
    return 'no raise'


def builtin_module_attribute_is_readable():
    """max.__module__ must not raise a RAW Smalltalk error.

    module>>__name__ did an unguarded dict read, and ``builtins`` has no
    __name__ slot -- so probing max.__module__ raised a Smalltalk
    LookupError, which no Python ``except AttributeError`` can catch.
    update_wrapper reads __module__ off the wrapped object inside exactly
    such a try/except.
    """
    return max.__module__ == 'builtins'


# --- functools.update_wrapper / wraps ---------------------------------------

def update_wrapper_copies_metadata():
    def f():
        """f's doc"""
        pass
    f.attr = 'also a test'

    def wrapper():
        pass

    functools.update_wrapper(wrapper, f)
    return (wrapper.__name__ == 'f'
            and wrapper.__qualname__ == f.__qualname__
            and wrapper.__doc__ == "f's doc"
            and wrapper.attr == 'also a test'
            and wrapper.__wrapped__ is f)


def wraps_decorator_copies_metadata():
    def f():
        """f's doc"""
        pass

    @functools.wraps(f)
    def wrapper():
        pass

    return (wrapper.__name__ == 'f'
            and wrapper.__doc__ == "f's doc"
            and wrapper.__wrapped__ is f)


def copies_are_identical_not_merely_equal():
    """update_wrapper ASSIGNS the values; it does not rebuild them."""
    def f(x: int):
        pass

    def wrapper():
        pass

    functools.update_wrapper(wrapper, f)
    return all(getattr(wrapper, n) is getattr(f, n)
               for n in functools.WRAPPER_ASSIGNMENTS)


def empty_assigned_and_updated_copy_nothing():
    """``wraps(f, (), ())`` copies no metadata -- but STILL sets __wrapped__.

    An empty tuple is a meaningful argument, not an absent one, so the
    argument resolution cannot treat emptiness as "use the default".
    """
    def f():
        """f's doc"""
        pass
    f.attr = 'x'

    def wrapper():
        pass

    functools.update_wrapper(wrapper, f, (), ())
    return (wrapper.__name__ == 'wrapper'
            and wrapper.__doc__ is None
            and not hasattr(wrapper, 'attr')
            and wrapper.__wrapped__ is f)


def selective_assign_and_update():
    """A narrowed ``assigned`` / ``updated`` pair is honoured exactly."""
    def f():
        pass
    f.attr = 'a different test'
    f.dict_attr = dict(a=1, b=2, c=3)

    def wrapper():
        pass
    wrapper.dict_attr = {}

    functools.update_wrapper(wrapper, f, ('attr',), ('dict_attr',))
    return (wrapper.attr == 'a different test'
            and wrapper.dict_attr == f.dict_attr
            and wrapper.__name__ == 'wrapper'
            and wrapper.__doc__ is None)


def wrapped_is_set_last():
    """CPython issue 17482: the wrapped function's own stale __wrapped__
    must not survive the __dict__ merge."""
    def f():
        pass
    f.__wrapped__ = 'a bald faced lie'

    def wrapper():
        pass

    functools.update_wrapper(wrapper, f)
    return wrapper.__wrapped__ is f


def missing_wrapped_attribute_is_skipped():
    """A name in ``assigned`` that the WRAPPED object lacks is skipped, not
    an error -- that is what lets @wraps decorate a builtin."""
    def f():
        pass

    def wrapper():
        pass
    wrapper.dict_attr = {}

    functools.update_wrapper(wrapper, f, ('attr',), ('dict_attr',))
    return 'attr' not in wrapper.__dict__ and wrapper.dict_attr == {}


def missing_wrapper_attribute_raises():
    """``updated`` is NOT symmetric with ``assigned``: a name missing on the
    WRAPPER raises, and so does one whose value has no .update()."""
    def f():
        pass

    def wrapper():
        pass

    results = []
    try:
        functools.update_wrapper(wrapper, f, ('attr',), ('dict_attr',))
        results.append('no raise')
    except AttributeError:
        results.append('ok')

    wrapper.dict_attr = 1
    try:
        functools.update_wrapper(wrapper, f, ('attr',), ('dict_attr',))
        results.append('no raise')
    except AttributeError:
        results.append('ok')
    return results == ['ok', 'ok']


def wrapper_assignments_matches_cpython_shape():
    """The constant is read directly by third-party code (jinja2.compiler
    splices it into a decorator's signature), so pin its content.

    CPython 3.14's list exactly, __annotate__ included: copying the PEP 649
    annotate FUNCTION is what hands a wrapper the wrapped function's
    deferred annotations, rather than forcing them at wrap time.
    """
    return (functools.WRAPPER_ASSIGNMENTS
            == ('__module__', '__name__', '__qualname__', '__doc__',
                '__annotate__', '__type_params__')
            and functools.WRAPPER_UPDATES == ('__dict__',))


def wraps_on_a_builtin_does_not_raise():
    """update_wrapper over a builtin exercises the AttributeError-skip path
    for every name the builtin lacks (__dict__, __type_params__) AND the
    __module__ read that used to raise a raw Smalltalk error.

    ``is``, as CPython has it.  This used to have to be written with ``==``,
    because a reference to a builtin minted a fresh BoundMethod handle per
    attribute load and ``max is max`` was False; BoundMethod now interns
    module- and class-receiver handles, so the identity assertion CPython
    licenses is the one to make.
    """
    def wrapper():
        pass

    functools.update_wrapper(wrapper, max)
    return wrapper.__name__ == 'max' and wrapper.__wrapped__ is max


def builtin_references_are_identity_stable():
    """``max is max``, and a builtin reached two ways is one object.

    CPython's builtins are single objects living in the builtins module and
    callers compare them with ``is'' -- functools' test_subclass_optimization
    asserts ``partial(partial(min, 2), 1).func is min''.

    The instance case is the counterpart and must stay FALSE: CPython creates a
    fresh bound method per attribute read, so ``obj.meth is obj.meth`` is False
    there too, and interning those would be both the wrong answer and unbounded
    (the key would retain every receiver ever asked for a method).
    """
    import builtins

    class C:
        def meth(self):
            pass

    c = C()
    return [max is max,
            max is builtins.max,
            C.meth is C.meth,
            c.meth is c.meth]


def lru_cache_wrapper_gets_metadata():
    """@lru_cache runs its wrapper through update_wrapper, as CPython does.

    Every name in WRAPPER_ASSIGNMENTS must agree between the cached
    function and the original -- that is precisely what
    test_lru_cache_decoration checks, and before this the LruCacheWrapper
    raised AttributeError for __module__.  Caching itself must still work.
    """
    def orig(x):
        """squares"""
        return x * x

    square = functools.lru_cache(maxsize=8)(orig)
    if square(3) != 9 or square(3) != 9:
        return 'caching broken'
    if square.cache_info().hits != 1:
        return 'not caching'
    mismatched = [n for n in functools.WRAPPER_ASSIGNMENTS
                  if getattr(square, n) != getattr(orig, n)]
    return mismatched or 'ok'


def cache_decorator_gets_metadata():
    """@cache takes the same path as @lru_cache(maxsize=None)."""
    def orig():
        """documented"""
        return 1

    cached = functools.cache(orig)
    return cached() == 1 and cached.__name__ == 'orig' \
        and cached.__doc__ == 'documented'
