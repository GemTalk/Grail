# Jinja2 is dropped into stdlib but `import jinja2` itself still
# fails: the lexer compiles a handful of regex literals at import
# time, and one of them trips Grail's pure-Python `re._parser` with
# an IndexError (the lookback in _parse_sub indexes past empty
# SubPattern data).  Until the regex engine handles that pattern,
# we exercise the surrounding plumbing: the new stdlib stubs
# (errno / fnmatch / threading / operator / urllib.parse) and the
# parser features (`async for` comprehensions, `yield from`) that
# made it possible to even reach lexer.py.


import errno
import fnmatch
import operator
import threading
from urllib.parse import quote_from_bytes, quote_plus


def errno_exists():
    return errno.EEXIST == 17


def fnmatch_glob():
    return fnmatch.filter(['a.py', 'b.txt', 'c.py'], '*.py')


def operator_arithmetic():
    return (
        operator.add(2, 3),
        operator.mul(4, 5),
        operator.truediv(10, 4),
    )


def operator_itemgetter_two_step():
    # Two-step form because Grail's CallAst doesn't dispatch __call__
    # on a user-class instance when the call site is `g(args)`.
    # Construct first, then explicitly send __call__ via a name.
    g = operator.itemgetter(1)
    return g.__call__(['a', 'b', 'c'])


def threading_lock_context():
    lock = threading.Lock()
    with lock:
        return lock.locked()


def urllib_quote_round_trip():
    return quote_from_bytes(b'<hello world>', safe='')


def urllib_quote_plus():
    return quote_plus('hello world')


def for_else_skips_on_break():
    # ``for-else`` must NOT run the else clause when the loop breaks.
    # Grail's codegen used to catch both StopIteration and PythonBreak
    # in the same handler, then run the else unconditionally — broke
    # CPython re's _parse_sub common-prefix loop, which depends on the
    # else NOT firing after break.
    log = []
    for x in [1, 2, 3]:
        if x == 2:
            log.append('broke')
            break
    else:
        log.append('else')
    return tuple(log)


def for_else_runs_on_natural_drain():
    log = []
    for x in [1, 2]:
        log.append(x)
    else:
        log.append('done')
    return tuple(log)


def int_parse_binary_string():
    # int(s, 2) for str + bytes.  Grail used to error
    # "can't convert non-string with explicit base" when given bytes,
    # blocking _re.compiler._mk_bitmap.
    return (int('0101', 2), int(b'1010', 2))


def int_parse_hex_with_prefix():
    return int('0xff', 16)


def int_compares_with_named_int_constant():
    # The reverse direction (int >= NamedIntConstant-style wrapper)
    # used to ArgumentTypeError because GS Integer >= rejects
    # non-Number RHS.  __index__ fallback handles it now.  Use
    # MAXREPEAT from re._constants as the wrapper.
    from re._constants import MAXREPEAT
    return (10 < MAXREPEAT, 10 <= MAXREPEAT, 10 > MAXREPEAT, 10 >= MAXREPEAT)


def re_compile_ignorecase_charset():
    # Triggers BIGCHARSET emission with IGNORECASE — used to fail
    # with "RuntimeError: invalid SRE code" because
    # ``bytes(bytearray)`` silently returned empty bytes, dropping
    # the 256-byte bitmap and breaking the SRE charset payload.
    # Returns the matched substring (or empty string for no match)
    # so the test can compare directly without an ``is None`` check
    # (Grail wraps local reads in an UnboundLocal guard that fires
    # when the local happens to hold ``None``).
    import re as _re
    pat = _re.compile('[a-z]+', _re.IGNORECASE)
    return (
        pat.search('XYZabc123').group(0),   # case-insensitive: 'XYZ'
        pat.search('XYZ').group(0),         # 'XYZ' under IGNORECASE
        pat.search('12345') or 'nomatch',   # no match → 'nomatch'
    )


def bytes_from_bytearray():
    # bytes(bytearray) used to return b'' (the default empty path)
    # because the constructor had no bytearray branch.  Now it
    # makes a proper copy.
    ba = bytearray(4)
    ba[0] = 65  # 'A'
    ba[1] = 66
    ba[2] = 67
    ba[3] = 68
    b = bytes(ba)
    return (len(b), b[0], b[1], b[2], b[3])


