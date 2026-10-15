"""Python-level walls found running FastAPI under Grail
(docs/Support_FastAPI.md, §7).  Each is a general Grail bug or gap, not a
FastAPI quirk.

Phase 1 -- the stdlib floor anyio / starlette import at module scope:

1. ``signal.Signals`` / ``signal.Handlers`` did not exist (anyio:
   ``from signal import Signals``).  signal.py is CPython's now, over a
   ``_signal`` stand-in.
2. ``shlex.shlex`` -- the lexer class -- did not exist (starlette.datastructures:
   ``from shlex import shlex``).  shlex.py is CPython's now.
3. ``concurrent.interpreters`` did not exist (anyio.to_interpreter imports it
   unguarded on 3.14).
4. ``runpy`` did not exist (anyio.to_process).
5. A top-level ``def`` after ``from X import *`` did not rebind a name the star
   import had bound -- CPython's signal.py is exactly that shape.  (The
   checks for it are in module_def_rebinding.py; ``signal_signal_*`` here are
   the consequence.)

Phase 2 -- general runtime bugs:

6. A protocol dunder ASSIGNED in a class body (``__eq__ = object.__eq__``,
   starlette's HTTPConnection) compiled a class-side accessor pair whose
   setter selector is the protocol's own, so ``C == x`` stored x into
   C.__eq__ and answered C.  A lambda assigned to ``__len__`` etc. was never
   reached by len().  (Still open: the pair's unary GETTER has the same
   collision, so repr() of a class whose body assigns ``__repr__`` answers
   the function.)  And object's own method
   stored under its own name (``__repr__ = object.__repr__``) recursed.
7. Functions had no ``__defaults__``, and ``inspect.signature`` reported each
   default as its SOURCE TEXT -- so FastAPI, which finds ``Depends(...)`` /
   ``Query(...)`` by the default's type, passed ``'Depends(get_db)'`` as the
   dependency.  Module functions, methods and closures now carry the values.
8. ``dataclasses`` was a stub that never called ``__post_init__`` (FastAPI's
   ModelField builds its TypeAdapter there) and enforced neither ``frozen``
   nor ``slots``.  It is CPython's module now.  That needed ``exec``'d defs
   to read a parameter named ``self``, ``sys._clear_type_descriptors``, and a
   ``__code__`` on a class's ``__annotate_func__``.
9. A class made by ``type(name, bases, ns)`` treated ``T(1)`` as
   ``__new__(1)`` -- an uncatchable error -- and skipped ``__init__`` on
   ``T()``.  dataclasses makes every ``slots=True`` class this way.

Phase 3:

10. ``json.dumps`` walked a dict in HASH order -- FastAPI's 422 body came out
    ``msg, input, type, loc`` for ``type, loc, msg, input``.  (The shim walls of
    Phase 3 are in CPythonShimTestCase: they need a C extension's objects.)

Phase 4 -- plain ``def`` endpoints and TestClient, on cooperative green threads:

11. ``del self`` did not compile, and asyncio's done-callbacks were bare
    callables where anyio walks (callback, context) pairs.
12. A classmethod override of four or more arguments lost to a base's
    DECORATED classmethod (anyio.run answered None).
13. A plain classmethod / staticmethod could not be called with keywords.
14. threading.Condition / Semaphore were non-blocking stand-ins.
15. concurrent.futures was a synchronous stub; it is CPython's.
16. queue polled under time.sleep; it is CPython's.
17. call_soon_threadsafe could not wake a waiting loop (it busy-spun), and
    run_in_executor / to_thread / wrap_future / run_coroutine_threadsafe were
    missing.
18. contextvars' current context was one per SESSION, shared by every green
    thread, and get_ident() inside a generator was the generator's own.

Phase 5 -- serving over HTTP, and FastAPI's own tests:

19. runpy.run_path did not run: pkgutil.get_importer / read_code and
    io.open_code were missing, and a module __dict__ refused update(**kw).
20. type(sys) was the per-module class ``sys`` rather than ``module``, so
    ``type(sys)(name)`` -- runpy's blank namespace -- copied all of sys; and
    vars() of a blank module listed module's own methods.
21. What FastAPI inspects: a callable instance's signature was ``()``; a
    nested def had no __defaults__ under IR (a lambda under either arm); a
    decorator's exception was swallowed, so a rejected route silently did not
    exist; and a decorator named like its own def found the def.
22. ``from pkg import Json`` loaded pkg/json.py on a case-insensitive disk;
    tempfile.SpooledTemporaryFile was a stub (every upload).

Every expectation here was measured against CPython 3.14.

Phase 6 -- the rest of FastAPI's core tests:

23. ``(X | Y).__dict__`` answered a bound method where CPython has none, so
    pydantic's TypeAdapter took a function for the validator of every union.
24. ``inspect.signature`` lost a zero-parameter def's return annotation and
    ignored ``eval_str``: FastAPI built no response model from ``-> User``.
25. Rebinding a method name on ONE class (asyncio's ``Future.__iter__ =
    __await__``) re-dated every captured method of that name on every other
    class, so annotated_types' ``Interval.__iter__`` ran its base's
    ``def __iter__(self): ...`` and answered None -- and ``yield from`` the
    None it answered was an uncatchable MessageNotUnderstood, not TypeError.
26. ``inspect.getsourcelines`` did not exist and ``getsource`` answered '':
    FastAPI's validation errors lost the endpoint they name.
27. A module ``__getattr__`` STORED into the namespace (anyio's lazy importer
    writes it through ``sys._getframe(1).f_globals``) was never consulted --
    hidden while getsource answered '', which kept anyio on its eager path.
28. ``inspect.signature`` of a classmethod bound through ``__get__`` tried to
    iterate a method: pydantic called a validator taking ``info`` without it.
29. A body of just ``...`` was taken for a docstring: ``class E(str, Enum):
    ...`` had Ellipsis for ``__doc__`` (pydantic's cleandoc failed on it).
30. Docstrings: a module-level def had none (``__doc__`` None), so FastAPI's
    OpenAPI descriptions were missing; none was cleaned the way CPython 3.13+'s
    compiler cleans them; and ``inspect.cleandoc`` blanked a form-feed line,
    so a description was not cut at its ``\f``.
31. A ``@dataclass(slots=True)`` instance had a ``__dict__``: the replaced
    class's ``__dict__`` descriptor rode into the slotted copy's namespace,
    because ``sys._clear_type_descriptors`` did nothing.
32. A lambda that captures nothing was ONE object for every evaluation (a
    clean block is a literal), so an lru_cache keyed by callables saw one
    key, and an attribute set on one lambda was set on all.
33. ``inspect.signature`` of a ``functools.partial`` was ``()`` -- FastAPI
    saw no parameters on ``partial(main, "foo")`` -- and OrderedDict's pop /
    setdefault / update left its key order stale.
34. Patching a Grail-implemented module's function -- ``json.dumps``,
    ``math.sqrt`` -- was invisible to callers, so ``mock.patch(
    'starlette.responses.json.dumps', wraps=json.dumps)`` saw no call.
35. A class's own ``__class__`` property was ignored by isinstance (asyncpg's
    UUID claims uuid.UUID) and obeyed by type(), the reverse of CPython.
36. ``subprocess.run(..., cwd=Path(...))`` handed the shell the path's
    Smalltalk print string, and an argument past Latin-1 (``'🌐'``) could not
    be spawned at all.
"""

