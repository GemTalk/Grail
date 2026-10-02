"""Python-level bugs found while bringing pydantic's BaseModel up in Grail
(docs/Support_Pydantic.md, Phase 5).  Each is a general Grail bug.

1. A class-body ``@overload`` stub beat the real implementation that follows
   it.  Two causes: a BARE ``@overload`` decorator (``from typing import
   overload``) was not recognised as a stub, so the stubs were compiled as
   methods; and a decorated def's decorator result was stored over the class
   even when a LATER statement rebinds the name.  pydantic's
   GenerateSchema._get_args_resolving_forward_refs is overloaded this way.

2. ``f.attr = value`` on a sibling def inside a class body was dropped, so
   ``C.f.attr`` was missing.  BaseModel marks its own __init__ with
   ``__init__.__pydantic_base_init__ = True``; without the mark every model
   looked like it had a custom __init__.

3. Assigning an instance's ``__dict__`` stored an attribute NAMED __dict__
   instead of replacing the attributes; and ``obj.__dict__.copy()`` /
   ``copy.copy(obj.__dict__)`` did not exist.  pydantic_core gives a validated
   model its fields with ``object.__setattr__(m, '__dict__', d)`` and
   model_copy() copies ``__dict__``.

Every expectation here was measured against CPython 3.14.
"""

import copy
from typing import overload

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:120])


# -- 1. class-body overloads and rebinding ---------------------------------------

class Over:
    @overload
    def m(self, x: int, required: bool = True) -> int: ...

    @overload
    def m(self, x: str) -> str: ...

    def m(self, x, required=False):
        return ('impl', x, required)


check('bare_overload_one_arg_reaches_impl', Over().m(1), ('impl', 1, False))
check('bare_overload_keyword_reaches_impl', Over().m(1, required=True), ('impl', 1, True))


class Rebound:
    @staticmethod
    def s():
        return 'decorated first'

    def s(self):
        return 'plain second'

    def n(self):
        return 'first'

    def n(self):
        return 'second'


check('later_plain_def_beats_earlier_decorated', Rebound().s(), 'plain second')
check('later_plain_def_beats_earlier_plain', Rebound().n(), 'second')


def _deco(f):
    def wrapper(self):
        return 'decorated ' + f(self)
    return wrapper


class DecoratedLast:
    def d(self):
        return 'plain'

    @_deco
    def d(self):
        return 'body'


check('later_decorated_def_still_applies', DecoratedLast().d(), 'decorated body')


# -- 2. function attributes set in the class body --------------------------------

class Marked:
    def f(self):
        return 1
    f.marker = True

    def __init__(self):
        pass
    __init__.__base_init__ = 'yes'


check('class_body_function_attribute', getattr(Marked.f, 'marker', 'MISSING'), True)
check('class_body_function_attribute_via_instance', getattr(Marked().f, 'marker', 'MISSING'), True)
check('class_body_dunder_init_attribute', getattr(Marked.__init__, '__base_init__', 'MISSING'), 'yes')


# -- 3. instance __dict__ assignment and copying ---------------------------------

class Plain:
    pass


p = Plain()
p.old = 0
object.__setattr__(p, '__dict__', {'x': 1, 'y': 'd'})
check('dict_assignment_sets_attributes', (p.x, p.y), (1, 'd'))
check('dict_assignment_replaces_old_attributes', hasattr(p, 'old'), False)
check('dict_assignment_reads_back', p.__dict__, {'x': 1, 'y': 'd'})
try:
    object.__setattr__(p, '__dict__', 5)
    bad = 'no error'
except TypeError:
    bad = 'TypeError'
check('dict_assignment_requires_a_dict', bad, 'TypeError')

q = Plain()
q.a = 1
dc = q.__dict__.copy()
check('instance_dict_copy_method', (type(dc).__name__, dc), ('dict', {'a': 1}))
check('instance_dict_copy_module', copy.copy(q.__dict__), {'a': 1})
dc['b'] = 2
check('instance_dict_copy_is_independent', hasattr(q, 'b'), False)


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