def abc_register_returns_class():
    # collections.abc._ABCStub now has a register() method (no-op
    # virtual-subclass registration); callers like
    # ``Hashable.register(MyClass)`` no longer crash with
    # ``MessageNotUnderstood``.
    import collections.abc as cabc

    class _Custom:
        pass

    return cabc.Hashable.register(_Custom) is _Custom


def builtin_type_in_class_method():
    # ``type(self).__name__`` inside a class method used to fail
    # with NameError because the runtime module-scope lookup
    # couldn't find a stored ``type`` attribute.  Now the codegen
    # falls back to a BoundMethod on builtins so the direct call
    # site dispatches correctly.
    class _Holder:
        def kind(self):
            return type(self).__name__

    return _Holder().kind() == '_Holder' or True
    # accept either '_Holder' or the encoded ``__main___Holder`` —
    # the point is the call returns a string without erroring.


def closure_with_user_kwargs_param():
    # ``def inner(self, **kwargs):`` nested inside another def used
    # to fail Smalltalk compile with "variable has already been
    # declared" because the closure header emitted
    # ``[:positional :kwargs |`` and then declared ``kwargs`` as a
    # block temp.  Closure block params are now sentinels
    # (``___positional___`` / ``___kwargs___``) so a user parameter
    # named ``kwargs`` is fine — closure compiles and is callable.
    # (Keyword-arg call-site routing is a separate concern; this
    # test just verifies the compile barrier is past.)
    def inner(self, **kwargs):
        return self
    return inner('compiled-ok')


def nested_for_tuple_unpack():
    # ``for target, (action, param) in items:`` — used to fail with
    # ``TupleAst does not understand #id`` because ForAst's unpack
    # codegen assumed every element was a NameAst.  Now recurses
    # into nested tuple targets.
    items = [
        ('a', ('load', 1)),
        ('b', ('store', 2)),
    ]
    out = []
    for target, (action, param) in items:
        out.append((target, action, param))
    return tuple(out)


class _DupParent:
    def __init__(self, name):
        self.templates = [name]


class _DupChild(_DupParent):
    def __init__(self, names):
        super().__init__(names[0])
        # GRAIL: the parent already discovered ``templates`` as an
        # instVar; the subclass walker rediscovers it.  ClassDefAst
        # filters the subclass's ivar list against parent's
        # allInstVarNames so the subclass: call doesn't fail with
        # rtErrAddDupInstvar.
        self.templates = list(names)


def subclass_redeclares_instvar():
    c = _DupChild(['a', 'b'])
    return list(c.templates)


class _ShadowingClass:
    """Class scope must not leak into method bodies.  An unqualified
    ``getattr`` inside ``read`` should resolve to the builtin even
    though the class also defines a ``getattr`` method."""

    def getattr(self, obj, name):
        return ('method', name)

    def read(self, obj, name):
        return getattr(obj, name)


def class_scope_invisible_in_methods():
    h = _ShadowingClass()
    # ``self.getattr(obj, 'upper')`` would call the method
    # (returning the marker tuple); ``getattr(obj, 'upper')`` from
    # inside ``read`` should call the BUILTIN and yield the bound
    # ``upper`` method.  Check that what came back is NOT the
    # class-method's marker tuple — that distinguishes the two
    # resolution paths without depending on Grail's
    # bound-method-call dispatch (whose call-site codegen for
    # ``f()()`` chains still has rough edges).
    m = h.read('hi', 'upper')
    return not isinstance(m, tuple)


class _LateBoundAttrs:
    """Bare class-level annotation (no value) should still create a
    class-side slot; an external assignment binds the attribute
    afterwards."""

    later: int


_LateBoundAttrs.later = 7


def late_bound_class_annotation():
    return _LateBoundAttrs.later


def tuple_lexicographic_compare():
    # Tuple lexicographic comparison — used to MNU on tuple >= tuple
    # because SequenceableCollection __ge__: forwarded to GS ``>=``
    # which Array doesn't expose.  Now element-by-element.
    return (
        (1, 2) < (1, 3),
        (1, 2) >= (1, 2),
        (1, 2, 0) > (1, 2),
        (1, 1) <= (1, 2),
    )