import sys

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:120])


# --- 1. signal -------------------------------------------------------------

import signal                                                   # noqa: E402
from signal import Signals, Handlers                            # noqa: E402

check('signal_sigint_is_member', repr(signal.SIGINT), '<Signals.SIGINT: 2>')
check('signal_sigint_is_int', (isinstance(signal.SIGINT, int), signal.SIGINT == 2),
      (True, True))
check('signal_sig_dfl_is_handler', repr(signal.SIG_DFL), '<Handlers.SIG_DFL: 0>')
check('signal_signals_lookup', Signals(15) is signal.SIGTERM, True)
check('signal_signals_name', Signals.SIGTERM.name, 'SIGTERM')
check('signal_handlers_members', sorted(Handlers.__members__), ['SIG_DFL', 'SIG_IGN'])
check('signal_sigint_default_handler',
      signal.getsignal(signal.SIGINT) is signal.default_int_handler, True)
_old = signal.signal(signal.SIGTERM, signal.SIG_IGN)
check('signal_signal_returns_enum', repr(_old), '<Handlers.SIG_DFL: 0>')
check('signal_getsignal_returns_enum', repr(signal.getsignal(signal.SIGTERM)),
      '<Handlers.SIG_IGN: 1>')
signal.signal(signal.SIGTERM, _old)
# Not "every entry is a member": on Linux valid_signals() also holds the
# real-time signal numbers, which CPython leaves as plain ints.
_vs = signal.valid_signals()
check('signal_valid_signals_are_members',
      (isinstance(min(_vs), Signals), signal.SIGINT in _vs, signal.SIGTERM in _vs,
       all(isinstance(s, int) for s in _vs)),
      (True, True, True, True))
check('signal_signal_is_the_wrapper', signal.signal.__module__, 'signal')

# --- 2. shlex --------------------------------------------------------------

import shlex                                                    # noqa: E402

check('shlex_split', shlex.split("ls -la '/tmp x' a\\ b # c", comments=True),
      ['ls', '-la', '/tmp x', 'a b'])
check('shlex_join_quote', (shlex.join(['a b', 'c']), shlex.quote("it's")),
      ("'a b' c", "'it'\"'\"'s'"))


def _comma_separated(value):
    # starlette.datastructures.CommaSeparatedStrings, verbatim in shape.
    splitter = shlex.shlex(value, posix=True)
    splitter.whitespace = ","
    splitter.whitespace_split = True
    return [item.strip() for item in splitter]


check('shlex_lexer_comma_separated', _comma_separated("a, b , 'c,d'"),
      ['a', 'b', 'c,d'])
_lex = shlex.shlex('a = "b c"')
check('shlex_lexer_tokens', list(_lex), ['a', '=', '"b c"'])

# --- 3. concurrent.interpreters --------------------------------------------

import concurrent.interpreters as _ci                           # noqa: E402
from concurrent.interpreters import ExecutionFailed, create     # noqa: E402,F401

check('interpreters_all', sorted(_ci.__all__),
      ['ExecutionFailed', 'Interpreter', 'InterpreterError',
       'InterpreterNotFoundError', 'NotShareableError', 'Queue', 'QueueEmpty',
       'QueueFull', 'create', 'create_queue', 'get_current', 'get_main',
       'is_shareable', 'list_all'])
check('interpreters_error_bases',
      [[b.__name__ for b in getattr(_ci, n).__mro__[1:]]
       for n in ('InterpreterNotFoundError', 'NotShareableError',
                 'ExecutionFailed', 'QueueEmpty')],
      [['InterpreterError', 'Exception', 'BaseException', 'object'],
       ['TypeError', 'Exception', 'BaseException', 'object'],
       ['InterpreterError', 'Exception', 'BaseException', 'object'],
       ['QueueError', 'RuntimeError', 'Empty', 'Exception', 'BaseException',
        'object']])
check('interpreters_is_shareable',
      (_ci.is_shareable(1), _ci.is_shareable([]), _ci.is_shareable((1, 'a'))),
      (True, False, True))

# --- 4. runpy --------------------------------------------------------------

import runpy                                                    # noqa: E402

check('runpy_all', runpy.__all__, ['run_module', 'run_path'])


# --- 6. protocol dunders assigned in a class body ------------------------------

from collections.abc import Mapping                             # noqa: E402


class _EqAssigned:
    __eq__ = object.__eq__
    __hash__ = object.__hash__


class _EqSub(_EqAssigned):
    pass


check('class_eq_assigned', (_EqAssigned == int, _EqAssigned != int,
                            _EqAssigned == _EqAssigned, _EqSub == _EqAssigned),
      (False, True, True, False))
