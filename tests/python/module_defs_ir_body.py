"""Helper for module_defs_ir.py: a module body whose def statements Grail's
statement seam builds through IR (P4.3a, ModuleBodySeam): plain, annotated,
defaulted, keyword-only, decorated, async, PEP 695 and conditional defs, among
simple statements.  Each probe records into R what CPython reports; the
importing fixture compares R against CPython 3.14, reading every expected line
from a ``# @marker`` comment here.

``sys._grail_ir_def_probe`` set before the import makes one def statement
raise -- its decorator, or its decorator's expression -- so the traceback has
to walk from the helper that holds the def, past the dispatcher, to the
importer.
"""
import sys
import inspect
import functools

R = {}
PROBE = getattr(sys, '_grail_ir_def_probe', None)
CALLS = []
SENTINEL = object()


def where():
    f = sys._getframe(1)
    return (f.f_code.co_name, f.f_lineno, f.f_code.co_filename == __file__)


def tag(label):
    CALLS.append(('make', label))

    def apply(fn):
        f = sys._getframe(1)
        CALLS.append(('apply', label, f.f_code.co_name, f.f_lineno))
        fn.tags = getattr(fn, 'tags', ()) + (label,)
        return fn
    return apply


def plain(a, b=2, *args, c, d=SENTINEL, e=(1, 'x'), **kw):  # @plain_def
    """A docstring."""
    return (a, b, args, c, d is SENTINEL, e, kw)


R['plain'] = (plain(1, c=3), list(inspect.signature(plain).parameters), plain.__defaults__,
              plain.__kwdefaults__['d'] is SENTINEL, plain.__kwdefaults__['e'],
              plain.__doc__, plain.__name__)


def mutable_default(x, acc=[]):
    acc.append(x)
    return acc


mutable_default(1)
R['mutable_default'] = (mutable_default(2), mutable_default.__defaults__)


def annotated(a: int, b: 'Later' = None) -> list[Later]:
    return a


class Later:
    pass


R['annotations'] = (annotated.__annotations__['a'], annotated.__annotations__['b'],
                    annotated.__annotations__['return'] == list[Later])


@tag('outer')  # @outer
@tag('inner')  # @inner
def decorated():
    return 'decorated'


R['decorated'] = (decorated(), decorated.tags, list(CALLS))
del CALLS[:]


def wrap(fn):
    @functools.wraps(fn)
    def wrapper(*a):
        return ('wrapped', fn(*a))
    return wrapper


@wrap
def twice(x):
    return x * 2


R['wrapped'] = (twice(4), twice.__name__, twice.__wrapped__(5))


def rebound():
    return 'first'


rebound = wrap(rebound)


def rebound():
    return 'second'


R['rebound'] = rebound()


@classmethod
def as_classmethod(cls):
    return cls


R['classmethod'] = type(as_classmethod).__name__


async def coroutine(x=7):
    return x


def run(coro):
    try:
        coro.send(None)
    except StopIteration as e:
        return e.value


R['async'] = (run(coroutine()), inspect.iscoroutinefunction(coroutine), coroutine.__defaults__)


def deco_line(fn):
    f = sys._getframe(1)
    R['deco_line'] = (f.f_code.co_name, f.f_lineno)
    return fn


@deco_line  # @generic_deco
def generic[T](x: T) -> T:
    return x


R['generic'] = (generic(3), generic.__type_params__[0].__name__, generic.__name__)


def generic_default[T](x: T = 5, *, k=6) -> T:
    return (x, k)


R['generic_default'] = (generic_default(), generic_default.__defaults__,
                        generic_default.__kwdefaults__)

if len(sys.argv) >= 0:
    def conditional():
        return 'then'
else:
    def conditional():
        return 'else'
R['conditional'] = conditional()

for n in (1, 2):
    def looped(n=n):
        return n
R['looped'] = looped()

if True:
    @tag('nested')  # @nested
    def nested_decorated(k=3):
        return k
R['nested_decorated'] = (nested_decorated(), nested_decorated.tags, list(CALLS))
del CALLS[:]

MODULE_CODE = sys._getframe(0).f_code
R['module_code'] = (MODULE_CODE.co_name, MODULE_CODE.co_firstlineno)
R['def_code'] = (plain.__code__.co_name, plain.__code__.co_firstlineno)


def kwonly_sig(a, /, b: int = 3, *, k=None) -> None:
    pass


R['signature'] = (str(inspect.signature(mutable_default)), str(inspect.signature(kwonly_sig)))


def kwdefaults(*, k=1):
    return k


kwdefaults.__kwdefaults__ = {'k': 5}
R['kwdefaults'] = kwdefaults()


def write_defaults(a=1):
    return a


write_defaults.__defaults__ = (9,)
R['write_defaults'] = write_defaults()


def boom(fn):
    raise KeyError('decorator')  # @boom


if PROBE == 'decorator':
    @boom  # @raise_decorator
    def victim():
        pass

if PROBE == 'decorator_expr':
    @tag(1 / 0)  # @raise_decorator_expr
    def victim2():
        pass
