"""Python-level bugs found running pydantic's own test suite in Grail
(docs/Support_Pydantic.md, Phase 6).  Each is a general Grail bug.

1. A metaclass's class-body namespace held the RESOLVED value for a decorated
   def -- a bound method for @classmethod, the getter for @property -- where
   CPython's holds the classmethod / property object.  pydantic.v1's
   ModelMetaclass took both for fields.
2. ``from m import *`` ignored ``m.__all__`` and copied every public name.
3. ``warnings.warn(msg, Category)`` built the category without running its
   __init__.
4. An inherited classmethod's ``__func__`` was a different object per class.
5. ``copy.deepcopy(obj.__dict__)`` stored into nil and killed the gem.
6. A metaclass clearing the namespace's ``__annotations__`` in place left the
   class's annotations untouched.
7. A protocol dunder defined under a class-body ``if`` -- __setattr__,
   __delattr__, __len__, __getitem__, ... -- was silently ignored.
8. Every lambda's signature was ``()``.
9. ``super().__new__(mcls, name, bases, ns, **kw)`` raised ``type.__new__()
   takes exactly 3 arguments (4 given)``.
10. A str- or int-mixed enum had no ``_missing_``.
11. ``obj.__dict__ = obj.__dict__`` emptied obj.
12. ``uuid`` was a 71-line stub with no ``int``, ``bytes``, ``version``, uuid4
    ... -- CPython's module is vendored now; ``colorsys`` was missing.

Every expectation here was measured against CPython 3.14.
"""

import copy
import inspect
import os
import sys
import tempfile
import warnings

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:120])


# -- 1. the namespace a metaclass sees ------------------------------------------

class _NsMeta(type):
    seen = {}

    def __new__(mcs, name, bases, ns, **kw):
        mcs.seen[name] = {k: type(v).__name__ for k, v in ns.items()
                          if not k.startswith('__')}
        return super().__new__(mcs, name, bases, ns)


class NsUser(metaclass=_NsMeta):
    x = 1

    def meth(self):
        pass

    @classmethod
    def cm(cls):
        pass

    @staticmethod
    def sm():
        pass

    @property
    def p(self):
        return 1


check('namespace_holds_classmethod', _NsMeta.seen['NsUser']['cm'], 'classmethod')
check('namespace_holds_staticmethod', _NsMeta.seen['NsUser']['sm'], 'staticmethod')
check('namespace_holds_property', _NsMeta.seen['NsUser']['p'], 'property')
check('namespace_holds_function', _NsMeta.seen['NsUser']['meth'], 'function')
check('namespace_holds_data', _NsMeta.seen['NsUser']['x'], 'int')


class _PropMeta(type):
    calls = []

    @property
    def shadowed(cls):
        _PropMeta.calls.append(cls.__name__)
        return 'meta'


class PropUser(metaclass=_PropMeta):
    @property
    def shadowed(self):
        return 'instance'


check('namespace_bind_runs_no_metaclass_property', _PropMeta.calls, [])


# -- 2. star import and __all__ ----------------------------------------------------

_star_dir = tempfile.mkdtemp(prefix='grail_p6_')
os.mkdir(os.path.join(_star_dir, 'p6pkg'))
with open(os.path.join(_star_dir, 'p6pkg', '__init__.py'), 'w') as _f:
    _f.write('from p6pkg.sub import *\n')
with open(os.path.join(_star_dir, 'p6pkg', 'sub.py'), 'w') as _f:
    _f.write('from functools import partial\n__all__ = ["pub", "_priv"]\n'
             'pub = 1\n_priv = 2\nhidden = 3\n')
sys.modules.pop('p6pkg', None)      # loaded twice by the SUnit wrapper
sys.modules.pop('p6pkg.sub', None)
sys.path.insert(0, _star_dir)
try:
    import p6pkg
finally:
    sys.path.remove(_star_dir)
check('star_import_honours_all',
      sorted(k for k in vars(p6pkg) if not k.startswith('__')),
      ['_priv', 'pub', 'sub'])


# -- 3. warnings.warn runs the category's __init__ -----------------------------------

class _P6Warning(DeprecationWarning):
    def __init__(self, message, *args):
        super().__init__(message, *args)
        self.message = message.rstrip('.')

    def __str__(self):
        return self.message + ' (custom)'


with warnings.catch_warnings(record=True) as _log:
    warnings.simplefilter('always')
    warnings.warn('hello.', _P6Warning)
check('warn_runs_category_init', str(_log[0].message), 'hello (custom)')


# -- 4. inherited classmethod __func__ -------------------------------------------------

class _CmBase:
    @classmethod
    def g(cls, x):
        return x


class _CmSub(_CmBase):
    pass


check('inherited_classmethod_func_identity', _CmSub.g.__func__ is _CmBase.g.__func__, True)


# -- 5. deepcopy of an instance __dict__ ---------------------------------------------

class Plain:
    pass


_dc = Plain()
_dc.id = 1
_dc.items = [1, 2]
_deep = copy.deepcopy(_dc.__dict__)
check('deepcopy_instance_dict', (type(_deep).__name__, _deep), ('dict', {'id': 1, 'items': [1, 2]}))
check('deepcopy_instance_dict_is_deep', _deep['items'] is _dc.items, False)


# -- 6. __annotations__ cleared in place by a metaclass ---------------------------------

_ann_ns = {'__annotations__': {'x': 'int', 'y': 'str'}}