check('class_eq_assigned_unchanged', _EqAssigned.__eq__ is object.__eq__, True)
check('class_eq_assigned_in_dict', ('__eq__' in _EqAssigned.__dict__,
                                    '__hash__' in vars(_EqAssigned)), (True, True))
_ea = _EqAssigned()
check('instance_eq_assigned', (_ea == _ea, _ea == _EqAssigned()), (True, False))


class _MappingBase(Mapping):
    def __getitem__(self, k):
        raise KeyError(k)

    def __iter__(self):
        return iter(())

    def __len__(self):
        return 0


class _HttpConnectionShape(_MappingBase):
    # starlette.requests.HTTPConnection: "Don't use the `abc.Mapping.__eq__`
    # implementation."
    __eq__ = object.__eq__
    __hash__ = object.__hash__


_hc = _HttpConnectionShape()
check('object_eq_over_inherited_def', (_hc == _hc, _hc == _HttpConnectionShape()),
      (True, False))
check('isinstance_none_mapping_after', (isinstance(None, Mapping),
                                        issubclass(type(None), _HttpConnectionShape)),
      (False, False))


check('class_hash_assigned', isinstance(hash(_HttpConnectionShape), int)
      and {_HttpConnectionShape: 1}[_HttpConnectionShape] == 1, True)




class _LtAssigned:
    __lt__ = object.__lt__


try:
    _LtAssigned() < _LtAssigned()
    check('object_lt_assigned_raises', 'no error', 'TypeError')
except TypeError:
    check('object_lt_assigned_raises', 'TypeError', 'TypeError')


class _Lambdas:
    __iter__ = lambda self: iter([1, 2])                        # noqa: E731
    __len__ = lambda self: 2                                    # noqa: E731
    __contains__ = lambda self, x: x == 9                       # noqa: E731
    __getitem__ = lambda self, k: k * 2                         # noqa: E731
    __call__ = lambda self, *a: a                               # noqa: E731
    __bool__ = lambda self: False                               # noqa: E731
    __add__ = lambda self, o: ('add', o)                        # noqa: E731
    __radd__ = lambda self, o: ('radd', o)                      # noqa: E731
    __neg__ = lambda self: 'neg'                                # noqa: E731
    __repr__ = lambda self: 'L()'                               # noqa: E731
    __format__ = lambda self, spec: 'fmt:' + spec               # noqa: E731


_l = _Lambdas()
check('lambda_dunders_instance',
      (list(_l), len(_l), 9 in _l, _l[21], _l(1), bool(_l), _l + 1, 1 + _l, -_l,
       repr(_l), format(_l, 'x')),
      ([1, 2], 2, True, 42, (1,), False, ('add', 1), ('radd', 1), 'neg', 'L()',
       'fmt:x'))


def _raises(f, exc):
    try:
        f()
    except exc:
        return True
    return False




class _HashNone:
    __hash__ = None


check('hash_none', (_HashNone.__hash__ is None, _raises(lambda: hash(_HashNone()), TypeError),
                    isinstance(hash(_HashNone), int)),
      (True, True, True))


class _DelDunder:
    __eq__ = lambda self, o: True                               # noqa: E731
    del __eq__


check('class_body_del_dunder', _DelDunder() == _DelDunder(), False)


class _ReadBack:
    # Later class-body statements reading a protocol dunder an earlier one
    # ASSIGNED -- the chained form is flask.sessions.NullSession's.
    __add__ = lambda self, o: ('add', o)                        # noqa: E731
    __radd__ = __add__
    __repr__ = lambda self: 'RB()'                              # noqa: E731
    __str__ = __repr__

    def _fail(self, *args):
        return 'fail'

    __setitem__ = __delitem__ = clear = _fail
    del _fail
    __eq__ = __ne__ = lambda self, o: 'cmp'                     # noqa: E731


_rb = _ReadBack()
check('class_body_readback_dunders',
      (1 + _rb, str(_rb), _rb.clear(), _rb.__delitem__(1), _rb != _rb,
       _ReadBack.__radd__ is _ReadBack.__add__),
      (('add', 1), 'RB()', 'fail', 'fail', 'cmp', True))

_Runtime = type('_Runtime', (), {})
_Runtime.__repr__ = object.__repr__
check('runtime_object_repr', repr(_Runtime()).startswith('<'), True)

# --- 7. default VALUES: __defaults__, __kwdefaults__, inspect.signature ---------

import inspect                                                  # noqa: E402


class _Marker:
    def __repr__(self):
        return 'Marker()'


_MARK = _Marker()


def _module_fn(a, b=200, c=_MARK, *, k=_MARK, j=1 + 1):
    return (b, c, k, j)


check('module_defaults', (_module_fn.__defaults__[0], _module_fn.__defaults__[1] is _MARK),
      (200, True))
check('module_kwdefaults', (_module_fn.__kwdefaults__['k'] is _MARK,
                            _module_fn.__kwdefaults__['j']), (True, 2))
_sig = inspect.signature(_module_fn)
check('module_signature_values',
      [(n, p.default is _MARK, type(p.default).__name__)
       for n, p in _sig.parameters.items()],
      [('a', False, 'type'), ('b', False, 'int'), ('c', True, '_Marker'),
       ('k', True, '_Marker'), ('j', False, 'int')])
check('module_signature_str', str(_sig), '(a, b=200, c=Marker(), *, k=Marker(), j=2)')
check('module_default_is_call_value', _module_fn(1)[1] is _sig.parameters['c'].default,
      True)


def _no_defaults(a, b):
    pass


check('no_defaults', (_no_defaults.__defaults__, _no_defaults.__kwdefaults__),
      (None, None))


def _make_closure(n):
    def inner(x, y=n, *, z=_MARK):
        return y
    return inner


_c1, _c2 = _make_closure(1), _make_closure(2)
check('closure_defaults_per_def', (_c1.__defaults__, _c2.__defaults__), ((1,), (2,)))
check('closure_kwdefaults', _c1.__kwdefaults__['z'] is _MARK, True)
check('closure_signature', str(inspect.signature(_c2)), '(x, y=2, *, z=Marker())')