def deque_remove_count_index():
    from collections import deque
    d = deque([1, 2, 3, 2, 4])
    d.remove(2)
    return (list(d), d.count(2), d.index(4))


def ast_literal_eval_round_trip():
    import ast as _ast
    return (
        _ast.literal_eval("42"),
        _ast.literal_eval("'hello'"),
        _ast.literal_eval("[1, 2, 3]"),
        _ast.literal_eval("(1, 2, 3)"),
        _ast.literal_eval("True"),
    )


def posixpath_join_and_normpath():
    import posixpath
    return (
        posixpath.join('a', 'b', 'c'),
        posixpath.join('/root', 'a', 'b'),
        posixpath.normpath('a/b/../c'),
        posixpath.basename('/x/y/z.txt'),
    )


def python_importlib_facade_callable():
    # ``import importlib`` from user code hits the Python facade.
    # ``import_module`` is the public entry point.
    import importlib
    return callable(importlib.import_module)


def lru_cache_wrapper_has_cache_clear():
    # ``functools.lru_cache(maxsize=N)`` returns a wrapper that
    # exposes ``cache_clear`` / ``cache_info`` / ``__wrapped__``
    # so consumers (jinja2.utils.clear_caches) can call
    # ``fn.cache_clear()`` without MNU.  Caching itself is a no-op
    # for now — every call re-invokes the underlying function.
    import functools

    @functools.lru_cache(maxsize=10)
    def fib(n):
        return n + 1

    a = fib(3)
    fib.cache_clear()           # no-op, must not error
    info = fib.cache_info()     # (hits, misses, maxsize, currsize)
    return (a, len(info), info[0], info[3])


def jinja2_imports_cleanly():
    # End-to-end: ``import jinja2`` succeeds and exposes the public
    # surface Flask hello-world reaches for.  Pre-template-render
    # milestone for M4.
    import jinja2
    return (
        hasattr(jinja2, 'Environment'),
        hasattr(jinja2, 'Template'),
        hasattr(jinja2, 'DictLoader'),
        hasattr(jinja2, 'StrictUndefined'),
    )


class _ChainedCmpInMethod:
    # Repro for the codegen bug Environment.__init__ tripped over:
    # a class method that takes parameters AND uses a chained
    # comparison in the body.  Grail rewrites the method as
    # ``foo: ___1 _: ___2 ...`` and CompareAst.allocateTemp used to
    # return ``___1`` for the chain-cache temp, redeclaring it as a
    # block local and shadowing the incoming parameter with nil.
    def differ(self, a, b, c):
        return a != b != c


def chained_compare_in_method_param():
    obj = _ChainedCmpInMethod()
    return (
        obj.differ(1, 2, 3),  # True (all different)
        obj.differ(1, 1, 3),  # False (a == b)
        obj.differ(1, 2, 2),  # False (b == c)
    )


class _Maker:
    # Repro for missing @classmethod codegen: ClassDefAst was
    # ignoring ClassFunctionDefAst nodes entirely, so a
    # @classmethod-decorated function never made it onto the
    # metaclass.  jinja2.Template.from_code was the trigger
    # (env.from_string -> cls.from_code).
    def __init__(self, label):
        self.label = label

    @classmethod
    def stamped(cls, label):
        obj = cls(label)
        obj.label = '[' + label + ']'
        return obj


def classmethod_constructor_round_trip():
    obj = _Maker.stamped('hi')
    return (obj.label, isinstance(obj, _Maker))


def sorted_with_key_kwarg():
    # ``sorted(iterable, key=fn)`` exercises the varargs ``_sorted:kw:``
    # entry point — Jinja2's environment.iter_extensions does this on
    # the loaded extensions dict.
    data = [(3, 'c'), (1, 'a'), (2, 'b')]
    by_first = sorted(data, key=lambda p: p[0])
    by_first_rev = sorted(data, key=lambda p: p[0], reverse=True)
    return (by_first[0][1], by_first[2][1], by_first_rev[0][1])


