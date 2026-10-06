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

Every expectation here was measured against CPython 3.14.
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

if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