def _make_pos_closure():
    def inner(a, b=[], c=_MARK):
        b.append(a)
        return b
    return inner


_pc = _make_pos_closure()
check('closure_mutable_default_shared', _pc(1) is _pc.__defaults__[0], True)


class _WithMethods:
    def __init__(self, skip=0, limit=_MARK):
        self.skip = skip

    def m(self, q=_MARK, *, flag=True):
        return q

    @classmethod
    def cm(cls, v=3):
        return v


check('method_defaults_unbound', (_WithMethods.m.__defaults__[0] is _MARK,
                                  _WithMethods.m.__kwdefaults__), (True, {'flag': True}))
check('method_defaults_bound', _WithMethods().m.__defaults__[0] is _MARK, True)
check('init_signature', str(inspect.signature(_WithMethods)), '(skip=0, limit=Marker())')
check('init_signature_value', inspect.signature(_WithMethods).parameters['limit'].default
      is _MARK, True)
check('classmethod_defaults', _WithMethods.cm.__defaults__, (3,))


class _Depends:
    def __init__(self, dependency):
        self.dependency = dependency


def _get_db():
    return 'DB'


def _endpoint(q: int = 3, db=_Depends(_get_db)):
    return q


_ep = inspect.signature(_endpoint)
check('fastapi_shape_depends',
      (isinstance(_ep.parameters['db'].default, _Depends),
       _ep.parameters['db'].default.dependency is _get_db,
       isinstance(_ep.parameters['q'].default, int)),
      (True, True, True))

# --- 8. dataclasses is CPython's: __post_init__, frozen, slots ----------------

import dataclasses                                              # noqa: E402


@dataclasses.dataclass
class _ModelFieldShape:
    # fastapi._compat.v2.ModelField: a dataclass whose __post_init__ builds
    # what every request then uses.
    name: str
    mode: str = 'validation'

    def __post_init__(self):
        self.built = self.name + ':' + self.mode


check('dataclass_post_init', _ModelFieldShape('x').built, 'x:validation')
check('dataclass_repr_eq', (repr(_ModelFieldShape('x')),
                            _ModelFieldShape('x') == _ModelFieldShape('x')),
      ("_ModelFieldShape(name='x', mode='validation')", True))


@dataclasses.dataclass(frozen=True)
class _Frozen:
    a: int


try:
    _Frozen(1).a = 2
    check('dataclass_frozen_refuses', 'stored', 'FrozenInstanceError')
except dataclasses.FrozenInstanceError:
    check('dataclass_frozen_refuses', 'FrozenInstanceError', 'FrozenInstanceError')
check('dataclass_frozen_hash', hash(_Frozen(1)) == hash(_Frozen(1)), True)


@dataclasses.dataclass(slots=True)
class _Slotted:
    a: int
    b: str = 'x'


check('dataclass_slots', (_Slotted(1).b, _Slotted.__slots__, _Slotted(2) == _Slotted(2)),
      ('x', ('a', 'b'), True))


@dataclasses.dataclass(order=True, kw_only=True)
class _Ordered:
    a: int


check('dataclass_order_kw_only', sorted([_Ordered(a=3), _Ordered(a=1)])[0].a, 1)
check('dataclass_signature', str(inspect.signature(_ModelFieldShape)),
      "(name: str, mode: str = 'validation') -> None")


# --- 9. a class made by type() with an __init__ -------------------------------

def _init(self, a, b='x'):
    self.a = a


_T1 = type('_T1', (), {'__init__': _init})
_T2 = type('_T2', (object,), {'__slots__': ('a',), '__init__': _init})
check('type_made_class_init', (_T1(1).a, _T1(a=2).a, _T2(3).a), (1, 2, 3))
check('type_made_class_no_init_refuses_args',
      _raises(lambda: type('_T3', (), {})(1), TypeError), True)

# --- 10. json.dumps keeps a dict's insertion order ----------------------------

import json                                                     # noqa: E402

_ordered = {'type': 'missing', 'loc': ['body', 'price'], 'msg': 'Field required',
            'input': {'name': 'x', 'b': 1, 'a': 2}}
check('json_dumps_insertion_order', json.dumps(_ordered),
      '{"type": "missing", "loc": ["body", "price"], "msg": "Field required", '
      '"input": {"name": "x", "b": 1, "a": 2}}')
check('json_dumps_sort_keys', json.dumps({'b': 1, 'a': 2, 'c': {'z': 0, 'y': 1}}, sort_keys=True),
      '{"a": 2, "b": 1, "c": {"y": 1, "z": 0}}')
check('json_dumps_indent_order', json.dumps({'z': 1, 'a': 2}, indent=1),
      '{\n "z": 1,\n "a": 2\n}')

# --- 11. Phase 4: `del self`, and asyncio's callback shape ---------------------
#
# anyio's TaskHandle._run_coro ends in ``del self`` (``self := nil'' is not
# Smalltalk), and its find_root_task walks ``task._callbacks`` as (callback,
# context) pairs, recognising base_events._run_until_complete_cb by identity.

class _DelSelf:
    def go(self):
        x = self.v
        del self
        try:
            self
        except UnboundLocalError:
            return (x, 'unbound')
        return (x, 'still bound')


_ds = _DelSelf()
_ds.v = 7
check('del_self', _ds.go(), (7, 'unbound'))

import asyncio                                                  # noqa: E402
import asyncio.base_events                                      # noqa: E402


async def _shape():
    loop = asyncio.get_running_loop()
    task = asyncio.current_task()
    cbs = [cb for cb, _ctx in task._callbacks]
    fut = loop.create_future()
    fut.add_done_callback(lambda f: None)
    pair = fut._callbacks[0]
    fut.set_result(1)
    return (asyncio.base_events._run_until_complete_cb in cbs,
            type(pair) is tuple and len(pair) == 2)