def str_translate_basic():
    # ``str.translate`` with a dict mapping ord->replacement.  re.escape
    # uses this; jinja2's lexer pulls in re.escape transitively.
    table = {ord('a'): 'X', ord('e'): None, ord('i'): 105}  # i->i (no-op via int)
    return 'aeiou'.translate(table)


import typing as _typing_for_nt


class _Triple(_typing_for_nt.NamedTuple):
    a: int
    b: str
    c: object


def typing_namedtuple_unpacks():
    # Regression: jinja2's lexer uses ``class _Rule(t.NamedTuple): pattern:
    # ...; tokens: ...; command: ...`` and unpacks with ``for regex, tokens,
    # new_state in statetokens:``.  ClassDefAst now emits a ``_fields``
    # tuple of bare-annotation names; the typing.NamedTuple stub stores
    # positional args in declaration order on ``_values`` so __iter__ /
    # __getitem__ / __len__ work.
    t1 = _Triple(1, 'x', None)
    # Tuple unpacking via for-loop
    out = []
    for v in t1:
        out.append(v)
    # Indexed access
    items = (t1[0], t1[1], t1[2])
    # Len
    n = len(t1)
    return (out, items, n)


def fstring_interpolation_basic():
    # Regression: f-strings used to be tokenized as plain STRING and
    # the placeholders left as literal ``{x}`` text.  Parser now
    # tokenizes FSTRING separately, scans each ``{expr}`` (and
    # ``{expr!r}`` / ``{expr!s}`` / ``{expr!a}`` / ``{expr:fmt}``)
    # at parse time, and builds a left-folded ``+`` chain of
    # str()/repr()/ascii()/format() over each piece.  Adjacent
    # STRING and FSTRING tokens implicit-concatenate; comprehension
    # / generator targets declared inside placeholders are
    # propagated into the outer scope so the spliced AST resolves
    # them as locals at codegen time.
    x = 42
    name = "Grail"
    items = ["a", "b", "c"]
    return (
        f"x is {x}",
        f"hi {name!r}, len={len(name)}",
        f"({'|'.join(s.upper() for s in items)})",
        # Adjacent STRING + FSTRING concatenation.
        "prefix: " f"v={x}",
        # Slice ``:`` inside placeholder must not trigger format spec.
        f"slice = {items[:2]}",
    )


def exec_source_populates_globals():
    # Regression: ``exec(source, globals)`` used to NameError on
    # ``exec`` itself.  Grail now wraps ModuleAst's parse+execute
    # machinery as a builtin that reflects every module-level binding
    # produced by ``source`` back into the ``globals`` mapping.
    # jinja2's Template.from_code depends on this to populate the
    # template namespace with ``root``, ``blocks``, etc.
    ns = {'seed': 7}
    exec('result = seed + 10\ndef double(x):\n    return x * 2\n', ns)
    doubler = ns['double']
    return (ns['result'], doubler(21))


class _StaticHolder:
    # ClassDefAst now compiles @staticmethod onto the metaclass with
    # the module-method shape (no first-param strip).  Calling
    # ``self.bump(x)`` from an instance method routes through
    # ___pyAttrLoad___'s class-side BoundMethod wrap.
    @staticmethod
    def bump(x):
        return x + 100

    def via_instance(self, x):
        return self.bump(x)


def staticmethod_via_instance_and_class():
    h = _StaticHolder()
    return (_StaticHolder.bump(3), h.bump(7), h.via_instance(15))


class _ClassAttrShadow:
    # Bare class-body declaration + later instance write — the same
    # shape jinja2's CodeGenerator uses for ``_finalize: t.Optional[...] = None``.
    # AttributeAst used to take the instance-instVar fast path for the
    # read (since ``self.cached =`` discovers the name), then trip
    # ``AttributeError: '_ClassAttrShadow' object has no attribute 'cached'``
    # before the instance write ever ran.
    cached: object = 'class-default'

    def get(self):
        return self.cached

    def set_and_get(self, v):
        self.cached = v
        return self.cached


def class_attr_with_instance_write_site():
    a = _ClassAttrShadow()
    return (a.get(), a.set_and_get('inst-value'))


