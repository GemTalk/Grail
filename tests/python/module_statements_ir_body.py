"""Helper for module_statements_ir.py: a module body made of the statements
Grail's statement seam builds through IR (P4.2, ModuleBodySeam) -- expression
statements, plain / chained / unpacking / augmented / annotated assignments,
import, from-import and a star import, del, if, for and while with break, continue and else,
pass, assert and raise -- with a def between runs of them, so the body
alternates IR and text helpers.  Each probe records into R what CPython
reports; the importing fixture compares R against CPython 3.14, reading every
expected line from a ``# @marker`` comment here.

``sys._grail_ir_stmt_probe`` set before the import makes the body end with an
uncaught error raised by the statement it names, so the traceback has to walk
from an IR helper, past the dispatcher, to the importer.
"""
import sys
import inspect
from typing import Final
import os.path
import os.path as osp
from collections import OrderedDict as OD, namedtuple

R = {}
PROBE = getattr(sys, '_grail_ir_stmt_probe', None)


def where():
    f = sys._getframe(1)
    return (f.f_code.co_name, f.f_lineno, f.f_code.co_filename == __file__)


def caller_line():
    return sys._getframe(1).f_lineno


def store_onto(v):
    try:
        setattr(v, 'zz', 1)
        return 'stored'
    except AttributeError:
        return 'refused'


def store_onto_own_literal():
    return store_onto('ab')


R['plain'] = where()  # @plain
# A str literal is immutable whether it is a module statement's or a def's,
# and stays so across calls: an IR literal used to take the attribute.
R['literals_immutable'] = (store_onto('cd'), store_onto_own_literal(), store_onto_own_literal())
a = b = c = 3
x, (y, *zs) = 1, (2, 3, 4)
first, *rest = 'abc'
counter = 10
counter += 5
counter -= 1
counter *= 2
items = [1, 2, 3]
items[0] += 10
items[1:2] = [20, 21]
del items[-1]


class Box:
    pass


def count(cls):
    made.append((cls.__name__, sys._getframe(1).f_lineno))
    return cls


made = []


@count  # @generic_deco
class Generic[T]:
    pass


R['generic_class_once'] = (made, Generic.__type_params__[0].__name__)
box = Box()
box.value = 7
box.value **= 2
R['assignments'] = (a, b, c, x, y, zs, first, rest, counter, items, box.value)

annotated: int = 5
bare_annotation: str
attr_box = Box()
attr_box.field: int = 9
FINAL_VALUE: Final = 'once'
FINAL_TYPED: Final[int] = 42
if counter > 0:
    conditional: float = 1.5
if counter < 0:
    never: bytes = b''
R['annotations'] = (annotated, attr_box.field, FINAL_VALUE, FINAL_TYPED, conditional)
R['annotation_keys'] = sorted(sys.modules[__name__].__annotations__)
R['bare_annotation_unbound'] = 'bare_annotation' not in vars(sys.modules[__name__])

R['imports'] = (os.path.basename('/a/b.txt'), osp.join('p', 'q'),
                list(OD(z=1)), namedtuple('P', 'u v')(1, 2).v)

from module_statements_ir_star import *
from module_statements_ir_star_all import *
R['star'] = (public, dynamic, listed,
             [n for n in ('maybe', '_private', 'unlisted') if n in vars(sys.modules[__name__])])

tmp = 1
del tmp
R['deleted'] = 'tmp' not in dir(sys.modules[__name__])

if counter > 100:
    branch = 'big'
elif counter > 10:
    branch = 'medium'  # @elif
    R['elif_frame'] = where()  # @elif_frame
else:
    branch = 'small'
R['branch'] = branch

total = 0
for i in range(10):
    if i == 2:
        continue
    if i == 6:
        R['for_frame'] = where()  # @for_frame
        break
    total += i
else:
    total = -1
R['for'] = (total, i)

for k, v in [('p', 1), ('q', 2)]:
    pass
else:
    R['for_else'] = (k, v)

n = 0
while n < 5:
    n += 1
    if n == 3:
        R['while_frame'] = where()  # @while_frame
else:
    R['while_else'] = n

if (walrus := counter // 2) > 3:
    R['walrus'] = walrus

assert counter == 28, 'counter'
R['stack'] = [(fi.function, fi.lineno) for fi in inspect.stack()[:1]]  # @stack
R['f_back'] = sys._getframe(0).f_back is not None
R['f_globals'] = sys._getframe(0).f_globals['__name__'] == __name__
R['f_code'] = sys._getframe(0).f_code.co_name
R['multiline'] = (caller_line(),  # @multiline_first
                  caller_line())  # @multiline_second
R['module_doc'] = __doc__.split()[0]

if PROBE == 'for':
    for q in [1, 0]:
        1 / q  # @raise_for
if PROBE == 'assert':
    assert counter < 0, 'probe'  # @raise_assert
if PROBE == 'raise':
    raise KeyError('probe')  # @raise_raise
if PROBE == 'name':
    del counter
    counter  # @raise_name
if PROBE == 'while':
    while n:
        n -= 1
        n // (n - 2)  # @raise_while