_loop = asyncio.new_event_loop()
check('asyncio_callback_pairs', _loop.run_until_complete(_shape()), (True, True))
_loop.close()
check('asyncio_vendored_names',
      all(hasattr(asyncio, n) for n in ('BaseEventLoop', 'Protocol', 'Transport',
                                        'StreamReader', 'create_subprocess_exec',
                                        'to_thread', 'run_coroutine_threadsafe',
                                        'wrap_future')), True)

# --- 12. a classmethod OVERRIDE of a decorated base classmethod ----------------
#
# anyio's AsyncIOBackend.run(cls, func, args, kwargs, options) overrides
# AsyncBackend's ``@classmethod @abstractmethod'' stub.  The decorated stub is a
# class-attribute store, and only overrides of up to THREE arguments outranked
# it, so anyio.run() ran the stub and answered None.

import abc                                                      # noqa: E402


def _ident(f):
    return f


class _AbsBase(metaclass=abc.ABCMeta):
    @classmethod
    @abc.abstractmethod
    def run(cls, func, args, kwargs, options):
        """abstract"""

    @staticmethod
    @_ident
    def five(a, b, c, d, e):
        return 'base'


class _AbsImpl(_AbsBase):
    @classmethod
    def run(cls, func, args, kwargs, options):
        return (cls.__name__, func(*args))

    @staticmethod
    def five(a, b, c, d, e):
        return 'impl'


check('classmethod_override_four_args', _AbsImpl.run(len, ('abc',), {}, {}),
      ('_AbsImpl', 3))
check('staticmethod_override_five_args', (_AbsImpl.five(1, 2, 3, 4, 5),
                                          _AbsImpl().five(1, 2, 3, 4, 5)),
      ('impl', 'impl'))

# --- 13. keyword arguments to a plain @classmethod / @staticmethod -------------
#
# anyio calls ``backend_class.run_sync_from_thread(func, args, token=...)``.
# A simple-positional class-side def had nothing to bind keywords with.

class _KwCm:
    @classmethod
    def f(cls, a, b, token):
        return (cls.__name__, a, b, token)

    @staticmethod
    def g(a, b):
        return (a, b)


class _KwCmSub(_KwCm):
    pass


check('classmethod_keywords', (_KwCm.f(1, 2, token=3), _KwCmSub.f(a=1, b=2, token=3),
                               _KwCm().f(1, b=2, token=3)),
      (('_KwCm', 1, 2, 3), ('_KwCmSub', 1, 2, 3), ('_KwCm', 1, 2, 3)))
check('staticmethod_keywords', (_KwCm.g(1, b=2), _KwCm().g(a=1, b=2)), ((1, 2), (1, 2)))
check('classmethod_keyword_errors',
      (_raises(lambda: _KwCm.f(1, 2, nope=3), TypeError),
       _raises(lambda: _KwCm.f(1, 2, 3, a=4), TypeError),
       _raises(lambda: _KwCm.g(1), TypeError)), (True, True, True))

# --- 14. threading: Condition and Semaphore really wait ------------------------
#
# They were stand-ins that raised "would block forever (Grail threads are
# cooperative)"; ThreadPoolExecutor needs both.

import threading                                                # noqa: E402
import time                                                     # noqa: E402

_cond = threading.Condition()
_seen = []


def _waiter():
    with _cond:
        _seen.append(_cond.wait_for(lambda: len(_seen) > 0, timeout=5))


_t = threading.Thread(target=_waiter)
_t.start()
with _cond:
    _seen.append('set')
    _cond.notify_all()
_t.join()
check('condition_waits', _seen, ['set', True])

_sem = threading.BoundedSemaphore(1)
check('semaphore_acquire', (_sem.acquire(), _sem.acquire(timeout=0.01),
                            _sem.acquire(blocking=False)), (True, False, False))
_sem.release()
check('bounded_semaphore_over_release', _raises(_sem.release, ValueError), True)

_rl = threading.RLock()
_rcond = threading.Condition(_rl)
_rl.acquire()
_rl.acquire()
check('condition_over_rlock_releases_all', (_rcond.wait(0.01), _rl._is_owned()), (False, True))
_rl.release()
_rl.release()

# --- 15. concurrent.futures is CPython's ----------------------------------------

import concurrent.futures as _cf                                # noqa: E402

with _cf.ThreadPoolExecutor(max_workers=2) as _ex:
    _fs = [_ex.submit(pow, 2, i) for i in range(5)]
    _done = sorted(f.result() for f in _cf.as_completed(_fs, timeout=10))
    _mapped = list(_ex.map(abs, [-1, -2]))
    _bad = _ex.submit(lambda: 1 / 0)
    _exc = type(_bad.exception(timeout=10)).__name__
check('thread_pool_executor', (_done, _mapped, _exc),
      ([1, 2, 4, 8, 16], [1, 2], 'ZeroDivisionError'))

_cfut = _cf.Future()
threading.Thread(target=lambda: (time.sleep(0.01), _cfut.set_result('late'))).start()
check('future_result_waits', (_cfut.result(timeout=10),
                              _raises(lambda: _cf.Future().result(timeout=0.01),
                                      TimeoutError)), ('late', True))
check('futures_timeout_is_builtin', _cf.TimeoutError is TimeoutError, True)
# Grail refuses to CONSTRUCT one (a gem makes no child processes), but the name
# must resolve, as the old stub's did, for modules that import it at top level.
check('process_pool_name_resolves', _cf.ProcessPoolExecutor.__name__, 'ProcessPoolExecutor')

# --- 16. queue is CPython's (it polled under time.sleep) ------------------------

import queue                                                    # noqa: E402

_qa, _qb = queue.Queue(), queue.Queue()


def _pong():
    for _ in range(20):
        _qb.put(_qa.get() * 2)


threading.Thread(target=_pong).start()
_got = []
for _i in range(20):
    _qa.put(_i)
    _got.append(_qb.get(timeout=10))
check('queue_ping_pong', _got, [i * 2 for i in range(20)])
_sq = queue.SimpleQueue()
_sq.put(1)
check('queue_simple_and_shutdown', (_sq.get(), _raises(lambda: queue.Queue().get(timeout=0.01),
                                                       queue.Empty)), (1, True))