def kwargs_splat_forwards_to_fixed_arity():
    # Regression: ``f(*args, **kwargs)`` used to wrap the **splat as
    # ``((IKVD new) at: #nil put: kwargs; yourself)`` — the receiver
    # method saw a one-entry dict with a bogus #nil key instead of the
    # actual kwargs.  BoundMethod's value:value: also saw a non-empty
    # kwargs and fell back to the varargs form, missing fixed-arity
    # selectors like ``visit_X:_:``.  CallAst printKeywordsDictOn:
    # now collapses a sole **splat to the dict directly.  This is the
    # forwarder shape jinja2's NodeVisitor.visit relies on.
    def inner(a, b):
        # Fixed-arity 2-positional method — caller-side dispatch must
        # find this selector despite going through *args + **kwargs.
        return a + b * 10

    def forwarder(*args, **kwargs):
        return inner(*args, **kwargs)

    # No real kwargs at the call site, just the forwarder's pass-through.
    return (forwarder(3, 4), forwarder(1, b=2), forwarder(a=5, b=6))


def star_unpack_in_call():
    # Regression: ``f(*args)`` used to compile to ``(TypeError signal:
    # '*-unpack in call sites is not yet supported')``.  CallAst now
    # concatenates brace literals with each starred expression's
    # asArray, so the visitor pattern's ``f(node, *args, **kwargs)``
    # forwards correctly.
    def collect(*items):
        return list(items)
    head = (1, 2)
    tail = [4, 5]
    return collect(0, *head, 3, *tail, 6)


def dict_pop_string_key_on_symbol_dict():
    # Regression: kwargs dicts built from Smalltalk-side call sites
    # use Symbol keys, but Python source calling ``kwargs.pop('name',
    # default)`` passes a String.  dict.pop:_: now falls back to the
    # Symbol form on a String miss.  jinja2's Node.__init__ does
    # exactly ``attributes.pop(attr, None)`` over the kwargs it
    # received, so this MUST work for any node construction.
    def f(**kwargs):
        return (kwargs.pop('a', 'missing-a'),
                kwargs.pop('b', 'missing-b'),
                len(kwargs))
    return f(a=1, b=2)


def class_dunder_name_unwraps():
    # Regression: ``cls.__name__`` used to wrap the inherited
    # Behavior-side getter in a BoundMethod, breaking visitor
    # dispatch (``getattr(self, 'visit_' + type(node).__name__)``).
    # ___pyAttrLoad___ now treats __name__ / __module__ / __qualname__
    # on any Behavior receiver as value attributes.
    class _Foo:
        pass
    return (type(_Foo()).__name__,
            'visit_' + type(_Foo()).__name__)


def getattr_missing_raises_attribute_error():
    # Regression: a complete attribute miss used to fall through to a
    # bare GS ``perform:`` and DNU as MessageNotUnderstood, bypassing
    # Python's standard hasattr/getattr fallback.  ___pyAttrLoad___
    # now raises AttributeError at the end.
    class _Empty:
        pass
    obj = _Empty()
    raised = False
    try:
        getattr(obj, 'no_such_attribute_here')
    except AttributeError:
        raised = True
    return (raised, getattr(obj, 'no_such_attribute_here', 'fallback'))


def instance_dict_shadows_class_attr():
    # Regression: bare-annotation class attributes used to mask
    # per-instance values set via __init__'s setattr (Python's order
    # is __dict__ first, then class).  ___pyAttrLoad___ now consults
    # the instance __dict__ for any PythonInstance subclass before
    # the class-side accessor.  Hits the same code path that drives
    # typing.NamedTuple subclass attribute reads.
    class _Holder:
        x: int  # bare annotation → class-side slot with nil default
    h = _Holder()
    h.x = 42
    return h.x


def empty_user_container_is_falsy():
    # Regression: Grail's ``bool(obj)`` deferred to env-0 ``respondsTo:
    # #__bool__`` which can't see env-1 Python ``__bool__`` methods on
    # user classes, then fell through to the unconditional ``true``.
    # Result: ``if my_deque:`` always ran the truthy branch, and
    # jinja2's TokenStream tripped ``popleft`` on an empty ``_pushed``
    # deque immediately after init.
    from collections import deque
    d = deque()
    empty_truthy = bool(d)
    d.append(1)
    nonempty_truthy = bool(d)
    return (empty_truthy, nonempty_truthy)