class _AnnMeta(type):
    def __new__(mcs, name, bases, ns):
        ns.get('__annotations__', {}).clear()
        return super().__new__(mcs, name, bases, ns)


_AnnCleared = _AnnMeta('_AnnCleared', (), _ann_ns)
check('annotations_cleared_in_place_direct', dict(_AnnCleared.__annotations__), {})


exec('''
from __future__ import annotations
class _AnnClearedBody(metaclass=_AnnMeta):
    x: int
    y: str = 'a'
''', globals())
check('annotations_cleared_in_place_class_body', dict(_AnnClearedBody.__annotations__), {})


# -- 7. protocol dunders under a class-body ``if'' ---------------------------------------

_ON = True


class CondHooks:
    if _ON:
        def __setattr__(self, k, v):
            object.__setattr__(self, k, ('set', v))

        def __delattr__(self, k):
            object.__setattr__(self, 'deleted', k)

        def __len__(self):
            return 7

        def __getitem__(self, k):
            return ('gi', k)

        def __contains__(self, k):
            return k == 3

        def __iter__(self):
            return iter([1, 2])

        def __call__(self, x):
            return ('call', x)

        def __hash__(self):
            return 42

        def __bool__(self):
            return False


_ch = CondHooks()
_ch.x = 1
check('conditional_setattr', object.__getattribute__(_ch, 'x'), ('set', 1))
del _ch.x
check('conditional_delattr', object.__getattribute__(_ch, 'deleted'), 'x')
check('conditional_len', len(_ch), 7)
check('conditional_getitem', _ch[5], ('gi', 5))
check('conditional_contains', 3 in _ch, True)
check('conditional_iter', list(_ch), [1, 2])
check('conditional_call', _ch(9), ('call', 9))
check('conditional_hash', hash(_ch), 42)
check('conditional_bool', bool(_ch), False)


class CondHooksSub(CondHooks):
    pass


_chs = CondHooksSub()
_chs.y = 2
check('conditional_setattr_inherited', object.__getattribute__(_chs, 'y'), ('set', 2))


# -- 8. lambda signatures ------------------------------------------------------------------

check('lambda_signature_one', str(inspect.signature(lambda data: data)), '(data)')
check('lambda_signature_default', str(inspect.signature(lambda a, b=1: a)), '(a, b=1)')
check('lambda_signature_star', str(inspect.signature(lambda *a, **k: 0)), '(*a, **k)')


def _nested_lambda():
    return inspect.signature(lambda d, *, k=2: d)


check('lambda_signature_nested_kwonly', str(_nested_lambda()), '(d, *, k=2)')


# -- 9. super().__new__ with class keywords --------------------------------------------------

class _KwMeta(type):
    def __new__(mcls, name, bases, ns, **kw):
        return super().__new__(mcls, name, bases, ns, **kw)


class _KwBase(metaclass=_KwMeta):
    def __init_subclass__(cls, **kw):
        super().__init_subclass__()


try:
    class _KwSub(_KwBase, a=1):
        pass
    _kw_outcome = type(_KwSub).__name__
except TypeError as e:
    _kw_outcome = 'TypeError: ' + str(e)
check('super_new_with_class_keywords', _kw_outcome, '_KwMeta')


# -- 10. _missing_ on a mixed enum --------------------------------------------------------

from enum import Enum  # noqa: E402


class _StrFoo(str, Enum):
    FOO = 'foo'


class _IntFoo(int, Enum):
    ONE = 1


check('str_enum_has_missing', _StrFoo._missing_('zz'), None)
check('int_enum_has_missing', _IntFoo._missing_(5), None)


# -- 11. assigning an instance its own __dict__ ---------------------------------------------

_self = Plain()
_self.a = 1
_self.__dict__ = _self.__dict__
check('dict_self_assignment_keeps_attributes', _self.__dict__, {'a': 1})
_other = Plain()
_other.b = 2
_self.__dict__ = _other.__dict__
check('dict_assignment_from_another_instance', (_self.__dict__, _other.__dict__), ({'b': 2}, {'b': 2}))


# -- 12. the uuid and colorsys modules --------------------------------------------------------

import colorsys  # noqa: E402
import uuid  # noqa: E402

_u = uuid.UUID('12345678123456781234567812345678')
check('uuid_fields', _u.fields, (305419896, 4660, 22136, 18, 52, 95073701484152))
check('uuid_int_roundtrip', uuid.UUID(int=_u.int) == _u, True)
check('uuid_bytes_roundtrip', uuid.UUID(bytes=_u.bytes) == _u, True)
check('uuid3', str(uuid.uuid3(uuid.NAMESPACE_DNS, 'python.org')), '6fa459ea-ee8a-3ca4-894e-db77e160355e')
check('uuid5', str(uuid.uuid5(uuid.NAMESPACE_DNS, 'python.org')), '886313e1-3b8a-5372-9b90-0c9aee199e5d')
_u4 = uuid.uuid4()
check('uuid4_version', (_u4.version, _u4.variant, len(str(_u4))), (4, uuid.RFC_4122, 36))
check('uuid4_differs', uuid.uuid4() != _u4, True)
check('colorsys_rgb_to_hsv', colorsys.rgb_to_hsv(0.2, 0.4, 0.4), (0.5, 0.5, 0.4))
check('colorsys_hls_roundtrip',
      tuple(round(c, 9) for c in colorsys.hls_to_rgb(*colorsys.rgb_to_hls(0.2, 0.4, 0.6))),
      (0.2, 0.4, 0.6))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