# --- 17. the loop across threads ------------------------------------------------
#
# call_soon_threadsafe must WAKE a loop that is waiting with nothing due --
# Grail's loop busy-spun there, and a worker thread could never run.

import contextvars                                              # noqa: E402

_cv = contextvars.ContextVar('_cv', default='unset')


def _blocking(x):
    time.sleep(0.01)
    return (x * 2, _cv.get())


async def _threads():
    _cv.set('main')
    loop = asyncio.get_running_loop()
    a = await asyncio.to_thread(_blocking, 21)
    b = await loop.run_in_executor(None, _blocking, 1)
    f = _cf.Future()
    threading.Thread(target=lambda: (time.sleep(0.01), f.set_result('w'))).start()
    c = await asyncio.wrap_future(f)

    async def plus1(x):
        await asyncio.sleep(0)
        return x + 1
    res = []
    th = threading.Thread(target=lambda: res.append(
        asyncio.run_coroutine_threadsafe(plus1(41), loop).result(timeout=10)))
    th.start()
    ev = asyncio.Event()
    threading.Thread(target=lambda: (time.sleep(0.01),
                                     loop.call_soon_threadsafe(ev.set))).start()
    await asyncio.wait_for(ev.wait(), 10)
    while th.is_alive():
        await asyncio.sleep(0.001)
    return (a, b, c, res)


check('asyncio_threads', asyncio.run(_threads()),
      ((42, 'main'), (2, 'unset'), 'w', [42]))

_idle = asyncio.new_event_loop()
threading.Thread(target=lambda: (time.sleep(0.01),
                                 _idle.call_soon_threadsafe(_idle.stop))).start()
_t0 = time.monotonic()
_idle.run_forever()
_idle.close()
check('idle_loop_woken_by_thread', time.monotonic() - _t0 < 5, True)

# --- 18. contextvars and thread identity are per THREAD --------------------------

import _thread                                                  # noqa: E402

_cv.set('main')
_tseen = []


def _tw():
    _tseen.append(_cv.get())
    _cv.set('thread')
    _tseen.append(_cv.get())


_t = threading.Thread(target=_tw)
_t.start()
_t.join()
_t = threading.Thread(target=lambda: _tseen.append(_cv.get()),
                      context=contextvars.copy_context())
_t.start()
_t.join()
check('contextvars_per_thread', (_tseen, _cv.get()),
      (['unset', 'thread', 'main'], 'main'))


def _gen_ident():
    yield _thread.get_ident()


check('get_ident_in_generator', next(_gen_ident()) == _thread.get_ident(), True)
_grl = threading.RLock()


def _gen_lock():
    _grl.acquire()
    yield
    _grl.release()
    yield


_gl = _gen_lock()
next(_gl)
_owned = _grl._is_owned()
next(_gl)
check('rlock_owner_across_generator', (_owned, _grl._is_owned()), (True, False))

import os                                                       # noqa: E402

check('os_process_cpu_count', isinstance(os.process_cpu_count(), int), True)

# --- 19. Phase 5: runpy.run_path ---------------------------------------------------
#
# The test runner runs FastAPI's suite through runpy.run_path, which needed
# pkgutil.get_importer and read_code, io.open_code, a module __dict__ that
# takes update(**kw), and type(sys) to be the plain module type (runpy makes its
# namespace with ``ModuleType = type(sys)``).

import io as _io                                                # noqa: E402
import pkgutil                                                  # noqa: E402
import runpy                                                    # noqa: E402
import tempfile as _tempfile                                    # noqa: E402
import types as _types                                          # noqa: E402

_rp_dir = _tempfile.mkdtemp(prefix='grail_walls_')
_rp_file = os.path.join(_rp_dir, 'rp_target.py')
with open(_rp_file, 'w') as _f:
    _f.write('X = 41 + 1\nNAME = __name__\nSEEN = sorted(k for k in globals() '
             'if k.startswith("__") and k != "__builtins__")\n')
_g = runpy.run_path(_rp_file)
check('run_path_runs_the_file', (_g['X'], _g['NAME']), (42, '<run_path>'))
check('run_path_namespace', _g['SEEN'],
      ['__cached__', '__doc__', '__file__', '__loader__', '__name__',
       '__package__', '__spec__'])
check('run_path_run_name_and_init_globals',
      (runpy.run_path(_rp_file, run_name='__main__')['NAME'],
       runpy.run_path(_rp_file, init_globals={'Y': 7})['Y']), ('__main__', 7))
check('pkgutil_get_importer_of_a_file', pkgutil.get_importer(_rp_file), None)
with _io.open_code(_rp_file) as _f:
    check('io_open_code_reads_bytes', (_f.read(1), pkgutil.read_code(_io.BytesIO(b'x = 1\n'))),
          (b'X', None))

# --- 20. a module's type, and its __dict__ ------------------------------------

check('type_of_a_module_is_module_type',
      (type(sys) is _types.ModuleType, type(os) is _types.ModuleType,
       sys.__class__ is type(sys)), (True, True, True))
_blank = type(sys)('blank')
check('a_blank_module_namespace', sorted(vars(_blank)),
      ['__doc__', '__loader__', '__name__', '__package__', '__spec__'])


class _LazyModule(_types.ModuleType):
    def hello(self):
        return 'hi ' + self.__name__


_lazy = _LazyModule('lazy')
check('module_type_subclass', (type(_lazy) is _LazyModule, _lazy.hello(),
                               'hello' in vars(_lazy)), (True, 'hi lazy', False))
_blank.__dict__.update(a=1)
_blank.__dict__.update({'b': 2}, c=3)
_blank.__dict__.update([('d', 4)])
check('module_dict_update_forms', (_blank.a, _blank.b, _blank.c, _blank.d), (1, 2, 3, 4))


class _Plain:
    pass


_pl = _Plain()
_pl.__dict__.update([('e', 5)], f=6)
check('instance_dict_update_forms', sorted(vars(_pl).items()), [('e', 5), ('f', 6)])
check('dict_update_too_many_args', _raises(lambda: _pl.__dict__.update({}, {}), TypeError), True)

# --- 21. FastAPI's own tests: introspecting what a route is built from ---------
#
# FastAPI decides what a dependency or endpoint takes by inspecting it.  Each of
# these made a whole family of its tests fail.

class _CallableDep:
    async def __call__(self, request: int) -> str:
        return 'called'


check('signature_of_a_callable_instance',
      (str(inspect.signature(_CallableDep())),
       list(inspect.signature(_CallableDep()).parameters)),
      ('(request: int) -> str', ['request']))


class _Marker2:
    def __init__(self, v):
        self.v = v


def _make_nested(n):
    class Item:
        pass

    def endpoint(q: list[Item] = _Marker2(n), r: int = 5):
        return q

    lam = lambda p=n * 10, s=2: (p, s)    # noqa: E731
    return endpoint, lam


_ep, _lam = _make_nested(3)
check('nested_def_defaults', (type(_ep.__defaults__[0]).__name__, _ep.__defaults__[0].v,
                              _ep.__defaults__[1],
                              type(inspect.signature(_ep).parameters['q'].default).__name__),
      ('_Marker2', 3, 5, '_Marker2'))
check('lambda_defaults', (_lam.__defaults__, _lam()), ((30, 2), (30, 2)))
_ep.__defaults__ = (_Marker2(9), 6)
check('nested_def_defaults_written_through', (_ep().v, _ep.__defaults__[1]), (9, 6))
check('signature_renders_a_generic_alias',
      str(inspect.signature(_ep)).startswith('(q: list['), True)
check('generic_alias_dict_is_the_origins', type(list[int].__dict__) is type(list.__dict__), True)

# A decorator that raises at the def raises, as in CPython -- FastAPI rejects
# an invalid route there, and a swallowed error left the route missing.
_deco_src = (
    'def bad(f):\n'
    '    raise ValueError("refused")\n'
    'class C:\n'
    '    @bad\n'
    '    def m(self):\n'
    '        pass\n')
_deco_dir = _tempfile.mkdtemp(prefix='grail_walls_')
with open(os.path.join(_deco_dir, 'grail_walls_deco_mod.py'), 'w') as _f:
    _f.write('def bad(f):\n    raise ValueError("refused")\n@bad\ndef f():\n    pass\n')
sys.path.insert(0, _deco_dir)
try:
    import grail_walls_deco_mod                                 # noqa: F401
    _got = 'no raise'
except ValueError as _e:
    _got = str(_e)
finally:
    sys.path.remove(_deco_dir)
check('a_module_decorator_error_raises', _got, 'refused')
try:
    exec(_deco_src, {})
    _got = 'no raise'
except ValueError as _e:
    _got = str(_e)
check('a_method_decorator_error_raises', _got, 'refused')


def computed(f):
    f.computed = True
    return f


class _SelfNamedDeco:
    # The decorator is evaluated before the def binds its name, so this is the
    # module-level ``computed'', not the method being defined (pydantic's
    # ``@computed_field def computed_field'').
    @computed
    def computed(self):
        return 1


check('a_decorator_named_like_its_def', _SelfNamedDeco.computed.computed, True)

# --- 22. imports are case-exact; uploads spool --------------------------------

_case_dir = _tempfile.mkdtemp(prefix='grail_walls_')
os.mkdir(os.path.join(_case_dir, 'casepkg'))
with open(os.path.join(_case_dir, 'casepkg', '__init__.py'), 'w') as _f:
    _f.write('def __getattr__(name):\n'
             '    if name == "Json":\n'
             '        return "the Json type"\n'
             '    raise AttributeError(name)\n')
with open(os.path.join(_case_dir, 'casepkg', 'json.py'), 'w') as _f:
    _f.write('KIND = "the json module"\n')
sys.path.insert(0, _case_dir)
try:
    from casepkg import Json as _Json                           # noqa: E402
    import casepkg.json as _cj                                  # noqa: E402
finally:
    sys.path.remove(_case_dir)
check('from_package_import_is_case_exact', (_Json, _cj.KIND), ('the Json type', 'the json module'))

_sp = _tempfile.SpooledTemporaryFile(max_size=8)
_sp.write(b'short')
_rolled_before = _sp._rolled
_sp.write(b' and now long')
_sp.seek(0)
check('spooled_temporary_file', (_rolled_before, _sp._rolled, _sp.read()),
      (False, True, b'short and now long'))
_sp.close()


class _DictProperty:
    @property
    def __dict__(self):
        raise NotImplementedError('no namespace')


check('vars_uses_a_dict_property', _raises(lambda: vars(_DictProperty()), NotImplementedError), True)

# --- 23. Phase 6: a union has no __dict__ -----------------------------------------

check('union_has_no_dict', (_raises(lambda: (int | str).__dict__, AttributeError),
                            hasattr(int | None, '__dict__')), (True, False))


# --- 24. Phase 6: a zero-parameter def keeps its return annotation ------------------

class _RUser:
    pass


def _ret_user() -> _RUser:
    return _RUser()


def _ret_str_user(x: int) -> '_RUser':
    return _RUser()


check('signature_keeps_a_zero_arg_return_annotation',
      inspect.signature(_ret_user).return_annotation is _RUser, True)
check('signature_eval_str_evaluates_string_annotations',
      inspect.signature(_ret_str_user, eval_str=True).return_annotation is _RUser, True)


# --- 25. Phase 6: a rebinding on one class leaves another's captures alone -----------

from typing import TYPE_CHECKING as _TC                          # noqa: E402


class _Grouped:
    def __iter__(self): ...

    if not _TC:
        def __iter__(self):
            raise NotImplementedError


@dataclasses.dataclass(frozen=True, slots=True)
class _Interval(_Grouped):
    gt: int = 1

    def __iter__(self):
        yield self.gt


_before = list(_Interval())


class _FutureLike:
    def __await__(self):
        yield self

    __iter__ = __await__


check('rebinding_one_class_leaves_another_alone', (_before, list(_Interval(gt=2))), ([1], [2]))


def _yield_from(x):
    yield from x


class _NonIterator:
    def __iter__(self):
        return None


check('yield_from_checks_its_operand',
      (_raises(lambda: list(_yield_from(None)), TypeError),
       _raises(lambda: list(_yield_from(_NonIterator())), TypeError),
       list(_yield_from(iter([1, 2])))),
      (True, True, [1, 2]))


# --- 26. Phase 6: getsourcelines / getsource -----------------------------------------

def _endpoint(
    item_id: int,
    q: str = (
        'x'),
):
    return item_id


_src_lines, _src_start = inspect.getsourcelines(_endpoint)
check('getsourcelines_finds_the_block',
      (len(_src_lines), _src_lines[0].strip(), _src_lines[-1].strip(),
       inspect.getsource(_endpoint) == ''.join(_src_lines)),
      (6, 'def _endpoint(', 'return item_id', True))


# --- 27. Phase 6: a module __getattr__ stored as data ---------------------------------

_lazy_dir = _tempfile.mkdtemp(prefix='grail_walls_lazy_')
with open(os.path.join(_lazy_dir, 'walls_lazymod.py'), 'w') as _f:
    _f.write('import sys\n'
             'def _install():\n'
             '    g = sys._getframe(1).f_globals\n'
             '    def __getattr__(name):\n'
             '        if name == "lazy":\n'
             '            return "lazy value"\n'
             '        raise AttributeError(name)\n'
             '    g["__getattr__"] = __getattr__\n'
             '_install()\n')
sys.path.insert(0, _lazy_dir)
try:
    from walls_lazymod import lazy as _lazy                    # noqa: E402
finally:
    sys.path.remove(_lazy_dir)
check('module_getattr_stored_through_a_frame', _lazy, 'lazy value')


# --- 28. Phase 6: signature of a classmethod bound through __get__ -------------------

class _Validated:
    @classmethod
    def check(cls, value, info):
        return value


_bound_check = _Validated.__dict__['check'].__get__(None, _Validated)
check('signature_of_a_classmethod_bound_through_get', str(inspect.signature(_bound_check)),
      '(value, info)')


# --- 29. Phase 6: an Ellipsis body is not a docstring --------------------------------

class _EllipsisBody: ...


class _EllipsisMethod:
    def m(self): ...


check('ellipsis_body_is_not_a_docstring',
      (_EllipsisBody.__doc__, _EllipsisMethod.m.__doc__, _EllipsisMethod().m.__doc__),
      (None, None, None))


# --- 30. Phase 6: docstrings -----------------------------------------------------------

def _documented_at_module_level():
    """Summary.

        Indented more.
    Back.
    """


check('module_level_def_has_its_cleaned_docstring', _documented_at_module_level.__doc__,
      'Summary.\n\n    Indented more.\nBack.\n')
check('cleandoc_keeps_a_form_feed', inspect.cleandoc('Title.\n\f\n    After.'),
      'Title.\n\f\n    After.')


# --- 31. Phase 6: a slotted dataclass has no __dict__ ---------------------------------

@dataclasses.dataclass(slots=True)
class _SlottedDataclass:
    x: int = 1


check('slotted_dataclass_has_no_dict', hasattr(_SlottedDataclass(), '__dict__'), False)


# --- 32. Phase 6: each lambda evaluation is a distinct function ---------------------

def _make_lambda():
    return lambda: None


_lambdas = [lambda: None for _ in range(3)] + [_make_lambda() for _ in range(3)]
_lambdas[0].tag = 'first'
check('each_lambda_evaluation_is_distinct',
      (len(set(map(id, _lambdas))), getattr(_lambdas[1], 'tag', None)), (6, None))


# --- 33. Phase 6: signature of a partial; OrderedDict's mutators ----------------------

import functools as _functools                                   # noqa: E402
from collections import OrderedDict as _OrderedDict              # noqa: E402


def _partial_target(a, b, *, c=3, d):
    return a


_od = _OrderedDict(a=1, b=2)
_od.pop('a')
_od.setdefault('c', 3)
_od.update({'d': 4}, e=5)
check('signature_of_a_partial', str(inspect.signature(_functools.partial(_partial_target, 1, d=4))),
      '(b, *, c=3, d=4)')
check('ordered_dict_mutators_keep_order', list(_od.items()),
      [('b', 2), ('c', 3), ('d', 4), ('e', 5)])


# --- 34. Phase 6: patching a Grail-implemented module's function -----------------------

from unittest import mock as _mock                               # noqa: E402


def _dump_through_json(x):
    return json.dumps(x)


with _mock.patch('json.dumps', wraps=json.dumps) as _mock_dumps:
    _dumped = _dump_through_json({'a': 1})
check('patching_a_native_module_function_is_seen',
      (_mock_dumps.call_count, _dumped, _dump_through_json([1])), (1, '{"a": 1}', '[1]'))


# --- 35. Phase 6: a __class__ property -------------------------------------------------

class _ClaimsInt:
    @property
    def __class__(self):
        return int


_claims = _ClaimsInt()
check('dunder_class_property', (isinstance(_claims, int), type(_claims) is _ClaimsInt,
                                isinstance(_claims, _ClaimsInt), isinstance(_claims, str)),
      (True, True, True, False))


# --- 36. Phase 6: subprocess cwd may be a path-like ------------------------------------

import pathlib as _pathlib                                       # noqa: E402
import subprocess as _subprocess                                 # noqa: E402

_cwd_dir = _pathlib.Path(_tempfile.mkdtemp(prefix='grail_walls_cwd_')).resolve()
_pwd = _subprocess.run(['pwd', '-P'], cwd=_cwd_dir, capture_output=True, text=True)
check('subprocess_cwd_may_be_a_path', (_pwd.returncode, _pwd.stdout.strip() == str(_cwd_dir)),
      (0, True))
_printed = _subprocess.run(['printf', '%s', '\U0001f310 \u00e9'], capture_output=True, text=True)
check('subprocess_args_past_latin1', (_printed.returncode, _printed.stdout), (0, '\U0001f310 \u00e9'))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
